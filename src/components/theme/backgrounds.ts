import { PATHS } from '../../data/navigation'

/**
 * The painted page backgrounds (assets/bg/<name>-<width>.<webp|jpg>): which
 * page shows which painting, where its subject sits, and the overlay that
 * keeps the text on top of it readable. A painting whose files are missing
 * is simply left out: the page shows on the plain dark ground instead.
 */

export const BACKGROUND_NAMES = ['lobby', 'auth', 'auth_study', 'shop', 'locker', 'achievements', 'tournaments', 'splash', 'game_city'] as const
export type BackgroundName = (typeof BACKGROUND_NAMES)[number]

export const BACKGROUND_WIDTHS = [1280, 1920, 2560] as const

/** Bundled by Vite as URLs only: nothing is fetched until a page shows one. */
const FILES = import.meta.glob<string>('../../../assets/bg/*.{webp,jpg}', { eager: true, query: '?url', import: 'default' })

/** Bundled painting files by path, as import.meta.glob gives them. */
type Files = Readonly<Record<string, string>>

/** A painting's URL at one width, if that file exists (the one-file build keeps only the 1280 px WebP). */
export function backgroundUrl(name: BackgroundName, width: number, type: 'webp' | 'jpg', files: Files = FILES): string | undefined {
  return files[`../../../assets/bg/${name}-${width}.${type}`] || undefined
}

/** "a.webp 1280w, b.webp 1920w, …" for the widths that exist ('' when none do). */
export function backgroundSrcSet(name: BackgroundName, type: 'webp' | 'jpg', files: Files = FILES): string {
  return BACKGROUND_WIDTHS.flatMap((width) => {
    const url = backgroundUrl(name, width, type, files)
    return url ? [`${url} ${width}w`] : []
  }).join(', ')
}

/** Fetch a painting ahead of time, in the size this screen would show (WebP; skipped where unsupported). */
export function preloadPainting(name: BackgroundName) {
  const srcset = backgroundSrcSet(name, 'webp')
  if (!srcset || document.querySelector(`link[data-painting="${name}"]`)) return
  const link = Object.assign(document.createElement('link'), { rel: 'preload', as: 'image', type: 'image/webp', imageSrcset: srcset, imageSizes: '100vw' })
  link.dataset.painting = name
  document.head.append(link)
}

/**
 * The key subject of each painting (object-position), so it stays in view
 * when a narrow screen crops the sides.
 */
export const BACKGROUND_FOCUS: Record<BackgroundName, string> = {
  lobby: '60% 55%',
  auth: '45% 60%',
  // The oil lamp stands at the far left: at 30% phones and tablets would crop it out.
  auth_study: '5% 55%',
  shop: '55% 60%',
  locker: '45% 55%',
  achievements: '40% 60%',
  tournaments: '50% 45%',
  splash: '40% 55%',
  game_city: '50% 50%',
}

/** Soot, the page ground, at an alpha: rgba(8,5,3,a). */
const soot = (alpha: number) => `rgb(8 5 3 / ${alpha})`

/** Transparent in the middle, deep soot in the corners: every page gets this. */
const VIGNETTE = `radial-gradient(ellipse 75% 70% at 50% 45%, transparent 35%, ${soot(0.75)} 100%)`

/**
 * The readability overlay: the vignette plus a gradient that is darkest
 * where each page puts its panels and text. The brightest paintings (lobby,
 * auth, shop, tournaments) get the strongest one.
 */
export const BACKGROUND_OVERLAY: Record<BackgroundName, string> = {
  // Sidebar and play column on the left and centre; the social column (an iron panel) on the right.
  lobby: `${VIGNETTE}, linear-gradient(90deg, ${soot(0.78)} 0%, ${soot(0.66)} 45%, ${soot(0.5)} 72%, ${soot(0.62)} 100%), linear-gradient(0deg, ${soot(0.55)}, transparent 40%)`,
  // The panel is a column in the middle, over the lamp glow (on phones the logo sits on the painting above it).
  auth: `${VIGNETTE}, linear-gradient(90deg, ${soot(0.35)}, ${soot(0.62)} 32%, ${soot(0.62)} 68%, ${soot(0.35)})`,
  auth_study: `${VIGNETTE}, linear-gradient(90deg, ${soot(0.3)}, ${soot(0.56)} 32%, ${soot(0.56)} 68%, ${soot(0.3)})`,
  // Title and panel in a centred column.
  shop: `${VIGNETTE}, linear-gradient(90deg, ${soot(0.5)}, ${soot(0.72)} 30%, ${soot(0.72)} 70%, ${soot(0.5)})`,
  locker: `${VIGNETTE}, linear-gradient(90deg, ${soot(0.45)}, ${soot(0.66)} 30%, ${soot(0.66)} 70%, ${soot(0.45)})`,
  achievements: `${VIGNETTE}, linear-gradient(180deg, ${soot(0.7)}, ${soot(0.55)} 40%, ${soot(0.65)})`,
  tournaments: `${VIGNETTE}, linear-gradient(90deg, ${soot(0.5)}, ${soot(0.72)} 30%, ${soot(0.72)} 70%, ${soot(0.5)})`,
  // Logo, title and loader in a band across the middle, over the molten metal. Keep in step with .splash-shade in index.html.
  splash: `${VIGNETTE}, linear-gradient(180deg, ${soot(0.4)}, ${soot(0.66)} 30%, ${soot(0.66)} 72%, ${soot(0.45)})`,
  // Behind the play screen: the blurred factory city at night, darkened evenly; the panels carry the text.
  game_city: `${VIGNETTE}, linear-gradient(rgb(10 7 5 / 0.35), rgb(10 7 5 / 0.35))`,
}

/** Lobby pages with their own painting; every other lobby page shows the lobby's. */
const PAGE_BACKGROUNDS: Record<string, BackgroundName> = {
  [PATHS.shop]: 'shop',
  [PATHS.locker]: 'locker',
  [PATHS.achievements]: 'achievements',
  [PATHS.tournaments]: 'tournaments',
}

/** The painting behind a lobby page, or null for the map board (it keeps its plain ground). */
export function backgroundForPage(pathname: string): BackgroundName | null {
  if (pathname === PATHS.board) return null
  // Profiles hang in the trophy room; account settings at the industrialist's desk.
  if (pathname.startsWith('/u/')) return 'achievements'
  if (pathname === PATHS.account) return 'auth_study'
  return PAGE_BACKGROUNDS[pathname] ?? 'lobby'
}
