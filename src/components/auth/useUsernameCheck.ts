import { useEffect, useState } from 'react'
import { validateUsername } from '../../auth/validation'
import type { UsernameCheck } from './fields'

/**
 * Live availability of a username: checked 400 ms after typing stops, only
 * when it's well-formed. Stale answers (for an older spelling) are ignored.
 */
export function useUsernameCheck(username: string, isAvailable: (name: string) => Promise<boolean>, enabled = true): UsernameCheck {
  const name = username.trim()
  const ready = enabled && validateUsername(name) === null
  const [result, setResult] = useState<{ name: string; status: UsernameCheck }>({ name: '', status: 'idle' })

  useEffect(() => {
    if (!ready) return
    let alive = true
    const timer = window.setTimeout(() => {
      isAvailable(name).then(
        (free) => alive && setResult({ name, status: free ? 'available' : 'taken' }),
        () => alive && setResult({ name, status: 'error' }),
      )
    }, 400)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [name, ready, isAvailable])

  if (!ready) return 'idle'
  return result.name === name ? result.status : 'checking'
}
