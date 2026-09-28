import { useState, type Dispatch, type SetStateAction } from 'react'
import { getGameMode, type GameModeId } from '../data/gameModes'
import { getMap, MAPS, type MapId } from '../data/maps'
import { MAX_NAME, placeholderName, seatCount, toSeatSetups, withColor, withController, type SavedSetup, type SeatDraft } from '../data/matchSetup'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/engine'
import { AI_LEVELS, PLAYER_COLORS, type AILevel, type SeatSetup } from '../game/types'
import { randomSeed } from '../lib/random'
import { PLAYER_STYLE } from './game/glyphs'
import { IconCheck, IconChevronDown, IconPlay } from './icons'
import { MapCard } from './MapCard'
import { useFirstPaintDone } from './theme/firstPaint'
import { Corners } from './theme/Ornaments'

/** The rail tokens, small (assets/tokens/swatches: 144 × 60 WebP copies of the board's art), for the colour choices. */
const SWATCHES = import.meta.glob<string>('../../assets/tokens/swatches/token_rail_*.webp', { eager: true, import: 'default' })
const swatchUrl = (color: string) => SWATCHES[`../../assets/tokens/swatches/token_rail_${color}.webp`]

/** Everything a new match needs. */
export interface MatchSetup {
  modeId: GameModeId
  mapId: MapId
  seats: SeatSetup[]
  seed: number
}

interface MatchSetupPanelProps {
  modeId: GameModeId
  mapId: MapId
  onMapChange: (id: MapId) => void
  setup: SavedSetup
  onSetupChange: Dispatch<SetStateAction<SavedSetup>>
  /** A saved match will be replaced. */
  replacesMatch: boolean
  onStart: (setup: MatchSetup) => void
}

/**
 * The new-match setup, inline on the Play page: map, 2–4 seats (human or
 * computer at a chosen level, each with a name and a colour of their own), an
 * optional seed for replays, and START MATCH. The mode comes from the cards
 * above it.
 */
