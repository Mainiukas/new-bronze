/**
 * The game log, in plain English: what happened, newest first, grouped by
 * round under a heading ("Canal era · round 3"), with each era's scoring as
 * its own group. Moves, market sales, distant-market sales, flips, income.
 *
 * Three views of it: `RecentLog` (the latest events, one short line each with
 * the player's colour and an icon, in the player panel), `GameLogModal` (the
 * whole log on parchment, opened from "More") and `GameLog` (the phone
 * sheet's tab).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import actCanalUrl from '../../../assets/ui/player/act_canal.svg'
import actDevelopUrl from '../../../assets/ui/player/act_develop.svg'
import actRailUrl from '../../../assets/ui/player/act_rail.svg'
import actSkipUrl from '../../../assets/ui/player/act_skip.svg'
import coinUrl from '../../../assets/ui/player/coin.svg'
import incomeArrowUrl from '../../../assets/ui/player/income_arrow.svg'
import { useT } from '../../i18n'
import type { RulesContext } from '../../rules/engine'
import type { GameState, LogEntry } from '../../rules/state'
import { roman } from '../../rules/tileTable'
import { INDUSTRY_ICON_URLS } from '../board/assets'

/** Groups shown (the latest rounds). */
const SHOWN_GROUPS = 16

interface Line {
  key: number
  text: string
  /** Whose event it was (its colour dot), if anyone's. */
  player?: number
  /** A small picture of what happened. */
  icon?: string
}

interface Group {
  key: number
  title: string
  scoring: boolean
  lines: Line[]
}

/** The log as groups (oldest first), each with its lines (oldest first). */
function useLogGroups(state: GameState, ctx: RulesContext): Group[] {
  const t = useT()
  const b = t.brass
  const name = (p: number) => state.players[p]?.name ?? ''
  const place = (id: string) => ctx.map.places[id]?.name ?? id
  const town = (slot: string) => place(ctx.map.slots[slot]?.town)
  const route = (id: string) => {
    const l = ctx.map.links[id]
    return l ? `${place(l.from)} – ${place(l.to)}` : id
  }
  /** "(£12)" after what a move cost. */
  const cost = (money: number) => (money > 0 ? ` (£${money})` : '')
  const line = (e: LogEntry): Omit<Line, 'key'> | null => {
    switch (e.kind) {
      case 'build':
        return { player: e.player, icon: INDUSTRY_ICON_URLS[e.industry], text: b.moves.build(name(e.player), `${b.industry[e.industry]} ${roman(e.level)}`, town(e.slot)) + cost(e.money) }
      case 'network':
        return { player: e.player, icon: state.era === 'canal' ? actCanalUrl : actRailUrl, text: b.log.links(name(e.player), state.era, e.links.map(route).join(b.log.and)) + cost(e.money) }
      case 'develop':
        return { player: e.player, icon: actDevelopUrl, text: b.log.developed(name(e.player), e.industries.map((i) => b.industry[i]).join(b.log.and)) + cost(e.money) }
      case 'sell':
        return { player: e.player, icon: INDUSTRY_ICON_URLS.cotton, text: e.distant ? b.log.distantSale(name(e.player), e.distant.move, e.distant.income) : b.moves.sell(name(e.player)) }
      case 'sell-failed':
        return { player: e.player, icon: INDUSTRY_ICON_URLS.cotton, text: b.log.distantFailed(name(e.player), e.move) }
      case 'market-sale':
        return { player: e.player, icon: INDUSTRY_ICON_URLS[e.industry], text: b.log.marketSale(name(e.player), e.cubes, e.industry === 'coal' ? b.coal : b.iron, e.money) }
      case 'flip': {
        const tile = state.tiles[e.slot]
        return tile ? { player: e.player, icon: incomeArrowUrl, text: b.log.flip(name(e.player), b.industry[tile.industry], town(e.slot), e.income) } : null
      }
      case 'loan':
        return { player: e.player, icon: coinUrl, text: b.moves.loan(name(e.player), e.amount) }
      case 'pass':
        return { player: e.player, icon: actSkipUrl, text: b.moves.pass(name(e.player)) }
      case 'out-of-time':
        return { player: e.player, text: b.log.outOfTime(name(e.player)) }
      case 'income':
        return { player: e.player, icon: coinUrl, text: b.log.income(name(e.player), e.amount) }
      case 'shortfall':
        return { player: e.player, text: b.log.shortfall(name(e.player), e.tilesSold.length, e.vpLost) }
      default:
        return null
    }
  }

  // Walk the log once, opening a group at every round and every era's scoring.
  const groups: Group[] = []
  state.log.forEach((e, i) => {
    if (e.kind === 'round') {
      groups.push({ key: i, title: b.log.roundHeader(b.era[e.era], e.round), scoring: false, lines: [] })
      return
    }
    if (e.kind === 'era-end') {
      groups.push({
        key: i,
        title: b.log.scoringHeader(b.era[e.era]),
        scoring: true,
        lines: e.scores.map((s) => ({ key: i * 10 + s.player, player: s.player, text: b.log.eraScore(name(s.player), s.links, s.tiles) })),
      })
      return
    }
    if (e.kind === 'game-end') {
      groups.at(-1)?.lines.push({ key: i, player: e.ranking[0], text: b.log.winner(name(e.ranking[0])) })
      return
    }
    const l = line(e)
    if (l && groups.length) groups[groups.length - 1].lines.push({ key: i, ...l })
  })
  return groups
}

