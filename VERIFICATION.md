# Phone and card verification (switched off)

Bronze can verify a player's phone number by SMS and check a payment card
with Stripe (a €0 check, nothing charged). Each one gives the profile a
badge: **Phone verified** or **Verified player**. Both are fully built but
**switched off for now**. While they're off, nothing about them shows in the
app, Stripe.js never loads, the Privacy and Cookie Policies don't mention
them, and [SETUP.md](SETUP.md) leaves them out.

Turning one on: flip its switch (step 1), put its policy text back (step 2),
set up its service (step 3 for the phone, step 4 for the card), then build
and deploy again.

What stays in the project while they're off:

- the screens: `src/components/account/PhonePanel.tsx`, `CardPanel.tsx`, and
  the SMS option in `TwoFactorPanel.tsx`;
- `src/lib/stripe.ts` and the `@stripe/stripe-js` package;
- the Edge Functions `supabase/functions/create-setup-intent` and
  `supabase/functions/stripe-webhook` (with their tests);
- the database parts in `002_profiles_security.sql`: the `phone_verified`,
  `card_verified`, `card_verified_at`, `card_brand` and `card_last4` columns,
  and `note_phone_attempt()`, `note_card_check()`,
  `remove_card_verification()` and the phone trigger. They're harmless while
  unused (the flags stay `false`), so there's nothing to undo in Supabase.

## 1. Flip the switch

In `src/lib/features.ts`, set `phoneVerification` and/or `cardVerification`
to `true`.

## 2. Put the policy text back

While the features were off, their parts of the Privacy and Cookie Policies
were taken out. The full text, in all five languages, is in commit `05dc899`
(the version before they were switched off). Bring back the parts for the
feature you're turning on:

- `src/legal/inventory.ts`:
  - the data items "Phone number, only if you verify one" and "Card
    verification, only if you verify a card";
  - the recipients "Stripe" and the SMS provider;
  - the Stripe cookies `__stripe_mid` and `__stripe_sid`;
  - "phone" in the email-address item's security notices, and "badges" in
    what other players can see.
- `src/legal/operator.ts`: `smsProvider: '{{SMS_PROVIDER}}'`, and its line in
  CHECKLIST.md's placeholders.
- `src/pages/legal/PrivacyPolicy.tsx`:
  - the "Card and phone checks" subsection;
  - the phone and card mentions in "With an account" and "Emails";
  - the Stripe/SMS sentence under "Transfers outside the EEA".
- `src/pages/legal/CookiePolicy.tsx`: the Stripe sentence in the intro and the
  paragraph about Stripe's cookies.
- The same parts in `src/pages/legal/text/lt.tsx`, `de.tsx`, `fr.tsx` and
  `es.tsx`.

To see them all at once: `git diff 05dc899 HEAD -- src/legal src/pages/legal`.
Update `LEGAL_LAST_UPDATED` and `TERMS_VERSION` in `src/legal/operator.ts`
when the text changes.

## 3. Phone verification by SMS (costs money)

Once switched on (step 1), and until this is done, **Account settings →
Security → Phone number** says **"Phone verification isn't available yet"**
and nothing else changes.

A verified phone gives the player a **Phone verified** badge on their profile. Sending SMS needs an
SMS provider account, which charges for every message (a few cents each,
depending on the country); Supabase doesn't send SMS itself.

1. Make an account with an SMS provider Supabase supports: **Twilio** (or
   Twilio Verify), **MessageBird**, **Vonage** or **Textlocal**, and copy the
   values it gives you (for Twilio: *Account SID*, *Auth Token* and a *Messaging
   Service SID* or phone number).
2. In Supabase: **Authentication → Sign In / Providers → Phone** → switch
   **Enable Phone provider** on, choose the SMS provider, paste the values,
   **Save**. Leave *Enable phone signup* as you like: Bronze uses the phone
   only to verify an existing account.
3. **Authentication → Rate Limits**: check the SMS limit (the default is low;
   Bronze also allows each player 5 codes an hour).

