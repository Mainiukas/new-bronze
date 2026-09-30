/**
 * Where everything on the illustrated board goes, in view units (viewBox
 * 0 0 1000 1000): each location's tile group, plaque or hub, and, for each
 * era, the routes that exist in it with their link spaces.
 *
 * Each location is one rectangle (tiles and plate, plaque or hub, with every
 * hexagon and badge) that keeps MIN_GAP from every other and lies inside
 * SAFE_AREA, clear of the painted frame. Groups start centred on their
 * location (or at its labelOffset); overlapping pairs are pushed apart along
 * the shortest direction, and a location's point moves with its group.
 *
 * Routes run from the centre of one group to the centre of the other, under
 * the location art, so their ends are always hidden and each leaves its
 * location on the side facing the other. Each is straight, or one gentle arc
 * when its link has a `bend` in board.json (at most MAX_BEND % of its length:
 * nothing is bent automatically). Where a route still runs into another
 * group, that group steps aside. The link space sits at the middle of the
 * route's visible part (between the two groups' rectangles), and keeps
 * MIN_GAP from every group's rectangle.
 */

import { isLinkActive, MAX_BEND, type BoardData, type BoardLink, type BoardLocation, type Era } from '../../data/board'
import {
  add,
  cubicAt,
  distance,
  distanceToLine,
  distanceToRect,
  flatten,
  inflate,
  lerp,
  lineGap,
  pointAtLength,
  polyline,
  quadraticArc,
  rectGap,
  sub,
  toView,
  union,
  unitNormal,
  type Cubic,
  type Point,
  type Polyline,
  type Rect,
} from './geometry'
import type { MeasureText } from './measure'

/* ---- Sizes (view units) --------------------------------------------------- */

export const TILE = 34
export const TILE_GAP = 3
export const PLATE_H = 20
const PLATE_GAP = 3
const PLATE_PAD = 9

export const STOP_H = 22
const STOP_PAD = 12
/** The two hex_link emblems on stops and hubs: 18 × 18, 3 apart, centred on the top edge and overlapping it by 5. */
export const HEX = 18
const HEX_GAP = 3
const HEX_OVERLAP = 5

export const MEDALLION_R = 32
export const IRON_RING = 4
export const RIBBON_H = 18
export const RIBBON_TAIL = 9
/** The square badge with the hub's current price, left of the medallion. */
export const PRICE_BADGE = 20
export const BUY_ICON = 12
const BUY_GAP = 2

export const RAIL_BADGE_R = 8

export const CITY_FONT = 13.5
export const STOP_FONT = 12
export const HUB_FONT = 11.5
export const CITY_WEIGHT = 700
export const STOP_WEIGHT = 700
export const HUB_WEIGHT = 700
/** Letter spacing, in em. */
export const CITY_TRACKING = 0.06
export const STOP_TRACKING = 0.18
export const HUB_TRACKING = 0.12

/** CSS font shorthand used both to draw and to measure each kind of label. */
export const boardFont = (size: number, weight: number) => `${weight} ${size}px Cinzel`

/** Texture heights on the board, and the length of one repeat of each texture (sources 1639 × 256 and 1084 × 256). */
export const TRACK_H: Record<Era, number> = { canal: 12, rail: 14 }
export const TEXTURE_PIECE: Record<Era, number> = { canal: (1639 * 12) / 256, rail: (1084 * 14) / 256 }

/** A link's bubble (empty) and its token (built): the same 480 × 200 artwork, drawn 52 wide. */
export const BUBBLE_W = 52
export const BUBBLE_H = (BUBBLE_W * 200) / 480

/** Routes keep this far from the drawn shapes of groups they don't belong to. */
export const TRIM = 4
/** Smallest gap between any two location rectangles, and between a link space or token and any of them. */
export const MIN_GAP = 8
/** A link bubble or token, as a capsule: spine half-length and radius (covers 52 × 21.7). */
const SPACE_SPINE = BUBBLE_W / 2 - BUBBLE_H / 2
const SPACE_R = BUBBLE_H / 2
/**
 * Room linked groups need between them along the line joining them: the
 * bubble or token, a gap on each side, and slack for routes arriving at an angle.
 */
const LINK_GAP = BUBBLE_W + 2 * MIN_GAP + 4
/**
 * Everything on the board (every group, route, link space and token) stays
 * inside this box: x 9–91 %, y 8–92 %. The painted frame's inner edge is at
 * 6 % on every side, and its corner gears reach about 9 %.
 */
