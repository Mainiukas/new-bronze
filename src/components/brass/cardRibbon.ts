/**
 * The name ribbon at the foot of each card, drawn in code over the card art
 * so the name is real text (crisp at any size) rather than the art's tiny
 * baked-in lettering. Shapes and positions are the ones tools/build-cards.js
 * draws the fronts with (a 300 × 420 card); the colours are the region's,
 * the top stops a shade darker where needed so cream text passes WCAG AA
 * (4.5:1) everywhere on the ribbon.
 */

import { faceOf } from '../../rules/config/cards'
import type { Card } from '../../rules/state'

export type Region = 'wales' | 'midlands' | 'thames' | 'west' | 'southwest' | 'industry'

/** Ribbon gradient (top, bottom) per region. */
export const RIBBON_COLORS: Record<Region, readonly [string, string]> = {
  wales: ['#2c3f7a', '#1a2750'],
  midlands: ['#5a2f5c', '#351a37'],
  thames: ['#7a5619', '#5a3f10'],
  west: ['#7a1f24', '#4a1014'],
  southwest: ['#1f5a55', '#113835'],
  industry: ['#5c5954', '#3e3c38'],
}

/** The card name's colour. */
export const CARD_TEXT = '#f5e7c6'

const REGION_OF: Record<string, Region> = {
  loc_caernarfon: 'wales',
  loc_wrexham: 'wales',
  loc_carmarthen: 'wales',
  loc_merthyr_tydfil: 'wales',
  loc_stoke_on_trent: 'midlands',
  loc_derby: 'midlands',
  loc_nottingham: 'midlands',
  loc_lichfield: 'midlands',
  loc_wolverhampton: 'midlands',
  loc_birmingham: 'midlands',
  loc_leicester: 'midlands',
  loc_gloucester: 'thames',
  loc_oxford: 'thames',
  loc_bristol: 'west',
  loc_swindon: 'west',
  loc_southampton: 'west',
  loc_barnstaple: 'southwest',
  loc_exeter: 'southwest',
  loc_plymouth: 'southwest',
}

/** The card faces with a known region (a test checks every location card has one). */
export const REGION_FACES: readonly string[] = Object.keys(REGION_OF)

export function regionOf(card: Card | string): Region {
  const face = faceOf(card)
  return face.startsWith('industry_') ? 'industry' : (REGION_OF[face] ?? 'wales')
}

/* Geometry on the 300 × 420 card (tools/build-cards.js). */
export const CARD_BOX = { w: 300, h: 420 }
/**
 * The ribbon's outline (notched at both ends): the art's ribbon (x 28–272,
 * y 360–396), a little taller so the name can be ~14 px on a hand-size card,
 * and covering the art's lettering entirely.
 */
export const RIBBON_PATH = 'M24 354 H276 L265 378 L276 402 H24 L35 378 Z'
/** Where the name sits: the ribbon between its notches (centred on y 378). */
export const RIBBON_TEXT = { x: 36, y: 358, w: 228, h: 40 }
/** An overlapped card's name is left off (the ribbon stays) rather than squeezed narrower than this. */
export const NAME_MIN_SCALE_X = 0.72
/** The two side banners of a location card (their names are only shown in the large view). */
export const bannerPath = (x: number) => `M${x - 15} 12 H${x + 15} V128 L${x} 118 L${x - 15} 128 Z`
export const BANNER_X = [42, 258] as const

/* ---- Contrast (WCAG 2.x) ---- */

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

/** The ribbon's colour at a point between top (0) and bottom (1). */
export function ribbonAt(region: Region, t: number): string {
  const [a, b] = RIBBON_COLORS[region]
  return '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('')
}

/* ---- Fitting the name on one line ---- */

export const NAME_MAX_PX = 14
export const NAME_MIN_PX = 10
/** Letter spacing, as a share of the font size. */
export const NAME_TRACKING = 0.04

/**
 * The font size that fits `width` (the name's width at 1 px) into `space` px:
 * up to `max`, never below NAME_MIN_PX (scaled 1 : 2.5 for the large view);
 * if it still doesn't fit at the minimum, the text is narrowed (scaleX)
 * rather than wrapped or cut.
 */
export function fitName(widthAt1px: number, space: number, max = NAME_MAX_PX, min = NAME_MIN_PX): { size: number; scaleX: number } {
  if (widthAt1px <= 0 || space <= 0) return { size: max, scaleX: 1 }
  const size = Math.min(max, space / widthAt1px)
  if (size >= min) return { size, scaleX: 1 }
  return { size: min, scaleX: space / (widthAt1px * min) }
}
