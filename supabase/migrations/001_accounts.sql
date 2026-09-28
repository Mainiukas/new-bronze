-- =====================================================================
-- Bronze accounts: 001_accounts.sql
--
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- Run it once, on a new project (it creates tables; running it twice fails).
--
-- What it makes:
--   profiles        one per account: public username, avatar and record;
--                   private consent fields. Stats change only through
--                   record_match_result() and merge_guest_stats().
--   account_settings private: age answer (14-17 / 18+) and email choices
--   consents        what each player agreed to, which version, and when
--   match_results   ids of saved results, so a retried save never counts twice
--   login_attempts  failed log-ins by username (30-second pause after 5)
-- and the functions the app calls, a sign-up trigger and an hourly clean-up.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar text,
  wins integer not null default 0 check (wins >= 0),
  matches integer not null default 0 check (matches >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  goods_shipped integer not null default 0 check (goods_shipped >= 0),
  maps_played text[] not null default '{}',
  -- Achievement id -> ISO date it was unlocked.
  achievements jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- True until the player has chosen a username and accepted the Terms
  -- (Google sign-ups start with a temporary name like player_1a2b3c4d5e6f).
  needs_username boolean not null default false,
  -- Private (not readable by other players):
  marketing_consent boolean not null default false,
  terms_version text,
  -- Not collected: Bronze asks only "14-17 or 18+" (account_settings.is_adult),
  -- as its Privacy Policy says. Left empty; drop it if you don't need it.
  birth_year integer check (birth_year between 1900 and 2100),
  check (wins <= matches)
);

-- Usernames are unique whatever the case: "Ada" and "ada" can't both exist.
create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

-- Signed-in players can read the public fields of every profile. The private
-- fields (marketing_consent, terms_version, birth_year) have no grant at all.
create policy "Signed-in players read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- A player can change only their own row, and only these columns: username
-- and avatar. wins, matches and best_score have no update grant, so only the
-- functions below (security definer) can change them.
create policy "Players update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select (id, username, avatar, wins, matches, best_score, goods_shipped, maps_played, achievements, created_at, needs_username)
  on public.profiles to authenticated;
grant update (username, avatar) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. Private tables (no policies: only the functions below use them)
-- ---------------------------------------------------------------------
create table public.account_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_adult boolean not null default false,
  email_friends boolean not null default false,
  email_tournaments boolean not null default false,
  -- Secret per player, for one-click unsubscribe links in emails.
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now()
);

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy', 'age', 'marketing')),
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id);

create table public.match_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  primary key (user_id, id)
);

create table public.login_attempts (
  username text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz not null default now()
);

alter table public.account_settings enable row level security;
alter table public.consents enable row level security;
alter table public.match_results enable row level security;
alter table public.login_attempts enable row level security;
revoke all on public.account_settings, public.consents, public.match_results, public.login_attempts from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Sign-up
-- ---------------------------------------------------------------------

-- A new account's age answer, Terms version and consents.
create function public.record_signup(p_user uuid, p_age_band text, p_marketing boolean, p_terms_version text)
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
  insert into public.consents (user_id, kind, granted, version) values
    (p_user, 'terms', true, p_terms_version),
    (p_user, 'privacy', true, p_terms_version),
    (p_user, 'age', true, p_age_band),
    (p_user, 'marketing', marketing, p_terms_version);
end;
$$;

