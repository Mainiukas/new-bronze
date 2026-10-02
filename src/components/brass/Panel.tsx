/**
 * The rest of the player panel: the action buttons (a triangle in the canal
 * era: CANAL on top, LOAN · SELL · SKIP below; RAIL and 2 RAILS in the rail
 * era), the develop (UPGRADE) bar, the stats bar, the opponents, the hand of
 * cards and the top bar with the markets.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import actCanalUrl from '../../../assets/ui/player/act_canal.svg'
import actLoanUrl from '../../../assets/ui/player/act_loan.svg'
import actRail2Url from '../../../assets/ui/player/act_rail2.svg'
import actRailUrl from '../../../assets/ui/player/act_rail.svg'
import actSellUrl from '../../../assets/ui/player/act_sell.svg'
import actSkipUrl from '../../../assets/ui/player/act_skip.svg'
import { useT } from '../../i18n'
import { CANAL_COST, DOUBLE_RAIL_COST, RAIL_COST } from '../../rules/constants'
import { incomeOf, marketBuyPrice, type RulesContext } from '../../rules/engine'
import type { GameState, PlayerState } from '../../rules/state'
import { roman, type IndustryId } from '../../rules/tileTable'
import { NO_LOAN_URL } from './cardArt'
import { Coin, Cube, IncomeArrow, VpHex } from './Symbols'

/* ---- Action buttons ---------------------------------------------------------- */

interface ActionButtonProps {
  icon: string
  label: string
  /** Tooltip when enabled (default: the label). */
  title?: string
  cost?: ReactNode
  disabled?: string | null
  active?: boolean
  onClick: () => void
  className?: string
}

function ActionButton({ icon, label, title, cost, disabled = null, active = false, onClick, className = '' }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled ? true : undefined}
      aria-pressed={active}
      title={disabled ?? title ?? label}
      className={`action-btn flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-1.5 text-center transition ${
        disabled
          ? 'cursor-not-allowed border-bronze-500/25 bg-soot-900/60 opacity-50'
          : active
            ? 'border-brass-200 bg-bronze-500/35 shadow-[0_0_12px_rgb(248_216_132/0.45)]'
            : 'border-bronze-400/70 bg-linear-to-b from-bronze-700/60 to-soot-900 hover:border-brass-300'
      } ${className}`}
    >
      <span className="flex items-center justify-center gap-2 font-display text-sm font-bold tracking-[0.1em] text-parchment-50 uppercase">
        <img src={icon} alt="" aria-hidden="true" className="size-5" />
        {label}
      </span>
      {cost && <span className="flex items-center justify-center gap-1">{cost}</span>}
    </button>
  )
}

export interface ActionState {
  canal?: string | null
  rail?: string | null
  rails?: string | null
  loan?: string | null
  sell?: string | null
  skip?: string | null
}

