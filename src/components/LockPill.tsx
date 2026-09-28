import { useOpenAuth } from '../hooks/useOpenAuth'
import { useT } from '../i18n'
import { IconLock, IconLogin, IconUserPlus } from './icons'

/** Small "🔒 Log in to use this" on a feature that needs an account; opens the log-in screen. */
export function LockPill({ label, className = '' }: { label?: string; className?: string }) {
  const t = useT()
  const openAuth = useOpenAuth()
  return (
    <button
      type="button"
      onClick={() => openAuth('login')}
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border border-brass-300/50 bg-soot-950/80 px-2.5 py-1 font-display text-[0.7rem] leading-none font-bold tracking-[0.14em] whitespace-nowrap text-brass-200 uppercase transition hover:border-ember-400/70 hover:text-parchment-50 hover:shadow-[0_0_14px_-4px_rgb(255_157_77/0.7)] ${className}`}
    >
      <IconLock className="size-3.5" strokeWidth={2.2} />
      {label ?? t.common.logInToUse}
    </button>
  )
}

/** A page-sized version for guests: what the page is for, and the way in. */
export function LockedNotice({ children }: { children: string }) {
  const t = useT()
  const openAuth = useOpenAuth()
  return (
    <div className="plate rivets iron mx-auto mt-8 flex max-w-md flex-col items-center gap-3 px-6 py-6 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-brass-300/50 bg-soot-950/70 text-2xl text-brass-300">
        <IconLock />
      </span>
      <p className="font-display text-lg font-extrabold tracking-[0.12em] text-parchment-50 uppercase">{t.common.logInToUse}</p>
      <p className="text-sm text-parchment-300">{children}</p>
      <div className="mt-1 grid w-full grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => openAuth('login')}>
          <IconLogin className="size-5" />
          {t.common.logIn}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => openAuth('register')}>
          <IconUserPlus className="size-5" />
          {t.common.register}
        </button>
      </div>
    </div>
  )
}
