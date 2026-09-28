import { useLocation, useNavigate, type Location } from 'react-router'

export type AuthMode = 'register' | 'login'

/**
 * Location state of the account screens: the page they were opened over
 * (drawn behind them, and returned to on close) and how many history entries
 * they've added since.
 */
export interface AuthLocationState {
  background?: Location
  depth?: number
}

/** Opens the account screen over the current page. */
export function useOpenAuth() {
  const navigate = useNavigate()
  const location = useLocation()
  return (mode: AuthMode = 'login') => {
    const state = location.state as AuthLocationState | null
    const background = state?.background ?? location
    navigate(`/auth?mode=${mode}`, { state: { background, depth: (state?.depth ?? 0) + 1 } satisfies AuthLocationState })
  }
}
