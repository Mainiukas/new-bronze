-- Behaviour checks for supabase/migrations/006_privacy.sql. Run on a scratch
-- database after stub_supabase.sql, 001 (without its last two lines) and
-- 002–006 (see supabase/tests/README.md). The last line prints ALL 006 CHECKS PASSED.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
 ('60000000-0000-0000-0000-00000000000a', 'ada6@example.com', '{"username":"Ada6","age_band":"18+","terms_version":"t1"}', now()),
 ('60000000-0000-0000-0000-00000000000b', 'bob6@example.com', '{"username":"Bob6","age_band":"18+","terms_version":"t1"}', now()),
 ('60000000-0000-0000-0000-00000000000c', 'cy6@example.com', '{"username":"Cy6","age_band":"18+","terms_version":"t1"}', now());

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '', false),
         set_config('request.jwt.claims', jsonb_build_object('sub', id, 'aal', 'aal1')::text, false);
$$;

create function pg_temp.seat(n int, id text, name text, bot text default null) returns jsonb language sql as $$
  select jsonb_build_object('seat', n, 'userId', id, 'username', name, 'bot', bot, 'forfeited', false, 'botPlaying', false)
$$;

-- A game record as the server saves it.
create function pg_temp.rec(gid text, code text, status text, host text, seats jsonb, state jsonb, result jsonb) returns jsonb language sql as $$
  select jsonb_build_object(
    'id', gid, 'code', code, 'hostId', host, 'status', status, 'visibility', 'public', 'rated', true, 'allowSpectators', true,
    'mode', 'normal', 'mapId', 'wales-and-the-west', 'maxPlayers', 3, 'version', 5,
    'createdAt', 1790000000000, 'startedAt', case when status = 'lobby' then null else 1790000001000 end,
    'finishedAt', case when status = 'finished' then 1790000009000 else null end,
    'seats', seats, 'state', state, 'seed', 7, 'result', result)
$$;

set role service_role;
do $$
declare
  a text := '60000000-0000-0000-0000-00000000000a';
  b text := '60000000-0000-0000-0000-00000000000b';
  two_players jsonb := '{"players":[{"name":"Ada6"},{"name":"Bob6"}]}';
