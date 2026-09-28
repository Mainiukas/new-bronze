// Writes THIRD_PARTY_NOTICES.md (and public/THIRD_PARTY_NOTICES.txt, shipped with the site):
// every npm package whose code ends up in the built site, with its licence text, read from
// node_modules. Also copies the fonts' licence files to public/licenses/.
// Run with `npm run notices` after changing dependencies.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

// Build tools whose own code is copied into the bundle: Tailwind's generated CSS (with its
// preflight) and Vite's small runtime helpers (module preload). Their dependencies stay behind.
const BUNDLED_TOOLS = ['tailwindcss', 'vite']
const PERMISSIVE = /^(MIT|ISC|BSD-2-Clause|BSD-3-Clause|Apache-2\.0|0BSD|OFL-1\.1|CC0-1\.0|Unlicense|BlueOak-1\.0\.0)$/

/** Node's lookup: node_modules/<name> here, then in each parent folder. */
function locate(name, from) {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    if (dirname(dir) === dir) return null
  }
}

const licenceFile = (dir) => readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|-|$)/i.test(f))

const packages = new Map()
function visit(name, from) {
  const dir = locate(name, from)
  if (!dir) return
  const info = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const id = `${info.name}@${info.version}`
  if (packages.has(id)) return
  const licence = typeof info.license === 'string' ? info.license : (info.license?.type ?? 'UNKNOWN')
  const repo = typeof info.repository === 'string' ? info.repository : info.repository?.url
  const author = typeof info.author === 'string' ? info.author : info.author?.name
  const file = licenceFile(dir)
  packages.set(id, { name: info.name, version: info.version, licence, dir, file, repo: repo ?? info.homepage ?? '', author: author ?? '' })
  if (!BUNDLED_TOOLS.includes(info.name)) for (const dep of Object.keys(info.dependencies ?? {})) visit(dep, dir)
}
for (const dep of [...Object.keys(pkg.dependencies ?? {}), ...BUNDLED_TOOLS]) visit(dep, root)

const list = [...packages.values()].sort((a, b) => a.name.localeCompare(b.name))
const flagged = list.filter((p) => !p.licence.split(/ OR | AND |[()]/).some((l) => PERMISSIVE.test(l.trim())) || !p.file)

// The fonts' licences, shipped with the site.
mkdirSync(join(root, 'public', 'licenses'), { recursive: true })
const fonts = list.filter((p) => p.name.startsWith('@fontsource/') && p.file)
for (const p of fonts) copyFileSync(join(p.dir, p.file), join(root, 'public', 'licenses', `OFL-${p.name.split('/')[1]}.txt`))

const lines = [
  '# Third-party notices',
  '',
  'Bronze includes the following open-source software, listed by `npm run notices` from the',
  'packages installed in node_modules, each with the licence text shipped with it. The fonts',
  '(Cinzel, Barlow, Barlow Condensed) are under the SIL Open Font License 1.1; copies are also in',
  '`public/licenses/`. Art, icons and sounds are covered on the Credits page (#/credits).',
  '',
  '| Package | Version | Licence |',
  '| --- | --- | --- |',
  ...list.map((p) => `| ${p.name} | ${p.version} | ${p.licence} |`),
  '',
  ...(flagged.length ? ['## Needs a look', '', ...flagged.map((p) => `- ${p.name}@${p.version}: "${p.licence}"${p.file ? '' : ', no licence file'}`), ''] : []),
  ...list.flatMap((p) => [
    `## ${p.name} ${p.version}`,
    '',
    `Licence: ${p.licence}${p.author ? ` · Author: ${p.author}` : ''}${p.repo ? ` · Source: ${p.repo.replace(/^git\+/, '')}` : ''}`,
    '',
    '```',
    p.file ? readFileSync(join(p.dir, p.file), 'utf8').trim() : '(No licence file in the package; see its licence field above.)',
    '```',
    '',
  ]),
]
const text = lines.join('\n')
writeFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), text)
writeFileSync(join(root, 'public', 'THIRD_PARTY_NOTICES.txt'), text)
console.log(
  `${list.length} packages in THIRD_PARTY_NOTICES.md, ${fonts.length} font licences in public/licenses/` +
    (flagged.length ? `; needs a look: ${flagged.map((p) => p.name).join(', ')}` : '; all permissive'),
)
