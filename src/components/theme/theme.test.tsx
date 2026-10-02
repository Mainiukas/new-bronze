import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PATHS } from '../../data/navigation'
import { BACKGROUND_FOCUS, BACKGROUND_NAMES, BACKGROUND_OVERLAY, backgroundForPage, backgroundSrcSet, backgroundUrl } from './backgrounds'
import { Logo } from './Logo'
import { Corners, Divider, LabelledDivider, Seal } from './Ornaments'
import { PageBackground, Painting } from './PageBackground'
import html from '../../../index.html?raw'
import manifestText from '../../../public/manifest.webmanifest?raw'

/** The icon files in the project (paths only). */
const ICON_FILES = Object.keys(import.meta.glob(['../../../assets/logo/*.png', '../../../public/icons/*.png'])).map((p) => p.replace('../../../', ''))

describe('painted backgrounds', () => {
  it('puts each painting on its page, and none on the map board', () => {
    expect(backgroundForPage(PATHS.mainMenu)).toBe('lobby')
    expect(backgroundForPage(PATHS.shop)).toBe('shop')
    expect(backgroundForPage(PATHS.locker)).toBe('locker')
    expect(backgroundForPage(PATHS.achievements)).toBe('achievements')
    expect(backgroundForPage(PATHS.tournaments)).toBe('tournaments')
    expect(backgroundForPage(PATHS.privacy)).toBe('lobby')
    expect(backgroundForPage(PATHS.board)).toBeNull()
  })

  it('has the agreed focus point and an overlay for every painting', () => {
    expect(BACKGROUND_FOCUS).toEqual({
      lobby: '60% 55%',
      auth: '45% 60%',
      auth_study: '5% 55%',
      shop: '55% 60%',
      locker: '45% 55%',
      achievements: '40% 60%',
      tournaments: '50% 45%',
      splash: '40% 55%',
      game_city: '50% 50%',
    })
    // The match screen's city: an even rgba(10,7,5,.35) over it, under the vignette.
    expect(BACKGROUND_OVERLAY.game_city).toContain('linear-gradient(rgb(10 7 5 / 0.35), rgb(10 7 5 / 0.35))')
    for (const name of BACKGROUND_NAMES) {
      // Vignette to rgba(8,5,3,.75) in the corners, plus a linear gradient darkest where the page's panels sit.
      expect(BACKGROUND_OVERLAY[name]).toMatch(/^radial-gradient\(ellipse .*transparent 35%, rgb\(8 5 3 \/ 0\.75\) 100%\), linear-gradient\(/)
    }
  })

  it('lists only the sizes that exist, smallest first', () => {
    const files = {
      '../../../assets/bg/shop-1280.webp': '/a/shop-1280.webp',
      '../../../assets/bg/shop-2560.webp': '/a/shop-2560.webp',
      '../../../assets/bg/shop-1920.webp': '/a/shop-1920.webp',
      '../../../assets/bg/shop-1920.jpg': '/a/shop-1920.jpg',
      // The one-file build blanks the larger files.
      '../../../assets/bg/lobby-1280.webp': '/a/lobby-1280.webp',
      '../../../assets/bg/lobby-1920.webp': '',
    }
    expect(backgroundSrcSet('shop', 'webp', files)).toBe('/a/shop-1280.webp 1280w, /a/shop-1920.webp 1920w, /a/shop-2560.webp 2560w')
    expect(backgroundSrcSet('shop', 'jpg', files)).toBe('/a/shop-1920.jpg 1920w')
    expect(backgroundSrcSet('lobby', 'webp', files)).toBe('/a/lobby-1280.webp 1280w')
    expect(backgroundUrl('lobby', 1920, 'webp', files)).toBeUndefined()
    expect(backgroundSrcSet('tournaments', 'webp', files)).toBe('')
  })

  it('draws a decorative, fixed layer on the soot ground, under the overlay', () => {
    const html = renderToStaticMarkup(<PageBackground name="lobby" />)
    expect(html).toMatch(/^<div aria-hidden="true" data-background="lobby" class="page-bg pointer-events-none fixed inset-0 -z-10/)
    expect(html).toContain('bg-soot-950')
    // The painting itself joins after the first frame (text first), so never in a server render.
    expect(html).not.toContain('<img')
  })

  it('draws the painting as a responsive picture, WebP first, faded in once loaded', () => {
    const html = renderToStaticMarkup(
      <Painting webp="/l-1280.webp 1280w, /l-1920.webp 1920w" jpg="/l-1920.jpg 1920w" src="/l-1920.jpg" focus="60% 55%" priority="high" />,
    )
    expect(html).toContain('<source type="image/webp" srcSet="/l-1280.webp 1280w, /l-1920.webp 1920w" sizes="100vw"/>')
    expect(html).toMatch(/<img src="\/l-1920.jpg" srcSet="\/l-1920.jpg 1920w" sizes="100vw" alt="" width="2560" height="1440" decoding="async" fetchPriority="high"/)
    expect(html).toContain('object-position:60% 55%')
    expect(html).not.toContain('data-loaded')
    expect(renderToStaticMarkup(<Painting webp="" jpg="" src="/x.webp" focus="0 0" priority="low" />)).toContain('fetchPriority="low"')
  })
})

describe('logo and ornaments', () => {
  it('names every logo "Bronze" and reserves its size', () => {
    for (const variant of ['wordmark', 'tagline', 'stacked', 'icon'] as const) {
      const html = renderToStaticMarkup(<Logo variant={variant} />)
      expect(html).toContain('alt="Bronze"')
      expect(html).toMatch(/width="\d+" height="\d+"/)
    }
  })

  it('keeps the ornaments away from assistive tech and the pointer', () => {
    const corners = renderToStaticMarkup(<Corners />)
    expect(corners.match(/<img/g)).toHaveLength(4)
    expect(corners).toMatch(/^<span aria-hidden="true" class="pointer-events-none absolute inset-0 max-\[359px\]:hidden"/)
    for (const turn of ['rotate-0', 'rotate-90', 'rotate-180', '-rotate-90']) expect(corners).toContain(turn)
    expect(renderToStaticMarkup(<Divider />)).toContain('aria-hidden="true"')
    expect(renderToStaticMarkup(<Seal>x</Seal>)).toContain('aria-hidden="true"')
    expect(renderToStaticMarkup(<LabelledDivider label="or" />)).toMatch(/role="separator" aria-label="or"/)
  })
})

describe('icons, manifest and splash', () => {
  it('links the favicons, touch icon and manifest, and every file exists', () => {
    for (const path of ['assets/logo/bronze_icon_32.png', 'assets/logo/bronze_icon_64.png', 'assets/logo/bronze_icon_180.png']) {
      expect(html).toContain(`href="/${path}"`)
      expect(ICON_FILES).toContain(path)
    }
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<meta name="theme-color" content="#0b0806" />')
    const manifest = JSON.parse(manifestText)
    expect(manifest.theme_color).toBe('#0b0806')
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
    for (const icon of manifest.icons) expect(ICON_FILES).toContain(`public/${icon.src}`)
  })

  it('shows the splash only after 400 ms, with an honest loader', () => {
    expect(html).toMatch(/<div id="splash" role="status"><\/div>/)
    expect(html).toContain('}, 400)')
    expect(html).toContain('alt="Bronze"')
    // Indeterminate: no value is ever claimed.
    expect(html).toContain('role="progressbar" aria-label="Loading Bronze"')
    expect(html).not.toContain('aria-valuenow')
    expect(html).toContain('Stoking the furnaces…')
    expect(html).toContain('prefers-reduced-motion: reduce')
  })
})