export function MatchSetupPanel({ modeId, mapId, onMapChange, setup, onSetupChange, replacesMatch, onStart }: MatchSetupPanelProps) {
  const map = getMap(mapId)
  const mode = getGameMode(modeId)
  const [seedText, setSeedText] = useState('')
  const count = seatCount(setup, mapId)
  const active = setup.seats.slice(0, count)
  const seedValid = seedText.trim() === '' || /^\d{1,9}$/.test(seedText.trim())

  // The swatches are pictures: they load once the page's text is on screen.
  const painted = useFirstPaintDone()
  const updateSeat = (index: number, update: (seat: SeatDraft) => SeatDraft) =>
    onSetupChange((prev) => ({ ...prev, seats: prev.seats.map((seat, i) => (i === index ? update(seat) : seat)) }))

  const start = () =>
    onStart({ modeId, mapId, seats: toSeatSetups(setup.seats, count), seed: seedText.trim() ? Number(seedText.trim()) : randomSeed() })

  return (
    <section aria-labelledby="setup-title" className="iron-framed @container relative animate-fade-up p-6 [animation-delay:200ms] sm:p-7">
      <Corners />
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="setup-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          Match setup
        </h2>
        <p className="text-sm text-parchment-300">
          {mode.name} · {mode.rounds} rounds · £{mode.startingMoney} each
          {map.style === 'illustrated' && <> · rail era from round {Math.floor(mode.rounds / 2) + 1}</>}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-6">
        {/* Map */}
        <fieldset>
          <legend className="eyebrow mb-2">Map</legend>
          <div className="grid gap-2 @2xl:grid-cols-3">
            {MAPS.map((m) => (
              <MapCard key={m.id} map={m} selected={m.id === mapId} onSelect={() => onMapChange(m.id)} />
            ))}
          </div>
          <p className="mt-2 text-sm text-parchment-300">
            {map.flavor}
            {map.style === 'schematic' && <span className="text-parchment-400"> Practice map, no eras.</span>}
          </p>
        </fieldset>

        {/* Player count */}
        <fieldset>
          <legend className="eyebrow mb-2">Players</legend>
          <div className="flex max-w-sm gap-2">
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map((n) => {
              const allowed = n >= map.players.min && n <= map.players.max
              return (
                <label
                  key={n}
                  className={`flex min-h-11 flex-1 items-center justify-center rounded-lg border text-center font-display text-xl font-bold transition has-focus-visible:outline-2 has-focus-visible:outline-ember-400 ${
                    !allowed
                      ? 'cursor-not-allowed border-bronze-500/15 text-parchment-500'
                      : n === count
                        ? 'cursor-pointer border-brass-300/80 bg-bronze-500/25 text-parchment-50'
                        : 'cursor-pointer border-bronze-500/30 bg-soot-950/60 text-parchment-300 hover:border-ember-400/60'
                  }`}
                  title={allowed ? undefined : `${map.name} takes ${map.players.min}–${map.players.max} players`}
                >
                  <input
                    type="radio"
                    name="player-count"
                    value={n}
                    checked={n === count}
                    disabled={!allowed}
                    onChange={() => onSetupChange((prev) => ({ ...prev, count: n }))}
                    className="sr-only"
                  />
                  {n}
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Seats */}
        <fieldset>
          <legend className="eyebrow mb-2">Seats</legend>
          <ul className="flex flex-col gap-2">
            {active.map((seat, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-bronze-500/20 bg-soot-950/55 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold text-soot-950 ring-1 ring-black/40"
                    style={{ background: PLAYER_STYLE[seat.color].hex }}
                  >
                    {i + 1}
                  </span>
                  <label className="sr-only" htmlFor={`seat-name-${i}`}>
                    Seat {i + 1} name
                  </label>
                  <input
                    id={`seat-name-${i}`}
                    type="text"
                    value={seat.name}
                    maxLength={MAX_NAME}
                    placeholder={placeholderName(i, seat.isAI)}
                    onChange={(event) => updateSeat(i, (s) => ({ ...s, name: event.target.value }))}
                    className="min-h-11 min-w-0 flex-1 basis-36 rounded-lg border border-bronze-500/30 bg-soot-950/70 px-3 text-parchment-50 placeholder:text-parchment-400 focus:border-ember-400/70"
                  />
                  <Segmented
                    label={`Seat ${i + 1} is played by`}
                    options={[
                      ['human', 'Human'],
                      ['ai', 'AI'],
                    ]}
                    value={seat.isAI ? 'ai' : 'human'}
                    onChange={(v) => updateSeat(i, (s) => withController(s, i, v === 'ai'))}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div role="radiogroup" aria-label={`Seat ${i + 1} colour`} className="flex flex-wrap gap-1.5">
                    {PLAYER_COLORS.map((color) => {
                      const takenBy = active.findIndex((other, j) => j !== i && other.color === color)
                      const style = PLAYER_STYLE[color]
                      const chosen = seat.color === color
                      const token = swatchUrl(color)
                      return (
                        <button
                          key={color}
                          type="button"
                          role="radio"
                          aria-checked={chosen}
                          aria-label={`${style.name}${takenBy >= 0 ? ` (swap with seat ${takenBy + 1})` : ''}`}
                          title={takenBy >= 0 ? `${style.name}: taken by seat ${takenBy + 1}; picking it swaps colours` : style.name}
                          onClick={() => onSetupChange((prev) => ({ ...prev, seats: withColor(prev.seats, i, color) }))}
                          className={`relative grid h-11 w-12 place-items-center rounded-lg border transition sm:w-14 ${
                            chosen
                              ? 'border-brass-300/90 bg-bronze-500/25 shadow-[0_0_10px_-2px_rgb(240_215_138/0.6)]'
                              : takenBy >= 0
                                ? 'border-transparent opacity-35 hover:opacity-70'
                                : 'border-bronze-500/25 hover:border-ember-400/60'
                          }`}
                        >
                          {token ? (
                            <img src={painted ? token : undefined} alt="" loading="lazy" decoding="async" className="h-5 w-10 object-contain sm:w-12" draggable={false} />
                          ) : (
                            <span className="h-4 w-10 rounded-full" style={{ background: style.hex }} />
                          )}
                          {chosen && (
                            <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full border border-soot-950 bg-brass-300 text-soot-950">
                              <IconCheck className="size-3" strokeWidth={3.2} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {seat.isAI && (
                    <Segmented
                      label={`Seat ${i + 1} difficulty`}
                      options={AI_LEVELS.map((level) => [level, level[0].toUpperCase() + level.slice(1)] as const)}
                      value={seat.aiLevel}
                      onChange={(v) => updateSeat(i, (s) => ({ ...s, aiLevel: v as AILevel }))}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-parchment-400">Human seats take turns on this device (pass & play).</p>
        </fieldset>

        {/* Seed */}
        <details className="group rounded-xl border border-bronze-500/20 bg-soot-950/40">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 font-display text-sm font-bold tracking-[0.14em] text-parchment-300 uppercase hover:text-parchment-50 [&::-webkit-details-marker]:hidden">
            Advanced: seed
            <IconChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-3 pb-3">
            <label htmlFor="setup-seed" className="eyebrow mb-2 block">
              Seed (optional)
            </label>
            <input
              id="setup-seed"
              type="text"
              inputMode="numeric"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
              placeholder="Random"
              aria-invalid={!seedValid}
              aria-describedby="setup-seed-help"
              className="min-h-11 w-full rounded-lg border border-bronze-500/30 bg-soot-950/70 px-3 text-parchment-50 placeholder:text-parchment-400 focus:border-ember-400/70 aria-invalid:border-rust-400"
            />
            <p id="setup-seed-help" className={`mt-1 text-xs ${seedValid ? 'text-parchment-400' : 'text-rust-300'}`}>
              {seedValid
                ? 'The same seed and seats replay the same computer moves. Leave it empty for a new match.'
                : 'A seed is a whole number of up to 9 digits.'}
            </p>
          </div>
        </details>

        <div className="flex flex-col gap-3">
          {replacesMatch && (
            <p className="rounded-lg border border-dashed border-bronze-500/40 px-3 py-2 text-sm text-parchment-300">
              Starting a new match replaces the match in progress.
            </p>
          )}
          <button type="button" className="btn-brass min-h-16 w-full text-2xl" onClick={start} disabled={!seedValid}>
            <IconPlay className="size-6" />
            Start match
          </button>
        </div>
      </div>
    </section>
  )
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly (readonly [string, string])[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-bronze-500/35" role="radiogroup" aria-label={label}>
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`min-h-11 px-3 text-xs font-semibold tracking-wide uppercase transition ${
            value === key ? 'bg-bronze-500/30 text-parchment-50' : 'text-parchment-400 hover:text-parchment-100'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