export const SAFE_AREA: Rect = { x: 90, y: 80, w: 820, h: 840 }
/**
 * How far a group may step aside for routes and link spaces (with whatever
 * that pushes along) from where it settled among the other groups: towns stay
 * on their paint, and where that isn't enough the problem is reported, to be
 * fixed with a bend or a location's position in board.json.
 */
const REACH = 36
/** Most passes of the push-apart loop. */
export const MAX_ITERATIONS = 200

/* ---- Types ---------------------------------------------------------------- */

type Solid = { type: 'rect'; rect: Rect } | { type: 'circle'; c: Point; r: number }

export interface CityParts {
  type: 'city'
  /** One square per slot: a row for 1–2 slots, a triangle (2 over 1) for 3, 2 × 2 for 4. */
  tiles: Rect[]
  plate: Rect
}

export interface StopParts {
  type: 'stop'
  plaque: Rect
  /** The two hex_link emblems on the top edge. */
  hexes: Rect[]
}

export interface HubParts {
  type: 'hub'
  medallion: Point
  /** The two hex_link emblems on the medallion's top edge. */
  hexes: Rect[]
  /** Ribbon body; the folded tails reach RIBBON_TAIL past each end. */
  ribbon: Rect
  /** The current-price badge. */
  badge: Rect
  /** What the hub buys, under the ribbon. */
  icons: Rect[]
}

export interface GroupLayout {
  location: BoardLocation
  /** The location's point, moved with its group (the data's x/y unless the group had to move). */
  point: Point
  /** Centre of the group's rectangle: where its routes end, under the art. */
  center: Point
  /** The location's one rectangle: tiles and plate, plaque or hub, with every hexagon and badge. */
  bounds: Rect
  parts: CityParts | StopParts | HubParts
  /** Rail-era badge centre, if the location has one. */
  railBadge: Point | null
  fontSize: number
  /** Placed by hand (labelOffset), so the nudging leaves it alone. */
  fixed: boolean
  solids: Solid[]
}

export interface RouteLayout {
  link: BoardLink
  era: Era
  /** The drawn curve, from the centre of one group to the centre of the other (both ends under the art): one arc. */
  segments: [Cubic]
  /** `segments`, flattened. */
  line: Polyline
  /** The part of `line` between the two groups' rectangles: what's checked against other routes and groups. */
  visible: Polyline
  width: number
  /** Link space / token centre and rotation (degrees). */
  marker: { x: number; y: number; angle: number }
}

export interface RoutesLayout {
  era: Era
  routes: Map<string, RouteLayout>
  /** Overlaps left in this era, as readable messages. Empty means a clean board. */
  problems: string[]
}

export interface GroupsLayout {
  groups: Map<string, GroupLayout>
  problems: string[]
}

/** A group that must keep `clearance` away from a route (found by a previous layout pass). */
export interface Avoid {
  id: string
  line: Polyline
  clearance: number
}

/* ---- Group shapes --------------------------------------------------------- */

type Shape = Omit<GroupLayout, 'location' | 'point' | 'center' | 'fixed'>

const moveRect = (r: Rect, d: Point): Rect => ({ x: r.x + d.x, y: r.y + d.y, w: r.w, h: r.h })
const movePoint = (p: Point, d: Point): Point => ({ x: p.x + d.x, y: p.y + d.y })

function moveShape(shape: Shape, d: Point): Shape {
  const parts = shape.parts
  const moved: Shape['parts'] =
    parts.type === 'city'
      ? { ...parts, tiles: parts.tiles.map((r) => moveRect(r, d)), plate: moveRect(parts.plate, d) }
      : parts.type === 'stop'
        ? { ...parts, plaque: moveRect(parts.plaque, d), hexes: parts.hexes.map((r) => moveRect(r, d)) }
        : {
            ...parts,
            medallion: movePoint(parts.medallion, d),
            hexes: parts.hexes.map((r) => moveRect(r, d)),
            ribbon: moveRect(parts.ribbon, d),
            badge: moveRect(parts.badge, d),
            icons: parts.icons.map((r) => moveRect(r, d)),
          }
  return {
    ...shape,
    parts: moved,
    bounds: moveRect(shape.bounds, d),
    railBadge: shape.railBadge && movePoint(shape.railBadge, d),
    solids: shape.solids.map((s) => (s.type === 'rect' ? { type: 'rect', rect: moveRect(s.rect, d) } : { ...s, c: movePoint(s.c, d) })),
  }
}

