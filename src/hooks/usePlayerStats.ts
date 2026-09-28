import { useCallback, useEffect, useEffectEvent } from 'react'
import { EMPTY_STATS, hasProgress, latestStats, mergeStats, parseStats, recordMatch, type Achievement, type PlayerStats } from '../data/achievements'
import type { GameState } from '../game/types'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '../lib/storage'
import { useAuth } from './useAuth'
import { usePersistentState } from './usePersistentState'
import { useT } from '../i18n'
import { useToast } from './useToast'

/** An account's stats not yet confirmed saved by the server. */
const pendingKey = (profileId: string) => `${STORAGE_KEYS.stats}.pending.${profileId}`

const readStats = (key: string) => {
  const raw = readStorage(key)
  return raw === undefined ? undefined : parseStats(raw)
}

/**
 * The record the lobby shows and matches add to: the account's (held by the
 * auth store) when signed in, this device's as a guest. On signing in, this
 * device's guest progress moves into the account (added up, once). Nothing
 * is dropped on the way: a copy stays on the device until the server
 * confirms each save, and is folded back in at the next sign-in if it didn't.
 */
export function usePlayerStats() {
  const t = useT()
  const auth = useAuth()
  const notify = useToast()
  const [localStats, setLocalStats] = usePersistentState(STORAGE_KEYS.stats, EMPTY_STATS, parseStats)
  const profile = auth.signedIn ? auth.profile : null
  const { saveStats } = auth

  const save = useCallback(
    (profileId: string, stats: PlayerStats) => {
      writeStorage(pendingKey(profileId), stats)
      saveStats(stats).then(
        () => removeStorage(pendingKey(profileId)),
        () => notify(t.stats.saveFailed),
      )
    },
    [saveStats, notify, t],
  )

  // A player signed in: fold in last time's unsaved copy, and move this device's guest progress in.
  const onSignedIn = useEffectEvent(() => {
    if (!profile) return
    let stats = profile.stats
    const pending = readStats(pendingKey(profile.id))
    if (pending) stats = latestStats(stats, pending)
    const guest = readStats(STORAGE_KEYS.stats)
    const moveGuest = !!guest && hasProgress(guest)
    if (moveGuest) {
      stats = mergeStats(stats, guest)
      // Keep the combined copy before clearing the guest one, so it's never lost.
      writeStorage(pendingKey(profile.id), stats)
      removeStorage(STORAGE_KEYS.stats)
      setLocalStats(EMPTY_STATS)
      notify(t.stats.guestMoved)
    }
    if (pending || moveGuest) save(profile.id, stats)
  })
  const profileId = profile?.id
  useEffect(() => {
    if (profileId) onSignedIn()
  }, [profileId])

  /** Fold a finished match into the current record. Returns the achievements it unlocked. */
  const record = useCallback(
    (finished: GameState): Achievement[] => {
      const result = recordMatch(profile ? profile.stats : localStats, finished)
      if (profile) save(profile.id, result.stats)
      else setLocalStats(result.stats)
      return result.unlocked
    },
    [profile, localStats, save, setLocalStats],
  )

  return { stats: profile ? profile.stats : localStats, record }
}
