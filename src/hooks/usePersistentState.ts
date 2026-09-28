import { useEffect, useState } from 'react'
import { useConsent } from '../legal/consent'
import { categoryOf } from '../legal/inventory'
import { readStorage, writeStorage } from '../lib/storage'

/**
 * useState that is initialised from, and saved back to, localStorage.
 *
 * `parse` validates the stored value and returns undefined when it is
 * unusable (wrong type, a map id that no longer exists, ...), in which case
 * `fallback` is used instead.
 *
 * Keys in an optional category are only saved once the visitor allows it
 * (until then they live in memory); allowing it later saves the current value.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  parse: (raw: unknown) => T | undefined,
) {
  const [value, setValue] = useState<T>(() => {
    const raw = readStorage(key)
    return (raw === undefined ? undefined : parse(raw)) ?? fallback
  })
  const category = categoryOf(key)
  const { record } = useConsent()
  const allowed = category === 'essential' || record?.choices[category] === true

  useEffect(() => {
    if (allowed) writeStorage(key, value)
  }, [key, value, allowed])

  return [value, setValue] as const
}
