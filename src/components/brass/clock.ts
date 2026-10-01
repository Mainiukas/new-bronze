/* Chess clocks for online games: shown under each player's turn-order circle. */

/** An online player's chess clock: time left (ms), whether it's counting down now, and timeouts so far. */
export interface SeatClock {
  ms: number
  running: boolean
  timeouts: number
}

/** m:ss (h:mm:ss from an hour). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Under a minute left: the clock turns red. */
export const LOW_CLOCK_MS = 60_000
