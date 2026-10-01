/**
 * A finished online game, move by move, at /online/<id>/replay. The server
 * hands over the seed and the action log (only once the game is over, and
 * only to its players or, for a public game, anyone); the browser rebuilds
 * every position with the same rules engine and shows it as a spectator
 * would see it, with controls to step through.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { SceneBackground } from '../components/SceneBackground'
import { PATHS } from '../data/navigation'
import type { GameSettings } from '../data/settings'
import { useT } from '../i18n'
import { displayName, gameRequest, withNames } from '../online/client'
import { replayStates, type ReplayData } from '../online/replay'
import type { BrassMatch } from '../rules/match'

const STEP_MS = 900

const BrassGame = lazy(() => import('./BrassGame').then((module) => ({ default: module.BrassGame })))

interface ReplayProps {
  settings: GameSettings
  onOpenRules: () => void
  onOpenSettings: () => void
  overlayOpen: boolean
}

export function Replay({ settings, onOpenRules, onOpenSettings, overlayOpen }: ReplayProps) {
  const { gameId = '' } = useParams()
  const t = useT()
  const r = t.online.replay
  const navigate = useNavigate()
  const [data, setData] = useState<ReplayData | null>(null)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let live = true
    gameRequest<ReplayData>({ op: 'replay', gameId }).then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [gameId])

  const states = useMemo(() => (data ? replayStates(data) : []), [data])
  const last = Math.max(0, states.length - 1)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setStep((s) => (s >= last ? s : s + 1)), STEP_MS)
    return () => window.clearInterval(timer)
  }, [playing, last])
  useEffect(() => {
    if (playing && step >= last) {
      const stop = window.setTimeout(() => setPlaying(false), 0)
      return () => window.clearTimeout(stop)
    }
  }, [playing, step, last])

  if (failed)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-parchment-200">{r.unavailable}</p>
        <Link to={PATHS.online} className="btn btn-ghost">
          {t.online.back}
        </Link>
      </main>
    )
  if (!data || !states.length) return <SceneBackground />

  const match: BrassMatch = { kind: 'brass', modeId: data.mode, mapId: data.mapId, state: withNames(states[step], (n) => displayName(n, t.online.deletedPlayer)) }
  const go = (s: number) => {
    setPlaying(false)
    setStep(Math.max(0, Math.min(last, s)))
  }
  const btn = 'btn btn-ghost min-h-8 min-w-8 px-2 text-xs sm:min-h-9 sm:min-w-9 sm:text-sm'

  const controls = (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3">
      <div role="group" aria-label={r.title} className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-xl border border-brass-300/50 bg-soot-950/95 px-2 py-1 shadow-xl sm:px-2.5 sm:py-1.5" data-testid="replay-controls">
        <span className="hidden px-1 font-display text-xs font-bold tracking-[0.12em] text-brass-200 uppercase sm:inline">{r.title}</span>
        <button type="button" className={btn} onClick={() => go(0)} disabled={step === 0} aria-label={r.start}>
          ⏮
        </button>
        <button type="button" className={btn} onClick={() => go(step - 1)} disabled={step === 0} aria-label={r.back}>
          ◀
        </button>
        <button type="button" className={`${btn} min-w-16`} onClick={() => (step >= last ? (setStep(0), setPlaying(true)) : setPlaying((p) => !p))}>
          {playing ? r.pause : r.play}
        </button>
        <button type="button" className={btn} onClick={() => go(step + 1)} disabled={step >= last} aria-label={r.forward}>
          ▶
        </button>
        <button type="button" className={btn} onClick={() => go(last)} disabled={step >= last} aria-label={r.end}>
          ⏭
        </button>
        <input type="range" min={0} max={last} value={step} onChange={(e) => go(Number(e.target.value))} aria-label={r.move(step, last)} className="w-24 accent-brass-300 sm:w-40" />
        <span role="status" className="text-xs text-parchment-300 tabular-nums sm:min-w-24">
          {r.move(step, last)}
        </span>
      </div>
    </div>
  )

  return (
    <>
      <SceneBackground />
      <Suspense fallback={null}>
        <BrassGame
          match={match}
          onMatchChange={() => {}}
          onMatchFinished={() => []}
          onLeave={() => navigate(-1)}
          onRematch={() => navigate(PATHS.online)}
          settings={settings}
          onOpenRules={onOpenRules}
          onOpenSettings={onOpenSettings}
          overlayOpen={overlayOpen}
          online={{ seat: 0, spectating: true, busy: false, submit: async () => false }}
          banner={controls}
        />
      </Suspense>
    </>
  )
}
