/**
 * A Brass match: the board in the centre, the player panel on the right (a
 * bottom sheet on narrow screens), the hand of cards along the bottom and a
 * top bar with the era, round, deck and markets. The rules engine does every
 * check; this screen only previews (glows, costs), asks for confirmation and
 * dispatches. Every action goes select → preview → confirm → apply, and
 * Escape or Cancel backs out with nothing changed.
 */

import { Link } from 'react-router'
import { PATHS } from '../data/navigation'
import { useCallback, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { botThinkTime, HAND_SIZE } from '../rules/config/game'
import { IllustratedBoard, type BoardRecent, type BoardTargets } from '../components/board/IllustratedBoard'
import { IndustryRow } from '../components/brass/IndustryRow'
import { deckMode } from '../components/brass/cardArt'
import { CardActionBar, CardZoom, HandRow, JokerPrompt } from '../components/brass/Cards'
import { DeckIndicator, DiscardPile } from '../components/brass/Deck'
import { DistantMarketPanel } from '../components/brass/DistantMarket'
import { motionOff } from '../components/brass/flights'
import { GameLog, GameLogModal, RecentLog } from '../components/brass/GameLog'
import { GameBackground } from '../components/theme/PageBackground'
import { MarketStrip } from '../components/brass/Markets'
import { TurnOrder } from '../components/brass/TurnOrder'
import { EraScoring, FinalScreen, type RatingChange } from '../components/brass/Scoring'
import { clockLevel, formatClock, type SeatClock } from '../components/brass/clock'
import { useCardFlights } from '../components/brass/useCardFlights'
import { ActionButtons, StatsBar, UpgradeBar, type ActionState } from '../components/brass/Panel'
import { rowInfo } from '../components/brass/rowInfo'
import { Coin, Cube, IncomeArrow } from '../components/brass/Symbols'
import { Dialog } from '../components/Dialog'
import { colorHex } from '../components/game/glyphs'
import { ZoomPan } from '../components/game/ZoomPan'
import type { Achievement } from '../data/achievements'
import { PRESET_AVATARS, PRESET_PREFIX } from '../data/avatars'
import { BOARD, parseBoardData, slotKey, type BoardData, type BuiltState } from '../data/board'
import { getGameMode, isGameModeId } from '../data/gameModes'
import { AI_DELAY_SCALE, ANIMATION_SCALE, type GameSettings } from '../data/settings'
import { usePersistentState } from '../hooks/usePersistentState'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'
import { STORAGE_KEYS } from '../lib/storage'
import { botAction } from '../rules/bots'
import { LOANS } from '../rules/constants'
import { RULES } from '../rules/context'
import { applyAction, currentPlayerId, inPlay, networkOf, planBuild, roundsInEra, saleOptions, type BuildPlan, type NetworkPlan } from '../rules/engine'
import type { BrassMatch } from '../rules/match'
import {
  buildBlocker,
  buildOptions,
  CARD_ACTIONS,
  cardActions,
  cardBuildBlocker,
  cardBuildTargets,
  cardCoalBlocked,
  coalBlockedSlots,
  developBlocker,
  developPlan,
  discardChoice,
  linkCoalBlocked,
  linkOptions,
  loanOptions,
  networkBlocker,
  type CardAction,
  type CardBuildTarget,
} from '../rules/options'
import { RuleError, type Action, type Card, type GameState, type LogEntry, type Sale } from '../rules/state'
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
  /** The signed-in player's avatar (seat 1 when it's a person), if any. */
  localAvatarUrl?: string | null
  /** An online game: the server plays the moves, and this device is one seat (or watches). */
  online?: OnlineSeat
  /** Drawn over the board (online: who's disconnected, the connection). */
  banner?: ReactNode
}

/** How an online game plugs in: moves go to the server; the match changes when it answers. */
export interface OnlineSeat {
  /** This device's seat, or null when watching. */
  seat: number
  spectating: boolean
  /** A move is on its way to the server. */
  busy: boolean
  /** Sends the moves in order; resolves true when the server took them all (a refusal has been shown). */
  submit: (actions: Action[]) => Promise<boolean>
  /** Each player's chess clock, shown under their circle. */
  clocks?: Record<number, SeatClock>
  /** A rated game that ended: each player's rating change, by player. */
  ratings?: Record<number, RatingChange>
}

/** A turn being played: its moves so far and where they lead, from the match as it was when the turn began. */
interface PendingTurn {
  base: GameState
  player: number
  actions: Action[]
  state: GameState
  /** Confirmed online: on its way to the server. */
  sent?: boolean
}

/** All the turn's moves are made: the next player is up, a new round began, or the game ended. */
function turnFinished(turn: PendingTurn): boolean {
  const s = turn.state
  return s.finished || currentPlayerId(s) !== turn.player || s.log.slice(turn.base.log.length).some((e) => e.kind === 'round')
}

type Flow =
  | { kind: 'idle' }
  /** Picking a slot. With chosen cards, `industry` narrows the glowing slots (null: every industry the cards allow). */
  | { kind: 'build'; industry: IndustryId | null }
  /** `alternatives`: the industries this slot takes with these cards (a choice when there are two). */
  | { kind: 'build-confirm'; industry: IndustryId; plan: BuildPlan; alternatives: IndustryId[] }
  | { kind: 'network'; count: 1 | 2; picked: string[] }
  | { kind: 'network-confirm'; count: 1 | 2; plan: NetworkPlan }
  | { kind: 'develop'; chips: IndustryId[] }
  | { kind: 'sell-mill'; more: boolean }
  | { kind: 'sell-buyer'; mill: string; more: boolean }
  | { kind: 'sell-confirm'; sale: Sale; more: boolean }
  | { kind: 'loan' }
  | { kind: 'pass' }
  | { kind: 'skip' }

const ctx = RULES.ctx

/** The window's height, kept up to date (the hand's cards are sized from it). */
function useViewportHeight(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange)
      return () => window.removeEventListener('resize', onChange)
    },
    () => window.innerHeight,
    () => 900,
  )
}

/** The window's width (gaps between cards: 12 px from tablets up, 6 px on phones). */
function useViewportWidth(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('resize', onChange)
      return () => window.removeEventListener('resize', onChange)
    },
    () => window.innerWidth,
    () => 1440,
  )
}

