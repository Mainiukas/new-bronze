/**
 * Cards flying across the screen: dealt and drawn from the deck to the
 * players, played to the discard pile. Plain DOM and the Web Animations API,
 * so the hand never re-renders mid-flight. Every flight is skipped when
 * animations are off or the player prefers reduced motion.
 */

import { CARD_BACK_URL, CARD_RATIO } from './cardArt'

export function motionOff(): boolean {
  return document.documentElement.dataset.animations === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The first visible element for a selector (the panel exists twice: side panel and bottom sheet). */
export function visibleRect(selector: string): DOMRect | null {
  for (const el of document.querySelectorAll(selector)) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return rect
  }
  return null
}

export interface Flight {
  from: DOMRect
  to: DOMRect
  /** The card's face (null when it may not be seen). */
  front: string | null
  /** Face down all the way (dealt, drawn), face up (your card played), or turned face up on the way (an opponent's card played). */
  show: 'back' | 'front' | 'reveal'
  /** Stop here face up for a moment before going on to `to`. */
  via?: { rect: DOMRect; hold: number }
  delay: number
  /** The animation-speed setting (1 = normal). */
  speed: number
}

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

/** One card's flight. Resolves when it lands (at once when motion is off). */
export function flyCard(layer: HTMLElement, flight: Flight): Promise<void> {
  if (motionOff() || flight.speed <= 0) return Promise.resolve()
  const width = 90
  const height = width / CARD_RATIO
  const card = document.createElement('div')
  card.className = 'card-flight card3d'
  card.style.width = `${width}px`
  card.style.height = `${height}px`
  const inner = document.createElement('div')
  inner.className = 'card3d-inner'
  inner.style.width = inner.style.height = '100%'
  const face = (src: string, back: boolean) => {
    const img = document.createElement('img')
    img.src = src
    img.alt = ''
    img.className = `card3d-face${back ? ' card3d-back' : ''}`
    img.style.width = img.style.height = '100%'
    img.style.borderRadius = '7%'
    img.style.boxShadow = '0 8px 22px rgb(0 0 0 / 0.6)'
    return img
  }
  inner.append(face(flight.front ?? CARD_BACK_URL, false), face(CARD_BACK_URL, true))
  card.append(inner)
  layer.append(card)

  const at = (r: DOMRect, lift = 0, grow = 1) => {
    const c = center(r)
    return `translate(${c.x - width / 2}px, ${c.y - height / 2 - lift}px) scale(${(r.width / width) * grow})`
  }
  const arc = (a: DOMRect, b: DOMRect) => Math.min(170, Math.hypot(center(b).x - center(a).x, center(b).y - center(a).y) * 0.3)
  const between = (a: DOMRect, b: DOMRect) => {
    const ca = center(a)
    const cb = center(b)
    const w = (a.width + b.width) / 2
    return new DOMRect((ca.x + cb.x) / 2 - w / 2, (ca.y + cb.y) / 2 - (a.height + b.height) / 4, w, (a.height + b.height) / 2)
  }
  const ms = (n: number) => n * flight.speed

  let frames: Keyframe[]
  let duration: number
  if (flight.via) {
    const { rect, hold } = flight.via
    const first = ms(520)
    const last = ms(420)
    duration = first + ms(hold) + last
    frames = [
      { transform: at(flight.from), offset: 0 },
      { transform: at(between(flight.from, rect), arc(flight.from, rect), 1.1), offset: first / 2 / duration },
      { transform: at(rect), offset: first / duration },
      { transform: at(rect), offset: (first + ms(hold)) / duration },
      { transform: at(between(rect, flight.to), arc(rect, flight.to) * 0.6), offset: (first + ms(hold) + last / 2) / duration },
      { transform: at(flight.to), offset: 1 },
    ]
  } else {
    duration = ms(560)
    frames = [{ transform: at(flight.from) }, { transform: at(between(flight.from, flight.to), arc(flight.from, flight.to), 1.12), offset: 0.5 }, { transform: at(flight.to) }]
  }
  card.style.transform = String(frames[0].transform)
  card.style.opacity = '0'
  const move = card.animate(frames, { duration, delay: flight.delay, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' })
  card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 90, delay: flight.delay, fill: 'forwards' })
  if (flight.show !== 'front' || !flight.front) inner.style.transform = 'rotateY(180deg)'
  if (flight.show === 'reveal' && flight.front) {
    const flipAt = flight.via ? ms(520) : duration / 2
    inner.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: ms(360), delay: flight.delay + flipAt - ms(360), fill: 'forwards', easing: 'ease-in-out' })
  }
  return move.finished.then(
    () => card.remove(),
    () => card.remove(),
  )
}

/** A card in the hand turns face up (after landing). */
export function flipUp(el: Element, speed: number) {
  const inner = el.querySelector('.card3d-inner')
  if (!inner || motionOff() || speed <= 0) return
  inner.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], { duration: 460 * speed, easing: 'ease-in-out' })
}
