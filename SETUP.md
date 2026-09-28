# Setting up accounts

Bronze plays fine without accounts: until the two settings below are filled
in, Register and Log in say "Accounts aren't configured yet" and everyone
plays as a guest. This page connects Bronze to [Supabase](https://supabase.com)
for email + password accounts, Google sign-in, password-reset emails and
player profiles. It takes about 20 minutes.

You need: a Supabase account (free tier is enough) and, for Google sign-in, a
Google Cloud account.

Throughout, replace:

- `<ref>` with your Supabase project's reference (the `abcd1234` in
  `https://abcd1234.supabase.co`);
- `https://your-site.example/` with the address Bronze is published at
  (for GitHub Pages, something like `https://you.github.io/Bronze/`).

## 1. Create the Supabase project

1. At [supabase.com/dashboard](https://supabase.com/dashboard), choose
   **New project**. Pick a name, a region near your players, and a database
   password (store it somewhere safe; Bronze doesn't need it).
2. When the project is ready, open **Project Settings → API** (or the
   **Connect** button) and copy two values: the **Project URL** and the
   **anon public** key.

## 2. Fill in `.env`

Copy `.env.example` to `.env` in the project folder and paste the two values:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (the anon public key)
```

Restart `npm run dev`. `.env` is git-ignored, so it's never committed.

- The **anon** key is meant to be public: it ends up in the built site, and
  the row-level security rules below are what protect the data.
- **Never** use the `service_role` key here. It bypasses every rule.
- For the published site, set the same two variables wherever the site is
  built (e.g. GitHub Actions secrets, or Netlify/Vercel environment
  variables). Vite writes them into the build, so rebuild after changing them.

## 3. Create the database tables and rules

Open **SQL Editor → New query**, paste everything below, and choose **Run**.

```sql
-- ============================================================
-- Bronze accounts: profiles, private settings, consent records,
-- log-in by username, data export, account deletion, clean-up
-- ============================================================

-- 1. Profiles: one per account. Public (username, photo, record);
--    email addresses stay in auth.users and are never exposed.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_url text,
  created_at timestamptz not null default now(),
  wins integer not null default 0 check (wins >= 0),
  matches integer not null default 0 check (matches >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  goods_shipped integer not null default 0 check (goods_shipped >= 0),
  maps_played text[] not null default '{}',
  achievements jsonb not null default '{}'::jsonb
);

-- Usernames are unique whatever the case: "Ada" and "ada" can't both exist.
create unique index profiles_username_key on public.profiles (lower(username));

-- Row-level security: anyone can read profiles; players can only change their own.
-- Profiles are only created by the two sign-up paths below, which also record
-- the age answer and the consents.
alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select
  using (true);

create policy "Players update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, avatar_url, wins, matches, best_score, goods_shipped, maps_played, achievements)
  on public.profiles to authenticated;

-- 2. Private settings: the age answer (14-17 or 18+, never a birth date) and
--    email choices (all off until turned on). Only the functions below use it.
create table public.account_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_adult boolean not null default false,
  email_marketing boolean not null default false,
  email_friends boolean not null default false,
  email_tournaments boolean not null default false,
  -- Secret per player, for one-click unsubscribe links in emails.
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  updated_at timestamptz not null default now(),
  -- No marketing emails to anyone under 18.
  check (is_adult or not email_marketing)
);
alter table public.account_settings enable row level security;
revoke all on public.account_settings from anon, authenticated;

-- 3. Consent records: what was agreed to, which version, and when.
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('terms', 'privacy', 'age', 'marketing')),
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id);
alter table public.consents enable row level security;
revoke all on public.consents from anon, authenticated;

-- A new account's age answer and consents (used by both sign-up paths).
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
  insert into public.account_settings (user_id, is_adult, email_marketing)
  values (p_user, adult, marketing)
  on conflict (user_id) do update set is_adult = excluded.is_adult, email_marketing = excluded.email_marketing, updated_at = now();
  insert into public.consents (user_id, kind, granted, version) values
    (p_user, 'terms', true, p_terms_version),
    (p_user, 'privacy', true, p_terms_version),
    (p_user, 'age', true, p_age_band),
    (p_user, 'marketing', marketing, p_terms_version);
end;
$$;
revoke execute on function public.record_signup(uuid, text, boolean, text) from public, anon, authenticated;

