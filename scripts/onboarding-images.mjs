// Makes the web versions of the onboarding pictures (assets/onboarding/*.jpg) for <picture>/srcset:
//   web/<name>.webp at full size, web/<name>-1200.webp and web/<name>-600.webp (the .jpg stays as the fallback).
// Runs before every build (`npm run build`) and on its own with `npm run images`. Only remakes what's out
// of date, so the committed results are used as they are when nothing changed (or sharp isn't installed).
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'assets/onboarding')
const out = join(dir, 'web')
const WIDTHS = [600, 1200]
const QUALITY = 82

const sources = readdirSync(dir).filter((f) => f.endsWith('.jpg'))
const targets = (name) => [[join(out, `${name}.webp`), null], ...WIDTHS.map((w) => [join(out, `${name}-${w}.webp`), w])]
const stale = sources.filter((file) => {
  const made = statSync(join(dir, file)).mtimeMs
  return targets(file.replace(/\.jpg$/, '')).some(([path]) => !existsSync(path) || statSync(path).mtimeMs < made)
})

if (!stale.length) {
  console.log(`Onboarding pictures: ${sources.length} up to date.`)
} else {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.warn('Onboarding pictures: sharp is not installed; using the committed web versions.')
    process.exit(0)
  }
  mkdirSync(out, { recursive: true })
  for (const file of stale) {
    const name = file.replace(/\.jpg$/, '')
    const { width } = await sharp(join(dir, file)).metadata()
    for (const [path, w] of targets(name)) {
      const image = sharp(join(dir, file))
      // Never larger than the original.
      if (w && w < width) image.resize({ width: w })
      await image.webp({ quality: QUALITY, effort: 6 }).toFile(path)
    }
    console.log(`Onboarding pictures: ${name} → ${targets(name).length} WebP sizes.`)
  }
}
