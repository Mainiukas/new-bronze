/** The game log: what happened, newest first (moves, market sales, distant-market sales, rounds and eras). */

import { useT } from '../../i18n'
import type { RulesContext } from '../../rules/engine'
import type { GameState, LogEntry } from '../../rules/state'
import { roman } from '../../rules/tileTable'

const SHOWN = 40

export function GameLog({ state, ctx }: { state: GameState; ctx: RulesContext }) {
  const t = useT()
  const b = t.brass
  const name = (p: number) => state.players[p]?.name ?? ''
  const town = (slot: string) => ctx.map.places[ctx.map.slots[slot]?.town]?.name ?? slot
  const line = (e: LogEntry): string | null => {
    switch (e.kind) {
      case 'build':
        return b.moves.build(name(e.player), `${b.industry[e.industry]} ${roman(e.level)}`, town(e.slot))
      case 'network':
        return b.moves.network(name(e.player), e.links.length)
      case 'develop':
        return b.moves.develop(name(e.player))
      case 'sell':
        return e.distant ? b.log.distantSale(name(e.player), e.distant.move, e.distant.income) : b.moves.sell(name(e.player))
      case 'sell-failed':
        return b.log.distantFailed(name(e.player), e.move)
      case 'market-sale':
        return b.log.marketSale(name(e.player), e.cubes, e.industry === 'coal' ? b.coal : b.iron, e.money)
      case 'loan':
        return b.moves.loan(name(e.player), e.amount)
      case 'pass':
        return b.moves.pass(name(e.player))
      case 'shortfall':
        return b.log.shortfall(name(e.player), e.tilesSold.length, e.vpLost)
      case 'round':
        return b.log.round(b.era[e.era], e.round, e.order.map(name).join(', '))
      case 'era-end':
        return b.log.eraEnd(b.era[e.era])
      default:
        return null
    }
  }
  const lines = state.log
    .map((e, i) => ({ i, text: line(e), round: e.kind === 'round' || e.kind === 'era-end' }))
    .filter((l): l is { i: number; text: string; round: boolean } => l.text !== null)
    .slice(-SHOWN)
    .reverse()
  return (
    <section aria-label={b.log.title} className="flex min-h-0 flex-col gap-1">
      <h2 className="font-display text-[0.65rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.log.title}</h2>
      <ol className="flex max-h-48 flex-col gap-0.5 overflow-y-auto pr-1 text-xs leading-snug" aria-live="polite" aria-relevant="additions">
        {lines.map((l) => (
          <li key={l.i} className={l.round ? 'mt-1 border-t border-bronze-500/30 pt-1 font-semibold text-brass-200' : 'text-parchment-200'}>
            {l.text}
          </li>
        ))}
      </ol>
    </section>
  )
}
