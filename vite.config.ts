import { existsSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { tilesProblems } from './scripts/tiles.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Relative asset URLs, so the build works from any folder or sub-path
  // (GitHub Pages, a storage bucket, or opened straight from disk).
  base: './',
  plugins: [
    tilesGuard(),
    backgrounds(mode === 'single'),
    ...(mode === 'single' ? [] : [preloadFonts()]),
    react(),
    tailwindcss(),
    // `npm run build:single` inlines all JS, CSS and fonts into one index.html.
    ...(mode === 'single' ? [viteSingleFile()] : []),
  ],
  build: {
    ...(mode === 'single' ? { outDir: 'dist-single' } : {}),
    // The colour swatches are lazy-loaded pictures: keep them as files rather than in the script.
    assetsInlineLimit: (file: string) => (file.replaceAll('\\', '/').includes('/assets/tokens/swatches/') ? false : undefined),
  },
}))

const BACKGROUND_WIDTHS = [1280, 1920, 2560]

/** "/assets/bg/<name>-1280.webp 1280w, …" for the files that exist ('' when none do). */
function srcset(name: string, type: 'webp' | 'jpg') {
  return BACKGROUND_WIDTHS.filter((width) => existsSync(new URL(`assets/bg/${name}-${width}.${type}`, import.meta.url)))
    .map((width) => `/assets/bg/${name}-${width}.${type} ${width}w`)
    .join(', ')
}

/**
 * The painted backgrounds (assets/bg, see src/components/theme/backgrounds.ts):
 * - index.html preloads the lobby's and the account screens' paintings on
 *   desktops (768 px and wider), in the size that screen will use (the
 *   1920 px file on a typical desktop). Phones load the lobby's just after
 *   the first paint, so text comes first on slow connections, and the
 *   account screens' once the first page is complete (main.tsx): preloading
 *   both there costs a phone's first page about half a second (Lighthouse
 *   mobile 80–85 instead of 90+). It also carries the splash's painting
 *   (loaded only if the splash shows).
 * - The one-file build keeps only the 1280 px WebPs, so it stays small.
 * Paintings whose files are missing are left out.
 */
function backgrounds(single: boolean): Plugin {
  return {
    name: 'bronze-backgrounds',
    enforce: 'pre',
    load(id) {
      if (single && /[\\/]assets[\\/]bg[\\/][^\\/]+-(?:(?:1920|2560)\.(?:webp|jpg)|1280\.jpg)\?url$/.test(id)) return 'export default ""'
    },
    transformIndexHtml: {
      order: 'pre',
      handler() {
        if (single) return []
        // The see-through iron the panels are drawn with over a painting (index.css): without it they would
        // paint untextured and then change, and the biggest panel's paint (LCP) would wait for the script.
        const tags: HtmlTagDescriptor[] = ['iron_panel_tile_glass.webp', 'iron_panel_framed_glass.webp'].map((file) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'image', type: 'image/webp', href: `/assets/ui/${file}` },
          injectTo: 'head',
        }))
        // The lobby's painting (the usual first page) and the account screens' (the usual next one).
        for (const [name, priority] of [
          ['lobby', 'high'],
          ['auth', 'low'],
        ] as const) {
          const set = srcset(name, 'webp')
          if (!set) continue
          tags.push({
            tag: 'link',
            // data-painting: preloadPainting() (backgrounds.ts) then doesn't add it again.
            attrs: { rel: 'preload', as: 'image', type: 'image/webp', imagesrcset: set, imagesizes: '100vw', media: '(min-width: 768px)', fetchpriority: priority, 'data-painting': name },
            injectTo: 'head',
          })
        }
        const webp = srcset('splash', 'webp')
        const jpg = srcset('splash', 'jpg')
        const fallback = (jpg || webp).split(' ')[0]
        if (fallback) {
          tags.push({
            tag: 'template',
            attrs: { id: 'splash-art' },
            children:
              `<picture class="splash-art">${webp ? `<source type="image/webp" srcset="${webp}" sizes="100vw">` : ''}` +
              `<img src="${fallback}"${jpg ? ` srcset="${jpg}" sizes="100vw"` : ''} alt="" width="2560" height="1440" decoding="async"></picture>`,
            injectTo: 'body',
          })
        }
        return tags
      },
    },
  }
}

/** The fonts the first screen draws with (see main.tsx). */
const FIRST_SCREEN_FONTS = /^assets\/(?:barlow-latin-(?:400|600)|barlow-condensed-latin-(?:600|700|800)|cinzel-latin-700)-normal-[\w-]+\.woff2$/

/**
 * Preloads the first screen's fonts from index.html, so they arrive with the
 * app's script instead of after its first render: a late swap from the
 * fallback font re-wraps the lobby's stat pills and shifts the page (CLS).
 */
function preloadFonts(): Plugin {
  return {
    name: 'bronze-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        return Object.values(bundle ?? {})
          .filter((file) => file.type === 'asset' && FIRST_SCREEN_FONTS.test(file.fileName))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${file.fileName}`, crossorigin: '' },
            injectTo: 'head',
          }))
      },
    },
  }
}

/**
 * The rules' numbers come from docs/TILES.md and src/rules/config. A build
 * stops while any is still unknown (`?`), or while src/rules/config/tiles.ts
 * or the "To check" list in docs/TILES.md is out of date. Values not yet
 * checked against the physical game don't stop it: they're listed there.
 */
function tilesGuard(): Plugin {
  return {
    name: 'bronze-tiles-guard',
    apply: 'build',
    buildStart() {
      const problems = tilesProblems()
      if (problems.length) this.error(problems.join('\n\n'))
    },
  }
}
