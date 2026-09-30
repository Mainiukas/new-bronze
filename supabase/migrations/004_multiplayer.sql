-- =====================================================================
-- Bronze — 004: online multiplayer.
--
-- Run after 001–003 (safe to run again). The game server (the Supabase Edge
-- Function `game`, with the service role key) is the only writer: players
-- never write game state. Tables:
--   games            one row per game: status, visibility, the invite code,
--                    and the state as spectators may see it (no hands)
--   game_players     who sits where (a bot seat has no user)
--   game_hands       each player's own hand: a player can read only theirs
--   game_actions     every move in order (replays are built from it)
--   game_secrets     the full game, hidden cards and all: server only
--   matchmaking_queue  quick play
-- A player can read the games they're in (and their rows) through RLS;
-- lobbies, spectating and moves go through the Edge Function.
-- =====================================================================

create table if not exists public.games (
  id uuid primary key,
  code text not null unique check (code ~ '^[A-Z]{6}$'),
  host_id uuid references auth.users (id) on delete set null,
  status text not null check (status in ('lobby', 'playing', 'finished', 'aborted')),
  visibility text not null check (visibility in ('public', 'private')),
  rated boolean not null default false,
  allow_spectators boolean not null default true,
  mode text not null check (mode in ('normal', 'blitz', 'bullet')),
  map_id text not null,
  max_players integer not null check (max_players between 2 and 4),
  version integer not null,
  -- The game as a spectator sees it (redacted: no hands, no deck order, no seed).
  public_state jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists games_open_idx on public.games (visibility, status, created_at desc);

create table if not exists public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  seat integer not null check (seat between 0 and 3),
  -- Null for a bot, and for a player whose account was deleted.
  user_id uuid references auth.users (id) on delete set null,
  username text not null,
  bot_level text check (bot_level in ('easy', 'normal')),
  place integer,
  rating_delta double precision,
  primary key (game_id, seat)
);
create index if not exists game_players_user_idx on public.game_players (user_id);

create table if not exists public.game_hands (
  game_id uuid not null references public.games (id) on delete cascade,
  seat integer not null,
  user_id uuid references auth.users (id) on delete cascade,
  cards jsonb not null default '[]'::jsonb,
  primary key (game_id, seat)
);

create table if not exists public.game_actions (
  game_id uuid not null references public.games (id) on delete cascade,
  seq integer not null,
  seat integer not null,
  action jsonb not null,
  by text not null check (by in ('player', 'bot', 'clock')),
  created_at timestamptz not null default now(),
  primary key (game_id, seq)
);

create table if not exists public.game_secrets (
  game_id uuid primary key references public.games (id) on delete cascade,
  record jsonb not null
);

create table if not exists public.matchmaking_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  entry jsonb not null,
  since timestamptz not null default now()
);

alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_hands enable row level security;
alter table public.game_actions enable row level security;
alter table public.game_secrets enable row level security;
alter table public.matchmaking_queue enable row level security;
revoke all on public.games, public.game_players, public.game_hands, public.game_actions, public.game_secrets, public.matchmaking_queue from anon, authenticated;

-- Is the signed-in player in this game? (security definer: no RLS loop.)
create or replace function public.plays_in(p_game uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.game_players where game_id = p_game and user_id = auth.uid()) $$;
revoke all on function public.plays_in(uuid) from public, anon;
grant execute on function public.plays_in(uuid) to authenticated;

-- Players read their own games, who's in them and the moves; only their own hand. Nobody reads the secrets.
grant select on public.games, public.game_players, public.game_hands, public.game_actions to authenticated;
drop policy if exists games_players_read on public.games;
create policy games_players_read on public.games for select to authenticated using (public.plays_in(id));
drop policy if exists game_players_read on public.game_players;
create policy game_players_read on public.game_players for select to authenticated using (public.plays_in(game_id));
drop policy if exists game_hands_own on public.game_hands;
create policy game_hands_own on public.game_hands for select to authenticated using (user_id = auth.uid());
drop policy if exists game_actions_players_read on public.game_actions;
create policy game_actions_players_read on public.game_actions for select to authenticated using (public.plays_in(game_id));

-- ---------------------------------------------------------------------
-- The game server's functions (service role only)
-- ---------------------------------------------------------------------

