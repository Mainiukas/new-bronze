/**
 * The visitor's cookie choices: which optional categories they allow, when
 * they chose, and for which version of the Cookie Policy. Stored in this
 * browser only (bronze.consent). Nothing optional is written or loaded until
 * a category is allowed; withdrawing it deletes what it had stored.
 */

import { useSyncExternalStore } from 'react'
import { CONSENT_STORAGE_KEY, categoryOf, type StorageCategory } from './inventory'

export type OptionalCategory = Exclude<StorageCategory, 'essential'>
export const OPTIONAL_CATEGORIES: readonly OptionalCategory[] = ['preferences', 'analytics', 'marketing']

/**
 * Bump when the Cookie Policy changes what's stored or adds a tool (e.g. analytics):
 * everyone is asked again, because their earlier choice didn't cover it.
 */
export const CONSENT_VERSION = 1
/** Choices are asked for again after 12 months. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export type ConsentMethod = 'accept-all' | 'reject-all' | 'custom'

export interface ConsentRecord {
  version: number
  /** When the choice was made (ISO 8601). */
  timestamp: string
  method: ConsentMethod
  choices: Record<OptionalCategory, boolean>
}

export const NONE: Record<OptionalCategory, boolean> = { preferences: false, analytics: false, marketing: false }
export const ALL: Record<OptionalCategory, boolean> = { preferences: true, analytics: true, marketing: true }

/** A stored record, if it's valid, current and not expired. */
export function parseConsent(raw: unknown, now = Date.now()): ConsentRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Partial<ConsentRecord>
  if (r.version !== CONSENT_VERSION || typeof r.timestamp !== 'string') return null
  const at = Date.parse(r.timestamp)
  if (!Number.isFinite(at) || now - at > CONSENT_MAX_AGE_MS || at - now > 60_000) return null
  if (r.method !== 'accept-all' && r.method !== 'reject-all' && r.method !== 'custom') return null
  if (typeof r.choices !== 'object' || r.choices === null) return null
  const choices = { ...NONE }
  for (const c of OPTIONAL_CATEGORIES) choices[c] = (r.choices as Record<string, unknown>)[c] === true
  return { version: CONSENT_VERSION, timestamp: r.timestamp, method: r.method, choices }
}

function readRecord(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    return raw ? parseConsent(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

/** Delete what's stored in categories no longer allowed. */
function purge(allowed: (category: StorageCategory) => boolean) {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).filter((k): k is string => !!k)
    for (const key of keys) if (key.startsWith('bronze') && !allowed(categoryOf(key))) window.localStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing stored to remove.
  }
}

export interface ConsentSnapshot {
  record: ConsentRecord | null
  /** The banner is showing: no choice yet (or an old one), or reopened from "Cookie settings". */
  open: boolean
  /** Reopened on purpose (focus moves to it). */
  reopened: number
}

export function createConsentStore() {
  const initial = typeof window === 'undefined' ? null : readRecord()
  let snapshot: ConsentSnapshot = { record: initial, open: initial === null, reopened: 0 }
  const listeners = new Set<() => void>()
  const set = (next: Partial<ConsentSnapshot>) => {
    snapshot = { ...snapshot, ...next }
    for (const listener of listeners) listener()
  }
  const allows = (category: StorageCategory) => category === 'essential' || snapshot.record?.choices[category] === true

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** May this category store anything (or load anything) right now? */
    allows,
    /** Record a choice (with its time and version) and close the banner. */
    save(choices: Record<OptionalCategory, boolean>, method: ConsentMethod, now = new Date()) {
      const record: ConsentRecord = { version: CONSENT_VERSION, timestamp: now.toISOString(), method, choices: { ...choices } }
      try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
      } catch {
        // Storage unavailable: the choice holds for this visit.
      }
      set({ record, open: false })
      purge(allows)
    },
    /** "Cookie settings": show the banner again, with the current choices. */
    reopen() {
      set({ open: true, reopened: snapshot.reopened + 1 })
    },
    /** Close a reopened banner without changing anything (only when a choice already exists). */
    dismiss() {
      if (snapshot.record) set({ open: false })
    },
  }
}

export const consentStore = createConsentStore()

export function useConsent(): ConsentSnapshot {
  return useSyncExternalStore(consentStore.subscribe, consentStore.getSnapshot, consentStore.getSnapshot)
}
