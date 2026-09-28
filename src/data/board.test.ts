import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  bentCubic,
  catmullRom,
  convexHull,
  cubicAt,
  distance,
  distanceToRect,
  flatten,
  lineGap,
  outline,
  outlinePoint,
  polyline,
  rayExit,
  rectGap,
  texturePieces,
  toView,
  upright,
  pointAtLength,
  type Point,
  type Rect,
} from '../components/board/geometry'
import {
  BUBBLE_H,
  BUBBLE_W,
  FAN,
  groupProblems,
  HEX,
  layoutBoard,
  layoutGroups,
  MEDALLION_R,
  MIN_GAP,
  outsideSafeArea,
  SAFE_AREA,
  TEXTURE_PIECE,
  TILE,
  TILE_GAP,
  TRACK_H,
  type RouteLayout,
} from '../components/board/layout'
import { createTextMeasurer } from '../components/board/measure'
import { LinkBubble, LinkToken } from '../components/board/parts'
import {
  BOARD,
  BOARD_DESIGN,
  degrees,
  HUB_GOODS,
  designProblems,
  formatBoardJson,
  INDUSTRY_IDS,
  isLinkActive,
  parseBoardData,
  reachable,
  validateBoardData,
  type BoardData,
} from './board'
import boardFile from './board.json?raw'

