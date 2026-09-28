// Supabase Edge Function (Deno): starts a card check for the signed-in player.
// Creates a Stripe SetupIntent (nothing is charged, and the card isn't saved
// to a customer) and returns its client secret, which Stripe's card form in
// the browser uses to check the card. The stripe-webhook function then marks
// the profile verified.
//
// Secrets (Supabase): STRIPE_SECRET_KEY. SUPABASE_URL and SUPABASE_ANON_KEY are provided.
// It checks the player's log-in itself, so it's deployed with --no-verify-jwt
// (see SETUP.md): supabase functions deploy create-setup-intent --no-verify-jwt

import { jwtClaims, stripeApi } from '../_shared/stripe.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // The project's public key: Supabase provides it; the app also sends it with each call.
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || request.headers.get('apikey')
  if (!stripeKey || !supabaseUrl || !anonKey) return json({ error: 'Card verification isn’t set up.' }, 503)

  // Who is asking: Supabase checks the player's token.
  const authorization = request.headers.get('Authorization')
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization ?? '' } })
  if (!userResponse.ok) return json({ error: 'Log in first.' }, 401)
  const user = (await userResponse.json()) as { id: string; factors?: { status: string }[] }

  // Players with two-factor authentication must have passed it in this session.
  const hasTwoFactor = (user.factors ?? []).some((factor) => factor.status === 'verified')
  if (hasTwoFactor && jwtClaims(authorization).aal !== 'aal2') return json({ error: 'Two-factor authentication needed.' }, 403)

  // At most 5 card checks an hour per player (counted by the database).
  const limit = await fetch(`${supabaseUrl}/rest/v1/rpc/note_card_check`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: authorization ?? '', 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (limit.ok && (await limit.json()) === false) return json({ error: 'Too many attempts. Try again later.' }, 429)

  try {
    const intent = await stripeApi<{ client_secret: string }>(stripeKey, 'POST', 'setup_intents', {
      'payment_method_types[]': 'card',
      usage: 'on_session',
      description: 'Bronze: card check (nothing is charged)',
      'metadata[user_id]': user.id,
    })
    return json({ clientSecret: intent.client_secret })
  } catch (error) {
    console.error(error)
    return json({ error: 'Stripe couldn’t start the check.' }, 502)
  }
})
