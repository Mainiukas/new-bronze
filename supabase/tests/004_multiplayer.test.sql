-- Behaviour checks for supabase/migrations/004_multiplayer.sql. Run on a scratch
-- database after stub_supabase.sql, 001 (without its last two lines), 002, 003
-- and 004 (see supabase/tests/README.md). The last line prints ALL 004 CHECKS PASSED.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 ('40000000-0000-0000-0000-00000000000a', 'ada4@example.com', '{"username":"Ada4","age_band":"18+","terms_version":"t1"}', now()),
 ('40000000-0000-0000-0000-00000000000b', 'bob4@example.com', '{"username":"Bob4","age_band":"18+","terms_version":"t1"}', now()),
 ('40000000-0000-0000-0000-00000000000c', 'cy4@example.com', '{"username":"Cy4","age_band":"18+","terms_version":"t1"}', now());

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false),
         set_config('request.jwt.claims', jsonb_build_object('sub', id, 'aal', 'aal1')::text, false);
$$;

-- A game of Ada and Bob, as the server would save it.
create function pg_temp.record(version int) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', '4a000000-0000-0000-0000-000000000001', 'code', 'ABCDEF', 'hostId', '40000000-0000-0000-0000-00000000000a',
    'status', 'playing', 'visibility', 'public', 'rated', true, 'allowSpectators', true, 'mode', 'normal', 'mapId', 'wales-and-the-west',
    'maxPlayers', 2, 'version', version, 'createdAt', floor(extract(epoch from now()) * 1000), 'startedAt', 1790000001000, 'finishedAt', null,
    'seats', jsonb_build_array(
      jsonb_build_object('seat', 0, 'userId', '40000000-0000-0000-0000-00000000000a', 'username', 'Ada4', 'bot', null),
      jsonb_build_object('seat', 1, 'userId', '40000000-0000-0000-0000-00000000000b', 'username', 'Bob4', 'bot', null)),
    'state', jsonb_build_object('secret', 'the deck order'), 'seed', 12345, 'result', null)
$$;
create function pg_temp.hands() returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('seat', 0, 'userId', '40000000-0000-0000-0000-00000000000a', 'cards', '["loc_derby#1"]'::jsonb),
    jsonb_build_object('seat', 1, 'userId', '40000000-0000-0000-0000-00000000000b', 'cards', '["loc_oxford#1"]'::jsonb))
$$;

-- ---------------------------------------------------------------- the server (service role)
set role service_role;
do $$ begin
  perform bronze_game_insert(pg_temp.record(1), '{"public": true}'::jsonb, pg_temp.hands());
  assert bronze_game_by_code('abcdef') = '4a000000-0000-0000-0000-000000000001', 'find by code, any case';
  assert (bronze_game_load('4a000000-0000-0000-0000-000000000001') ->> 'seed')::int = 12345, 'the server reads the full record';
  -- A save on the current version works and logs the moves…
  assert bronze_game_save(pg_temp.record(2), 1, '[{"seq":1,"seat":0,"action":{"type":"pass","cards":["x"]},"by":"player","at":1790000002000}]'::jsonb, '{"public": true}'::jsonb, pg_temp.hands()), 'save on version 1';
  -- …a second save from the same version is refused (two moves at once: only one wins).
  assert not bronze_game_save(pg_temp.record(2), 1, '[{"seq":1,"seat":1,"action":{"type":"pass","cards":["y"]},"by":"player","at":1790000002000}]'::jsonb, '{}'::jsonb, pg_temp.hands()), 'stale save refused';
  assert jsonb_array_length(bronze_game_actions('4a000000-0000-0000-0000-000000000001')) = 1, 'only the winning move is logged';
  assert jsonb_array_length(bronze_games_public()) = 1, 'the public list';
  assert jsonb_array_length(bronze_games_for('40000000-0000-0000-0000-00000000000b')) = 1, 'Bob’s games';
  perform bronze_queue_put('{"userId":"40000000-0000-0000-0000-00000000000c","since":1790000000000,"players":2}'::jsonb);
  assert jsonb_array_length(bronze_queue_get()) = 1, 'queued';
  perform bronze_queue_remove(array['40000000-0000-0000-0000-00000000000c'::uuid]);
  assert jsonb_array_length(bronze_queue_get()) = 0, 'unqueued';
  perform bronze_ratings_save('[{"userId":"40000000-0000-0000-0000-00000000000a","mapId":"wales-and-the-west","rating":1216,"rd":290,"volatility":0.06,"gamesPlayed":1,"peakRating":1216,"updatedAt":1790000003000}]'::jsonb,
    '[{"userId":"40000000-0000-0000-0000-00000000000a","mapId":"wales-and-the-west","gameId":"4a000000-0000-0000-0000-000000000001","before":1200,"after":1216,"delta":16,"mode":"normal","at":1790000003000}]'::jsonb);
  assert (bronze_ratings_get(array['40000000-0000-0000-0000-00000000000a'::uuid], 'wales-and-the-west') -> '40000000-0000-0000-0000-00000000000a' ->> 'rating')::int = 1216, 'ratings saved';
  raise notice 'OK the server reads and writes games in one transaction, refusing stale saves';
end $$;
reset role;

-- ---------------------------------------------------------------- players
select pg_temp.as_user('40000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin
  assert (select count(*) from games) = 1, 'Ada sees her game';
  assert (select count(*) from game_players) = 2, 'and who plays in it';
  assert (select count(*) from game_hands) = 1 and (select seat from game_hands) = 0, 'only her own hand';
  assert (select count(*) from game_actions) = 1, 'and the moves';
  raise notice 'OK a player reads their game and only their own hand';
end $$;
do $$ begin
  perform 1 from game_secrets;
  raise exception 'a player read the secrets';
exception when insufficient_privilege then raise notice 'OK nobody but the server reads the full game';
end $$;
do $$ begin
  update games set status = 'finished';
  raise exception 'a player wrote a game';
exception when insufficient_privilege then raise notice 'OK the browser never writes game state';
end $$;
do $$ begin
  insert into game_actions (game_id, seq, seat, action, by) values ('4a000000-0000-0000-0000-000000000001', 9, 0, '{}', 'player');
  raise exception 'a player wrote a move';
exception when insufficient_privilege then raise notice 'OK moves only through the server';
end $$;
do $$ begin
  perform bronze_game_load('4a000000-0000-0000-0000-000000000001');
  raise exception 'a player ran a server function';
exception when insufficient_privilege then raise notice 'OK the server functions are the service role''s';
end $$;
reset role;

-- Cy is not in the game: sees nothing of it (spectating goes through the server, without hands).
select pg_temp.as_user('40000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$ begin
  assert (select count(*) from games) = 0 and (select count(*) from game_hands) = 0 and (select count(*) from game_actions) = 0, 'not a player: nothing';
  raise notice 'OK players read only their own games';
end $$;
reset role;

set role anon;
do $$ begin
  perform 1 from games;
  raise exception 'a visitor read games';
exception when insufficient_privilege then raise notice 'OK visitors read nothing';
end $$;
reset role;

-- A deleted account: its seat stays (the game is kept), without the user.
delete from auth.users where id = '40000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select user_id is null from game_players where seat = 1), 'deleted player: seat kept, user gone';
  assert not exists (select 1 from game_hands where seat = 1), 'and their hand';
end $$;

select 'ALL 004 CHECKS PASSED';
