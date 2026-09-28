/**
 * Safe localStorage helpers.
 *
 * Storage can be missing or throw (private browsing, blocked cookies, quota
 * exceeded, sandboxed iframes). Every access is wrapped in try/catch so the
 * app keeps working with in-memory state only.
 *
 * Writes follow the visitor's cookie choices: a key in a category they
 * haven't allowed (see legal/inventory.ts) is kept in memory only.
 */

import { consentStore } from '../legal/consent'
import { categoryOf } from '../legal/inventory'

export { STORAGE_KEYS } from './storageKeys'

/** Read and JSON-parse a value. Returns undefined if absent or unreadable. */
export function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

/** Remove a value. Failures are ignored. */
export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

/** JSON-serialize and write a value, if the visitor's cookie choices allow it. Failures are ignored. */
export function writeStorage(key: string, value: unknown): void {
  if (!consentStore.allows(categoryOf(key))) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full: keep going with in-memory state.
  }
}
