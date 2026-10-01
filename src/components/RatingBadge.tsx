/**
 * A rating, like chess.com's: "1240", or "1000?" while it's provisional (fewer
 * than 10 rated games, or an uncertainty still above 110). Hovering or
 * focusing it explains the "?" and how sure the number is (±2 RD).
 */

import { useId } from 'react'
import { PROVISIONAL_GAMES } from '../rating/config'
import { useT } from '../i18n'

interface RatingBadgeProps {
  rating: number | null
  provisional: boolean
  /** The uncertainty now (RD), and rated games played: for the tooltip. */
  rd?: number | null
  games?: number
  className?: string
}

export function RatingBadge({ rating, provisional, rd = null, games = 0, className = '' }: RatingBadgeProps) {
  const r = useT().online.rating
  const id = useId()
  const spread = rd !== null ? Math.round(rd * 2) : null
  const tip = rating === null ? r.tipUnknown : provisional ? r.tipProvisional(Math.min(games, PROVISIONAL_GAMES), spread ?? 700) : spread !== null ? r.tipSettled(spread) : null
  return (
    <span className={`group/rating relative inline-flex ${className}`}>
      <span
        tabIndex={tip ? 0 : undefined}
        aria-describedby={tip ? id : undefined}
        data-testid="rating-badge"
        className="rounded font-display font-bold tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-brass-200"
      >
        {rating === null ? '—' : Math.round(rating)}
        {rating !== null && provisional && <span className="text-brass-300">?</span>}
      </span>
      {tip && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[15rem] -translate-x-1/2 rounded-md border border-bronze-400/60 bg-soot-950/[0.97] px-2.5 py-1.5 text-left font-sans text-xs leading-snug font-normal tracking-normal text-parchment-100 normal-case opacity-0 shadow-xl transition group-focus-within/rating:visible group-focus-within/rating:opacity-100 group-hover/rating:visible group-hover/rating:opacity-100"
        >
          {tip}
        </span>
      )}
    </span>
  )
}