const circleBox = (c: Point, r: number): Rect => ({ x: c.x - r, y: c.y - r, w: r * 2, h: r * 2 })

/** A location's group drawn around (0, 0), before it's centred. */
function rawShape(location: BoardLocation, measure: MeasureText): Shape {
  const name = location.name.toUpperCase()
  const railOnly = location.era === 'rail'

  if (location.type === 'city') {
    const n = location.slots.length
    // 1–2 slots: one row. 3: a triangle, two on top and one centred below. 4: 2 × 2.
    const rows = n >= 3 ? 2 : 1
    const rowW = (count: number) => count * TILE + (count - 1) * TILE_GAP
    const blockW = rowW(rows === 2 ? 2 : n)
    const blockH = rows * TILE + (rows - 1) * TILE_GAP
    const text = measure(name, boardFont(CITY_FONT, CITY_WEIGHT), CITY_FONT * CITY_TRACKING)
    const w = Math.max(blockW, Math.ceil(text + PLATE_PAD * 2))
    const left = (w - blockW) / 2
    const step = TILE + TILE_GAP
    const tiles = Array.from({ length: n }, (_, i) =>
      rows === 1
        ? { x: left + i * step, y: 0, w: TILE, h: TILE }
        : n === 3 && i === 2
          ? { x: left + step / 2, y: step, w: TILE, h: TILE }
          : { x: left + (i % 2) * step, y: Math.floor(i / 2) * step, w: TILE, h: TILE },
    )
    const plate = { x: 0, y: blockH + PLATE_GAP, w, h: PLATE_H }
    const railBadge = railOnly ? { x: plate.x + plate.w - 1, y: plate.y + 1 } : null
    const solids: Solid[] = [
      ...tiles.map((rect) => ({ type: 'rect' as const, rect })),
      { type: 'rect', rect: plate },
      ...(railBadge ? [{ type: 'circle' as const, c: railBadge, r: RAIL_BADGE_R }] : []),
    ]
    const bounds = union([...tiles, plate, ...(railBadge ? [circleBox(railBadge, RAIL_BADGE_R)] : [])])
    return { parts: { type: 'city', tiles, plate }, bounds, railBadge, fontSize: CITY_FONT, solids }
  }

  if (location.type === 'stop') {
    const text = measure(name, boardFont(STOP_FONT, STOP_WEIGHT), STOP_FONT * STOP_TRACKING)
    const plaque = { x: 0, y: 0, w: Math.ceil(text + STOP_PAD * 2), h: STOP_H }
    const hexes = hexPair(plaque.w / 2, 0)
    const railBadge = railOnly ? { x: plaque.w - 1, y: 1 } : null
    const solids: Solid[] = [
      { type: 'rect', rect: plaque },
      ...hexes.map((rect) => ({ type: 'rect' as const, rect })),
      ...(railBadge ? [{ type: 'circle' as const, c: railBadge, r: RAIL_BADGE_R }] : []),
    ]
    const bounds = union([plaque, ...hexes, ...(railBadge ? [circleBox(railBadge, RAIL_BADGE_R)] : [])])
    return { parts: { type: 'stop', plaque, hexes }, bounds, railBadge, fontSize: STOP_FONT, solids }
  }

  // Hub: medallion at (0, 0), two hexagons on top, ribbon across the middle, price badge to the left.
  const R = MEDALLION_R
  const text = measure(name, boardFont(HUB_FONT, HUB_WEIGHT), HUB_FONT * HUB_TRACKING)
  const ribbonW = Math.max(R * 2 + 20, Math.ceil(text + 26))
  const ribbon = { x: -ribbonW / 2, y: -RIBBON_H / 2 - 1, w: ribbonW, h: RIBBON_H }
  const hexes = hexPair(0, -R)
  const badge = { x: -R - PRICE_BADGE, y: ribbon.y - PRICE_BADGE - 3, w: PRICE_BADGE, h: PRICE_BADGE }
  const n = location.buys.length
  const iconsW = n * BUY_ICON + (n - 1) * BUY_GAP
  const icons = location.buys.map((_, i) => ({ x: -iconsW / 2 + i * (BUY_ICON + BUY_GAP), y: ribbon.y + ribbon.h + 3, w: BUY_ICON, h: BUY_ICON }))
  const tails = { x: ribbon.x - RIBBON_TAIL, y: ribbon.y + 2, w: ribbon.w + RIBBON_TAIL * 2, h: ribbon.h + 3 }
  const railBadge = railOnly ? { x: ribbon.x + ribbon.w, y: ribbon.y } : null
  const solids: Solid[] = [
    { type: 'circle', c: { x: 0, y: 0 }, r: R + 1 },
    { type: 'rect', rect: tails },
    ...hexes.map((rect) => ({ type: 'rect' as const, rect })),
    { type: 'rect', rect: badge },
    ...(railBadge ? [{ type: 'circle' as const, c: railBadge, r: RAIL_BADGE_R }] : []),
  ]
  const bounds = union([circleBox({ x: 0, y: 0 }, R + 1), tails, ...hexes, badge, ...(railBadge ? [circleBox(railBadge, RAIL_BADGE_R)] : [])])
  return { parts: { type: 'hub', medallion: { x: 0, y: 0 }, hexes, ribbon, badge, icons }, bounds, railBadge, fontSize: HUB_FONT, solids }
}

