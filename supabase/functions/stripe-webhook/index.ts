// Supabase Edge Function (Deno): Stripe's webhook. On setup_intent.succeeded
// it marks the player's profile as card-verified, keeping only the card's
// brand and last 4 digits, and (if an email provider is set) tells them so.
// Every request's signature is checked with the endpoint's signing secret.
//
// Secrets (Supabase): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET; optional
// RESEND_API_KEY and NOTIFY_FROM (e.g. "Bronze <security@your-site.example>")
// for the "card verification added" email. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// Deploy (see SETUP.md): supabase functions deploy stripe-webhook --no-verify-jwt

import { stripeApi, verifyStripeSignature } from '../_shared/stripe.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const text = (message: string, status = 200) => new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

Deno.serve(async (request) => {
  if (request.method !== 'POST') return text('Use POST.', 405)
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) return text('Not configured.', 503)

  const body = await request.text()
  if (!(await verifyStripeSignature(body, request.headers.get('Stripe-Signature'), webhookSecret))) return text('Bad signature.', 400)

  const event = JSON.parse(body) as { type: string; data: { object: { metadata?: Record<string, string>; payment_method?: string | null } } }
  if (event.type !== 'setup_intent.succeeded') return text('Ignored.')

  const intent = event.data.object
  const userId = intent.metadata?.user_id
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId) || !intent.payment_method) return text('No player on this check.')

  try {
    const method = await stripeApi<{ card?: { brand?: string; last4?: string } }>(stripeKey, 'GET', `payment_methods/${intent.payment_method}`)
    const service = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
    const update = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...service, Prefer: 'return=minimal' },
      body: JSON.stringify({
        card_verified: true,
        card_verified_at: new Date().toISOString(),
        card_brand: (method.card?.brand ?? 'card').slice(0, 20),
        card_last4: /^\d{4}$/.test(method.card?.last4 ?? '') ? method.card?.last4 : null,
      }),
    })
    if (!update.ok) throw new Error(`Profile update: ${update.status} ${await update.text()}`)

    // The "card verification added" email, when an email provider is set up.
    const resendKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('NOTIFY_FROM')
    if (resendKey && from) {
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, { headers: service })
      const email = userResponse.ok ? ((await userResponse.json()) as { email?: string }).email : undefined
      if (email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: email,
            subject: 'Card verification added to your Bronze account',
            text: `A payment card (${method.card?.brand ?? 'card'} ending ${method.card?.last4 ?? '????'}) was used to verify your Bronze account. Nothing was charged.\n\nIf this wasn't you, change your password and contact us.`,
          }),
        }).catch((error) => console.error('Notice email failed', error))
      }
    }
    return text('Verified.')
  } catch (error) {
    console.error(error)
    // 500: Stripe retries the webhook later.
    return text('Could not record the check.', 500)
  }
})
