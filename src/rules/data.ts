/**
 * The rules' numbers as the engine uses them: the tile table with every
 * value filled in. resolveRulesData refuses a table that still has TODO
 * values (it lists them), so the engine never runs on a guessed number.
 */

import { INDUSTRY_LABEL, INDUSTRY_ORDER, isTodo, missingValues, perIndustry, roman, type IndustryId, type Maybe, type TileTable } from './tileTable'

export type { IndustryId } from './tileTable'
export { INDUSTRY_ORDER, perIndustry } from './tileTable'

export interface Cost {
  money: number
  coal: number
  iron: number
}

export interface IndustryLevel {
  readonly industry: IndustryId
  /** 1–4, or 0 for the locked shipyard level. */
  readonly level: number
  /** Can't be built; only removed with Develop. */
  readonly locked: boolean
  /** Tiles of this level on a player's mat. */
  readonly tiles: number
  readonly cost: Cost
  readonly vp: number
  /** Progress-track spaces gained when it flips. */
  readonly income: number
  /** Link-value icons: a link to its location scores this much. */
  readonly link: number
  /** Coal or iron cubes placed on it when built (mines and iron works). */
  readonly cubes: number
  readonly noCanal: boolean
  readonly noRail: boolean
  readonly developable: boolean
}

export interface RulesData {
  readonly industries: Readonly<Record<IndustryId, { readonly total: number; readonly levels: readonly IndustryLevel[] }>>
  readonly markets: Readonly<Record<'coal' | 'iron', { readonly spaces: readonly number[]; readonly empty: number }>>
  /** Income per progress-track space (index 0–100). */
  readonly incomeBySpace: readonly number[]
  readonly distantMarket: {
    readonly tiles: readonly { readonly move: number; readonly players: number | null; readonly flagged: boolean }[]
    /** Income per row, top first. 'X' closes the market. */
    readonly track: readonly (number | 'X')[]
  }
  readonly hubs: Readonly<Record<string, { readonly linkValue: number; readonly marketAccess: boolean }>>
  readonly portTownsGiveMarketAccess: boolean
}

export class IncompleteRulesError extends Error {
  readonly missing: string[]
  constructor(missing: string[]) {
    super(`The rules table isn't complete: ${missing.length} value(s) in docs/TILES.md still have to be copied from the player mat (first: ${missing[0]}).`)
    this.missing = missing
  }
}

function value<T>(v: Maybe<T>): T {
  if (isTodo(v)) throw new IncompleteRulesError([v.todo])
  return v
}

/** The tile table as the engine's data. Throws IncompleteRulesError (listing every TODO) or an Error for inconsistent values. */
export function resolveRulesData(table: TileTable): RulesData {
  const missing = missingValues(table)
  if (missing.length) throw new IncompleteRulesError(missing.map((m) => m.todo))

  const industries = perIndustry((id) => {
      const t = table.industries[id]
      const levels: IndustryLevel[] = t.levels.map((row) => ({
        industry: id,
        level: row.level,
        locked: row.locked,
        tiles: value(row.tiles),
        cost: { money: value(row.money) ?? 0, coal: value(row.coal) ?? 0, iron: value(row.iron) ?? 0 },
        vp: value(row.vp) ?? 0,
        income: value(row.income) ?? 0,
        link: value(row.link) ?? 0,
        cubes: value(row.cubes) ?? 0,
        noCanal: value(row.noCanal) ?? false,
        noRail: value(row.noRail) ?? false,
        developable: value(row.developable) ?? false,
      }))
      return { total: t.total, levels }
    })

  const incomeBySpace: number[] = []
  for (const row of table.incomeTrack) for (let s = value(row.first); s <= value(row.last); s++) incomeBySpace[s] = row.income

  const data: RulesData = {
    industries,
    markets: {
      coal: { spaces: table.markets.coal.spaces.map(value), empty: value(table.markets.coal.empty) },
      iron: { spaces: table.markets.iron.spaces.map(value), empty: value(table.markets.iron.empty) },
    },
    incomeBySpace,
    distantMarket: {
      tiles: table.distantMarket.tiles.map((t) => ({ move: value(t.move), players: value(t.players), flagged: value(t.flagged) })),
      track: table.distantMarket.track.map(value),
    },
    hubs: Object.fromEntries(table.hubs.map((h) => [h.id, { linkValue: value(h.linkValue), marketAccess: value(h.marketAccess) }])),
    portTownsGiveMarketAccess: value(table.portTownsGiveMarketAccess),
  }
  const problems = checkRulesData(data)
  if (problems.length) throw new Error(`docs/TILES.md has inconsistent values:\n- ${problems.join('\n- ')}`)
  return data
}

/** Consistency checks on a filled-in table (the numbers must add up). */
export function checkRulesData(data: RulesData): string[] {
  const problems: string[] = []
  for (const id of INDUSTRY_ORDER) {
    const { total, levels } = data.industries[id]
    const sum = levels.reduce((n, l) => n + l.tiles, 0)
    if (sum !== total) problems.push(`${INDUSTRY_LABEL[id]}: the levels have ${sum} tiles, the rulebook says ${total}`)
    levels.forEach((l, i) => {
      if (i > 0 && l.level <= levels[i - 1].level) problems.push(`${INDUSTRY_LABEL[id]}: levels must go up (${roman(l.level)})`)
      if (l.locked && !l.developable) problems.push(`${INDUSTRY_LABEL[id]} ${roman(l.level)}: a locked level must be developable`)
      if ((id === 'coal' || id === 'iron') && !l.locked && l.cubes <= 0) problems.push(`${INDUSTRY_LABEL[id]} ${roman(l.level)}: needs cubes`)
    })
  }
  for (const name of ['coal', 'iron'] as const) {
    const spaces = data.markets[name].spaces
    if (spaces.some((p, i) => i > 0 && p < spaces[i - 1])) problems.push(`${name} market: prices must go from cheapest to most expensive`)
  }
  if (data.incomeBySpace.length !== 101 || data.incomeBySpace.some((v) => v === undefined)) problems.push('Income track: every space from 0 to 100 needs an income level')
  if (data.incomeBySpace[10] !== 0) problems.push('Income track: space 10 must be £0 (the start)')
  if (!data.distantMarket.track.includes('X')) problems.push('Distant market track: needs an X row')
  return problems
}

/** Income (£ per round) at a progress-track space. */
export function incomeAt(data: RulesData, space: number): number {
  return data.incomeBySpace[Math.max(0, Math.min(data.incomeBySpace.length - 1, space))]
}

/** The highest space of an income level (where a loan puts the marker). */
export function topSpaceOfLevel(data: RulesData, income: number): number {
  return data.incomeBySpace.lastIndexOf(income)
}
