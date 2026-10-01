import type { GameState } from '../../rules/state'

/** Why players with the same VP are ranked as they are: one line per tie that the rules had to break. */
export function tieBreaks(state: GameState): { winner: number; loser: number; by: 'income' | 'money' | 'order' }[] {
  const ranking = state.ranking ?? []
  const out: { winner: number; loser: number; by: 'income' | 'money' | 'order' }[] = []
  for (let i = 0; i + 1 < ranking.length; i++) {
    const a = state.players[ranking[i]]
    const b = state.players[ranking[i + 1]]
    if (a.vp !== b.vp) continue
    const by = a.incomeSpace !== b.incomeSpace ? 'income' : a.money !== b.money ? 'money' : 'order'
    out.push({ winner: ranking[i], loser: ranking[i + 1], by })
  }
  return out
}
