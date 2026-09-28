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

/** True once the first frame is on screen (always false when rendered on a server or in tests). */
export function useFirstPaintDone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => painted,
    () => false,
  )
}