-- A game's rows from its record (the server's GameRecord), and the viewer copies.
create or replace function public.bronze_game_write(p_record jsonb, p_public_state jsonb, p_hands jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid := (p_record ->> 'id')::uuid;
begin
  insert into public.games (id, code, host_id, status, visibility, rated, allow_spectators, mode, map_id, max_players, version, public_state, created_at, started_at, finished_at)
  values (
    gid, p_record ->> 'code', nullif(p_record ->> 'hostId', '')::uuid, p_record ->> 'status', p_record ->> 'visibility',
    coalesce((p_record ->> 'rated')::boolean, false), coalesce((p_record ->> 'allowSpectators')::boolean, true),
    p_record ->> 'mode', p_record ->> 'mapId', (p_record ->> 'maxPlayers')::int, (p_record ->> 'version')::int, p_public_state,
    to_timestamp((p_record ->> 'createdAt')::double precision / 1000),
    to_timestamp((p_record ->> 'startedAt')::double precision / 1000),
    to_timestamp((p_record ->> 'finishedAt')::double precision / 1000))
  on conflict (id) do update set
    host_id = excluded.host_id, status = excluded.status, visibility = excluded.visibility, rated = excluded.rated,
    allow_spectators = excluded.allow_spectators, version = excluded.version, public_state = excluded.public_state,
    started_at = excluded.started_at, finished_at = excluded.finished_at;

  insert into public.game_secrets (game_id, record) values (gid, p_record)
  on conflict (game_id) do update set record = excluded.record;

  delete from public.game_players where game_id = gid and seat >= jsonb_array_length(p_record -> 'seats');
  insert into public.game_players (game_id, seat, user_id, username, bot_level, place, rating_delta)
  select gid, (s ->> 'seat')::int, nullif(s ->> 'userId', '')::uuid, s ->> 'username', s ->> 'bot',
         nullif(p_record #>> array['result', 'places', s ->> 'seat'], '')::int,
         (select (r ->> 'delta')::double precision from jsonb_array_elements(coalesce(p_record #> '{result,ratings}', '[]'::jsonb)) r where r ->> 'userId' = s ->> 'userId')
  from jsonb_array_elements(p_record -> 'seats') s
  on conflict (game_id, seat) do update set user_id = excluded.user_id, username = excluded.username, bot_level = excluded.bot_level,
    place = excluded.place, rating_delta = excluded.rating_delta;

  delete from public.game_hands where game_id = gid;
  insert into public.game_hands (game_id, seat, user_id, cards)
  select gid, (h ->> 'seat')::int, nullif(h ->> 'userId', '')::uuid, h -> 'cards'
  from jsonb_array_elements(coalesce(p_hands, '[]'::jsonb)) h
  where nullif(h ->> 'userId', '') is not null;
end;
$$;

create or replace function public.bronze_game_insert(p_record jsonb, p_public_state jsonb, p_hands jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.games where id = (p_record ->> 'id')::uuid) then raise exception 'duplicate game' using errcode = '23505'; end if;
  perform public.bronze_game_write(p_record, p_public_state, p_hands);
end;
$$;

create or replace function public.bronze_game_load(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select record from public.game_secrets where game_id = p_id $$;

create or replace function public.bronze_game_by_code(p_code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select id from public.games where code = upper(p_code) $$;

-- Save only if nobody saved since `p_expected`: the version check and every write in one transaction.
create or replace function public.bronze_game_save(p_record jsonb, p_expected integer, p_actions jsonb, p_public_state jsonb, p_hands jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid := (p_record ->> 'id')::uuid;
  current_version integer;
begin
  select version into current_version from public.games where id = gid for update;
  if current_version is null or current_version <> p_expected then return false; end if;
  perform public.bronze_game_write(p_record, p_public_state, p_hands);
  insert into public.game_actions (game_id, seq, seat, action, by, created_at)
  select gid, (a ->> 'seq')::int, (a ->> 'seat')::int, a -> 'action', a ->> 'by', to_timestamp((a ->> 'at')::double precision / 1000)
  from jsonb_array_elements(coalesce(p_actions, '[]'::jsonb)) a;
  return true;
end;
$$;

create or replace function public.bronze_game_actions(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('seq', seq, 'seat', seat, 'action', action, 'by', by, 'at', floor(extract(epoch from created_at) * 1000)) order by seq), '[]'::jsonb)
  from public.game_actions where game_id = p_id
$$;

-- Lobbies open to join and games being played that anyone may watch.
create or replace function public.bronze_games_public()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(s.record order by g.created_at desc), '[]'::jsonb)
  from public.games g join public.game_secrets s on s.game_id = g.id
  where g.visibility = 'public' and g.status in ('lobby', 'playing') and g.created_at > now() - interval '2 days'
$$;

-- A player's games: those not over, and the last 20 finished.
create or replace function public.bronze_games_for(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(record order by created_at desc), '[]'::jsonb) from (
    (select s.record, g.created_at from public.games g join public.game_secrets s on s.game_id = g.id
     where g.status in ('lobby', 'playing') and exists (select 1 from public.game_players p where p.game_id = g.id and p.user_id = p_user))
    union all
    (select s.record, g.created_at from public.games g join public.game_secrets s on s.game_id = g.id
     where g.status in ('finished', 'aborted') and exists (select 1 from public.game_players p where p.game_id = g.id and p.user_id = p_user)
     order by g.finished_at desc nulls last limit 20)
  ) x
$$;

create or replace function public.bronze_ratings_get(p_users uuid[], p_map text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(user_id::text, jsonb_build_object(
    'userId', user_id, 'mapId', map_id, 'rating', rating, 'rd', rd, 'volatility', volatility, 'gamesPlayed', games_played,
    'peakRating', peak_rating, 'updatedAt', floor(extract(epoch from updated_at) * 1000))), '{}'::jsonb)
  from public.ratings where map_id = p_map and user_id = any (p_users)
$$;

create or replace function public.bronze_ratings_save(p_rows jsonb, p_history jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ratings (user_id, map_id, rating, rd, volatility, games_played, peak_rating, updated_at)
  select (r ->> 'userId')::uuid, r ->> 'mapId', (r ->> 'rating')::double precision, (r ->> 'rd')::double precision, (r ->> 'volatility')::double precision,
         (r ->> 'gamesPlayed')::int, (r ->> 'peakRating')::double precision, to_timestamp((r ->> 'updatedAt')::double precision / 1000)
  from jsonb_array_elements(p_rows) r
  on conflict (user_id, map_id) do update set rating = excluded.rating, rd = excluded.rd, volatility = excluded.volatility,
    games_played = excluded.games_played, peak_rating = excluded.peak_rating, updated_at = excluded.updated_at;
  insert into public.rating_history (user_id, map_id, game_id, before, after, delta, mode, created_at)
  select (h ->> 'userId')::uuid, h ->> 'mapId', (h ->> 'gameId')::uuid, (h ->> 'before')::double precision, (h ->> 'after')::double precision,
         (h ->> 'delta')::double precision, h ->> 'mode', to_timestamp((h ->> 'at')::double precision / 1000)
  from jsonb_array_elements(p_history) h;
end;
$$;

create or replace function public.bronze_queue_get()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(jsonb_agg(entry order by since), '[]'::jsonb) from public.matchmaking_queue $$;

create or replace function public.bronze_queue_put(p_entry jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.matchmaking_queue (user_id, entry, since)
  values ((p_entry ->> 'userId')::uuid, p_entry, to_timestamp((p_entry ->> 'since')::double precision / 1000))
  on conflict (user_id) do update set entry = excluded.entry, since = excluded.since
$$;

create or replace function public.bronze_queue_remove(p_users uuid[])
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.matchmaking_queue where user_id = any (p_users) $$;

-- The server's functions: the service role only (never players).
revoke all on function
  public.bronze_game_write(jsonb, jsonb, jsonb),
  public.bronze_game_insert(jsonb, jsonb, jsonb),
  public.bronze_game_load(uuid),
  public.bronze_game_by_code(text),
  public.bronze_game_save(jsonb, integer, jsonb, jsonb, jsonb),
  public.bronze_game_actions(uuid),
  public.bronze_games_public(),
  public.bronze_games_for(uuid),
  public.bronze_ratings_get(uuid[], text),
  public.bronze_ratings_save(jsonb, jsonb),
  public.bronze_queue_get(),
  public.bronze_queue_put(jsonb),
  public.bronze_queue_remove(uuid[])
from public, anon, authenticated;
grant execute on function
  public.bronze_game_write(jsonb, jsonb, jsonb),
  public.bronze_game_insert(jsonb, jsonb, jsonb),
  public.bronze_game_load(uuid),
  public.bronze_game_by_code(text),
  public.bronze_game_save(jsonb, integer, jsonb, jsonb, jsonb),
  public.bronze_game_actions(uuid),
  public.bronze_games_public(),
  public.bronze_games_for(uuid),
  public.bronze_ratings_get(uuid[], text),
  public.bronze_ratings_save(jsonb, jsonb),
  public.bronze_queue_get(),
  public.bronze_queue_put(jsonb),
  public.bronze_queue_remove(uuid[])
to service_role;
