import { useState, type ReactNode } from 'react'
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

/**
 * A page's painted background: fixed behind everything, covering the
 * screen, under a readability overlay. Decorative only. Phones load the
 * 1280 px file, desktops the 1920, large and high-density screens the 2560,
 * as WebP (JPG where WebP isn't supported). The painting fades in over the
 * soot ground and then stays completely still; if it's missing or fails to
 * load, the plain ground stays. On the very first page it starts loading once
 * the text is on screen.
 */
export function PageBackground({ name, focus = BACKGROUND_FOCUS[name], priority = 'high', children }: PageBackgroundProps) {
  const painted = useFirstPaintDone()
  const webp = backgroundSrcSet(name, 'webp')
  const jpg = backgroundSrcSet(name, 'jpg')
  const src = backgroundUrl(name, 1920, 'jpg') ?? backgroundUrl(name, 1280, 'jpg') ?? backgroundUrl(name, 1280, 'webp')
  return (
    <div aria-hidden="true" data-background={name} className="page-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-soot-950">
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
    <picture className="absolute inset-0 block">
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