describe('board.json', () => {
  it('is valid and complete: 25 locations and 39 links', () => {
    expect(validateBoardData(BOARD)).toEqual([])
    const byType = (t: string) => BOARD.locations.filter((l) => l.type === t).map((l) => l.id)
    expect(byType('hub')).toEqual(['the_north', 'london', 'west_wales'])
    expect(byType('stop')).toEqual(['brecon', 'reading', 'taunton'])
    expect(byType('city')).toHaveLength(19)
    expect(BOARD.links).toHaveLength(39)
  })

  it('uses only the five industries, and hubs buy only cotton, coal and iron', () => {
    expect([...INDUSTRY_IDS].sort()).toEqual(['coal', 'cotton', 'iron', 'port', 'shipyard'])
    const used = new Set(BOARD.locations.flatMap((l) => (l.type === 'city' ? l.slots.flat() : [])))
    expect([...used].sort()).toEqual(['coal', 'cotton', 'iron', 'port', 'shipyard'])
    for (const l of BOARD.locations) if (l.type === 'hub') for (const goods of l.buys) expect(HUB_GOODS).toContain(goods)
  })

  it('has unique ids and every position within 0–100 %', () => {
    const ids = [...BOARD.locations.map((l) => l.id), ...BOARD.links.map((l) => l.id)]
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of BOARD.locations) {
      for (const v of [l.x, l.y]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
    const pairs = BOARD.links.map((l) => [l.from, l.to].sort().join('|'))
    expect(new Set(pairs).size).toBe(39)
  })

  it('matches the design for a few spot checks', () => {
    const at = (id: string) => BOARD.locations.find((l) => l.id === id)
    expect(at('lichfield')).toMatchObject({ type: 'city', slots: [['coal']], region: 'midlands' })
    expect(at('merthyr')).toMatchObject({ slots: [['iron'], ['iron'], ['coal']] })
    expect(at('bristol')).toMatchObject({ slots: [['cotton', 'port'], ['cotton', 'port'], ['cotton', 'iron'], ['coal']] })
    expect(at('london')).toMatchObject({ type: 'hub', price: 7, buys: ['cotton', 'coal', 'iron'] })
    expect(at('the_north')).toMatchObject({ type: 'hub', price: 6, buys: ['cotton', 'coal'], era: 'rail', ring: 1 })
    expect(at('west_wales')).toMatchObject({ type: 'hub', price: 5, buys: ['cotton', 'coal'], ring: 2 })
    for (const hub of BOARD.locations.filter((l) => l.type === 'hub')) expect('value' in hub).toBe(false)
    expect(BOARD.locations.filter((l) => l.era === 'rail').map((l) => l.id)).toEqual(['the_north', 'taunton', 'plymouth'])
    expect(BOARD.links.find((l) => l.id === 'the_north-stoke')?.type).toBe('rail')
  })

  it('exports byte-for-byte as the checked-in file', () => {
    // Git may check the file out with Windows line endings.
    expect(formatBoardJson(BOARD)).toBe(boardFile.replace(/\r\n/g, '\n'))
  })

  it('exports valid JSON that round-trips after edits, in a stable key order', () => {
    const edited: BoardData = {
      ...BOARD,
      locations: BOARD.locations.map((l) => (l.id === 'bristol' ? { ...l, x: 55.4, y: 57.9, labelOffset: { x: -1.2, y: 0.5 } } : l)),
      links: BOARD.links.map((l) => (l.id === 'bristol-taunton' ? { ...l, points: [[50.1, 63.2]] } : l)),
    }
    const text = formatBoardJson(edited)
    expect(parseBoardData(JSON.parse(text))).toEqual(edited)
    expect(text).toMatch(/"ring": 1, "labelOffset": \{"x":-1.2,"y":0.5\}, "slots"/)
  })

  it('rejects broken data with readable errors', () => {
    const broken = {
      ...BOARD,
      locations: [...BOARD.locations, { id: 'nowhere', name: 'Nowhere', type: 'city', x: 120, y: 5, region: 'mars', slots: [['gold']] }],
      links: [
        ...BOARD.links,
        { id: 'x', from: 'bristol', to: 'atlantis', type: 'tram' },
        { id: 'y', from: 'stoke', to: 'the_north', type: 'both', points: [[1, 2], [3, 4], [5, 6], [7, 8]] },
      ],
    }
    const withBadHub = { ...broken, locations: broken.locations.map((l) => (l.id === 'london' ? { ...l, value: 12, buys: ['cotton', 'port'] } : l)) }
    const errors = validateBoardData(withBadHub).join('\n')
    expect(errors).toMatch(/nowhere: x and y/)
    expect(errors).toMatch(/unknown region "mars"/)
    expect(errors).toMatch(/known industries/)
    expect(errors).toMatch(/x: unknown from\/to/)
    expect(errors).toMatch(/x: type must be/)
    expect(errors).toMatch(/y: another link already joins/)
    expect(errors).toMatch(/y: points must be up to 3/)
    expect(errors).toMatch(/london: a hub buys a list of cotton, coal, iron/)
    expect(errors).toMatch(/london: hubs have no "value"/)
    expect(parseBoardData(broken)).toBeUndefined()
  })

  it('has only the current era’s links', () => {
    expect(isLinkActive('canal', 'canal')).toBe(true)
    expect(isLinkActive('rail', 'canal')).toBe(false)
    expect(isLinkActive('canal', 'rail')).toBe(false)
    expect(isLinkActive('both', 'rail')).toBe(true)
  })
})

/** The checks from the board spec (section 12). */
describe('design checks', () => {
  it('1. canal + both links from Birmingham reach everything except The North, Plymouth and Taunton', () => {
    const reached = reachable(BOARD, 'birmingham', 'canal')
    expect(BOARD.locations.filter((l) => !reached.has(l.id)).map((l) => l.id).sort()).toEqual(['plymouth', 'taunton', 'the_north'])
  })

  it('2. rail + both links reach every location', () => {
    expect(reachable(BOARD, 'birmingham', 'rail').size).toBe(25)
  })

  it('3. degrees add up to 78, with 16 both, 6 canal and 17 rail links', () => {
    expect([...degrees(BOARD).values()].reduce((a, b) => a + b, 0)).toBe(78)
    const count = (t: string) => BOARD.links.filter((l) => l.type === t).length
    expect([count('both'), count('canal'), count('rail')]).toEqual([16, 6, 17])
  })

  it('4. tile distribution: 2 cities with 4 slots, 4 with 3, 10 with 2, 3 with 1', () => {
    const tiles: Record<number, number> = {}
    for (const l of BOARD.locations) if (l.type === 'city') tiles[l.slots.length] = (tiles[l.slots.length] ?? 0) + 1
    expect(tiles).toEqual({ 4: 2, 3: 4, 2: 10, 1: 3 })
  })

  it('all together (the same check the dev build runs at start-up)', () => {
    expect(designProblems(BOARD, BOARD_DESIGN)).toEqual([])
  })

  it('reports a network that breaks the design', () => {
    const cut: BoardData = { ...BOARD, links: BOARD.links.filter((l) => l.id !== 'barnstaple-exeter') }
    const problems = designProblems(cut, BOARD_DESIGN).join('\n')
    expect(problems).toMatch(/unreachable: the_north, taunton, exeter, plymouth/)
    expect(problems).toMatch(/add up to 76, expected 78/)
    expect(problems).toMatch(/5 canal links, expected 6/)
  })

  it('5. no trace of the removed industries, drink tiles, merchant tiles, drawn industry icons or drawn link spaces in the code', () => {
    const sources = import.meta.glob<string>('../**/*.{ts,tsx,css}', { eager: true, query: '?raw', import: 'default' })
    // Spelled in pieces, so that grepping the code for these words finds nothing at all.
    const banned = new RegExp(
      [
        'manu' + 'facturer',
        'pot' + 'tery',
        'be' + 'er',
        'bar' + 'rel',
        'mer' + 'chant\\.png',
        'MERCHANT' + '_URL',
        'Hex' + 'Space',
        'flat' + 'Hexagon',
        'BOARD_' + 'ICONS',
        'INDUSTRY_' + 'GLYPHS',
        'Engine ' + 'Works',
        "'wor" + "ks'",
      ].join('|'),
      'i',
    )
    const offenders = Object.entries(sources)
      .filter(([, text]) => banned.test(text))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})

describe('curves and texture pieces', () => {
  const a = { x: 100, y: 500 }
  const b = { x: 500, y: 500 }

  it('bows a link by the given share of its length', () => {
    const mid = cubicAt(bentCubic(a, b, 0.1, 0.2), 0.5)
    expect(Math.abs(mid.y - 500)).toBeCloseTo(40)
  })

  it('passes a Catmull-Rom spline through its bend points', () => {
    const points = [a, { x: 300, y: 420 }, { x: 420, y: 560 }, b]
    const segments = catmullRom(points)
    expect(segments).toHaveLength(3)
    expect(segments[1].p0).toEqual(points[1])
    expect(segments[1].p3).toEqual(points[2])
  })

  it('lays texture pieces edge to edge with no overlap, the last one clipped at the end', () => {
    const line = flatten([bentCubic(a, b, 0.15)], 1)
    const at = (s: number) => pointAtLength(line, s)
    for (const era of ['canal', 'rail'] as const) {
      const pieces = texturePieces(at, line.total, TEXTURE_PIECE[era], TRACK_H[era])
      for (let i = 1; i < pieces.length; i++) {
        // Each piece starts exactly where the previous one ended…
        expect(pieces[i].quad[0]).toEqual(pieces[i - 1].quad[1])
        expect(pieces[i].quad[3]).toEqual(pieces[i - 1].quad[2])
        // …and carries on through the texture from there.
        const step = TEXTURE_PIECE[era] / Math.ceil(TEXTURE_PIECE[era] / 12)
        expect(pieces[i].u).toBeCloseTo((pieces[i - 1].u + step) % TEXTURE_PIECE[era], 5)
      }
      const end = at(line.total).point
      const last = pieces.at(-1)!
      expect(distance({ x: (last.quad[1].x + last.quad[2].x) / 2, y: (last.quad[1].y + last.quad[2].y) / 2 }, end)).toBeLessThan(0.01)
    }
  })

  it('turns tokens the right way up between 90° and 270°', () => {
    expect(upright(30)).toBe(30)
    expect(upright(120)).toBe(-60)
    expect(upright(-100)).toBe(80)
    expect(upright(270)).toBe(270 % 360)
  })

  it('finds where rays leave a hull, and measures route gaps', () => {
    const o = outline(convexHull([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }]))
    expect(o.perimeter).toBeCloseTo(40)
    const exit = outlinePoint(o, rayExit(o, { x: 5, y: 5 }, { x: 1, y: 0 }))
    expect(exit.x).toBeCloseTo(10)
    expect(exit.y).toBeCloseTo(5)
    expect(lineGap(polyline([{ x: 0, y: 0 }, { x: 10, y: 10 }]), polyline([{ x: 0, y: 10 }, { x: 10, y: 0 }]))).toBe(0)
    expect(lineGap(polyline([{ x: 0, y: 0 }, { x: 10, y: 0 }]), polyline([{ x: 0, y: 6 }, { x: 10, y: 6 }]))).toBeCloseTo(6)
  })
})

describe('board layout', () => {
  const layout = layoutBoard(BOARD, createTextMeasurer())
  const groups = [...layout.groups.values()]
  const routes = (era: 'canal' | 'rail'): RouteLayout[] => [...layout.routes[era]!.routes.values()]
  /** Points along a link space or token (52 × 21.7): with radius BUBBLE_H / 2 they cover it. */
  const spine = (r: RouteLayout): Point[] => {
    const rad = (r.marker.angle * Math.PI) / 180
    const reach = BUBBLE_W / 2 - BUBBLE_H / 2
    return [-1, -0.5, 0, 0.5, 1].map((k) => ({ x: r.marker.x + Math.cos(rad) * reach * k, y: r.marker.y + Math.sin(rad) * reach * k }))
  }
  const inside = (p: Point, r: Rect, pad = 0) => p.x >= r.x + pad && p.x <= r.x + r.w - pad && p.y >= r.y + pad && p.y <= r.y + r.h - pad

  it('6. leaves no problems in either era: no overlaps, nothing outside the safe area, no route over another', () => {
    expect(layout.problems).toEqual([])
    for (const era of ['canal', 'rail'] as const) {
      const list = routes(era)
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) expect(lineGap(list[i].visible, list[j].visible)).toBeGreaterThanOrEqual((list[i].width + list[j].width) / 2)
      }
    }
  })

  it('keeps every location rectangle (with its 8-unit margin) clear of every other', () => {
    expect(groupProblems(groups)).toEqual([])
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) expect(rectGap(groups[i].bounds, groups[j].bounds), `${groups[i].location.name} / ${groups[j].location.name}`).toBeGreaterThanOrEqual(MIN_GAP - 0.05)
    }
  })

  it('keeps every link space and token clear of every location rectangle, its own two included', () => {
    for (const era of ['canal', 'rail'] as const) {
      for (const r of routes(era)) {
        for (const g of groups) {
          const room = Math.min(...spine(r).map((p) => distanceToRect(p, g.bounds))) - BUBBLE_H / 2
          expect(room, `${era} ${r.link.id} / ${g.location.name}`).toBeGreaterThanOrEqual(MIN_GAP - 0.05)
        }
      }
    }
  })

  it('keeps every group, route, link space and token inside the safe area (clear of the painted frame)', () => {
    expect(SAFE_AREA).toEqual({ x: 90, y: 80, w: 820, h: 840 })
    for (const g of groups) expect(outsideSafeArea(g.bounds), g.location.name).toBe(0)
    for (const era of ['canal', 'rail'] as const) {
      for (const r of routes(era)) {
        for (const p of r.line.points) expect(inside(p, SAFE_AREA, r.width / 2 - 0.05), `${era} ${r.link.id}`).toBe(true)
        for (const p of spine(r)) expect(inside(p, SAFE_AREA, BUBBLE_H / 2 - 0.05), `${era} ${r.link.id} link space`).toBe(true)
      }
    }
  })

  it('puts the hubs on land inside the frame: The North at the top, West Wales far west, London on the right', () => {
    const at = (id: string) => layout.groups.get(id)!.bounds
    expect(at('the_north').y - SAFE_AREA.y).toBeLessThan(5)
    expect(at('west_wales').x - SAFE_AREA.x).toBeLessThan(5)
    const london = at('london')
    expect(SAFE_AREA.x + SAFE_AREA.w - (london.x + london.w)).toBeLessThan(5)
  })

  it('moves a group that crosses the frame (and its point) inside, then pushes overlaps apart', () => {
    // Stoke on the frame, right on top of The North, which is on the frame too.
    const crowded: BoardData = {
      ...BOARD,
      locations: BOARD.locations.map((l) => (l.id === 'stoke' ? { ...l, x: 62, y: 3 } : l.id === 'the_north' ? { ...l, x: 62, y: 2 } : l)),
    }
    const result = layoutGroups(crowded, createTextMeasurer())
    expect(result.problems).toEqual([])
    for (const g of result.groups.values()) {
      expect(outsideSafeArea(g.bounds)).toBe(0)
      // The location's point moves with its group.
      if (!g.fixed) expect(g.point).toEqual(g.center)
    }
  })

  it('reports overlaps by name', () => {
    const [a, b] = [layout.groups.get('birmingham')!, layout.groups.get('derby')!]
    const onTop = { ...b, bounds: { ...a.bounds } }
    expect(groupProblems([a, onTop])).toEqual([expect.stringMatching(/^Birmingham and Derby overlap/)])
  })

  it('draws only the era’s links: canal and both in the canal era, rail and both in the rail era', () => {
    expect(routes('canal').map((r) => r.link.type).sort()).toEqual([...Array(16).fill('both'), ...Array(6).fill('canal')])
    expect(routes('rail').map((r) => r.link.type).sort()).toEqual([...Array(16).fill('both'), ...Array(17).fill('rail')])
  })

  it('runs every route from the centre of one group to the centre of the other, so its ends stay under the art', () => {
    for (const era of ['canal', 'rail'] as const) {
      for (const r of routes(era)) {
        const [from, to] = [layout.groups.get(r.link.from)!, layout.groups.get(r.link.to)!]
        expect(distance(r.line.points[0], from.center)).toBeLessThan(0.01)
        expect(distance(r.line.points.at(-1)!, to.center)).toBeLessThan(0.01)
        // The whole route is one smooth path: each segment starts where the last one ended.
        for (let i = 1; i < r.segments.length; i++) expect(r.segments[i].p0).toEqual(r.segments[i - 1].p3)
        // Between the two hidden ends is the visible curve.
        expect(r.segments.slice(1, -1)).toEqual(r.main)
      }
    }
  })

  it('puts each link space on the visible part of its route, between the two rectangles', () => {
    for (const era of ['canal', 'rail'] as const) {
      for (const r of routes(era)) {
        const onRoute = Math.min(...r.visible.points.map((p) => distance(p, r.marker)))
        expect(onRoute, `${era} ${r.link.id}`).toBeLessThan(2)
        for (const id of [r.link.from, r.link.to]) expect(inside(r.marker, layout.groups.get(id)!.bounds)).toBe(false)
      }
    }
  })

  it('fans route ends out at least 14 apart where they come out from under each group', () => {
    for (const era of ['canal', 'rail'] as const) {
      const ends = new Map<string, { x: number; y: number }[]>()
      for (const r of routes(era)) {
        const line = r.visible.points
        for (const [id, p] of [
          [r.link.from, line[0]],
          [r.link.to, line[line.length - 1]],
        ] as const) ends.set(id, [...(ends.get(id) ?? []), p])
      }
      for (const [, points] of ends) {
        for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) expect(distance(points[i], points[j])).toBeGreaterThanOrEqual(Math.min(14, FAN) - 0.5)
      }
    }
  })

  it('saves the positions it draws: every location is drawn centred on its point in board.json', () => {
    for (const g of groups) expect(distance(g.center, toView(g.location)), g.location.name).toBeLessThan(1)
  })

  it('uses 34-unit squares with 3-unit gaps: a row for 1–2 slots, a triangle for 3, 2 × 2 for 4, over a plate wide enough for the name', () => {
    const city = (id: string) => {
      const g = layout.groups.get(id)!
      return g.parts.type === 'city' ? g.parts : null
    }
    const step = TILE + TILE_GAP
    const birmingham = city('birmingham')!
    expect(birmingham.tiles.every((t) => t.w === TILE && t.h === TILE)).toBe(true)
    expect(birmingham.tiles.map((t) => [t.x - birmingham.tiles[0].x, t.y - birmingham.tiles[0].y])).toEqual([[0, 0], [step, 0], [0, step], [step, step]])
    // Stoke (3 slots): slot 0 top-left, 1 top-right, 2 centred below, like Preston.
    const stoke = city('stoke')!
    expect(stoke.tiles.map((t) => [t.x - stoke.tiles[0].x, t.y - stoke.tiles[0].y])).toEqual([[0, 0], [step, 0], [step / 2, step]])
    const derby = city('derby')!
    expect(derby.tiles.map((t) => [t.x - derby.tiles[0].x, t.y - derby.tiles[0].y])).toEqual([[0, 0], [step, 0]])
    for (const g of groups) {
      if (g.parts.type !== 'city') continue
      // The plate sits under the tiles.
      expect(g.parts.plate.y).toBeGreaterThan(Math.max(...g.parts.tiles.map((t) => t.y + t.h)))
    }
    const measure = createTextMeasurer()
    for (const g of groups) {
      if (g.parts.type !== 'city') continue
      const tilesWidth = Math.max(...g.parts.tiles.map((t) => t.x + t.w)) - Math.min(...g.parts.tiles.map((t) => t.x))
      expect(g.parts.plate.w).toBeGreaterThanOrEqual(tilesWidth)
      expect(g.parts.plate.w).toBeGreaterThanOrEqual(measure(g.location.name.toUpperCase(), '700 13.5px Cinzel', 13.5 * 0.06))
    }
  })

  it('puts exactly two 18 × 18 link hexagons, 3 apart, on the top edge of every stop and hub (5 overlapping)', () => {
    for (const g of groups) {
      if (g.parts.type === 'city') continue
      const hexes = g.parts.hexes
      expect(hexes).toHaveLength(2)
      expect(hexes.every((h) => h.w === HEX && h.h === HEX)).toBe(true)
      expect(hexes[1].x - (hexes[0].x + HEX)).toBeCloseTo(3)
      const top = g.parts.type === 'stop' ? g.parts.plaque.y : g.parts.medallion.y - MEDALLION_R
      const centre = g.parts.type === 'stop' ? g.parts.plaque.x + g.parts.plaque.w / 2 : g.parts.medallion.x
      for (const h of hexes) expect(h.y + h.h - top).toBeCloseTo(5)
      expect((hexes[0].x + hexes[1].x + HEX) / 2).toBeCloseTo(centre)
    }
    // Hubs: a square price badge left of the medallion, and the goods they buy below the ribbon.
    for (const id of ['the_north', 'london', 'west_wales']) {
      const parts = layout.groups.get(id)!.parts
      if (parts.type !== 'hub') throw new Error(id)
      expect(parts.badge.w).toBe(parts.badge.h)
      expect(parts.badge.x + parts.badge.w).toBeLessThanOrEqual(parts.medallion.x - MEDALLION_R + 0.01)
      expect(parts.icons.every((r) => r.y >= parts.ribbon.y + parts.ribbon.h)).toBe(true)
    }
  })

  it('never lets a hub cover a city, and draws the rail-era badge only on The North, Plymouth and Taunton', () => {
    for (const hub of groups.filter((g) => g.location.type === 'hub')) {
      for (const city of groups.filter((g) => g.location.type === 'city')) expect(rectGap(hub.bounds, city.bounds)).toBeGreaterThanOrEqual(MIN_GAP - 0.05)
    }
    expect(groups.filter((g) => g.railBadge).map((g) => g.location.id)).toEqual(['the_north', 'taunton', 'plymouth'])
  })

  it('respects a hand-placed labelOffset and follows bend points', () => {
    const edited: BoardData = {
      ...BOARD,
      locations: BOARD.locations.map((l) => (l.id === 'exeter' ? { ...l, labelOffset: { x: 2, y: -1.5 } } : l)),
      links: BOARD.links.map((l) => (l.id === 'merthyr-barnstaple' ? { ...l, points: [[30, 52]] } : l)),
    }
    const result = layoutBoard(edited, createTextMeasurer(), { quick: true, eras: ['canal'] })
    const g = result.groups.get('exeter')!
    expect(g.center.x - g.point.x).toBeCloseTo(20)
    expect(g.center.y - g.point.y).toBeCloseTo(-15)
    const route = result.routes.canal!.routes.get('merthyr-barnstaple')!
    expect(route.main).toHaveLength(2)
    expect(route.main[0].p3).toEqual({ x: 300, y: 520 })
  })
})

