import { describe, expect, it } from 'vitest'
import lt from '../i18n/lt'
import type { BronzeSupabase, ProfileRow } from '../lib/supabase'
import { AuthError } from './backend'
import { createSupabaseBackend } from './supabaseBackend'
import { canChangeUsername, nextUsernameChange, USERNAME_CHANGE_DAYS, validatePasswordChange, validateUsernameChange } from './validation'

const DAY = 24 * 60 * 60 * 1000

describe('username change rules', () => {
  it('uses the registration rules for the new name', () => {
    expect(validateUsernameChange('Ada', 'Ada_Lovelace')).toBeNull()
    expect(validateUsernameChange('Ada', 'ab')).toMatch(/at least 3/i)
    expect(validateUsernameChange('Ada', 'x'.repeat(21))).toMatch(/at most 20/i)
    expect(validateUsernameChange('Ada', 'ada lovelace')).toMatch(/letters, numbers and _/i)
    expect(validateUsernameChange('Ada', '')).toMatch(/choose/i)
  })

  it('refuses the current name, but allows changing its capitals', () => {
    expect(validateUsernameChange('Ada', 'Ada')).toMatch(/already your username/i)
    expect(validateUsernameChange('Ada', ' Ada ')).toMatch(/already your username/i)
    expect(validateUsernameChange('Ada', 'ADA')).toBeNull()
  })

  it('is once every 30 days', () => {
    expect(USERNAME_CHANGE_DAYS).toBe(30)
    const changed = '2026-09-01T12:00:00Z'
    expect(nextUsernameChange(changed)?.toISOString()).toBe('2026-10-01T12:00:00.000Z')
    expect(canChangeUsername(changed, new Date(Date.parse(changed) + 29 * DAY))).toBe(false)
    expect(canChangeUsername(changed, new Date(Date.parse(changed) + 30 * DAY - 1))).toBe(false)
    expect(canChangeUsername(changed, new Date(Date.parse(changed) + 30 * DAY))).toBe(true)
  })

  it('allows a first change any time', () => {
    expect(nextUsernameChange(null)).toBeNull()
    expect(nextUsernameChange(undefined)).toBeNull()
    expect(nextUsernameChange('not a date')).toBeNull()
    expect(canChangeUsername(null)).toBe(true)
  })

  it('explains in the player’s language', () => {
    expect(validateUsernameChange('Ada', 'Ada', lt.validation)).toBe(lt.validation.sameUsername)
    expect(lt.validation.sameUsername).not.toBe('That’s already your username.')
  })
})

describe('password change validation', () => {
  const ok = { current: 'Old-pass-1', next: 'Sprocket-42', confirm: 'Sprocket-42', hasPassword: true }
  const clean = { current: null, next: null, confirm: null }

  it('accepts a good change', () => {
    expect(validatePasswordChange(ok)).toEqual(clean)
  })

  it('needs the current password', () => {
    expect(validatePasswordChange({ ...ok, current: '' }).current).toMatch(/current password/i)
  })

  it('needs a strong enough new password, different from the old one', () => {
    expect(validatePasswordChange({ ...ok, next: 'short', confirm: 'short' }).next).toMatch(/at least 8/i)
    expect(validatePasswordChange({ ...ok, next: 'Old-pass-1', confirm: 'Old-pass-1' }).next).toMatch(/different from your current/i)
  })

  it('needs the confirmation to match', () => {
    expect(validatePasswordChange({ ...ok, confirm: 'Sprocket-43' }).confirm).toMatch(/don’t match|do not match/i)
    expect(validatePasswordChange({ ...ok, confirm: '' }).confirm).not.toBeNull()
  })

  it('lets Google-only accounts set a first password without a current one', () => {
    expect(validatePasswordChange({ current: '', next: 'Sprocket-42', confirm: 'Sprocket-42', hasPassword: false })).toEqual(clean)
    expect(validatePasswordChange({ current: '', next: 'short', confirm: 'short', hasPassword: false }).next).toMatch(/at least 8/i)
  })

  it('explains in the player’s language', () => {
    expect(validatePasswordChange({ ...ok, current: '' }, lt.validation).current).toBe(lt.validation.enterCurrentPassword)
    expect(validatePasswordChange({ ...ok, next: ok.current, confirm: ok.current }, lt.validation).next).toBe(lt.validation.sameAsCurrent)
  })
})

/* ---- The account calls, with a stand-in database ------------------------------ */

type RpcResult = { data: unknown; error: unknown }

function backendWith(answer: (name: string, args: Record<string, unknown>) => RpcResult) {
  const calls: string[] = []
  const client = {
    auth: {},
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push(`${name}:${JSON.stringify(args)}`)
      return answer(name, args)
    },
  }
  return { backend: createSupabaseBackend(client as unknown as BronzeSupabase), calls }
}

async function failure(promise: Promise<unknown>): Promise<AuthError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof AuthError) return error
    throw error
  }
  throw new Error('expected an AuthError')
}

