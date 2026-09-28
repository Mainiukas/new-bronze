import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '../hooks/useAuth'
import type { AuthBackend } from './backend'
import { createAuthStore } from './store'

/** Provides useAuth() to the app, following the backend's signed-in user. `backend` null: guests only. */
export function AuthProvider({ backend, children }: { backend: AuthBackend | null; children: ReactNode }) {
  const [store] = useState(() => createAuthStore(backend))
  useEffect(() => store.start(), [store])
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState)

  const value = useMemo<AuthContextValue>(() => {
    const { getState: _getState, subscribe: _subscribe, start: _start, ...actions } = store
    return { ...state, ...actions, configured: state.status !== 'unconfigured', signedIn: state.status === 'signed-in' }
  }, [state, store])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
