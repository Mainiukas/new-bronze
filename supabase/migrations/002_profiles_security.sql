-- =====================================================================
-- Bronze accounts: 002_profiles_security.sql
--
-- Run after 001_accounts.sql: SQL Editor -> New query -> paste -> Run.
-- SAFE TO RE-RUN: every statement is "if not exists", "create or replace"
-- or drops what it replaces first. Running it again changes nothing.
--
-- Adds:
--   profiles        bio, country, chosen avatar, privacy settings,
--                   phone/card verification, when the username last changed
--   username_history old usernames: links redirect, and nobody else can take
--                   them, for 30 days
--   match_history   each finished match (for averages, favourites, recent matches)
--   user_reports    "Report user", for moderation in the dashboard
--   mfa_recovery_codes  2FA recovery codes (hashed)
--   rate_limits     counters behind the rate limits
--   storage bucket `avatars` (public, 2 MB, jpg/png/webp) + policies
-- and the functions the profile and account pages call.
--
-- Friends aren't built yet: "Friends only" therefore means "only you" for now.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. New profile columns
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists bio text,
  add column if not exists country text,
  -- The avatar the player chose: 'preset:<id>' (an illustrated avatar) or
  -- their uploaded image in the avatars bucket. `avatar` stays the photo from
  -- the sign-in provider (Google); the app shows avatar_url, else avatar.
  add column if not exists avatar_url text,
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists history_visibility text not null default 'public',
  add column if not exists phone_verified boolean not null default false,
  add column if not exists card_verified boolean not null default false,
  add column if not exists card_verified_at timestamptz,
  add column if not exists card_brand text,
  add column if not exists card_last4 text,
  add column if not exists username_changed_at timestamptz;

alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (bio is null or char_length(bio) <= 160);
alter table public.profiles drop constraint if exists profiles_country_check;
alter table public.profiles add constraint profiles_country_check check (country is null or country ~ '^[A-Z]{2}$');
alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles add constraint profiles_visibility_check
  check (profile_visibility in ('public', 'friends', 'private') and history_visibility in ('public', 'friends', 'private'));
alter table public.profiles drop constraint if exists profiles_card_check;
alter table public.profiles add constraint profiles_card_check
  check ((card_last4 is null or card_last4 ~ '^[0-9]{4}$') and (card_brand is null or char_length(card_brand) <= 20));

-- Who can read what. Signed-in players read the public columns of public
-- profiles (and everything public of their own). Visitors who aren't logged
-- in, and anything beyond these columns, go through get_public_profile(),
-- which applies the privacy settings. Nobody writes the table directly: every
-- change goes through a function below that checks the rules.
drop policy if exists "Signed-in players read profiles" on public.profiles;
drop policy if exists "Players read visible profiles" on public.profiles;
create policy "Players read visible profiles"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or profile_visibility = 'public');

drop policy if exists "Players update their own profile" on public.profiles;

revoke all on public.profiles from anon, authenticated;
grant select (id, username, avatar, avatar_url, bio, country, wins, matches, best_score, goods_shipped, maps_played, achievements,
              created_at, needs_username, profile_visibility, history_visibility, phone_verified, card_verified)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. New tables (private: no policies, only the functions below use them)
-- ---------------------------------------------------------------------
create table if not exists public.username_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  old_username text not null,
  changed_at timestamptz not null default now()
);
create index if not exists username_history_name_idx on public.username_history (lower(old_username), changed_at desc);

create table if not exists public.match_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  finished_at timestamptz not null default now(),
  mode_id text,
  map_id text,
  players smallint,
  placement smallint,
  score integer not null,
  won boolean not null,
  goods_shipped integer not null default 0,
  links integer not null default 0,
  industries integer not null default 0,
  primary key (user_id, id)
);
create index if not exists match_history_recent_idx on public.match_history (user_id, finished_at desc);

create table if not exists public.user_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users (id) on delete set null,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('cheating', 'offensive-name', 'harassment', 'spam', 'other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);
create index if not exists user_reports_open_idx on public.user_reports (status, created_at desc);

create table if not exists public.mfa_recovery_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mfa_recovery_codes_user_idx on public.mfa_recovery_codes (user_id);

create table if not exists public.rate_limits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, subject, window_start)
);

alter table public.username_history enable row level security;
alter table public.match_history enable row level security;
alter table public.user_reports enable row level security;
alter table public.mfa_recovery_codes enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.username_history, public.match_history, public.user_reports, public.mfa_recovery_codes, public.rate_limits
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------

