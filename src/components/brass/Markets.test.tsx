import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { createGame, marketBuyPrice, marketSellPrice, type RulesContext } from '../../rules/engine'
import { BRASS_MAP } from '../../rules/map'
import { PLACEHOLDER_DATA } from '../../rules/placeholder'
import { MarketStrip } from './Markets'

const ctx: RulesContext = { data: PLACEHOLDER_DATA, map: BRASS_MAP }

/** The coal row's markup with `cubes` in the market. */
function coalRow(cubes: number): string {
  const state = createGame(ctx, [{ name: 'A', isAI: false }, { name: 'B', isAI: false }], 1)
  state.market.coal = cubes
  const html = renderToStaticMarkup(<MarketStrip state={state} ctx={ctx} />)
  return html.slice(html.indexOf('id="market-coal"'), html.indexOf('id="market-iron"'))
}

describe('coal and iron market strip', () => {
  it('runs from the most expensive price on the left to the cheapest on the right: £5 ∞, £4, £3, £2, £1', () => {
    const row = coalRow(8)
    expect([...row.matchAll(/\/>£(\d)<\/span/g)].map((m) => Number(m[1]))).toEqual([5, 4, 3, 2, 1])
    // Spaces left to right: from the dearest (index 7) to the cheapest (index 0).
    expect([...row.matchAll(/data-market-space="coal-(\d+)"/g)].map((m) => Number(m[1]))).toEqual([7, 6, 5, 4, 3, 2, 1, 0])
  })

  it('keeps the rules: cubes sit at the expensive (left) end, the next one bought is the rightmost filled space', () => {
    const row = coalRow(3)
    const spaces = [...row.matchAll(/<span[^>]*data-market-space="coal-(\d+)"[^>]*>/g)]
    const filled = spaces.map((m) => m[0].includes('grid')) // filled spaces hold a cube (grid), empty ones are outlined squares
    expect(filled).toEqual([true, true, true, false, false, false, false, false])
    const outlined = spaces.findIndex((m) => m[0].includes('outline-2'))
    expect(outlined).toBe(2)
    // Buying takes that cheapest cube (£3 with the placeholder prices); selling fills the most expensive empty space (£3).
    expect(marketBuyPrice(ctx, 'coal', 3)).toBe(3)
    expect(marketSellPrice(ctx, 'coal', 3)).toBe(3)
    expect(marketBuyPrice(ctx, 'coal', 0)).toBe(5)
  })
})
