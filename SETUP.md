# Setting up accounts

Bronze plays fine without accounts: until you finish step 1 below, Register
and Log in say **"Accounts aren't configured yet"** and everyone plays as a
guest. This guide connects Bronze to [Supabase](https://supabase.com) (free)
for email + password accounts, Google sign-in, password-reset emails, public
player profiles with a real win/match record, account settings, two-factor
authentication. (Phone and card verification are built but switched off for
now: see [VERIFICATION.md](VERIFICATION.md).)

It takes about 20 minutes, 10 more for Google, 10 for the profile and security
update (step 10). You need:

- a Supabase account (sign up free at supabase.com, with GitHub or email);
- for Google sign-in only: a Google account, to use Google Cloud Console.

In the steps, replace:

- `https://your-site.example/` with the address your published Bronze has
  (for GitHub Pages, something like `https://you.github.io/new-bronze/`);
- `<ref>` with your Supabase project's id: the `abcd1234` in
  `https://abcd1234.supabase.co`.

Dashboards move buttons around now and then. If a button isn't where this
says, look for the same words in the left-hand menu.

## Checklist

Tick these off in order. Steps marked *optional* can wait: Bronze hides or
explains the features they unlock until they're done.

- [ ] **1.** Supabase project, `.env` filled in.
- [ ] **2.** Run `supabase/migrations/001_accounts.sql` (once).
- [ ] **3.** Site URL and Redirect URLs.
- [ ] **4.** Email sign-in and confirmation (turn **Confirm email** on: the
      email-verification lock in step 10 depends on it).
- [ ] **5.** *Optional:* Google sign-in.
- [ ] **6.** Variables on the published site (Vercel):
      `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] **9.** Legal details.
- [ ] **10.** Run `supabase/migrations/002_profiles_security.sql` (safe to
      run again).
- [ ] **11.** Security settings: **TOTP two-factor on**, secure email and
      password change, manual linking (for **Link Google**), security
      notification emails.
- [ ] **12.** Try the new features.
- [ ] **13.** Run `supabase/migrations/003_onboarding_ratings.sql` (safe to
      run again): the first-time welcome slides and ratings.

---

## 1. Create the Supabase project and fill in `.env`

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and log in.
2. Click **New project**.
   - **Organization**: the one Supabase made for you.
   - **Project name**: `bronze` (anything is fine).
   - **Database password**: click **Generate a password** and save it in your
     password manager. Bronze doesn't need it, but you might later.
   - **Region**: the one nearest your players (for Lithuania: *Central EU
     (Frankfurt)* or *North EU (Stockholm)*).
   - Click **Create new project** and wait a minute or two until it says the
     project is ready.
3. Click the **Connect** button at the top of the project page (or open
   **Project Settings → API Keys** in the left menu, the gear icon). Copy two
   values:
   - the **Project URL**, like `https://abcd1234.supabase.co`;
   - the **anon public** key (a long text starting `eyJ...`, under
     **Legacy API keys**) or the **publishable** key (starting
     `sb_publishable_...`). Either works.

   **Never** copy the `service_role` or **secret** key: it bypasses every
   rule and would end up inside the published site.
4. In the Bronze folder, copy `.env.example` to a new file named `.env` and
   paste the two values after the `=` signs:

   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   `.env` is git-ignored, so it's never committed. The anon/publishable key
   is meant to be public; the database rules from step 2 protect the data.
5. Restart `npm run dev` (stop it with Ctrl+C, run it again). Vite only reads
   `.env` when it starts.

## 2. Create the tables, rules and functions

1. In the Supabase dashboard, open **SQL Editor** (left menu, the `>_` icon).
2. Click **+ New query** (or **New SQL snippet**).
3. Open `supabase/migrations/001_accounts.sql` from the Bronze folder, copy
   **all** of it, paste it into the editor and click **Run** (or press
   Ctrl+Enter).
4. It should say **Success. No rows returned**. Open **Table Editor**: you
   should see `profiles`, `account_settings`, `consents`, `match_results` and
   `login_attempts`.

If it says *extension "pg_cron" is not available*: open **Database →
Extensions**, search for **pg_cron**, switch it on, then run just the last two
lines of the file again (they schedule the hourly clean-up of unfinished
sign-ups). Run 001 only once on a project; running it twice fails
because the tables already exist. (Step 10's `002` file is different: it's
safe to run as often as you like.)

What the file sets up:

- **profiles**: one per account. Signed-in players can read everyone's
  username, avatar and record; a player can change only their own username
  and avatar (step 10 tightens this: after 002, profiles are read and changed
  only through checked functions). Wins, matches and best score can only be changed by the
  server, through `record_match_result()` (called when a match finishes) and
  `merge_guest_stats()` (a guest's record, moved in once at first log-in).
- A **sign-up trigger** that makes the profile: with the username from the
  Register form, or, for Google, a temporary name (`player_…`) until the
  player chooses one.
- `is_username_available()` (the live ✓ / "Taken" check),
  `email_for_username()` (log in with a username; it gives out the email only
  when the password is right, and pauses a username for 30 seconds after 5
  wrong passwords) and `delete_my_account()`.

## 3. Tell Supabase where Bronze lives

Open **Authentication → URL Configuration**:

1. **Site URL**: your published address, e.g. `https://your-site.example/`.
   While you only try it on your computer, use `http://localhost:5173/`.
   Click **Save**.
2. Under **Redirect URLs**, click **Add URL** and add each address Bronze is
   opened from, with `**` at the end:
   - `http://localhost:5173/**`
   - `http://localhost:4173/**` (for `npm run preview`)
   - `https://your-site.example/**`
   - a preview address if your host makes them, e.g.
     `https://*-your-project.netlify.app/**`

   Click **Save**.

Bronze sends people back to the address they're on (`window.location`), at
`#/auth/callback` (sign-up confirmation and Google) or `#/auth/reset`
(password reset). Supabase refuses to send anyone to an address not in this
list, so a missing entry shows up as a link that lands on the wrong page.

## 4. Email sign-in and confirmation

Open **Authentication → Sign In / Providers** (sometimes **Providers**):

1. **Email**: leave it **enabled**.
2. **Confirm email**:
   - **On** (recommended for a real site): after **Create account**, players
     see "Check your email to confirm your account", and are logged in when
     they click the link.
   - **Off** (easiest while testing): players are logged in straight after
     registering.
3. Click **Save**.

Supabase's built-in email sender only sends a few emails an hour and is meant
for testing. Before real players sign up, connect your own email provider in
**Authentication → Emails → SMTP Settings** (Resend, Postmark, SendGrid,
Amazon SES, ...).

The default email templates work as they are. Their links finish signing in
only in the browser where the player registered or asked for the reset. For
links that also work on another device (register on a laptop, open the email
on a phone), change two templates in **Authentication → Emails → Templates**:

- **Confirm signup**: make the link
  `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=email#/auth/callback`
- **Reset Password**: make the link
  `{{ .SiteURL }}?token_hash={{ .TokenHash }}&type=recovery#/auth/reset`

(These use the Site URL from step 3, so while testing locally set it to
`http://localhost:5173/`.)

## 5. Google sign-in (optional)

Skip this if you only want email accounts; the Google button then shows an
error from Supabase when clicked, so you may want to do it before launch.

**First, in Supabase:** open **Authentication → Sign In / Providers →
Google**. Copy the **Callback URL (for OAuth)** it shows: it looks like
`https://<ref>.supabase.co/auth/v1/callback`. Leave this tab open.

**In Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):

1. At the top, click the project picker → **New project** → name it `Bronze`
   → **Create**, and make sure it's selected.
2. Open **APIs & Services → OAuth consent screen** (newer consoles call it
   **Google Auth Platform → Branding**) and click **Get started**:
   - **App name**: `Bronze`; **User support email**: yours.
   - **Audience**: **External**.
   - **Contact information**: your email. Agree to the policy, **Create**.
   - Under **Branding → Authorized domains**, add `<ref>.supabase.co` and
     your site's domain (e.g. `your-site.example`, or `you.github.io`).
   - Scopes: the defaults (`openid`, `email`, `profile`) are all Bronze uses.
3. Open **Clients** (or **Credentials → + Create credentials → OAuth client
   ID**):
   - **Application type**: **Web application**; **Name**: `Bronze`.
   - **Authorized JavaScript origins** → **Add URI**:
     `http://localhost:5173` and `https://your-site.example` (origin only:
     no path, no trailing slash).
   - **Authorized redirect URIs** → **Add URI**: exactly one, the Supabase
     callback URL you copied (`https://<ref>.supabase.co/auth/v1/callback`).
     Your own site's addresses do **not** go here: Google returns people to
     Supabase, and Supabase returns them to Bronze (the list from step 3).
   - Click **Create** and copy the **Client ID** and **Client secret**.
4. While the app's publishing status is **Testing**, only the test users you
   add under **Audience → Test users** can sign in. When you're ready for
   everyone, click **Publish app** there.

**Back in Supabase** (the Google provider page): switch **Enable Sign in with
Google** on, paste the **Client ID** and **Client secret**, click **Save**.

## 6. The published site

Vite writes the two settings into the site when it's built, so the build on
your host needs them too. Add both as environment variables in your host's
dashboard, then build (deploy) again:

| Host | Where |
| --- | --- |
| Netlify | **Site configuration → Environment variables → Add a variable** |
| Vercel | **Project → Settings → Environment Variables** (tick Production and Preview) |
| Cloudflare Pages | **Workers & Pages → your project → Settings → Variables and Secrets** |
| GitHub Pages (built by GitHub Actions) | **Repository → Settings → Secrets and variables → Actions → New repository secret**, then pass them to the build step: `env: { VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}, VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }} }` |

Names and values, as in `.env`:

| Name | Value | Needed |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | yes |
| `VITE_SUPABASE_ANON_KEY` | the anon or publishable key (`sb_publishable_…`) | yes |

**On Vercel:** **Project → Settings → Environment Variables** → add each name
and value, tick **Production** and **Preview**, **Save**. Then **Deployments →
⋯ on the latest → Redeploy** (a variable only reaches the site on the next
build). The build command is `npm run build` and the output folder is
`dist` (Vercel's *Vite* preset fills both in).

Never add `STRIPE_SECRET_KEY`, the `service_role` key or any `sk_…`/`sb_secret_…`
key to Vercel or `.env`: anything named `VITE_…` is built into the public site.

Then add the site's address to step 3's **Redirect URLs** and step 5's
**Authorized JavaScript origins**.

Accounts need the site served over `http(s)`. They don't work in
`dist-single/index.html` opened from disk, nor inside a Claude artifact
(which blocks connections to other servers): those play as a guest.

## 7. Try it

With `npm run dev` running, open <http://localhost:5173>:

1. **Register** (sidebar, or the top bar on a phone). The username shows ✓ or
   "Taken" as you type. **Create account** → "Check your email" (or you're
   logged in straight away, if Confirm email is off).
2. Click the link in the email: Bronze opens, logs you in and shows the
   lobby. In Supabase, **Table Editor → profiles** has your row.
3. **Log out** (the account menu): "Logged out", back to the lobby as a guest.
4. **Log in** with your **username** (not the email) and password. Then with
   the email. A wrong password says "Username/email or password is
   incorrect" either way.
5. **Forgot password?** on the Log in form → the email → the link opens "Set
   a new password" → save → log in with the new one.
6. **Continue with Google** → choose a username (and your age, and accept the
   Terms) → you're in.
7. Play a match to the end: your wins/matches in the sidebar go up, and so
   do `wins` and `matches` in **Table Editor → profiles**.
8. **Settings → Account → Delete my account**, type your username → you're
   logged out and the row is gone from `profiles` and **Authentication →
   Users**.

## 8. Emails other than account emails

Bronze only sends account emails today (confirm your address, reset your
password), through Supabase. Keep those templates free of news or promotions:
account emails must not contain marketing.

Optional emails (news, friend and tournament emails) are ready for when you add
them, but none are sent yet:

- Players choose them in **Settings → Notifications** (all off by default;
  news only for players who said they're 18 or over). News consent is
  `profiles.marketing_consent`; friend and tournament choices are in
  `account_settings`. Send each kind only to players with it turned on.
- Every optional email needs an unsubscribe link and headers. Each player has a
  secret `account_settings.unsubscribe_token`; with `list` one of
  `marketing`, `friends`, `tournaments` or `all`:
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

## 9. Fill in the legal details

The legal pages (Privacy Policy, Terms, Refund Policy, Cookie Policy, Business
details) are templates. Put your details in `src/legal/operator.ts` (every
`{{PLACEHOLDER}}` there, listed in `CHECKLIST.md`), and have the texts reviewed
before opening accounts to the public. The pages show a "Draft" note while any
placeholder is left.

## 10. Profiles, account settings and security (run `002`)

This adds public profiles (`#/u/<username>`), **Account settings**
(`#/settings/account`: Profile · Security · Privacy · Notifications · Data),
username changes, avatars, match history, reports, two-factor recovery codes,
rate limits and recent sign-ins.

1. **SQL Editor → + New query**.
2. Open `supabase/migrations/002_profiles_security.sql`, copy **all** of it,
   paste, **Run**.
3. It should say **Success. No rows returned**. Check:
   - **Table Editor**: new tables `username_history`, `match_history`,
     `user_reports`, `mfa_recovery_codes`, `rate_limits`;
   - **Storage**: a bucket named `avatars` (public, 2 MB, JPG/PNG/WebP).

It's **safe to run again** (after a Bronze update that changes it, or if it
stopped half-way): it only adds what's missing and replaces functions and
rules with the current ones. It needs 001 first.

What changes for players:

- **Profiles have privacy.** Profile and match history each have **Public**,
  **Friends** or **Private** (Account settings → Privacy). New players under
  18 start at **Friends**. A private profile shows only the avatar and
  username. Until Bronze has friends, "Friends" shows the same as "Private"
  to everyone but the player.
- **Username changes**: the same rules as registering, once every 30 days,
  with the current password (players with only Google sign-in confirm by
  logging in again). The old name redirects to the new one for 30 days and no
  one else can take it in that time.
- **Avatars**: a preset, or an uploaded picture (JPG/PNG/WebP, up to 2 MB,
  cropped to 256×256 in the browser) stored in `avatars/<player id>/`.
- **Email verification is required** for online play, friends, tournaments
  and the shop. Players who haven't confirmed their email see a banner with
  **Resend** (once a minute). This only matters with **Confirm email** on
  (step 4); with it off, every address counts as confirmed.
- **Rate limits** (per player, or per address for visitors): log-in lookups
  30 a minute, username checks 60 a minute, password checks 5 per 15 minutes,
  username changes 10 an hour, reports 5 an hour, recovery codes 5 per 15
  minutes. Supabase's own limits (**Authentication → Rate Limits**) apply on
  top: emails and code checks.
- The hourly clean-up (from step 2) also removes rate-limit counters after a
  day, username reservations after 30 days and reports after a year.

## 11. Security settings in Supabase

**Two-factor authentication (TOTP, free).** Open **Authentication →
Multi-Factor** (under *Configuration*). Make sure **TOTP (App Authenticator)**
is **Enabled** and click **Save**. It's on by default on new projects. Players
then turn it on in **Account settings → Security → Two-factor
authentication**: scan the QR code with an authenticator app (Google
Authenticator, Microsoft Authenticator, 1Password, Aegis, ...), type a code,
and save the 10 recovery codes shown once. At log-in, after the password,
Bronze asks for the 6-digit code (or **Use a recovery code instead**).

**Email address changes.** **Authentication → Sign In / Providers → Email**:
turn **Secure email change** on (it usually is) and **Save**. Then a new
address needs a click in a link sent to **both** the old and the new address;
Account settings shows the change as pending until then.

**Password changes.** Same page: turn **Secure password change** on and
**Save**. Bronze always asks for the current password first; with this on,
Supabase also wants a code emailed to the player if they logged in more than
a day ago, and Bronze asks for it. Changing the password signs out every
other device.

**Link Google.** **Authentication → Sign In / Providers**: turn **Allow manual
linking** on (in the settings at the top of the page, sometimes called
*Enable manual linking*) and **Save**. Without it, **Link Google** in Account
settings shows Supabase's error. A player can't unlink their last way of
logging in.

**Security notification emails.** **Authentication → Emails**, the
**Security** (or *Notifications*) tab: switch on the emails for **Password
changed**, **Email address changed**, **MFA method added** and **MFA method
removed** (and *Identity linked/unlinked* if you like), and **Save**.
Supabase sends these; Bronze doesn't need anything else.

These emails come from the same sender as the others: before real players,
connect your own email provider (step 4, **SMTP Settings**).

**Report inbox.** Reports (**Report user** on a profile) land in the
`user_reports` table: read them in **Table Editor → user_reports**.

## 12. Try the new features

With `npm run dev` running and 002 run:

1. **Profile**: open the account menu → **Profile** (or `#/u/<your name>`):
   avatar with the brass seal, member since, country, bio, stats, last
   matches (after you finish a match), achievements (locked ones greyed with
   what they need).
2. **Account settings → Profile**: pick a preset avatar, upload a picture,
   write a bio, choose a country. Change your username (the live check, then
   your password); `#/u/<old name>` now redirects, and a second change says
   when you can next change it.
3. **Privacy**: set your profile to **Private**, then open it in a private
   window logged out (or as another player): only the avatar and username.
4. **Security**:
   - change your password (wrong current password → refused; same as the old
     one → refused);
   - **Two-factor → Turn on**, scan, type the code, save the recovery codes;
     log out and in again: Bronze asks for the code; try **Use a recovery
     code instead**;
   - **Recent sign-ins** lists your browsers; **Sign out all other devices**.
5. **Email verification**: register a new player and don't click the email
   link: the banner shows, and online play, friends, tournaments and the shop
   say to verify first. **Resend** works once a minute.

## Good to know

- **Guest progress moves in, once.** A guest's record and achievements on a
  device are added to the account the first time they log in there
  (`merge_guest_stats`, with an id so it can't be added twice), and the
  device's guest record is cleared.
- **Results are never lost or counted twice.** Each finished match gets an id
  on the device and waits there until the server confirms it; a retry with
  the same id changes nothing. If saving fails (offline), it's sent again when
  the connection returns or at the next log-in.
- **Results come from the player's browser**, because matches run there. The
  server checks they're plausible (score 0–1000, known maps and
  achievements), but a determined player could still send made-up results.
  Ranked play would need matches checked on a server.
- **Players manage their own data.** Settings → Account has **Download my
  data** (`export_my_data()`) and **Delete my account** (`delete_my_account()`).
  People who can't log in use `#/data-request`.
- **Ages.** Registering asks "Under 14 / 14 to 17 / 18 or over" (no birth
  date). Under 14 can't make an account; 14–17 can, but never get news
  emails. `profiles.birth_year` exists but Bronze never fills it in, because
  the Privacy Policy says it doesn't ask for a birth date.
- **Remember me** off: the session ends when the browser is closed. On: it
  survives reloads and restarts (it's kept in `localStorage`, key `bronze.auth`).
- **Friends, online play, tournaments and the shop** still need a game server
  Bronze doesn't have. Signed-in players see them as "Coming soon"; guests see
  "Log in to use this"; players who haven't confirmed their email see "Verify
  your email to use this".
- **The online dot** on profiles appears only once friends exist (it needs
  the game server too).
- **Phone and card verification** are built but switched off; nothing in
  this guide needs them. [VERIFICATION.md](VERIFICATION.md) says how to turn
  them on.
- Deleting a user under **Authentication → Users** also deletes their profile.

---

## 13. Welcome slides and ratings (run `003`)

This adds the first-time **welcome slides** (shown once after a player's
first sign-in, before the lobby) and **ratings** (one per player per map).

1. **SQL Editor → + New query**.
2. Open `supabase/migrations/003_onboarding_ratings.sql`, copy **all** of it,
   paste, **Run**. It should say **Success. No rows returned**.
3. Check in **Table Editor**: `account_settings` has the new columns
   `onboarding_step` and `onboarding_done_at`, and there are new tables
   `ratings` and `rating_history`.

It's safe to run again, and needs 001 and 002 first. Until it's run, Bronze
simply skips the welcome slides (nobody is locked out of the lobby).

What changes for players:

- **Everyone who signs in sees the welcome slides once**, existing accounts
  included (they haven't picked a level or promised fair play yet). Closing
  the tab resumes on the same slide.
- **Slide 4** records three consents (Terms, Privacy Policy, fair play) with
  the current Terms version in `consents`.
- **Slide 5** sets the starting rating on the Wales & the West map: New 800,
  Beginner 1000, Intermediate 1200, Advanced 1400 (RD 350, volatility 0.06).
  The level can't be changed after the first rated game.
- **Settings → Account → Replay welcome** shows slides 1–3 again.
- Players can read ratings (for the leaderboard and profiles) but never
  write them: only these functions and the game server do.


## 14. Online play (run `004`, deploy the `game` function)

This switches on **Play online**: public and private games for 2–4 players,
invite links and codes, Quick play, spectators, and bots for empty seats.
Every move goes to the `game` Edge Function, which runs the same rules engine
as the browser, checks whose turn it is and whether the move is legal, and
saves the game and its move log in one transaction. Other players' cards, the
deck and the shuffle seed never leave the server.

1. **SQL Editor → + New query**. Open
   `supabase/migrations/004_multiplayer.sql`, copy **all** of it, paste,
   **Run**. It should say **Success. No rows returned**. (Needs 001–003. Safe
   to run again.)
2. Check in **Table Editor**: new tables `games`, `game_players`,
   `game_hands`, `game_actions`, `game_secrets` and `matchmaking_queue`, each
   with **RLS enabled**.
3. Deploy the function with the Supabase CLI (from this folder, after
   `supabase login` and `supabase link --project-ref <your project ref>`):

   ```bash
   supabase functions deploy game --no-verify-jwt
   ```

   `--no-verify-jwt` because visitors may watch public games; the function
   checks every player's log-in itself.
4. **Secrets**: nothing to add. Supabase gives every function
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The
   service-role key is used **only inside the function**: never put it in
   `.env`, Vercel or the repository.
5. **Realtime**: nothing to switch on. The function announces changes on
   Realtime broadcast channels (`game:<id>` and `lobby`); if Realtime is
   unavailable the app falls back to asking every few seconds.

Check it: log in as two players (two browsers, or a private window), open
**Play online**, create a public 2-player game with one, join it from
**Open games** with the other, press **I'm ready**, then **Start game**.
Both see the same board and only their own hand.

What the server enforces:

- Moves only on your turn, only legal moves, only as the next move after the
  version you saw (two moves at once: the second is refused and that player's
  screen reloads). A request that sends anything but a move is refused.
- A player who loses connection has 2 minutes (a timer everyone sees) before
  a bot plays their turns; when they come back they take over again.
- Bots can only fill seats in private games, and a game with bots is never
  rated.

If you change anything in `src/rules` or `src/server`, run
`npm run build:server` and deploy `game` again: the function runs
`supabase/functions/_shared/game-server.js`, built from that code (a test
fails if it's out of date).
