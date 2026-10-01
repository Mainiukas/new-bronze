import { describe, expect, it } from 'vitest'
import { EMPTY_STATS } from '../data/achievements'
import type { AuthBackend, AuthUser, OnboardingState, Profile } from './backend'
import { createAuthStore } from './store'

const ada: Profile = { id: 'u1', username: 'Ada', avatarUrl: null, createdAt: 'then', stats: EMPTY_STATS }
const adaUser: AuthUser = { id: 'u1', email: 'ada@example.com', displayName: null, avatarUrl: null }
const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

/** A signed-in Ada, on a service that has (or hasn't) the welcome slides. */
function service(onboarding: OnboardingState | 'missing' | 'failing') {
  const calls: string[] = []
  let saved = onboarding === 'missing' || onboarding === 'failing' ? null : { ...onboarding }
  const backend = {
    onUserChange(listener: (user: AuthUser | null, recovery: boolean) => void) {
      setTimeout(() => listener(adaUser, false), 0)
      return () => undefined
    },
    async getMfaState() {
      return { current: 'aal1', next: 'aal1', factors: [] }
    },
    async getProfile() {
      return ada
    },
    ...(onboarding === 'missing'
      ? {}
      : {
          async getOnboarding() {
            if (onboarding === 'failing') throw new Error('offline')
            return saved
          },
          async setOnboardingStep(step: number) {
            calls.push(`step:${step}`)
            if (saved) saved.step = step
          },
          async acceptRules(version: string) {
            calls.push(`rules:${version}`)
            if (saved) saved.rulesAccepted = true
          },
          async finishOnboarding(level: string) {
            calls.push(`finish:${level}`)
            if (saved) saved.done = true
            return { new: 800, beginner: 1000, intermediate: 1200, advanced: 1400 }[level] ?? 0
          },
        }),
  } as unknown as AuthBackend
  return { backend, calls }
}

describe('the welcome slides (auth store)', () => {
  it('loads where a new player is, and saves each slide so a closed tab resumes there', async () => {
    const { backend, calls } = service({ step: 3, done: false, canPickLevel: true, rulesAccepted: false })
    const store = createAuthStore(backend)
    store.start()
    await settle()
    expect(store.getState().status).toBe('signed-in')
    expect(store.getState().onboarding).toEqual({ step: 3, done: false, canPickLevel: true, rulesAccepted: false })
    await store.setOnboardingStep(4)
    expect(store.getState().onboarding?.step).toBe(4)
    expect(calls).toEqual(['step:4'])
  })

  it('records the rules, then the level: the slides are done and the rating comes back', async () => {
    const { backend, calls } = service({ step: 4, done: false, canPickLevel: true, rulesAccepted: false })
    const store = createAuthStore(backend)
    store.start()
    await settle()
    await store.acceptRules('2026-09-28')
    expect(store.getState().onboarding?.rulesAccepted).toBe(true)
    expect(await store.finishOnboarding('intermediate')).toBe(1200)
    expect(store.getState().onboarding?.done).toBe(true)
    expect(calls).toEqual(['rules:2026-09-28', 'finish:intermediate'])
  })

  it('never keeps anyone out of the lobby when the service has no welcome slides, or can’t say', async () => {
    for (const kind of ['missing', 'failing'] as const) {
      const store = createAuthStore(service(kind).backend)
      store.start()
      await settle()
      expect(store.getState().status).toBe('signed-in')
      expect(store.getState().onboarding).toBeNull()
    }
  })
})