export function ActionButtons({
  state,
  ctx,
  disabled,
  noLoans,
  active,
  onNetwork,
  onLoan,
  onSell,
  onSkip,
}: {
  state: GameState
  ctx: RulesContext
  disabled: ActionState
  /** The no-loan coin on LOAN: 'last' = the last round to take one, 'none' = no more loans. */
  noLoans: 'last' | 'none' | null
  active: 'canal' | 'rail' | 'rails' | 'loan' | 'sell' | 'skip' | null
  onNetwork: (count: 1 | 2) => void
  onLoan: () => void
  onSell: () => void
  onSkip: () => void
}) {
  const t = useT()
  const a = t.brass.actions
  const coalPrice = (n: number) => {
    // The market price is shown only when coal would have to come from the market (no mine has coal).
    const onBoard = Object.values(state.tiles).some((tile) => tile.industry === 'coal' && tile.cubes > 0)
    return onBoard ? null : marketBuyPrice(ctx, 'coal', state.market.coal - n + 1)
  }
  const money = (n: number) => (
    <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-parchment-50 tabular-nums">
      <Coin className="size-4" />
      {n}
    </span>
  )
  const coal = (n: number) => (
    <>
      <span className="text-parchment-300">+</span>
      {Array.from({ length: n }, (_, i) => (
        <Cube key={i} kind="coal" price={i === n - 1 ? coalPrice(n) : null} className="size-3.5" />
      ))}
    </>
  )
  const bottom = (
    <div className="grid grid-cols-3 gap-2">
      <ActionButton
        icon={noLoans ? NO_LOAN_URL : actLoanUrl}
        label={a.loan}
        disabled={disabled.loan}
        title={noLoans === 'last' ? t.brass.lastLoanRound : undefined}
        active={active === 'loan'}
        onClick={onLoan}
      />
      <ActionButton icon={actSellUrl} label={a.sell} disabled={disabled.sell} active={active === 'sell'} onClick={onSell} />
      <ActionButton icon={actSkipUrl} label={a.skip} disabled={disabled.skip} active={active === 'skip'} onClick={onSkip} />
    </div>
  )
  if (state.era === 'canal') {
    return (
      <div className="action-buttons-canal flex flex-col gap-2">
        <div className="flex justify-center">
          <ActionButton icon={actCanalUrl} label={a.canal} cost={money(CANAL_COST)} disabled={disabled.canal} active={active === 'canal'} onClick={() => onNetwork(1)} className="w-1/2" />
        </div>
        {bottom}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={actRailUrl}
          label={a.rail}
          cost={
            <>
              {money(RAIL_COST)}
              {coal(1)}
            </>
          }
          disabled={disabled.rail}
          active={active === 'rail'}
          onClick={() => onNetwork(1)}
        />
        <ActionButton
          icon={actRail2Url}
          label={a.rails}
          cost={
            <>
              {money(DOUBLE_RAIL_COST)}
              {coal(2)}
            </>
          }
          disabled={disabled.rails}
          active={active === 'rails'}
          onClick={() => onNetwork(2)}
        />
      </div>
      {bottom}
    </div>
  )
}

/* ---- Develop (UPGRADE) bar ------------------------------------------------------ */

export function UpgradeBar({
  chips,
  names,
  ironPrices,
  error,
  onRemove,
  onAddAnother,
  onConfirm,
  onCancel,
}: {
  chips: { industry: IndustryId; level: number }[]
  names: Record<IndustryId, string>
  /** One per chip: the market price when that iron must be bought, else null. */
  ironPrices: (number | null)[]
  error: string | null
  onRemove: (index: number) => void
  onAddAnother: (() => void) | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  const b = t.brass
  const same = chips.length === 2 && chips[0].industry === chips[1].industry
  return (
    <div className="flex flex-col gap-2 rounded-lg border-2 border-brass-300/60 bg-soot-900/95 p-2.5 shadow-[0_0_14px_rgb(248_216_132/0.25)]" role="region" aria-label={b.developTitle}>
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full border border-bronze-400/60 bg-soot-950 py-0.5 pr-1 pl-2.5 text-sm font-semibold text-parchment-100">
            {names[chip.industry]} {roman(chip.level)}
            <button type="button" aria-label={b.removeChip(`${names[chip.industry]} ${roman(chip.level)}`)} onClick={() => onRemove(i)} className="grid size-5 place-items-center rounded-full text-parchment-300 hover:bg-bronze-500/30 hover:text-parchment-50">
              ×
            </button>
          </span>
        ))}
        {same && <span className="text-xs text-parchment-400">{b.sameTwice}</span>}
        {onAddAnother && (
          <button type="button" onClick={onAddAnother} className="rounded-full border border-dashed border-bronze-400/60 px-2.5 py-0.5 text-sm text-parchment-300 hover:text-parchment-50">
            {b.addAnother}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1" aria-label={`${chips.length} ${t.brass.iron}`}>
          {ironPrices.map((price, i) => (
            <Cube key={i} kind="iron" price={price} />
          ))}
        </span>
        <span className="flex-1" />
        <button type="button" className="btn btn-ghost min-h-9 px-3 text-sm" onClick={onCancel}>
          {b.cancel}
        </button>
        <button type="button" className="btn btn-primary min-h-9 px-4 text-sm" onClick={onConfirm} disabled={chips.length === 0 || !!error} title={error ?? undefined}>
          {b.confirm}
        </button>
      </div>
      {error && <p className="text-xs text-ember-300">{error}</p>}
    </div>
  )
}

/* ---- Stats bar --------------------------------------------------------------------- */

/** A number that counts to its new value and flashes green (up) or red (down). */
function Animated({ value, render }: { value: number; render: (shown: number) => ReactNode }) {
  const [shown, setShown] = useState(value)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const from = useRef(value)
  useEffect(() => {
    if (value === from.current) return
    const start = from.current
    const dir = value > start ? 'up' : 'down'
    from.current = value
    const reduce = document.documentElement.dataset.animations === 'off'
    const began = performance.now()
    const ms = reduce ? 0 : 500
    let frame = 0
    const step = (now: number) => {
      const p = ms === 0 ? 1 : Math.min(1, (now - began) / ms)
      if (!reduce && p < 1) setFlash(dir)
      setShown(Math.round(start + (value - start) * p))
      if (p < 1) frame = requestAnimationFrame(step)
      else setTimeout(() => setFlash(null), 400)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])
  const cls = flash === 'up' ? 'stat-flash inline-flex animate-[stat-up_0.9s_ease-out]' : flash === 'down' ? 'stat-flash inline-flex animate-[stat-down_0.9s_ease-out]' : 'inline-flex'
  return <span className={cls}>{render(shown)}</span>
}

export function StatsBar({ player, ctx }: { player: PlayerState; ctx: RulesContext }) {
  const t = useT()
  const income = incomeOf(ctx, player)
  return (
    <div className="stats-bar grid grid-cols-3 items-center rounded-lg border-2 border-bronze-400/50 bg-soot-950/90 px-2 py-2.5">
      <span className="flex items-center justify-center gap-2" role="img" aria-label={`${t.brass.money}: £${player.money}`}>
        <Coin className="size-11" />
        <Animated value={player.money} render={(v) => <span className="font-display text-3xl font-bold text-parchment-50 tabular-nums">£{v}</span>} />
      </span>
      <span className="flex justify-center">
        <Animated value={income} render={(v) => <IncomeArrow value={v} size="lg" label={`${t.brass.income}: £${income}`} />} />
      </span>
      <span className="flex justify-center">
        <Animated value={player.vp} render={(v) => <VpHex value={v} size="lg" label={`${t.brass.vp}: ${player.vp}`} />} />
      </span>
    </div>
  )
}