The phone as a **second step at log-in** (SMS two-factor) is separate: it's
Supabase's paid **Advanced MFA – Phone** add-on (see
[supabase.com/pricing](https://supabase.com/pricing)). With it enabled under
**Authentication → Multi-Factor → Phone**, players with a verified phone and
two-factor on can click **Allow SMS codes**. Without it, that choice shows Supabase's
error; TOTP (SETUP.md step 11) is free and works without any of this.

## 4. Card verification with Stripe (test mode is free)

The **Verified player** panel (button **Verify with a card**) in Account
settings → Security appears only when `VITE_STRIPE_PUBLISHABLE_KEY` is set. The player types a card into
Stripe's own form; Stripe checks it for €0 with a **SetupIntent** and charges
nothing. Bronze keeps only *verified yes/no*, the date, the card brand and the
last 4 digits (never the card number). The player can **Remove verification**
any time.

Stripe has a **test mode**: fake cards, no money, free. Do everything in test
mode first.

**A. Stripe keys**

1. Sign up at [dashboard.stripe.com](https://dashboard.stripe.com/register)
   (free). You don't need to activate payments for test mode.
2. Make sure **Test mode** (or *Sandbox*) is switched on (top right).
3. **Developers → API keys**: copy the **Publishable key** (`pk_test_…`) and
   click **Reveal** on the **Secret key** (`sk_test_…`) and copy it.
   The secret key goes **only** into Supabase (below): never into `.env`,
   Vercel, GitHub or a chat.

**B. Deploy the two Edge Functions** (from the Bronze folder, in a terminal;
`npx` comes with Node, which you already use for `npm run dev`)

```bash
# 1. Log the Supabase command line in (opens the browser once)
npx supabase login

# 2. Put the Stripe secret key into Supabase's secrets (not into any file)
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref <ref>

# 3. Deploy the functions
npx supabase functions deploy create-setup-intent --no-verify-jwt --project-ref <ref>
npx supabase functions deploy stripe-webhook --no-verify-jwt --project-ref <ref>
```

(With this project: `<ref>` is `rkanldpqushmehxnrqyp`.) If deploying says
Docker isn't running, add `--use-api` to the deploy commands.
`--no-verify-jwt` is right for both: `create-setup-intent` checks the
player's log-in itself, and Stripe (which calls `stripe-webhook`) has no
Supabase log-in; the webhook checks Stripe's signature instead. You can also
set secrets in the dashboard: **Edge Functions → Secrets**.

**C. The webhook** (Stripe tells Bronze the card check passed)

1. Stripe: **Developers → Webhooks** (or *Workbench → Webhooks / Event
   destinations*) → **Add endpoint** / **Add destination**.
2. **Endpoint URL**: `https://<ref>.supabase.co/functions/v1/stripe-webhook`
3. **Events**: select only **`setup_intent.succeeded`**. Save.
4. On the endpoint's page, **Reveal** the **Signing secret** (`whsec_…`) and
   put it into Supabase:

   ```bash
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref <ref>
   ```

5. *Optional*, the "card verification added" email: make a
   [Resend](https://resend.com) account with your domain, then
   `npx supabase secrets set RESEND_API_KEY=re_... NOTIFY_FROM="Bronze <security@your-site.example>" --project-ref <ref>`.

**D. The publishable key**

Add `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` to `.env` (restart `npm run
dev`) and to Vercel (SETUP.md step 6, then redeploy).

**E. Test it**

Account settings → Security → **Verify with a card**, then:

| Card number | What happens |
| --- | --- |
| `4242 4242 4242 4242` | Verified (use any future date and any 3-digit CVC) |
| `4000 0025 0000 3155` | Asks for 3-D Secure first: click *Complete* in Stripe's test window |
| `4000 0000 0000 0002` | Declined: Bronze shows Stripe's message |

After **Verify**, Bronze waits a few seconds for the webhook, then shows
**Verified player** with the brand and last 4 digits (**Table Editor →
profiles**: `card_verified` is `true`, `card_last4` is `4242`). If it says it's
still waiting, open Stripe's webhook page: a failed delivery there (with a
400 "Bad signature") means the `whsec_…` secret doesn't match; a 503 means a
secret is missing. **Edge Functions → stripe-webhook → Logs** in Supabase
shows the rest.

**F. Going live** (only when you want real cards)

Activate your Stripe account, switch **Test mode** off, and repeat A (live
keys `pk_live_…`/`sk_live_…`), C (a live webhook endpoint, its own `whsec_…`)
and D. Check Stripe's pricing for your country before going live: test mode
costs nothing, but live card checks may carry a small fee.
