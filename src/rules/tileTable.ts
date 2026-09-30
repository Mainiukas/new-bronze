/**
 * The tile table's shape, and the reader for docs/TILES.md.
 *
 * docs/TILES.md holds the player mat's numbers (tiles, income track, hubs).
 * `npm run tiles` reads it with parseTilesMarkdown and writes
 * src/rules/config/tiles.ts with renderTilesModule. (The markets, the distant
 * market and the cards are hand-written files in src/rules/config.)
 *
 * Every value is either checked against the physical game (a plain value,
 * `verified: true`) or not yet (`unverified(label, value)`, which carries
 * `verified: false`): the engine plays with it, and it's listed under "To
 * check against the physical game" in docs/TILES.md. A value not known at
 * all stays a Todo: the engine refuses to use it (resolveRulesData in
 * data.ts), and `npm run build` refuses to build while any remain.
 *
 * This file has no imports, so Node can run it directly (scripts/tiles.mjs).
 */

export const INDUSTRY_ORDER = ['cotton', 'coal', 'iron', 'port', 'shipyard'] as const
export type IndustryId = (typeof INDUSTRY_ORDER)[number]

/** A value not copied from the mat yet. `proposed` is a suggestion for our map, not confirmed. */
export interface Todo<T> {
  readonly todo: string
  readonly proposed?: T
}
/** A value the engine uses that hasn't been checked against the physical game yet. */
export interface Unverified<T> {
  readonly value: T
  readonly verified: false
  /** What it is, for the "To check" list. */
  readonly label: string
}
export type Maybe<T> = T | Todo<T> | Unverified<T>

export function unverified<T>(label: string, value: T): Unverified<T> {
  return { value, verified: false, label }
}

export function isUnverified(value: unknown): value is Unverified<unknown> {
  return typeof value === 'object' && value !== null && (value as { verified?: unknown }).verified === false && 'value' in value
}

/** A value as the engine uses it: unverified values count, TODOs don't exist yet (undefined). */
export function valueOf<T>(v: Maybe<T>): T | undefined {
  if (isTodo(v)) return undefined
  return isUnverified(v) ? (v.value as T) : (v as T)
}

/** An object with one entry per industry. */
export function perIndustry<T>(make: (id: IndustryId) => T): Record<IndustryId, T> {
  const out = {} as Record<IndustryId, T>
  for (const id of INDUSTRY_ORDER) out[id] = make(id)
  return out
}

export function todo<T>(label: string, proposed?: T): Todo<T> {
  return proposed === undefined ? { todo: label } : { todo: label, proposed }
}

export function isTodo(value: unknown): value is Todo<unknown> {
  return typeof value === 'object' && value !== null && 'todo' in value
}

/** One level of an industry on the player mat. `null` = doesn't apply (printed "–"). */
export interface TileLevelRow {
  /** 1–4; 0 for the locked shipyard level. */
  readonly level: number
  readonly locked: boolean
  readonly tiles: Maybe<number>
  readonly money: Maybe<number | null>
  readonly coal: Maybe<number | null>
  readonly iron: Maybe<number | null>
  readonly vp: Maybe<number | null>
  readonly income: Maybe<number | null>
  readonly link: Maybe<number | null>
  readonly cubes: Maybe<number | null>
  readonly noCanal: Maybe<boolean | null>
  readonly noRail: Maybe<boolean | null>
  readonly developable: Maybe<boolean | null>
}

export interface IndustryTable {
  /** Tiles of this industry per player (from the rulebook). */
  readonly total: number
  readonly levels: readonly TileLevelRow[]
}

export interface TileTable {
  readonly industries: Readonly<Record<IndustryId, IndustryTable>>
  /** Progress-track spaces per income level. */
  readonly incomeTrack: readonly { readonly income: number; readonly first: Maybe<number>; readonly last: Maybe<number> }[]
  readonly hubs: readonly { readonly id: string; readonly name: string; readonly linkValue: Maybe<number>; readonly marketAccess: Maybe<boolean> }[]
  /** Whether a town with a port slot gives access to the coal and iron markets. */
  readonly portTownsGiveMarketAccess: Maybe<boolean>
}

/* ---- Reading docs/TILES.md ---------------------------------------------------- */

const INDUSTRY_HEADINGS: Record<string, IndustryId> = {
  'cotton mill': 'cotton',
  'coal mine': 'coal',
  'iron works': 'iron',
  port: 'port',
  shipyard: 'shipyard',
}
export const INDUSTRY_LABEL: Record<IndustryId, string> = {
  cotton: 'Cotton mill',
  coal: 'Coal mine',
  iron: 'Iron works',
  port: 'Port',
  shipyard: 'Shipyard',
}
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
export const roman = (level: number) => ROMAN[level] ?? String(level)

export class TilesFormatError extends Error {}

type Cell = { text: string; line: number }