/** Two HEX squares, HEX_GAP apart, centred on (cx, top) and overlapping that edge by HEX_OVERLAP. */
function hexPair(cx: number, top: number): Rect[] {
  return [-1, 1].map((side) => ({ x: cx + side * (HEX / 2 + HEX_GAP / 2) - HEX / 2, y: top + HEX_OVERLAP - HEX, w: HEX, h: HEX }))
}

/** Distance from p to the nearest shape the group draws (0 inside). */
export function distanceToGroup(group: Pick<GroupLayout, 'solids'>, p: Point): number {
  let nearest = Infinity
  for (const s of group.solids) nearest = Math.min(nearest, s.type === 'rect' ? distanceToRect(p, s.rect) : Math.max(0, distance(p, s.c) - s.r))
  return nearest
}

/* ---- Collision pass ------------------------------------------------------- */

/** How far a ray from inside a rect travels before leaving it. */
function exitDistance(r: Rect, from: Point, dir: Point): number {
  const tx = dir.x > 1e-9 ? (r.x + r.w - from.x) / dir.x : dir.x < -1e-9 ? (r.x - from.x) / dir.x : Infinity
  const ty = dir.y > 1e-9 ? (r.y + r.h - from.y) / dir.y : dir.y < -1e-9 ? (r.y - from.y) / dir.y : Infinity
  return Math.max(0, Math.min(tx, ty))
}

/** The nearest centre that keeps the whole group inside SAFE_AREA. */
function clampToSafeArea(shape: Shape, center: Point): Point {
  const half = { x: shape.bounds.w / 2, y: shape.bounds.h / 2 }
  const { x, y, w, h } = SAFE_AREA
  return {
    x: Math.min(x + w - half.x, Math.max(x + half.x, center.x)),
    y: Math.min(y + h - half.y, Math.max(y + half.y, center.y)),
  }
}

/** How far a rect sticks out of SAFE_AREA (0 when it's inside). */
export function outsideSafeArea(r: Rect): number {
  const { x, y, w, h } = SAFE_AREA
  return Math.max(0, x - r.x, y - r.y, r.x + r.w - (x + w), r.y + r.h - (y + h))
}

interface Body {
  id: string
  shape: Shape
  /** The labelOffset in view units (zero unless placed by hand): the group's centre minus the location's point. */
  offset: Point
  center: Point
  fixed: boolean
}

const boundsAt = (b: Body): Rect => ({ x: b.center.x - b.shape.bounds.w / 2, y: b.center.y - b.shape.bounds.h / 2, w: b.shape.bounds.w, h: b.shape.bounds.h })

/**
 * Push overlapping groups apart, up to MAX_ITERATIONS times: each pair along
 * the direction that needs the smaller move, linked pairs far enough apart for
 * their link space, and groups a route ran into last time off that route.
 * After every pass, groups that crossed the safe area's edge move back inside.
 * With `reach`, no group ends up further than that from where it started.
 * Deterministic: the same board always lays out the same way.
 */
