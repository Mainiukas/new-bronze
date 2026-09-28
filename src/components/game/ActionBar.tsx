import type { ReactNode } from 'react'
import {
  buildBlocker,
  buildTargets,
  currentPlayer,
  getTown,
  industriesOn,
  linkBlocker,
  linkCost,
  linkKindNow,
  linkTargets,
  quote,
  shipBlocker,
  shipment,
  shipOptions,
  shipSources,
} from '../../game/engine'
import type { GameMessage } from '../../game/messages'
import { INDUSTRIES, LINK_COST, RULES } from '../../game/rules'
import type { GameAction, GameState, IndustryKind } from '../../game/types'
import { IconClose } from '../icons'
import { displayName, useT, type Messages } from '../../i18n'
import { marketLabel, payoutLabel, routeLabel } from './format'
import { IndustryIcon } from './IndustryIcon'

/** What the current (human) player is in the middle of choosing. Nothing happens until it's confirmed. */
export type UiMode =
  | { type: 'idle' }
  | { type: 'build'; kind: IndustryKind | null }
  | { type: 'link' }
  | { type: 'ship'; buildingId: number | null; marketId: string | null }

interface ActionBarProps {
  game: GameState
  ui: UiMode
  onUiChange: (ui: UiMode) => void
  onAction: (action: GameAction) => void
}

/** The action controls for the active human player. */
export function ActionBar({ game, ui, onUiChange, onAction }: ActionBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {ui.type === 'idle' && <ActionMenu game={game} onUiChange={onUiChange} onAction={onAction} />}
      {ui.type === 'build' && <BuildPicker game={game} kind={ui.kind} onUiChange={onUiChange} onAction={onAction} />}
      {ui.type === 'link' && <LinkPicker game={game} onUiChange={onUiChange} onAction={onAction} />}
      {ui.type === 'ship' && <ShipPicker game={game} buildingId={ui.buildingId} marketId={ui.marketId} onUiChange={onUiChange} onAction={onAction} />}
    </div>
  )
}

interface PickerProps {
  game: GameState
  onUiChange: (ui: UiMode) => void
  onAction: (action: GameAction) => void
}

function ActionMenu({ game, onUiChange, onAction }: PickerProps) {
  const t = useT()
  const a = t.actions
  const player = currentPlayer(game)
  const kinds = industriesOn(game.board)
  const buildReasons = kinds.map((kind) => buildBlocker(game, kind))
  const canBuild = buildReasons.some((r) => r === null)
  const cheapest = Math.min(...kinds.filter((_, i) => buildReasons[i] === null).map((kind) => quote(player, INDUSTRIES[kind].cost).total))
  // The most useful reason to show when nothing can be built: the cheapest "Needs £…", else the first.
  const needs = buildReasons
    .filter((r): r is Extract<GameMessage, { key: 'needsMoney' }> => r?.key === 'needsMoney')
    .sort((x, y) => x.amount - y.amount)
  const buildReason = needs[0] ?? buildReasons.find((r) => r) ?? null
  const linkReason = linkBlocker(game)
  const linkDetail =
    game.era === 'canal'
      ? a.canalCost(LINK_COST.canal.money)
      : game.era === 'rail'
        ? a.railwayCost(t.quote(quote(player, LINK_COST.rail)))
        : a.bothCosts(LINK_COST.canal.money, LINK_COST.rail.money)
  const shipReason = shipBlocker(game)
  const sources = shipSources(game)
  const say = (message: GameMessage) => t.gameMessage(message)

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
      <ActionButton
        title={a.buildIndustry}
        detail={canBuild ? a.from(cheapest) : buildReason ? say(buildReason) : ''}
        disabled={!canBuild}
        onClick={() => onUiChange({ type: 'build', kind: null })}
      />
      <ActionButton title={a.buildLink} detail={linkReason ? say(linkReason) : linkDetail} disabled={linkReason !== null} onClick={() => onUiChange({ type: 'link' })} />
      <ActionButton
        title={a.ship}
        detail={shipReason ? say(shipReason) : a.sourcesReady(sources.length)}
        disabled={shipReason !== null}
        highlight={sources.some((b) => INDUSTRIES[b.kind].ships === 'cotton' && b.goods >= RULES.goodsCapacity)}
        onClick={() => onUiChange({ type: 'ship', buildingId: sources.length === 1 ? sources[0].id : null, marketId: null })}
      />
      <ActionButton title={a.raiseFunds} detail={`+£${RULES.raiseFunds}`} onClick={() => onAction({ type: 'raiseFunds' })} />
      <ActionButton title={a.endTurn} detail={game.actionsLeft === 1 ? a.skipsLast : a.skipsBoth} quiet onClick={() => onAction({ type: 'endTurn' })} />
    </div>
  )
}

