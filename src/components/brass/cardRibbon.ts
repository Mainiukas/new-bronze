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
/** The ribbon's bottom edge, and its height for a one-line name (it grows upwards for two lines). */
export const RIBBON_BOTTOM = 402
export const RIBBON_MIN_H = 48
/** The ribbon's sides (wider than the art's x 28–272, so long names fit) and the depth of its end notches. */
const RIBBON_LEFT = 10
const RIBBON_RIGHT = 290
const NOTCH = 11
/** Where the name may go: between the notches, `RIBBON_PAD` in from the ribbon's top and bottom. */
export const RIBBON_TEXT_X = { from: RIBBON_LEFT + NOTCH + 1, to: RIBBON_RIGHT - NOTCH - 1 }
export const RIBBON_PAD = 6

/** The ribbon's outline (notched at both ends) from `top` down to RIBBON_BOTTOM, `inset` units in. */
export function ribbonPath(top: number, inset = 0): string {
  const [x0, x1, y0, y1] = [RIBBON_LEFT + inset, RIBBON_RIGHT - inset, top + inset, RIBBON_BOTTOM - inset]
  const mid = (top + RIBBON_BOTTOM) / 2
  return `M${x0} ${y0} H${x1} L${x1 - NOTCH} ${mid} L${x1} ${y1} H${x0} L${x0 + NOTCH} ${mid} Z`
}

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

/* ---- Fitting the name ---- */

export const NAME_MAX_PX = 14
export const NAME_MIN_PX = 9
/** Letter spacing, as a share of the font size. */
export const NAME_TRACKING = 0.04

/**
 * A name's lines: names of several words (or with hyphens) break at the last
 * space or hyphen ("Merthyr / Tydfil", "Stoke-on- / Trent", "Cotton / Mill");
 * a single word stays on one line.
 */
export function nameLines(name: string): string[] {
  const at = Math.max(name.lastIndexOf(' '), name.lastIndexOf('-'))
  if (at <= 0 || at >= name.length - 1) return [name]
  return name[at] === '-' ? [name.slice(0, at + 1), name.slice(at + 1)] : [name.slice(0, at), name.slice(at + 1)]
}

/**
 * The font size that fits lines `widthAt1px` wide (the widest line, at 1 px)
 * into `space` px: up to `max`, shrinking for long names. Never narrowed or
 * cut: if even `min` doesn't fit, the size goes below it (`belowMin`) so the
 * name still stays inside the ribbon (only on phone-size cards).
 */
export function fitName(widthAt1px: number, space: number, max = NAME_MAX_PX, min = NAME_MIN_PX): { size: number; belowMin: boolean } {
  if (widthAt1px <= 0 || space <= 0) return { size: max, belowMin: false }
  const size = Math.min(max, space / widthAt1px)
  return { size, belowMin: size < min - 1e-9 }
}

/** The ribbon's top for a name of `lines` lines at `size` px on a card `cardWidth` px wide (line height 1). */
export function ribbonTop(lines: number, size: number, cardWidth: number): number {
  const textUnits = (lines * size * CARD_BOX.w) / cardWidth
  return RIBBON_BOTTOM - Math.max(RIBBON_MIN_H, textUnits + 2 * RIBBON_PAD + 2)
}
