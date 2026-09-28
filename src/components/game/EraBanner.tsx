import { useEffect, useEffectEvent } from 'react'
import { BOARD } from '../../data/board'
import { useT } from '../../i18n'
import { imageOk, TOKEN_ART_URLS } from '../board/assets'

/** The painted board's places that open with the railways. */
const RAIL_ONLY = BOARD.locations.filter((l) => l.era === 'rail').map((l) => l.name)

/** How long the banner stays before it goes by itself. */
const BANNER_MS = 3000

/**
 * Full-width "The Rail Era begins" banner across the board. Dismissed by a
 * click (or a key) or after three seconds.
 */
export function EraBanner({ removed, onDismiss }: { removed: number; onDismiss: () => void }) {
  const t = useT()
  const e = t.match.eraBanner
  const dismiss = useEffectEvent(onDismiss)
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(), BANNER_MS)
    return () => window.clearTimeout(timer)
  }, [])
  const art = TOKEN_ART_URLS.rail
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="era-banner absolute inset-x-0 top-1/3 z-20 flex w-full flex-col items-center gap-1 border-y-2 border-brass-300/70 bg-linear-to-r from-soot-950/95 via-bronze-800/95 to-soot-950/95 px-4 py-4 text-center shadow-[0_10px_40px_rgb(0_0_0/0.8)] sm:py-6"
      aria-label={`${e.title}. ${e.removed(removed)} ${e.clickToContinue}.`}
    >
      {imageOk(art) && <img src={art} alt="" aria-hidden="true" className="h-8 w-auto sm:h-12" />}
      <span className="metal-text font-display text-2xl font-extrabold tracking-[0.12em] uppercase sm:text-4xl">{e.title}</span>
      <span className="text-sm text-parchment-200 sm:text-base">
        {e.removed(removed)} {e.opens(t.list(RAIL_ONLY))}
      </span>
      <span className="text-xs text-parchment-400">{e.clickToContinue}</span>
    </button>
  )
}
