// Makes the web-sized card images the game uses from the full-size art:
//   assets/cards/front/*.png (600×840) and assets/cards/card_back.png → assets/cards/web/*.webp (450×630).
// Run from the repository root after tools/build-cards.js: `node tools/card-webp.mjs`.
// Needs Playwright (as build-cards.js does); set CHROMIUM_PATH to use a particular Chromium.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { chromium } from 'playwright'

const root = process.cwd()
const out = join(root, 'assets/cards/web')
const WIDTH = 450
const HEIGHT = 630
const QUALITY = 0.86

const sources = [
  ...readdirSync(join(root, 'assets/cards/front'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => join(root, 'assets/cards/front', f)),
  join(root, 'assets/cards/card_back.png'),
]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage()
mkdirSync(out, { recursive: true })
for (const file of sources) {
  const src = `data:image/png;base64,${readFileSync(file).toString('base64')}`
  const webp = await page.evaluate(
    async ({ src, width, height, quality }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const g = canvas.getContext('2d')
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, 0, 0, width, height)
      return canvas.toDataURL('image/webp', quality)
    },
    { src, width: WIDTH, height: HEIGHT, quality: QUALITY },
  )
  const target = join(out, basename(file).replace(/\.png$/, '.webp'))
  writeFileSync(target, Buffer.from(webp.split(',')[1], 'base64'))
  console.log(`${basename(target)}: ${Math.round(readFileSync(target).length / 1024)} KB`)
}
await browser.close()
