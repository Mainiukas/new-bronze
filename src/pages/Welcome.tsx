/**
 * The first-time welcome slides, shown once after a player's first sign-in
 * and before the lobby (like chess.com's onboarding):
 *   1 Welcome · 2 What is Bronze? · 3 How a game works · 4 Accept the rules
 *   · 5 Choose your level (the starting rating).
 * The slide is saved on the server as they go (account_settings), so closing
 * the tab resumes at the same slide. Settings → Account → "Replay welcome"
 * shows slides 1–3 again.
 *
 * A full-screen card over the splash painting; the slides fade and move
 * 40 px to the left (fade only with reduced motion). Enter continues, ←
 * goes back. On a phone the card fills the screen and the buttons stay at
 * the bottom.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import rulesMarkdown from '../../docs/RULES.md?raw'
import levelNew from '../../assets/onboarding/level_1.svg'
import levelBeginner from '../../assets/onboarding/level_2.svg'
import levelIntermediate from '../../assets/onboarding/level_3.svg'
import levelAdvanced from '../../assets/onboarding/level_4.svg'
import canalArt from '../../assets/cards/art/canal.jpg'
import millTownArt from '../../assets/cards/art/mill_town.jpg'
import logoStacked from '../../assets/logo/bronze_logo_stacked.svg'
import boatArt from '../../assets/tokens/art_boat.png'
import locomotiveArt from '../../assets/tokens/art_locomotive.png'
import { VpHex } from '../components/brass/Symbols'
import { Markdown } from '../components/Markdown'
import { ModalFrame } from '../components/ModalFrame'
import { PageBackground } from '../components/theme/PageBackground'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'
import { TERMS_VERSION } from '../legal/operator'
import { START_LEVELS, START_RATING, type StartLevel } from '../rating/config'
import { PrivacyPolicy } from './legal/PrivacyPolicy'
import { TermsOfService } from './legal/TermsOfService'

const LEVEL_ART: Record<StartLevel, string> = { new: levelNew, beginner: levelBeginner, intermediate: levelIntermediate, advanced: levelAdvanced }
const SLIDES = 5

export interface WelcomeProps {
  /** 'first': all five slides, saved as they go. 'replay': slides 1–3 only, nothing saved. */
  mode: 'first' | 'replay'
  /** The slide to open on (1–5). */
  startStep?: number
  /** The level can still be picked (no rated game yet). */
  canPickLevel?: boolean
  /** The rules were accepted before (a resumed session): the boxes start ticked. */
  rulesAccepted?: boolean
  /** Replay: back to the lobby. */
  onClose?: () => void
}

type Doc = 'terms' | 'privacy' | 'rules' | null