function relax(bodies: Body[], linked: Set<string>, avoid: { body: Body; line: Polyline; clearance: number }[], reach = Infinity) {
  const start = new Map(bodies.map((b) => [b, b.center]))
  const move = (a: Body, b: Body, d: Point) => {
    // Push a by −d and b by +d, sharing the move unless one is pinned.
    const share = a.fixed || b.fixed ? 1 : 0.5
    if (!a.fixed) a.center = { x: a.center.x - d.x * share, y: a.center.y - d.y * share }
    if (!b.fixed) b.center = { x: b.center.x + d.x * share, y: b.center.y + d.y * share }
  }
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const before = bodies.map((b) => b.center)
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i]
        const b = bodies[j]
        if (a.fixed && b.fixed) continue
        const ra = boundsAt(a)
        const rb = boundsAt(b)
        if (linked.has(`${a.id}|${b.id}`)) {
          // Room for the link space between them: along the line joining them (the route is near-straight),
          // and clear of both rectangles at its sides too, which a diagonal link needs more of.
          const span = distance(a.center, b.center) || 1
          const dir = { x: (b.center.x - a.center.x) / span, y: (b.center.y - a.center.y) / span }
          const exitA = exitDistance(ra, a.center, dir)
          const gap = span - exitA - exitDistance(rb, b.center, { x: -dir.x, y: -dir.y })
          const middle = { x: a.center.x + dir.x * (exitA + gap / 2), y: a.center.y + dir.y * (exitA + gap / 2) }
          const room = Math.min(spaceGap(spine(middle, dir), ra), spaceGap(spine(middle, dir), rb))
          const need = Math.max(LINK_GAP - gap, (MIN_GAP + 1 - room) * 2)
          if (need > 0) move(a, b, { x: dir.x * need, y: dir.y * need })
        }
        const gap = rectGap(ra, rb)
        if (gap < MIN_GAP) {
          const ca = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 }
          const cb = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 }
          const sepX = Math.max(rb.x - (ra.x + ra.w), ra.x - (rb.x + rb.w))
          const sepY = Math.max(rb.y - (ra.y + ra.h), ra.y - (rb.y + rb.h))
          const sx = Math.sign(cb.x - ca.x) || 1
          const sy = Math.sign(cb.y - ca.y) || 1
          if (sepX < 0 && sepY < 0) {
            // Overlapping: separate along the axis that needs the smaller move.
            const needX = MIN_GAP - sepX
            const needY = MIN_GAP - sepY
            move(a, b, needX < needY ? { x: sx * needX, y: 0 } : { x: 0, y: sy * needY })
          } else if (sepY < 0) move(a, b, { x: sx * (MIN_GAP - sepX), y: 0 })
          else if (sepX < 0) move(a, b, { x: 0, y: sy * (MIN_GAP - sepY) })
          else {
            const d = Math.hypot(sepX, sepY) || 1
            const k = (MIN_GAP - d) / d
            move(a, b, { x: sx * sepX * k, y: sy * sepY * k })
          }
        }
      }
    }
    // Step aside from routes (and link spaces) that ran into this group last time.
    for (const { body, line, clearance } of avoid) {
      if (body.fixed) continue
      const rect = boundsAt(body)
      let nearest = { d: Infinity, at: line.points[0] }
      for (const q of line.points) {
        const d = distanceToRect(q, rect)
        if (d < nearest.d) nearest = { d, at: q }
      }
      if (nearest.d >= clearance) continue
      const away = sub(body.center, nearest.at)
      const len = Math.hypot(away.x, away.y) || 1
      const push = Math.min(clearance - nearest.d, 2)
      body.center = { x: body.center.x + (away.x / len) * push, y: body.center.y + (away.y / len) * push }
    }
    // The safe area is a hard edge: whatever crossed it moves back inside, and the next pass settles the rest.
    for (const b of bodies) {
      const from = start.get(b)!
      const moved = distance(b.center, from)
      if (moved > reach) b.center = lerp(from, b.center, reach / moved)
      b.center = clampToSafeArea(b.shape, b.center)
    }
    if (bodies.every((b, i) => Math.abs(b.center.x - before[i].x) + Math.abs(b.center.y - before[i].y) < 0.01)) break
  }
}

