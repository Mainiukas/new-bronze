// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { normalizeAuthRedirect } from './redirect'

const at = (href: string) => window.history.replaceState(null, '', href)
const now = () => `${window.location.pathname}${window.location.search}${window.location.hash}`

afterEach(() => at('/'))

describe('normalizeAuthRedirect', () => {
  it('leaves a normal return from Google alone (code in the query, #/auth/callback)', () => {
    at('/?code=abc#/auth/callback')
    normalizeAuthRedirect()
    expect(now()).toBe('/?code=abc#/auth/callback')
  })

  it('sends a code that landed on the plain Site URL to #/auth/callback (Supabase fell back to it)', () => {
    at('/?code=abc')
    normalizeAuthRedirect()
    expect(now()).toBe('/?code=abc#/auth/callback')
    at('/?code=abc#/online')
    normalizeAuthRedirect()
    expect(now()).toBe('/?code=abc#/auth/callback')
  })

  it('sends a recovery link that lost its route to #/auth/reset', () => {
    at('/?token_hash=t&type=recovery')
    normalizeAuthRedirect()
    expect(now()).toBe('/?token_hash=t&type=recovery#/auth/reset')
  })

  it('moves errors from the fragment into the query, at #/auth/callback', () => {
    at('/#error=access_denied&error_description=Nope')
    normalizeAuthRedirect()
    expect(now()).toBe('/?error=access_denied&error_description=Nope#/auth/callback')
  })

  it('does nothing on an ordinary page', () => {
    at('/#/online')
    normalizeAuthRedirect()
    expect(now()).toBe('/#/online')
  })
})
