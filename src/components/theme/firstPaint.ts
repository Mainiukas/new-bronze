import { useSyncExternalStore } from 'react'

/*
 * "Text first": the paintings (and the account service's code) start loading
 * once the app's first frame is on screen, so on a slow phone connection the
 * page's text doesn't wait behind them. (Desktops preload the lobby's
 * painting from index.html anyway.)
 */

let painted = false
const listeners = new Set<() => void>()
let resolvePainted: () => void = () => undefined
const paintedPromise = new Promise<void>((resolve) => (resolvePainted = resolve))

let watching = false

/**
 * Called once the app has committed its first page (App.tsx): waits for the
 * browser's first contentful paint (or 1.5 s, where that isn't reported,
 * e.g. in a background tab), then lets the waiting pictures and code load.
 */
export function markFirstPaint() {
  if (painted || watching) return
  watching = true
  const done = () => {
    if (painted) return
    painted = true
    resolvePainted()
    for (const listener of listeners) listener()
  }
  const fallback = setTimeout(done, 1500)
  try {
    const observer = new PerformanceObserver((list) => {
      if (!list.getEntriesByName('first-contentful-paint').length) return
      observer.disconnect()
      clearTimeout(fallback)
      setTimeout(done)
    })
    observer.observe({ type: 'paint', buffered: true })
  } catch {
    // No paint timing here: the fallback stands.
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Resolves once the first frame is on screen. */
export const whenFirstPaint = () => paintedPromise

/**
 * Resolves once the first page is complete: its first frame is on screen and
 * its painting (if it has one) has loaded or failed, or after 5 s at most.
 * What the next pages need waits for this, so it never competes with the page
 * being shown.
 */
export function whenFirstPageSettled(): Promise<void> {
  return paintedPromise
    .then(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())))
    .then(
      () =>
        new Promise<void>((resolve) => {
          const img = document.querySelector<HTMLImageElement>('img.page-bg-img')
          if (!img || (img.complete && img.naturalWidth > 0) || img.dataset.loaded !== undefined) return resolve()
          const timer = setTimeout(resolve, 5000)
          const done = () => {
            clearTimeout(timer)
            resolve()
          }
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
        }),
    )
}

/** True once the first frame is on screen (always false when rendered on a server or in tests). */
export function useFirstPaintDone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => painted,
    () => false,
  )
}
