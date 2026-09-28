import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { BACKGROUND_FOCUS, BACKGROUND_OVERLAY, backgroundSrcSet, backgroundUrl, type BackgroundName } from './backgrounds'
import { useFirstPaintDone } from './firstPaint'

interface PageBackgroundProps {
  name: BackgroundName
  /** object-position of the painting: the part that stays in view on narrow screens. Defaults to the painting's own. */
  focus?: string
  /** 'high' for the page on screen; 'low' when something covers it (the account screens over the lobby). */
  priority?: 'high' | 'low'
  /** Extra decorative layers over the painting and its overlay (e.g. a lamp glow). */
  children?: ReactNode
}

/** How far the painting follows the mouse, at most, in px. */
const PARALLAX = 10

/**
 * A page's painted background: fixed behind everything, covering the
 * screen, under a readability overlay. Decorative only. Phones load the
 * 1280 px file, desktops the 1920, large and high-density screens the 2560,
 * as WebP (JPG where WebP isn't supported). The painting fades in over the
 * soot ground; if it's missing or fails to load, the plain ground stays. On
 * the very first page it starts loading once the text is on screen.
 */
export function PageBackground({ name, focus = BACKGROUND_FOCUS[name], priority = 'high', children }: PageBackgroundProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useParallax(rootRef)
  const painted = useFirstPaintDone()
  const webp = backgroundSrcSet(name, 'webp')
  const jpg = backgroundSrcSet(name, 'jpg')
  const src = backgroundUrl(name, 1920, 'jpg') ?? backgroundUrl(name, 1280, 'jpg') ?? backgroundUrl(name, 1280, 'webp')
  return (
    <div ref={rootRef} aria-hidden="true" data-background={name} className="page-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-soot-950">
      {src && painted && <Painting key={name} webp={webp} jpg={jpg} src={src} focus={focus} priority={priority} />}
      <div className="absolute inset-0" style={{ background: BACKGROUND_OVERLAY[name] }} />
      {children}
    </div>
  )
}

export function Painting({ webp, jpg, src, focus, priority }: { webp: string; jpg: string; src: string; focus: string; priority: 'high' | 'low' }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  if (state === 'failed') return null
  return (
    // 12 px larger than the screen on every side, so the parallax never shows an edge.
    <picture className="page-bg-art absolute -inset-3 block">
      {webp && <source type="image/webp" srcSet={webp} sizes="100vw" />}
      <img
        src={src}
        srcSet={jpg || undefined}
        sizes="100vw"
        alt=""
        width={2560}
        height={1440}
        decoding="async"
        fetchPriority={priority}
        draggable={false}
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
        data-loaded={state === 'loaded' || undefined}
        className="page-bg-img size-full object-cover"
        style={{ objectPosition: focus }}
      />
    </picture>
  )
}

/**
 * Desktop only: the painting drifts up to 10 px against the mouse. Off for
 * touch screens, reduced motion and the "Animations: off" setting.
 */
function useParallax(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const allowed = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let x = 0
    let y = 0
    const apply = () => {
      frame = 0
      root.style.setProperty('--parallax-x', `${x.toFixed(1)}px`)
      root.style.setProperty('--parallax-y', `${y.toFixed(1)}px`)
    }
    const onMove = (event: PointerEvent) => {
      const on = event.pointerType === 'mouse' && allowed.matches && document.documentElement.dataset.animations !== 'off'
      x = on ? (0.5 - event.clientX / window.innerWidth) * 2 * PARALLAX : 0
      y = on ? (0.5 - event.clientY / window.innerHeight) * 2 * PARALLAX : 0
      if (!frame) frame = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [ref])
}
