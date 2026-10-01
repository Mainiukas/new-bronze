import type { ComponentType, CSSProperties } from 'react'
import { formatDuration, type GameMode, type GameModeId, type ModeIconName } from '../data/gameModes'
import { TIME_CONTROL } from '../rules/config/game'
import { useT } from '../i18n'
import { IconBolt, IconCheck, IconClock, IconFactory, IconStopwatch, type IconProps } from './icons'
import { backgroundUrl } from './theme/backgrounds'
import { useFirstPaintDone } from './theme/firstPaint'
import { roundsPerEra } from '../rules/match'

const MODE_ICONS: Record<ModeIconName, ComponentType<IconProps>> = {
  factory: IconFactory,
  bolt: IconBolt,
  stopwatch: IconStopwatch,
}

/** The lobby painting at 1280 px (on phones, the same file as the page behind): each card shows a crop of it. */
const LOBBY_ART = backgroundUrl('lobby', 1280, 'webp') ?? backgroundUrl('lobby', 1280, 'jpg')

/** Which part of the lobby painting each card shows (background-position). */
const CROPS: Record<GameModeId, string> = {
  // The mills
  normal: '25% 50%',
  // The train on the viaduct
  blitz: '80% 35%',
  // The narrowboat
  bullet: '30% 80%',
}

interface ModeCardProps {
  mode: GameMode
  selected: boolean
  onSelect: () => void
  /** Stagger for the load animation. */
  index?: number
  /** Players in the match being set up (the rounds follow the deck). */
  players: number
}

/**
 * Quick-play mode card (like chess.com's Bullet/Blitz/Rapid): a crop of the
 * lobby painting with the mode's badge, then its name, summary and real
 * numbers. Built on a visually hidden radio input, so the group gets native
 * keyboard support (Tab in, arrow keys to change) and screen-reader semantics.
 * Wide containers show a picture on top; narrow ones put it on the left.
 */
export function ModeCard({ mode, selected, onSelect, index = 0, players }: ModeCardProps) {
  const t = useT()
  const Icon = MODE_ICONS[mode.icon]
  const painted = useFirstPaintDone()
  const clock = TIME_CONTROL[mode.id]
  const facts = `${t.setup.roundsPerEra(roundsPerEra(mode.id, players))} · ${t.modes.mapSize[mode.mapSize]} · ${t.modes.clock(clock.baseMs / 60_000, clock.incrementMs / 1000)}`
  // Modes not open yet: shown greyed out with a "Coming soon" ribbon, and can't be picked.
  const locked = !mode.playable

  return (
    <label
      style={{ animationDelay: `${index * 70}ms` } as CSSProperties}
      aria-disabled={locked || undefined}
      className={`plate iron group relative grid animate-fade-up grid-cols-[7.5rem_minmax(0,1fr)] overflow-hidden rounded-xl transition-[border-color,box-shadow] duration-200 ease-out select-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ember-400 @2xl:grid-cols-1 ${
        locked
          ? 'cursor-not-allowed'
          : selected
            ? 'cursor-pointer border-brass-300/90 shadow-[0_0_0_1px_rgb(240_215_138/0.55),0_16px_36px_-14px_rgb(255_157_77/0.55)]'
            : 'cursor-pointer hover:border-ember-400/70 hover:shadow-[0_0_0_1px_rgb(255_157_77/0.35),0_0_26px_-6px_rgb(255_122_26/0.55)]'
      }`}
    >
      <input type="radio" name="game-mode" value={mode.id} checked={selected && !locked} disabled={locked} onChange={onSelect} className="sr-only" />
      {locked && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 bg-soot-950/45 backdrop-grayscale" />
      )}
      {locked && (
        // The ribbon across the top-right corner.
        <span className="pointer-events-none absolute top-4 -right-10 z-20 w-40 rotate-45 border-y border-brass-200/70 bg-linear-to-b from-bronze-400 to-bronze-700 py-1 text-center font-display text-[0.7rem] font-extrabold tracking-[0.18em] text-soot-950 uppercase shadow-[0_4px_10px_rgb(0_0_0/0.6)]">
          {t.common.comingSoon}
        </span>
      )}

      {/* Picture: a crop of the lobby painting, dark at the bottom where the badge and text meet it */}
      <span
        aria-hidden="true"
        className="relative block @2xl:aspect-[16/8]"
        style={LOBBY_ART && painted ? { backgroundImage: `url(${LOBBY_ART})`, backgroundSize: '320% auto', backgroundPosition: CROPS[mode.id] } : undefined}
      >
        <span className="absolute inset-0 bg-linear-to-t from-soot-950/85 via-soot-950/25 to-transparent" />
        <span className="absolute inset-0 bg-linear-to-r from-transparent to-soot-950/60 @2xl:hidden" />
        {/* Mode badge */}
        <span
          className={`absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[1.7rem] shadow-[0_6px_16px_-4px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.35)] transition-transform duration-200 @2xl:top-auto @2xl:-bottom-6 @2xl:left-5 @2xl:translate-x-0 @2xl:translate-y-0 ${
            selected
              ? 'border-brass-200 bg-radial-[at_35%_30%] from-brass-200 via-bronze-400 to-bronze-700 text-soot-950'
              : 'border-bronze-300/70 bg-radial-[at_35%_30%] from-bronze-300 via-bronze-500 to-bronze-800 text-soot-950 group-hover:scale-105'
          }`}
        >
          <Icon strokeWidth={2} />
        </span>
        <span className={`absolute top-2.5 right-2.5 hidden items-center gap-1 rounded-full border border-bronze-400/40 bg-soot-950/80 px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap text-bronze-100 tabular-nums ${locked ? '' : '@2xl:inline-flex'}`}>
          <IconClock className="size-3.5" />
          {formatDuration(mode.durationMinutes)}
        </span>
      </span>

      {/* Text */}
      <span className="flex min-w-0 flex-col gap-1 p-3.5 pr-10 @2xl:px-5 @2xl:pt-8 @2xl:pb-5">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={`font-display text-[1.7rem] leading-none font-extrabold tracking-[0.1em] uppercase transition-colors @2xl:text-3xl ${
              selected ? 'text-parchment-50' : 'text-parchment-100'
            }`}
          >
            {t.modes[mode.id].name}
          </span>
          {/* Beside the name on narrow cards, and on locked ones (the ribbon covers the corner chip). */}
          <span className={`text-xs font-semibold whitespace-nowrap text-bronze-200 tabular-nums ${locked ? '' : '@2xl:hidden'}`}>{formatDuration(mode.durationMinutes)}</span>
        </span>
        <span className="text-sm leading-snug text-parchment-300">{t.modes[mode.id].description}</span>
        <span className="mt-1 text-xs font-semibold tracking-wide text-brass-300/90">{facts}</span>
      </span>

      {/* Selected check */}
      <span
        aria-hidden="true"
        className={`absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full border-2 border-soot-950 bg-linear-to-b from-brass-200 to-bronze-500 text-soot-950 shadow-[0_0_12px_rgb(240_215_138/0.7)] transition duration-200 @2xl:right-auto @2xl:left-2.5 ${
          selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <IconCheck className="size-4" strokeWidth={3} />
      </span>
    </label>
  )
}