/**
 * Where the hand goes: centred on the map frame's vertical centre line (not
 * the strip's, which also spans the side column), as wide as fits evenly on
 * both sides of it. Measured from the elements, so it follows the panels.
 */
function useHandAxis(strip: React.RefObject<HTMLElement | null>, board: React.RefObject<HTMLElement | null>) {
  const [axis, setAxis] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const a = strip.current
    const m = board.current
    if (!a || !m) return
    const measure = () => {
      const r = a.getBoundingClientRect()
      const f = m.getBoundingClientRect()
      const centre = f.left + f.width / 2 - r.left
      const half = Math.max(0, Math.min(centre, r.width - centre))
      const next = { left: Math.round(centre - half), width: Math.round(half * 2) }
      setAxis((prev) => (prev.left === next.left && prev.width === next.width ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(a)
    observer.observe(m)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [strip, board])
  return axis
}

export function BrassGame({ match, onMatchChange, onMatchFinished, onLeave, onRematch, settings, onOpenRules, onOpenSettings, overlayOpen, localAvatarUrl = null, online, banner }: BrassGameProps) {
  const t = useT()
  const b = t.brass
  const notify = useToast()
  /**
   * This turn's moves, not confirmed yet: shown on the board, and undone one at a time until Confirm.
   * It belongs to the match it started from: if the match moves on without it (online: the clock ran out), it's dropped.
   */
  const [pending, setPending] = useState<PendingTurn | null>(null)
  const livePending = pending && pending.base === match.state ? pending : null
  const state = livePending?.state ?? match.state
  const mode = isGameModeId(match.modeId) ? getGameMode(match.modeId) : null
  const [chosenFlow, setFlow] = useState<Flow>({ kind: 'idle' })
  /** The card(s) the player picked in their hand: one, or two as the joker. */
  const [selected, setSelected] = useState<string[]>([])
  /** A second card clicked while one is picked: the joker prompt. */
  const [jokerOffer, setJokerOffer] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [pulse, setPulse] = useState<{ industry: IndustryId; key: number } | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetTab, setSheetTab] = useState<'mat' | 'log'>('mat')
  const [resultsOpen, setResultsOpen] = useState(state.finished)
  const [unlocked, setUnlocked] = useState<Achievement[]>([])
  const [recent, setRecent] = useState<{ entry: LogEntry; key: number } | null>(null)
  /** A distant sale just failed: the banner over the board (its key restarts it). */
  const [closedBanner, setClosedBanner] = useState<number | null>(null)

  const current = currentPlayerId(state)
  // The provisional turn's moves are all made: only Undo or Confirm are left.
  const turnDone = livePending !== null && turnFinished(livePending)
  const humans = state.players.flatMap((p, i) => (p.isAI ? [] : [i]))
  const [seatAtDevice, setSeatAtDevice] = useState<number | null>(humans.length === 1 ? humans[0] : null)
  // Online, every seat is a person somewhere (or a bot on the server): this device is only its own seat.
  const currentIsHuman = livePending ? !turnDone : !state.finished && (online ? current === online.seat && !online.spectating : !state.players[current].isAI)
  const needsHandoff = !livePending && !online && currentIsHuman && humans.length > 1 && seatAtDevice !== current
  // Whose mat and hand this device shows: the human playing now, else the last human at the device.
  const me = livePending ? livePending.player : online ? online.seat : currentIsHuman && !needsHandoff ? current : (seatAtDevice ?? humans[0] ?? 0)
  const myTurn = currentIsHuman && !needsHandoff && (livePending !== null || current === me) && !online?.busy && !livePending?.sent
  // Computer players wait while a turn waits for Confirm.
  const paused = overlayOpen || needsHandoff || resultsOpen || livePending !== null
  // (No one is "current" once the game is over: fall back to a neutral colour.)
  const colorOf = (p: number) => colorHex((state.players[p]?.color ?? 'white') as PlayerColor)
  const townName = (id: string) => ctx.map.places[id]?.name ?? id
  const slotTown = (slot: string) => townName(ctx.map.slots[slot].town)

  // Cards drawn at the end of a turn stay hidden until it's confirmed (so Undo can't be used to peek).
  const hand = turnDone ? state.players[me].hand.filter((c) => livePending.base.players[me].hand.some((h) => h.id === c.id)) : state.players[me].hand
  const cardName = (card: Card) => (card.kind === 'location' ? townName(card.town) : b.industry[card.industry])
  const cardKind = (card: Card) => (card.kind === 'location' ? b.locationCard : b.industryCard)
  const cardAllows = (card: Card) => (card.kind === 'location' ? b.allowsLocation(townName(card.town)) : b.allowsIndustry(b.industry[card.industry]))
  // Avatars on the turn order track: the signed-in player's own, else an illustrated one per seat.
  const avatarOf = (p: number) => {
    if (p === (online ? online.seat : 0) && !online?.spectating && !state.players[p].isAI && localAvatarUrl) return localAvatarUrl
    return `${PRESET_PREFIX}${PRESET_AVATARS[(Math.abs(state.seed) + p) % PRESET_AVATARS.length].id}`
  }
  // The hand's cards: sized from the screen's height (86–142 px wide), but never so wide that a full hand
  // would overlap where it fits side by side; the board, which always fits whole, gets the rest.
  const viewportHeight = useViewportHeight()
  const viewportWidth = useViewportWidth()
  const handStrip = useRef<HTMLDivElement>(null)
  const boardFrame = useRef<HTMLElement>(null)
  const axis = useHandAxis(handStrip, boardFrame)
  const cardGap = viewportWidth >= 768 ? 12 : 6
  // Desktop: ~11 % of the height (at least 108 px, so every name fits at 9 px or more); smaller screens: 12 %.
  const wanted = viewportWidth >= 1024 ? Math.min(142, Math.max(108, viewportHeight * 0.11)) : Math.min(142, Math.max(86, viewportHeight * 0.12))
  const fitsFullHand = axis.width ? (axis.width - (HAND_SIZE - 1) * cardGap) / HAND_SIZE : wanted
  // (Phones: at least 84 px, overlapping; a long press shows any card large.)
  const cardWidth = Math.round(Math.max(Math.min(wanted, fitsFullHand), Math.min(wanted, viewportWidth >= 768 ? 72 : 84)))
  const nameOf = (id: string) => {
    const card = hand.find((c) => c.id === id)
    return card ? cardName(card) : ''
  }
  // The picked cards, while they're still in the hand and it's this player's turn.
  const chosen = myTurn && !state.selling ? selected.filter((id) => hand.some((c) => c.id === id)) : []
  const chosenCard = chosen.length === 1 ? (hand.find((c) => c.id === chosen[0]) ?? null) : null
  // Without a picked card, actions give up the least useful one.
  const autoCard = useMemo(() => (myTurn ? discardChoice(state, ctx, me) : null), [myTurn, state, me])
  const actionCard = chosen.length === 1 ? chosen[0] : autoCard

  const flights = useCardFlights(state, ctx, me, ANIMATION_SCALE[settings.animationSpeed])

  /**
   * Cancel answers on the next frame: the strip above the hand clears at once (a tiny change), and the
   * board's highlights come off just after (on a phone that repaint is the slow part).
   */
  const [cancelling, setCancelling] = useState(false)
  const soon = (finish: () => void) => {
    flushSync(() => setCancelling(true))
    requestAnimationFrame(() =>
      setTimeout(() => {
        finish()
        setCancelling(false)
      }, 0),
    )
  }
  const cancel = () => soon(() => setFlow({ kind: 'idle' }))
  const cancelAll = () =>
    soon(() => {
      setFlow({ kind: 'idle' })
      setSelected([])
      setJokerOffer(null)
    })

  /**
   * Apply an action for a player; errors become toasts (and change nothing). The player at this device moves
   * provisionally (Undo until Confirm); computer players' moves count at once.
   */
  const dispatch = (player: number, action: Action): GameState | null => {
    if (player === me && currentIsHuman) return provisional([action])
    if (online) return null
    try {
      const next = applyAction(state, ctx, player, action)
      const nextMatch = { ...match, state: next }
      const entry = [...next.log.slice(state.log.length)].reverse().find((e) => ['build', 'network', 'develop', 'sell', 'sell-failed', 'loan', 'pass'].includes(e.kind))
      if (entry) setRecent({ entry, key: next.log.length })
      if (next.log.slice(state.log.length).some((e) => e.kind === 'sell-failed')) setClosedBanner(next.log.length)
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

  /**
   * The player's own moves: checked and shown at once (online the server checks them again when they're sent),
   * kept provisional until Confirm. A move that reveals something hidden (a distant-market tile) can't be taken
   * back: it's confirmed with the rest of the turn straight away.
   */
  const provisional = (actions: Action[]): GameState | null => {
    const from = state
    let next: GameState = from
    let unknown = false
    try {
      for (const action of actions) next = applyAction(next, ctx, me, action)
    } catch (error) {
      if (error instanceof RuleError) {
        notify(b.errors[error.code])
        return null
      }
      // Online: something only the server knows (a hidden card, say) decides it: send it and let the server judge.
      if (!online) throw error
      unknown = true
    }
    const added = next.log.slice(from.log.length)
    const entry = [...added].reverse().find((e) => ['build', 'network', 'develop', 'sell', 'sell-failed', 'loan', 'pass'].includes(e.kind))
    if (entry) setRecent({ entry, key: next.log.length })
    if (added.some((e) => e.kind === 'sell-failed')) setClosedBanner(next.log.length)
    const turn: PendingTurn = { base: livePending?.base ?? match.state, player: me, actions: [...(livePending?.actions ?? []), ...actions], state: next }
    const reveals = unknown || added.some((e) => (e.kind === 'sell' && e.distant) || e.kind === 'sell-failed')
    if (reveals) confirmTurn(turn)
    else setPending(turn)
    return next
  }

  /** Confirm: the turn's moves count (online: they go to the server, which checks them again). */
  const confirmTurn = (turn: PendingTurn | null = livePending) => {
    if (!turn) return
    if (online) {
      // Keep showing the turn until the server's answer replaces it (or drop it if the server refused).
      setPending({ ...turn, sent: true })
      void online.submit(turn.actions).then((ok) => {
        if (!ok) setPending(null)
      })
      return
    }
    const nextMatch = { ...match, state: turn.state }
    if (!turn.base.finished && turn.state.finished) {
      setUnlocked(onMatchFinished(nextMatch))
      setResultsOpen(true)
    }
    setPending(null)
    onMatchChange(nextMatch)
  }

  /** Undo: take back the last provisional move (replayed from the start of the turn). */
  const undo = () => {
    if (!livePending || livePending.sent) return
    const actions = livePending.actions.slice(0, -1)
    let s = livePending.base
    for (const a of actions) s = applyAction(s, ctx, me, a)
    setPending(actions.length ? { ...livePending, actions, state: s } : null)
    setRecent(null)
    afterHuman(actions.length ? s : null)
  }

  // The canal era just ended: its scoring counts up (once; not again after a reload).
  const canalEnd = state.log.findIndex((e) => e.kind === 'era-end' && e.era === 'canal')
  const [seenCanalEnd, setSeenCanalEnd] = useState(canalEnd)
  const [canalScoringOpen, setCanalScoringOpen] = useState(false)
  if (canalEnd !== seenCanalEnd) {
    setSeenCanalEnd(canalEnd)
    if (canalEnd !== -1 && !state.finished) setCanalScoringOpen(true)
  }

  // Online, the match ends on the server: open the results when it does.
  const [seenFinished, setSeenFinished] = useState(state.finished)
  if (online && state.finished !== seenFinished) {
    setSeenFinished(state.finished)
    if (state.finished) setResultsOpen(true)
  }

  const afterHuman = (next: GameState | null) => {
    setSelected([])
    setJokerOffer(null)
    if (next?.selling?.player === me) setFlow({ kind: 'sell-mill', more: true })
    else setFlow({ kind: 'idle' })
  }

  // A human in the middle of a sale (after a reload, say) is back to picking the next mill.
  const sellingNow = myTurn && state.selling?.player === me
  const flow = useMemo<Flow>(() => (sellingNow && chosenFlow.kind === 'idle' ? { kind: 'sell-mill', more: true } : chosenFlow), [sellingNow, chosenFlow])

  // Escape backs out one step: the joker prompt, then the action being prepared, then the picked card.
  useEffect(() => {
    if (flow.kind === 'idle' && !selected.length && !jokerOffer) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return
      if (jokerOffer) setJokerOffer(null)
      else if (flow.kind === 'sell-mill' && flow.more) return
      else if (flow.kind !== 'idle') setFlow({ kind: 'idle' })
      else setSelected([])
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [flow, selected, jokerOffer])

  // Computer players act on their own after a pause.
  // The banner shows after the tile has flipped and the marker has reached X, then goes.
  const speed = ANIMATION_SCALE[settings.animationSpeed]
  const bannerDelay = speed > 0 && !motionOff() ? 2700 * speed : 0
  useEffect(() => {
    if (closedBanner === null) return
    const timer = window.setTimeout(() => setClosedBanner(null), bannerDelay + 4500)
    return () => window.clearTimeout(timer)
  }, [closedBanner, bannerDelay])

  const playComputer = useEffectEvent(() => {
    const id = currentPlayerId(state)
    if (state.finished || !state.players[id].isAI) return
    // Easy: a random legal move, preferring to build; Normal (and Hard, from old saves): the scoring AI. The same bots as online.
    dispatch(id, botAction(state, ctx, id, state.players[id].aiLevel === 'easy' ? 'easy' : 'normal', state.log.length))
  })
  useEffect(() => {
    if (online || state.finished || !state.players[current].isAI || paused) return
    // Like a person: a longer look at the start of its turn, a shorter one for the second action, now and
    // then a pause (scaled by the mode and the "computer speed" setting).
    const firstOfTurn = state.actionsLeft >= (state.era === 'canal' && state.round === 1 ? 1 : 2)
    const delay = botThinkTime(firstOfTurn) * ((mode?.aiDelayMs ?? 900) / 900) * AI_DELAY_SCALE[settings.aiSpeed]
    const timer = window.setTimeout(playComputer, delay)
    return () => window.clearTimeout(timer)
  }, [online, state, current, paused, mode?.aiDelayMs, settings.aiSpeed])

  /* ---- What the board shows ---------------------------------------------------- */

  // A picked card lights up what it can build straight away (clicking a glowing slot builds).
  const cardTargets = useMemo(
    () => (chosen.length && (flow.kind === 'build' || (flow.kind === 'idle' && !jokerOffer)) ? cardBuildTargets(state, ctx, me, chosen, flow.kind === 'build' ? (flow.industry ?? undefined) : undefined) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow, state, me, chosen.join(), jokerOffer],
  )
  const autoTargets = useMemo(() => (flow.kind === 'build' && myTurn && !chosen.length && flow.industry ? buildOptions(state, ctx, me, flow.industry) : []), [flow, myTurn, state, me, chosen.length])
  const linkTargets = useMemo(() => (flow.kind === 'network' && myTurn ? linkOptions(state, ctx, me, flow.count, flow.picked, actionCard ?? undefined) : []), [flow, myTurn, state, me, actionCard])
  const sales = useMemo(() => (myTurn ? saleOptions(state, ctx, me) : []), [myTurn, state, me])

  const cheapest = (targets: readonly { slot: string; plan: BuildPlan }[]) => {
    const price = new Map<string, number>()
    for (const o of targets) price.set(o.slot, Math.min(price.get(o.slot) ?? Infinity, o.plan.money))
    return new Map([...price].map(([slot, money]) => [slot, `£${money}`]))
  }

  const targets: BoardTargets | undefined = (() => {
    if (!myTurn) return undefined
    if (flow.kind === 'build' || (flow.kind === 'idle' && chosen.length)) return { slots: cheapest(chosen.length ? cardTargets : autoTargets) }
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

  // Dark slots and links that fail only for want of coal say so on hover.
  const boardNotes = useMemo(() => {
    const notes = new Map<string, string>()
    if (!myTurn) return notes
    const add = (keys: readonly string[]) => keys.forEach((key) => notes.set(key, b.errors.coal))
    if (flow.kind === 'build' || (flow.kind === 'idle' && chosen.length)) {
      if (chosen.length) add(cardCoalBlocked(state, ctx, me, chosen, flow.kind === 'build' ? (flow.industry ?? undefined) : undefined))
      else if (flow.kind === 'build' && flow.industry) add(coalBlockedSlots(state, ctx, me, flow.industry))
    } else if (flow.kind === 'network') {
      add(linkCoalBlocked(state, ctx, me, flow.picked, actionCard ?? undefined))
    } else if (flow.kind === 'sell-buyer' && state.distant.closed) {
      for (const hub of ctx.map.hubs) notes.set(hub.id, b.distantNoSale)
    }
    return notes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, state, me, myTurn, chosen.join(), actionCard, b])

  /** Straight to the confirm popup for this slot (and the industries it takes with the picked cards). */
  const confirmCardBuild = (here: readonly CardBuildTarget[]) => {
    if (!here.length) return
    setFlow({ kind: 'build-confirm', industry: here[0].industry, plan: here[0].plan, alternatives: here.map((o) => o.industry) })
  }

  const onSlot = (town: string, index: number) => {
    const slot = slotKey(town, index)
    if ((flow.kind === 'build' || flow.kind === 'idle') && chosen.length) {
      confirmCardBuild(cardTargets.filter((o) => o.slot === slot))
    } else if (flow.kind === 'build') {
      const option = autoTargets.find((o) => o.slot === slot)
      if (option && flow.industry) setFlow({ kind: 'build-confirm', industry: flow.industry, plan: option.plan, alternatives: [flow.industry] })
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
    if (!option.plan || !actionCard) return
    setFlow({ kind: 'network-confirm', count: flow.count, plan: { ...option.plan, card: actionCard } })
  }

  /* ---- The hand ------------------------------------------------------------------ */

  const onCard = (id: string) => {
    if (!myTurn || state.selling) {
      setZoom(id)
      return
    }
    if (chosen.includes(id)) {
      cancelAll()
      return
    }
    if (chosen.length === 1) {
      setJokerOffer(id)
      return
    }
    setSelected([id])
    setJokerOffer(null)
    if (flow.kind === 'build') setFlow({ kind: 'build', industry: null })
  }

  const jokerCards = jokerOffer && chosen.length === 1 ? [chosen[0], jokerOffer] : null
  const jokerBlocked = jokerCards ? cardBuildBlocker(state, ctx, me, jokerCards) : null

  const cardBar = useMemo(() => {
    if (!chosenCard) return null
    const codes = cardActions(state, ctx, me, chosenCard.id)
    return Object.fromEntries(CARD_ACTIONS.map((a) => [a, codes[a] ? b.errors[codes[a]] : null])) as Record<CardAction, string | null>
  }, [chosenCard, state, me, b])

  const startCardAction = (action: CardAction) => {
    switch (action) {
      case 'build': {
        const all = cardBuildTargets(state, ctx, me, chosen)
        // Only one place it can go (slot priority included): skip the choice.
        if (new Set(all.map((o) => o.slot)).size === 1) confirmCardBuild(all)
        else setFlow({ kind: 'build', industry: null })
        break
      }
      case 'network':
        setFlow({ kind: 'network', count: 1, picked: [] })
        break
      case 'develop':
        setFlow({ kind: 'develop', chips: [] })
        setSheetOpen(true)
        break
      case 'sell':
        setFlow({ kind: 'sell-mill', more: false })
        break
      case 'loan':
        setFlow({ kind: 'loan' })
        break
      case 'pass':
        setFlow({ kind: 'pass' })
        break
    }
  }

  /* ---- Panel handlers ---------------------------------------------------------- */

  const onRow = (industry: IndustryId) => {
    if (!myTurn || state.selling) return
    const info = rowInfo(state, ctx, me, industry)
    if (info.upgradeOnly) {
      setPulse((p) => ({ industry, key: (p?.key ?? 0) + 1 }))
      return
    }
    if (chosen.length) {
      // With a picked card: only this industry's slots glow; a single one goes straight to the popup.
      const blocked = cardBuildBlocker(state, ctx, me, chosen, industry)
      if (blocked) {
        notify(b.errors[blocked])
        return
      }
      if (flow.kind === 'build' && flow.industry === industry) {
        setFlow({ kind: 'build', industry: null })
        return
      }
      const here = cardBuildTargets(state, ctx, me, chosen, industry)
      if (here.length === 1) confirmCardBuild(here)
      else setFlow({ kind: 'build', industry })
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
    const r = developPlan(state, ctx, me, chips, actionCard ?? undefined)
    return r instanceof RuleError ? b.errors[r.code] : null
  }

  const confirmAction = () => {
    const card = actionCard
    switch (flow.kind) {
      case 'build-confirm':
        afterHuman(dispatch(me, { type: 'build', cards: [...flow.plan.cards], slot: flow.plan.slot, industry: flow.industry }))
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
      case 'pass':
        if (card) afterHuman(dispatch(me, { type: 'pass', cards: [card] }))
        break
      case 'skip': {
        let s: GameState | null = state
        const passes: Action[] = []
        const n = state.actionsLeft
        for (let i = 0; i < n && s && currentPlayerId(s) === me && !s.finished; i++) {
          const next: GameState = s
          const c = discardChoice(next, ctx, me)
          if (!c) break
          try {
            s = applyAction(next, ctx, me, { type: 'pass', cards: [c] })
            passes.push({ type: 'pass', cards: [c] })
          } catch {
            break
          }
        }
        if (passes.length) provisional(passes)
        afterHuman(null)
        break
      }
      default:
    }
  }

  /* ---- Disabled reasons -------------------------------------------------------- */

  const loanMode = deckMode(state)
  const noLoans = loanMode === 'no-loans' ? 'none' : loanMode === 'last-loans' ? 'last' : null
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
      const code = networkBlocker(state, ctx, me, n, actionCard ?? undefined)
      return code ? b.errors[code] : null
    }
    const loans = loanOptions(state, ctx, me)
    return {
      canal: state.era === 'canal' ? net(1) : null,
      rail: state.era === 'rail' ? net(1) : null,
      rails: state.era === 'rail' ? net(2) : null,
      loan: loans.every((l) => l.problem) ? b.errors[loans[0].problem!.code] : null,
      sell: sales.length ? null : b.errors.sale,
      skip: null,
    }
  })()

  /* ---- Rendering ------------------------------------------------------------------ */

  const shownPlayer = viewing ?? me
  const readOnly = viewing !== null && viewing !== me
  const player = state.players[shownPlayer]
  const color = colorOf(shownPlayer)
  const industryNames = b.industry
  // The cards this action gives up, lifted in the fan: the picked ones, else the one chosen for the player.
  const fanSelected: string[] = chosen.length
    ? [...chosen, ...(jokerOffer ? [jokerOffer] : [])]
    : flow.kind === 'build-confirm'
      ? [...flow.plan.cards]
      : flow.kind === 'network-confirm'
        ? [flow.plan.card]
        : autoCard && (['develop', 'loan', 'skip', 'network', 'pass'].includes(flow.kind) || (flow.kind.startsWith('sell') && !('more' in flow && flow.more)))
          ? [autoCard]
          : []

  // Online: this player's own clock, while it runs (shown beside "Your turn").
  const myClock = online && !online.spectating && online.clocks?.[online.seat]?.running ? online.clocks[online.seat] : null
  const status: ReactNode = state.finished
    ? b.gameOver
    : turnDone
      ? b.turnReady
      : myTurn
        ? myClock
          ? (
              <>
                {b.yourTurn(state.actionsLeft)} ·{' '}
                <span data-testid="turn-clock" data-level={clockLevel(myClock.ms)} className={`tabular-nums ${clockLevel(myClock.ms) === 'critical' ? 'clock-critical text-rust-300' : clockLevel(myClock.ms) === 'low' ? 'text-ember-300' : ''}`}>
                  {formatClock(myClock.ms)}
                </span>
              </>
            )
          : b.yourTurn(state.actionsLeft)
        : state.players[current].isAI
          ? b.thinking(state.players[current].name)
          : b.theirTurn(state.players[current].name)

  const hint =
    flow.kind === 'build'
      ? chosen.length === 2
        ? b.pickSlotJoker
        : chosenCard
          ? b.pickSlotFor(cardName(chosenCard))
          : b.pickSlot
      : flow.kind === 'network'
        ? flow.count === 2
          ? b.pickTwoLinks(flow.picked.length)
          : b.pickLink
        : flow.kind === 'develop' && flow.chips.length === 0
          ? b.pickUpgrade
          : flow.kind === 'sell-mill'
            ? flow.more
              ? b.sellMore
              : b.sellPickMill
            : flow.kind === 'sell-buyer'
              ? state.distant.closed
                ? `${b.sellPickBuyer} — ${b.distantNoSale}`
                : b.sellPickBuyer
              : null

  /** The whole game log, over the screen ("More" under the latest events). */
  const [logOpen, setLogOpen] = useState(false)
  const closeLog = useCallback(() => setLogOpen(false), [])

  const panel = (
    <div className="flex flex-col gap-2">
      {readOnly && (
        <div className="flex items-center justify-between gap-2 text-sm text-parchment-300">
          <span>{b.viewing(state.players[shownPlayer].name)}</span>
          <button type="button" className="btn btn-ghost min-h-8 px-2 text-xs" onClick={() => setViewing(null)}>
            {b.backToMine}
          </button>
        </div>
      )}
      <div className="industry-row-list flex flex-col gap-1.5">
        {INDUSTRY_ORDER.map((industry) => {
          const info = rowInfo(state, ctx, shownPlayer, industry)
          const devCode = readOnly || !myTurn ? 'not-your-turn' : developBlocker(state, ctx, me, industry, actionCard ?? undefined)
          return (
            <IndustryRow
              key={industry}
              info={info}
              color={color}
              readOnly={readOnly}
              selected={!readOnly && flow.kind === 'build' && flow.industry === industry}
              buildBlocked={
                readOnly || !myTurn || info.upgradeOnly
                  ? null
                  : (() => {
                      const code = chosen.length ? cardBuildBlocker(state, ctx, me, chosen, industry) : buildBlocker(state, ctx, me, industry)
                      return code ? b.errors[code] : null
                    })()
              }
              upgradeBlocked={devCode ? b.errors[devCode] : null}
              upgradeSelected={flow.kind === 'develop' && flow.chips.includes(industry)}
              pulseUpgrade={pulse?.industry === industry || (flow.kind === 'develop' && flow.chips.length === 0 && !devCode)}
              onSelect={() => onRow(industry)}
              onUpgrade={() => onUpgrade(industry)}
              key-pulse={pulse?.key}
            />
          )
        })}
      </div>
      {flow.kind === 'develop' && flow.chips.length > 0 && !readOnly && (
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
            const r = developPlan(state, ctx, me, flow.chips, actionCard ?? undefined)
            if (r instanceof RuleError) return flow.chips.map(() => null)
            return r.iron.map((take) => (take.from === 'market' ? take.price : null))
          })()}
          error={developError(flow.chips)}
          onRemove={(i) => setFlow({ kind: 'develop', chips: flow.chips.filter((_, k) => k !== i) })}
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
          noLoans={noLoans}
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

  const zoomCard = zoom ? (hand.find((c) => c.id === zoom) ?? null) : null

  // The strip above the hand: what to do next, the "Play as" bar, or the joker prompt.
  const handBar: ReactNode = livePending && (turnDone || livePending.sent) ? (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border px-3 py-1 text-sm font-semibold text-parchment-50" style={{ borderColor: colorOf(me), background: `${colorOf(me)}22` }}>
      <span>{livePending.sent ? online ? t.online.game.waitingServer : '' : b.turnReady}</span>
      {!livePending.sent && (
        <>
          <button type="button" className="btn btn-ghost min-h-8 px-3 text-xs" onClick={undo}>
            {b.undo}
          </button>
          <button type="button" className="btn btn-primary min-h-8 px-4 text-xs" onClick={() => confirmTurn()} autoFocus>
            {b.confirmTurn}
          </button>
        </>
      )}
    </div>
  ) : !myTurn ? (
    <p className="text-sm font-semibold text-parchment-200">{status}</p>
  ) : jokerCards ? (
    <JokerPrompt
      first={nameOf(jokerCards[0])}
      second={nameOf(jokerCards[1])}
      blocked={jokerBlocked ? b.errors[jokerBlocked] : null}
      onJoker={() => {
        setSelected(jokerCards)
        setJokerOffer(null)
        setFlow({ kind: 'build', industry: null })
      }}
      onSwitch={() => {
        setSelected([jokerCards[1]])
        setJokerOffer(null)
        if (flow.kind === 'build') setFlow({ kind: 'build', industry: null })
      }}
      onCancel={() => setJokerOffer(null)}
    />
  ) : chosenCard && flow.kind === 'idle' && cardBar ? (
    <CardActionBar card={chosenCard} name={cardName(chosenCard)} era={state.era} blocked={cardBar} noLoans={noLoans} onChoose={startCardAction} onCancel={cancelAll} />
  ) : hint ? (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border px-3 py-1 text-sm font-semibold text-parchment-50" style={{ borderColor: colorOf(me), background: `${colorOf(me)}22` }}>
      <span>{hint}</span>
      {flow.kind === 'network' && state.era === 'rail' && flow.picked.length === 0 && (
        <span className="inline-flex overflow-hidden rounded-md border border-bronze-400/60" role="group" aria-label={b.networkTitle.rail}>
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={flow.count === n}
              onClick={actionState[n === 1 ? 'rail' : 'rails'] ? undefined : () => setFlow({ kind: 'network', count: n, picked: [] })}
              aria-disabled={actionState[n === 1 ? 'rail' : 'rails'] ? true : undefined}
              title={actionState[n === 1 ? 'rail' : 'rails'] ?? undefined}
              className={`px-2 py-1 text-xs font-bold uppercase ${flow.count === n ? 'bg-brass-300/25 text-brass-100' : 'text-parchment-300 hover:text-parchment-50'} aria-disabled:opacity-40`}
            >
              {n === 1 ? b.actions.rail : b.actions.rails}
            </button>
          ))}
        </span>
      )}
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
  ) : (
    <p className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-parchment-300">
      <span>
        <span className="font-semibold text-parchment-100">{status}</span> · {b.pickCard}
      </span>
      {livePending && (
        <button type="button" className="btn btn-ghost min-h-8 px-3 text-xs" onClick={undo}>
          {b.undo}
        </button>
      )}
    </p>
  )

  return (
    <div className="brass-screen flex min-h-dvh flex-col overflow-x-clip">
      <GameBackground />
      <div className="brass-play flex flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-bronze-500/30 bg-soot-950/90 px-3 py-1">
        <GameMenuButton onRules={onOpenRules} onSettings={onOpenSettings} onLeave={onLeave} />
        <span className={`rounded-full border px-2.5 py-0.5 font-display text-xs font-bold tracking-[0.12em] uppercase ${state.era === 'canal' ? 'border-verdigris-400/50 text-verdigris-300' : 'border-brass-300/50 text-brass-200'}`}>{b.era[state.era]}</span>
        <span className="text-sm text-parchment-300">{b.round(state.round, roundsInEra(state))}</span>
        <div className="mx-auto">
          <TurnOrder
            state={state}
            ctx={ctx}
            colorOf={colorOf}
            avatarOf={avatarOf}
            current={current}
            viewing={viewing}
            speed={ANIMATION_SCALE[settings.animationSpeed]}
            onView={(p) => setViewing(p === me || viewing === p ? null : p)}
            clocks={online?.clocks}
          />
        </div>
        <span className="font-display text-sm font-bold tracking-[0.04em] text-parchment-50" aria-live="polite">
          {status}
        </span>
      </header>

      <main id="main-content" tabIndex={-1} className="brass-layout flex flex-col gap-2 p-2 pb-14 outline-none lg:pb-2">
        {/* Desktop: the coal/iron market with the distant market under it on the left; the map (centred, the deck and
            discard pile beside its top-left corner) with the hand under it; the player panel and the latest events on
            the right. Narrower screens: one column. */}
        <div className="brass-left">
          <div className="brass-market brass-float order-1 lg:order-none">
            <MarketStrip state={state} ctx={ctx} />
          </div>
          <div className="brass-distant order-5 flex min-h-0 w-full lg:order-none">
            <DistantMarketPanel state={state} ctx={ctx} me={me} speed={ANIMATION_SCALE[settings.animationSpeed]} />
          </div>
        </div>

        <div className="brass-centre">
          <div className="brass-deck brass-float order-4 flex items-end gap-3 self-start rounded-lg border border-bronze-500/40 bg-soot-950/90 p-2 lg:order-none">
            <DeckIndicator state={state} />
            <DiscardPile state={state} cardName={cardName} />
          </div>
          <div className="brass-board-fit order-2 lg:order-none">
          <section ref={boardFrame} data-board className="plate relative aspect-square overflow-hidden p-1" aria-label={t.nav.board}>
            <ZoomPan>
              <BrassBoard
                state={state}
                targets={targets}
                targetColor={colorOf(me)}
                showLinkSpaces={flow.kind === 'network'}
                network={myTurn ? { locations: networkOf(state, ctx, me), color: colorOf(me) } : null}
                notes={boardNotes}
                recent={recent}
                motion={ANIMATION_SCALE[settings.animationSpeed]}
                onSelectSlot={onSlot}
                onSelectLocation={onLocation}
                onSelectLink={onLink}
                colorOf={colorOf}
              />
            </ZoomPan>
            {banner}
            {closedBanner !== null && (
              <div key={closedBanner} className="pointer-events-none absolute inset-x-0 top-[38%] z-20 flex justify-center px-4">
                <button
                  type="button"
                  role="alert"
                  onClick={() => setClosedBanner(null)}
                  className="pointer-events-auto flex items-center gap-2.5 rounded-lg border-2 border-ember-400/80 bg-soot-950/95 px-5 py-3 font-display text-base font-bold text-parchment-50 shadow-[0_10px_30px_rgb(0_0_0/0.7)] sm:text-lg"
                  style={{ animation: `toast-in 320ms ease-out ${bannerDelay}ms both` }}
                >
                  <span aria-hidden="true" className="text-ember-300">✕</span>
                  {b.distantNoSale}
                </button>
              </div>
            )}
          </section>
          </div>
        </div>

        <div ref={handStrip} className="brass-hand order-3 lg:order-none">
          {/* Centred on the map frame's centre line. */}
          <div data-testid="hand-axis" className="flex flex-col items-center" style={axis.width ? { marginLeft: axis.left, width: axis.width } : undefined}>
            <div className="flex min-h-8 w-full items-center justify-center text-center" style={cancelling ? { visibility: 'hidden' } : undefined}>
              {handBar}
            </div>
            {!online?.spectating && (
              <HandRow cards={hand} selected={fanSelected} interactive={myTurn && !state.selling} cardWidth={cardWidth} gap={cardGap} name={cardName} kind={cardKind} allows={cardAllows} label={b.handTitle} onSelect={onCard} onZoom={setZoom} />
            )}
          </div>
        </div>

        {/* The player panel: one plate the full height of the play area; the latest events fill the space under the stats. */}
        <aside className="brass-panel brass-float plate rivets iron hidden lg:flex" aria-label={b.showPanel}>
          <div className="brass-panel-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5" data-testid="player-panel-scroll">
            {panel}
            <RecentLog state={state} ctx={ctx} colorOf={colorOf} onMore={() => setLogOpen(true)} />
          </div>
        </aside>
      </main>
      </div>
      {logOpen && <GameLogModal state={state} ctx={ctx} colorOf={colorOf} onClose={closeLog} />}

      {/* Narrow screens: the panel is a bottom sheet. */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <button type="button" className="btn btn-primary w-full rounded-none" aria-expanded={sheetOpen} onClick={() => setSheetOpen((v) => !v)}>
          {sheetOpen ? b.hidePanel : b.showPanel}
        </button>
        {sheetOpen && (
          <div className="max-h-[70dvh] overflow-y-auto bg-soot-950/[0.98] p-2.5">
            {/* Tabs: your mat (and actions), or the game log. */}
            <div role="tablist" aria-label={b.showPanel} className="mb-2 grid grid-cols-2 gap-1 rounded-lg border border-bronze-500/30 bg-soot-900 p-1">
              {(['mat', 'log'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={sheetTab === tab}
                  onClick={() => setSheetTab(tab)}
                  className={`min-h-9 rounded-md font-display text-sm font-bold tracking-[0.1em] uppercase ${sheetTab === tab ? 'bg-bronze-500/30 text-parchment-50' : 'text-parchment-400'}`}
                >
                  {tab === 'mat' ? b.tabMat : b.log.title}
                </button>
              ))}
            </div>
            {sheetTab === 'mat' ? panel : <GameLog state={state} ctx={ctx} />}
          </div>
        )}
      </div>

      <ConfirmDialogs
        flow={flow}
        state={state}
        me={me}
        card={actionCard}
        onCancel={cancel}
        onConfirm={confirmAction}
        onFlow={setFlow}
        onLoan={(amount) => {
          if (actionCard) afterHuman(dispatch(me, { type: 'loan', cards: [actionCard], amount }))
        }}
        slotTown={slotTown}
        townName={townName}
      />

      <CardZoom
        card={zoomCard}
        name={zoomCard ? cardName(zoomCard) : ''}
        kind={zoomCard ? cardKind(zoomCard) : ''}
        canPlay={myTurn && !state.selling}
        selected={!!zoomCard && chosen.includes(zoomCard.id)}
        onPlay={() => {
          if (zoomCard) onCard(zoomCard.id)
          setZoom(null)
        }}
        onClose={() => setZoom(null)}
        onStep={(d) => {
          const i = hand.findIndex((c) => c.id === zoom)
          if (i >= 0 && hand.length) setZoom(hand[(i + d + hand.length) % hand.length].id)
        }}
        position={zoomCard ? `${hand.findIndex((c) => c.id === zoomCard.id) + 1} / ${hand.length}` : undefined}
      />

      <Dialog open={needsHandoff && !overlayOpen} onClose={() => setSeatAtDevice(current)} labelledBy="handoff-title">
        <div className="plate rivets flex flex-col items-center gap-4 bg-soot-900/95 px-6 py-8 text-center">
          <span className="size-8 rounded-full border-2 border-black" style={{ background: colorOf(current) }} aria-hidden="true" />
          <h2 id="handoff-title" className="font-display text-3xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
            {b.handoffTitle(state.players[current]?.name ?? '')}
          </h2>
          <p className="text-parchment-300">{b.handoffBody}</p>
          <button type="button" className="btn btn-primary px-8" onClick={() => setSeatAtDevice(current)}>
            {b.handoffReady(state.players[current]?.name ?? '')}
          </button>
        </div>
      </Dialog>

      {/* Flying cards (dealt, drawn, played), cubes and distant-market tiles are drawn here, over everything. */}
      <div ref={flights} className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true" />

      <EraScoring open={canalScoringOpen && !resultsOpen} state={state} colorOf={colorOf} onClose={() => setCanalScoringOpen(false)} />
      <FinalScreen
        open={resultsOpen && state.finished}
        state={state}
        colorOf={colorOf}
        ratings={online?.ratings}
        extra={unlocked.length > 0 && <p className="text-sm text-brass-200">{unlocked.map((a) => t.achievements.list[a.id].name).join(', ')}</p>}
        onClose={() => setResultsOpen(false)}
        onRematch={onRematch}
        onLeave={onLeave}
      />
    </div>
  )
}

/* ---- The board ------------------------------------------------------------------ */

function BrassBoard({
  state,
  targets,
  targetColor,
  showLinkSpaces,
  network,
  notes,
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
  notes: ReadonlyMap<string, string>
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
  // Just into the rail era: the canals and level I tiles that came off fade away (until the second action after it).
  const fading = { slots: new Set<string>(), links: new Set<string>() }
  const eraEnd = state.era === 'rail' ? state.log.findLastIndex((e) => e.kind === 'era-end' && e.era === 'canal') : -1
  const ended = state.log[eraEnd]
  if (ended?.kind === 'era-end' && ended.removed && state.log.slice(eraEnd).filter((e) => e.kind === 'discard').length < 2) {
    for (const [slot, tile] of Object.entries(ended.removed.tiles)) {
      if (built.slots[slot]) continue
      built.slots[slot] = { player: tile.owner, industry: tile.industry, level: tile.level, flipped: tile.flipped, cubes: tile.cubes }
      fading.slots.add(slot)
    }
    for (const [id, link] of Object.entries(ended.removed.links)) {
      if (built.links[id]) continue
      built.links[id] = { player: link.owner }
      fading.links.add(id)
    }
  }
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
  // Drawn faded: places off this mode's map, and rail-only places in the canal era.
  const closed = new Set(Object.values(ctx.map.places).filter((p) => !inPlay(state, ctx, p.id) || (state.era === 'canal' && p.railOnly)).map((p) => p.id))
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
      closed={closed}
      fading={fading.slots.size || fading.links.size ? fading : null}
      network={network}
      notes={notes}
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
  card,
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
  /** The card a one-card action gives up. */
  card: string | null
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
    build = (
      <ConfirmBox open title={b.buildTitle(b.industry[flow.industry], roman(p.tile.level), slotTown(p.slot))} onConfirm={onConfirm} onCancel={onCancel}>
        <div className="flex flex-col gap-2 text-sm text-parchment-200">
          {flow.alternatives.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={b.chooseIndustry}>
              <span className="text-parchment-400">{b.chooseIndustry}</span>
              {flow.alternatives.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  role="radio"
                  aria-checked={flow.industry === industry}
                  onClick={() => {
                    const plan = planBuild(state, ctx, me, { type: 'build', cards: [...p.cards], slot: p.slot, industry })
                    onFlow({ ...flow, industry, plan })
                  }}
                  className={`rounded-md border-2 px-2.5 py-1 font-display text-xs font-bold tracking-[0.06em] uppercase ${flow.industry === industry ? 'border-brass-200 bg-brass-300/20 text-brass-100' : 'border-bronze-400/50 text-parchment-200 hover:border-brass-300'}`}
                >
                  {b.industry[industry]}
                </button>
              ))}
            </div>
          )}
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
          {(flow.industry === 'coal' || flow.industry === 'iron') && p.tile.cubes > 0 && (
            <p className={p.sold.cubes > 0 ? 'text-verdigris-300' : 'text-parchment-400'}>
              {p.sold.cubes > 0 ? b.sellCubes(p.sold.cubes, flow.industry, p.sold.money) : flow.industry === 'coal' ? b.coalStays : b.marketFull}
            </p>
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
      <ConfirmBox open={flow.kind === 'pass'} title={b.passTitle(card ? cardName(card) : '')} onConfirm={onConfirm} onCancel={onCancel} />
    </>
  )
}

/* ---- Results ------------------------------------------------------------------------ */

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
        <div className="plate rivets absolute top-full left-0 z-40 mt-2 w-64 bg-soot-900/[0.97] p-2" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div role="menu" aria-label={b.menu}>
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
          {/* The pages every screen links to, and the fan-made notice. */}
          <p className="mt-2 border-t border-bronze-500/20 px-3 pt-2 text-xs leading-relaxed text-parchment-300" data-testid="fan-made">
            {t.legal.fanMade}{' '}
            <Link to={PATHS.privacy} className="underline underline-offset-2 hover:text-parchment-50">
              {t.nav.privacy}
            </Link>
            {' · '}
            <Link to={PATHS.terms} className="underline underline-offset-2 hover:text-parchment-50">
              {t.nav.terms}
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

