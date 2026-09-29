import { describe, expect, it } from 'vitest'
import tilesMarkdown from '../../docs/TILES.md?raw'
import tilesModule from './tiles.ts?raw'
import { checkRulesData, IncompleteRulesError, resolveRulesData } from './data'
import { PLACEHOLDER_DATA, placeholderTable } from './placeholder'
import { TILE_TABLE } from './tiles'
import { INDUSTRY_LABEL, INDUSTRY_ORDER, isTodo, missingValues, parseTilesMarkdown, renderTilesModule, roman, TilesFormatError, type Maybe, type TileTable } from './tileTable'

/** A value as printed in the snapshot: the number, "?" (TODO), "3?" (a proposal), or "–". */
function show(v: Maybe<unknown>): string {
  if (isTodo(v)) return v.proposed === undefined ? '?' : `${show(v.proposed as Maybe<unknown>)}?`
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
  lines.push(`Coal market: ${t.markets.coal.spaces.map(show).join(' ')} | empty ${show(t.markets.coal.empty)}`)
  lines.push(`Iron market: ${t.markets.iron.spaces.map(show).join(' ')} | empty ${show(t.markets.iron.empty)}`)
  lines.push(`Income track: ${t.incomeTrack.map((r) => `£${r.income}=${show(r.first)}-${show(r.last)}`).join(' ')}`)
  lines.push(`Distant market tiles: ${t.distantMarket.tiles.map((d) => `${show(d.move)}/${show(d.players)}${d.flagged === true ? '!' : ''}`).join(' ')}`)
  lines.push(`Distant market track: ${t.distantMarket.track.map(show).join(' ')}`)
  lines.push(`Hubs: ${t.hubs.map((h) => `${h.id} link ${show(h.linkValue)} market ${show(h.marketAccess)}`).join(', ')}`)
  lines.push(`Port towns give market access: ${show(t.portTownsGiveMarketAccess)}`)
  return lines.join('\n')
}

describe('the tile table (docs/TILES.md → src/rules/tiles.ts)', () => {
  it('tiles.ts is generated from the current docs/TILES.md (run `npm run tiles` after editing it)', () => {
    expect(tilesModule).toBe(renderTilesModule(parseTilesMarkdown(tilesMarkdown)))
  })

  it('matches the snapshot: check every line against the physical player mat', () => {
    expect(formatTable(TILE_TABLE)).toMatchSnapshot()
  })

  it('has the rulebook tile totals and the known values', () => {
    expect(Object.fromEntries(INDUSTRY_ORDER.map((id) => [id, TILE_TABLE.industries[id].total]))).toEqual({ cotton: 12, coal: 7, iron: 4, port: 8, shipyard: 6 })
    expect(TILE_TABLE.industries.cotton.levels[0].vp).toBe(5)
    expect(TILE_TABLE.industries.shipyard.levels[0]).toMatchObject({ level: 0, locked: true, developable: true })
    expect(TILE_TABLE.markets.coal.empty).toBe(5)
    expect(TILE_TABLE.markets.iron.empty).toBe(5)
  })

  it('lists every value still to copy (the engine refuses the table until there are none)', () => {
    const missing = missingValues(TILE_TABLE)
    if (missing.length === 0) {
      expect(() => resolveRulesData(TILE_TABLE)).not.toThrow()
    } else {
      expect(() => resolveRulesData(TILE_TABLE)).toThrow(IncompleteRulesError)
      try {
        resolveRulesData(TILE_TABLE)
      } catch (error) {
        expect((error as IncompleteRulesError).missing).toEqual(missing.map((m) => m.todo))
      }
    }
  })
})

