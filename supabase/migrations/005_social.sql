-- =====================================================================
-- Bronze — 005: friends, presence, game invites, and what profiles and
-- the leaderboard read.
--
-- Run after 001–004 (safe to run again). As in 004, the game server (the
-- `game` Edge Function, with the service role key) is the only writer.
-- Tables:
--   friendships   one row per pair: who asked, pending or accepted
--   presence      when each player last asked the server anything (online
--                 = in the last 2 minutes)
--   game_invites  a friend's invite to a game that hasn't started
-- Also: "friends only" profiles and match histories now mean friends (they
-- meant "only me" until friends existed: public.can_see).
-- =====================================================================

create table if not exists public.friendships (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  requester uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  since timestamptz not null default now(),
  check (a <> b),
  check (requester in (a, b))
);
-- One row per pair, whichever way round.
create unique index if not exists friendships_pair_idx on public.friendships (least(a, b), greatest(a, b));
create index if not exists friendships_b_idx on public.friendships (b);

create table if not exists public.presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen timestamptz not null default now()
);

create table if not exists public.game_invites (
  id uuid primary key,
  from_user uuid not null references auth.users (id) on delete cascade,
  from_name text not null,
  to_user uuid not null references auth.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique (to_user, game_id)
);

alter table public.friendships enable row level security;
alter table public.presence enable row level security;
alter table public.game_invites enable row level security;
revoke all on public.friendships, public.presence, public.game_invites from anon, authenticated;

