import { AuthApiError, type AuthChangeEvent, type Session } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { BronzeSupabase, ProfileRow } from '../lib/supabase'
import { createAuthStore } from './store'
import { createSupabaseBackend } from './supabaseBackend'

const PASSWORD = 'Sprocket-42'

const row = (id: string, username: string, extra: Partial<ProfileRow> = {}): ProfileRow => ({
  id,
  username,
  avatar: null,
  wins: 2,
  matches: 5,
  best_score: 31,
  goods_shipped: 9,
  maps_played: ['black-country'],
  achievements: {},
  created_at: '2026-01-01T00:00:00Z',
  needs_username: false,
  ...extra,
})

/**
 * A stand-in for the Supabase client: just the calls Bronze makes, backed by
 * two accounts. `calls` records every RPC and sign-in, in order.
 */
function fakeSupabase() {
  const users: Record<string, { id: string; email: string; meta: Record<string, string> }> = {
    'ada@example.com': { id: 'u1', email: 'ada@example.com', meta: {} },
    'grace@example.com': { id: 'g1', email: 'grace@example.com', meta: { full_name: 'Grace Hopper' } },
  }
  const profiles: ProfileRow[] = [row('u1', 'Ada'), row('g1', 'player_0a1b2c3d4e5f', { needs_username: true, wins: 0, matches: 0, best_score: 0 })]
  const calls: string[] = []
  const listeners: ((event: AuthChangeEvent, session: Session | null) => void)[] = []
  const session = (email: string) => ({ user: { id: users[email].id, email, user_metadata: users[email].meta } }) as unknown as Session
  const emit = (event: AuthChangeEvent, value: Session | null) => listeners.forEach((listener) => listener(event, value))

  const rpc = async (name: string, args: Record<string, unknown>) => {
    calls.push(`rpc:${name}:${JSON.stringify(args)}`)
    if (name === 'email_for_username') {
      const profile = profiles.find((p) => p.username.toLowerCase() === String(args.name).toLowerCase())
      const email = profile && Object.values(users).find((u) => u.id === profile.id)?.email
      return { data: email && args.password === PASSWORD ? email : null, error: null }
    }
    if (name === 'record_match_result') {
      const profile = profiles.find((p) => p.id === 'u1')!
      profile.matches += 1
      if (args.won) profile.wins += 1
      profile.best_score = Math.max(profile.best_score, Number(args.score))
      return { data: [profile], error: null }
    }
    return { data: null, error: null }
  }

  const client = {
    auth: {
      onAuthStateChange(listener: (event: AuthChangeEvent, session: Session | null) => void) {
        listeners.push(listener)
        setTimeout(() => listener('INITIAL_SESSION', null), 0)
        return { data: { subscription: { unsubscribe: () => undefined } } }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        calls.push(`signIn:${email}`)
        if (!users[email] || password !== PASSWORD) return { data: {}, error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials') }
        emit('SIGNED_IN', session(email))
        return { data: {}, error: null }
      },
      async exchangeCodeForSession() {
        emit('SIGNED_IN', session('grace@example.com'))
        return { data: {}, error: null }
      },
      async signOut() {
        emit('SIGNED_OUT', null)
        return { error: null }
      },
    },
    rpc,
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: async () => ({ data: profiles.find((p) => p.id === id) ?? null, error: null }),
        }),
      }),
    }),
  }
  return { client: client as unknown as BronzeSupabase, calls }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

async function started() {
  const fake = fakeSupabase()
  const store = createAuthStore(createSupabaseBackend(fake.client), { redirectUrl: (route) => `https://bronze.test/#${route}` })
  store.start()
  await settle()
  return { ...fake, store }
}

describe('Supabase accounts (mocked client)', () => {
  it('logs in with a username: looks up the email with the password, then signs in with it', async () => {
    const { store, calls } = await started()
    const state = await store.signIn('ada', PASSWORD, true)
    expect(state.status).toBe('signed-in')
    expect(state.profile).toMatchObject({ username: 'Ada', stats: { wins: 2, matches: 5, bestScore: 31 } })
    expect(calls).toEqual([`rpc:email_for_username:{"name":"ada","password":"${PASSWORD}"}`, 'signIn:ada@example.com'])
  })

  it('logs in with an email without looking anything up', async () => {
    const { store, calls } = await started()
    expect((await store.signIn('ada@example.com', PASSWORD, true)).status).toBe('signed-in')
    expect(calls).toEqual(['signIn:ada@example.com'])
  })

  it('fails an unknown username, a wrong password and a wrong email the same way', async () => {
    const { store, calls } = await started()
    await expect(store.signIn('nobody', PASSWORD, true)).rejects.toMatchObject({ code: 'invalid-credentials' })
    await expect(store.signIn('ada', 'wrong-password', true)).rejects.toMatchObject({ code: 'invalid-credentials' })
    await expect(store.signIn('ada@example.com', 'wrong-password', true)).rejects.toMatchObject({ code: 'invalid-credentials' })
    // No email was ever given out, and no sign-in was tried for the unknown username.
    expect(calls.filter((call) => call.startsWith('signIn:'))).toEqual(['signIn:ada@example.com'])
    expect(store.getState().status).toBe('guest')
  })

  it('asks a first-time Google player (temporary name) to choose a username', async () => {
    const { store } = await started()
    const state = await store.finishRedirect(new URLSearchParams('code=abc'))
    expect(state.status).toBe('needs-username')
    expect(state.user?.displayName).toBe('Grace Hopper')
    expect(state.profile).toBeNull()
  })

  it('adds a finished match through record_match_result, never by writing the profile', async () => {
    const { store, calls } = await started()
    await store.signIn('ada@example.com', PASSWORD, true)
    await store.recordMatchResult({ id: 'r-1', score: 44, won: true, goodsShipped: 4, mapId: 'mersey-valley', achievements: ['foreman'] })
    expect(calls.at(-1)).toBe(
      'rpc:record_match_result:{"score":44,"won":true,"p_match_id":"r-1","p_goods_shipped":4,"p_map_id":"mersey-valley","p_achievements":["foreman"]}',
    )
    expect(store.getState().profile?.stats).toMatchObject({ wins: 3, matches: 6, bestScore: 44 })
  })

  it('signs out back to a guest', async () => {
    const { store } = await started()
    await store.signIn('ada', PASSWORD, true)
    await store.signOut()
    await settle()
    expect(store.getState().status).toBe('guest')
  })
})
