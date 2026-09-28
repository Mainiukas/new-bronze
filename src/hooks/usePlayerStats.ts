import { useCallback, useEffect, useEffectEvent } from 'react'
import type { GuestMerge, MatchResult } from '../auth/backend'
import { EMPTY_STATS, hasProgress, mergeStats, parseStats, recordMatch, type Achievement, type PlayerStats } from '../data/achievements'
import type { GameState } from '../game/types'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '../lib/storage'
import { useAuth } from './useAuth'
import { usePersistentState } from './usePersistentState'
import { useT } from '../i18n'
import { useToast } from './useToast'

/** A result for an account that the server hasn't confirmed yet. */
export type PendingResult = { kind: 'match'; result: MatchResult } | { kind: 'merge'; merge: GuestMerge }

/** An account's unconfirmed results, kept on this device until the server confirms each one. */
const pendingKey = (profileId: string) => `${STORAGE_KEYS.stats}.pending.${profileId}`

const idOf = (pending: PendingResult) => (pending.kind === 'match' ? pending.result.id : pending.merge.id)

const isPending = (value: unknown): value is PendingResult => {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<{ kind: string; result: Partial<MatchResult>; merge: Partial<GuestMerge> }>
  if (item.kind === 'match') return typeof item.result?.id === 'string' && typeof item.result.score === 'number'
  if (item.kind === 'merge') return typeof item.merge?.id === 'string' && parseStats(item.merge.stats) !== undefined
  return false
}

/** A random id for a result (the server counts each id once). */
export function newResultId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** The queue in memory too, so it works when storage doesn't. */
const queues = new Map<string, PendingResult[]>()
/** What to show at once for a result sent from this page (its stats with the result added). */
const shownFor = new Map<string, PlayerStats>()
const flushing = new Set<string>()

function readQueue(profileId: string): PendingResult[] {
  if (!queues.has(profileId)) {
    const saved = readStorage(pendingKey(profileId))
    // Anything else (an older format) predates results being counted by the server: drop it.
    queues.set(profileId, Array.isArray(saved) ? saved.filter(isPending) : [])
  }
  return queues.get(profileId)!
}

function writeQueue(profileId: string, queue: PendingResult[]) {
  queues.set(profileId, queue)
  if (queue.length) writeStorage(pendingKey(profileId), queue)
  else removeStorage(pendingKey(profileId))
}

/**
 * The record the lobby shows and matches add to: the account's when signed
 * in (its wins, matches and best score are only ever changed by the server),
 * this device's as a guest. On signing in, this device's guest progress
 * moves into the account, once. Each result has an id and waits on this
 * device until the server confirms it, so a lost connection loses nothing
 * and a retry never counts twice.
 */
export function usePlayerStats() {
  const t = useT()
  const auth = useAuth()
  const notify = useToast()
  const [localStats, setLocalStats] = usePersistentState(STORAGE_KEYS.stats, EMPTY_STATS, parseStats)
  const profile = auth.signedIn ? auth.profile : null
  const { recordMatchResult, mergeGuestStats } = auth

  /** Send this account's waiting results, oldest first. Stops at the first failure (they're retried later). */
  const flush = useCallback(
    async (profileId: string) => {
      if (flushing.has(profileId)) return
      flushing.add(profileId)
      try {
        for (let next = readQueue(profileId)[0]; next; next = readQueue(profileId)[0]) {
          const id = idOf(next)
          if (next.kind === 'match') await recordMatchResult(next.result, shownFor.get(id))
          else await mergeGuestStats(next.merge, shownFor.get(id))
          shownFor.delete(id)
          writeQueue(
            profileId,
            readQueue(profileId).filter((item) => idOf(item) !== id),
          )
        }
      } catch {
        notify(t.stats.saveFailed)
      } finally {
        flushing.delete(profileId)
      }
    },
    [recordMatchResult, mergeGuestStats, notify, t],
  )

  const enqueue = useCallback(
    (profileId: string, pending: PendingResult, shown: PlayerStats) => {
      shownFor.set(idOf(pending), shown)
      writeQueue(profileId, [...readQueue(profileId), pending])
      void flush(profileId)
    },
    [flush],
  )

  // A player signed in: move this device's guest progress in (once), and send anything still waiting.
  const onSignedIn = useEffectEvent(() => {
    if (!profile) return
    const guest = parseStats(readStorage(STORAGE_KEYS.stats))
    if (guest && hasProgress(guest)) {
      // Queued (with its id) before the guest copy is cleared, so it's never lost or sent twice.
      enqueue(profile.id, { kind: 'merge', merge: { id: newResultId(), stats: guest } }, mergeStats(profile.stats, guest))
      removeStorage(STORAGE_KEYS.stats)
      setLocalStats(EMPTY_STATS)
      notify(t.stats.guestMoved)
    } else {
      void flush(profile.id)
    }
  })
  const profileId = profile?.id
  useEffect(() => {
    if (profileId) onSignedIn()
  }, [profileId])

  // Back online: try again.
  useEffect(() => {
    if (!profileId) return
    const retry = () => void flush(profileId)
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [profileId, flush])

  /** Fold a finished match into the current record. Returns the achievements it unlocked. */
  const record = useCallback(
    (finished: GameState): Achievement[] => {
      const result = recordMatch(profile ? profile.stats : localStats, finished)
      if (!result.match) return []
      if (profile) {
        const { score, won, goodsShipped, placement, links, industries, players, modeId } = result.match
        const matchResult: MatchResult = {
          id: newResultId(),
          score,
          won,
          goodsShipped,
          mapId: finished.mapId,
          achievements: result.unlocked.map((achievement) => achievement.id),
          modeId,
          players,
          placement,
          links,
          industries,
        }
        enqueue(profile.id, { kind: 'match', result: matchResult }, result.stats)
      } else {
        setLocalStats(result.stats)
      }
      return result.unlocked
    },
    [profile, localStats, enqueue, setLocalStats],
  )

  return { stats: profile ? profile.stats : localStats, record }
}
