/**
 * One industry on the player panel (symbols only, as in assets/ui/player/_mockup.png):
 * - left: the industry icon framed in the player's colour, with UPGRADE under it;
 * - top right: level plate ▾, ×tiles left, the cost (coin £, one cube per coal
 *   or iron, the market price in brackets only when it must be bought);
 * - bottom right: the reward (income arrow, or + produced cubes) and the VP hexagon.
 * The locked shipyard shows only the lock, the "develop to unlock" line and ▾.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { INDUSTRY_ICON_URLS } from '../board/assets'
import type { IndustryLevel } from '../../rules/data'
import type { IndustryId } from '../../rules/tileTable'
import { useT } from '../../i18n'
import { RULES } from '../../rules/context'
import type { RowInfo } from './rowInfo'
import { Coin, Cube, CubeGroup, IncomeArrow, LevelPlate, Lock, VpHex } from './Symbols'

const PRODUCES: Partial<Record<IndustryId, 'coal' | 'iron'>> = { coal: 'coal', iron: 'iron' }

export function IndustryIconBox({ industry, color, dim = false, className = 'size-16' }: { industry: IndustryId; color: string; dim?: boolean; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-md border-2 bg-soot-950/80 p-1 ${className}`} style={{ borderColor: color, boxShadow: `0 0 0 1px #000, inset 0 0 10px ${color}55` }}>
      <img src={INDUSTRY_ICON_URLS[industry]} alt="" aria-hidden="true" className={`size-full object-contain ${dim ? 'opacity-40 grayscale' : ''}`} />
    </span>
  )
}

/** Cost: coin £, then a cube per coal and iron (with a market price in brackets when bought). */
export function CostLine({ tile, coal, iron }: { tile: IndustryLevel; coal?: readonly (number | null)[]; iron?: readonly (number | null)[] }) {
  const coals = coal ?? Array.from({ length: tile.cost.coal }, () => null)
  const irons = iron ?? Array.from({ length: tile.cost.iron }, () => null)
  const bracket = (prices: readonly (number | null)[]) => prices.find((p) => p !== null) ?? null
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1 font-display text-base font-bold text-parchment-50 tabular-nums">
        <Coin />
        {tile.cost.money}
      </span>
      {coals.length > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {coals.map((_, i) => (
            <Cube key={i} kind="coal" />
          ))}
          {bracket(coals) !== null && <span className="text-xs font-semibold text-parchment-300 tabular-nums">(£{bracket(coals)})</span>}
        </span>
      )}
      {irons.length > 0 && (
        <span className="inline-flex items-center gap-0.5">
          {irons.map((_, i) => (
            <Cube key={i} kind="iron" />
          ))}
          {bracket(irons) !== null && <span className="text-xs font-semibold text-parchment-300 tabular-nums">(£{bracket(irons)})</span>}
        </span>
      )}
    </span>
  )
}

/** Reward: the income arrow (mills, ports, shipyards) or + produced cubes (mines, works), then the VP hexagon. */
export function RewardLine({ tile, size = 'md' }: { tile: IndustryLevel; size?: 'sm' | 'md' }) {
  const produces = PRODUCES[tile.industry]
  return (
    <span className="inline-flex items-center gap-3">
      {produces ? (
        <span className="inline-flex items-center gap-1">
          <span className="font-display text-lg font-extrabold text-verdigris-300" aria-hidden="true">
            +
          </span>
          <CubeGroup kind={produces} count={tile.cubes} />
        </span>
      ) : (
        <IncomeArrow value={tile.income} size={size === 'sm' ? 'sm' : 'md'} />
      )}
      <VpHex value={tile.vp} size={size === 'sm' ? 'sm' : 'md'} />
    </span>
  )
}

interface IndustryRowProps {
  info: RowInfo
  color: string
  /** Read-only (another player's mat): no buttons. */
  readOnly?: boolean
  selected?: boolean
  /** Why the row (building) is disabled, or null. */
  buildBlocked?: string | null
  /** Why UPGRADE is disabled, or null. */
  upgradeBlocked?: string | null
  /** In the develop bar already. */
  upgradeSelected?: boolean
  /** Make UPGRADE's border pulse (rail era: the row can only be upgraded). */
  pulseUpgrade?: boolean
  onSelect?: () => void
  onUpgrade?: () => void
}