export function Welcome({ mode, startStep = 1, canPickLevel = true, rulesAccepted = false, onClose }: WelcomeProps) {
  const t = useT()
  const w = t.welcome
  const auth = useAuth()
  const notify = useToast()
  const last = mode === 'replay' ? 3 : SLIDES
  const [step, setStep] = useState(Math.min(last, Math.max(1, startStep)))
  const [direction, setDirection] = useState<1 | -1>(1)
  const [ticks, setTicks] = useState({ terms: rulesAccepted, privacy: rulesAccepted, fairPlay: rulesAccepted })
  const [level, setLevel] = useState<StartLevel | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doc, setDoc] = useState<Doc>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()

  // Each new slide: its heading takes the focus (screen readers announce it).
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  const go = (next: number) => {
    setError(null)
    setDirection(next > step ? 1 : -1)
    setStep(next)
    if (mode === 'first') void auth.setOnboardingStep(next)
  }

  const allTicked = ticks.terms && ticks.privacy && ticks.fairPlay
  const canContinue = step === 4 ? allTicked : step === 5 ? level !== null || !canPickLevel : true

  async function next() {
    if (busy || !canContinue) return
    if (step === last) {
      if (mode === 'replay') return onClose?.()
      return finish()
    }
    if (step === 4 && mode === 'first') {
      setBusy(true)
      try {
        await auth.acceptRules(TERMS_VERSION)
      } catch {
        setError(w.failed)
        return
      } finally {
        setBusy(false)
      }
    }
    go(step + 1)
  }

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      await auth.finishOnboarding(level ?? 'beginner')
      notify(w.toast(auth.profile?.username ?? ''))
    } catch {
      setError(w.failed)
    } finally {
      setBusy(false)
    }
  }

  // Enter continues, ← goes back (not while typing, or inside a dialog).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (doc || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input[type="text"], textarea, dialog')) return
      if (event.key === 'Enter' && !(target instanceof HTMLButtonElement) && !(target instanceof HTMLAnchorElement) && !(target instanceof HTMLInputElement)) {
        event.preventDefault()
        void next()
      } else if (event.key === 'ArrowLeft' && step > 1) {
        event.preventDefault()
        go(step - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const primaryLabel = step === 1 ? w.begin : step === last ? (mode === 'replay' ? w.finishReplay : w.start) : w.continue

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-label={w.label} className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-soot-950">
      <PageBackground name="splash" />
      {/* A dark vignette over the painting. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgb(8 5 3 / 0.35) 0%, rgb(8 5 3 / 0.85) 75%, rgb(8 5 3 / 0.95) 100%)' }} />

      <div className="relative flex min-h-0 flex-1 items-stretch justify-center p-4 sm:items-center sm:p-6">
        {/* The card is at most the screen's height: its body scrolls, the buttons stay at the bottom. */}
        <section className="welcome-card plate rivets iron relative flex max-h-full w-full max-w-[720px] flex-col overflow-hidden" aria-live="polite">
          <div key={step} className={`welcome-slide flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-6 pb-4 sm:px-8 sm:pt-8 ${direction < 0 ? 'welcome-slide--back' : ''}`}>
            {step === 1 && (
              <div className="flex flex-col items-center gap-4 text-center">
                <img src={logoStacked} alt="Bronze" className="h-40 w-auto sm:h-48" />
                <Title id={titleId} ref={headingRef}>
                  {w.welcome.title}
                </Title>
                <p className="max-w-prose text-lg text-parchment-100">{w.welcome.text}</p>
                <p className="max-w-prose text-sm text-parchment-400">{w.welcome.fanMade}</p>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <Title id={titleId} ref={headingRef}>
                  {w.what.title}
                </Title>
                <div role="img" aria-label={w.what.art} className="welcome-banner relative aspect-[12/5] w-full overflow-hidden rounded-xl border border-bronze-400/40 shadow-[0_10px_30px_rgb(0_0_0/0.6)]">
                  <img src={canalArt} alt="" className="absolute inset-0 size-full object-cover" />
                  <img src={millTownArt} alt="" className="welcome-crossfade absolute inset-0 size-full object-cover" />
                  <div className="absolute inset-0 bg-linear-to-t from-soot-950/60 to-transparent" />
                </div>
                <p className="text-lg leading-relaxed text-parchment-100">{w.what.text}</p>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4">
                <Title id={titleId} ref={headingRef}>
                  {w.how.title}
                </Title>
                <ul className="flex flex-col gap-3">
                  <Row art={<img src={boatArt} alt="" className="h-auto w-16 object-contain" />}>{w.how.canal}</Row>
                  <Row art={<img src={locomotiveArt} alt="" className="h-auto w-16 object-contain" />}>{w.how.rail}</Row>
                  <Row art={<VpHex value={10} size="lg" />}>{w.how.score}</Row>
                </ul>
                <button type="button" className="self-start text-sm font-semibold text-brass-200 underline underline-offset-4 hover:text-brass-100" onClick={() => setDoc('rules')}>
                  {w.how.fullRules}
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-4">
                <Title id={titleId} ref={headingRef}>
                  {w.rules.title}
                </Title>
                <p className="text-lg text-parchment-100">{w.rules.text}</p>
                <div className="flex flex-col gap-3">
                  <Tick checked={ticks.terms} onChange={(v) => setTicks({ ...ticks, terms: v })}>
                    {w.rules.terms}{' '}
                    <DocLink onClick={() => setDoc('terms')}>{w.rules.termsLink}</DocLink>
                  </Tick>
                  <Tick checked={ticks.privacy} onChange={(v) => setTicks({ ...ticks, privacy: v })}>
                    {w.rules.privacy}{' '}
                    <DocLink onClick={() => setDoc('privacy')}>{w.rules.privacyLink}</DocLink>
                  </Tick>
                  <Tick checked={ticks.fairPlay} onChange={(v) => setTicks({ ...ticks, fairPlay: v })}>
                    {w.rules.fairPlay}
                  </Tick>
                </div>
                {!allTicked && <p className="text-sm text-parchment-400">{w.rules.allNeeded}</p>}
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-4">
                <div className="text-center">
                  <Title id={titleId} ref={headingRef}>
                    {w.level.title}
                  </Title>
                  <p className="mt-1 text-parchment-300">{w.level.subtitle}</p>
                </div>
                {canPickLevel ? (
                  <div role="radiogroup" aria-labelledby={titleId} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {START_LEVELS.map((id) => (
                      <LevelCard key={id} id={id} selected={level === id} onSelect={() => setLevel(id)} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-bronze-400/40 bg-soot-950/60 px-3 py-2 text-parchment-200">{w.level.locked}</p>
                )}
                <p className="mx-auto max-w-prose text-center text-sm text-parchment-400">{w.level.note}</p>
              </div>
            )}
          </div>

          {/* Progress dots and the buttons: stuck to the bottom of the screen on a phone. */}
          <footer className="welcome-footer flex shrink-0 flex-col gap-3 border-t border-bronze-500/25 bg-soot-950/40 px-4 py-4 sm:px-8">
            {error && (
              <p role="alert" className="text-center text-sm text-rust-300">
                {error}
              </p>
            )}
            {/* Phone: the dots on their own row above the buttons; wider screens: between them. */}
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="order-2 sm:order-1">
                {step > 1 && (
                  <button type="button" className="btn btn-ghost min-h-11 px-5" onClick={() => go(step - 1)}>
                    {w.back}
                  </button>
                )}
              </div>
              <ol className="order-1 col-span-2 flex items-center justify-center gap-2 sm:order-2 sm:col-span-1" aria-label={w.progress(step, last)}>
                {Array.from({ length: last }, (_, i) => (
                  <li
                    key={i}
                    aria-current={i + 1 === step ? 'step' : undefined}
                    className={`size-2.5 rounded-full border transition-colors ${i + 1 === step ? 'border-brass-200 bg-brass-300 shadow-[0_0_8px_rgb(242_192_67/0.7)]' : i + 1 < step ? 'border-bronze-300/70 bg-bronze-400/60' : 'border-bronze-400/50 bg-transparent'}`}
                  />
                ))}
              </ol>
              <div className="order-3 flex justify-end">
                <button type="button" className="btn-brass min-h-11 w-full px-6 sm:w-auto" disabled={!canContinue || busy} onClick={() => void next()}>
                  {busy ? w.saving : primaryLabel}
                </button>
              </div>
            </div>
          </footer>
        </section>
      </div>
      <p className="relative px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-parchment-300" data-testid="fan-made">
        {t.legal.fanMade}
      </p>

      <ModalFrame open={doc === 'rules'} onClose={() => setDoc(null)} id="welcome-rules" title={w.how.rulesTitle} wide>
        <Markdown source={rulesMarkdown} />
      </ModalFrame>
      <ModalFrame open={doc === 'terms'} onClose={() => setDoc(null)} id="welcome-terms" title={w.rules.termsLink} wide>
        <div className="-mx-4 -my-8 sm:-mx-6">
          <TermsOfService />
        </div>
      </ModalFrame>
      <ModalFrame open={doc === 'privacy'} onClose={() => setDoc(null)} id="welcome-privacy" title={w.rules.privacyLink} wide>
        <div className="-mx-4 -my-8 sm:-mx-6">
          <PrivacyPolicy />
        </div>
      </ModalFrame>
    </div>
  )
}

function Title({ id, ref, children }: { id: string; ref: React.Ref<HTMLHeadingElement>; children: ReactNode }) {
  return (
    <h1 id={id} ref={ref} tabIndex={-1} className="metal-text font-display text-3xl font-extrabold tracking-[0.08em] text-balance outline-none sm:text-4xl">
      {children}
    </h1>
  )
}

function Row({ art, children }: { art: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-bronze-500/30 bg-soot-950/60 px-4 py-3">
      <span className="grid w-16 shrink-0 place-items-center">{art}</span>
      <span className="text-parchment-100">{children}</span>
    </li>
  )
}

function Tick({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-bronze-500/30 bg-soot-950/60 px-4 py-3 has-[:checked]:border-brass-300/70">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 shrink-0 accent-brass-400" />
      <span className="text-parchment-100">{children}</span>
    </label>
  )
}

function DocLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="font-semibold text-brass-200 underline underline-offset-4 hover:text-brass-100"
      onClick={(event) => {
        // Inside the label: open the text without ticking the box.
        event.preventDefault()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

function LevelCard({ id, selected, onSelect }: { id: StartLevel; selected: boolean; onSelect: () => void }) {
  const t = useT()
  const level = t.welcome.level.levels[id]
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-xl border-2 bg-soot-950/70 text-left transition ${selected ? 'border-brass-300 shadow-[0_0_0_1px_rgb(242_192_67/0.6),0_0_22px_rgb(242_192_67/0.45)]' : 'border-bronze-500/35 hover:border-bronze-300/70'}`}
    >
      <img src={LEVEL_ART[id]} alt={level.art} className="aspect-[5/2] w-full object-cover" />
      <span className="flex flex-col gap-1 px-4 py-3">
        <span className="font-display text-lg font-bold tracking-[0.06em] text-parchment-50">{level.name}</span>
        <span className="text-sm text-parchment-200">{level.text}</span>
        <span className="text-xs font-semibold tracking-[0.1em] text-brass-300 uppercase tabular-nums">{t.welcome.level.startsAt(START_RATING[id])}</span>
      </span>
      {selected && (
        <span aria-hidden="true" className="absolute top-2 right-2 grid size-8 place-items-center rounded-full border-2 border-soot-950 bg-brass-300 text-lg font-bold text-soot-950 shadow-lg">
          ✓
        </span>
      )}
    </button>
  )
}
