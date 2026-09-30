/**
 * PLACEHOLDER NUMBERS: NOT FROM THE PLAYER MAT.
 *
 * Tests, and local previews while docs/TILES.md is incomplete, need a full
 * table to run the rules on. These numbers are made up for that (level I
 * values follow the placeholders in the UI mockup). The real game never uses
 * them: a production build stops while docs/TILES.md has TODO values, and the
 * game screen shows a "placeholder numbers" warning whenever they're in use.
 */

import type { MarketConfig } from './config/markets'
import { resolveRulesData, type RulesData, type RulesTables } from './data'
import { TILE_TABLE } from './config/tiles'
import { isTodo, type IndustryId, type TileLevelRow, type TileTable } from './tileTable'

type Row = [tiles: number, money: number, coal: number, iron: number, vp: number, income: number, link: number, cubes: number, noCanal: boolean, noRail: boolean]

const rows = (list: Row[], firstLevel = 1): TileLevelRow[] =>
  list.map(([tiles, money, coal, iron, vp, income, link, cubes, noCanal, noRail], i) => ({
    level: firstLevel + i,
    locked: false,
    tiles,
    money,
    coal,
    iron,
    vp,
    income,
    link,
    cubes: cubes || null,
    noCanal,
    noRail,
    developable: true,
  }))

const LOCKED_SHIPYARD: TileLevelRow = {
  level: 0,
  locked: true,
  tiles: 2,
  money: null,
  coal: null,
  iron: null,
  vp: null,
  income: null,
  link: null,
  cubes: null,
  noCanal: null,
  noRail: null,
  developable: true,
}

const INDUSTRIES: Record<IndustryId, { total: number; levels: TileLevelRow[] }> = {
  //                 tiles  £   coal iron VP income link cubes noCanal noRail
  cotton: {
    total: 12,
    levels: rows([
      [3, 12, 0, 0, 5, 5, 1, 0, false, true],
      [3, 14, 1, 0, 5, 4, 1, 0, false, false],
      [3, 16, 1, 1, 9, 3, 1, 0, false, false],
      [3, 18, 1, 1, 12, 2, 1, 0, false, false],
    ]),
  },
  coal: {
    total: 7,
    levels: rows([
      [1, 5, 0, 0, 1, 4, 2, 2, false, true],
      [2, 7, 0, 0, 2, 7, 1, 3, false, false],
      [2, 8, 0, 1, 3, 6, 1, 4, false, false],
      [2, 10, 0, 1, 4, 5, 1, 5, false, false],
    ]),
  },
  iron: {
    total: 4,
    levels: rows([
      [1, 5, 1, 0, 3, 3, 1, 4, false, true],
      [1, 7, 1, 0, 5, 3, 1, 4, false, false],
      [1, 9, 1, 0, 7, 2, 1, 5, false, false],
      [1, 12, 1, 0, 9, 1, 1, 6, false, false],
    ]),
  },
  port: {
    total: 8,
    levels: rows([
      [2, 6, 0, 0, 4, 3, 2, 0, false, true],
      [2, 7, 0, 0, 4, 3, 2, 0, false, false],
      [2, 8, 0, 0, 5, 4, 1, 0, false, false],
      [2, 9, 0, 0, 6, 4, 1, 0, false, false],
    ]),
  },
  shipyard: {
    total: 6,
    levels: [
      LOCKED_SHIPYARD,
      ...rows(
        [
          [2, 16, 1, 1, 10, 2, 1, 0, false, false],
          [2, 25, 1, 1, 18, 1, 1, 0, true, false],
        ],
        1,
      ),
    ],
  },
}

/** Spaces 0–10: −10…0 one each; then 2, 3 and 4 spaces per level up to £30 at space 100. */
function placeholderTrack() {
  const track: { income: number; first: number; last: number }[] = []
  let space = 0
  for (let income = -10; income <= 30; income++) {
    const width = income <= 0 ? 1 : income <= 10 ? 2 : income <= 20 ? 3 : 4
    track.push({ income, first: space, last: space + width - 1 })
    space += width
  }
  return track
}

const proposed = <T,>(v: T | { proposed?: T }, fallback: T): T => (isTodo(v) ? ((v.proposed as T | undefined) ?? fallback) : (v as T))

/** A complete tile table of placeholder numbers (hubs use the values or proposals in docs/TILES.md). */
export function placeholderTable(): TileTable {
  return {
    industries: INDUSTRIES,
    incomeTrack: placeholderTrack(),
    hubs: TILE_TABLE.hubs.map((h) => ({ id: h.id, name: h.name, linkValue: proposed(h.linkValue, 2), marketAccess: proposed(h.marketAccess, true) })),
    portTownsGiveMarketAccess: proposed(TILE_TABLE.portTownsGiveMarketAccess, true),
  }
}

const placeholderMarket = (): MarketConfig => ({
  steps: [1, 2, 3, 4].map((price) => ({ price, spaces: 2 })),
  emptyPrice: 5,
  startingCubes: 'full',
})

/** Every placeholder number: tiles, markets (2 spaces at £1–£4) and 12 distant-market tiles. */
export function placeholderTables(): RulesTables {
  return {
    tiles: placeholderTable(),
    markets: { coal: placeholderMarket(), iron: placeholderMarket() },
    distant: {
      tiles: [
        { move: 1, players: null, flagged: false },
        { move: 1, players: null, flagged: false },
        { move: 2, players: null, flagged: false },
        { move: 2, players: null, flagged: false },
        { move: 3, players: null, flagged: false },
        { move: 1, players: 3, flagged: false },
        { move: 2, players: 4, flagged: false },
        { move: 4, players: null, flagged: true },
        { move: 0, players: null, flagged: false },
        { move: 1, players: null, flagged: false },
        { move: 2, players: 3, flagged: false },
        { move: 3, players: 4, flagged: false },
      ],
      track: [3, 3, 2, 2, 1, 1, 0, 'X'],
    },
  }
}

/** The placeholder numbers, resolved. */
export const PLACEHOLDER_DATA: RulesData = resolveRulesData(placeholderTables())
