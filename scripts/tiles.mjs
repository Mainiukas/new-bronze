// Reads docs/TILES.md and writes src/rules/config/tiles.ts, and the "To check against the physical
// game" list at the bottom of docs/TILES.md (every value used but not verified yet, from TILES.md and
// the hand-written files in src/rules/config).
//   npm run tiles                   regenerate both
//   node scripts/tiles.mjs --check  fail if either is out of date, or a value is still unknown (`?`)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CARDS_REMOVED, INDUSTRY_CARDS, LOCATION_CARDS, PLAYER_MARK } from '../src/rules/config/cards.ts'
import { DISTANT_MARKET } from '../src/rules/config/distantMarket.ts'
import { MARKETS } from '../src/rules/config/markets.ts'
import { describeUnverified, missingValues, parseTilesMarkdown, renderTilesModule, unverifiedValues } from '../src/rules/tileTable.ts'

const root = new URL('..', import.meta.url)
const source = fileURLToPath(new URL('docs/TILES.md', root))
const target = fileURLToPath(new URL('src/rules/config/tiles.ts', root))
const START = '<!-- to-check:start -->'
const END = '<!-- to-check:end -->'

const HAND_WRITTEN = [
  ['src/rules/config/markets.ts', MARKETS],
  ['src/rules/config/distantMarket.ts', DISTANT_MARKET],
  ['src/rules/config/cards.ts', { LOCATION_CARDS, INDUSTRY_CARDS, PLAYER_MARK, CARDS_REMOVED }],
]

/** docs/TILES.md with its "To check" list brought up to date. */
function withCheckList(markdown) {
  const table = parseTilesMarkdown(markdown)
  const groups = [['docs/TILES.md', unverifiedValues(table)], ...HAND_WRITTEN.map(([file, config]) => [file, unverifiedValues(config)])]
  const total = groups.reduce((n, [, list]) => n + list.length, 0)
  const body = [
    `${total} value(s) to check.`,
    '',
    ...groups.filter(([, list]) => list.length).flatMap(([file, list]) => [`### ${file} (${list.length})`, '', ...list.map((u) => `- ${describeUnverified(u)}`), '']),
  ].join('\n')
  const start = markdown.indexOf(START)
  const end = markdown.indexOf(END)
  if (start < 0 || end < start) throw new Error(`docs/TILES.md needs the ${START} … ${END} markers`)
  return `${markdown.slice(0, start + START.length)}\n${body}${markdown.slice(end)}`
}

/** Problems that stop a build: a stale tiles.ts or check list, or values still unknown. */
export function tilesProblems() {
  const markdown = readFileSync(source, 'utf8')
  const table = parseTilesMarkdown(markdown)
  const problems = []
  let current = ''
  try {
    current = readFileSync(target, 'utf8')
  } catch {
    /* missing: stale */
  }
  if (current !== renderTilesModule(table)) problems.push('src/rules/config/tiles.ts is out of date: run `npm run tiles`.')
  if (withCheckList(markdown) !== markdown) problems.push('The "To check against the physical game" list in docs/TILES.md is out of date: run `npm run tiles`.')
  const missing = [...missingValues(table), ...HAND_WRITTEN.flatMap(([, config]) => missingValues(config))]
  if (missing.length) problems.push(`${missing.length} rules value(s) not known at all (\`?\`):\n` + missing.map((m) => `  - ${m.todo}`).join('\n'))
  return problems
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    const problems = tilesProblems()
    if (problems.length) {
      console.error(problems.join('\n\n'))
      process.exit(1)
    }
    console.log('docs/TILES.md: complete, and src/rules/config/tiles.ts and the check list are up to date.')
  } else {
    const markdown = readFileSync(source, 'utf8')
    const table = parseTilesMarkdown(markdown)
    writeFileSync(target, renderTilesModule(table))
    const updated = withCheckList(markdown)
    writeFileSync(source, updated)
    console.log(`Wrote src/rules/config/tiles.ts and the check list in docs/TILES.md (${updated.slice(updated.indexOf(START) + START.length).trim().split('\n')[0]})`)
  }
}
