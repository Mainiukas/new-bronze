/**
 * Geometry for the illustrated board. Board data is in % of the image; the
 * SVG overlay uses viewBox 0 0 1000 1000, so view units = % × 10.
 *
 * A link is a cubic Bézier between its two ends (or a Catmull-Rom spline
 * through its bend points). Curves are flattened into polylines measured
 * by arc length for layout checks; textures are laid along the SVG path.
 */

export const VIEW = 1000
export const UNITS_PER_PERCENT = VIEW / 100

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A cubic Bézier segment. */
export interface Cubic {
  p0: Point
  p1: Point
  p2: Point
  p3: Point
}

export const toView = (p: Point): Point => ({ x: p.x * UNITS_PER_PERCENT, y: p.y * UNITS_PER_PERCENT })
export const toPercent = (p: Point): Point => ({ x: p.x / UNITS_PER_PERCENT, y: p.y / UNITS_PER_PERCENT })

export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k })
export const length = (a: Point) => Math.hypot(a.x, a.y)
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** Unit vector perpendicular to a→b (rotated 90° clockwise on screen). */
export function unitNormal(a: Point, b: Point): Point {
  const d = sub(b, a)
  const len = length(d) || 1
  return { x: -d.y / len, y: d.x / len }
}

/* ---- Curves --------------------------------------------------------------- */

export function cubicAt({ p0, p1, p2, p3 }: Cubic, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y }
}

/**
 * A link's curve from a to b: one quadratic arc, as the equivalent cubic.
 * Its control point sits `bend` (a fraction of the chord) off the chord's
 * midpoint, on the unitNormal side (the right, going from a to b); 0 is a
 * straight line. The curve's own midpoint is half that far off the chord.
 */
export function quadraticArc(a: Point, b: Point, bend: number): Cubic {
  const control = add(lerp(a, b, 0.5), scale(unitNormal(a, b), bend * distance(a, b)))
  return { p0: a, p1: lerp(a, control, 2 / 3), p2: lerp(b, control, 2 / 3), p3: b }
}

/** SVG path data for cubic segments. */
export function cubicPath(segments: Cubic[]): string {
  const f = (n: number) => Math.round(n * 100) / 100
  if (!segments.length) return ''
  return (
    `M${f(segments[0].p0.x)} ${f(segments[0].p0.y)}` +
    segments.map((s) => `C${f(s.p1.x)} ${f(s.p1.y)} ${f(s.p2.x)} ${f(s.p2.y)} ${f(s.p3.x)} ${f(s.p3.y)}`).join('')
  )
}

/* ---- Polylines ------------------------------------------------------------ */

/** A flattened curve with cumulative arc lengths: `lengths[i]` is the distance along it to `points[i]`. */
export interface Polyline {
  points: Point[]
  lengths: number[]
  total: number
}

export function polyline(points: Point[]): Polyline {
  const lengths = [0]
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + distance(points[i - 1], points[i]))
  return { points, lengths, total: lengths[lengths.length - 1] ?? 0 }
}

/** Flatten cubic segments into a polyline with steps of about `step` units. */
export function flatten(segments: Cubic[], step = 2): Polyline {
  const points: Point[] = []
  segments.forEach((segment, i) => {
    const rough = distance(segment.p0, segment.p1) + distance(segment.p1, segment.p2) + distance(segment.p2, segment.p3)
    const n = Math.max(4, Math.ceil(rough / step))
    for (let k = i === 0 ? 0 : 1; k <= n; k++) points.push(cubicAt(segment, k / n))
  })
  return polyline(points)
}

/** The point at arc length s, and the unit tangent there. */
export function pointAtLength(line: Polyline, s: number): { point: Point; tangent: Point } {
  const { points, lengths } = line
  if (points.length < 2) return { point: points[0] ?? { x: 0, y: 0 }, tangent: { x: 1, y: 0 } }
  const clamped = Math.min(line.total, Math.max(0, s))
  let lo = 0
  let hi = points.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (lengths[mid] <= clamped) lo = mid
    else hi = mid
  }
  const i = Math.min(lo, points.length - 2)
  const span = lengths[i + 1] - lengths[i] || 1
  const d = sub(points[i + 1], points[i])
  const len = length(d) || 1
  return { point: lerp(points[i], points[i + 1], (clamped - lengths[i]) / span), tangent: { x: d.x / len, y: d.y / len } }
}

