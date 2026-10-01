/**
 * Development only: warns in the console about any picture shown larger than
 * its real pixel size (its width below the displayed width × the screen's
 * pixel ratio), so nothing on screen is upscaled and soft. Vector images
 * (SVG) are skipped; each picture is reported once.
 */

/** Is this picture upscaled? (Exported for the tests.) */
export function isUpscaled(naturalWidth: number, displayedWidth: number, pixelRatio: number): boolean {
  return naturalWidth > 0 && displayedWidth > 0 && naturalWidth + 1 < Math.round(displayedWidth * pixelRatio)
}

/** The real pixel width of an image file (an <img> with srcset reports its width scaled to the layout, not the file's). */
const fileWidths = new Map<string, Promise<number>>()
function fileWidth(src: string): Promise<number> {
  let width = fileWidths.get(src)
  if (!width) {
    const probe = new Image()
    probe.src = src
    width = probe.decode().then(
      () => probe.naturalWidth,
      () => 0,
    )
    fileWidths.set(src, width)
  }
  return width
}

export function watchImageSizes(root: Document = document) {
  const reported = new Set<string>()
  const check = (img: HTMLImageElement) => {
    const src = img.currentSrc || img.src
    if (!src || !img.complete || reported.has(src) || /\.svg(\?|#|$)|^data:image\/svg/i.test(src)) return
    const shown = img.getBoundingClientRect().width
    if (!shown) return
    void fileWidth(src).then((natural) => {
      const ratio = window.devicePixelRatio || 1
      if (reported.has(src) || !isUpscaled(natural, shown, ratio)) return
      reported.add(src)
      console.warn(`[images] Shown larger than its real size: ${src} is ${natural} px wide, displayed at ${Math.round(shown)} × ${ratio} px.`, img)
    })
  }
  const all = () => root.querySelectorAll('img').forEach(check)
  root.addEventListener('load', (event) => event.target instanceof HTMLImageElement && check(event.target), true)
  let timer: number | undefined
  const later = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(all, 500)
  }
  window.addEventListener('resize', later)
  new MutationObserver(later).observe(root.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'srcset', 'class', 'style'] })
}
