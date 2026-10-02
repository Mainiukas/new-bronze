import { AuthError, type AuthBackend } from './backend'

/**
 * An account backend whose code loads on first use (`load`), so the first
 * page doesn't wait for it. Every call waits for the real backend and then
 * runs unchanged, in the order it was made. If loading fails, or the real
 * one turns out not to be configured, calls fail with a network error and
 * the player is treated as a guest.
 */
export function createLazyBackend(load: () => Promise<AuthBackend | null>): AuthBackend {
  let loading: Promise<AuthBackend | null> | null = null
  const ready = () => (loading ??= load().catch(() => null))
  const real = async () => {
    const backend = await ready()
    if (!backend) throw new AuthError('network', 'The account service couldn’t be loaded.')
    return backend
  }

  const special: Pick<AuthBackend, 'onUserChange' | 'setRememberMe'> = {
    onUserChange(callback) {
      let stop: (() => void) | null = null
      let stopped = false
      void ready().then((backend) => {
        if (stopped) return
        if (backend) stop = backend.onUserChange(callback)
        else callback(null, false)
      })
      return () => {
        stopped = true
        stop?.()
      }
    },
    setRememberMe(remember) {
      // Runs before any call made after it (they all wait on the same load).
      void ready().then((backend) => backend?.setRememberMe(remember))
    },
  }

  // Every other method: wait for the real backend, then call it with the same arguments.
  return new Proxy(special as AuthBackend, {
    get(target, name: string | symbol) {
      if (name in target) return target[name as keyof typeof target]
      // Not methods: `then` (it isn't a promise) and `toJSON` (so serialising it doesn't call the backend).
      if (typeof name !== 'string' || name === 'then' || name === 'toJSON') return undefined
      return async (...args: unknown[]) => {
        const backend = await real()
        const method = backend[name as keyof AuthBackend] as unknown as ((...params: unknown[]) => unknown) | undefined
        if (typeof method !== 'function') throw new AuthError('unknown', `No account method ${name}.`)
        return method.apply(backend, args)
      }
    },
  })
}
