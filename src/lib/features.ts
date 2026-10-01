/**
 * Features that are built but switched off for now. While a feature is off,
 * nothing about it shows in the app and its services are never contacted.
 *
 * To turn one back on: set it to true here, follow its steps in
 * VERIFICATION.md, and put its Privacy and Cookie Policy text back (listed
 * there too).
 */
export const FEATURES: {
  /** Verify a phone number by SMS (the "Phone verified" badge, and SMS two-factor codes). Needs an SMS provider in Supabase. */
  phoneVerification: boolean
  /** Verify a payment card with Stripe (a €0 check, the "Verified player" badge). Needs Stripe keys and the two Edge Functions. */
  cardVerification: boolean
} = {
  phoneVerification: false,
  cardVerification: false,
}
