import type { Stripe } from '@stripe/stripe-js'

/**
 * Card verification through Stripe (optional). The publishable key comes from
 * VITE_STRIPE_PUBLISHABLE_KEY; without it the option is hidden. The card form
 * is Stripe's own (Stripe Elements, in Stripe's iframe): card numbers never
 * reach Bronze's code or database.
 */
export const STRIPE_PUBLISHABLE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim()
export const stripeConfigured = STRIPE_PUBLISHABLE_KEY.startsWith('pk_')

let loading: Promise<Stripe | null> | null = null

/** Stripe.js, loaded from js.stripe.com the first time it's needed. */
export function loadStripeJs(): Promise<Stripe | null> {
  if (!stripeConfigured) return Promise.resolve(null)
  loading ??= import('@stripe/stripe-js').then(({ loadStripe }) => loadStripe(STRIPE_PUBLISHABLE_KEY))
  return loading
}
