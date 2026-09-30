import { describe, expect, it } from 'vitest'
import tilesMarkdown from '../../docs/TILES.md?raw'
import tilesModule from './config/tiles.ts?raw'
import { checkRulesData, IncompleteRulesError, resolveRulesData } from './data'
import { DISTANT_MARKET } from './config/distantMarket'
import { MARKETS } from './config/markets'
import { configTables, RULES_DATA } from './rulesData'
import { TILE_TABLE } from './config/tiles'
import { INDUSTRY_LABEL, INDUSTRY_ORDER, isTodo, isUnverified, missingValues, parseTilesMarkdown, renderTilesModule, roman, TilesFormatError, unverifiedValues, valueOf, type Maybe, type TileTable } from './tileTable'
import { tilesProblems } from '../../scripts/tiles.mjs'

/** A value as printed in the snapshot: the number, "?" (unknown), "3?" (not verified yet), or "–". */
function show(v: Maybe<unknown>): string {
  if (isTodo(v)) return '?'
  if (isUnverified(v)) return `${show(v.value as Maybe<unknown>)}?`
  if (v === null) return '–'
  if (v === true) return 'yes'
  if (v === false) return 'no'
  return String(v)
}

/** The whole table as text, laid out like the player mat, to check against the physical one. */
function formatTable(t: TileTable): string {
  const lines: string[] = []
  for (const id of INDUSTRY_ORDER) {
    const { total, levels } = t.industries[id]
    lines.push(`${INDUSTRY_LABEL[id]} (${total} tiles)`)
    lines.push('  lvl       tiles  £    coal iron VP   inc  link cubes noCanal noRail dev')
    for (const l of levels) {
      const cells = [l.tiles, l.money, l.coal, l.iron, l.vp, l.income, l.link, l.cubes, l.noCanal, l.noRail, l.developable].map(show)
      const lvl = l.locked ? '0 locked' : roman(l.level)
      lines.push(`  ${lvl.padEnd(9)} ${cells.map((c, i) => c.padEnd(i < 8 ? 5 : 7)).join(' ')}`.trimEnd())
    }
  }
  lines.push(`Income track: ${t.incomeTrack.map((r) => `£${r.income}=${show(r.first)}-${show(r.last)}`).join(' ')}`)
  lines.push(`Hubs: ${t.hubs.map((h) => `${h.id} link ${show(h.linkValue)} market ${show(h.marketAccess)}`).join(', ')}`)
  lines.push(`Port towns give market access: ${show(t.portTownsGiveMarketAccess)}`)
  // The hand-written config files (src/rules/config).
  for (const name of ['coal', 'iron'] as const) {
    const m = MARKETS[name]
    lines.push(`${name === 'coal' ? 'Coal' : 'Iron'} market: ${m.steps.map((st) => `£${show(st.price)}×${show(st.spaces)}`).join(' ')} | empty £${show(m.emptyPrice)} | start ${show(m.startingCubes)} | supply ${show(m.supply)}`)
  }
  lines.push(`Distant market tiles: ${DISTANT_MARKET.tiles.map((d) => `${show(d.move)}/${show(d.players)}${valueOf(d.flagged) === true ? '!' : ''}`).join(' ')}`)
  lines.push(`Distant market track: ${isTodo(DISTANT_MARKET.track) ? '?' : DISTANT_MARKET.track.map(show).join(' ')}`)
  return lines.join('\n')
}

const CONFIG = { tiles: TILE_TABLE, markets: MARKETS, distant: DISTANT_MARKET }

describe('the rules numbers (docs/TILES.md → src/rules/config/tiles.ts, and src/rules/config)', () => {
  it('tiles.ts is generated from the current docs/TILES.md (run `npm run tiles` after editing it)', () => {
    expect(tilesModule).toBe(renderTilesModule(parseTilesMarkdown(tilesMarkdown)))
  })

  it('matches the snapshot: check every line against the physical player mat', () => {
    expect(formatTable(TILE_TABLE)).toMatchSnapshot()
  })

  it('has the rulebook tile totals and the known values', () => {
    expect(Object.fromEntries(INDUSTRY_ORDER.map((id) => [id, TILE_TABLE.industries[id].total]))).toEqual({ cotton: 12, coal: 7, iron: 4, port: 8, shipyard: 6 })
    expect(valueOf(TILE_TABLE.industries.cotton.levels[0].vp)).toBe(3)
    expect(TILE_TABLE.industries.shipyard.levels[0]).toMatchObject({ level: 0, locked: true, developable: true })
    // RULES.md §4 (£5 when a market is empty) and §1 (1 cube per space at the start); 12 distant-market tiles.
    expect([MARKETS.coal.emptyPrice, MARKETS.iron.emptyPrice]).toEqual([5, 5])
    expect([MARKETS.coal.startingCubes, MARKETS.iron.startingCubes]).toEqual(['full', 'full'])
    expect(DISTANT_MARKET.tiles).toHaveLength(12)
  })

  it('gives each player exactly 37 industry tiles: 12 + 7 + 4 + 8 + 6, the levels adding up to each total', () => {
    let all = 0
    for (const id of INDUSTRY_ORDER) {
      const { total, levels } = RULES_DATA.industries[id]
      expect([id, levels.reduce((n, l) => n + l.tiles, 0)]).toEqual([id, total])
      all += total
    }
    expect(all).toBe(37)
  })

  it('has every value filled in, so the engine plays with it (unverified values included)', () => {
    expect([...missingValues(TILE_TABLE), ...missingValues(MARKETS), ...missingValues(DISTANT_MARKET)]).toEqual([])
    expect(() => resolveRulesData(CONFIG)).not.toThrow()
    // Unverified values are used as they are: cotton mill I costs £12 though it's not checked yet.
    expect(isUnverified(TILE_TABLE.industries.cotton.levels[0].money)).toBe(true)
    expect(RULES_DATA.industries.cotton.levels[0].cost.money).toBe(12)
    expect([RULES_DATA.markets.coal.supply, RULES_DATA.markets.iron.supply]).toEqual([24, 16])
  })

  it('lists every unverified value in docs/TILES.md under "To check against the physical game", up to date', () => {
    expect(tilesProblems()).toEqual([])
    const list = tilesMarkdown.slice(tilesMarkdown.indexOf('<!-- to-check:start -->'))
    for (const u of unverifiedValues(TILE_TABLE)) expect(list).toContain(u.label)
    for (const u of unverifiedValues(MARKETS)) expect(list).toContain(u.label)
    expect(list).toContain('Distant market tile 12: value (spaces along the track): **3**')
    expect(list).toContain('Cards: cotton mill industry cards: **8**')
  })
})