function ActionButton({
  title,
  detail,
  disabled,
  highlight,
  quiet,
  onClick,
  className = '',
}: {
  title: string
  detail: string
  disabled?: boolean
  highlight?: boolean
  quiet?: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left transition duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${
        highlight
          ? 'border-brass-300/80 bg-linear-to-b from-bronze-500/30 to-soot-800 shadow-[0_0_20px_-6px_rgb(255_157_77/0.7)]'
          : quiet
            ? 'border-bronze-500/25 bg-soot-900/80 hover:border-bronze-300/60'
            : 'border-bronze-500/35 bg-linear-to-b from-soot-700 to-soot-850 hover:border-bronze-300/70 hover:shadow-[0_0_18px_-6px_rgb(255_157_77/0.6)]'
      } ${className}`}
    >
      <span className="font-display text-base leading-tight font-bold tracking-[0.08em] text-parchment-50 uppercase">{title}</span>
      <span className={`text-xs leading-snug ${disabled ? 'text-rust-300' : 'text-parchment-300'}`}>{detail}</span>
    </button>
  )
}

function PickerHeader({ title, hint, onBack, onCancel }: { title: string; hint: ReactNode; onBack?: () => void; onCancel: () => void }) {
  const t = useT()
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight font-bold tracking-[0.08em] text-parchment-50 uppercase">{title}</p>
        <p className="text-sm text-parchment-300">{hint}</p>
      </div>
      {onBack && (
        <button type="button" onClick={onBack} className="btn btn-ghost px-3 text-sm">
          {t.common.back}
        </button>
      )}
      <button type="button" onClick={onCancel} className="btn btn-ghost px-3 text-sm" aria-label={t.actions.cancelAction}>
        <IconClose className="size-4" />
        <span>{t.common.cancel}</span>
      </button>
    </div>
  )
}

/** A choice in a list (plots, routes, sources, markets). */
function Choice({ children, onClick, disabled, selected, title }: { children: ReactNode; onClick: () => void; disabled?: boolean; selected?: boolean; title?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-left text-sm text-parchment-100 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? 'border-brass-300 bg-bronze-500/25' : 'border-bronze-500/30 bg-soot-950/60 hover:border-ember-400/70 hover:bg-bronze-500/10'
      }`}
    >
      {children}
    </button>
  )
}