export function layoutGroups(board: BoardData, measure: MeasureText, avoid: Avoid[] = []): GroupsLayout {
  const linked = new Set<string>()
  const index = new Map(board.locations.map((l, i) => [l.id, i]))
  for (const link of board.links) {
    const [i, j] = [index.get(link.from)!, index.get(link.to)!].sort((x, y) => x - y)
    linked.add(`${board.locations[i].id}|${board.locations[j].id}`)
  }
  const bodies: Body[] = board.locations.map((location) => {
    const raw = rawShape(location, measure)
    const c = { x: raw.bounds.x + raw.bounds.w / 2, y: raw.bounds.y + raw.bounds.h / 2 }
    const shape = moveShape(raw, { x: -c.x, y: -c.y })
    const fixed = location.labelOffset !== undefined
    const offset = fixed ? toView(location.labelOffset!) : { x: 0, y: 0 }
    return { id: location.id, shape, offset, center: clampToSafeArea(shape, add(toView(location), offset)), fixed }
  })
  const byId = new Map(bodies.map((b) => [b.id, b]))
  // First among each other; then, if routes ran into groups last time, stepping aside within REACH of that.
  relax(bodies, linked, [])
  if (avoid.length) {
    relax(
      bodies,
      linked,
      avoid.map((a) => ({ body: byId.get(a.id)!, line: a.line, clearance: a.clearance })),
      REACH,
    )
  }

  const groups = new Map<string, GroupLayout>()
  for (const [i, body] of bodies.entries()) {
    const placed = moveShape(body.shape, body.center)
    // The location's point goes wherever its group went.
    const point = sub(body.center, body.offset)
    groups.set(body.id, { ...placed, location: board.locations[i], point, center: body.center, fixed: body.fixed })
  }
  return { groups, problems: groupProblems([...groups.values()]) }
}

/** Groups closer than MIN_GAP to each other, or sticking out of the safe area, by name. Empty means none. */
export function groupProblems(groups: GroupLayout[]): string[] {
  const problems: string[] = []
  for (let i = 0; i < groups.length; i++) {
    const out = outsideSafeArea(groups[i].bounds)
    if (out > 0.05) problems.push(`${groups[i].location.name} sticks ${round(out)} out of the safe area`)
    for (let j = i + 1; j < groups.length; j++) {
      const gap = rectGap(groups[i].bounds, groups[j].bounds)
      if (gap < MIN_GAP - 0.05) problems.push(`${groups[i].location.name} and ${groups[j].location.name} overlap: ${round(gap)} apart, need ${MIN_GAP}`)
    }
  }
  return problems
}

const round = (n: number) => Math.round(n * 10) / 10

/* ---- Routes --------------------------------------------------------------- */

/** Points along a link space's long axis: with radius SPACE_R they cover the space and its token. */
function spine(at: Point, tangent: Point): Point[] {
  return [-1, -0.5, 0, 0.5, 1].map((k) => ({ x: at.x + tangent.x * SPACE_SPINE * k, y: at.y + tangent.y * SPACE_SPINE * k }))
}

/** How far a disc of radius r at p sticks out of SAFE_AREA (0 when it's inside). */
function outOfSafeArea(p: Point, r: number): number {
  const { x, y, w, h } = SAFE_AREA
  return Math.max(0, x + r - p.x, p.x - (x + w - r), y + r - p.y, p.y - (y + h - r))
}

/** Room between a link space (its spine points, radius SPACE_R) and a location's rectangle. */
const spaceGap = (points: Point[], r: Rect) => Math.min(...points.map((p) => distanceToRect(p, r))) - SPACE_R