/** Every markdown table in a block of lines: its rows (header and separator dropped). */
function tables(lines: { text: string; line: number }[]): { header: string[]; rows: Cell[][] }[] {
  const found: { header: string[]; rows: Cell[][] }[] = []
  let current: { header: string[]; rows: Cell[][] } | null = null
  let sawSeparator = false
  for (const { text, line } of lines) {
    const trimmed = text.trim()
    if (!trimmed.startsWith('|')) {
      current = null
      continue
    }
    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => ({ text: cell.trim(), line }))
    if (!current) {
      current = { header: cells.map((c) => c.text.toLowerCase()), rows: [] }
      found.push(current)
      sawSeparator = false
      continue
    }
    if (!sawSeparator && cells.every((c) => /^:?-{2,}:?$/.test(c.text))) {
      sawSeparator = true
      continue
    }
    current.rows.push(cells)
  }
  return found
}

type Kind = 'number' | 'boolean' | 'numberOrX'

/** A cell as a value: '?' → Todo, '3?' → 3, not verified yet, '–' → null. */
function cell(c: Cell | undefined, kind: Kind, label: string, allowNull = true): Maybe<number | boolean | null | 'X'> {
  if (!c) throw new TilesFormatError(`${label}: missing cell`)
  let text = c.text.replace(/\s*\(.*\)\s*$/, '').trim()
  if (text === '?' || text === '') return todo(label)
  let check = false
  if (text.endsWith('?')) {
    check = true
    text = text.slice(0, -1).trim()
  }
  let value: number | boolean | null | 'X'
  if (text === '–' || text === '-' || text === '—') {
    if (!allowNull) throw new TilesFormatError(`line ${c.line}: ${label} can't be "–"`)
    value = null
  } else if (kind === 'boolean') {
    if (!/^(yes|no)$/i.test(text)) throw new TilesFormatError(`line ${c.line}: ${label} should be yes or no, not "${c.text}"`)
    value = /^yes$/i.test(text)
  } else if (kind === 'numberOrX' && /^x$/i.test(text)) {
    value = 'X'
  } else {
    const n = Number(text.replace('−', '-').replace(/^£/, ''))
    if (!Number.isFinite(n)) throw new TilesFormatError(`line ${c.line}: ${label} should be a number, not "${c.text}"`)
    value = n
  }
  return check ? unverified(label, value) : value
}

function num(c: Cell | undefined, label: string, allowNull = false) {
  return cell(c, 'number', label, allowNull) as Maybe<number>
}
function numOrNull(c: Cell | undefined, label: string) {
  return cell(c, 'number', label, true) as Maybe<number | null>
}
function bool(c: Cell | undefined, label: string, allowNull = true) {
  return cell(c, 'boolean', label, allowNull) as Maybe<boolean | null>
}

function parseLevel(text: string, line: number): { level: number; locked: boolean } {
  const locked = /locked/i.test(text)
  const token = text.split(/\s+/)[0].toUpperCase()
  const level = /^\d+$/.test(token) ? Number(token) : ROMAN.indexOf(token)
  if (level < 0) throw new TilesFormatError(`line ${line}: unknown level "${text}"`)
  return { level, locked }
}

