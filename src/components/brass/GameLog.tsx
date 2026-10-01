/**
 * The game log, in plain English: what happened, newest first, grouped by
 * round under a heading ("Canal era · round 3"), with each era's scoring as
 * its own group. Moves, market sales, distant-market sales, flips, income.
 */

import { useT } from '../../i18n'
import type { RulesContext } from '../../rules/engine'
import type { GameState, LogEntry } from '../../rules/state'
import { roman } from '../../rules/tileTable'

/** Groups shown (the latest rounds). */
const SHOWN_GROUPS = 16

interface Group {
  key: number
  title: string
  scoring: boolean
  lines: { key: number; text: string }[]
}

export function GameLog({ state, ctx }: { state: GameState; ctx: RulesContext }) {
  const t = useT()
  const b = t.brass
  const name = (p: number) => state.players[p]?.name ?? ''
  const place = (id: string) => ctx.map.places[id]?.name ?? id
  const town = (slot: string) => place(ctx.map.slots[slot]?.town)
  const route = (id: string) => {
    const l = ctx.map.links[id]
    return l ? `${place(l.from)} – ${place(l.to)}` : id
  }
  const line = (e: LogEntry): string | null => {
    switch (e.kind) {
      case 'build':
        return b.moves.build(name(e.player), `${b.industry[e.industry]} ${roman(e.level)}`, town(e.slot))
      case 'network':
        return b.log.links(name(e.player), state.era, e.links.map(route).join(b.log.and))
      case 'develop':
        return b.log.developed(name(e.player), e.industries.map((i) => b.industry[i]).join(b.log.and))
      case 'sell':
        return e.distant ? b.log.distantSale(name(e.player), e.distant.move, e.distant.income) : b.moves.sell(name(e.player))
      case 'sell-failed':
        return b.log.distantFailed(name(e.player), e.move)
      case 'market-sale':
        return b.log.marketSale(name(e.player), e.cubes, e.industry === 'coal' ? b.coal : b.iron, e.money)
      case 'flip': {
        const tile = state.tiles[e.slot]
        return tile ? b.log.flip(name(e.player), b.industry[tile.industry], town(e.slot), e.income) : null
      }
      case 'loan':
        return b.moves.loan(name(e.player), e.amount)
      case 'pass':
        return b.moves.pass(name(e.player))
      case 'income':
        return b.log.income(name(e.player), e.amount)
      case 'shortfall':
        return b.log.shortfall(name(e.player), e.tilesSold.length, e.vpLost)
      default:
        return null
    }
  }

  // Walk the log once, opening a group at every round and every era's scoring.
  const groups: Group[] = []
  state.log.forEach((e, i) => {
    if (e.kind === 'round') {
      groups.push({ key: i, title: b.log.roundHeader(b.era[e.era], e.round), scoring: false, lines: [] })
      return
    }
    if (e.kind === 'era-end') {
      groups.push({
        key: i,
        title: b.log.scoringHeader(b.era[e.era]),
        scoring: true,
        lines: e.scores.map((s) => ({ key: i * 10 + s.player, text: b.log.eraScore(name(s.player), s.links, s.tiles) })),
      })
      return
    }
    if (e.kind === 'game-end') {
      groups.at(-1)?.lines.push({ key: i, text: b.log.winner(name(e.ranking[0])) })
      return
    }
    const text = line(e)
    if (text && groups.length) groups[groups.length - 1].lines.push({ key: i, text })
  })
  const shown = groups.slice(-SHOWN_GROUPS).reverse()

  return (
    <section aria-label={b.log.title} className="flex min-h-0 flex-col gap-1">
      <h2 className="font-display text-[0.65rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.log.title}</h2>
      <div className="flex max-h-56 flex-col overflow-y-auto pr-1 text-xs leading-snug" data-testid="game-log">
        {shown.map((g) => (
          <section key={g.key} aria-label={g.title}>
            <h3
              className={`sticky top-0 z-10 mt-1 flex items-center gap-2 bg-soot-950/95 py-0.5 font-display text-[0.65rem] font-bold tracking-[0.1em] uppercase ${g.scoring ? 'text-brass-200' : 'text-bronze-200'}`}
            >
              <span aria-hidden="true" className="h-px flex-1 bg-bronze-500/40" />
              {g.title}
              <span aria-hidden="true" className="h-px flex-1 bg-bronze-500/40" />
            </h3>
            <ol className="flex flex-col gap-0.5">
              {[...g.lines].reverse().map((l) => (
                <li key={l.key} className={g.scoring ? 'font-semibold text-brass-100' : 'text-parchment-200'}>
                  {l.text}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  )
}
