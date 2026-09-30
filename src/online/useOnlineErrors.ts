import { useCallback } from 'react'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'
import { OnlineError } from './client'

/** Explains a refused request in the player's language (a toast). */
export function useOnlineErrors() {
  const t = useT()
  const notify = useToast()
  return useCallback(
    (error: unknown) => {
      const code = error instanceof OnlineError ? error.code : 'server'
      notify(t.online.errors[code] ?? t.online.errors.server)
    },
    [notify, t],
  )
}