-- "Friends only" now means friends (002 treated it as "only me" until friends existed).
create or replace function public.can_see(owner uuid, visibility text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- coalesce: for a visitor who isn't logged in, auth.uid() is null.
  select coalesce(owner = auth.uid(), false)
      or visibility = 'public'
      or (visibility = 'friends' and exists (
            select 1 from public.friendships f
            where f.status = 'accepted' and ((f.a = owner and f.b = auth.uid()) or (f.b = owner and f.a = auth.uid()))));
$$;

-- ---------------------------------------------------------------------
-- The game server's functions (service role only)
-- ---------------------------------------------------------------------

-- What the server knows of a player: name, picture and privacy settings.
create or replace function public.bronze_user_info(p public.profiles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('userId', p.id, 'username', p.username, 'avatar', coalesce(p.avatar_url, p.avatar),
    'profileVisibility', coalesce(p.profile_visibility, 'public'), 'historyVisibility', coalesce(p.history_visibility, 'public'))
$$;

create or replace function public.bronze_user_find(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select public.bronze_user_info(p) from public.profiles p where lower(p.username) = lower(trim(p_username)) and not p.needs_username $$;

create or replace function public.bronze_users_get(p_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(jsonb_object_agg(p.id::text, public.bronze_user_info(p)), '{}'::jsonb) from public.profiles p where p.id = any (p_ids) $$;

-- Usernames starting with the prefix (letters, digits and _ only; _ is matched literally).
create or replace function public.bronze_users_search(p_prefix text, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.bronze_user_info(x) order by x.username), '[]'::jsonb) from (
    select p.* from public.profiles p
    where not p.needs_username
      and lower(p.username) like replace(lower(regexp_replace(p_prefix, '[^A-Za-z0-9_]', '', 'g')), '_', '\_') || '%'
    order by p.username
    limit least(greatest(p_limit, 1), 50)
  ) x
$$;

create or replace function public.bronze_touch(p_user uuid, p_at double precision)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.presence (user_id, last_seen) values (p_user, to_timestamp(p_at / 1000))
  on conflict (user_id) do update set last_seen = excluded.last_seen
$$;

create or replace function public.bronze_last_seen(p_users uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(jsonb_object_agg(user_id::text, floor(extract(epoch from last_seen) * 1000)), '{}'::jsonb) from public.presence where user_id = any (p_users) $$;

create or replace function public.bronze_friendships(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('a', a, 'b', b, 'requester', requester, 'status', status, 'since', floor(extract(epoch from since) * 1000))), '[]'::jsonb)
  from public.friendships where a = p_user or b = p_user
$$;

create or replace function public.bronze_friendship_put(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.friendships
  where least(a, b) = least((p ->> 'a')::uuid, (p ->> 'b')::uuid) and greatest(a, b) = greatest((p ->> 'a')::uuid, (p ->> 'b')::uuid);
  insert into public.friendships (a, b, requester, status, since)
  values ((p ->> 'a')::uuid, (p ->> 'b')::uuid, (p ->> 'requester')::uuid, p ->> 'status', to_timestamp((p ->> 'since')::double precision / 1000));
end;
$$;

create or replace function public.bronze_friendship_remove(p_a uuid, p_b uuid)
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.friendships where least(a, b) = least(p_a, p_b) and greatest(a, b) = greatest(p_a, p_b) $$;

create or replace function public.bronze_invite_put(p jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.game_invites (id, from_user, from_name, to_user, game_id, code, created_at)
  values ((p ->> 'id')::uuid, (p ->> 'from')::uuid, p ->> 'fromName', (p ->> 'to')::uuid, (p ->> 'gameId')::uuid, p ->> 'code', to_timestamp((p ->> 'at')::double precision / 1000))
  on conflict (to_user, game_id) do update set id = excluded.id, from_user = excluded.from_user, from_name = excluded.from_name, code = excluded.code, created_at = excluded.created_at
$$;

-- Invites still worth showing: to games that haven't started.
create or replace function public.bronze_invites_for(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'from', i.from_user, 'fromName', i.from_name, 'to', i.to_user, 'gameId', i.game_id,
    'code', i.code, 'at', floor(extract(epoch from i.created_at) * 1000)) order by i.created_at desc), '[]'::jsonb)
  from public.game_invites i join public.games g on g.id = i.game_id
  where i.to_user = p_user and g.status = 'lobby'
$$;

create or replace function public.bronze_invite_remove(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.game_invites where id = p_id $$;

-- Rating rows as the server reads them (as bronze_ratings_get).
create or replace function public.bronze_rating_row(r public.ratings)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('userId', r.user_id, 'mapId', r.map_id, 'rating', r.rating, 'rd', r.rd, 'volatility', r.volatility,
    'gamesPlayed', r.games_played, 'peakRating', r.peak_rating, 'updatedAt', floor(extract(epoch from r.updated_at) * 1000))
$$;

create or replace function public.bronze_ratings_for(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(jsonb_agg(public.bronze_rating_row(r) order by r.map_id), '[]'::jsonb) from public.ratings r where r.user_id = p_user $$;

-- The last `p_limit` rating changes on a map, oldest first.
create or replace function public.bronze_rating_history(p_user uuid, p_map text, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('gameId', game_id, 'before', before, 'after', after, 'delta', delta, 'mode', mode,
    'at', floor(extract(epoch from created_at) * 1000)) order by created_at), '[]'::jsonb)
  from (select * from public.rating_history where user_id = p_user and map_id = p_map order by created_at desc limit p_limit) h
$$;

create or replace function public.bronze_games_finished(p_user uuid, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(record order by finished_at desc nulls last), '[]'::jsonb) from (
    select s.record, g.finished_at from public.games g join public.game_secrets s on s.game_id = g.id
    where g.status in ('finished', 'aborted') and exists (select 1 from public.game_players p where p.game_id = g.id and p.user_id = p_user)
    order by g.finished_at desc nulls last
    limit p_limit
  ) x
$$;

-- Candidates for the leaderboard: enough games, highest first (the server leaves out ratings still provisional).
create or replace function public.bronze_leaderboard(p_map text, p_min_games integer, p_limit integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.bronze_rating_row(x.r) || jsonb_build_object('username', x.username) order by (x.r).rating desc), '[]'::jsonb) from (
    select r, p.username from public.ratings r join public.profiles p on p.id = r.user_id
    where r.map_id = p_map and r.games_played >= p_min_games
    order by r.rating desc
    limit p_limit
  ) x
$$;

revoke all on function
  public.bronze_user_info(public.profiles),
  public.bronze_user_find(text),
  public.bronze_users_get(uuid[]),
  public.bronze_users_search(text, integer),
  public.bronze_touch(uuid, double precision),
  public.bronze_last_seen(uuid[]),
  public.bronze_friendships(uuid),
  public.bronze_friendship_put(jsonb),
  public.bronze_friendship_remove(uuid, uuid),
  public.bronze_invite_put(jsonb),
  public.bronze_invites_for(uuid),
  public.bronze_invite_remove(uuid),
  public.bronze_rating_row(public.ratings),
  public.bronze_ratings_for(uuid),
  public.bronze_rating_history(uuid, text, integer),
  public.bronze_games_finished(uuid, integer),
  public.bronze_leaderboard(text, integer, integer)
from public, anon, authenticated;
grant execute on function
  public.bronze_user_info(public.profiles),
  public.bronze_user_find(text),
  public.bronze_users_get(uuid[]),
  public.bronze_users_search(text, integer),
  public.bronze_touch(uuid, double precision),
  public.bronze_last_seen(uuid[]),
  public.bronze_friendships(uuid),
  public.bronze_friendship_put(jsonb),
  public.bronze_friendship_remove(uuid, uuid),
  public.bronze_invite_put(jsonb),
  public.bronze_invites_for(uuid),
  public.bronze_invite_remove(uuid),
  public.bronze_rating_row(public.ratings),
  public.bronze_ratings_for(uuid),
  public.bronze_rating_history(uuid, text, integer),
  public.bronze_games_finished(uuid, integer),
  public.bronze_leaderboard(text, integer, integer)
to service_role;
