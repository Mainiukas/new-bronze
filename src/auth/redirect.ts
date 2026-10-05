/**
 * Round trips through Google and email links. Bronze uses hash routes
 * (#/auth/callback), and Supabase adds its results to the query in front of
 * the hash: /?code=…&sb_flow_id=…#/auth/callback.
 */

const RESULT_PARAMS = ['code', 'sb_flow_id', 'token_hash', 'type', 'error', 'error_code', 'error_description']
const RETURN_KEY = 'bronze.auth.returnTo'

/** The URL Supabase should send people back to: this page, at a hash route. */
export const authRedirectUrl = (route: string) => `${window.location.origin}${window.location.pathname}#${route}`

/**
 * Before the router starts, make sure a return from Google or an email link
 * lands on #/auth/callback:
 * - Some failures come back in the fragment (#error=…), which would replace
 *   the hash route: they move into the query.
 * - When the address Bronze asked to come back to isn't on Supabase's list of
 *   Redirect URLs (or doesn't match it exactly, e.g. www or not), Supabase
 *   sends people to the plain Site URL instead, with the code in the query
 *   and no #/auth/callback. Without this the code would sit unused and the
 *   player would land back on the page they started from, still logged out.
 */
export function normalizeAuthRedirect(): void {
  const raw = window.location.hash.slice(1)
  const url = new URL(window.location.href)
  if (/(^|[&#?])(error|error_description)=/.test(raw) && !raw.startsWith('/')) {
    new URLSearchParams(raw).forEach((value, key) => {
      if (!/token/.test(key)) url.searchParams.set(key, value)
    })
    url.hash = '/auth/callback'
    window.history.replaceState(null, '', url)
    return
  }
  const route = raw.split('?')[0]
  const finishes = route === '/auth/callback' || route === '/auth/reset'
  if (!finishes && hasAuthResult(url.searchParams)) {
    url.hash = url.searchParams.get('type') === 'recovery' ? '/auth/reset' : '/auth/callback'
    window.history.replaceState(null, '', url)
  }
}

/** Supabase's results in the page URL, if any. */
export const authParams = () => new URLSearchParams(window.location.search)

export const hasAuthResult = (params: URLSearchParams) => RESULT_PARAMS.some((key) => params.has(key))

/** Tidy the results out of the address bar once they've been used. */
export function clearAuthParams(): void {
  const url = new URL(window.location.href)
  for (const key of RESULT_PARAMS) url.searchParams.delete(key)
  window.history.replaceState(window.history.state, '', url)
}

/** Where to go after a Google round trip: the page the person was on. */
export function rememberReturnTo(path: string): void {
  try {
    sessionStorage.setItem(RETURN_KEY, path)
  } catch {
    // Storage unavailable: they land on the main menu.
  }
}

export function takeReturnTo(): string {
  try {
    const path = sessionStorage.getItem(RETURN_KEY)
    sessionStorage.removeItem(RETURN_KEY)
    return path && path.startsWith('/') && !path.startsWith('/auth') ? path : '/'
  } catch {
    return '/'
  }
}