function BuildPicker({ game, kind, onUiChange, onAction }: PickerProps & { kind: IndustryKind | null }) {
  const t = useT()
  const a = t.actions
  const player = currentPlayer(game)
  const cancel = () => onUiChange({ type: 'idle' })

  if (kind === null) {
    return (
      <>
        <PickerHeader title={a.buildAnIndustry} hint={a.buildHint} onCancel={cancel} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {industriesOn(game.board).map((option) => {
            const def = INDUSTRIES[option]
            const q = quote(player, def.cost)
            const reason = buildBlocker(game, option)
            return (
              <button
                key={option}
                type="button"
                disabled={reason !== null}
                onClick={() => onUiChange({ type: 'build', kind: option })}
                className="flex items-start gap-3 rounded-xl border border-bronze-500/30 bg-soot-950/60 p-2.5 text-left transition hover:border-ember-400/70 hover:bg-bronze-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IndustryIcon kind={option} className="size-10 shrink-0 rounded-lg border border-bronze-500/40 bg-soot-800" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-sm font-bold tracking-[0.06em] text-parchment-50 uppercase">
                    {t.industries[option].name} <span className="text-brass-300">+{def.prestige}★</span>
                  </span>
                  <span className="text-xs text-parchment-300">{t.industries[option].output(RULES)}</span>
                  <span className={`mt-0.5 text-xs font-semibold ${reason ? 'text-rust-300' : 'text-bronze-200'}`}>{reason ? t.gameMessage(reason) : t.quote(q)}</span>
                </span>
              </button>
            )
          })}
        </div>
      </>
    )
  }

  const def = INDUSTRIES[kind]
  const plots = buildTargets(game, kind)
  return (
    <>
      <PickerHeader
        title={a.buildA(kind)}
        hint={a.buildWhere(t.quote(quote(player, def.cost)), def.prestige)}
        onBack={() => onUiChange({ type: 'build', kind: null })}
        onCancel={cancel}
      />
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {plots.map((plot) => {
          const town = getTown(game, plot.townId)
          return (
            <button
              key={`${plot.townId}#${plot.slot}`}
              type="button"
              onClick={() => onAction({ type: 'build', kind, ...plot })}
              className="min-h-10 rounded-lg border border-bronze-500/30 bg-soot-950/60 px-3 text-sm text-parchment-100 transition hover:border-ember-400/70"
            >
              {town.name} <span className="text-parchment-400">· {a.slot(plot.slot + 1)}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function LinkPicker({ game, onUiChange, onAction }: PickerProps) {
  const t = useT()
  const a = t.actions
  const player = currentPlayer(game)
  const routes = linkTargets(game)
  return (
    <>
      <PickerHeader
        title={a.buildALink}
        hint={a.linkHint(game.era, LINK_COST.canal.money, LINK_COST.rail.money, RULES.coalPrice, RULES.linkPrestige)}
        onCancel={() => onUiChange({ type: 'idle' })}
      />
      <div className="grid max-h-60 gap-1.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-1">
        {routes.map((route) => {
          const q = quote(player, linkCost(game, route))
          return (
            <Choice key={route.id} disabled={q.total > player.money} onClick={() => onAction({ type: 'link', routeId: route.id })} title={q.total > player.money ? t.gameMessage({ key: 'needsMoney', amount: q.total }) : undefined}>
              <span>
                {routeLabel(t, game, route.id)}
                <span className="text-parchment-400"> · {a.routeKind[linkKindNow(game, route) === 'canal' ? 'canal' : 'rail']}</span>
              </span>
              <span className={`text-xs font-semibold whitespace-nowrap ${q.total > player.money ? 'text-rust-300' : 'text-bronze-200'}`}>
                {q.total > player.money ? t.gameMessage({ key: 'needsMoney', amount: q.total }) : t.quote(q)}
              </span>
            </Choice>
          )
        })}
      </div>
    </>
  )
}

/** "Cotton mill, Birmingham" and its load: "3 cotton" / "4 coal in your store" (`goods`: without "in your store"). */
function sourceLabel(t: Messages, game: GameState, buildingId: number): { name: string; load: string; goods: string } {
  const b = game.buildings.find((x) => x.id === buildingId)!
  const load = shipment(game, b)!
  const goods = t.amountOf(load.amount, load.goods)
  return {
    name: `${t.industries[b.kind].name}, ${getTown(game, b.townId).name}`,
    goods,
    load: load.goods === 'cotton' ? goods : t.actions.inStore(goods),
  }
}

function ShipPicker({ game, buildingId, marketId, onUiChange, onAction }: PickerProps & { buildingId: number | null; marketId: string | null }) {
  const t = useT()
  const a = t.actions
  const sources = shipSources(game)
  const cancel = () => onUiChange({ type: 'idle' })

  if (buildingId === null) {
    return (
      <>
        <PickerHeader
          title={a.ship}
          hint={a.shipHint}
          onCancel={cancel}
        />
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {sources.map((source) => {
            const label = sourceLabel(t, game, source.id)
            return (
              <Choice key={source.id} onClick={() => onUiChange({ type: 'ship', buildingId: source.id, marketId: null })}>
                <span className="flex items-center gap-2">
                  <IndustryIcon kind={source.kind} className="size-6" />
                  {label.name}
                </span>
                <span className="text-xs font-semibold text-brass-300">{label.load}</span>
              </Choice>
            )
          })}
        </div>
      </>
    )
  }

  const label = sourceLabel(t, game, buildingId)
  const options = shipOptions(game, buildingId)
  const back = sources.length > 1 ? () => onUiChange({ type: 'ship', buildingId: null, marketId: null }) : undefined
  const chosen = options.find((q) => q.marketId === marketId)

  if (!chosen) {
    return (
      <>
        <PickerHeader
          title={a.shipLoad(label.goods)}
          hint={a.shipFrom(label.name)}
          onBack={back}
          onCancel={cancel}
        />
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
          {options.map((q) => (
            <Choice
              key={q.marketId}
              disabled={!q.affordable}
              onClick={() => onUiChange({ type: 'ship', buildingId, marketId: q.marketId })}
              title={q.affordable ? undefined : a.cantPayFees(q.tollTotal + q.fee)}
            >
              <span>
                {marketLabel(t, game, q)}
                <span className="text-parchment-400"> · {q.routeIds.length === 0 ? a.sameTown : a.links(q.routeIds.length)}</span>
              </span>
              <span className={`text-xs font-semibold whitespace-nowrap ${q.affordable ? 'text-brass-300' : 'text-rust-300'}`}>
                {q.affordable ? payoutLabel(q) : a.cantAffordTolls}
              </span>
            </Choice>
          ))}
        </div>
      </>
    )
  }

  const hub = chosen.portOwner === null
  const price = hub ? game.prices[chosen.marketId] : RULES.portPrice
  const units = Array.from({ length: chosen.amount }, (_, i) => (hub ? Math.max(RULES.priceFloor, price - i * RULES.priceDropPerGoods) : price))
  const market = marketLabel(t, game, chosen)
  const rows: [string, string, string?, boolean?][] = [
    [a.revenue, `+£${chosen.revenue}`, `${chosen.amount} × ${t.game.goods[chosen.goods]}: ${units.map((u) => `£${u}`).join(' + ')}`],
    [
      a.tolls,
      chosen.tollTotal ? `−£${chosen.tollTotal}` : '£0',
      Object.entries(chosen.tollsByOwner)
        .map(([owner, n]) => `${displayName(t, game.players[Number(owner)].name)} £${n * RULES.toll}`)
        .join(', ') || a.ownLinksOnly,
    ],
    [a.portFee, chosen.fee ? `−£${chosen.fee}` : '£0', chosen.feeOwner !== null ? a.feePerUnit(RULES.portFee, displayName(t, game.players[chosen.feeOwner].name)) : undefined],
    [a.youGet, `${chosen.net >= 0 ? '+' : '−'}£${Math.abs(chosen.net)}`, undefined, true],
    [a.prestige, `+${chosen.prestige}★`, chosen.routeIds.length >= RULES.longHaulLinks ? a.doubled(chosen.routeIds.length) : a.links(chosen.routeIds.length), true],
  ]
  return (
    <>
      <PickerHeader
        title={a.shipTo(market)}
        hint={a.shipSummary(
          label.goods,
          label.name,
          chosen.routeIds.map((id) => routeLabel(t, game, id)),
          hub ? { market, price: Math.max(RULES.priceFloor, price - chosen.amount * RULES.priceDropPerGoods) } : null,
        )}
        onBack={() => onUiChange({ type: 'ship', buildingId, marketId: null })}
        onCancel={cancel}
      />
      <dl className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-3 gap-y-1 rounded-lg border border-bronze-500/25 bg-soot-950/60 px-3 py-2 text-sm tabular-nums">
        {rows.map(([name, value, note, key]) => (
          <div key={name} className="contents">
            <dt className="text-parchment-400">{name}</dt>
            <dd className={`text-right font-display font-bold ${key ? 'text-brass-200' : 'text-parchment-100'}`}>{value}</dd>
            <dd className="text-xs text-parchment-400">{note}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn btn-primary w-full" onClick={() => onAction({ type: 'ship', buildingId, marketId: chosen.marketId })}>
        {a.confirmShipment}
      </button>
    </>
  )
}