/** Reads docs/TILES.md into a TileTable. Throws TilesFormatError on anything it can't read. */
export function parseTilesMarkdown(markdown: string): TileTable {
  const lines = markdown.split(/\r?\n/)
  const sections: { title: string; lines: { text: string; line: number }[] }[] = []
  lines.forEach((text, index) => {
    const heading = /^##\s+(.*)$/.exec(text)
    if (heading) sections.push({ title: heading[1].trim(), lines: [] })
    else sections.at(-1)?.lines.push({ text, line: index + 1 })
  })
  const section = (match: RegExp) => {
    const found = sections.find((s) => match.test(s.title))
    if (!found) throw new TilesFormatError(`TILES.md has no section matching ${match}`)
    return found
  }

  const industries = {} as Record<IndustryId, IndustryTable>
  for (const s of sections) {
    const m = /^([A-Za-z ]+?)\s*\((\d+) tiles total\)/.exec(s.title)
    if (!m) continue
    const id = INDUSTRY_HEADINGS[m[1].toLowerCase()]
    if (!id) throw new TilesFormatError(`Unknown industry section "${s.title}"`)
    const table = tables(s.lines)[0]
    if (!table) throw new TilesFormatError(`${s.title}: no table`)
    const levels = table.rows.map((row) => {
      const { level, locked } = parseLevel(row[0].text, row[0].line)
      const name = `${INDUSTRY_LABEL[id]} ${locked ? 'level 0 (locked)' : roman(level)}`
      return {
        level,
        locked,
        tiles: num(row[1], `${name}: tiles`),
        money: numOrNull(row[2], `${name}: £ cost`),
        coal: numOrNull(row[3], `${name}: coal`),
        iron: numOrNull(row[4], `${name}: iron`),
        vp: numOrNull(row[5], `${name}: VP`),
        income: numOrNull(row[6], `${name}: income`),
        link: numOrNull(row[7], `${name}: link value`),
        cubes: numOrNull(row[8], `${name}: cubes`),
        noCanal: bool(row[9], `${name}: not in canal era`),
        noRail: bool(row[10], `${name}: not in rail era`),
        developable: bool(row[11], `${name}: developable`),
      } satisfies TileLevelRow
    })
    industries[id] = { total: Number(m[2]), levels }
  }
  for (const id of INDUSTRY_ORDER) if (!industries[id]) throw new TilesFormatError(`TILES.md has no ${INDUSTRY_LABEL[id]} section`)

  const trackTable = tables(section(/^Income/).lines)[0]
  const incomeTrack = (trackTable?.rows ?? []).map((row) => {
    const income = Number(row[0].text.replace('−', '-'))
    if (!Number.isInteger(income)) throw new TilesFormatError(`line ${row[0].line}: income level "${row[0].text}"`)
    return { income, first: num(row[1], `Income track: £${income} first space`), last: num(row[2], `Income track: £${income} last space`) }
  })

  const mapTables = tables(section(/^Our map/).lines)
  const hubTable = mapTables.find((t) => t.header[0] === 'hub')
  const ruleTable = mapTables.find((t) => t.header[0] === 'rule')
  const hubs = (hubTable?.rows ?? []).map((row) => ({
    name: row[0].text,
    id: row[1].text,
    linkValue: num(row[2], `${row[0].text}: link value`),
    marketAccess: bool(row[3], `${row[0].text}: gives market access`, false) as Maybe<boolean>,
  }))
  const portRule = ruleTable?.rows.find((r) => /port slot/i.test(r[0].text))
  if (!portRule) throw new TilesFormatError('Our map: no rule row about towns with a port slot')

  return {
    industries,
    incomeTrack,
    hubs,
    portTownsGiveMarketAccess: bool(portRule[1], 'Towns with a port slot give market access', false) as Maybe<boolean>,
  }
}

/** Every value still to fill in, in reading order. */
export function missingValues(table: unknown): Todo<unknown>[] {
  const found: Todo<unknown>[] = []
  const walk = (value: unknown) => {
    if (isTodo(value)) found.push(value)
    else if (Array.isArray(value)) value.forEach(walk)
    else if (typeof value === 'object' && value !== null) Object.values(value).forEach(walk)
  }
  walk(table)
  return found
}

/** Every value used but not yet checked against the physical game, in reading order. */
export function unverifiedValues(table: unknown): Unverified<unknown>[] {
  const found: Unverified<unknown>[] = []
  const walk = (value: unknown) => {
    if (isUnverified(value)) found.push(value)
    else if (Array.isArray(value)) value.forEach(walk)
    else if (typeof value === 'object' && value !== null && !isTodo(value)) Object.values(value).forEach(walk)
  }
  walk(table)
  return found
}

/** One line of the "To check" list: "Cotton mill I: VP — 3". */
export function describeUnverified(u: Unverified<unknown>): string {
  const shown = u.value === null ? '–' : typeof u.value === 'boolean' ? (u.value ? 'yes' : 'no') : Array.isArray(u.value) ? u.value.join(', ') : String(u.value)
  return `${u.label}: **${shown}**`
}

/* ---- Writing src/rules/config/tiles.ts ---------------------------------------------- */

function literal(value: unknown, indent: string): string {
  if (isUnverified(value)) return `unverified(${JSON.stringify(value.label)}, ${JSON.stringify(value.value)})`
  if (isTodo(value)) {
    const args = [JSON.stringify(value.todo)]
    if (value.proposed !== undefined) args.push(JSON.stringify(value.proposed))
    return `todo(${args.join(', ')})`
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const inner = value.map((v) => `${indent}  ${literal(v, `${indent}  `)},`).join('\n')
    return `[\n${inner}\n${indent}]`
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
    const inner = entries.map(([k, v]) => `${indent}  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${literal(v, `${indent}  `)},`).join('\n')
    return `{\n${inner}\n${indent}}`
  }
  return JSON.stringify(value)
}

/** The source of src/rules/tiles.ts for a table. */
export function renderTilesModule(table: TileTable): string {
  const missing = missingValues(table).length
  const check = unverifiedValues(table).length
  const helpers = [missing ? 'todo' : '', check ? 'unverified' : ''].filter(Boolean)
  return `// GENERATED from docs/TILES.md by \`npm run tiles\`. Don't edit: change docs/TILES.md and run it again.
// ${missing === 0 ? 'Every value is filled in' : `${missing} value(s) still TODO: copy them from the player mat into docs/TILES.md`}; ${check} still to check against the physical game.

import { ${helpers.map((h) => `${h}, `).join('')}type TileTable } from '../tileTable'

export const TILE_TABLE: TileTable = ${literal(table, '')}
`
}
