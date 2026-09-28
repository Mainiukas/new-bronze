import { describe, expect, it } from 'vitest'
import { jwtClaims, verifyStripeSignature } from './stripe.ts'

const secret = 'whsec_test_secret'
const body = '{"type":"setup_intent.succeeded"}'

async function sign(payload: string, timestamp: number, key = secret) {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(`${timestamp}.${payload}`))
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

describe('Stripe webhook signature', () => {
  const now = 1_790_000_000

  it('accepts a correct, fresh signature', async () => {
    expect(await verifyStripeSignature(body, `t=${now},v1=${await sign(body, now)}`, secret, now + 10)).toBe(true)
  })

  it('accepts when any of several v1 signatures matches (secret rolling)', async () => {
    const header = `t=${now},v1=${'0'.repeat(64)},v1=${await sign(body, now)}`
    expect(await verifyStripeSignature(body, header, secret, now)).toBe(true)
  })

  it('refuses a changed body, a wrong secret, an old timestamp or no header', async () => {
    const good = await sign(body, now)
    expect(await verifyStripeSignature(`${body} `, `t=${now},v1=${good}`, secret, now)).toBe(false)
    expect(await verifyStripeSignature(body, `t=${now},v1=${await sign(body, now, 'whsec_other')}`, secret, now)).toBe(false)
    expect(await verifyStripeSignature(body, `t=${now},v1=${good}`, secret, now + 301)).toBe(false)
    expect(await verifyStripeSignature(body, null, secret, now)).toBe(false)
    expect(await verifyStripeSignature(body, `t=${now}`, secret, now)).toBe(false)
  })
})

describe('JWT claims', () => {
  it('reads the payload of a bearer token', () => {
    const payload = btoa(JSON.stringify({ sub: 'u1', aal: 'aal2' })).replace(/=+$/, '')
    expect(jwtClaims(`Bearer x.${payload}.sig`)).toMatchObject({ sub: 'u1', aal: 'aal2' })
    expect(jwtClaims(null)).toEqual({})
  })
})