-- Every new auth user gets a profile at once.
--   Email sign-up: the username, age answer, Terms version and marketing
--   choice come from the sign-up metadata (the Register form).
--   Google sign-up (or a username taken a moment ago): a temporary unique
--   name and needs_username = true; the app then shows "Choose a username".
create function public.handle_new_user()
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
  if wanted ~ '^[A-Za-z0-9_]{3,20}$' and age in ('14-17', '18+') and coalesce(terms, '') <> '' then
    insert into public.profiles (id, username, avatar) values (new.id, wanted, photo) on conflict do nothing;
    if found then
      perform public.record_signup(new.id, age, coalesce(meta ->> 'marketing', 'false') = 'true', terms);
      return new;
    end if;
  end if;
  -- A temporary name (player_ and 12 hex digits); another one in the unlikely case it's taken.
  loop
    insert into public.profiles (id, username, avatar, needs_username) values (new.id, temporary, photo, true) on conflict do nothing;
    exit when found or exists (select 1 from public.profiles p where p.id = new.id);
    temporary := 'player_' || substr(md5(random()::text), 1, 12);
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- "Choose a username": the chosen name, age answer and consents together.
create function public.finish_signup(p_username text, p_age_band text, p_marketing boolean, p_terms_version text)
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
  if not exists (select 1 from public.profiles p where p.id = uid) then
    -- An account made before this migration: give it a profile now.
    insert into public.profiles (id, username) values (uid, name);
    perform public.record_signup(uid, p_age_band, p_marketing, p_terms_version);
  else
    -- A taken name fails here with unique_violation (23505).
    update public.profiles p set username = name, needs_username = false where p.id = uid and p.needs_username;
    if found then
      perform public.record_signup(uid, p_age_band, p_marketing, p_terms_version);
    end if;
  end if;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

-- Live "is this username free?" check on the Register form (no log-in needed).
create function public.is_username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.profiles p where lower(p.username) = lower(trim(name)));
$$;

-- ---------------------------------------------------------------------
-- 4. Log in with a username
-- ---------------------------------------------------------------------
-- Returns the account's email only when the password is right for that
-- username, so nobody can look up other players' emails. After 5 wrong
-- passwords the username pauses for 30 seconds. Counters last a day at most.
create function public.email_for_username(name text, password text)
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