describe('username change (server answers)', () => {
  it('sends the new name with the password', async () => {
    const { backend, calls } = backendWith(() => ({ data: 'ok', error: null }))
    await backend.changeUsername('Ada_L', 'Sprocket-42')
    expect(calls).toEqual(['change_username:{"p_username":"Ada_L","p_password":"Sprocket-42"}'])
  })

  it('turns each refusal into a message the form can show', async () => {
    const answers: [RpcResult, string, string | null][] = [
      [{ data: 'wrong-password', error: null }, 'wrong-password', null],
      [{ data: null, error: { code: 'P0001', message: 'too-soon', hint: '2026-10-01T12:00:00+00:00' } }, 'too-soon', '2026-10-01T12:00:00+00:00'],
      [{ data: null, error: { code: '23505', message: 'username-taken' } }, 'username-taken', null],
      [{ data: null, error: { code: '28000', message: 'reauth-needed' } }, 'reauth-needed', null],
      [{ data: null, error: { code: 'PT429', message: 'rate-limited' } }, 'rate-limited', null],
      [{ data: null, error: { code: '22023', message: 'same-username' } }, 'same-username', null],
      [{ data: null, error: { code: '22023', message: 'invalid-username' } }, 'invalid-input', null],
    ]
    for (const [answer, code, detail] of answers) {
      const { backend } = backendWith(() => answer)
      const error = await failure(backend.changeUsername('Ada_L', 'x'))
      expect(error.code, code).toBe(code)
      if (detail) expect(error.detail).toBe(detail)
    }
  })
})

describe('privacy settings', () => {
  const row = (extra: Partial<ProfileRow>): ProfileRow => ({
    id: 'u1',
    username: 'Ada',
    avatar: null,
    wins: 2,
    matches: 5,
    best_score: 31,
    goods_shipped: 9,
    maps_played: [],
    achievements: {},
    created_at: '2026-01-01T00:00:00Z',
    needs_username: false,
    ...extra,
  })

  it('saves both choices and returns the updated profile', async () => {
    const { backend, calls } = backendWith((_name, args) => ({
      data: [row({ profile_visibility: String(args.p_profile), history_visibility: String(args.p_history) } as Partial<ProfileRow>)],
      error: null,
    }))
    const profile = await backend.setPrivacy('private', 'friends')
    expect(calls).toEqual(['set_privacy:{"p_profile":"private","p_history":"friends"}'])
    expect(profile).toMatchObject({ profileVisibility: 'private', historyVisibility: 'friends' })
  })

  it('reads anything unknown as public, the default', async () => {
    const { backend } = backendWith(() => ({ data: [row({})], error: null }))
    expect(await backend.setPrivacy('public', 'public')).toMatchObject({ profileVisibility: 'public', historyVisibility: 'public' })
  })

  it('refuses a value the server doesn’t know', async () => {
    const { backend } = backendWith(() => ({ data: null, error: { code: '22023', message: 'invalid-visibility' } }))
    expect((await failure(backend.setPrivacy('public', 'public'))).code).toBe('invalid-input')
  })
})

describe('public profile', () => {
  it('shows a private profile as just the name and avatar', async () => {
    const { backend } = backendWith(() => ({
      data: { username: 'Ada', avatar: 'preset:locomotive', private: true, is_self: false },
      error: null,
    }))
    const result = await backend.getPublicProfile('ada')
    expect(result.kind).toBe('found')
    if (result.kind !== 'found') return
    expect(result.profile).toMatchObject({ username: 'Ada', avatarUrl: 'preset:locomotive', private: true, isSelf: false, bio: null, country: null })
    expect(result.profile.stats).toBeUndefined()
    expect(result.profile.summary).toBeUndefined()
    expect(result.profile.historyVisible).toBe(false)
  })

  it('shows a public profile in full', async () => {
    const { backend } = backendWith(() => ({
      data: {
        username: 'Ada',
        avatar: null,
        private: false,
        is_self: false,
        created_at: '2026-01-15T00:00:00Z',
        bio: 'Coal first.',
        country: 'LT',
        phone_verified: true,
        card_verified: false,
        history_visible: true,
        stats: { matches: 12, wins: 7, best_score: 58, goods_shipped: 64, maps_played: ['black-country'], achievements: {} },
        summary: { recorded_matches: 12, average_score: 41.5, links: 57, industries: 83, favourite_mode: 'blitz', favourite_map: 'black-country' },
      },
      error: null,
    }))
    const result = await backend.getPublicProfile('Ada')
    if (result.kind !== 'found') throw new Error(result.kind)
    expect(result.profile).toMatchObject({ bio: 'Coal first.', country: 'LT', phoneVerified: true, cardVerified: false, historyVisible: true })
    expect(result.profile.stats).toMatchObject({ matches: 12, wins: 7, bestScore: 58 })
    expect(result.profile.summary).toMatchObject({ averageScore: 41.5, links: 57, industries: 83, favouriteMode: 'blitz', favouriteMap: 'black-country' })
  })

  it('follows a renamed player, and says when there is no such player', async () => {
    expect(await backendWith(() => ({ data: { redirect: 'Ada_L' }, error: null })).backend.getPublicProfile('Ada')).toEqual({ kind: 'renamed', username: 'Ada_L' })
    expect(await backendWith(() => ({ data: null, error: null })).backend.getPublicProfile('Nobody')).toEqual({ kind: 'missing' })
  })

  it('hides the match history when the server says so', async () => {
    const { backend } = backendWith(() => ({ data: null, error: null }))
    expect(await backend.getMatchHistory('Ada', 0)).toBeNull()
  })
})
