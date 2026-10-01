/**
 * The cookie notice. Bronze stores only what it needs to work (see
 * legal/inventory.ts: no analytics, ads or trackers), so there is nothing to
 * accept or reject: the notice says so once, and remembers that you saw it
 * (bronze.consent, in this browser only), with when and for which version of
 * the Cookie Policy.
 */

import { useSyncExternalStore } from 'react'
import { CONSENT_STORAGE_KEY } from './inventory'

/**
 * Bump when the Cookie Policy changes what's stored: the notice shows again.
 * (Version 1 asked for consent to optional categories; there are none now.)
 */
export const CONSENT_VERSION = 2
/** The notice shows again after 12 months. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export interface ConsentRecord {
  version: number
  /** When the notice was dismissed (ISO 8601). */
  timestamp: string
  method: 'notice'
}

/** A stored record, if it's valid, current and not expired. */
export function parseConsent(raw: unknown, now = Date.now()): ConsentRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Partial<ConsentRecord>
  if (r.version !== CONSENT_VERSION || typeof r.timestamp !== 'string' || r.method !== 'notice') return null
  const at = Date.parse(r.timestamp)
  if (!Number.isFinite(at) || now - at > CONSENT_MAX_AGE_MS || at - now > 60_000) return null
  return { version: CONSENT_VERSION, timestamp: r.timestamp, method: 'notice' }
}

function readRecord(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return raw ? parseConsent(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export interface ConsentSnapshot {
  record: ConsentRecord | null
  /** The notice is showing: not seen yet (or an old version, or over 12 months ago). */
  open: boolean
}

export function createConsentStore() {
  const initial = typeof window === 'undefined' ? null : readRecord()
  let snapshot: ConsentSnapshot = { record: initial, open: initial === null }
  const listeners = new Set<() => void>()
  const set = (next: Partial<ConsentSnapshot>) => {
    snapshot = { ...snapshot, ...next }
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** "OK": remember that the notice was seen (with its time and version) and close it. */
    acknowledge(now = new Date()) {
      const record: ConsentRecord = { version: CONSENT_VERSION, timestamp: now.toISOString(), method: 'notice' }
      try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
      } catch {
        // Storage unavailable: the notice is closed for this visit.
      }
      set({ record, open: false })
    },
  }
}

export const consentStore = createConsentStore()

export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot, consentStore.getSnapshot)
}