begin
  -- 1. Finished and rated.
  perform bronze_game_insert(
    pg_temp.rec('6a000000-0000-0000-0000-000000000001', 'FINISH', 'finished', a, jsonb_build_array(pg_temp.seat(0, a, 'Ada6'), pg_temp.seat(1, b, 'Bob6')), two_players,
      jsonb_build_object('places', '[1,2]'::jsonb, 'aborted', false, 'ratings', jsonb_build_array(
        jsonb_build_object('userId', a, 'seat', 0, 'before', 1200, 'after', 1216, 'delta', 16),
        jsonb_build_object('userId', b, 'seat', 1, 'before', 1200, 'after', 1184, 'delta', -16)))),
    two_players, '[]'::jsonb);
  insert into game_actions (game_id, seq, seat, action, by) values
    ('6a000000-0000-0000-0000-000000000001', 1, 0, '{"type":"pass"}', 'player'),
    ('6a000000-0000-0000-0000-000000000001', 2, 1, '{"type":"pass"}', 'player');
  -- 2. Being played.
  perform bronze_game_insert(
    pg_temp.rec('6a000000-0000-0000-0000-000000000002', 'PLAYIN', 'playing', a, jsonb_build_array(pg_temp.seat(0, a, 'Ada6'), pg_temp.seat(1, b, 'Bob6')), two_players, null),
    two_players, jsonb_build_array(jsonb_build_object('seat', 0, 'userId', a, 'cards', '["x"]'::jsonb), jsonb_build_object('seat', 1, 'userId', b, 'cards', '["y"]'::jsonb)));
  -- 3. A lobby Ada hosts, with Bob in it.
  perform bronze_game_insert(
    pg_temp.rec('6a000000-0000-0000-0000-000000000003', 'LOBBYA', 'lobby', a, jsonb_build_array(pg_temp.seat(0, a, 'Ada6'), pg_temp.seat(1, b, 'Bob6')), null, null),
    null, '[]'::jsonb);
  -- 4. A lobby of Ada and a bot.
  perform bronze_game_insert(
    pg_temp.rec('6a000000-0000-0000-0000-000000000004', 'LOBBYB', 'lobby', a, jsonb_build_array(pg_temp.seat(0, a, 'Ada6'), pg_temp.seat(1, null, 'Bot (Easy)', 'easy')), null, null),
    null, '[]'::jsonb);
  perform bronze_ratings_save(
    jsonb_build_array(jsonb_build_object('userId', a, 'mapId', 'wales-and-the-west', 'rating', 1216, 'rd', 290, 'volatility', 0.06, 'gamesPlayed', 1, 'peakRating', 1216, 'updatedAt', 1790000009000)),
    jsonb_build_array(jsonb_build_object('userId', a, 'mapId', 'wales-and-the-west', 'gameId', '6a000000-0000-0000-0000-000000000001', 'before', 1200, 'after', 1216, 'delta', 16, 'mode', 'normal', 'at', 1790000009000)));
  perform bronze_friendship_put(jsonb_build_object('a', a, 'b', b, 'requester', a, 'status', 'accepted', 'since', 1790000000000));
  perform bronze_invite_put(jsonb_build_object('id', '6b000000-0000-0000-0000-000000000001', 'from', b, 'fromName', 'Bob6', 'to', a, 'gameId', '6a000000-0000-0000-0000-000000000003', 'code', 'LOBBYA', 'at', 1790000000000));
  perform bronze_touch(a::uuid, 1790000000000);
end $$;
reset role;