describe('reading TILES.md', () => {
  const industry = (name: string, total: number, row: string) => `## ${name} (${total} tiles total)\n| Lvl | tiles | £ | coal | iron | VP | income | link | cubes | no canal | no rail | dev |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n${row}\n`
  const rest = `## Markets\n| market | 1 | empty |\n|---|---|---|\n| coal | 1 | 5 |\n| iron | ? | 5 |\n## Income\n| income | first space | last space |\n|---|---|---|\n| 0 | 10 | 10 |\n## Distant cotton market\n| tile | move | players | ! |\n|---|---|---|---|\n| 1 | 2 | – | no |\n\n| row | income |\n|---|---|\n| 1 | 3 |\n| 2 | X |\n## Our map: hubs\n| hub | id | link value | market access |\n|---|---|---|---|\n| London | london | 2 | yes? |\n\n| rule | value |\n|---|---|\n| Towns with a port slot give access to the markets | yes |\n`
  const doc = (cotton = '| I | 3 | 12 | – | – | 5 | 5 | 1 | – | no | yes | yes |') =>
    industry('Cotton mill', 12, cotton) +
    industry('Coal mine', 7, '| I | 1 | 5 | – | – | 1 | 4 | 2 | 2 | no | yes | yes |') +
    industry('Iron works', 4, '| I | 1 | 5 | 1 | – | 3 | 3 | 1 | 4 | no | yes | yes |') +
    industry('Port', 8, '| I | 2 | 6 | – | – | 4 | 3 | 2 | – | no | yes | yes |') +
    industry('Shipyard', 6, '| 0 (locked) | 2 | – | – | – | – | – | – | – | – | – | yes (develop only) |\n| II | 2 | ? | 1 | 1 | ? | ? | ? | – | yes? | no | yes |') +
    rest

  it('reads numbers, yes/no, "–" (doesn\'t apply), "?" (TODO) and "3?" (a proposal)', () => {
    const t = parseTilesMarkdown(doc())
    expect(t.industries.cotton.levels[0]).toMatchObject({ level: 1, tiles: 3, money: 12, coal: null, vp: 5, noCanal: false, noRail: true, developable: true })
    expect(t.industries.shipyard.levels[0]).toMatchObject({ level: 0, locked: true, money: null, developable: true })
    expect(t.industries.shipyard.levels[1].money).toEqual({ todo: 'Shipyard II: £ cost' })
    expect(t.industries.shipyard.levels[1].noCanal).toEqual({ todo: 'Shipyard II: not in canal era', proposed: true })
    expect(t.markets.iron.spaces[0]).toEqual({ todo: 'Iron market: space 1 price' })
    expect(t.distantMarket.track).toEqual([3, 'X'])
    expect(t.hubs[0]).toMatchObject({ id: 'london', linkValue: 2, marketAccess: { todo: 'London: gives market access', proposed: true } })
    expect(missingValues(t).map((m) => m.todo)).toContain('Shipyard II: £ cost')
  })

  it('refuses values it can\'t read, naming the line', () => {
    expect(() => parseTilesMarkdown(doc('| I | 3 | twelve | – | – | 5 | 5 | 1 | – | no | yes | yes |'))).toThrow(TilesFormatError)
    expect(() => parseTilesMarkdown(doc('| I | 3 | 12 | – | – | 5 | 5 | 1 | – | maybe | yes | yes |'))).toThrow(/yes or no/)
  })
})

describe('the placeholder numbers (tests and local previews only)', () => {
  it('are complete and consistent', () => {
    expect(missingValues(placeholderTable())).toEqual([])
    expect(checkRulesData(PLACEHOLDER_DATA)).toEqual([])
    expect(PLACEHOLDER_DATA.incomeBySpace).toHaveLength(101)
    expect(PLACEHOLDER_DATA.incomeBySpace[10]).toBe(0)
    expect(PLACEHOLDER_DATA.incomeBySpace[100]).toBe(30)
  })

  it('the consistency checks catch tile counts that don\'t add up', () => {
    const table = placeholderTable()
    const broken: TileTable = {
      ...table,
      industries: { ...table.industries, iron: { ...table.industries.iron, levels: table.industries.iron.levels.map((l, i) => (i === 0 ? { ...l, tiles: 2 } : l)) } },
    }
    expect(() => resolveRulesData(broken)).toThrow(/Iron works: the levels have 5 tiles, the rulebook says 4/)
  })
})
