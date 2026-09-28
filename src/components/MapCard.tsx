import thumbUrl from '../../assets/map-thumb.jpg'
import { BOARD } from '../data/board'
import type { GameMap } from '../data/maps'
import { useT } from '../i18n'
import { IconCheck } from './icons'
import { MapPreview } from './MapPreview'
import { useFirstPaintDone } from './theme/firstPaint'

interface MapCardProps {
  map: GameMap
  selected: boolean
  onSelect: () => void
}

/**
 * Compact, selectable map option for the match setup: a thumbnail (the
 * painted board, or a drawn preview), the name, players and towns. Like
 * ModeCard, it wraps a visually hidden radio input.
 */
export function MapCard({ map, selected, onSelect }: MapCardProps) {
  const t = useT()
  const towns = map.style === 'illustrated' ? BOARD.locations.length : map.board.towns.length
  // The thumbnail is a picture: it loads once the page's text is on screen.
  const painted = useFirstPaintDone()
  return (
    <label
      className={`group relative flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-2 pr-3 transition duration-200 ease-out select-none has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ember-400 ${
        selected
          ? 'border-brass-300/80 bg-bronze-500/15 shadow-[0_0_0_1px_rgb(240_215_138/0.3)]'
          : 'border-bronze-500/25 bg-soot-950/55 hover:border-ember-400/60 hover:bg-soot-900/80'
      }`}
    >
      <input type="radio" name="map" value={map.id} checked={selected} onChange={onSelect} className="sr-only" />

      <span
        aria-hidden="true"
        className={`relative block aspect-[16/10] w-20 shrink-0 overflow-hidden rounded-md border bg-soot-950 bg-[linear-gradient(to_right,rgb(232_181_124/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(232_181_124/0.06)_1px,transparent_1px)] bg-size-[10%_16%] ${
          selected ? 'border-brass-300/50' : 'border-bronze-500/25'
        }`}
      >
        {map.style === 'illustrated' ? (
          <img src={painted ? thumbUrl : undefined} alt="" loading="lazy" decoding="async" className="h-full w-full scale-[1.12] object-cover" draggable={false} />
        ) : (
          <span className="block h-full w-full p-0.5">
            <MapPreview board={map.board} active={selected} />
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-col">
        <span
          className={`font-display text-base leading-tight font-extrabold tracking-[0.08em] uppercase ${selected ? 'text-parchment-50' : 'text-parchment-200'}`}
        >
          {map.name}
        </span>
        <span className="text-xs text-parchment-300">
          {t.setup.playersRange(map.players.min, map.players.max)} · {t.setup.towns(towns)}
        </span>
        <span className="font-display text-[0.65rem] font-semibold tracking-[0.18em] text-bronze-200/80 uppercase">{t.maps[map.id].terrain}</span>
      </span>

      <span
        aria-hidden="true"
        className={`absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-2 border-soot-950 bg-linear-to-b from-brass-200 to-bronze-500 text-soot-950 shadow-[0_0_10px_rgb(240_215_138/0.6)] transition duration-200 ${
          selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <IconCheck className="size-3.5" strokeWidth={3} />
      </span>
    </label>
  )
}