describe('link spaces', () => {
  it('draws an empty link as an empty bubble: a dark stadium with a bronze rim and nothing inside', () => {
    const svg = renderToStaticMarkup(createElement('svg', null, createElement(LinkBubble, { x: 100, y: 100, angle: 30 })))
    expect(svg).not.toMatch(/<image/)
    expect(svg).not.toMatch(/link_s(pace|ymbol)/)
    expect(svg).toMatch(new RegExp(`width="${BUBBLE_W - 2}"`))
    expect(svg).toMatch(/fill="#1c1a18" fill-opacity="0.85" stroke="#a07a3c" stroke-width="2"/)
  })

  it('draws a built link as the owner’s token, the same size as the bubble', () => {
    const svg = renderToStaticMarkup(createElement('svg', null, createElement(LinkToken, { x: 0, y: 0, angle: 0, era: 'rail', token: 'token.png', color: '#c33', mark: undefined })))
    expect(svg).toMatch(new RegExp(`<image href="token.png" x="${-BUBBLE_W / 2}" y="${-BUBBLE_H / 2}" width="${BUBBLE_W}"`))
  })

  it('puts link hexagons only on the stops and hubs', () => {
    const { groups } = layoutGroups(BOARD, createTextMeasurer())
    const withHexes = [...groups.values()].filter((g) => g.parts.type !== 'city' && g.parts.hexes.length === 2).map((g) => g.location.id)
    expect(withHexes.sort()).toEqual(['brecon', 'london', 'reading', 'taunton', 'the_north', 'west_wales'])
    expect([...groups.values()].filter((g) => g.parts.type === 'city').every((g) => !('hexes' in g.parts))).toBe(true)
  })
})
