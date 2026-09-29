/**
 * A Brass match: the board in the centre, the player panel on the right (a
 * bottom sheet on narrow screens), the hand of cards along the bottom and a
 * top bar with the era, round, deck and markets. The rules engine does every
 * check; this screen only previews (glows, costs), asks for confirmation and
 * dispatches. Every action goes select → preview → confirm → apply, and
 * Escape or Cancel backs out with nothing changed.
 */

import { useEffect, useEffectEvent, useId, useMemo, useState, type ReactNode } from 'react'
import { IllustratedBoard, type BoardRecent, type BoardTargets } from '../components/board/IllustratedBoard'
import { IndustryRow } from '../components/brass/IndustryRow'
import { ActionButtons, Hand, Opponents, StatsBar, TopBar, UpgradeBar, type ActionState } from '../components/brass/Panel'
import { rowInfo } from '../components/brass/rowInfo'
import { Coin, Cube, IncomeArrow, VpHex } from '../components/brass/Symbols'
import { Dialog } from '../components/Dialog'
import { colorHex } from '../components/game/glyphs'
import { ZoomPan } from '../components/game/ZoomPan'
import type { Achievement } from '../data/achievements'
import { BOARD, parseBoardData, slotKey, type BoardData, type BuiltState } from '../data/board'
import { getGameMode, isGameModeId } from '../data/gameModes'
import { AI_DELAY_SCALE, ANIMATION_SCALE, type GameSettings } from '../data/settings'
import { usePersistentState } from '../hooks/usePersistentState'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'
import { STORAGE_KEYS } from '../lib/storage'
import { chooseAction } from '../rules/ai'
import { LOANS } from '../rules/constants'
import { RULES } from '../rules/context'
import { applyAction, currentPlayerId, networkOf, planBuild, saleOptions, type BuildPlan, type NetworkPlan } from '../rules/engine'
import type { BrassMatch } from '../rules/match'
import { buildBlocker, buildOptions, developBlocker, discardChoice, developPlan, linkOptions, loanOptions, networkBlocker } from '../rules/options'
import { RuleError, type Action, type GameState, type LogEntry, type Sale } from '../rules/state'
import { INDUSTRY_ORDER, roman, type IndustryId } from '../rules/tileTable'
import type { PlayerColor } from '../game/types'

interface BrassGameProps {
  match: BrassMatch
  onMatchChange: (next: BrassMatch) => void
  onMatchFinished: (match: BrassMatch) => Achievement[]
  onLeave: () => void
  onRematch: () => void
  settings: GameSettings
  onOpenRules: () => void
  onOpenSettings: () => void
  overlayOpen: boolean
}

type Flow =
  | { kind: 'idle' }
  | { kind: 'build'; industry: IndustryId }
  | { kind: 'build-confirm'; industry: IndustryId; plan: BuildPlan; sellCubes: boolean }
  | { kind: 'network'; count: 1 | 2; picked: string[] }
  | { kind: 'network-confirm'; count: 1 | 2; plan: NetworkPlan }
  | { kind: 'develop'; chips: IndustryId[] }
  | { kind: 'sell-mill'; more: boolean }
  | { kind: 'sell-buyer'; mill: string; more: boolean }
  | { kind: 'sell-confirm'; sale: Sale; more: boolean }
  | { kind: 'loan' }
  | { kind: 'skip' }

const ctx = RULES.ctx

