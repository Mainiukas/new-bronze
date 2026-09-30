-- =====================================================================
-- Bronze — 003: the first-time welcome slides, and ratings.
--
-- Run after 001 and 002 (safe to run again). Adds:
--   account_settings.onboarding_step / onboarding_done_at
--                     where a player is in the welcome slides (1–5), and
--                     when they finished them
--   consents          a 'fair-play' kind (the welcome slides' third tick box)
--   ratings           a Glicko-2 rating per player per map (rating, RD,
--                     volatility, games played, peak)
--   rating_history    every change, per game
-- and the functions the welcome slides call. Ratings are only ever
-- written by these functions and by the game server (service role):
-- players can read them, never write them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Welcome-slide progress
-- ---------------------------------------------------------------------
alter table public.account_settings
  add column if not exists onboarding_step integer not null default 1,
  add column if not exists onboarding_done_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'account_settings_onboarding_step_check') then
    alter table public.account_settings add constraint account_settings_onboarding_step_check check (onboarding_step between 1 and 5);
  end if;
end $$;

-- The fair-play promise is a consent like the Terms and the Privacy Policy.
alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check check (kind in ('terms', 'privacy', 'age', 'marketing', 'fair-play'));

-- ---------------------------------------------------------------------
-- 2. Ratings (Glicko-2, one per map)
-- ---------------------------------------------------------------------
create table if not exists public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  map_id text not null,
  rating double precision not null,
  rd double precision not null default 350 check (rd > 0),
  volatility double precision not null default 0.06 check (volatility > 0),
  games_played integer not null default 0 check (games_played >= 0),
  peak_rating double precision not null,
  -- The level picked in the welcome slides (its starting rating).
  start_level text check (start_level in ('new', 'beginner', 'intermediate', 'advanced')),
  updated_at timestamptz not null default now(),
  primary key (user_id, map_id)
);
create index if not exists ratings_leaderboard_idx on public.ratings (map_id, rating desc);

create table if not exists public.rating_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  map_id text not null,
  game_id uuid,
  before double precision not null,
  after double precision not null,
  delta double precision not null,
  mode text not null check (mode in ('normal', 'blitz', 'bullet')),
  created_at timestamptz not null default now()
);
create index if not exists rating_history_user_idx on public.rating_history (user_id, map_id, created_at);

alter table public.ratings enable row level security;
alter table public.rating_history enable row level security;
revoke all on public.ratings, public.rating_history from anon, authenticated;

-- Ratings are public (the leaderboard, profiles): anyone may read them. Nobody but the server writes them.
grant select on public.ratings, public.rating_history to anon, authenticated;
drop policy if exists ratings_read on public.ratings;
create policy ratings_read on public.ratings for select using (true);
drop policy if exists rating_history_read on public.rating_history;
create policy rating_history_read on public.rating_history for select using (true);

-- ---------------------------------------------------------------------
-- 3. The welcome slides
-- ---------------------------------------------------------------------

-- The map everyone plays for now; its rating is the one the welcome slides set.
create or replace function public.default_map_id()
returns text
language sql
immutable
set search_path = ''
as $$ select 'wales-and-the-west'::text $$;

-- Where the signed-in player is in the welcome slides.
create or replace function public.my_onboarding()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.account_settings%rowtype;
  rated integer;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  select * into s from public.account_settings where user_id = auth.uid();
  select coalesce(max(games_played), 0) into rated from public.ratings where user_id = auth.uid();
  return jsonb_build_object(
    'step', coalesce(s.onboarding_step, 1),
    'done_at', s.onboarding_done_at,
    -- The level can be picked only before the first rated game.
    'can_pick_level', rated = 0,
    'rules_accepted', exists (select 1 from public.consents c where c.user_id = auth.uid() and c.kind = 'fair-play' and c.granted));
end;
$$;

-- Remember the slide the player is on (so closing the tab resumes there).
create or replace function public.set_onboarding_step(p_step integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_step is null or p_step not between 1 and 5 then raise exception 'step must be 1 to 5' using errcode = '22023'; end if;
  insert into public.account_settings (user_id, onboarding_step) values (auth.uid(), p_step)
  on conflict (user_id) do update set onboarding_step = excluded.onboarding_step, updated_at = now();
end;
$$;

-- Slide 4: one consent row each for the Terms, the Privacy Policy and fair play.
create or replace function public.accept_rules(p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if p_version is null or length(p_version) not between 1 and 40 then raise exception 'version required' using errcode = '22023'; end if;
  insert into public.consents (user_id, kind, granted, version) values
    (auth.uid(), 'terms', true, p_version),
    (auth.uid(), 'privacy', true, p_version),
    (auth.uid(), 'fair-play', true, p_version);
  update public.profiles set terms_version = p_version where id = auth.uid();
end;
$$;

-- Slide 5: the starting rating for the level picked, then the lobby.
create or replace function public.finish_onboarding(p_level text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  start double precision;
  played integer;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  start := case p_level when 'new' then 800 when 'beginner' then 1000 when 'intermediate' then 1200 when 'advanced' then 1400 end;
  if start is null then raise exception 'unknown level' using errcode = '22023'; end if;
  if not exists (select 1 from public.consents where user_id = auth.uid() and kind = 'fair-play' and granted) then
    raise exception 'accept the rules first' using errcode = '42501';
  end if;
  select coalesce(max(games_played), 0) into played from public.ratings where user_id = auth.uid();
  if played > 0 then raise exception 'the level can''t change after a rated game' using errcode = '42501'; end if;
  insert into public.ratings (user_id, map_id, rating, rd, volatility, games_played, peak_rating, start_level)
  values (auth.uid(), public.default_map_id(), start, 350, 0.06, 0, start, p_level)
  on conflict (user_id, map_id) do update
    set rating = excluded.rating, rd = 350, volatility = 0.06, peak_rating = excluded.rating, start_level = excluded.start_level, updated_at = now();
  insert into public.account_settings (user_id, onboarding_step, onboarding_done_at) values (auth.uid(), 5, now())
  on conflict (user_id) do update set onboarding_step = 5, onboarding_done_at = coalesce(public.account_settings.onboarding_done_at, now()), updated_at = now();
  return jsonb_build_object('rating', start, 'map_id', public.default_map_id());
end;
$$;

revoke all on function
  public.my_onboarding(),
  public.set_onboarding_step(integer),
  public.accept_rules(text),
  public.finish_onboarding(text)
from public, anon;
grant execute on function
  public.my_onboarding(),
  public.set_onboarding_step(integer),
  public.accept_rules(text),
  public.finish_onboarding(text)
to authenticated;
