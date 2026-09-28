/**
 * Our board, as the rules see it: towns with building slots, hubs (the
 * "trade icon" places where cotton reaches the distant market), stops (links
 * pass through; nothing is built there), and links that exist in the canal
 * era, the rail era, or both. Places marked rail-only can't be built in or
 * linked to during the canal era.
 */

import { BOARD, slotKey, type BoardData } from '../data/board'
import type { IndustryId } from './tileTable'

export interface MapSlot {
  readonly key: string
  readonly town: string
  readonly index: number
  /** One industry, or two for a mixed slot. */
  readonly industries: readonly IndustryId[]
}

interface PlaceBase {
  readonly id: string
  readonly name: string
  readonly railOnly: boolean
  /** 1 = the core, 2 and 3 = further out (used for the cards in smaller games). */
  readonly ring: 1 | 2 | 3
}
export interface MapTown extends PlaceBase {
  readonly kind: 'town'
  readonly slots: readonly MapSlot[]
  readonly hasPortSlot: boolean
}
export interface MapHub extends PlaceBase {
  readonly kind: 'hub'
}
export interface MapStop extends PlaceBase {
  readonly kind: 'stop'
}
export type MapPlace = MapTown | MapHub | MapStop

export interface MapLink {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly canal: boolean
  readonly rail: boolean
}

export interface BrassMap {
  readonly places: Readonly<Record<string, MapPlace>>
  readonly towns: readonly MapTown[]
  readonly hubs: readonly MapHub[]
  readonly links: Readonly<Record<string, MapLink>>
  readonly linksAt: Readonly<Record<string, readonly MapLink[]>>
  readonly slots: Readonly<Record<string, MapSlot>>
}

export function brassMap(board: BoardData): BrassMap {
  const places: Record<string, MapPlace> = {}
  const towns: MapTown[] = []
  const hubs: MapHub[] = []
  const slots: Record<string, MapSlot> = {}
  for (const l of board.locations) {
    const base = { id: l.id, name: l.name, railOnly: l.era === 'rail', ring: l.ring ?? 1 }
    if (l.type === 'city') {
      const townSlots = l.slots.map((industries, index) => ({ key: slotKey(l.id, index), town: l.id, index, industries: industries as IndustryId[] }))
      townSlots.forEach((s) => (slots[s.key] = s))
      const town: MapTown = { ...base, kind: 'town', slots: townSlots, hasPortSlot: townSlots.some((s) => s.industries.includes('port')) }
      places[l.id] = town
      towns.push(town)
    } else if (l.type === 'hub') {
      const hub: MapHub = { ...base, kind: 'hub' }
      places[l.id] = hub
      hubs.push(hub)
    } else {
      places[l.id] = { ...base, kind: 'stop' }
    }
  }
  const links: Record<string, MapLink> = {}
  const linksAt: Record<string, MapLink[]> = {}
  for (const l of board.links) {
    const link: MapLink = { id: l.id, from: l.from, to: l.to, canal: l.type !== 'rail', rail: l.type !== 'canal' }
    links[l.id] = link
    ;(linksAt[l.from] ??= []).push(link)
    ;(linksAt[l.to] ??= []).push(link)
  }
  return { places, towns, hubs, links, linksAt, slots }
}

/** The board the game is played on. */
export const BRASS_MAP: BrassMap = brassMap(BOARD)

/** Does the link exist in this era (and can it be used: rail-only places have no canals)? */
export function linkInEra(map: BrassMap, link: MapLink, era: 'canal' | 'rail'): boolean {
  if (era === 'rail') return link.rail
  return link.canal && !map.places[link.from].railOnly && !map.places[link.to].railOnly
}