function Dot({ color }: { color?: string }) {
  return <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full border border-black/60" style={{ background: color ?? 'transparent', boxShadow: color ? `0 0 4px ${color}88` : undefined }} />
}

function Icon({ src }: { src?: string }) {
  return src ? <img src={src} alt="" aria-hidden="true" className="size-4 shrink-0 object-contain" /> : <span aria-hidden="true" className="size-4 shrink-0" />
}

/** One line's height in the recent list (px): how many fit is worked out from it. */
const RECENT_LINE = 22

/**
 * The latest events, newest on top, as many as fit the space it's given (one
 * short line each: the player's colour dot, an icon, the text), and "More",
 * which opens the whole log.
 */
export function RecentLog({ state, ctx, colorOf, onMore }: { state: GameState; ctx: RulesContext; colorOf: (player: number) => string; onMore: () => void }) {
  const b = useT().brass
  const groups = useLogGroups(state, ctx)
  const lines = groups.flatMap((g) => g.lines).reverse()
  const box = useRef<HTMLOListElement>(null)
  const [fit, setFit] = useState(6)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setFit(Math.max(1, Math.floor(el.clientHeight / RECENT_LINE)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <section aria-label={b.log.title} className="flex min-h-0 flex-1 flex-col gap-1 rounded-lg border border-bronze-500/35 bg-soot-950/85 px-2 py-1.5" data-testid="recent-log">
      <h2 className="font-display text-[0.7rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.log.title}</h2>
      <ol ref={box} className="flex min-h-0 flex-1 flex-col overflow-hidden text-[0.8rem] text-parchment-100">
        {lines.length === 0 && <li className="text-parchment-400">{b.log.empty}</li>}
        {lines.slice(0, fit).map((l) => (
          <li key={l.key} className="flex shrink-0 items-center gap-1.5" style={{ height: RECENT_LINE }} title={l.text}>
            <Dot color={l.player === undefined ? undefined : colorOf(l.player)} />
            <Icon src={l.icon} />
            <span className="min-w-0 truncate">{l.text}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-ghost min-h-7 w-full py-0.5 text-xs font-bold tracking-[0.12em] uppercase" onClick={onMore} data-testid="log-more">
        {b.log.more}
      </button>
    </section>
  )
}

/** The whole log on a parchment sheet over the screen: era and round headings, newest on top, scrolling inside. Closes with ✕ or Esc. */
export function GameLogModal({ state, ctx, colorOf, onClose }: { state: GameState; ctx: RulesContext; colorOf: (player: number) => string; onClose: () => void }) {
  const b = useT().brass
  const groups = useLogGroups(state, ctx).toReversed()
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={b.log.title}
        data-testid="log-modal"
        className="parchment-sheet flex max-h-[min(44rem,calc(100dvh-3rem))] w-full max-w-2xl flex-col rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-[#7a5a2e]/40 px-5 py-3">
          <h2 className="flex-1 font-engraved text-xl font-bold tracking-[0.08em] text-[#3a2410] uppercase">{b.log.title}</h2>
          <button ref={close} type="button" onClick={onClose} aria-label={b.close} title={b.close} className="grid size-9 place-items-center rounded-md text-xl text-[#3a2410] hover:bg-[#7a5a2e]/15">
            ✕
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 text-[0.92rem] leading-snug text-[#2b1a0b]" data-testid="log-modal-scroll">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title} className="mb-2">
              <h3 className={`my-1.5 flex items-center gap-2 font-display text-xs font-bold tracking-[0.12em] uppercase ${g.scoring ? 'text-[#7a1f24]' : 'text-[#6b4a1e]'}`}>
                <span aria-hidden="true" className="h-px flex-1 bg-[#7a5a2e]/45" />
                {g.title}
                <span aria-hidden="true" className="h-px flex-1 bg-[#7a5a2e]/45" />
              </h3>
              <ol className="flex flex-col gap-1">
                {g.lines.toReversed().map((l) => (
                  <li key={l.key} className={`flex items-center gap-2 ${g.scoring ? 'font-semibold' : ''}`}>
                    <Dot color={l.player === undefined ? undefined : colorOf(l.player)} />
                    <Icon src={l.icon} />
                    <span className="min-w-0">{l.text}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}

/** The log in the phone sheet's tab: a compact scrolling box. */
export function GameLog({ state, ctx }: { state: GameState; ctx: RulesContext }) {
  const b = useT().brass
  const shown = useLogGroups(state, ctx).slice(-SHOWN_GROUPS).reverse()

  return (
    <section aria-label={b.log.title} className="flex min-h-0 flex-col gap-1">
      <h2 className="font-display text-[0.65rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.log.title}</h2>
      <div className="flex max-h-56 flex-col overflow-y-auto pr-1 text-xs leading-snug" data-testid="game-log">
        {shown.map((g) => (
          <section key={g.key} aria-label={g.title}>
            <h3
              className={`sticky top-0 z-10 mt-1 flex items-center gap-2 bg-soot-950/95 py-0.5 font-display text-[0.65rem] font-bold tracking-[0.1em] uppercase ${g.scoring ? 'text-brass-200' : 'text-bronze-200'}`}
            >
              <span aria-hidden="true" className="h-px flex-1 bg-bronze-500/40" />
              {g.title}
              <span aria-hidden="true" className="h-px flex-1 bg-bronze-500/40" />
            </h3>
            <ol className="flex flex-col gap-0.5">
              {[...g.lines].reverse().map((l) => (
                <li key={l.key} className={g.scoring ? 'font-semibold text-brass-100' : 'text-parchment-200'}>
                  {l.text}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  )
}
