import { useState, type Dispatch, type SetStateAction } from 'react'
import type { GameModeId } from '../data/gameModes'
import { getMap, isPlayableMapId, MAPS, type MapId } from '../data/maps'
import { MAX_NAME, placeholderName, seatCount, toSeatSetups, withController, type SavedSetup, type SeatDraft } from '../data/matchSetup'
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/engine'
import { OFFERED_AI_LEVELS, type AILevel, type SeatSetup } from '../game/types'
import { displayName, useT } from '../i18n'
import { randomSeed } from '../lib/random'
import { START_MONEY } from '../rules/constants'
import { roundsPerEra } from '../rules/match'
import { IconChevronDown, IconPlay } from './icons'
import { LockedMapCard, MapCard } from './MapCard'
import { Corners } from './theme/Ornaments'

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
  const t = useT()
  const map = getMap(mapId)
  const [seedText, setSeedText] = useState('')
  const count = seatCount(setup, mapId)
  const active = setup.seats.slice(0, count)
  const seedValid = seedText.trim() === '' || /^\d{1,9}$/.test(seedText.trim())

  const updateSeat = (index: number, update: (seat: SeatDraft) => SeatDraft) =>
    onSetupChange((prev) => ({ ...prev, seats: prev.seats.map((seat, i) => (i === index ? update(seat) : seat)) }))

  const start = () =>
    onStart({ modeId, mapId, seats: toSeatSetups(setup.seats, count), seed: seedText.trim() ? Number(seedText.trim()) : randomSeed() })

  return (
    <section aria-labelledby="setup-title" className="iron-framed @container relative animate-fade-up p-6 [animation-delay:200ms] sm:p-7">
      <Corners />
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="setup-title" className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {t.setup.title}
        </h2>
        <p className="text-sm text-parchment-300">
          {t.modes[modeId].name} · {t.setup.roundsPerEra(roundsPerEra(modeId, count))} · {t.setup.moneyEach(START_MONEY)}
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-6">
        {/* Map */}
        <fieldset>
          <legend className="eyebrow mb-2">{t.setup.map}</legend>
          <div className="grid gap-2 @2xl:grid-cols-3">
            {MAPS.filter((m) => isPlayableMapId(m.id)).map((m) => (
              <MapCard key={m.id} map={m} selected={m.id === mapId} onSelect={() => onMapChange(m.id)} />
            ))}
            <LockedMapCard />
          </div>
          <p className="mt-2 text-sm text-parchment-300">
            {t.maps[mapId].flavor}
            {map.style === 'schematic' && <span className="text-parchment-400"> {t.setup.practiceMap}</span>}
          </p>
        </fieldset>

        {/* Player count */}
        <fieldset>
          <legend className="eyebrow mb-2">{t.setup.players}</legend>
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
                  title={allowed ? undefined : t.setup.mapTakes(map.name, map.players.min, map.players.max)}
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
          <legend className="eyebrow mb-2">{t.setup.seats}</legend>
          <ul className="flex flex-col gap-2">
            {active.map((seat, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-bronze-500/20 bg-soot-950/55 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold text-soot-950 ring-1 ring-black/40"
                    style={{ background: 'var(--color-bronze-300)' }}
                  >
                    {i + 1}
                  </span>
                  <label className="sr-only" htmlFor={`seat-name-${i}`}>
                    {t.setup.seatName(i + 1)}
                  </label>
                  <input
                    id={`seat-name-${i}`}
                    type="text"
                    value={displayName(t, seat.name)}
                    maxLength={MAX_NAME}
                    placeholder={displayName(t, placeholderName(i, seat.isAI))}
                    onChange={(event) => updateSeat(i, (s) => ({ ...s, name: event.target.value }))}
                    className="min-h-11 min-w-0 flex-1 basis-36 rounded-lg border border-bronze-500/30 bg-soot-950/70 px-3 text-parchment-50 placeholder:text-parchment-400 focus:border-ember-400/70"
                  />
                  <Segmented
                    label={t.setup.playedBy(i + 1)}
                    options={[
                      ['human', t.setup.human],
                      ['ai', t.setup.ai],
                    ]}
                    value={seat.isAI ? 'ai' : 'human'}
                    onChange={(v) => updateSeat(i, (s) => withController(s, i, v === 'ai'))}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {seat.isAI && (
                    <Segmented
                      label={t.setup.difficulty(i + 1)}
                      options={OFFERED_AI_LEVELS.map((level) => [level, t.aiLevels[level]] as const)}
                      value={seat.aiLevel}
                      onChange={(v) => updateSeat(i, (s) => ({ ...s, aiLevel: v as AILevel }))}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-parchment-400">{t.setup.humanSeats}</p>
        </fieldset>

        {/* Seed */}
        <details className="group rounded-xl border border-bronze-500/20 bg-soot-950/40">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 font-display text-sm font-bold tracking-[0.14em] text-parchment-300 uppercase hover:text-parchment-50 [&::-webkit-details-marker]:hidden">
            {t.setup.advancedSeed}
            <IconChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-3 pb-3">
            <label htmlFor="setup-seed" className="eyebrow mb-2 block">
              {t.setup.seedLabel}
            </label>
            <input
              id="setup-seed"
              type="text"
              inputMode="numeric"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
              placeholder={t.setup.random}
              aria-invalid={!seedValid}
              aria-describedby="setup-seed-help"
              className="min-h-11 w-full rounded-lg border border-bronze-500/30 bg-soot-950/70 px-3 text-parchment-50 placeholder:text-parchment-400 focus:border-ember-400/70 aria-invalid:border-rust-400"
            />
            <p id="setup-seed-help" className={`mt-1 text-xs ${seedValid ? 'text-parchment-400' : 'text-rust-300'}`}>
              {seedValid ? t.setup.seedHelp : t.setup.seedInvalid}
            </p>
          </div>
        </details>

        <div className="flex flex-col gap-3">
          {replacesMatch && (
            <p className="rounded-lg border border-dashed border-bronze-500/40 px-3 py-2 text-sm text-parchment-300">
              {t.setup.replaces}
            </p>
          )}
          <button type="button" className="btn-brass min-h-16 w-full text-2xl" onClick={start} disabled={!seedValid}>
            <IconPlay className="size-6" />
            {t.setup.start}
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
