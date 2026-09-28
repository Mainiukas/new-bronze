import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Stripe, StripeCardElement } from '@stripe/stripe-js'
import type { AccountDetails } from '../../auth/backend'
import { authErrorMessage } from '../../auth/messages'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { useT } from '../../i18n'
import { loadStripeJs } from '../../lib/stripe'
import { FormAlert, Spinner } from '../auth/fields'
import { IconShield } from '../icons'
import { Actions, Panel, StatusPill } from './parts'

const brandName = (brand: string | null) => (brand ? brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, ' ') : '')

/**
 * "Verified player": a card check through Stripe. Stripe's own card form
 * (Elements) collects the card; a SetupIntent from the create-setup-intent
 * Edge Function checks it without charging anything; Stripe's webhook then
 * marks the profile verified (card brand and last 4 digits only).
 */
export function CardPanel({ details, onChanged }: { details: AccountDetails; onChanged: () => void }) {
  const t = useT()
  const w = t.security.card
  const auth = useAuth()
  const notify = useToast()
  const [phase, setPhase] = useState<'view' | 'loading' | 'form' | 'working' | 'waiting'>('view')
  const [error, setError] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)
  const mountRef = useRef<HTMLDivElement>(null)
  const stripeRef = useRef<{ stripe: Stripe; card: StripeCardElement; secret: string } | null>(null)

  // Tidy the card form away when leaving.
  useEffect(() => () => stripeRef.current?.card.destroy(), [])

  const start = async () => {
    setPhase('loading')
    setError(null)
    setSlow(false)
    try {
      const [stripe, secret] = await Promise.all([loadStripeJs(), auth.startCardVerification()])
      if (!stripe) throw new Error(w.failed)
      const elements = stripe.elements({ appearance: { theme: 'night' } })
      const card = elements.create('card', {
        hidePostalCode: true,
        style: { base: { color: '#f4ead5', fontSize: '16px', iconColor: '#e8b57c', '::placeholder': { color: '#9c8f7a' } }, invalid: { color: '#f08a6b' } },
      })
      stripeRef.current = { stripe, card, secret }
      setPhase('form')
      // Mount once the form's box is on screen.
      requestAnimationFrame(() => mountRef.current && card.mount(mountRef.current))
    } catch (failure) {
      setError(failure instanceof Error && failure.message === w.failed ? w.failed : authErrorMessage(failure, t.authErrors))
      setPhase('view')
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const current = stripeRef.current
    if (!current || phase !== 'form') return
    setPhase('working')
    setError(null)
    const { error: stripeError } = await current.stripe.confirmCardSetup(current.secret, { payment_method: { card: current.card } })
    if (stripeError) {
      setError(stripeError.message ?? w.failed)
      setPhase('form')
      return
    }
    // Stripe accepted the card; the webhook marks the profile. Wait for it (up to ~20 s).
    setPhase('waiting')
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const account = await auth.getAccount().catch(() => null)
      if (account?.cardVerified) {
        current.card.destroy()
        stripeRef.current = null
        await auth.refreshProfile().catch(() => undefined)
        notify(w.verified(brandName(account.cardBrand), account.cardLast4 ?? ''))
        setPhase('view')
        onChanged()
        return
      }
    }
    current.card.destroy()
    stripeRef.current = null
    setSlow(true)
    setPhase('view')
    onChanged()
  }

  const remove = async () => {
    setPhase('working')
    setError(null)
    try {
      await auth.removeCardVerification()
      notify(w.removed)
      onChanged()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setPhase('view')
    }
  }

  return (
    <Panel
      title={w.title}
      intro={w.intro}
      id="card-title"
      aside={<StatusPill on={details.cardVerified}>{details.cardVerified ? t.profilePage.cardVerified : t.security.twoFactor.off}</StatusPill>}
    >
      <p className="flex items-start gap-2 rounded-lg border border-verdigris-400/40 bg-verdigris-500/10 px-3 py-2.5 font-semibold text-verdigris-200">
        <IconShield className="mt-0.5 size-4 shrink-0" />
        {w.noCharge}
      </p>
      {details.cardVerified ? (
        <>
          <p className="text-parchment-50">{w.verified(brandName(details.cardBrand), details.cardLast4 ?? '')}</p>
          <FormAlert message={error} />
          <Actions>
            <button type="button" className="btn btn-ghost" disabled={phase === 'working'} onClick={() => void remove()}>
              {w.remove}
            </button>
          </Actions>
        </>
      ) : phase === 'view' || phase === 'loading' ? (
        <>
          <p className="text-sm text-parchment-300">{w.stripeNote}</p>
          {slow && <FormAlert tone="info" message={w.slow} />}
          <FormAlert message={error} />
          <Actions>
            <button type="button" className="btn btn-primary" disabled={phase === 'loading'} onClick={() => void start()}>
              {phase === 'loading' && <Spinner className="size-4" />}
              {w.start}
            </button>
          </Actions>
        </>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
          <p className="text-sm text-parchment-300">{w.stripeNote}</p>
          <div>
            <span className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">{w.formLabel}</span>
            <div ref={mountRef} className="rounded-lg border border-bronze-500/35 bg-soot-950/75 px-3.5 py-3.5" />
          </div>
          <FormAlert message={error} />
          <p aria-live="polite" className="text-sm text-parchment-300">
            {phase === 'working' ? w.working : phase === 'waiting' ? w.waiting : ''}
          </p>
          <Actions>
            <button type="submit" className="btn btn-primary" disabled={phase !== 'form'}>
              {phase !== 'form' && <Spinner className="size-4" />}
              {w.submit}
            </button>
          </Actions>
        </form>
      )}
    </Panel>
  )
}