describe('reading TILES.md', () => {
  const industry = (name: string, total: number, row: string) => `## ${name} (${total} tiles total)\n| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n${row}\n`
  const rest = `## Income\n| income | first space | last space |\n|---|---|---|\n| 0 | 10 | 10 |\n## Our map: hubs\n| hub | id | link value | market access |\n|---|---|---|---|\n| London | london | 2 | yes? |\n\n| rule | value |\n|---|---|\n| Towns with a port slot give access to the markets | yes |\n`
  const doc = (cotton = '| I | 3 | 12 | – | – | 5 | 5 | 1 | – | no | yes | yes |') =>
    industry('Cotton mill', 12, cotton) +
    industry('Coal mine', 7, '| I | 1 | 5 | – | – | 1 | 4 | 2 | 2 | no | yes | yes |') +
    industry('Iron works', 4, '| I | 1 | 5 | 1 | – | 3 | 3 | 1 | 4 | no | yes | yes |') +
    industry('Port', 8, '| I | 2 | 6 | – | – | 4 | 3 | 2 | – | no | yes | yes |') +
    industry('Shipyard', 6, '| 0 (locked) | 2 | – | – | – | – | – | – | – | – | – | yes (develop only) |\n| II | 2 | ? | 1 | 1 | ? | ? | ? | – | yes? | no | yes |') +
    rest

  it('reads numbers, yes/no, "–" (doesn\'t apply), "?" (unknown) and "3?" (used, not verified yet)', () => {
    const t = parseTilesMarkdown(doc())
    expect(t.industries.cotton.levels[0]).toMatchObject({ level: 1, tiles: 3, money: 12, coal: null, vp: 5, noCanal: false, noRail: true, developable: true })
    expect(t.industries.shipyard.levels[0]).toMatchObject({ level: 0, locked: true, money: null, developable: true })
    expect(t.industries.shipyard.levels[1].money).toEqual({ todo: 'Shipyard II: £ cost' })
    expect(t.industries.shipyard.levels[1].noCanal).toEqual({ value: true, verified: false, label: 'Shipyard II: not in canal era' })
    expect(t.hubs[0]).toMatchObject({ id: 'london', linkValue: 2, marketAccess: { value: true, verified: false, label: 'London: gives market access' } })
    expect(missingValues(t).map((m) => m.todo)).toContain('Shipyard II: £ cost')
  })

  it('refuses values it can\'t read, naming the line', () => {
    expect(() => parseTilesMarkdown(doc('| I | 3 | twelve | – | – | 5 | 5 | 1 | – | no | yes | yes |'))).toThrow(TilesFormatError)
    expect(() => parseTilesMarkdown(doc('| I | 3 | 12 | – | – | 5 | 5 | 1 | – | maybe | yes | yes |'))).toThrow(/yes or no/)
  })
})

describe('the rules data the game plays with', () => {
  it('is complete and consistent', () => {
    expect(missingValues(configTables())).toEqual([])
    expect(checkRulesData(RULES_DATA)).toEqual([])
    expect(RULES_DATA.incomeBySpace).toHaveLength(101)
    expect(RULES_DATA.incomeBySpace[10]).toBe(0)
    expect(RULES_DATA.incomeBySpace[100]).toBe(30)
  })

  it('the consistency checks catch tile counts that don\'t add up', () => {
    const table = TILE_TABLE
    const broken: TileTable = {
      ...table,
      industries: { ...table.industries, iron: { ...table.industries.iron, levels: table.industries.iron.levels.map((l, i) => (i === 0 ? { ...l, tiles: 2 } : l)) } },
    }
    expect(() => resolveRulesData({ ...configTables(), tiles: broken })).toThrow(/Iron works: the levels have 5 tiles, the rulebook says 4/)
    // An unknown value ("?") stops the engine, naming it.
    const unknown: TileTable = {
      ...table,
      industries: { ...table.industries, iron: { ...table.industries.iron, levels: table.industries.iron.levels.map((l, i) => (i === 0 ? { ...l, money: { todo: 'Iron works I: £ cost' } } : l)) } },
    }
    expect(() => resolveRulesData({ ...configTables(), tiles: unknown })).toThrow(IncompleteRulesError)
  })
})