export function BrassGame({ match, onMatchChange, onMatchFinished, onLeave, onRematch, settings, onOpenRules, onOpenSettings, overlayOpen }: BrassGameProps) {
  const t = useT()
  const b = t.brass
  const notify = useToast()
  const state = match.state
  const mode = isGameModeId(match.modeId) ? getGameMode(match.modeId) : null
  const [chosenFlow, setFlow] = useState<Flow>({ kind: 'idle' })
  const [preferredCard, setPreferredCard] = useState<string | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [pulse, setPulse] = useState<{ industry: IndustryId; key: number } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(state.finished)
  const [unlocked, setUnlocked] = useState<Achievement[]>([])
  const [recent, setRecent] = useState<{ entry: LogEntry; key: number } | null>(null)

  const current = currentPlayerId(state)
  const humans = state.players.flatMap((p, i) => (p.isAI ? [] : [i]))
  const [seatAtDevice, setSeatAtDevice] = useState<number | null>(humans.length === 1 ? humans[0] : null)
  const currentIsHuman = !state.finished && !state.players[current].isAI
  const needsHandoff = currentIsHuman && humans.length > 1 && seatAtDevice !== current
  // Whose mat and hand this device shows: the human playing now, else the last human at the device.
  const me = currentIsHuman && !needsHandoff ? current : (seatAtDevice ?? humans[0] ?? 0)
  const myTurn = currentIsHuman && !needsHandoff && current === me
  const paused = overlayOpen || needsHandoff || resultsOpen
  const colorOf = (p: number) => colorHex(state.players[p].color as PlayerColor)
  const townName = (id: string) => ctx.map.places[id]?.name ?? id
  const slotTown = (slot: string) => townName(ctx.map.slots[slot].town)
  const cancel = () => setFlow({ kind: 'idle' })

  /** Apply an action for a player; errors become toasts (and change nothing). */
  const dispatch = (player: number, action: Action): GameState | null => {
    try {
      const next = applyAction(state, ctx, player, action)
      const nextMatch = { ...match, state: next }
      const entry = [...next.log.slice(state.log.length)].reverse().find((e) => ['build', 'network', 'develop', 'sell', 'sell-failed', 'loan', 'pass'].includes(e.kind))
      if (entry) setRecent({ entry, key: next.log.length })
      if (!state.finished && next.finished) {
        setUnlocked(onMatchFinished(nextMatch))
        setResultsOpen(true)
      }
      onMatchChange(nextMatch)
      return next
    } catch (error) {
      if (error instanceof RuleError) {
        notify(b.errors[error.code])
        return null
      }
      throw error
    }
  }

  const afterHuman = (next: GameState | null) => {
    setPreferredCard(null)
    if (next?.selling?.player === me) setFlow({ kind: 'sell-mill', more: true })
    else setFlow({ kind: 'idle' })
  }

  // A human in the middle of a sale (after a reload, say) is back to picking the next mill.
  const sellingNow = myTurn && state.selling?.player === me
  const flow = useMemo<Flow>(() => (sellingNow && chosenFlow.kind === 'idle' ? { kind: 'sell-mill', more: true } : chosenFlow), [sellingNow, chosenFlow])

  // Escape backs out of whatever is being chosen.
  useEffect(() => {
    if (flow.kind === 'idle') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(event.target instanceof HTMLDialogElement)) {
        if (flow.kind === 'sell-mill' && flow.more) return
        cancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flow])

  // Computer players act on their own after a pause.
  const playComputer = useEffectEvent(() => {
    const id = currentPlayerId(state)
    if (state.finished || !state.players[id].isAI) return
    dispatch(id, chooseAction(state, ctx, id))
  })
  useEffect(() => {
    if (state.finished || !state.players[current].isAI || paused) return
    const delay = (mode?.aiDelayMs ?? 800) * AI_DELAY_SCALE[settings.aiSpeed]
    const timer = window.setTimeout(playComputer, delay)
    return () => window.clearTimeout(timer)
  }, [state, current, paused, mode?.aiDelayMs, settings.aiSpeed])

  /* ---- What the board shows ---------------------------------------------------- */

  const discardFor = (): string | null => {
    const hand = state.players[me].hand
    if (preferredCard && hand.some((c) => c.id === preferredCard)) return preferredCard
    return discardChoice(state, ctx, me)
  }

  const buildTargets = useMemo(() => (flow.kind === 'build' && myTurn ? buildOptions(state, ctx, me, flow.industry) : []), [flow, myTurn, state, me])
  const linkTargets = useMemo(() => (flow.kind === 'network' && myTurn ? linkOptions(state, ctx, me, flow.count, flow.picked) : []), [flow, myTurn, state, me])
  const sales = useMemo(() => (myTurn ? saleOptions(state, ctx, me) : []), [myTurn, state, me])

  const targets: BoardTargets | undefined = (() => {
    if (!myTurn) return undefined
    if (flow.kind === 'build') return { slots: new Map(buildTargets.map((o) => [o.slot, `£${o.plan.money}`])) }
    if (flow.kind === 'network') return { links: new Map(linkTargets.map((o) => [o.link, o.plan ? `£${o.plan.money}` : null])) }
    if (flow.kind === 'sell-mill') return { slots: new Map([...new Set(sales.map((s) => s.mill))].map((m) => [m, null])) }
    if (flow.kind === 'sell-buyer') {
      const mine = sales.filter((s) => s.mill === flow.mill)
      return {
        slots: new Map(mine.flatMap((s) => ('port' in s ? [[s.port, null] as const] : []))),
        locations: new Map(mine.some((s) => 'distant' in s) ? ctx.map.hubs.map((h) => [h.id, null] as const) : []),
      }
    }
    return undefined
  })()

  const onSlot = (town: string, index: number) => {
    const slot = slotKey(town, index)
    if (flow.kind === 'build') {
      const option = buildTargets.find((o) => o.slot === slot)
      if (!option) return
      let plan = option.plan
      // A card the player picked in their hand, if it can pay for this build.
      if (preferredCard && !plan.cards.includes(preferredCard)) {
        try {
          plan = { ...plan, ...buildPlanWith(state, me, flow.industry, slot, [preferredCard]) }
        } catch {
          /* keep the default card */
        }
      }
      setFlow({ kind: 'build-confirm', industry: flow.industry, plan, sellCubes: true })
    } else if (flow.kind === 'sell-mill') {
      if (sales.some((s) => s.mill === slot)) setFlow({ kind: 'sell-buyer', mill: slot, more: flow.more })
    } else if (flow.kind === 'sell-buyer') {
      const sale = sales.find((s) => s.mill === flow.mill && 'port' in s && s.port === slot)
      if (sale) setFlow({ kind: 'sell-confirm', sale, more: flow.more })
    }
  }

  const onLocation = (id: string) => {
    if (flow.kind !== 'sell-buyer' || !ctx.map.hubs.some((h) => h.id === id)) return
    const sale = sales.find((s) => s.mill === flow.mill && 'distant' in s)
    if (sale) setFlow({ kind: 'sell-confirm', sale, more: flow.more })
  }

  const onLink = (id: string) => {
    if (flow.kind !== 'network' || !linkTargets.some((o) => o.link === id)) return
    const picked = [...flow.picked, id]
    if (picked.length < flow.count) {
      setFlow({ ...flow, picked })
      return
    }
    const option = linkTargets.find((o) => o.link === id)!
    const card = discardFor()
    if (!option.plan || !card) return
    setFlow({ kind: 'network-confirm', count: flow.count, plan: { ...option.plan, card } })
  }

  /* ---- Panel handlers ---------------------------------------------------------- */

  const onRow = (industry: IndustryId) => {
    if (!myTurn || state.selling) return
    const info = rowInfo(state, ctx, me, industry)
    if (info.upgradeOnly) {
      setPulse((p) => ({ industry, key: (p?.key ?? 0) + 1 }))
      return
    }
    const blocked = buildBlocker(state, ctx, me, industry)
    if (blocked) {
      notify(b.errors[blocked])
      return
    }
    setFlow(flow.kind === 'build' && flow.industry === industry ? { kind: 'idle' } : { kind: 'build', industry })
  }

  const onUpgrade = (industry: IndustryId) => {
    if (!myTurn || state.selling) return
    if (flow.kind === 'develop') {
      if (flow.chips.length >= 2) return
      setFlow({ kind: 'develop', chips: [...flow.chips, industry] })
    } else {
      setFlow({ kind: 'develop', chips: [industry] })
    }
  }

  const developError = (chips: IndustryId[]): string | null => {
    if (!chips.length) return null
    const r = developPlan(state, ctx, me, chips)
    return r instanceof RuleError ? b.errors[r.code] : null
  }

  const confirmAction = () => {
    const card = discardFor()
    switch (flow.kind) {
      case 'build-confirm':
        afterHuman(dispatch(me, { type: 'build', cards: [...flow.plan.cards], slot: flow.plan.slot, industry: flow.industry, sellCubes: flow.sellCubes }))
        break
      case 'network-confirm':
        afterHuman(dispatch(me, { type: 'network', cards: [flow.plan.card], links: [...flow.plan.links] }))
        break
      case 'develop':
        if (card) afterHuman(dispatch(me, { type: 'develop', cards: [card], industries: flow.chips }))
        break
      case 'sell-confirm':
        afterHuman(dispatch(me, flow.more ? { type: 'sell-more', sale: flow.sale } : card ? { type: 'sell', cards: [card], sale: flow.sale } : { type: 'sell-stop' }))
        break
      case 'skip': {
        let s: GameState | null = state
        const n = state.actionsLeft
        for (let i = 0; i < n && s && currentPlayerId(s) === me && !s.finished; i++) {
          const next: GameState = s
          const c = next.players[me].hand.at(-1)?.id
          if (!c) break
          try {
            s = applyAction(next, ctx, me, { type: 'pass', cards: [c] })
          } catch {
            break
          }
        }
        if (s && s !== state) {
          const nextMatch = { ...match, state: s }
          if (!state.finished && s.finished) {
            setUnlocked(onMatchFinished(nextMatch))
            setResultsOpen(true)
          }
          onMatchChange(nextMatch)
        }
        afterHuman(null)
        break
      }
      default:
    }
  }

  /* ---- Disabled reasons -------------------------------------------------------- */

  const reason = (code: Parameters<typeof networkBlocker>[0] extends never ? never : string | null) => code
  const actionState: ActionState = (() => {
    if (!myTurn) {
      const why = b.errors['not-your-turn']
      return { canal: why, rail: why, rails: why, loan: why, sell: why, skip: why }
    }
    if (state.selling) {
      const why = b.errors.selling
      return { canal: why, rail: why, rails: why, loan: why, sell: why, skip: why }
    }
    const net = (n: 1 | 2) => {
      const code = networkBlocker(state, ctx, me, n)
      return code ? b.errors[code] : null
    }
    const loans = loanOptions(state, ctx, me)
    return {
      canal: state.era === 'canal' ? net(1) : null,
      rail: state.era === 'rail' ? net(1) : null,
      rails: state.era === 'rail' ? net(2) : null,
      loan: loans.every((l) => l.problem) ? b.errors[loans[0].problem!.code] : null,
      sell: sales.length ? null : b.errors.sale,
      skip: reason(null),
    }
  })()

  /* ---- Rendering ------------------------------------------------------------------ */

  const shownPlayer = viewing ?? me
  const readOnly = viewing !== null && viewing !== me
  const player = state.players[shownPlayer]
  const color = colorOf(shownPlayer)
  const industryNames = b.industry
  const handUsed: string[] =
    flow.kind === 'build-confirm'
      ? [...flow.plan.cards]
      : flow.kind === 'network-confirm'
        ? [flow.plan.card]
        : ['develop', 'loan', 'skip', 'network'].includes(flow.kind) || (flow.kind.startsWith('sell') && !('more' in flow && flow.more))
          ? [discardFor() ?? '']
          : []

  const status: ReactNode = state.finished
    ? b.gameOver
    : myTurn
      ? b.yourTurn(state.actionsLeft)
      : state.players[current].isAI
        ? b.thinking(state.players[current].name)
        : b.theirTurn(state.players[current].name)

  const hint =
    flow.kind === 'build'
      ? b.pickSlot
      : flow.kind === 'network'
        ? flow.count === 2
          ? b.pickTwoLinks(flow.picked.length)
          : b.pickLink
        : flow.kind === 'sell-mill'
          ? flow.more
            ? b.sellMore
            : b.sellPickMill
          : flow.kind === 'sell-buyer'
            ? b.sellPickBuyer
            : null

  const panel = (
    <div className="flex flex-col gap-2">
      <Opponents state={state} ctx={ctx} colorOf={colorOf} viewing={viewing} current={current} onView={(p) => setViewing(p === me || viewing === p ? null : p)} />
      {readOnly && (
        <div className="flex items-center justify-between gap-2 text-sm text-parchment-300">
          <span>{b.viewing(state.players[shownPlayer].name)}</span>
          <button type="button" className="btn btn-ghost min-h-8 px-2 text-xs" onClick={() => setViewing(null)}>
            {b.backToMine}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {INDUSTRY_ORDER.map((industry) => {
          const info = rowInfo(state, ctx, shownPlayer, industry)
          const devCode = readOnly || !myTurn ? 'not-your-turn' : developBlocker(state, ctx, me, industry)
          return (
            <IndustryRow
              key={industry}
              info={info}
              color={color}
              readOnly={readOnly}
              selected={!readOnly && flow.kind === 'build' && flow.industry === industry}
              buildBlocked={readOnly || !myTurn ? null : info.upgradeOnly ? null : (() => {
                const code = buildBlocker(state, ctx, me, industry)
                return code ? b.errors[code] : null
              })()}
              upgradeBlocked={devCode ? b.errors[devCode] : null}
              upgradeSelected={flow.kind === 'develop' && flow.chips.includes(industry)}
              pulseUpgrade={pulse?.industry === industry}
              onSelect={() => onRow(industry)}
              onUpgrade={() => onUpgrade(industry)}
              key-pulse={pulse?.key}
            />
          )
        })}
      </div>
      {flow.kind === 'develop' && !readOnly && (
        <UpgradeBar
          chips={(() => {
            const counts = { ...state.players[me].mat }
            const seen: Partial<Record<IndustryId, number>> = {}
            return flow.chips.map((industry) => {
              const skip = seen[industry] ?? 0
              seen[industry] = skip + 1
              let idx = -1
              let left = skip
              for (let i = 0; i < counts[industry].length; i++) {
                if (counts[industry][i] > left) {
                  idx = i
                  break
                }
                left -= counts[industry][i]
              }
              return { industry, level: ctx.data.industries[industry].levels[Math.max(0, idx)].level }
            })
          })()}
          names={industryNames}
          ironPrices={(() => {
            const r = developPlan(state, ctx, me, flow.chips)
            if (r instanceof RuleError) return flow.chips.map(() => null)
            return r.iron.map((take) => (take.from === 'market' ? take.price : null))
          })()}
          error={developError(flow.chips)}
          onRemove={(i) => {
            const chips = flow.chips.filter((_, k) => k !== i)
            setFlow(chips.length ? { kind: 'develop', chips } : { kind: 'idle' })
          }}
          onAddAnother={flow.chips.length < 2 ? () => notify(b.addAnother.replace('+ ', '')) : null}
          onConfirm={confirmAction}
          onCancel={cancel}
        />
      )}
      {!readOnly && (
        <ActionButtons
          state={state}
          ctx={ctx}
          disabled={actionState}
          active={flow.kind === 'network' || flow.kind === 'network-confirm' ? (state.era === 'canal' ? 'canal' : flow.count === 2 ? 'rails' : 'rail') : flow.kind === 'loan' ? 'loan' : flow.kind.startsWith('sell') ? 'sell' : flow.kind === 'skip' ? 'skip' : null}
          onNetwork={(count) => setFlow({ kind: 'network', count, picked: [] })}
          onLoan={() => setFlow({ kind: 'loan' })}
          onSell={() => setFlow({ kind: 'sell-mill', more: false })}
          onSkip={() => setFlow({ kind: 'skip' })}
        />
      )}
      <StatsBar player={player} ctx={ctx} />
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      {RULES.placeholder && (
        <p role="alert" className="bg-ember-500/90 px-3 py-1.5 text-center text-sm font-semibold text-soot-950">
          {b.placeholder}
        </p>
      )}
      <TopBar state={state} ctx={ctx} status={status}>
        <GameMenuButton onRules={onOpenRules} onSettings={onOpenSettings} onLeave={onLeave} />
      </TopBar>

      <main id="main-content" tabIndex={-1} className="grid flex-1 grid-cols-1 gap-3 p-2 outline-none lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-3">
        <div className="flex min-w-0 flex-col gap-2">
          {hint && myTurn && (
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold text-parchment-50" style={{ borderColor: colorOf(me), background: `${colorOf(me)}22` }}>
              <span>{hint}</span>
              {flow.kind === 'sell-mill' && flow.more ? (
                <button type="button" className="btn btn-ghost min-h-8 px-3 text-xs" onClick={() => afterHuman(dispatch(me, { type: 'sell-stop' }))}>
                  {b.stopSelling}
                </button>
              ) : (
                <button type="button" className="btn btn-ghost min-h-8 px-3 text-xs" onClick={cancel}>
                  {b.cancel}
                </button>
              )}
            </div>
          )}
          <section className="plate relative overflow-hidden p-1" aria-label={b.opponents}>
            <ZoomPan>
              <BrassBoard
                state={state}
                targets={targets}
                targetColor={colorOf(me)}
                showLinkSpaces={flow.kind === 'network'}
                network={myTurn ? { locations: networkOf(state, ctx, me), color: colorOf(me) } : null}
                recent={recent}
                motion={ANIMATION_SCALE[settings.animationSpeed]}
                onSelectSlot={onSlot}
                onSelectLocation={onLocation}
                onSelectLink={onLink}
                colorOf={colorOf}
              />
            </ZoomPan>
          </section>
          {recent && state.players[recent.entry.kind === 'build' || recent.entry.kind === 'network' || recent.entry.kind === 'develop' || recent.entry.kind === 'sell' || recent.entry.kind === 'loan' || recent.entry.kind === 'pass' ? recent.entry.player : 0]?.isAI && (
            <p className="text-sm text-parchment-300" aria-live="polite">
              {describeMove(recent.entry, (p) => state.players[p].name, townName, slotTown, industryNames, b.moves)}
            </p>
          )}
          <Hand
            cards={state.players[me].hand}
            used={handUsed}
            townName={townName}
            industryName={(id) => industryNames[id]}
            onPick={myTurn ? (id) => setPreferredCard(id) : null}
          />
        </div>

        <aside className="hidden lg:block" aria-label={b.showPanel}>
          <div className="plate rivets iron sticky top-2 p-2.5">{panel}</div>
        </aside>
      </main>

      {/* Narrow screens: the panel is a bottom sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <button type="button" className="btn btn-primary w-full rounded-none" aria-expanded={sheetOpen} onClick={() => setSheetOpen((v) => !v)}>
          {sheetOpen ? b.hidePanel : b.showPanel}
        </button>
        {sheetOpen && <div className="max-h-[70dvh] overflow-y-auto bg-soot-950/[0.98] p-2.5">{panel}</div>}
      </div>

      <ConfirmDialogs
        flow={flow}
        state={state}
        me={me}
        onCancel={cancel}
        onConfirm={confirmAction}
        onFlow={setFlow}
        onLoan={(amount) => {
          const card = discardFor()
          if (card) afterHuman(dispatch(me, { type: 'loan', cards: [card], amount }))
        }}
        slotTown={slotTown}
        townName={townName}
      />

      <Dialog open={needsHandoff && !overlayOpen} onClose={() => setSeatAtDevice(current)} labelledBy="handoff-title">
        <div className="plate rivets flex flex-col items-center gap-4 bg-soot-900/95 px-6 py-8 text-center">
          <span className="size-8 rounded-full border-2 border-black" style={{ background: colorOf(current) }} aria-hidden="true" />
          <h2 id="handoff-title" className="font-display text-3xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
            {b.handoffTitle(state.players[current].name)}
          </h2>
          <p className="text-parchment-300">{b.handoffBody}</p>
          <button type="button" className="btn btn-primary px-8" onClick={() => setSeatAtDevice(current)}>
            {b.handoffReady(state.players[current].name)}
          </button>
        </div>
      </Dialog>

      <Results open={resultsOpen && state.finished} state={state} colorOf={colorOf} unlocked={unlocked} onClose={() => setResultsOpen(false)} onRematch={onRematch} onLeave={onLeave} />
    </div>
  )
}

/** A build plan with specific cards (throws if they can't pay for it). */
function buildPlanWith(state: GameState, player: number, industry: IndustryId, slot: string, cards: string[]): BuildPlan {
  return planBuild(state, ctx, player, { type: 'build', cards, slot, industry, sellCubes: true })
}

function describeMove(
  entry: LogEntry,
  name: (p: number) => string,
  townName: (id: string) => string,
  slotTown: (slot: string) => string,
  industries: Record<IndustryId, string>,
  words: ReturnType<typeof useT>['brass']['moves'],
): string {
  switch (entry.kind) {
    case 'build':
      return words.build(name(entry.player), `${industries[entry.industry]} ${roman(entry.level)}`, slotTown(entry.slot))
    case 'network':
      return words.network(name(entry.player), entry.links.length)
    case 'develop':
      return words.develop(name(entry.player))
    case 'sell':
    case 'sell-failed':
      return words.sell(name(entry.player))
    case 'loan':
      return words.loan(name(entry.player), entry.amount)
    case 'pass':
      return words.pass(name(entry.player))
    default:
      void townName
      return ''
  }
}

/* ---- The board ------------------------------------------------------------------ */

function BrassBoard({
  state,
  targets,
  targetColor,
  showLinkSpaces,
  network,
  recent,
  motion,
  onSelectSlot,
  onSelectLocation,
  onSelectLink,
  colorOf,
}: {
  state: GameState
  targets: BoardTargets | undefined
  targetColor: string
  showLinkSpaces: boolean
  network: { locations: Set<string>; color: string } | null
  recent: { entry: LogEntry; key: number } | null
  motion: number
  onSelectSlot: (town: string, index: number) => void
  onSelectLocation: (id: string) => void
  onSelectLink: (id: string) => void
  colorOf: (p: number) => string
}) {
  const [draft] = usePersistentState<BoardData | null>(STORAGE_KEYS.boardDraft, null, parseBoardData)
  const board = draft ?? BOARD
  const built: BuiltState = { slots: {}, links: {} }
  for (const [slot, tile] of Object.entries(state.tiles)) {
    built.slots[slot] = { player: tile.owner, industry: tile.industry, level: tile.level, flipped: tile.flipped, cubes: tile.cubes }
  }
  for (const [id, link] of Object.entries(state.links)) built.links[id] = { player: link.owner }
  const e = recent?.entry
  const boardRecent: BoardRecent | null = !e
    ? null
    : e.kind === 'build'
      ? { key: recent!.key, slot: e.slot }
      : e.kind === 'network'
        ? { key: recent!.key, link: e.links[0] }
        : e.kind === 'sell'
          ? { key: recent!.key, slot: e.mill }
          : null
  const railOnly = new Set(state.era === 'canal' ? Object.values(ctx.map.places).filter((p) => p.railOnly).map((p) => p.id) : [])
  return (
    <IllustratedBoard
      board={board}
      era={state.era}
      built={built}
      playerColor={colorOf}
      playerName={(p) => state.players[p]?.name ?? ''}
      targets={targets}
      targetColor={targetColor}
      hideEmptyLinks={!showLinkSpaces}
      hidePrices
      closed={railOnly}
      network={network}
      recent={boardRecent}
      motion={motion}
      onSelectSlot={onSelectSlot}
      onSelectLocation={onSelectLocation}
      onSelectLink={onSelectLink}
      className="rounded-md"
    />
  )
}

/* ---- Confirm popups ------------------------------------------------------------- */

function ConfirmBox({ open, title, children, onConfirm, onCancel, confirmLabel }: { open: boolean; title: string; children?: ReactNode; onConfirm: () => void; onCancel: () => void; confirmLabel?: string }) {
  const t = useT()
  const id = useId()
  return (
    <Dialog open={open} onClose={onCancel} labelledBy={id}>
      <div className="plate rivets flex max-w-md flex-col gap-4 bg-soot-900/[0.98] p-5">
        <h2 id={id} className="font-display text-xl font-extrabold tracking-[0.06em] text-parchment-50">
          {title}
        </h2>
        {children}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t.brass.cancel}
          </button>
          <button type="button" className="btn btn-primary px-6" onClick={onConfirm} autoFocus>
            {confirmLabel ?? t.brass.confirm}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

function ConfirmDialogs({
  flow,
  state,
  me,
  onCancel,
  onConfirm,
  onFlow,
  onLoan,
  slotTown,
  townName,
}: {
  flow: Flow
  state: GameState
  me: number
  onCancel: () => void
  onConfirm: () => void
  onFlow: (flow: Flow) => void
  onLoan: (amount: 10 | 20 | 30) => void
  slotTown: (slot: string) => string
  townName: (id: string) => string
}) {
  const t = useT()
  const b = t.brass
  const cardName = (id: string) => {
    const card = state.players[me].hand.find((c) => c.id === id)
    if (!card) return ''
    return card.kind === 'location' ? townName(card.town) : b.industry[card.industry]
  }
  const source = (from: string, kind: 'coal' | 'iron') => {
    const words = kind === 'coal' ? b.coalFrom : b.ironFrom
    if (from === 'market') return words.market
    const tile = state.tiles[from]
    return tile.owner === me ? words.own(slotTown(from)) : words.other(state.players[tile.owner].name, slotTown(from))
  }
  const takes = (list: readonly { from: string; price: number }[], kind: 'coal' | 'iron') =>
    list.map((take, i) => (
      <li key={`${kind}-${i}`} className="flex items-center gap-2">
        <Cube kind={kind} price={take.from === 'market' ? take.price : null} />
        <span>{source(take.from, kind)}</span>
      </li>
    ))

  let build: ReactNode = null
  if (flow.kind === 'build-confirm') {
    const p = flow.plan
    let sellPlan: BuildPlan | null = null
    try {
      sellPlan = planBuild(state, ctx, me, { type: 'build', cards: [...p.cards], slot: p.slot, industry: flow.industry, sellCubes: true })
    } catch {
      sellPlan = null
    }
    const sold = sellPlan?.sold
    build = (
      <ConfirmBox open title={b.buildTitle(b.industry[flow.industry], roman(p.tile.level), slotTown(p.slot))} onConfirm={onConfirm} onCancel={onCancel}>
        <div className="flex flex-col gap-2 text-sm text-parchment-200">
          <p className="flex items-center gap-2">
            <span className="text-parchment-400">{b.pay}</span>
            <Coin />
            <span className="font-display text-lg font-bold text-parchment-50">£{p.money}</span>
          </p>
          <ul className="flex flex-col gap-1">
            {takes(p.coal, 'coal')}
            {takes(p.iron, 'iron')}
          </ul>
          {p.overbuild && <p>{p.overbuild.owner === me ? b.overbuildOwn : b.overbuild(state.players[p.overbuild.owner].name)}</p>}
          {sold && sold.cubes > 0 && (flow.industry === 'coal' || flow.industry === 'iron') && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={flow.sellCubes} onChange={(e) => onFlow({ ...flow, sellCubes: e.target.checked })} className="size-4 accent-brass-300" />
              {b.sellCubes(sold.cubes, flow.industry, sold.money)}
            </label>
          )}
          <p className="text-parchment-400">{b.cards(p.cards.map(cardName).join(', '))}</p>
          {p.actions === 2 && <p className="text-brass-200">{b.twoCards}</p>}
        </div>
      </ConfirmBox>
    )
  }

  let network: ReactNode = null
  if (flow.kind === 'network-confirm') {
    const p = flow.plan
    const title = state.era === 'canal' ? b.networkTitle.canal : flow.count === 2 ? b.networkTitle.rails : b.networkTitle.rail
    network = (
      <ConfirmBox open title={title} onConfirm={onConfirm} onCancel={onCancel}>
        <div className="flex flex-col gap-2 text-sm text-parchment-200">
          <ul className="flex flex-col gap-0.5">
            {p.links.map((id) => {
              const l = ctx.map.links[id]
              return <li key={id}>{`${townName(l.from)} – ${townName(l.to)}`}</li>
            })}
          </ul>
          <p className="flex items-center gap-2">
            <span className="text-parchment-400">{b.pay}</span>
            <Coin />
            <span className="font-display text-lg font-bold text-parchment-50">£{p.money}</span>
          </p>
          <ul className="flex flex-col gap-1">{takes(p.coal, 'coal')}</ul>
          <p className="text-parchment-400">{b.cards(cardName(p.card))}</p>
        </div>
      </ConfirmBox>
    )
  }

  let sell: ReactNode = null
  if (flow.kind === 'sell-confirm') {
    const to = 'port' in flow.sale ? slotTown(flow.sale.port) : b.distantMarket
    sell = (
      <ConfirmBox open title={b.sellTitle(slotTown(flow.sale.mill), to)} onConfirm={onConfirm} onCancel={() => onFlow(flow.more ? { kind: 'sell-mill', more: true } : { kind: 'idle' })}>
        {'distant' in flow.sale && <p className="text-sm text-parchment-300">{b.distantNote}</p>}
      </ConfirmBox>
    )
  }

  const loans = loanOptions(state, ctx, me)
  const loanId = useId()
  return (
    <>
      {build}
      {network}
      {sell}
      <Dialog open={flow.kind === 'loan'} onClose={onCancel} labelledBy={loanId}>
        <div className="plate rivets flex flex-col gap-4 bg-soot-900/[0.98] p-5">
          <h2 id={loanId} className="font-display text-2xl font-extrabold tracking-[0.08em] text-parchment-50 uppercase">
            {b.loanTitle}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {loans.map((loan) => (
              <button
                key={loan.amount}
                type="button"
                disabled={!!loan.problem}
                title={loan.problem ? b.errors[loan.problem.code] : undefined}
                onClick={() => onLoan(loan.amount)}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-bronze-400/70 bg-linear-to-b from-bronze-700/60 to-soot-900 px-3 py-4 hover:border-brass-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center gap-1 font-display text-2xl font-extrabold text-parchment-50">
                  <Coin className="size-7" />£{loan.amount}
                </span>
                <span className="flex items-center gap-1 text-xs text-parchment-200">
                  <IncomeArrow value={-LOANS[loan.amount]} size="sm" label={b.loanDrop(LOANS[loan.amount])} />
                  {b.loanDrop(LOANS[loan.amount])}
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              {b.cancel}
            </button>
          </div>
        </div>
      </Dialog>
      <ConfirmBox open={flow.kind === 'skip'} title={b.skipTitle(state.actionsLeft)} onConfirm={onConfirm} onCancel={onCancel}>
        <p className="text-sm text-parchment-300">{b.skipBody}</p>
      </ConfirmBox>
    </>
  )
}

/* ---- Results ------------------------------------------------------------------------ */

function Results({ open, state, colorOf, unlocked, onClose, onRematch, onLeave }: { open: boolean; state: GameState; colorOf: (p: number) => string; unlocked: Achievement[]; onClose: () => void; onRematch: () => void; onLeave: () => void }) {
  const t = useT()
  const b = t.brass
  const id = useId()
  const ranking = state.ranking ?? []
  return (
    <Dialog open={open} onClose={onClose} labelledBy={id}>
      <div className="plate rivets flex min-w-[20rem] flex-col gap-4 bg-soot-900/[0.98] p-6">
        <h2 id={id} className="font-display text-3xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {b.gameOver}
        </h2>
        {ranking.length > 0 && <p className="font-display text-xl font-bold text-brass-200">{b.wins(state.players[ranking[0]].name)}</p>}
        <ol className="flex flex-col gap-1.5">
          {ranking.map((p, i) => (
            <li key={p} className="flex items-center gap-3 rounded-md border border-bronze-500/30 bg-soot-950/70 px-3 py-1.5">
              <span className="w-5 font-display font-bold text-parchment-300">{i + 1}</span>
              <span className="size-4 rounded-full border border-black" style={{ background: colorOf(p) }} aria-hidden="true" />
              <span className="flex-1 font-semibold text-parchment-50">{state.players[p].name}</span>
              <VpHex value={state.players[p].vp} size="sm" label={b.finalVp(state.players[p].vp)} />
            </li>
          ))}
        </ol>
        {unlocked.length > 0 && <p className="text-sm text-brass-200">{unlocked.map((a) => t.achievements.list[a.id].name).join(', ')}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onLeave}>
            {b.leave}
          </button>
          <button type="button" className="btn btn-primary px-6" onClick={onRematch}>
            {b.rematch}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/* ---- Menu ------------------------------------------------------------------------------ */

function GameMenuButton({ onRules, onSettings, onLeave }: { onRules: () => void; onSettings: () => void; onLeave: () => void }) {
  const t = useT()
  const b = t.brass
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" className="icon-btn text-xl" aria-label={b.menu} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">☰</span>
      </button>
      {open && (
        <div role="menu" className="plate rivets absolute top-full left-0 z-40 mt-2 w-60 bg-soot-900/[0.97] p-2" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          {[
            [b.rules, onRules],
            [b.settings, onSettings],
            [b.leaveMatch, onLeave],
          ].map(([label, action]) => (
            <button
              key={label as string}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                ;(action as () => void)()
              }}
              className="flex min-h-11 w-full items-center rounded-lg px-3 text-left font-display text-base font-semibold tracking-[0.06em] text-parchment-200 hover:bg-bronze-500/15 hover:text-parchment-50"
            >
              {label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

