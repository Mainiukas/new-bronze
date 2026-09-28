import { existsSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Relative asset URLs, so the build works from any folder or sub-path
  // (GitHub Pages, a storage bucket, or opened straight from disk).
  base: './',
  plugins: [
    backgrounds(mode === 'single'),
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
 * - index.html preloads the lobby's painting on desktops (768 px and wider),
 *   in the size that screen will use; phones load it just after the first
 *   paint, so text comes first on slow connections. It also carries the
 *   splash's painting (loaded only if the splash shows).
 *   The account screens' painting is preloaded once the first page has
 *   loaded (main.tsx), so it never slows that page down.
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
        const tags: HtmlTagDescriptor[] = []
        const lobby = srcset('lobby', 'webp')
        if (lobby) {
          tags.push({
            tag: 'link',
            attrs: { rel: 'preload', as: 'image', type: 'image/webp', imagesrcset: lobby, imagesizes: '100vw', media: '(min-width: 768px)', fetchpriority: 'high' },
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
