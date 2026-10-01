/**
 * The tutorial: a real game against one Easy bot, with a coach panel that
 * walks through the screen and waits for the player's first moves. It's
 * practice: never saved over a match in progress, never counted in stats or
 * ratings, and it can be skipped at any step (or left from the game menu).
 */

import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router'
import { SceneBackground } from '../components/SceneBackground'
import { DEFAULT_MAP_ID } from '../data/maps'
import { PATHS } from '../data/navigation'
import type { GameSettings } from '../data/settings'
import { useT } from '../i18n'
import { RULES } from '../rules/context'
import { startBrassMatch, type BrassMatch } from '../rules/match'

const BrassGame = lazy(() => import('./BrassGame').then((module) => ({ default: module.BrassGame })))

/** The tutorial's deal: the same every time, so the steps fit it. */
const TUTORIAL_SEED = 1851

function newTutorialMatch(you: string, bot: string): BrassMatch {
  return startBrassMatch(RULES.ctx, {
    modeId: 'normal',
    mapId: DEFAULT_MAP_ID,
    seats: [
      { name: you, isAI: false },
      { name: bot, isAI: true, aiLevel: 'easy' },
    ],
    seed: TUTORIAL_SEED,
  })
}

/** The coach's steps. `wait`: the step moves on by itself once the player has done it. */
type Step = { id: 'welcome' | 'board' | 'hand' | 'mat' | 'move' | 'bot' | 'markets' | 'eras' | 'done'; wait?: 'move' }
const STEPS: Step[] = [{ id: 'welcome' }, { id: 'board' }, { id: 'hand' }, { id: 'mat' }, { id: 'move', wait: 'move' }, { id: 'bot' }, { id: 'markets' }, { id: 'eras' }, { id: 'done' }]

interface TutorialProps {
  settings: GameSettings
  onOpenRules: () => void
  onOpenSettings: () => void
  overlayOpen: boolean
}

export function Tutorial({ settings, onOpenRules, onOpenSettings, overlayOpen }: TutorialProps) {
  const t = useT()
  const c = t.tutorial
  const navigate = useNavigate()
  const [match, setMatch] = useState(() => newTutorialMatch(c.you, c.bot))
  const [step, setStep] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [key, setKey] = useState(0)

  // Collapsed to a small "Tips" button (so the coach never covers what the player needs).
  const [collapsed, setCollapsed] = useState(false)
  // The "make a move" step finishes once the player's first move is confirmed.
  const moved = match.state.log.some((e) => 'player' in e && e.player === 0 && ['build', 'network', 'develop', 'sell', 'loan', 'pass'].includes(e.kind))
  if (STEPS[step].wait === 'move' && moved) setStep(step + 1)
  const go = (next: number) => {
    setStep(next)
    // On narrow screens the coach steps aside while the player makes their move.
    if (STEPS[next].wait && window.matchMedia('(max-width: 1023px)').matches) setCollapsed(true)
  }

  const current = STEPS[step]
  const last = step === STEPS.length - 1
  const words = c.steps[current.id]

  return (
    <>
      <SceneBackground />
      <Suspense fallback={null}>
        <BrassGame
          key={key}
          match={match}
          onMatchChange={setMatch}
          onMatchFinished={() => []}
          onLeave={() => navigate(PATHS.mainMenu)}
          onRematch={() => {
            setMatch(newTutorialMatch(c.you, c.bot))
            setKey((k) => k + 1)
          }}
          settings={settings}
          onOpenRules={onOpenRules}
          onOpenSettings={onOpenSettings}
          overlayOpen={overlayOpen}
          banner={
            <span className="pointer-events-none absolute top-2 left-2 z-20 rounded-full border border-brass-300/60 bg-soot-950/90 px-3 py-1 font-display text-xs font-bold tracking-[0.12em] text-brass-200 uppercase">
              {c.badge}
            </span>
          }
        />
      </Suspense>
      {!hidden && collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="fixed top-[4.25rem] right-3 z-[60] rounded-full border border-brass-300/70 bg-soot-900/95 px-3 py-1.5 font-display text-xs font-bold tracking-[0.12em] text-brass-200 uppercase shadow-lg lg:top-[4.5rem] lg:right-auto lg:left-3"
        >
          {c.tips(step + 1, STEPS.length)}
        </button>
      )}
      {!hidden && !collapsed && (
        <aside
          role="dialog"
          aria-modal="false"
          aria-labelledby="coach-title"
          data-testid="tutorial-coach"
          className="plate rivets fixed top-3 left-3 z-[60] flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2 border-brass-300/60 bg-soot-900/[0.97] p-4 shadow-[0_18px_40px_rgb(0_0_0/0.7)] lg:top-[4.5rem]"
        >
          <p className="eyebrow">{c.progress(step + 1, STEPS.length)}</p>
          <h2 id="coach-title" className="font-display text-xl font-extrabold tracking-[0.08em] text-parchment-50 uppercase">
            {words.title}
          </h2>
          <p className="text-sm leading-relaxed text-parchment-200">{words.text}</p>
          {current.wait === 'move' && <p className="text-sm font-semibold text-brass-200">{c.waiting}</p>}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="flex gap-2">
              <button type="button" className="btn btn-ghost min-h-9 px-3 text-xs" onClick={() => setHidden(true)}>
                {last ? c.close : c.skip}
              </button>
              {!last && (
                <button type="button" className="btn btn-ghost min-h-9 px-3 text-xs" onClick={() => setCollapsed(true)}>
                  {c.minimize}
                </button>
              )}
            </span>
            <div className="flex gap-2">
              {step > 0 && (
                <button type="button" className="btn btn-ghost min-h-9 px-3 text-xs" onClick={() => go(step - 1)}>
                  {c.back}
                </button>
              )}
              {!last && !current.wait && (
                <button type="button" className="btn btn-primary min-h-9 px-5 text-xs" onClick={() => go(step + 1)} autoFocus>
                  {c.next}
                </button>
              )}
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
