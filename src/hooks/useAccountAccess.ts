import { useAuth } from './useAuth'

/**
 * What the player may use: 'guest' (log in first), 'unverified' (signed in,
 * email not confirmed yet: computer matches only), or 'ready'. Online play,
 * friends, tournaments and the shop need 'ready'.
 */
export function useAccountAccess(): 'guest' | 'unverified' | 'ready' {
  const { signedIn, user } = useAuth()
  if (!signedIn) return 'guest'
  return user?.emailVerified === false ? 'unverified' : 'ready'
}
