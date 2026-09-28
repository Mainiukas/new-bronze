# Compliance checklist

EU/GDPR baseline for Bronze (operator in Lithuania). Done on 27 September 2026.

The legal texts are **templates written for you to review**. They have not been
reviewed by a lawyer. Operator details are `{{PLACEHOLDERS}}` (listed at the
end), and every legal page shows its "Last updated" date and a "Draft" note
until the placeholders are filled in.

**Status key**: ✅ done · ➖ not applicable (with the reason) · ⚠️ needs you (see
"Decisions for you").

---

## Audit

### Third-party scripts, SDKs, fonts and CDNs

| What | Purpose | How it loads | Category |
| --- | --- | --- | --- |
| React, React DOM, React Router | The app itself | Bundled into the site; no network | Essential |
| `@supabase/supabase-js` | Accounts: sign-in, profiles, consents | Bundled. Talks only to **your** Supabase project (`VITE_SUPABASE_URL`), and only when accounts are configured | Essential (for accounts) |
| Google sign-in (via Supabase) | "Continue with Google" | Only when the player clicks it: the page goes to Google and comes back | Essential (user-initiated) |
| Google profile photos | Avatar of players who signed in with Google | The image loads from Google's servers (with no referrer) for signed-in Google players | Essential for that feature ⚠️ |
| Stripe.js (`@stripe/stripe-js`) | Card verification, **switched off** (`src/lib/features.ts`) | Never loads while switched off. See VERIFICATION.md before turning it on (it adds Stripe's iframe and cookies) | n/a while off |
| Fonts: Cinzel, Barlow, Barlow Condensed | Text | **Self-hosted**: bundled via Fontsource; no Google Fonts requests | Essential |
| Tailwind CSS, Vite | Build tools; their CSS and small runtime helpers ship in the bundle | Bundled | Essential |

There are **no analytics, advertising, tracking pixels, social embeds, CDNs,
iframes or error-reporting services**. There are no remote fonts either. A browser
test confirms that a first visit makes no requests to any other server.

### Cookies and browser storage

Bronze sets one cookie and several storage entries, all first-party. The full
table, with purpose, category and duration for each, is generated from
`src/legal/inventory.ts` and shown on the Cookie Policy (`#/cookies`).

| Key | Where | Category |
| --- | --- | --- |
| `bronze.consent` | Local storage | Essential |
| `bronze.auth`, `bronze.auth-code-verifier`, `bronze.auth-user` (Supabase session) | Local storage | Essential |
| `bronze.auth.remember` | Local storage | Essential |
| `bronze_session_alive` | Cookie (session) | Essential |
| `bronze.auth.returnTo`, `bronze.auth.failures` | Session storage | Essential |
| `bronze.match` (match in progress) | Local storage | Essential |
| `bronze.stats.pending.<id>` | Local storage | Essential |
| `bronze.boardDraft` (map editor only) | Local storage | Essential |
| `bronze.settings`, `bronze.lobby.gameMode`, `bronze.lobby.map`, `bronze.setup`, `bronze.stats` (guest record) | Local storage | Preferences (consent) |

### Personal data

- **Guests**: nothing is sent to the operator. The hosting provider sees
  server-log data (IP address, pages, browser).
- **Account holders**:
  - email address;
  - password, stored as a hash by Supabase;
  - username;
  - Google name, email, photo and ID, only for Google sign-in;
  - age band (14–17 or 18+, never a birth date);
  - consent records (what was agreed to, its version and when);
  - email preferences;
  - game record (matches, wins, best score, goods shipped, maps, achievements);
  - match history (per match: time, map, mode, players, place, score, goods, links, industries);
  - optional profile details (bio, country, avatar picture) and privacy settings;
  - previous usernames (30 days);
  - two-factor authentication: the authenticator key (Supabase) and hashed recovery codes;
  - reports about players (12 months);
  - rate-limit counters (a day);
  - failed log-in counter (at most a day);
  - Supabase's sign-in logs (also shown to the player as Recent sign-ins).
- **Friends**: none. Friends are "Coming soon", so no friend data exists.
- **Analytics**: none.

### Emails

Supabase sends the transactional emails: **confirm your address**, **reset
your password**, **change of email address** (to both addresses), the
re-authentication code for a password change, and the **security notices**
(password, email or two-factor changed) once they're switched on (SETUP.md
step 11). No marketing or other
notification emails are sent. The preferences, unsubscribe links and endpoint
are built for when they are.