-- 4. Email sign-ups: the profile and consents are made at once, from what the
--    Register form sent (username, age answer, Terms version, marketing choice).
--    Google sign-ups have none of these yet: finish_signup() below asks for them
--    before the account is used.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted text := meta ->> 'username';
  age text := meta ->> 'age_band';
  terms text := meta ->> 'terms_version';
begin
  if wanted ~ '^[A-Za-z0-9_]{3,20}$' and age in ('14-17', '18+') and coalesce(terms, '') <> '' then
    insert into public.profiles (id, username)
    values (new.id, wanted)
    -- Taken a moment ago: no profile yet, so they finish at their first log-in.
    on conflict do nothing;
    if found then
      perform public.record_signup(new.id, age, coalesce(meta ->> 'marketing', 'false') = 'true', terms);
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Finishing a first Google sign-in: username, age answer and consents together.
create function public.finish_signup(p_username text, p_age_band text, p_marketing boolean, p_terms_version text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  photo text;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_age_band is null or p_age_band not in ('14-17', '18+') then
    raise exception 'Accounts are only for people aged 14 or over' using errcode = '22023';
  end if;
  if coalesce(p_terms_version, '') = '' then
    raise exception 'The Terms and Privacy Policy must be accepted' using errcode = '22023';
  end if;
  select coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') into photo
  from auth.users u where u.id = uid;
  return query
    insert into public.profiles (id, username, avatar_url) values (uid, trim(p_username), photo) returning *;
  perform public.record_signup(uid, p_age_band, p_marketing, p_terms_version);
end;
$$;
revoke execute on function public.finish_signup(text, text, boolean, text) from public, anon;
grant execute on function public.finish_signup(text, text, boolean, text) to authenticated;

-- 6. Live "is this username free?" check for the Register form.
create function public.username_available(name text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(name)));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- 7. Log in with a username. Returns the account's email only when the
--    password is right (so nobody can look up emails), and pauses a username
--    for 30 seconds after 5 wrong passwords. Counters are kept for a day at most.
create table public.login_attempts (
  username text primary key,
  failures integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz not null default now()
);

-- No policies: only login_email() below reads or writes this table.
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;

create function public.login_email(identifier text, password text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  wanted text := lower(trim(identifier));
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
        locked_until = case when a.locked_until is null and a.failures + 1 >= 5
                            then now() + interval '30 seconds' end,
        last_failed_at = now();
  return null;
end;
$$;

revoke execute on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;

-- 8. Email choices (Settings -> Notifications).
create function public.email_preferences()
returns table (is_adult boolean, email_marketing boolean, email_friends boolean, email_tournaments boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.is_adult, s.email_marketing, s.email_friends, s.email_tournaments
  from public.account_settings s where s.user_id = auth.uid();
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
  select s.email_marketing, s.is_adult into was, adult from public.account_settings s where s.user_id = uid;
  if p_marketing and not adult then
    raise exception 'Marketing emails are only for people aged 18 or over' using errcode = '22023';
  end if;
  update public.account_settings s
    set email_marketing = p_marketing, email_friends = p_friends, email_tournaments = p_tournaments, updated_at = now()
    where s.user_id = uid;
  if p_marketing is distinct from was then
    insert into public.consents (user_id, kind, granted, version) values (uid, 'marketing', p_marketing, p_version);
  end if;
  return query select s.is_adult, s.email_marketing, s.email_friends, s.email_tournaments
    from public.account_settings s where s.user_id = uid;
end;
$$;

-- "I'm 18 or over now" (marketing emails can then be turned on).
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
  return query select s.is_adult, s.email_marketing, s.email_friends, s.email_tournaments
    from public.account_settings s where s.user_id = uid;
end;
$$;

revoke execute on function public.email_preferences() from public, anon;
revoke execute on function public.set_email_preferences(boolean, boolean, boolean, text) from public, anon;
revoke execute on function public.confirm_adult() from public, anon;
grant execute on function public.email_preferences() to authenticated;
grant execute on function public.set_email_preferences(boolean, boolean, boolean, text) to authenticated;
grant execute on function public.confirm_adult() to authenticated;

-- 9. One-click unsubscribe, from the link in an email: no log-in needed, only
--    the player's secret token. p_list: marketing, friends, tournaments or all.
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
  select s.user_id, s.email_marketing into uid, was from public.account_settings s where s.unsubscribe_token = p_token;
  if uid is null then
    return false;
  end if;
  update public.account_settings s set
    email_marketing = case when p_list in ('marketing', 'all') then false else s.email_marketing end,
    email_friends = case when p_list in ('friends', 'all') then false else s.email_friends end,
    email_tournaments = case when p_list in ('tournaments', 'all') then false else s.email_tournaments end,
    updated_at = now()
  where s.user_id = uid;
  if was and p_list in ('marketing', 'all') then
    insert into public.consents (user_id, kind, granted, version) values (uid, 'marketing', false, 'unsubscribe-link');
  end if;
  return true;
end;
$$;
revoke execute on function public.unsubscribe(uuid, text) from public;
grant execute on function public.unsubscribe(uuid, text) to anon, authenticated;

-- 10. "Download my data": everything stored about the signed-in player.
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
    'email_preferences', (
      select jsonb_build_object('age_18_or_over', s.is_adult, 'marketing', s.email_marketing,
                                'friends', s.email_friends, 'tournaments', s.email_tournaments)
      from public.account_settings s where s.user_id = auth.uid()),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object('kind', c.kind, 'granted', c.granted, 'version', c.version, 'at', c.created_at) order by c.created_at, c.id)
      from public.consents c where c.user_id = auth.uid()), '[]'::jsonb),
    'failed_log_ins', (
      select jsonb_build_object('failures', a.failures, 'last_failed_at', a.last_failed_at, 'locked_until', a.locked_until)
      from public.login_attempts a join public.profiles p on lower(p.username) = a.username
      where p.id = auth.uid()),
    'matches', 'Matches are played in your browser; none are stored on the server.'
  );
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- 11. "Delete my account": the log-in, profile, settings and consents go at once
--     (on delete cascade), and the failed log-in counter with them.
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
  -- Bronze keeps no match history on the server. If it ever does, anonymise this
  -- player in other players' matches here (for example, set their player id to null).
  delete from auth.users u where u.id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 12. Clean-up, every hour: sign-ups never finished (no profile) or never