export function IndustryRow({ info, color, readOnly = false, selected = false, buildBlocked = null, upgradeBlocked = null, upgradeSelected = false, pulseUpgrade = false, onSelect, onUpgrade }: IndustryRowProps) {
  const t = useT()
  const b = t.brass
  const name = b.industry[info.industry]
  const [levelsOpen, setLevelsOpen] = useState(false)
  const tile = info.tile
  const dim = info.otherEra !== null || info.upgradeOnly
  const clickable = !readOnly && !!onSelect

  return (
    <div
      className={`relative flex gap-3 rounded-lg border bg-soot-900/80 p-2.5 transition-[border-color,box-shadow] ${
        selected ? 'border-transparent' : 'border-bronze-500/35'
      }`}
      style={selected ? { boxShadow: `0 0 0 2px ${color}, 0 0 16px ${color}88` } : undefined}
    >
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          disabled={!clickable}
          aria-disabled={clickable && !!buildBlocked && !info.upgradeOnly ? true : undefined}
          onClick={onSelect}
          title={buildBlocked ?? name}
          aria-label={`${name}${tile && !info.locked ? ` ${tile.level}` : ''}${buildBlocked ? `. ${buildBlocked}` : ''}`}
          aria-pressed={clickable ? selected : undefined}
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-200 enabled:cursor-pointer"
        >
          <IndustryIconBox industry={info.industry} color={color} dim={!tile || info.locked} />
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={upgradeBlocked ? undefined : onUpgrade}
            aria-disabled={upgradeBlocked ? true : undefined}
            aria-pressed={upgradeSelected}
            title={upgradeBlocked ?? `${b.upgrade}: ${name}`}
            className={`rounded border px-1.5 py-0.5 font-display text-[0.6rem] font-bold tracking-[0.08em] uppercase transition ${
              upgradeBlocked
                ? 'cursor-not-allowed border-bronze-500/25 text-parchment-500'
                : upgradeSelected
                  ? 'border-brass-200 bg-brass-300/20 text-brass-100'
                  : 'border-bronze-400/60 bg-soot-950/70 text-parchment-200 hover:border-brass-300 hover:text-parchment-50'
            } ${pulseUpgrade ? 'animate-[pulse-border_1s_ease-in-out_3]' : ''}`}
          >
            {b.upgrade}
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        {!tile ? (
          <p className="font-display text-sm font-semibold tracking-[0.06em] text-parchment-400 uppercase">{b.noneLeft}</p>
        ) : info.locked ? (
          <div className="flex items-center gap-2">
            <Lock />
            <span className="min-w-0 flex-1 font-display text-sm font-bold tracking-[0.04em] text-parchment-200">{b.locked}</span>
            <LevelsToggle label={b.levelsButton(name)} open={levelsOpen} onToggle={() => setLevelsOpen((v) => !v)} />
          </div>
        ) : (
          <>
            <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${dim ? 'opacity-45' : ''}`}>
              <span className="inline-flex items-center gap-0.5">
                <LevelPlate level={tile.level} />
                <LevelsToggle label={b.levelsButton(name)} open={levelsOpen} onToggle={() => setLevelsOpen((v) => !v)} />
              </span>
              <span className="font-display text-sm font-bold text-parchment-300 tabular-nums" title={b.tilesLeft(info.left)}>
                ×{info.left}
              </span>
              <CostLine tile={tile} coal={info.coal} iron={info.iron} />
            </div>
            <div className={`flex items-center gap-2 ${dim ? 'opacity-45' : ''}`}>
              <RewardLine tile={tile} />
              {info.otherEra && (
                <span className="ml-auto rounded border border-bronze-400/40 px-1.5 py-0.5 font-display text-[0.6rem] font-bold tracking-[0.08em] text-parchment-300 uppercase">
                  {b.eraTag[info.otherEra]}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      {levelsOpen && <LevelsPopup industry={info.industry} color={color} currentLevel={tile && !info.locked ? tile.level : 0} onClose={() => setLevelsOpen(false)} />}
    </div>
  )
}

function LevelsToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="dialog"
      className="grid size-6 place-items-center rounded text-sm text-parchment-200 hover:bg-bronze-500/20 hover:text-parchment-50"
    >
      ▾
    </button>
  )
}


/** Every level of an industry: icon, numeral, cost, reward. The current level is highlighted; higher levels have a greyed icon. */
export function LevelsPopup({ industry, color, currentLevel, onClose }: { industry: IndustryId; color: string; currentLevel: number; onClose: () => void }) {
  const t = useT()
  const b = t.brass
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  const levels = RULES.ctx.data.industries[industry].levels
  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="plate rivets absolute top-full right-0 left-0 z-30 mt-1 flex flex-col gap-1.5 bg-soot-900/[0.98] p-2.5 shadow-2xl outline-none"
    >
      <p id={titleId} className="font-display text-xs font-bold tracking-[0.1em] text-parchment-300 uppercase">
        {b.levels(b.industry[industry])}
      </p>
      {levels.map((level) => {
        const current = level.level === currentLevel
        return (
          <div
            key={level.level}
            className={`flex items-center gap-2.5 rounded-md border p-1.5 ${current ? 'border-brass-300/70 bg-brass-300/10' : 'border-bronze-500/20'}`}
            aria-current={current ? 'true' : undefined}
          >
            <IndustryIconBox industry={industry} color={color} dim={level.level > currentLevel || level.locked} className="size-10" />
            {level.locked ? (
              <span className="flex items-center gap-2 text-sm text-parchment-300">
                <Lock className="size-5" />
                {b.locked}
              </span>
            ) : (
              <>
                <LevelPlate level={level.level} />
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  <CostLine tile={level} />
                  <RewardLine tile={level} size="sm" />
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