### Payments and shop

Nothing is sold. The Shop is "Coming soon": no prices, no in-game currency, no
checkout, no payment SDK in use. (The Stripe card check is built but switched
off; it charges nothing. See VERIFICATION.md.)

---

## The items

### 1. Privacy Policy ✅
`#/privacy`, generated from the inventory. It covers:
- the data collected and why;
- the legal basis for each item (art. 6(1)(a)/(b)/(c)/(f));
- how long each item is kept;
- recipients and processors (Supabase, Google, hosting, email provider, other players and visitors);
- who sees the profile (Public / Friends only / Private);
- transfers outside the EEA;
- your rights (access, rectification, erasure, portability, objection or
  restriction, withdrawing consent, complaining to the VDAI, with its address);
- contact details;
- the 30-day response time;
- children (item 17);
- security and changes to the policy.

**Files**: `src/pages/legal/PrivacyPolicy.tsx`, `src/legal/inventory.ts`, `src/legal/operator.ts`, `src/components/legal/LegalPage.tsx`.

**Verify**: open `#/privacy`. The tables list exactly what `inventory.ts` lists. `npm test` checks the VDAI and 30-day text.

### 2. Terms of Service ✅
`#/terms` covers:
- eligibility (anyone as a guest, accounts from 14, a parent's consent for purchases under 18);
- account rules;
- username rules;
- fair play (no cheating, bots, exploits or abuse);
- virtual items and currency (none today; a licence with no real-world value, not transferable);
- ownership of the content;
- suspension and closing accounts (with notice);
- availability;
- limitation of liability (with the non-excludable carve-outs);
- Lithuanian law, keeping your own country's mandatory consumer protections and courts, with out-of-court resolution by VVTAT;
- changes to the terms, and contact details.

**Files**: `src/pages/legal/TermsOfService.tsx`.

**Verify**: open `#/terms`.

### 3. Refund Policy ➖ (no real-money sales)
Nothing is sold and there's no in-game currency, so `#/refunds` says exactly that and stays short. Also:
- no checkout exists, so there is nowhere to add the "digital content delivered immediately" consent checkbox;
- before selling anything, replace this page with the EU 14-day withdrawal terms;
- add the checkout checkbox (explicit request plus acknowledgement of losing the right of withdrawal) then.

**Files**: `src/pages/legal/RefundPolicy.tsx`.

**Verify**: open `#/refunds`.

### 4. Cookie Policy ✅
`#/cookies`: the category descriptions and a full table (name/key, type,
provider, purpose, category, duration) generated from `inventory.ts`, plus how
to change your choices.

**Files**: `src/pages/legal/CookiePolicy.tsx`, `src/legal/inventory.ts`.

**Verify**: open `#/cookies`. `npm test` fails if the code uses a `bronze…` key the inventory doesn't list, or if the table misses one.

### 5. Cookie consent banner ✅
- Shown on the first visit, again after 12 months, and whenever the version changes (`CONSENT_VERSION`).
- **Accept all**, **Reject all** and **Customise** have identical styling.
- Customise shows switches for Preferences, Analytics and Marketing; Essential is always on.
- Nothing optional is stored before a choice. Preferences only save once allowed, and withdrawing deletes them.
- There are no analytics or marketing tools, so nothing else is gated today.
- The choice is stored with its time, version and method.
- "Cookie settings" in the footer (and in Settings → Privacy) reopens it and moves focus to it.
- Copy is in English and in Lithuanian (automatic for Lithuanian browsers, plus a switch).
- It's a non-blocking panel, not a modal: Rules and the legal pages stay usable, and pages leave room for it.
- Keyboard: it's the first stop after "Skip to content"; Customise moves focus to the first switch.

**Files**: `src/legal/consent.ts`, `src/components/legal/CookieBanner.tsx`, `src/lib/storage.ts`, `src/hooks/usePersistentState.ts`, `src/components/legal/SiteFooter.tsx`, `src/index.css`.

**Verify**:
1. In a private window, open the site: the banner shows, and DevTools → Application → Local Storage has only essential keys.
2. Choose Customise, turn on Preferences and save: `bronze.consent` holds `{version, timestamp, method, choices}`.
3. Footer → Cookie settings → Reject all: `bronze.settings` is deleted.

### 6. Form consents ✅
Register has:
- a required, **unticked** "I agree to the Terms of Service and the Privacy Policy" box;
- a separate, optional, **unticked** "Email me news about Bronze" box, only shown to people 18 or over.

The consent is stored server-side in `consents` (kind, granted, version, time) by the sign-up trigger.

Google sign-in shows the same notice before the account exists. The first sign-in stops at "Finish your account" (username, age question, the same Terms box, the marketing box for 18+). Nothing is created until **Create account**, and "Not now" deletes what Google shared.

**Files**: `src/components/auth/Consents.tsx`, `src/components/auth/RegisterForm.tsx`, `src/components/auth/ChooseUsername.tsx`, `src/pages/AuthScreen.tsx`, `src/auth/*`, `supabase/migrations/001_accounts.sql` (`consents`, `record_signup`, `handle_new_user`, `finish_signup`).

**Verify**: register, then run `select * from consents` in Supabase. Sign in with a new Google account and choose "Not now": the user disappears from Authentication → Users.

### 6b. Fake reviews ➖
There are no testimonials, ratings or reviews anywhere, and no reviews section.

**Verify**: search the code for "review", "rating" or "testimonial" (the only hits are the password-strength rating and code comments).

### 7. Data minimisation ✅
- Only what accounts need: no phone number, no birth date (an age band only), no location. A bio, country and avatar picture are optional.
- Profiles of players under 18 start as "Friends only".
- New clean-ups, run hourly by the SQL's `pg_cron` job:
  - unfinished sign-ups (no profile) are deleted after 7 days;
  - never-confirmed email sign-ups are deleted after 7 days;
  - failed log-in counters are deleted after a day;
  - rate-limit counters are deleted after a day;
  - old usernames (and their reservation) are deleted after 30 days;
  - reports are deleted after a year.
- Declined Google sign-ups are deleted at once.
- The unsubscribe token and email choices sit in a private table (`account_settings`), and the private columns of `profiles` (news consent, Terms version) can't be read by other players.
- Logs: the only `console` messages are for missing art files, a misconfigured account URL, a computer player that failed to move, and the dev-only board layout report. None contain personal data, and there's no error-reporting service.
- **One open question** ⚠️: Google profile photos are stored as a public avatar URL.

**Files**: `supabase/migrations/001_accounts.sql` (`account_settings`, `login_attempts.last_failed_at`, `bronze_cleanup`), `002_profiles_security.sql` (column grants on `profiles`, `bronze_cleanup`), `src/pages/AuthScreen.tsx`.

**Verify**: run the SQL, then `select * from cron.job`.

### 8. Third-party SDKs ✅
Listed in the audit above.
- Nothing unused ships: `link_space.png` and `link_symbol.png` are no longer bundled.
- Fonts are self-hosted, and there's no CDN. Stripe.js (card verification) is switched off and never loads.
- Nothing non-essential exists to gate. The consent categories and `consentStore.allows()` are ready for any future tool.
- The SDKs are documented in the Privacy Policy (recipients) and the Cookie Policy.

**Files**: `src/components/board/assets.ts`, `src/legal/inventory.ts`.

**Verify**: DevTools → Network on a first visit shows only the site's own files.

### 9. Dark patterns ✅
Changes made:
- **"Remember me" now starts unticked**: staying logged in after the browser closes is the player's choice.
- The cookie banner's Accept all, Reject all and Customise are equally prominent. Rejecting is one click, and withdrawing deletes the stored data.
- The Terms and marketing boxes start unticked and are separate. Marketing is never offered to under-18s.
- **Deleting an account is as easy as creating one**: Settings → Account → Delete, then type your username.
- The Google first-sign-in exit was "Not now: log out", which left the account behind. It now deletes it and says so ("Not now: cancel and delete what Google shared").
- Under-14s get a plain notice with "Keep playing as a guest": no shaming, no workaround prompts.
- Checked and already fine:
  - no confirmshaming copy;
  - no fake urgency or countdowns (the only countdowns are real rate limits: 30 s after 5 wrong passwords, 60 s between reset emails);
  - no forced accounts for offline play (guests play every offline mode);
  - no hidden unsubscribe (Settings → Notifications, plus one-click links);
  - the Cancel and Delete buttons in the delete dialog are the same size.

**Files**: `src/components/auth/LoginForm.tsx`, `src/components/auth/ChooseUsername.tsx`, `src/pages/AuthScreen.tsx`, `src/components/legal/CookieBanner.tsx`, `src/components/settings/AccountSettings.tsx`.

### 10. Hidden fees ➖ (nothing is sold)
There are no prices, fees, taxes or in-game currency. The footer and the Refund Policy say nothing is sold. When a shop opens: show the final price including VAT before the buy button, and show the conversion if in-game currency is sold.

### 11. Unsupported claims ✅
Searched all user-facing text for "best", "#1", "millions", player counts, "limited" and similar. Nothing unsupported was found.
- The online and friends counts show "—" (not real, so hidden).
- Stats are the player's real record.
- The Shop, Tournaments and Locker descriptions are labelled "Coming soon".
- The old Credits said "Game design: The Bronze team", which isn't a verifiable fact. The new Credits page names `{{OPERATOR_NAME}}` instead.

**Files**: `src/pages/legal/Credits.tsx` (the old Credits modal was removed from `src/components/InfoModals.tsx`).

### 12. Deliver ✅
- **Lint**: `npm run lint` → 0 warnings.
- **Tests**: `npm test` → all pass.
- **Build**: `npm run build` passes.
- **Accessibility**: axe-core 4.13 (WCAG 2.0/2.1/2.2 A+AA plus best practices) found **0 violations** on:
  - every lobby page (guest and signed in);
  - every legal page;
  - Register, Log in and Forgot password;
  - the Google "Finish your account" step;
  - the How to Play and Settings dialogs;
  - the match screen;
  - on a phone: the home page, the Privacy Policy, Register and the More sheet.
- **Contrast over images**: text over images and gradients (which axe can't judge) was sampled from the rendered pixels. All of it passes; the lowest is 5.3:1.
- **Reflow**: no sideways scrolling at 320 px and 720 px wide (400 % and 200 % zoom).

(These browser checks ran against a local stand-in for Supabase. They are not part of the repository.)

### 13. Alt text ✅
Informative images:
- The map: "Illustrated map of Wales, the Midlands and the South West".
- Rules pictures: "A link hexagon", "A built canal token", and so on.
- The empty bubble in the rules is an SVG with `role="img"` and a label.
- Hub goods in the board tooltip now have their names ("Cotton", "Coal", "Iron").
- Board items are labelled buttons:
  - slots: "Birmingham, slot 3: cotton mill or iron works, built: Ada's iron works";
  - links: "Oxford to Swindon (railway): built by Ada" or "…: not built yet";
  - hubs are named.
- Industry icons that stand alone get their name as alt text.

Decorative images use `alt=""`:
- lobby and auth backdrops, the map-card thumbnail, route textures;
- the token art in colour pickers (the button is labelled);
- era banner art;
- industry icons with the name written beside them;
- avatars, because the name is always next to the avatar (or on the link's label).

Icons in `icons.tsx` are `aria-hidden` and `focusable="false"`; their buttons carry the label.

**Files**: `src/components/game/IndustryIcon.tsx`, `src/components/board/BoardTooltip.tsx`, `src/components/board/IllustratedBoard.tsx`, `src/components/board/parts.tsx`, `src/components/InfoModals.tsx`.

### 14. Colour contrast ✅
Pairs changed:

| Pair | Before | After |
| --- | --- | --- |
| Secondary text `parchment-400` on bronze-tinted and lighter iron panels | #8f7d62: 4.05–4.30 : 1 | **#a99675**: ≥ 4.82 : 1 on every surface |
| Placeholders, player-panel labels, inactive tooltip lines, locked achievement icons (`parchment-500`) | ≈ 3 : 1 | moved to `parchment-400` (≥ 4.8 : 1) |
| Brass button text on the brass art (normal state) | #34200a: 4.32 : 1 | **#140c05**: 5.44 : 1 |
| Metallic heading gradient, darkest stop (large text) | bronze-700: 2.36 : 1 | **bronze-500**: 5.64 : 1 |
| City plate "Thames Valley" (cream text) | #8a6420: 4.30 : 1 | **#7d5c1d**: 4.94 : 1 |

Other pairs checked and already passing:
- other region plates: 6.4–9.6 : 1;
- stop and hub plaques: 8.6–9.2 : 1;
- price badge: 10.3 : 1;
- primary buttons: 8.0 : 1 at the text;
- the Register/Log in pill: ≥ 4.5 : 1.

Disabled controls keep the dimmer colour, which WCAG allows. **Player colours are never the only signal**: each player's letter (Y, B, P, R, W) is now always shown on their tiles and tokens, in the panels and in the log. The optional "Colour-blind aid" setting was removed.

**Files**: `src/index.css`, `src/data/board.json` (Thames colour only), `src/pages/Game.tsx`, `src/data/settings.ts`, `src/components/SettingsModal.tsx`, and the files where `parchment-500` text moved.

### 15. Keyboard, and the other accessibility basics ✅
- **Skip to content**: the first Tab stop, which jumps to the page (or the match).
- **Board**:
  - Tab goes through the slots, link bubbles and hubs;
  - **arrow keys move to the nearest one in that direction**;
  - Enter or Space acts;
  - a description is announced.
- **Modals**: native `<dialog>` traps focus, Esc closes it, and focus returns to the opener (tested with How to Play). Long dialog bodies can now be scrolled with the keyboard.
- **Sidebar**: links, the Legal group (a disclosure button with `aria-expanded`) and the profile menu (arrow keys, Esc).
- **Auth**: focus starts on the first field, Enter submits, errors are `aria-live`.
- **Banner**: covered in item 5.
- **Other basics**:
  - visible focus rings;
  - no keyboard traps;
  - page language `en` (the banner switches to `lt` when in Lithuanian);
  - heading order passes axe, and the match screen now has an `h1`;
  - reduced motion is honoured (the `prefers-reduced-motion` rules and `motion-reduce` variants);
  - pages now open scrolled to the top;
  - 200 % zoom and reflow were checked.

**Files**: `src/App.tsx` (skip link, scroll to top), `src/components/board/IllustratedBoard.tsx`, `src/components/ModalFrame.tsx`, `src/components/Sidebar.tsx`, `src/pages/Game.tsx`.

### 16. Business details ✅
`#/legal`, linked from the footer, the sidebar and the match menu:
- operator name and legal form;
- address and email;
- company code and VAT number;
- website and hosting.

All are placeholders, followed by links to every legal page.

**Files**: `src/pages/legal/LegalNotice.tsx`, `src/legal/operator.ts`.

### 17. Age and children's data ✅ (⚠️ your choice to confirm)
Registration asks **"How old are you?"** with three neutral choices: Under 14, 14 to 17, 18 or over. There is no birth date.
- **Under 14 → blocked (the option you asked for as the default).** No account; "Keep playing as a guest", which stores nothing on the server. The Google path deletes the sign-in.
- **14 to 17** → account allowed, never any marketing: no box is offered, the server forces it off, and Settings needs "I'm 18 or over now".
- **Real-money purchases** → none exist. The Terms require a parent's consent for under-18 purchases, and the flag is stored (`account_settings.is_adult`) for when a shop opens.
- There are no ads at all, so none are targeted at minors.

**Files**: `src/components/auth/Consents.tsx`, `RegisterForm.tsx`, `ChooseUsername.tsx`, `supabase/migrations/001_accounts.sql`.

### 18. Unsubscribe ✅ (built, not yet used)
No optional emails are sent yet. What's ready:
- Preferences: marketing, friends and tournaments, all off by default, in **Settings → Notifications**.
- Each player has a secret unsubscribe token.
- **One-click link** `#/unsubscribe?token=…&list=…`: unsubscribes on opening, with no log-in.
- **`List-Unsubscribe` / `List-Unsubscribe-Post` headers** (RFC 8058), backed by the Edge Function `supabase/functions/unsubscribe` (deploy it when you start sending).
- Unsubscribing is logged in `consents`.
- Transactional emails (confirmation, reset) need no unsubscribe link. SETUP.md tells you to keep them free of marketing.

**Files**: `src/pages/legal/Unsubscribe.tsx`, `src/components/settings/AccountSettings.tsx`, `supabase/functions/unsubscribe/index.ts`, `SETUP.md` §8 and `001_accounts.sql` (`set_email_preferences`, `unsubscribe`).

### 19. Licences ✅ (⚠️ two to confirm)
**Fonts**, all SIL OFL 1.1:
- Cinzel (© 2020 The Cinzel Project Authors);
- Barlow and Barlow Condensed (© 2017 The Barlow Project Authors).

The licence texts are in `public/licenses/` and shipped with the site.

**Code**: `THIRD_PARTY_NOTICES.md` (and `public/THIRD_PARTY_NOTICES.txt`, shipped), generated by `npm run notices` from `node_modules`. It lists 20 packages, all MIT, 0BSD or OFL, with their licence texts. None are flagged.

**Sounds**: synthesised in the browser; there are no audio files.

**Icons**: drawn for Bronze. The Google "G" is Google's trademark, used as Google's sign-in guidelines ask.

**Art**:
- The map, icons, textures, tokens, hexagons, hub pictures, panels and buttons: AI-generated by the operator. ⚠️ Confirm the AI tool's terms give you commercial rights.
- The background paintings (`assets/bg/`): AI-generated for Bronze. ⚠️ Same check.
- The logo and ornaments (`assets/logo/`, `assets/ui/ornaments/`): made for Bronze.
- Files derived from these for speed (same pictures, smaller files): the WebP brass buttons, the 90 % "glass" iron panels, the token swatches and the 512 px icon.

`#/credits` shows all the attributions.

**Files**: `src/pages/legal/Credits.tsx`, `scripts/third-party-notices.mjs`, `THIRD_PARTY_NOTICES.md`, `public/THIRD_PARTY_NOTICES.txt`, `public/licenses/*`, `package.json` (`notices` script).

### 20. Data deletion and export ✅
**Settings → Account**:
(also **Account settings → Data**)
- **Download my data**: a JSON file with the account (email, sign-in methods, dates, what the sign-in provider shared), profile (with bio, country, avatar and privacy), email choices, every consent with its version and time, match history, previous usernames, reports made, the failed log-in counter, and this browser's data.
- **Delete my account**: a confirmation that lists what goes, then you type your username (with two-factor on, the session must have passed it). It removes uploaded avatar pictures, then deletes the auth user, which cascades to the profile, settings, consents, match history, username history, recovery codes and reports about the player, and clears the log-in counter. Reports the player made are kept without their name. It then signs out and says "Your account and its data have been deleted".
- **Clear this device**: removes everything Bronze stored in this browser.

For people who can't log in, **`#/data-request`** explains the process and composes an email to `{{OPERATOR_EMAIL}}`. The 30-day (one-month) response time is in the Privacy Policy.

**Files**: `src/components/settings/AccountSettings.tsx`, `src/components/SettingsModal.tsx`, `src/pages/legal/DataRequest.tsx`, `src/auth/*`, `001_accounts.sql` and `002_profiles_security.sql` (`export_my_data`, `delete_my_account`).

**Verify**: log in and download: the file opens as JSON. Delete: the user is gone from Supabase Authentication → Users and from `profiles`, `consents` and `account_settings`.

---

## Placeholders to fill in

All are in `src/legal/operator.ts`:

- `{{OPERATOR_NAME}}`: your legal name, or your company's
- `{{OPERATOR_LEGAL_FORM}}`: e.g. "UAB", or individual activity
- `{{OPERATOR_ADDRESS}}`
- `{{OPERATOR_EMAIL}}`: for privacy and data requests (also the data-request form's address)
- `{{COMPANY_NUMBER}}`: juridinio asmens kodas, if a company
- `{{VAT_NUMBER}}`: PVM mokėtojo kodas, if registered (otherwise remove the line)
- `{{SITE_URL}}`
- `{{HOSTING_PROVIDER}}`: e.g. GitHub Pages or Netlify
- `{{HOSTING_LOG_RETENTION}}`: how long your host keeps access logs
- `{{SUPABASE_REGION}}`: an EU region is recommended
- `{{EMAIL_PROVIDER}}`: Supabase's mailer or your SMTP provider
- `{{BACKUP_RETENTION}}`: Supabase backup period for your plan
- `{{AUTH_LOG_RETENTION}}`: how long Supabase keeps sign-in logs
- `{{TRANSFER_SAFEGUARDS}}`: e.g. "the Standard Contractual Clauses in Supabase's DPA"

Also update `LEGAL_LAST_UPDATED` and `TERMS_VERSION` in the same file whenever a text changes.

## Decisions for you

1. **Age gate**: under-14s are **blocked** (guest play only), as you asked for the default. The alternative, parental consent, isn't built.
2. **Real-money sales**: none today. Before selling, decide what to sell and at which prices (VAT-inclusive). Then write real refund terms (14-day withdrawal) and add the checkout consent checkbox.
3. **Legal review**: have a lawyer review all the texts. Also verify the authority details used (VDAI: L. Sapiegos g. 17, LT-10312 Vilnius, ada@ada.lt, vdai.lrv.lt; VVTAT: vvtat.lrv.lt).
4. **Supabase**: pick an EU region, sign Supabase's DPA, and fill in the transfer safeguard. Enable `pg_cron`, which the clean-up job needs.
5. **Google profile photos**: they are shown publicly and load from Google's servers. Keep them, or show initials only (simpler for privacy)?
6. **Inactive accounts**: they are kept until the player deletes them. Decide whether to delete accounts after a period of inactivity (e.g. 24 months), and say so in the Privacy Policy.
7. **Lithuanian**: the banner's Lithuanian text should be checked by a native speaker. Do you want the whole site translated?
8. **Unused consent categories**: Analytics and Marketing appear in the banner although nothing uses them (so that future tools already have a choice). Keep them, or hide them until a tool exists?
9. **AI art**: confirm the terms of the AI tools you used allow commercial use.
10. **Data requests**: the form composes an email (nothing is stored). A server-side form would need a backend or inbox tool.
11. **"Remember me"** now starts unticked. Confirm you're happy with that.
12. **Emails**: when you start sending optional emails, use a provider that supports `List-Unsubscribe`, and deploy the Edge Function.
