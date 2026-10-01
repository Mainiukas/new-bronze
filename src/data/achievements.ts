/**
 * Achievements and lifetime stats for the local player (seat 0, "You").
 * Stats are saved in localStorage; recordMatch folds in a finished match
 * and reports which achievements it unlocked.
 */

import { MAPS } from './maps'

export interface PlayerStats {
  matches: number
  wins: number
  bestScore: number
  goodsShipped: number
  /** Map ids with at least one finished match. */
  mapsPlayed: string[]
  /** Achievement id → ISO date it was unlocked. */
  unlocked: Record<string, string>
}

export const EMPTY_STATS: PlayerStats = {
  matches: 0,
  wins: 0,
  bestScore: 0,
  goodsShipped: 0,
  mapsPlayed: [],
  unlocked: {},
}

/** "3 wins · 7 matches" */
export function formatRecord({ wins, matches }: Pick<PlayerStats, 'wins' | 'matches'>): string {
  return `${wins} ${wins === 1 ? 'win' : 'wins'} · ${matches} ${matches === 1 ? 'match' : 'matches'}`
}

/** What the local player did in one finished match. */
export interface MatchSummary {
  won: boolean
  score: number
  modeId: string
  players: number
  goodsShipped: number
  links: number
  shipyards: number
  /** 1 for the winner. */
  placement: number
  /** Buildings they own at the end. */
  industries: number
}

export type AchievementId =
  | 'first-shift'
  | 'foreman'
  | 'quick-draw'
  | 'full-house'
  | 'merchant-fleet'
  | 'iron-web'
  | 'engine-room'
  | 'tycoon'
  | 'grand-tour'
  | 'veteran'

export interface Achievement {
  id: AchievementId
  /** English name and description (every language is in t.achievements.list, src/i18n). */
  name: string
  description: string
  /** Unlocked by this match, given stats that already include it? */
  earned: (match: MatchSummary, stats: PlayerStats) => boolean
  /** Progress toward a cumulative goal, for the progress bar. */
  progress?: (stats: PlayerStats) => { value: number; target: number }
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-shift', name: 'First Shift', description: 'Finish a match.', earned: () => true },
  { id: 'foreman', name: 'Foreman', description: 'Win a match.', earned: (m) => m.won },
  { id: 'quick-draw', name: 'Quick Draw', description: 'Win a Bullet match.', earned: (m) => m.won && m.modeId === 'bullet' },
  { id: 'full-house', name: 'Full House', description: 'Win a four-player match.', earned: (m) => m.won && m.players >= 4 },
  { id: 'merchant-fleet', name: 'Merchant Fleet', description: 'Ship 12 goods in one match.', earned: (m) => m.goodsShipped >= 12 },
  { id: 'iron-web', name: 'Iron Web', description: 'Own 6 links in one match.', earned: (m) => m.links >= 6 },
  { id: 'engine-room', name: 'Shipwright', description: 'Build 2 Shipyards in one match.', earned: (m) => m.shipyards >= 2 },
  { id: 'tycoon', name: 'Tycoon', description: 'Score 55 or more in a match.', earned: (m) => m.score >= 55 },
  {
    id: 'grand-tour',
    name: 'Grand Tour',
    description: 'Finish a match on every map.',
    earned: (_, s) => MAPS.every((map) => s.mapsPlayed.includes(map.id)),
    progress: (s) => ({ value: MAPS.filter((map) => s.mapsPlayed.includes(map.id)).length, target: MAPS.length }),
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Finish 10 matches.',
    earned: (_, s) => s.matches >= 10,
    progress: (s) => ({ value: Math.min(s.matches, 10), target: 10 }),
  },
]

/**
 * Fold a finished match into the stats. Returns the new stats, what was
 * unlocked, and the match as the local player saw it (null if they had no
 * part in it, e.g. the match didn't finish).
 */
export function recordMatch(stats: PlayerStats, match: MatchSummary | null, mapId: string): { stats: PlayerStats; unlocked: Achievement[]; match: MatchSummary | null } {
  if (!match) return { stats, unlocked: [], match: null }
  const next: PlayerStats = {
    matches: stats.matches + 1,
    wins: stats.wins + (match.won ? 1 : 0),
    bestScore: Math.max(stats.bestScore, match.score),
    goodsShipped: stats.goodsShipped + match.goodsShipped,
    mapsPlayed: stats.mapsPlayed.includes(mapId) ? stats.mapsPlayed : [...stats.mapsPlayed, mapId],
    unlocked: { ...stats.unlocked },
  }
  const unlocked = ACHIEVEMENTS.filter((a) => !next.unlocked[a.id] && a.earned(match, next))
  const today = new Date().toISOString()
  for (const achievement of unlocked) next.unlocked[achievement.id] = today
  return { stats: next, unlocked, match }
}

/** Anything worth keeping: a finished match or an unlocked achievement. */
export const hasProgress = (stats: PlayerStats) => stats.matches > 0 || Object.keys(stats.unlocked).length > 0

/** Earliest unlock date of each achievement in either record. */
function unionUnlocked(a: PlayerStats['unlocked'], b: PlayerStats['unlocked']): PlayerStats['unlocked'] {
  const unlocked = { ...a }
  for (const [id, date] of Object.entries(b)) if (!unlocked[id] || date < unlocked[id]) unlocked[id] = date
  return unlocked
}

/**
 * Two separate records played apart (this device's guest play and an
 * account): counts add up, the best score is the higher one, maps and
 * achievements combine. Used to move guest progress into an account.
 */
export function mergeStats(a: PlayerStats, b: PlayerStats): PlayerStats {
  return {
    matches: a.matches + b.matches,
    wins: a.wins + b.wins,
    bestScore: Math.max(a.bestScore, b.bestScore),
    goodsShipped: a.goodsShipped + b.goodsShipped,
    mapsPlayed: [...new Set([...a.mapsPlayed, ...b.mapsPlayed])],
    unlocked: unionUnlocked(a.unlocked, b.unlocked),
  }
}

/**
 * Two copies of the same record, one maybe newer (the account on the server
 * and an unsaved copy on this device): the larger of each. Nothing played is
 * counted twice.
 */
export function latestStats(a: PlayerStats, b: PlayerStats): PlayerStats {
  return {
    matches: Math.max(a.matches, b.matches),
    wins: Math.max(a.wins, b.wins),
    bestScore: Math.max(a.bestScore, b.bestScore),
    goodsShipped: Math.max(a.goodsShipped, b.goodsShipped),
    mapsPlayed: [...new Set([...a.mapsPlayed, ...b.mapsPlayed])],
    unlocked: unionUnlocked(a.unlocked, b.unlocked),
  }
}

/** Validate saved stats, filling in anything missing. */
export function parseStats(raw: unknown): PlayerStats | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const saved = raw as Partial<PlayerStats>
  const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0)
  return {
    matches: count(saved.matches),
    wins: count(saved.wins),
    bestScore: count(saved.bestScore),
    goodsShipped: count(saved.goodsShipped),
    mapsPlayed: Array.isArray(saved.mapsPlayed) ? saved.mapsPlayed.filter((id) => typeof id === 'string') : [],
    unlocked:
      typeof saved.unlocked === 'object' && saved.unlocked !== null ? { ...(saved.unlocked as Record<string, string>) } : {},
  }
}
