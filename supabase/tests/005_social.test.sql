-- Behaviour checks for supabase/migrations/005_social.sql. Run on a scratch
-- database after stub_supabase.sql, 001 (without its last two lines), 002, 003,
-- 004 and 005 (see supabase/tests/README.md). The last line prints ALL 005 CHECKS PASSED.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 ('50000000-0000-0000-0000-00000000000a', 'ada5@example.com', '{"username":"Ada5","age_band":"18+","terms_version":"t1"}', now()),
 ('50000000-0000-0000-0000-00000000000b', 'bob5@example.com', '{"username":"Bob5","age_band":"18+","terms_version":"t1"}', now()),
 ('50000000-0000-0000-0000-00000000000c', 'cy5@example.com', '{"username":"Cy_5","age_band":"18+","terms_version":"t1"}', now());

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false),
         set_config('request.jwt.claims', jsonb_build_object('sub', id, 'aal', 'aal1')::text, false);
$$;

-- ---------------------------------------------------------------- the server (service role)
set role service_role;
do $$
declare
  ada uuid := '50000000-0000-0000-0000-00000000000a';
  bob uuid := '50000000-0000-0000-0000-00000000000b';
  cy uuid := '50000000-0000-0000-0000-00000000000c';
begin
  assert bronze_user_find('ada5') ->> 'userId' = ada::text, 'find a player by name, any case';
  assert bronze_user_find('nobody') is null, 'no such player';
  assert jsonb_array_length(bronze_users_search('ada', 10)) = 1, 'search by prefix';
  -- "_" is a letter in usernames, not a wildcard: "cy_" finds Cy_5 only, "c_" finds nobody.
  assert jsonb_array_length(bronze_users_search('cy_', 10)) = 1, 'underscore matched literally';
  assert jsonb_array_length(bronze_users_search('c_', 10)) = 0, 'underscore is not a wildcard';
  assert jsonb_array_length(bronze_users_search('%', 10)) = jsonb_array_length(bronze_users_search('', 10)), '% is dropped, not a wildcard';
  assert bronze_users_get(array[ada, bob]) ? bob::text, 'players by id';

  perform bronze_touch(ada, 1790000000000);
  perform bronze_touch(ada, 1790000060000);
  assert (bronze_last_seen(array[ada]) ->> ada::text)::bigint = 1790000060000, 'presence keeps the latest';

  perform bronze_friendship_put(jsonb_build_object('a', ada, 'b', bob, 'requester', ada, 'status', 'pending', 'since', 1790000000000));
  -- Accepting rewrites the same pair (either way round).
  perform bronze_friendship_put(jsonb_build_object('a', bob, 'b', ada, 'requester', ada, 'status', 'accepted', 'since', 1790000001000));
  assert jsonb_array_length(bronze_friendships(ada)) = 1, 'one row per pair';
  assert bronze_friendships(bob) -> 0 ->> 'status' = 'accepted', 'accepted';

  perform bronze_game_insert(jsonb_build_object('id', '5a000000-0000-0000-0000-000000000001', 'code', 'FRIEND', 'hostId', ada, 'status', 'lobby',
    'visibility', 'private', 'rated', false, 'allowSpectators', true, 'mode', 'normal', 'mapId', 'wales-and-the-west', 'maxPlayers', 2, 'version', 1,
    'createdAt', 1790000000000, 'seats', jsonb_build_array(jsonb_build_object('seat', 0, 'userId', ada, 'username', 'Ada5', 'bot', null))), null, '[]'::jsonb);
  perform bronze_invite_put(jsonb_build_object('id', '5b000000-0000-0000-0000-000000000001', 'from', ada, 'fromName', 'Ada5', 'to', bob,
    'gameId', '5a000000-0000-0000-0000-000000000001', 'code', 'FRIEND', 'at', 1790000002000));
  assert jsonb_array_length(bronze_invites_for(bob)) = 1, 'Bob is invited';
  perform bronze_invite_remove('5b000000-0000-0000-0000-000000000001');
  assert jsonb_array_length(bronze_invites_for(bob)) = 0, 'invite dismissed';

  perform bronze_ratings_save(jsonb_build_array(jsonb_build_object('userId', ada, 'mapId', 'wales-and-the-west', 'rating', 1300, 'rd', 70, 'volatility', 0.06,
      'gamesPlayed', 12, 'peakRating', 1310, 'updatedAt', 1790000003000)),
    jsonb_build_array(jsonb_build_object('userId', ada, 'mapId', 'wales-and-the-west', 'gameId', '5a000000-0000-0000-0000-000000000001', 'before', 1280,
      'after', 1300, 'delta', 20, 'mode', 'normal', 'at', 1790000003000)));
  assert jsonb_array_length(bronze_ratings_for(ada)) = 1, 'ratings per map';
  assert (bronze_rating_history(ada, 'wales-and-the-west', 10) -> 0 ->> 'after')::int = 1300, 'rating history';
  assert bronze_leaderboard('wales-and-the-west', 10, 100) -> 0 ->> 'username' = 'Ada5', 'leaderboard with names';
  assert jsonb_array_length(bronze_leaderboard('wales-and-the-west', 20, 100)) = 0, 'too few games: not a candidate';
  assert jsonb_array_length(bronze_games_finished(ada, 20)) = 0, 'no finished games yet';
  raise notice 'OK the server reads players, presence, friendships, invites, ratings and the leaderboard';
end $$;
reset role;

-- ---------------------------------------------------------------- players
-- Friends only now means friends: Bob (a friend) sees Ada's friends-only profile, Cy doesn't.
update public.profiles set profile_visibility = 'friends' where id = '50000000-0000-0000-0000-00000000000a';
-- (can_see is internal: the profile functions call it. Checked here as Bob and Cy, without their role.)
select pg_temp.as_user('50000000-0000-0000-0000-00000000000b');
do $$ begin
  assert public.can_see('50000000-0000-0000-0000-00000000000a', 'friends'), 'a friend sees friends-only';
  assert not public.can_see('50000000-0000-0000-0000-00000000000a', 'private'), 'nobody else sees private';
end $$;
set role authenticated;
do $$ begin
  -- Players can't read or write the new tables, or call the server's functions.
  begin perform 1 from public.friendships; assert false, 'friendships readable'; exception when insufficient_privilege then null; end;
  begin insert into public.presence (user_id) values ('50000000-0000-0000-0000-00000000000b'); assert false, 'presence writable'; exception when insufficient_privilege then null; end;
  begin perform public.bronze_friendships('50000000-0000-0000-0000-00000000000b'); assert false, 'server function callable'; exception when insufficient_privilege then null; end;
  raise notice 'OK friends see friends-only profiles; players reach none of it directly';
end $$;
reset role;
select pg_temp.as_user('50000000-0000-0000-0000-00000000000c');
do $$ begin
  assert not public.can_see('50000000-0000-0000-0000-00000000000a', 'friends'), 'a stranger doesn’t see friends-only';
  raise notice 'OK strangers don’t see friends-only profiles';
end $$;

-- Deleting an account removes its friendships, presence and invites.
delete from auth.users where id = '50000000-0000-0000-0000-00000000000b';
do $$ begin
  assert not exists (select 1 from public.friendships), 'friendships gone with the account';
  raise notice 'OK a deleted account leaves no friendships';
end $$;

select 'ALL 005 CHECKS PASSED';