-- The caller's IP address, as Supabase's API gateway passes it on (for rate
-- limits on visitors who aren't logged in).
create or replace function public.request_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(trim(split_part(coalesce(
    (current_setting('request.headers', true))::json ->> 'cf-connecting-ip',
    (current_setting('request.headers', true))::json ->> 'x-forwarded-for', ''), ',', 1)), '');
$$;

-- A fixed-window rate limit: true while the caller (their account, else their
-- IP) has made at most p_max calls in this bucket in the current window.
create or replace function public.hit_rate_limit(p_bucket text, p_max integer, p_window interval)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  who text := coalesce(auth.uid()::text, public.request_ip(), 'anonymous');
  seconds double precision := extract(epoch from p_window);
  started timestamptz := to_timestamp(floor(extract(epoch from now()) / seconds) * seconds);
  n integer;
begin
  insert into public.rate_limits as r (bucket, subject, window_start, hits)
  values (p_bucket, who, started, 1)
  on conflict (bucket, subject, window_start) do update set hits = r.hits + 1
  returning hits into n;
  return n <= p_max;
end;
$$;

-- Raise "rate-limited" (HTTP 429 through the API) when over the limit.
create or replace function public.enforce_rate_limit(p_bucket text, p_max integer, p_window interval)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.hit_rate_limit(p_bucket, p_max, p_window) then
    raise exception 'rate-limited' using errcode = 'PT429';
  end if;
end;
$$;

-- Two-factor check: the caller's session passed 2FA, or they have none.
create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;

create or replace function public.require_mfa()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not public.mfa_ok() then
    raise exception 'mfa-required' using errcode = '42501';
  end if;
end;
$$;

-- Taken: someone's username now, or someone else's old one in the last 30 days.
create or replace function public.username_taken(name text, for_user uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where lower(p.username) = lower(trim(name)) and p.id is distinct from for_user)
      or exists (select 1 from public.username_history h
                 where lower(h.old_username) = lower(trim(name))
                   and h.changed_at > now() - interval '30 days'
                   and h.user_id is distinct from for_user);
$$;

-- Friends-only means "only me" until friends exist; the rule lives here.
create or replace function public.can_see(owner uuid, visibility text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- coalesce: for a visitor who isn't logged in, auth.uid() is null.
  select coalesce(owner = auth.uid(), false) or visibility = 'public';
$$;

-- The caller's password is right (for changing the username or password).
-- 5 tries per 15 minutes.
create or replace function public.check_my_password(p_password text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  hash text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('password-check', 5, interval '15 minutes');
  select u.encrypted_password into hash from auth.users u where u.id = auth.uid();
  return coalesce(hash, '') <> '' and extensions.crypt(coalesce(p_password, ''), hash) = hash;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Sign-up and usernames (replacing 001's versions: old names count as taken)
-- ---------------------------------------------------------------------
create or replace function public.record_signup(p_user uuid, p_age_band text, p_marketing boolean, p_terms_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  adult boolean := p_age_band = '18+';
  marketing boolean := adult and coalesce(p_marketing, false);
begin
  insert into public.account_settings (user_id, is_adult)
  values (p_user, adult)
  on conflict (user_id) do update set is_adult = excluded.is_adult, updated_at = now();
  update public.profiles set terms_version = p_terms_version, marketing_consent = marketing where id = p_user;
  -- Under 18: the profile and match history start visible only to them.
  if not adult then
    update public.profiles set profile_visibility = 'friends', history_visibility = 'friends' where id = p_user;
  end if;
  insert into public.consents (user_id, kind, granted, version) values
    (p_user, 'terms', true, p_terms_version),
    (p_user, 'privacy', true, p_terms_version),
    (p_user, 'age', true, p_age_band),
    (p_user, 'marketing', marketing, p_terms_version);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := trim(meta ->> 'username');
  age text := meta ->> 'age_band';
  terms text := meta ->> 'terms_version';
  photo text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
  temporary text := 'player_' || substr(md5(new.id::text), 1, 12);
begin
  if wanted ~ '^[A-Za-z0-9_]{3,20}$' and age in ('14-17', '18+') and coalesce(terms, '') <> ''
     and not public.username_taken(wanted, new.id) then
    insert into public.profiles (id, username, avatar) values (new.id, wanted, photo) on conflict do nothing;
    if found then
      perform public.record_signup(new.id, age, coalesce(meta ->> 'marketing', 'false') = 'true', terms);
      return new;
    end if;
  end if;
  loop
    insert into public.profiles (id, username, avatar, needs_username) values (new.id, temporary, photo, true) on conflict do nothing;
    exit when found or exists (select 1 from public.profiles p where p.id = new.id);
    temporary := 'player_' || substr(md5(random()::text), 1, 12);
  end loop;
  return new;
end;
$$;

create or replace function public.finish_signup(p_username text, p_age_band text, p_marketing boolean, p_terms_version text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text := trim(p_username);
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if name is null or name !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Usernames are 3-20 letters, numbers and underscores' using errcode = '22023';
  end if;
  if p_age_band is null or p_age_band not in ('14-17', '18+') then
    raise exception 'Accounts are only for people aged 14 or over' using errcode = '22023';
  end if;
  if coalesce(p_terms_version, '') = '' then
    raise exception 'The Terms and Privacy Policy must be accepted' using errcode = '22023';
  end if;
  if public.username_taken(name, uid) then
    raise exception 'username-taken' using errcode = '23505';
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid) then
    insert into public.profiles (id, username) values (uid, name);
    perform public.record_signup(uid, p_age_band, p_marketing, p_terms_version);
  else
    update public.profiles p set username = name, needs_username = false where p.id = uid and p.needs_username;
    if found then
      perform public.record_signup(uid, p_age_band, p_marketing, p_terms_version);
    end if;
  end if;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

-- Live check on the Register form and the username change: 60 per minute.
create or replace function public.is_username_available(name text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.enforce_rate_limit('username-check', 60, interval '1 minute');
  return not public.username_taken(name, auth.uid());
end;
$$;

-- Log in with a username: 001's version plus 30 calls a minute per IP.
create or replace function public.email_for_username(name text, password text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted text := lower(trim(name));
  paused_until timestamptz;
  account_email text;
  password_hash text;
begin
  perform public.enforce_rate_limit('login', 30, interval '1 minute');
  delete from public.login_attempts where last_failed_at < now() - interval '1 day';

  select a.locked_until into paused_until from public.login_attempts a where a.username = wanted;
  if paused_until is not null and paused_until > now() then
    return null;
  end if;

  select u.email, u.encrypted_password into account_email, password_hash
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = wanted;

  if account_email is not null
     and coalesce(password_hash, '') <> ''
     and extensions.crypt(password, password_hash) = password_hash then
    delete from public.login_attempts where username = wanted;
    return account_email;
  end if;

  insert into public.login_attempts as a (username, failures)
  values (wanted, 1)
  on conflict (username) do update
    set failures = case when a.locked_until is not null then 1 else a.failures + 1 end,
        locked_until = case when a.locked_until is null and a.failures + 1 >= 5 then now() + interval '30 seconds' end,
        last_failed_at = now();
  return null;
end;
$$;

-- Change the username: same rules as registering, once every 30 days, with
-- the current password (or, for accounts without one, a log-in in the last
-- 10 minutes). The old name redirects, and stays reserved, for 30 days.
-- Returns 'ok', or 'wrong-password' (not raised as an error, so the failed
-- try still counts towards check_my_password's limit); other problems raise.
drop function if exists public.change_username(text, text);
create or replace function public.change_username(p_username text, p_password text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text := trim(p_username);
  current_name text;
  last_change timestamptz;
  hash text;
  signed_in_at timestamptz;
begin
  perform public.require_mfa();
  perform public.enforce_rate_limit('username-change', 10, interval '1 hour');
  if name is null or name !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'invalid-username' using errcode = '22023';
  end if;
  select p.username, p.username_changed_at into current_name, last_change
  from public.profiles p where p.id = uid and not p.needs_username;
  if current_name is null then
    raise exception 'Choose a username first' using errcode = '22023';
  end if;
  if name = current_name then
    raise exception 'same-username' using errcode = '22023';
  end if;
  if last_change is not null and last_change > now() - interval '30 days' then
    raise exception 'too-soon' using errcode = '22023', hint = to_char((last_change + interval '30 days') at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  end if;
  select u.encrypted_password, u.last_sign_in_at into hash, signed_in_at from auth.users u where u.id = uid;
  if coalesce(hash, '') <> '' then
    if not public.check_my_password(p_password) then
      return 'wrong-password';
    end if;
  elsif signed_in_at is null or signed_in_at < now() - interval '10 minutes' then
    raise exception 'reauth-needed' using errcode = '28000';
  end if;
  if public.username_taken(name, uid) then
    raise exception 'username-taken' using errcode = '23505';
  end if;
  insert into public.username_history (user_id, old_username) values (uid, current_name);
  update public.profiles p set username = name, username_changed_at = now() where p.id = uid;
  return 'ok';
end;
$$;

-- An old name, changed in the last 30 days: the name it's now called.
create or replace function public.resolve_username(name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.username from public.profiles p where lower(p.username) = lower(trim(name)) and not p.needs_username),
    (select p.username
     from public.username_history h join public.profiles p on p.id = h.user_id
     where lower(h.old_username) = lower(trim(name)) and h.changed_at > now() - interval '30 days' and not p.needs_username
     order by h.changed_at desc limit 1));
$$;

-- ---------------------------------------------------------------------
-- 5. Editing your profile and privacy
-- ---------------------------------------------------------------------
create or replace function public.update_profile_details(p_bio text, p_country text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  clean_bio text := nullif(trim(regexp_replace(coalesce(p_bio, ''), '[[:cntrl:]]', ' ', 'g')), '');
  clean_country text := nullif(upper(trim(coalesce(p_country, ''))), '');
begin
  perform public.require_mfa();
  perform public.enforce_rate_limit('profile-edit', 30, interval '1 hour');
  if clean_bio is not null and char_length(clean_bio) > 160 then
    raise exception 'bio-too-long' using errcode = '22023';
  end if;
  if clean_country is not null and clean_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid-country' using errcode = '22023';
  end if;
  update public.profiles p set bio = clean_bio, country = clean_country where p.id = uid;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

-- The chosen avatar: null (back to the sign-in photo or the initial), an
-- illustrated one ('preset:<id>'), or an image the player uploaded to their
-- own folder of the avatars bucket.
create or replace function public.set_avatar(p_value text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_mfa();
  perform public.enforce_rate_limit('profile-edit', 30, interval '1 hour');
  if p_value is not null
     and p_value !~ '^preset:[a-z0-9-]{1,32}$'
     and p_value !~ ('^https://[A-Za-z0-9.-]+(:[0-9]+)?/storage/v1/object/public/avatars/' || uid::text || '/[A-Za-z0-9._-]{1,80}$') then
    raise exception 'invalid-avatar' using errcode = '22023';
  end if;
  update public.profiles p set avatar_url = p_value where p.id = uid;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

create or replace function public.set_privacy(p_profile text, p_history text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_mfa();
  if p_profile not in ('public', 'friends', 'private') or p_history not in ('public', 'friends', 'private') then
    raise exception 'invalid-visibility' using errcode = '22023';
  end if;
  update public.profiles p set profile_visibility = p_profile, history_visibility = p_history where p.id = uid;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

-- The signed-in player's own account details, including the private ones.
create or replace function public.my_account()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bio', p.bio,
    'country', p.country,
    'avatar_url', p.avatar_url,
    'profile_visibility', p.profile_visibility,
    'history_visibility', p.history_visibility,
    'phone_verified', p.phone_verified,
    'card_verified', p.card_verified,
    'card_verified_at', p.card_verified_at,
    'card_brand', p.card_brand,
    'card_last4', p.card_last4,
    'username_changed_at', p.username_changed_at,
    'next_username_change_at', case when p.username_changed_at is null then null else p.username_changed_at + interval '30 days' end,
    'has_password', coalesce(u.encrypted_password, '') <> '',
    'last_sign_in_at', u.last_sign_in_at,
    'recovery_codes_left', (select count(*) from public.mfa_recovery_codes c where c.user_id = p.id and c.used_at is null))
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 6. Public profile, match history, reports
-- ---------------------------------------------------------------------

-- A profile as the viewer may see it. Unknown name: null. An old name
-- (changed in the last 30 days): {"redirect": "<new name>"}. Private (or
-- friends-only, to anyone else): only the username and avatar.
create or replace function public.get_public_profile(p_username text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  current_name text;
  visible boolean;
  history_visible boolean;
  summary jsonb;
begin
  perform public.enforce_rate_limit('profile-view', 240, interval '1 minute');
  select * into p from public.profiles x where lower(x.username) = lower(trim(p_username)) and not x.needs_username;
  if p.id is null then
    current_name := public.resolve_username(p_username);
    return case when current_name is null then null else jsonb_build_object('redirect', current_name) end;
  end if;
  visible := public.can_see(p.id, p.profile_visibility);
  history_visible := visible and public.can_see(p.id, p.history_visibility);
  if not visible then
    return jsonb_build_object('username', p.username, 'avatar', coalesce(p.avatar_url, p.avatar), 'private', true,
                              'is_self', false);
  end if;
  select jsonb_build_object(
    'recorded_matches', count(*),
    'average_score', round(avg(h.score)::numeric, 1),
    'links', coalesce(sum(h.links), 0),
    'industries', coalesce(sum(h.industries), 0),
    'favourite_mode', (select h2.mode_id from public.match_history h2 where h2.user_id = p.id and h2.mode_id is not null
                       group by h2.mode_id order by count(*) desc, max(h2.finished_at) desc limit 1),
    'favourite_map', (select h2.map_id from public.match_history h2 where h2.user_id = p.id and h2.map_id is not null
                      group by h2.map_id order by count(*) desc, max(h2.finished_at) desc limit 1))
  into summary
  from public.match_history h where h.user_id = p.id;
  return jsonb_build_object(
    'username', p.username,
    'avatar', coalesce(p.avatar_url, p.avatar),
    'private', false,
    'is_self', coalesce(p.id = auth.uid(), false),
    'created_at', p.created_at,
    'bio', p.bio,
    'country', p.country,
    'phone_verified', p.phone_verified,
    'card_verified', p.card_verified,
    'history_visible', history_visible,
    'stats', jsonb_build_object('matches', p.matches, 'wins', p.wins, 'best_score', p.best_score,
                                'goods_shipped', p.goods_shipped, 'maps_played', p.maps_played, 'achievements', p.achievements),
    'summary', summary);
end;
$$;

-- The last 20 matches, a page at a time (newest first), if the viewer may see them.
create or replace function public.get_match_history(p_username text, p_page integer default 0, p_page_size integer default 10)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  p public.profiles;
  size integer := least(greatest(coalesce(p_page_size, 10), 1), 20);
  page integer := greatest(coalesce(p_page, 0), 0);
  total integer;
  items jsonb;
begin
  perform public.enforce_rate_limit('profile-view', 240, interval '1 minute');
  select * into p from public.profiles x where lower(x.username) = lower(trim(p_username)) and not x.needs_username;
  if p.id is null or not (public.can_see(p.id, p.profile_visibility) and public.can_see(p.id, p.history_visibility)) then
    return null;
  end if;
  select least(count(*), 20) into total from public.match_history h where h.user_id = p.id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'finished_at', r.finished_at, 'map_id', r.map_id, 'mode_id', r.mode_id, 'players', r.players,
           'placement', r.placement, 'score', r.score, 'won', r.won) order by r.finished_at desc), '[]'::jsonb)
  into items
  from (select * from (select * from public.match_history h where h.user_id = p.id order by h.finished_at desc limit 20) last20
        order by last20.finished_at desc offset page * size limit size) r;
  return jsonb_build_object('total', total, 'page', page, 'page_size', size, 'items', items);
end;
$$;

-- Report a player for moderation (Table Editor -> user_reports). 5 an hour;
-- the same player again within a day is accepted but not stored twice.
create or replace function public.report_user(p_username text, p_reason text, p_details text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('report', 5, interval '1 hour');
  if p_reason not in ('cheating', 'offensive-name', 'harassment', 'spam', 'other') then
    raise exception 'invalid-reason' using errcode = '22023';
  end if;
  select p.id into target from public.profiles p where lower(p.username) = lower(trim(p_username));
  if target is null or target = uid then
    raise exception 'invalid-target' using errcode = '22023';
  end if;
  if not exists (select 1 from public.user_reports r where r.reporter_id = uid and r.reported_id = target and r.created_at > now() - interval '1 day') then
    insert into public.user_reports (reporter_id, reported_id, reason, details)
    values (uid, target, p_reason, nullif(left(trim(coalesce(p_details, '')), 500), ''));
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Match results, now with the match's details (replaces 001's version)
-- ---------------------------------------------------------------------
drop function if exists public.record_match_result(integer, boolean, uuid, integer, text, text[]);

create or replace function public.record_match_result(
  score integer,
  won boolean,
  p_match_id uuid default null,
  p_goods_shipped integer default 0,
  p_map_id text default null,
  p_achievements text[] default '{}',
  p_mode_id text default null,
  p_players integer default null,
  p_placement integer default null,
  p_links integer default 0,
  p_industries integer default 0
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  match_id uuid := coalesce(p_match_id, gen_random_uuid());
  stamp text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  unlocked text[] := coalesce(p_achievements, '{}');
begin
  perform public.require_mfa();
  if score is null or score < 0 or score > 1000 then
    raise exception 'Score out of range' using errcode = '22023';
  end if;
  if coalesce(p_goods_shipped, 0) not between 0 and 500 or coalesce(p_links, 0) not between 0 and 200
     or coalesce(p_industries, 0) not between 0 and 200 then
    raise exception 'Match details out of range' using errcode = '22023';
  end if;
  if p_players is not null and p_players not between 1 and 8
     or p_placement is not null and (p_placement < 1 or p_placement > coalesce(p_players, 8)) then
    raise exception 'Players or placement out of range' using errcode = '22023';
  end if;
  if p_map_id is not null and p_map_id !~ '^[a-z0-9-]{1,40}$' or p_mode_id is not null and p_mode_id !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'Unknown map or mode' using errcode = '22023';
  end if;
  if cardinality(unlocked) > 50 or exists (select 1 from unnest(unlocked) a where a !~ '^[a-z0-9-]{1,40}$') then
    raise exception 'Unknown achievement' using errcode = '22023';
  end if;

  -- Counted once per id (001 kept ids in match_results; both are checked).
  insert into public.match_results (user_id, id) values (uid, match_id) on conflict do nothing;
  if not found then
    return query select * from public.profiles p where p.id = uid;
    return;
  end if;
  insert into public.match_history (user_id, id, mode_id, map_id, players, placement, score, won, goods_shipped, links, industries)
  values (uid, match_id, p_mode_id, p_map_id, p_players, p_placement, score, coalesce(won, false),
          coalesce(p_goods_shipped, 0), coalesce(p_links, 0), coalesce(p_industries, 0))
  on conflict do nothing;

  update public.profiles p set
    matches = p.matches + 1,
    wins = p.wins + case when won then 1 else 0 end,
    best_score = greatest(p.best_score, score),
    goods_shipped = p.goods_shipped + coalesce(p_goods_shipped, 0),
    maps_played = case when p_map_id is null or p_map_id = any (p.maps_played) then p.maps_played else p.maps_played || p_map_id end,
    achievements = p.achievements || coalesce((select jsonb_object_agg(a, stamp) from unnest(unlocked) a where not p.achievements ? a), '{}'::jsonb)
  where p.id = uid;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Two-factor recovery codes, phone, card, sign-ins
-- ---------------------------------------------------------------------

-- Ten new recovery codes (shown once; only their hashes are kept). Needs a
-- session that has passed 2FA.
create or replace function public.regenerate_recovery_codes()
returns text[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  codes text[] := '{}';
  code text;
  bytes bytea;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' then
    raise exception 'mfa-required' using errcode = '42501';
  end if;
  delete from public.mfa_recovery_codes where user_id = uid;
  for i in 1..10 loop
    bytes := extensions.gen_random_bytes(10);
    code := '';
    for j in 0..9 loop
      code := code || substr(alphabet, (get_byte(bytes, j) % length(alphabet)) + 1, 1);
      if j = 4 then code := code || '-'; end if;
    end loop;
    codes := codes || code;
    insert into public.mfa_recovery_codes (user_id, code_hash) values (uid, extensions.crypt(code, extensions.gen_salt('bf', 8)));
  end loop;
  return codes;
end;
$$;

-- After turning 2FA off: the codes go too.
create or replace function public.clear_recovery_codes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified') then
    raise exception 'Two-factor authentication is still on' using errcode = '22023';
  end if;
  delete from public.mfa_recovery_codes where user_id = auth.uid();
end;
$$;

-- "Use a recovery code instead" at log-in (before 2FA is passed). A right code
-- is used up and turns two-factor authentication off, so the player can get
-- in and set it up again. 5 tries per 15 minutes.
create or replace function public.use_recovery_code(p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  wanted text := lower(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  row_id bigint;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('recovery-code', 5, interval '15 minutes');
  if char_length(wanted) <> 10 then
    return false;
  end if;
  wanted := substr(wanted, 1, 5) || '-' || substr(wanted, 6, 5);
  select c.id into row_id from public.mfa_recovery_codes c
  where c.user_id = uid and c.used_at is null and extensions.crypt(wanted, c.code_hash) = c.code_hash
  limit 1;
  if row_id is null then
    return false;
  end if;
  update public.mfa_recovery_codes set used_at = now() where id = row_id;
  delete from auth.mfa_factors where user_id = uid;
  delete from public.mfa_recovery_codes where user_id = uid;
  return true;
end;
$$;

-- Before sending or checking a phone code: 5 a hour.
create or replace function public.note_phone_attempt()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  return public.hit_rate_limit('phone', 5, interval '1 hour');
end;
$$;

-- Before starting a card check (the create-setup-intent Edge Function asks
-- with the player's own session): 5 a hour.
create or replace function public.note_card_check()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  return public.hit_rate_limit('card-check', 5, interval '1 hour');
end;
$$;

-- "Verified" follows the confirmed phone number in auth.users.
create or replace function public.sync_phone_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set phone_verified = new.phone_confirmed_at is not null and coalesce(new.phone, '') <> ''
  where p.id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function public.sync_phone_verified();

-- "Remove verification": forget the card details (nothing is kept at Stripe:
-- the card was only checked, never saved to a customer).
create or replace function public.remove_card_verification()
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_mfa();
  update public.profiles p set card_verified = false, card_verified_at = null, card_brand = null, card_last4 = null
  where p.id = auth.uid();
  return query select * from public.profiles p where p.id = auth.uid();
end;
$$;

-- Recent sign-ins: the caller's sessions, newest first. `current` marks this one.
create or replace function public.recent_sign_ins()
returns table (id uuid, signed_in_at timestamptz, last_active_at timestamptz, user_agent text, ip text, current boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.created_at, coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at), s.user_agent, host(s.ip),
         s.id::text = coalesce(auth.jwt() ->> 'session_id', '')
  from auth.sessions s
  where s.user_id = auth.uid()
  order by coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at) desc
  limit 20;
$$;

-- ---------------------------------------------------------------------
-- 9. Data export and deletion (replacing 001's versions)
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_mfa();
  return (select jsonb_build_object(
    'account', (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'phone', nullif(u.phone, ''),
        'created_at', u.created_at,
        'email_confirmed_at', u.email_confirmed_at,
        'phone_confirmed_at', u.phone_confirmed_at,
        'last_sign_in_at', u.last_sign_in_at,
        'sign_in_methods', coalesce((select jsonb_agg(distinct i.provider) from auth.identities i where i.user_id = u.id), '[]'::jsonb),
        'two_factor_methods', coalesce((select jsonb_agg(f.factor_type) from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'), '[]'::jsonb),
        'details_from_sign_in', u.raw_user_meta_data)
      from auth.users u where u.id = auth.uid()),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'settings', (
      select jsonb_build_object('age_18_or_over', s.is_adult, 'friend_emails', s.email_friends, 'tournament_emails', s.email_tournaments)
      from public.account_settings s where s.user_id = auth.uid()),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted, 'version', c.version, 'at', c.created_at) order by c.created_at, c.id)
      from public.consents c where c.user_id = auth.uid()), '[]'::jsonb),
    'username_history', coalesce((
      select jsonb_agg(jsonb_build_object('old_username', h.old_username, 'changed_at', h.changed_at) order by h.changed_at)
      from public.username_history h where h.user_id = auth.uid()), '[]'::jsonb),
    'match_history', coalesce((
      select jsonb_agg(to_jsonb(m) - 'user_id' order by m.finished_at)
      from public.match_history m where m.user_id = auth.uid()), '[]'::jsonb),
    'reports_you_made', coalesce((
      select jsonb_agg(jsonb_build_object('reason', r.reason, 'details', r.details, 'at', r.created_at) order by r.created_at)
      from public.user_reports r where r.reporter_id = auth.uid()), '[]'::jsonb),
    'recovery_codes_left', (select count(*) from public.mfa_recovery_codes c where c.user_id = auth.uid() and c.used_at is null),
    'sign_ins', coalesce((select jsonb_agg(to_jsonb(s)) from public.recent_sign_ins() s), '[]'::jsonb),
    'saved_result_ids', (select count(*) from public.match_results r where r.user_id = auth.uid()),
    'failed_log_ins', (
      select jsonb_build_object('failures', a.failures, 'last_failed_at', a.last_failed_at, 'locked_until', a.locked_until)
      from public.login_attempts a join public.profiles p on lower(p.username) = a.username
      where p.id = auth.uid()),
    'matches', 'Matches are played in your browser; the server keeps your totals and a line per finished match.'
  ));
end;
$$;

-- The app removes the player's avatar images from Storage first (Storage
-- only allows that through its API); everything else goes here.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text;
begin
  perform public.require_mfa();
  select p.username into name from public.profiles p where p.id = uid;
  if name is not null then
    delete from public.login_attempts a where a.username = lower(name);
  end if;
  delete from public.profiles p where p.id = uid;
  delete from auth.users u where u.id = uid;
end;
$$;

-- Hourly clean-up (001's job calls this): also old username reservations
-- and rate-limit counters, and reports older than a year.
create or replace function public.bronze_cleanup()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users u
  where u.created_at < now() - interval '7 days'
    and (u.email_confirmed_at is null
         or not exists (select 1 from public.profiles p where p.id = u.id and not p.needs_username));
  delete from public.login_attempts a where a.last_failed_at < now() - interval '1 day';
  delete from public.username_history h where h.changed_at < now() - interval '30 days';
  delete from public.rate_limits r where r.window_start < now() - interval '1 day';
  delete from public.user_reports r where r.created_at < now() - interval '1 year';
$$;

-- ---------------------------------------------------------------------
-- 10. Who may call what
-- ---------------------------------------------------------------------
revoke execute on function
  public.request_ip(),
  public.hit_rate_limit(text, integer, interval),
  public.enforce_rate_limit(text, integer, interval),
  public.mfa_ok(),
  public.require_mfa(),
  public.username_taken(text, uuid),
  public.can_see(uuid, text),
  public.check_my_password(text),
  public.record_signup(uuid, text, boolean, text),
  public.handle_new_user(),
  public.finish_signup(text, text, boolean, text),
  public.is_username_available(text),
  public.email_for_username(text, text),
  public.change_username(text, text),
  public.resolve_username(text),
  public.update_profile_details(text, text),
  public.set_avatar(text),
  public.set_privacy(text, text),
  public.my_account(),
  public.get_public_profile(text),
  public.get_match_history(text, integer, integer),
  public.report_user(text, text, text),
  public.record_match_result(integer, boolean, uuid, integer, text, text[], text, integer, integer, integer, integer),
  public.regenerate_recovery_codes(),
  public.clear_recovery_codes(),
  public.use_recovery_code(text),
  public.note_phone_attempt(),
  public.note_card_check(),
  public.sync_phone_verified(),
  public.remove_card_verification(),
  public.recent_sign_ins(),
  public.export_my_data(),
  public.delete_my_account(),
  public.bronze_cleanup()
from public, anon, authenticated;

-- Without logging in: the username check, username log-in, public profiles.
grant execute on function
  public.is_username_available(text),
  public.email_for_username(text, text),
  public.resolve_username(text),
  public.get_public_profile(text),
  public.get_match_history(text, integer, integer)
to anon, authenticated;

-- Signed in only.
grant execute on function
  public.finish_signup(text, text, boolean, text),
  public.check_my_password(text),
  public.change_username(text, text),
  public.update_profile_details(text, text),
  public.set_avatar(text),
  public.set_privacy(text, text),
  public.my_account(),
  public.report_user(text, text, text),
  public.record_match_result(integer, boolean, uuid, integer, text, text[], text, integer, integer, integer, integer),
  public.regenerate_recovery_codes(),
  public.clear_recovery_codes(),
  public.use_recovery_code(text),
  public.note_phone_attempt(),
  public.note_card_check(),
  public.remove_card_verification(),
  public.recent_sign_ins(),
  public.export_my_data(),
  public.delete_my_account()
to authenticated;


-- ---------------------------------------------------------------------
-- 11. Avatar images: Storage bucket `avatars`
-- ---------------------------------------------------------------------
-- Public (anyone can view an avatar by its URL), 2 MB, jpg/png/webp only.
-- A player can add, replace, list and delete files only in their own folder:
-- avatars/<their user id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatars: players see their own folder" on storage.objects;
create policy "Avatars: players see their own folder"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Avatars: players upload to their own folder" on storage.objects;
create policy "Avatars: players upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text) and (select public.mfa_ok()));

drop policy if exists "Avatars: players replace their own files" on storage.objects;
create policy "Avatars: players replace their own files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text) and (select public.mfa_ok()));

drop policy if exists "Avatars: players delete their own files" on storage.objects;
create policy "Avatars: players delete their own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

-- mfa_ok() is used by the storage policies above.
grant execute on function public.mfa_ok() to authenticated;
