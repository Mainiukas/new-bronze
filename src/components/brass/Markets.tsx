/**
 * The coal and iron markets, one row each, above the board. Each price step
 * shows a coin with its price, one square per space (a cube when filled, an
 * empty outlined square when not) and how many cubes are left at that price.
 * The last step is the price when the market is empty: always available (∞).
 * The next cube to be bought (the cheapest there is) is outlined.
 */

import { useT } from '../../i18n'
import { marketBuyPrice, type RulesContext } from '../../rules/engine'
import type { GameState } from '../../rules/state'
import { Coin, Cube } from './Symbols'

interface Step {
  price: number
  spaces: number[]
}

/** Consecutive spaces with the same price form a step. */
function steps(spaces: readonly number[]): Step[] {
  const out: Step[] = []
  spaces.forEach((price, i) => {
    const last = out.at(-1)
    if (last && last.price === price) last.spaces.push(i)
    else out.push({ price, spaces: [i] })
  })
  return out
}

function PriceCoin({ price }: { price: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-display text-xs font-bold text-parchment-50 tabular-nums">
      <Coin className="size-3.5" />£{price}
    </span>
  )
}

function MarketRow({ kind, state, ctx }: { kind: 'coal' | 'iron'; state: GameState; ctx: RulesContext }) {
  const t = useT()
  const b = t.brass
  const market = ctx.data.markets[kind]
  const cubes = state.market[kind]
  const total = market.spaces.length
  const firstFilled = total - cubes
  const label = kind === 'coal' ? b.coalMarket : b.ironMarket
  return (
    <div id={`market-${kind}`} role="group" aria-label={b.marketLabel(label, cubes, marketBuyPrice(ctx, kind, cubes))} className="flex min-w-0 items-center gap-1.5">
      <span className="flex w-14 shrink-0 items-center gap-1 font-display text-[0.65rem] font-bold tracking-[0.1em] text-parchment-300 uppercase" aria-hidden="true">
        <Cube kind={kind} className="size-3.5" />
        {kind === 'coal' ? b.coal : b.iron}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1" aria-hidden="true">
        {steps(market.spaces).map((step, s) => {
          const left = step.spaces.filter((i) => i >= firstFilled).length
          return (
            <span key={s} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-px ${left ? 'border-bronze-400/50 bg-soot-900/80' : 'border-bronze-500/25 bg-soot-950/60'}`}>
              <PriceCoin price={step.price} />
              {step.spaces.map((i) =>
                i >= firstFilled ? (
                  <span key={i} data-market-space={`${kind}-${i}`} className={`grid size-4 place-items-center rounded-[3px] ${i === firstFilled ? 'outline-2 outline-offset-1 outline-brass-200/80' : ''}`}>
                    <Cube kind={kind} className="size-4" />
                  </span>
                ) : (
                  <span key={i} data-market-space={`${kind}-${i}`} className="size-4 rounded-[3px] border-[1.5px] border-parchment-300/55" />
                ),
              )}
              <span className="text-[0.62rem] font-semibold text-parchment-300 tabular-nums">×{left}</span>
            </span>
          )
        })}
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-px ${cubes === 0 ? 'border-brass-300/60 bg-soot-900/80' : 'border-bronze-500/25 bg-soot-950/60'}`} title={b.marketEmptyPrice(market.empty)}>
          <PriceCoin price={market.empty} />
          <span className="font-display text-sm leading-none font-bold text-parchment-200">∞</span>
        </span>
      </span>
    </div>
  )
}

export function MarketStrip({ state, ctx }: { state: GameState; ctx: RulesContext }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-bronze-500/35 bg-soot-950/80 px-2 py-1">
      <MarketRow kind="coal" state={state} ctx={ctx} />
      <MarketRow kind="iron" state={state} ctx={ctx} />
    </div>
  )
}