--     confirmed after 7 days, and failed log-in counters older than a day.
create function public.bronze_cleanup()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users u
  where u.created_at < now() - interval '7 days'
    and (u.email_confirmed_at is null or not exists (select 1 from public.profiles p where p.id = u.id));
  delete from public.login_attempts a where a.last_failed_at < now() - interval '1 day';
$$;
revoke execute on function public.bronze_cleanup() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('bronze-cleanup', '17 * * * *', 'select public.bronze_cleanup()');
```

You should see "Success". **Table Editor** now lists `profiles`,
`account_settings`, `consents` and `login_attempts`. The last statement turns on
Supabase's `pg_cron` extension and schedules the hourly clean-up; if your
project doesn't allow it, enable **pg_cron** under **Database → Extensions** and
run the last two lines again. (The Privacy Policy says unfinished sign-ups are
deleted after 7 days and failed log-in counters after a day: this job is what
does it.)

Already ran an earlier version of this SQL? Run it on a fresh project, or ask
for a migration: the tables and functions above replace the old ones.

## 4. Email sign-in, confirmation and reset links

In **Authentication**:

1. **Sign In / Providers → Email**: leave it enabled.
   - **Confirm email** on (recommended): new players see "Check your email to
     confirm your account", and are logged in when they follow the link.
   - Off: they're logged in straight after registering.
2. **URL Configuration**:
   - **Site URL**: `https://your-site.example/` (while you only develop
     locally, `http://localhost:5173/`).
   - **Redirect URLs**: add every address Bronze is served from, with `**` at
     the end:
     - `http://localhost:5173/**`
     - `https://your-site.example/**`

   Confirmation links, reset links and Google all return to these addresses
   (at `#/auth/callback` or `#/auth/reset`); Supabase refuses any other.
3. **Emails → SMTP Settings**: Supabase's built-in mailer sends only a few
   emails an hour and is meant for testing. Before real players sign up,
   connect your own email provider here (Resend, Postmark, SendGrid, Amazon
   SES, ...).

The default email templates work as they are. Their links finish signing in
only in the browser where the player registered or asked for the reset. For
links that also work on another device (say, reset on a laptop, open the
email on a phone), change two templates under **Emails → Templates**:

- **Reset Password**: make the link
  `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=recovery#/auth/reset`
- **Confirm signup**: make the link
  `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=email#/auth/callback`

(These use the Site URL, so while testing locally set it to
`http://localhost:5173/`.)

## 5. Google sign-in

