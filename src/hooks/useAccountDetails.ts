import { useCallback, useEffect, useState } from 'react'
import type { AccountDetails } from '../auth/backend'
import { authErrorMessage } from '../auth/messages'
import { useT } from '../i18n'
import { useAuth } from './useAuth'

/** The signed-in player's own account details (my_account()), with a way to load them again. */
export function useAccountDetails() {
  const t = useT()
  const { getAccount, signedIn } = useAuth()
  const [details, setDetails] = useState<AccountDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!signedIn) return
    let alive = true
    getAccount().then(
      (result) => {
        if (!alive) return
        setDetails(result)
        setError(null)
      },
      (failure) => alive && setError(authErrorMessage(failure, t.authErrors)),
    )
    return () => {
      alive = false
    }
  }, [getAccount, signedIn, version, t.authErrors])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { details, error, reload }
}
