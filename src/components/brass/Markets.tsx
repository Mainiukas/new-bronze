/**
 * The coal and iron markets, one block each, beside the board, laid out as on
 * the board: the most expensive price on the left down to the cheapest on the
 * right (£5 ∞, £4, £3, £2, £1). The first step is the price when the market
 * is empty: always available (∞). Each price is a column: its price on top
 * (bold), then its spaces stacked, a cube when filled and an empty outlined
 * square when not.
 *
 * Only the order on screen is reversed; the rules are the same: buying takes
 * the cheapest cube (the rightmost filled space, outlined), and cubes sold to
 * the market fill the most expensive empty space (the leftmost empty one).
 */

import { useT } from '../../i18n'
import { marketBuyPrice, type RulesContext } from '../../rules/engine'
import type { GameState } from '../../rules/state'
import { Coin, Cube } from './Symbols'

interface Step {
  price: number
  spaces: number[]
}

/** Consecutive spaces with the same price form a step (cheapest first, as in the data). */
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
    <span className="inline-flex items-center gap-0.5 font-display text-base leading-none font-extrabold text-parchment-50 tabular-nums">
      <Coin className="size-4" />£{price}
    </span>
  )
}

/** Spaces per price column (the tallest step), so every column lines up. */
const rowsOf = (spaces: readonly number[]) => Math.max(...steps(spaces).map((s) => s.spaces.length))

function MarketRow({ kind, state, ctx }: { kind: 'coal' | 'iron'; state: GameState; ctx: RulesContext }) {
  const t = useT()
  const b = t.brass
  const market = ctx.data.markets[kind]
  const cubes = state.market[kind]
  const total = market.spaces.length
  const firstFilled = total - cubes
  const label = kind === 'coal' ? b.coalMarket : b.ironMarket
  const rows = rowsOf(market.spaces)
  // A cell is 26 px of cube plus its border: the columns are as wide as their price.
  const column = 'flex min-w-[2.4rem] flex-col items-center gap-1 rounded-md border px-1 py-1'
  return (
    <div id={`market-${kind}`} role="group" aria-label={b.marketLabel(label, cubes, marketBuyPrice(ctx, kind, cubes))} className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 font-display text-sm font-extrabold tracking-[0.12em] text-parchment-100 uppercase" aria-hidden="true">
        <Cube kind={kind} className="size-6" />
        {kind === 'coal' ? b.coal : b.iron}
      </span>
      <span className="flex items-stretch gap-1" aria-hidden="true">
        <span className={`${column} ${cubes === 0 ? 'border-brass-300/70 bg-soot-900/80' : 'border-bronze-500/30 bg-soot-950/60'}`} title={b.marketEmptyPrice(market.empty)}>
          <PriceCoin price={market.empty} />
          <span className="grid flex-1 place-items-center font-display text-2xl leading-none font-bold text-parchment-200">∞</span>
        </span>
        {/* Most expensive step first, and each step's spaces from its dearest (top) to its cheapest. */}
        {steps(market.spaces).reverse().map((step) => {
          const left = step.spaces.filter((i) => i >= firstFilled).length
          return (
            <span key={step.price} className={`${column} ${left ? 'border-bronze-400/60 bg-soot-900/80' : 'border-bronze-500/30 bg-soot-950/60'}`}>
              <PriceCoin price={step.price} />
              <span className="grid gap-1" style={{ gridTemplateRows: `repeat(${rows}, 1.625rem)` }}>
                {step.spaces.toReversed().map((i) =>
                  i >= firstFilled ? (
                    <span key={i} data-market-space={`${kind}-${i}`} className={`grid size-[1.625rem] place-items-center rounded-[4px] ${i === firstFilled ? 'outline-2 outline-offset-1 outline-brass-200/90' : ''}`}>
                      <Cube kind={kind} className="size-[1.625rem]" />
                    </span>
                  ) : (
                    <span key={i} data-market-space={`${kind}-${i}`} className="size-[1.625rem] rounded-[4px] border-2 border-dashed border-parchment-300/70 bg-black/35" />
                  ),
                )}
              </span>
            </span>
          )
        })}
      </span>
    </div>
  )
}

export function MarketStrip({ state, ctx }: { state: GameState; ctx: RulesContext }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-bronze-500/40 bg-soot-950/90 p-2.5">
      <MarketRow kind="coal" state={state} ctx={ctx} />
      <MarketRow kind="iron" state={state} ctx={ctx} />
    </div>
  )
}