/** SVG path data for a polyline, rounded to 0.1 unit. */
export function polylinePath(line: Polyline): string {
  const f = (n: number) => Math.round(n * 10) / 10
  return line.points.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`).join('')
}

function segmentDistance(p: Point, a: Point, b: Point): number {
  const d = sub(b, a)
  const len2 = d.x * d.x + d.y * d.y
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / len2)) : 0
  return distance(p, { x: a.x + d.x * t, y: a.y + d.y * t })
}

/** Distance from a point to a polyline. */
export function distanceToLine(p: Point, line: Polyline): number {
  let nearest = Infinity
  for (let i = 1; i < line.points.length; i++) nearest = Math.min(nearest, segmentDistance(p, line.points[i - 1], line.points[i]))
  return line.points.length === 1 ? distance(p, line.points[0]) : nearest
}

/** Smallest distance between two polylines (0 if they cross). */
export function lineGap(a: Polyline, b: Polyline): number {
  let nearest = Infinity
  for (const p of a.points) nearest = Math.min(nearest, distanceToLine(p, b))
  for (const p of b.points) nearest = Math.min(nearest, distanceToLine(p, a))
  return segmentsCross(a, b) ? 0 : nearest
}

function segmentsCross(a: Polyline, b: Polyline): boolean {
  const cross = (o: Point, p: Point, q: Point) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x)
  for (let i = 1; i < a.points.length; i++) {
    for (let j = 1; j < b.points.length; j++) {
      const [p1, p2, q1, q2] = [a.points[i - 1], a.points[i], b.points[j - 1], b.points[j]]
      const d1 = cross(q1, q2, p1)
      const d2 = cross(q1, q2, p2)
      const d3 = cross(p1, p2, q1)
      const d4 = cross(p1, p2, q2)
      if (d1 * d2 < 0 && d3 * d4 < 0) return true
    }
  }
  return false
}

/* ---- Texture pieces ------------------------------------------------------- */

/**
 * One piece of a textured route: a quad between the route's normals at two
 * points along it, filled with the texture rotated to the route there. `u` is
 * where the piece starts in the repeating texture. Neighbouring quads share
 * an edge exactly, so pieces sit edge to edge with no overlap and no gap.
 */
export interface TexturePiece {
  quad: [Point, Point, Point, Point]
  x: number
  y: number
  angle: number
  u: number
}

/**
 * Cut a route into texture pieces. `at(s)` gives the point and unit tangent
 * at arc length s (from getPointAtLength, or a polyline). Each repeat of the
 * texture (`pieceLength`) is split into equal pieces of at most `maxPiece` so
 * they follow the curve; the last one stops exactly at the end.
 */
export function texturePieces(
  at: (s: number) => { point: Point; tangent: Point },
  total: number,
  pieceLength: number,
  height: number,
  maxPiece = 12,
): TexturePiece[] {
  const step = pieceLength / Math.max(1, Math.ceil(pieceLength / maxPiece))
  const half = height / 2 + 1
  const pieces: TexturePiece[] = []
  for (let s = 0; s < total - 0.01; s += step) {
    const e = Math.min(total, s + step)
    const a = at(s)
    const b = at(e)
    const na = { x: -a.tangent.y, y: a.tangent.x }
    const nb = { x: -b.tangent.y, y: b.tangent.x }
    pieces.push({
      quad: [add(a.point, scale(na, half)), add(b.point, scale(nb, half)), sub(b.point, scale(nb, half)), sub(a.point, scale(na, half))],
      x: a.point.x,
      y: a.point.y,
      angle: (Math.atan2(b.point.y - a.point.y, b.point.x - a.point.x) * 180) / Math.PI,
      u: s % pieceLength,
    })
  }
  return pieces
}

/**
 * The rotation for art laid along a route (link tokens): if the route's angle
 * is between 90° and 270°, turn it 180° so the barge or train is never upside down.
 */
export function upright(angle: number): number {
  const a = ((angle % 360) + 360) % 360
  return a > 90 && a < 270 ? a - 180 : a
}

/* ---- Rects ---------------------------------------------------------------- */

export const inflate = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + by * 2, h: r.h + by * 2 })

export function union(rects: Rect[]): Rect {
  const x0 = Math.min(...rects.map((r) => r.x))
  const y0 = Math.min(...rects.map((r) => r.y))
  const x1 = Math.max(...rects.map((r) => r.x + r.w))
  const y1 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Distance from a point to a rect (0 inside). */
export function distanceToRect(p: Point, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w))
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h))
  return Math.hypot(dx, dy)
}

/** Gap between two rects (negative when they overlap, by the smaller penetration). */
export function rectGap(a: Rect, b: Rect): number {
  const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
  const gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
  if (gx < 0 && gy < 0) return Math.max(gx, gy)
  if (gx < 0) return gy
  if (gy < 0) return gx
  return Math.hypot(gx, gy)
}

/* ---- Percentages ---------------------------------------------------------- */

/** Round a percentage to one decimal, clamped to the image. */
export function roundPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10
}