-- ---------------------------------------------------------------- Download my data
select pg_temp.as_user('60000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare
  d jsonb := export_my_data();
begin
  assert d #>> '{profile,username}' = 'Ada6', 'the profile';
  assert jsonb_array_length(d -> 'online_games') = 4, 'every online game';
  assert jsonb_array_length((select g -> 'your_moves' from jsonb_array_elements(d -> 'online_games') g
                               where g ->> 'game_id' = '6a000000-0000-0000-0000-000000000001')) = 1, 'only my own moves';
  assert (d #>> '{ratings,0,rating}')::numeric = 1216, 'ratings';
  assert jsonb_array_length(d -> 'rating_history') = 1, 'rating history';
  assert d #>> '{friends,0,username}' = 'Bob6', 'friends by name';
  assert d #>> '{game_invites,0,from}' = 'Bob6' and d #>> '{game_invites,0,to}' = 'you', 'invites';
  assert d -> 'last_online' is not null, 'last online';
  assert position('60000000-0000-0000-0000-00000000000b' in d::text) = 0, 'no other player’s account id';
  raise notice 'OK Download my data has the online games (my moves only), ratings, friends, invites and last online';
end $$;
reset role;

-- Nobody calls the helpers directly.
set role authenticated;
do $$ begin
  begin perform bronze_forget_player('60000000-0000-0000-0000-00000000000b'); assert false, 'helper callable'; exception when insufficient_privilege then null; end;
  raise notice 'OK players can’t forget other players';
end $$;
reset role;

-- ---------------------------------------------------------------- Delete my account
select pg_temp.as_user('60000000-0000-0000-0000-00000000000a');
set role authenticated;
select delete_my_account();
reset role;

do $$
declare
  r jsonb;
  pub jsonb;
begin
  assert not exists (select 1 from auth.users where id = '60000000-0000-0000-0000-00000000000a'), 'the account is gone';
  assert not exists (select 1 from profiles where username = 'Ada6'), 'the profile is gone';
  assert not exists (select 1 from ratings where user_id = '60000000-0000-0000-0000-00000000000a'), 'ratings gone';
  assert not exists (select 1 from rating_history where user_id = '60000000-0000-0000-0000-00000000000a'), 'rating history gone';
  assert not exists (select 1 from friendships), 'friendships gone';
  assert not exists (select 1 from game_invites), 'invites gone';
  assert not exists (select 1 from presence where user_id = '60000000-0000-0000-0000-00000000000a'), 'online status gone';
  assert position('60000000-0000-0000-0000-00000000000a' in (select jsonb_agg(record)::text from game_secrets)) = 0, 'no game record keeps the account id';
  assert position('Ada6' in (select jsonb_agg(record)::text from game_secrets)) = 0, 'no game record keeps the name';
  assert position('Ada6' in (select string_agg(username, ',') from game_players)) = 0, 'no seat keeps the name';

  -- Finished: kept for Bob, with "Deleted player" in Ada's seat and the result intact.
  select record into r from game_secrets where game_id = '6a000000-0000-0000-0000-000000000001';
  assert r #>> '{seats,0,username}' = 'Deleted player' and r #> '{seats,0,userId}' = 'null'::jsonb, 'finished: Deleted player';
  assert r #>> '{state,players,0,name}' = 'Deleted player', 'finished: the board’s name too';
  assert r #>> '{seats,1,username}' = 'Bob6', 'Bob unchanged';
  assert r #> '{result,places}' = '[1,2]'::jsonb and (r #>> '{result,ratings,1,delta}')::int = -16, 'the result stays';
  assert (select username from game_players where game_id = '6a000000-0000-0000-0000-000000000001' and seat = 0) = 'Deleted player', 'the seat row';
  assert (select count(*) from game_actions where game_id = '6a000000-0000-0000-0000-000000000001') = 2, 'the moves stay (replays still work)';
  assert (r ->> 'version')::int = 6, 'version bumped';

  -- Being played: a bot finishes the seat.
  select record, g.public_state into r, pub from game_secrets s join games g on g.id = s.game_id where s.game_id = '6a000000-0000-0000-0000-000000000002';
  assert r #>> '{seats,0,username}' = 'Deleted player', 'playing: Deleted player';
  assert (r #>> '{seats,0,forfeited}')::boolean and (r #>> '{seats,0,botPlaying}')::boolean, 'playing: a bot plays the seat';
  assert pub #>> '{players,0,name}' = 'Deleted player', 'playing: the spectators’ copy too';
  assert (select status from games where id = '6a000000-0000-0000-0000-000000000002') = 'playing', 'the game goes on';
  assert (select count(*) from game_hands where game_id = '6a000000-0000-0000-0000-000000000002') = 1, 'Bob keeps his hand';

  -- Lobby with Bob: Ada's seat is removed and Bob hosts.
  select record into r from game_secrets where game_id = '6a000000-0000-0000-0000-000000000003';
  assert jsonb_array_length(r -> 'seats') = 1 and r #>> '{seats,0,username}' = 'Bob6' and (r #>> '{seats,0,seat}')::int = 0, 'lobby: seat removed, Bob moves up';
  assert r ->> 'hostId' = '60000000-0000-0000-0000-00000000000b' and r ->> 'status' = 'lobby', 'lobby: Bob hosts';
  assert (select count(*) from game_players where game_id = '6a000000-0000-0000-0000-000000000003') = 1, 'lobby: one seat row';
  assert (select host_id from games where id = '6a000000-0000-0000-0000-000000000003') = '60000000-0000-0000-0000-00000000000b', 'lobby: host column';

  -- Lobby with only a bot left: called off.
  assert (select status from games where id = '6a000000-0000-0000-0000-000000000004') = 'aborted', 'lobby without people: called off';
  raise notice 'OK deleting an account leaves "Deleted player" in its games, keeps the games for the others, and removes the rest';
end $$;

select 'ALL 006 CHECKS PASSED';