-- ---------------------------------------------------------------------
-- 5. Match results (the only way wins, matches and best_score change)
-- ---------------------------------------------------------------------
-- One finished match for the signed-in player. p_match_id makes it safe to
-- retry: the same id is only ever counted once. p_achievements: ids unlocked
-- by this match (stamped with the server's time if new).
create function public.record_match_result(
  score integer,
  won boolean,
  p_match_id uuid default null,
  p_goods_shipped integer default 0,
  p_map_id text default null,
  p_achievements text[] default '{}'
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  stamp text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  unlocked text[] := coalesce(p_achievements, '{}');
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if score is null or score < 0 or score > 1000 then
    raise exception 'Score out of range' using errcode = '22023';
  end if;
  if coalesce(p_goods_shipped, 0) < 0 or coalesce(p_goods_shipped, 0) > 500 then
    raise exception 'Goods shipped out of range' using errcode = '22023';
  end if;
  if p_map_id is not null and p_map_id !~ '^[a-z0-9-]{1,40}$' then
    raise exception 'Unknown map' using errcode = '22023';
  end if;
  if cardinality(unlocked) > 50 or exists (select 1 from unnest(unlocked) a where a !~ '^[a-z0-9-]{1,40}$') then
    raise exception 'Unknown achievement' using errcode = '22023';
  end if;

  if p_match_id is not null then
    insert into public.match_results (user_id, id) values (uid, p_match_id) on conflict do nothing;
    if not found then
      -- Already counted (a retry): nothing changes.
      return query select * from public.profiles p where p.id = uid;
      return;
    end if;
  end if;

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

-- A guest's record on one device, moved into the account at first log-in
-- there. Counts add up, the best score is the higher, maps and achievements
-- combine (earliest date kept). p_merge_id: the same merge is only applied once.
create function public.merge_guest_stats(
  p_merge_id uuid,
  p_matches integer,
  p_wins integer,
  p_best_score integer,
  p_goods_shipped integer,
  p_maps_played text[],
  p_achievements jsonb
)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  maps text[] := coalesce(p_maps_played, '{}');
  unlocked jsonb := coalesce(p_achievements, '{}'::jsonb);
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_merge_id is null then
    raise exception 'A merge id is needed' using errcode = '22023';
  end if;
  if p_matches is null or p_wins is null or p_best_score is null or p_goods_shipped is null
     or p_matches < 0 or p_matches > 100000 or p_wins < 0 or p_wins > p_matches
     or p_best_score < 0 or p_best_score > 1000 or p_goods_shipped < 0 or p_goods_shipped > 50000000 then
    raise exception 'Guest record out of range' using errcode = '22023';
  end if;
  if cardinality(maps) > 100 or exists (select 1 from unnest(maps) m where m !~ '^[a-z0-9-]{1,40}$') then
    raise exception 'Unknown map' using errcode = '22023';
  end if;
  if jsonb_typeof(unlocked) <> 'object'
     or exists (select 1 from jsonb_each(unlocked) e where e.key !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(e.value) <> 'string'
                or (e.value #>> '{}') !~ '^\d{4}-\d{2}-\d{2}T') then
    raise exception 'Unknown achievement' using errcode = '22023';
  end if;

  insert into public.match_results (user_id, id) values (uid, p_merge_id) on conflict do nothing;
  if found then
    update public.profiles p set
      matches = p.matches + p_matches,
      wins = p.wins + p_wins,
      best_score = greatest(p.best_score, p_best_score),
      goods_shipped = p.goods_shipped + p_goods_shipped,
      maps_played = array(select distinct m from unnest(p.maps_played || maps) m order by m),
      achievements = (
        select coalesce(jsonb_object_agg(k, to_jsonb(d)), '{}'::jsonb)
        from (
          select k, min(d) as d
          from (
            select e.key as k, e.value #>> '{}' as d from jsonb_each(p.achievements) e
            union all
            select e.key, e.value #>> '{}' from jsonb_each(unlocked) e
          ) both_sides
          group by k
        ) merged
      )
    where p.id = uid;
  end if;
  return query select * from public.profiles p where p.id = uid;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Email choices (Settings -> Notifications) and one-click unsubscribe
-- ---------------------------------------------------------------------
create function public.email_preferences()
returns table (is_adult boolean, email_marketing boolean, email_friends boolean, email_tournaments boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(s.is_adult, false), p.marketing_consent, coalesce(s.email_friends, false), coalesce(s.email_tournaments, false)
  from public.profiles p
  left join public.account_settings s on s.user_id = p.id
  where p.id = auth.uid();
$$;

create function public.set_email_preferences(p_marketing boolean, p_friends boolean, p_tournaments boolean, p_version text default 'settings')
returns table (is_adult boolean, email_marketing boolean, email_friends boolean, email_tournaments boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  was boolean;
  adult boolean;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into public.account_settings (user_id) values (uid) on conflict (user_id) do nothing;
  select p.marketing_consent into was from public.profiles p where p.id = uid;
  select s.is_adult into adult from public.account_settings s where s.user_id = uid;
  if p_marketing and not adult then
    raise exception 'Marketing emails are only for people aged 18 or over' using errcode = '22023';
  end if;
  update public.account_settings s
    set email_friends = p_friends, email_tournaments = p_tournaments, updated_at = now()
    where s.user_id = uid;
  update public.profiles p set marketing_consent = p_marketing where p.id = uid;
  if p_marketing is distinct from was then
    insert into public.consents (user_id, kind, granted, version) values (uid, 'marketing', p_marketing, coalesce(p_version, 'settings'));
  end if;
  return query select * from public.email_preferences();
end;
$$;

-- "I'm 18 or over now": marketing emails can then be turned on.
create function public.confirm_adult()
returns table (is_adult boolean, email_marketing boolean, email_friends boolean, email_tournaments boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into public.account_settings (user_id, is_adult) values (uid, true)
    on conflict (user_id) do update set is_adult = true, updated_at = now();
  insert into public.consents (user_id, kind, granted, version) values (uid, 'age', true, '18+');
  return query select * from public.email_preferences();
end;
$$;

-- From the link in an email: no log-in, only the player's secret token.
-- p_list: marketing, friends, tournaments or all.
create function public.unsubscribe(p_token uuid, p_list text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
  was boolean;
begin
  select s.user_id into uid from public.account_settings s where s.unsubscribe_token = p_token;
  if uid is null then
    return false;
  end if;
  select p.marketing_consent into was from public.profiles p where p.id = uid;
  update public.account_settings s set
    email_friends = case when p_list in ('friends', 'all') then false else s.email_friends end,
    email_tournaments = case when p_list in ('tournaments', 'all') then false else s.email_tournaments end,
    updated_at = now()
  where s.user_id = uid;
  if p_list in ('marketing', 'all') then
    update public.profiles p set marketing_consent = false where p.id = uid;
    if was then
      insert into public.consents (user_id, kind, granted, version) values (uid, 'marketing', false, 'unsubscribe-link');
    end if;
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Download my data, delete my account
-- ---------------------------------------------------------------------
create function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'account', (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'email_confirmed_at', u.email_confirmed_at,
        'last_sign_in_at', u.last_sign_in_at,
        'sign_in_methods', coalesce((select jsonb_agg(distinct i.provider) from auth.identities i where i.user_id = u.id), '[]'::jsonb),
        'details_from_sign_in', u.raw_user_meta_data)
      from auth.users u where u.id = auth.uid()),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'settings', (
      select jsonb_build_object('age_18_or_over', s.is_adult, 'friend_emails', s.email_friends, 'tournament_emails', s.email_tournaments)
      from public.account_settings s where s.user_id = auth.uid()),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted, 'version', c.version, 'at', c.created_at) order by c.created_at, c.id)
      from public.consents c where c.user_id = auth.uid()), '[]'::jsonb),
    'saved_result_ids', (select count(*) from public.match_results r where r.user_id = auth.uid()),
    'failed_log_ins', (
      select jsonb_build_object('failures', a.failures, 'last_failed_at', a.last_failed_at, 'locked_until', a.locked_until)
      from public.login_attempts a join public.profiles p on lower(p.username) = a.username
      where p.id = auth.uid()),
    'matches', 'Matches are played in your browser; only your totals are stored on the server.'
  );
$$;

-- Deletes the caller's profile and log-in; settings, consents and saved
-- result ids go with them (on delete cascade), and the failed log-in counter.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select p.username into name from public.profiles p where p.id = uid;
  if name is not null then
    delete from public.login_attempts a where a.username = lower(name);
  end if;
  delete from public.profiles p where p.id = uid;
  delete from auth.users u where u.id = uid;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Who may call what
-- ---------------------------------------------------------------------
-- Supabase lets anon and authenticated run new functions by default: take
-- that away from all of them, then grant only what the app calls.
revoke execute on function
  public.record_signup(uuid, text, boolean, text),
  public.handle_new_user(),
  public.finish_signup(text, text, boolean, text),
  public.is_username_available(text),
  public.email_for_username(text, text),
  public.record_match_result(integer, boolean, uuid, integer, text, text[]),
  public.merge_guest_stats(uuid, integer, integer, integer, integer, text[], jsonb),
  public.email_preferences(),
  public.set_email_preferences(boolean, boolean, boolean, text),
  public.confirm_adult(),
  public.unsubscribe(uuid, text),
  public.export_my_data(),
  public.delete_my_account()
from public, anon, authenticated;

-- Without logging in: the live username check, username log-in, unsubscribe links.
grant execute on function public.is_username_available(text) to anon, authenticated;
grant execute on function public.email_for_username(text, text) to anon, authenticated;
grant execute on function public.unsubscribe(uuid, text) to anon, authenticated;

-- Signed in only.
grant execute on function
  public.finish_signup(text, text, boolean, text),
  public.record_match_result(integer, boolean, uuid, integer, text, text[]),
  public.merge_guest_stats(uuid, integer, integer, integer, integer, text[], jsonb),
  public.email_preferences(),
  public.set_email_preferences(boolean, boolean, boolean, text),
  public.confirm_adult(),
  public.export_my_data(),
  public.delete_my_account()
to authenticated;

-- ---------------------------------------------------------------------
-- 9. Clean-up, every hour: sign-ups never confirmed, or never given a
-- username, after 7 days; failed log-in counters older than a day.
-- ---------------------------------------------------------------------
create function public.bronze_cleanup()
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
$$;
revoke execute on function public.bronze_cleanup() from public, anon, authenticated;

-- If this fails with "extension pg_cron is not available", turn on pg_cron
-- under Database -> Extensions, then run these two lines again.
create extension if not exists pg_cron;
select cron.schedule('bronze-cleanup', '17 * * * *', 'select public.bronze_cleanup()');