/** The part of a route between where it comes out from under its first group's rectangle and goes under its second's. */
function visiblePart(line: Polyline, a: Rect, b: Rect): { from: number; to: number; part: Polyline } {
  const inside = (p: Point, r: Rect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
  let i = 0
  while (i < line.points.length - 1 && inside(line.points[i], a)) i++
  let j = line.points.length - 1
  while (j > i && inside(line.points[j], b)) j--
  return { from: line.lengths[i], to: line.lengths[j], part: polyline(line.points.slice(i, j + 1)) }
}

/**
 * A link's curve: from the centre of one group to the centre of the other,
 * so it leaves each location on the side facing the other and both ends are
 * hidden under the art. Straight, or one gentle arc: the link's `bend` in
 * board.json puts the control point that many % of the link's length off the
 * midpoint, to the right going from `from` to `to` (negative: to the left).
 */
export function routeCurve(link: BoardLink, a: Point, b: Point): Cubic {
  const bend = Math.max(-MAX_BEND, Math.min(MAX_BEND, link.bend ?? 0))
  return quadraticArc(a, b, bend / 100)
}

/** The curve's midpoint: where the editor's bend handle sits. */
export const bendHandle = (route: RouteLayout): Point => cubicAt(route.segments[0], 0.5)

/**
 * The bend (in %, rounded to 0.5, within ±MAX_BEND) that puts a route's
 * midpoint nearest to `p`: the editor's handle, dragged across the link.
 */
export function bendThrough(route: RouteLayout, p: Point): number {
  const { p0: a, p3: b } = route.segments[0]
  const chord = distance(a, b) || 1
  // The curve's midpoint is half the control point's offset off the chord.
  const off = dot(sub(p, lerp(a, b, 0.5)), unitNormal(a, b))
  const bend = Math.round(((2 * off) / chord) * 100 * 2) / 2
  return Math.max(-MAX_BEND, Math.min(MAX_BEND, bend)) || 0
}

const dot = (u: Point, v: Point) => u.x * v.x + u.y * v.y

/** Where along a route its bubble may sit: the middle first, then further out on either side. */
const SLIDE = [0.5, ...Array.from({ length: 16 }, (_, i) => 0.5 + (i % 2 ? 1 : -1) * 0.025 * Math.ceil((i + 1) / 2))]

/**
 * Lay out the routes that exist in an era: each link's curve (as board.json
 * bends it, nothing automatic) and its link space, at the middle of the
 * visible part or slid along it to clear the groups and the other spaces.
 */
export function layoutRoutes(board: BoardData, groupsLayout: GroupsLayout, era: Era): RoutesLayout {
  const { groups } = groupsLayout
  const all = [...groups.values()]
  const width = TRACK_H[era]
  const curves = board.links
    .filter((l) => isLinkActive(l.type, era))
    .map((link) => {
      const [ga, gb] = [groups.get(link.from)!, groups.get(link.to)!]
      const segments: [Cubic] = [routeCurve(link, ga.center, gb.center)]
      const line = flatten(segments, 2)
      return { link, ga, gb, segments, line, visible: visiblePart(line, ga.bounds, gb.bounds) }
    })

  const routes = new Map<string, RouteLayout>()
  const spaces: Point[][] = []
  for (const c of curves) {
    const { from, to } = c.visible
    const others = curves.filter((o) => o !== c).map((o) => o.visible.part)
    let best = { bad: Infinity, ...pointAtLength(c.line, (from + to) / 2) }
    for (const f of SLIDE) {
      const at = pointAtLength(c.line, from + (to - from) * f)
      const s = spine(at.point, at.tangent)
      let bad = 0
      for (const g of all) for (const p of s) bad += Math.max(0, SPACE_R + MIN_GAP - distanceToRect(p, g.bounds))
      for (const p of s) bad += outOfSafeArea(p, SPACE_R)
      for (const other of spaces) {
        let nearest = Infinity
        for (const p of s) for (const q of other) nearest = Math.min(nearest, distance(p, q))
        bad += Math.max(0, 2 * SPACE_R + MIN_GAP - nearest)
      }
      for (const line of others) for (const p of s) bad += Math.max(0, SPACE_R + width / 2 + 1 - distanceToLine(p, line)) * 0.2
      if (bad < best.bad - 1e-6) best = { bad, point: at.point, tangent: at.tangent }
      if (bad === 0) break
    }
    spaces.push(spine(best.point, best.tangent))
    routes.set(c.link.id, {
      link: c.link,
      era,
      segments: c.segments,
      line: c.line,
      visible: c.visible.part,
      width,
      marker: { x: best.point.x, y: best.point.y, angle: (Math.atan2(best.tangent.y, best.tangent.x) * 180) / Math.PI },
    })
  }
  return { era, routes, problems: routeProblems(era, [...routes.values()], all) }
}

/** Overlaps left after layout in one era, by name. Empty means a clean board. */
function routeProblems(era: Era, routes: RouteLayout[], groups: GroupLayout[]): string[] {
  const problems: string[] = []
  const names = new Map(groups.map((g) => [g.location.id, g.location.name]))
  const routeName = (r: RouteLayout) => `${names.get(r.link.from)}–${names.get(r.link.to)}`
  const spines = routes.map((r) => {
    const rad = (r.marker.angle * Math.PI) / 180
    return spine(r.marker, { x: Math.cos(rad), y: Math.sin(rad) })
  })
  routes.forEach((route, i) => {
    const half = route.width / 2
    if (route.line.points.some((p) => outOfSafeArea(p, half) > 0.05)) problems.push(`${era}: the ${routeName(route)} route leaves the safe area`)
    if (spines[i].some((p) => outOfSafeArea(p, SPACE_R) > 0.05)) problems.push(`${era}: the ${routeName(route)} link space leaves the safe area`)
    for (const g of groups) {
      // No location's rectangle may cover a link space, its own two included.
      const room = spaceGap(spines[i], g.bounds)
      if (room < MIN_GAP - 0.05) problems.push(`${era}: the ${routeName(route)} link space is ${round(room)} from ${g.location.name}`)
      if (g.location.id === route.link.from || g.location.id === route.link.to) continue
      const run = Math.min(...route.visible.points.map((p) => distanceToGroup(g, p))) - half
      if (run < 0) problems.push(`${era}: the ${routeName(route)} route runs over ${g.location.name}`)
    }
    for (let j = i + 1; j < routes.length; j++) {
      let nearest = Infinity
      for (const p of spines[i]) for (const q of spines[j]) nearest = Math.min(nearest, distance(p, q))
      if (nearest - 2 * SPACE_R < MIN_GAP - 0.05) problems.push(`${era}: the ${routeName(route)} and ${routeName(routes[j])} link spaces are ${round(nearest - 2 * SPACE_R)} apart`)
      const gap = lineGap(route.visible, routes[j].visible)
      if (gap < (route.width + routes[j].width) / 2) problems.push(`${era}: the ${routeName(route)} and ${routeName(routes[j])} routes overlap`)
    }
  })
  return problems
}

/** Routes that ran into groups (or put a link space too close to one): each group must step aside. */
function blockers(routes: RouteLayout[], groups: GroupLayout[]): Avoid[] {
  const found: Avoid[] = []
  for (const route of routes) {
    const rad = (route.marker.angle * Math.PI) / 180
    const space = polyline(spine(route.marker, { x: Math.cos(rad), y: Math.sin(rad) }))
    for (const g of groups) {
      const own = g.location.id === route.link.from || g.location.id === route.link.to
      if (!own && Math.min(...route.visible.points.map((p) => distanceToGroup(g, p))) < route.width / 2 + TRIM) {
        found.push({ id: g.location.id, line: route.visible, clearance: route.width / 2 + TRIM + 2 })
      }
      if (spaceGap(space.points, g.bounds) < MIN_GAP) {
        found.push({ id: g.location.id, line: space, clearance: SPACE_R + MIN_GAP + 1 })
      }
    }
  }
  return found
}

export interface BoardLayout {
  groups: Map<string, GroupLayout>
  /** Routes per era (only the eras asked for). */
  routes: Partial<Record<Era, RoutesLayout>>
  /** Every problem left, both eras. Empty means a clean board. */
  problems: string[]
}

/**
 * The whole layout: groups, then both eras' routes. Where a route still runs
 * into a group, or a link space sits too close to one, that group steps aside
 * and the layout is redone (a few passes at most). Each pass can also make
 * things worse elsewhere, so the best pass wins: fewest problems, then the
 * least drift of groups from their towns. Groups are shared by both eras, so
 * the board doesn't shift when the era changes.
 */
export function layoutBoard(board: BoardData, measure: MeasureText, options: { eras?: Era[] } = {}): BoardLayout {
  const eras = options.eras ?? (['canal', 'rail'] as const)
  const passes = 5
  let avoid: Avoid[] = []
  let best: { layout: BoardLayout; drift: number } | null = null
  for (let pass = 0; pass < passes; pass++) {
    const groups = layoutGroups(board, measure, avoid)
    const routes = eras.map((era) => layoutRoutes(board, groups, era))
    const layout: BoardLayout = {
      groups: groups.groups,
      routes: Object.fromEntries(routes.map((r) => [r.era, r])),
      problems: [...groups.problems, ...routes.flatMap((r) => r.problems)],
    }
    // How far groups moved from where the data puts them.
    const drift = [...groups.groups.values()].reduce((sum, g) => sum + distance(g.center, add(toView(g.location), g.location.labelOffset ? toView(g.location.labelOffset) : { x: 0, y: 0 })), 0)
    if (!best || layout.problems.length < best.layout.problems.length || (layout.problems.length === best.layout.problems.length && drift < best.drift)) {
      best = { layout, drift }
    }
    if (!layout.problems.length) break
    const all = [...groups.groups.values()]
    const more = routes.flatMap((r) => blockers([...r.routes.values()], all))
    if (!more.length) break
    avoid = [...avoid, ...more]
  }
  return best!.layout
}

/** The bounds of a group, padded, for highlights. */
export const groupBox = (g: GroupLayout, pad: number): Rect => inflate(g.bounds, pad)

