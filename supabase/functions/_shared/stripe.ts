// Shared by the Stripe Edge Functions (Deno) and tested with Vitest (stripe.test.ts).
// Plain fetch and Web Crypto: no Stripe SDK, nothing to install.

const encoder = new TextEncoder()

const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

/** Compares two strings in time that doesn't depend on where they differ. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}

/**
 * Checks a webhook's Stripe-Signature header ("t=…,v1=…") against the raw
 * body and the endpoint's signing secret (whsec_…), as Stripe documents:
 * HMAC-SHA256 of "<t>.<body>", and a timestamp at most 5 minutes old.
 */
export async function verifyStripeSignature(body: string, header: string | null, secret: string, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300): Promise<boolean> {
  if (!header || !secret) return false
  const parts = header.split(',').map((part) => part.trim().split('='))
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1])
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value ?? '')
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)))
  return signatures.some((signature) => sameText(signature, expected))
}

/** A call to Stripe's API (form-encoded, as Stripe expects). */
export async function stripeApi<T>(secretKey: string, method: 'GET' | 'POST', path: string, form?: Record<string, string>): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form ? new URLSearchParams(form) : undefined,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(`Stripe ${path}: ${data?.error?.message ?? response.status}`)
  return data as T
}

/** The claims inside a Supabase access token (not verified here: Supabase's API checks it on every call we make with it). */
export function jwtClaims(authorization: string | null): Record<string, unknown> {
  const token = (authorization ?? '').replace(/^Bearer\s+/i, '')
  const payload = token.split('.')[1]
  if (!payload) return {}
  try {
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}
