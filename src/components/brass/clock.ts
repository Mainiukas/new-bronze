/* Chess clocks for online games: shown under each player's turn-order circle, as a draining ring around the
   player to move, and beside "Your turn". The game server keeps them; the browser only counts down between
   its updates. */

import { CLOCK_CRITICAL_MS, CLOCK_LOW_MS } from '../../rules/config/game'

/** An online player's chess clock: time left (ms), the clock's full time (for the ring), whether it's counting down now. */
export interface SeatClock {
  ms: number
  /** The whole game's clock (the ring is full at this). */
  total: number
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

/** Under 2:00 the clock is amber, under 0:30 red (and pulses). */
export function clockLevel(ms: number): 'normal' | 'low' | 'critical' {
  if (ms < CLOCK_CRITICAL_MS) return 'critical'
  if (ms < CLOCK_LOW_MS) return 'low'
  return 'normal'
}

/** How full the ring is: the time left as a share of the whole clock (increments can't overfill it). */
export const ringShare = (clock: SeatClock) => Math.max(0, Math.min(1, clock.ms / clock.total))

/** Time left now, from the server's figure: it runs only during the player's own turn (and not before it starts). */
export const clockNow = (clockMs: number, running: boolean, startedAt: number, now: number) => (running ? clockMs - Math.max(0, now - startedAt) : clockMs)
