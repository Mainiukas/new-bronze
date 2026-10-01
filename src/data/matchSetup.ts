/**
 * The new-match setup as the lobby edits it: 2–4 seats, each human or
 * computer, with a name, a colour of its own and an AI level. Saved between
 * visits, and shared by the setup panel and the profile chip (seat 1 is you).
 */

import { MAX_PLAYERS, MIN_PLAYERS } from '../game/engine'
import { AI_NAMES } from '../game/rules'
import { OFFERED_AI_LEVELS, PLAYER_COLORS, type AILevel, type PlayerColor, type SeatSetup } from '../game/types'
import { getMap, type MapId } from './maps'

/** One seat as edited in the lobby (all four are kept, so switching the count back restores them). */
export interface SeatDraft {
  isAI: boolean
  name: string
  aiLevel: AILevel
  color: PlayerColor
}

export interface SavedSetup {
  /** Seats in play (the first `count` of `seats`). */
  count: number
  seats: SeatDraft[]
}

export const MAX_NAME = 18

/** A computer's name for a seat: seat 2 is the first name, and seat 1 (usually you) the last. */
const computerName = (index: number) => AI_NAMES[(index + AI_NAMES.length - 1) % AI_NAMES.length]

const DEFAULT_SEATS: SeatDraft[] = [
  { isAI: false, name: 'You', aiLevel: 'normal', color: PLAYER_COLORS[0] },
  { isAI: true, name: computerName(1), aiLevel: 'normal', color: PLAYER_COLORS[1] },
  { isAI: true, name: computerName(2), aiLevel: 'normal', color: PLAYER_COLORS[2] },
  { isAI: true, name: computerName(3), aiLevel: 'normal', color: PLAYER_COLORS[3] },
]

export const DEFAULT_SETUP: SavedSetup = { count: 3, seats: DEFAULT_SEATS }

/** Validate the seats saved from last time. */
export function parseSavedSetup(raw: unknown): SavedSetup | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const saved = raw as Partial<SavedSetup>
  if (!Array.isArray(saved.seats) || saved.seats.length !== MAX_PLAYERS || typeof saved.count !== 'number') return undefined
  const seats = saved.seats.map((seat, i): SeatDraft => {
    const s = (typeof seat === 'object' && seat !== null ? seat : {}) as Partial<SeatDraft>
    return {
      isAI: typeof s.isAI === 'boolean' ? s.isAI : DEFAULT_SEATS[i].isAI,
      name: typeof s.name === 'string' ? s.name.slice(0, MAX_NAME) : DEFAULT_SEATS[i].name,
      aiLevel: OFFERED_AI_LEVELS.includes(s.aiLevel as AILevel) ? (s.aiLevel as AILevel) : 'normal',
      color: PLAYER_COLORS.includes(s.color as PlayerColor) ? (s.color as PlayerColor) : DEFAULT_SEATS[i].color,
    }
  })
  if (new Set(seats.map((s) => s.color)).size !== seats.length) return undefined
  return { count: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, saved.count)), seats }
}

/** Seats in play: the saved count, kept inside what the map allows. */
export function seatCount(setup: SavedSetup, mapId: MapId): number {
  const { players } = getMap(mapId)
  return Math.min(Math.min(MAX_PLAYERS, players.max), Math.max(Math.max(MIN_PLAYERS, players.min), setup.count))
}

/** The name an empty seat plays under. */
export const placeholderName = (index: number, isAI: boolean) => (isAI ? computerName(index) : `Player ${index + 1}`)

/**
 * Switch a seat between human and computer. A default name follows the
 * switch ("You" becomes a computer's name and back); a typed name is kept.
 */
export function withController(seat: SeatDraft, index: number, isAI: boolean): SeatDraft {
  if (seat.isAI === isAI) return seat
  const name = seat.name.trim()
  const isDefault = name === '' || name === 'You' || name === `Player ${index + 1}` || (AI_NAMES as readonly string[]).includes(name)
  if (!isDefault) return { ...seat, isAI }
  return { ...seat, isAI, name: isAI ? computerName(index) : index === 0 ? 'You' : `Player ${index + 1}` }
}

/** Give a seat a colour. A seat that already has it takes this seat's old colour, so colours never repeat. */
export function withColor(seats: SeatDraft[], index: number, color: PlayerColor): SeatDraft[] {
  const next = seats.map((seat, i) => (i === index ? { ...seat, color } : seat))
  const other = seats.findIndex((seat, i) => i !== index && seat.color === color)
  if (other >= 0) next[other] = { ...next[other], color: seats[index].color }
  return next
}

/**
 * Who you play against, read from the seats in play: `computer` when you
 * (seat 1) are human and everyone else is a computer, `pass` when every seat
 * is human (pass & play on this device), and `mixed` otherwise.
 */
export type Opponents = 'computer' | 'pass' | 'mixed'

export function opponentsOf(seats: SeatDraft[], count: number): Opponents {
  const active = seats.slice(0, count)
  if (active.every((seat) => !seat.isAI)) return 'pass'
  if (!active[0].isAI && active.slice(1).every((seat) => seat.isAI)) return 'computer'
  return 'mixed'
}

/** Set every seat in play for `vs computer` (you against computers) or `pass` & play (all human). */
export function withOpponents(seats: SeatDraft[], count: number, opponents: Exclude<Opponents, 'mixed'>): SeatDraft[] {
  return seats.map((seat, i) => (i >= count ? seat : withController(seat, i, opponents === 'computer' && i > 0)))
}

/** The seats a new match starts with. Empty names get their placeholder. */
export function toSeatSetups(seats: SeatDraft[], count: number): SeatSetup[] {
  return seats.slice(0, count).map((seat, i) => ({
    name: seat.name.trim() || placeholderName(i, seat.isAI),
    isAI: seat.isAI,
    ...(seat.isAI ? { aiLevel: seat.aiLevel } : {}),
    color: seat.color,
  }))
}
