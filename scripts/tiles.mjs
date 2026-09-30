// Reads docs/TILES.md and writes src/rules/config/tiles.ts.
//   npm run tiles            regenerate src/rules/config/tiles.ts
//   node scripts/tiles.mjs --check   fail if tiles.ts is out of date or values are still TODO
// Set BRONZE_ALLOW_TODO_TILES=1 to let --check pass with TODO values (local previews only).
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DISTANT_MARKET } from '../src/rules/config/distantMarket.ts'
import { MARKETS } from '../src/rules/config/markets.ts'
import { missingValues, parseTilesMarkdown, renderTilesModule } from '../src/rules/tileTable.ts'

const root = new URL('..', import.meta.url)
const source = fileURLToPath(new URL('docs/TILES.md', root))
const target = fileURLToPath(new URL('src/rules/config/tiles.ts', root))

/** Problems that stop a build: a stale tiles.ts, or values still TODO. */
export function tilesProblems({ allowTodo = false } = {}) {
  const table = parseTilesMarkdown(readFileSync(source, 'utf8'))
  const problems = []
  let current = ''
  try {
    current = readFileSync(target, 'utf8')
  } catch {
    /* missing: stale */
  }
  if (current !== renderTilesModule(table)) problems.push('src/rules/config/tiles.ts is out of date: run `npm run tiles`.')
  // Every rules number still TODO: docs/TILES.md and the hand-written config files.
  const missing = [...missingValues(table), ...missingValues(MARKETS), ...missingValues(DISTANT_MARKET)]
  if (missing.length && !allowTodo) {
    problems.push(
      `${missing.length} rules value(s) still to fill in (docs/TILES.md, src/rules/config/markets.ts, src/rules/config/distantMarket.ts):\n` +
        missing.map((m) => `  - ${m.todo}${m.proposed !== undefined ? ` (proposed: ${m.proposed})` : ''}`).join('\n'),
    )
  }
  return problems
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    const problems = tilesProblems({ allowTodo: process.env.BRONZE_ALLOW_TODO_TILES === '1' })
    if (problems.length) {
      console.error(problems.join('\n\n'))
      process.exit(1)
    }
    console.log('docs/TILES.md: complete, and src/rules/config/tiles.ts is up to date.')
  } else {
    const table = parseTilesMarkdown(readFileSync(source, 'utf8'))
    writeFileSync(target, renderTilesModule(table))
    const missing = missingValues(table)
    console.log(`Wrote src/rules/config/tiles.ts. ${missing.length ? `${missing.length} value(s) still TODO in docs/TILES.md.` : 'Every value is filled in.'}`)
  }
}
