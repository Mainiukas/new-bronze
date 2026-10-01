import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { authErrorMessage } from '../auth/messages'
import { accountPath } from '../data/navigation'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'
import { IconLock, IconMail } from './icons'

const COOLDOWN_SECONDS = 60
/** Shared by every banner and button on the page, so the cooldown can't be dodged. */
let lastSent = 0

/** "Resend email", then a 60-second countdown. */
function ResendButton({ className = 'btn btn-ghost min-h-10 text-sm' }: { className?: string }) {
  const t = useT()
  const auth = useAuth()
  const notify = useToast()
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const wait = Math.max(0, Math.ceil((lastSent + COOLDOWN_SECONDS * 1000 - now) / 1000))

  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [wait])

  const resend = async () => {
    setBusy(true)
    try {
      await auth.resendVerificationEmail()
      lastSent = Date.now()
      setNow(Date.now())
      notify(t.verifyEmail.sent)
    } catch (failure) {
      notify(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className={className} disabled={busy || wait > 0} onClick={() => void resend()}>
      {wait > 0 ? t.verifyEmail.resendIn(wait) : t.verifyEmail.resend}
    </button>
  )
}

/** Across the top of the lobby while the email isn't confirmed. */
export function VerifyEmailBanner() {
  const t = useT()
  const auth = useAuth()
  if (useAccountAccess() !== 'unverified') return null
  return (
    <div role="status" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brass-400/50 bg-soot-950/90 px-4 py-2.5 backdrop-blur-[3px] sm:mx-6">
      <p className="flex items-center gap-2 text-sm text-parchment-100">
        <IconMail className="size-5 shrink-0 text-brass-300" />
        {t.verifyEmail.banner(<strong className="break-all text-parchment-50">{auth.user?.email}</strong>)}
      </p>
      <ResendButton />
    </div>
  )
}

/** "🔒 Verify your email to use this": opens the account's Security tab. */
export function VerifyPill({ className = '' }: { className?: string }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(accountPath('security'))}
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brass-300/50 bg-soot-950/80 px-2.5 py-1 font-display text-[0.7rem] leading-none font-bold tracking-[0.14em] text-balance text-brass-200 uppercase transition hover:border-ember-400/70 hover:text-parchment-50 ${className}`}
    >
      <IconLock className="size-3.5 shrink-0" strokeWidth={2.2} />
      {t.verifyEmail.needed}
    </button>
  )
}

/** A page-sized version: why, and the resend button. */
export function VerifyNotice() {
  const t = useT()
  const auth = useAuth()
  return (
    <div className="plate rivets iron mx-auto mt-8 flex max-w-md flex-col items-center gap-3 px-6 py-6 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-brass-300/50 bg-soot-950/70 text-2xl text-brass-300">
        <IconLock />
      </span>
      <p className="font-display text-lg font-extrabold tracking-[0.12em] text-parchment-50 uppercase">{t.verifyEmail.needed}</p>
      <p className="text-sm text-parchment-300">{t.verifyEmail.banner(<strong className="break-all text-parchment-100">{auth.user?.email}</strong>)}</p>
      <ResendButton className="btn btn-primary" />
    </div>
  )
}