**In Google Cloud** ([console.cloud.google.com](https://console.cloud.google.com)):

1. Create a project (or pick one), then open **APIs & Services → OAuth
   consent screen** (also called **Google Auth Platform → Branding**). App
   name "Bronze", your support email; **Audience: External**. Under
   **Authorized domains**, add `<ref>.supabase.co` and your site's domain.
   Scopes: `openid`, `email` and `profile` (the defaults).
2. **Credentials → Create credentials → OAuth client ID**, type **Web
   application**:
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://your-site.example` (origin only: no path)
   - **Authorized redirect URIs**: exactly one, Supabase's callback:
     - `https://<ref>.supabase.co/auth/v1/callback`

     Google sends players back to Supabase, and Supabase sends them on to
     Bronze (to the Redirect URLs of step 4). Your own localhost and
     production addresses go in Supabase's list, not here.
3. Copy the **Client ID** and **Client secret**.
4. While the consent screen is in **Testing**, only the test users you list
   can sign in. **Publish** it for everyone.

**In Supabase**: **Authentication → Sign In / Providers → Google**: enable it,
paste the Client ID and Client secret, and save. The page also shows the
callback URL to use in Google (the one above).

## 6. Try it

1. `npm run dev`, open <http://localhost:5173>, and choose **Register** in
   the sidebar.
2. Register with email: the username check shows ✓ or "Taken"; after
   **Create account** you get the confirmation email (or are logged in, if
   confirmation is off).
3. Log out, then log in again with the **username** instead of the email.
4. **Continue with Google**: the first time, Bronze asks you to choose a
   username.
5. **Forgot password?** sends a reset link that opens the "Set a new
   password" page.
6. In **Table Editor → profiles** you'll see each player's row, and their
   wins and matches update after each finished match.

## 7. Emails

Bronze only sends account emails today (confirm your address, reset your
password), through Supabase. Keep those templates free of news or promotions:
account emails must not contain marketing.

Optional emails (news, friend and tournament emails) are ready for when you add
them, but none are sent yet:

- Players choose them in **Settings → Notifications** (all off by default;
  news only for players who said they're 18 or over). The choices are in the
  `account_settings` table: send each kind only to players with it turned on.
- Every optional email needs an unsubscribe link and headers. Each player has a
  secret `unsubscribe_token`; with `list` one of `marketing`, `friends`,
  `tournaments` or `all`:
  - in the email: `https://your-site.example/#/unsubscribe?token=<token>&list=<list>`
    (the page unsubscribes as soon as it opens, without logging in);
  - headers, for the one-click button in email apps (RFC 8058):
    ```
    List-Unsubscribe: <https://<ref>.supabase.co/functions/v1/unsubscribe?token=<token>&list=<list>>, <https://your-site.example/#/unsubscribe?token=<token>&list=<list>>
    List-Unsubscribe-Post: List-Unsubscribe=One-Click
    ```
    The first address is the Edge Function in `supabase/functions/unsubscribe`.
    Deploy it with the Supabase CLI: `supabase functions deploy unsubscribe --no-verify-jwt`.
- Unsubscribing is recorded in `consents`, like every change to the news choice.

## 8. Fill in the legal details

The legal pages (Privacy Policy, Terms, Refund Policy, Cookie Policy, Business
details) are templates. Put your details in `src/legal/operator.ts` (every
`{{PLACEHOLDER}}` there, listed in `CHECKLIST.md`), and have the texts reviewed
before opening accounts to the public. The pages show a "Draft" note while any
placeholder is left.

## Good to know

- **Guest progress moves in.** A guest's record and achievements on a device
  are added to the account the first time they log in there.
- **Players manage their own data.** Settings → Account has **Download my
  data** (`export_my_data()`) and **Delete my account** (`delete_my_account()`,
  which deletes the log-in and, through `on delete cascade`, the profile,
  settings and consents). People who can't log in use `#/data-request`.
- **Ages.** Registering asks "Under 14 / 14 to 17 / 18 or over" (no birth date).
  Under 14 can't make an account; 14–17 can, but never get news emails.
- **Remember me** off: the session ends when the browser is closed.
- **Records are written by the player's own browser**, because matches run in
  the browser. That's fine for casual play; a determined player could edit
  their own numbers. Ranked play would need match results checked on a server.
- **Accounts need the site served over `http(s)`.** Google and email links
  can't return to a page opened from disk (`dist-single/index.html` opened
  as a file plays as a guest).
- **Friends, online play, tournaments and the shop** still need a game server
  Bronze doesn't have. Signed-in players see them as "Coming soon"; guests see
  "Log in to use this".
- Deleting a user under **Authentication → Users** also deletes their profile.
