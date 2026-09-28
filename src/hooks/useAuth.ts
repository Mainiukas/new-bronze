import { createContext, useContext } from 'react'
import type { AuthState, AuthStore } from '../auth/store'

/** The account state plus its actions (see createAuthStore). */
export type AuthContextValue = AuthState &
  Omit<AuthStore, 'getState' | 'subscribe' | 'start'> & {
    /** An account service is set up (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). */
    configured: boolean
    /** Signed in with a profile. */
    signedIn: boolean
  }

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Who's signed in, and the account actions. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
