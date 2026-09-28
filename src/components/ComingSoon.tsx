import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'
import { Gear } from './Gear'
import { LockedNotice } from './LockPill'
import { VerifyNotice } from './VerifyEmail'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { PageTitle } from './theme/Ornaments'

interface ComingSoonProps {
  title: string
  /** The page's empty state, in a line (it has nothing in it yet). */
  empty: string
  /** One line describing what the page will hold. */
  blurb: string
  icon: ReactNode
  /** Needs an account: guests also see a lock with the way in. */
  locked?: string
  /** Also needs a verified email (online features): unverified players see how to verify. */
  needsVerifiedEmail?: boolean
}

/** Shared layout for tabs that aren't built yet: the title, then a panel saying so. */
export function ComingSoon({ title, empty, blurb, icon, locked, needsVerifiedEmail = false }: ComingSoonProps) {
  const t = useT()
  const { signedIn } = useAuth()
  const access = useAccountAccess()
  return (
    <section className="mx-auto flex max-w-2xl animate-fade-up flex-col items-center px-4 py-12 text-center sm:py-16">
      <PageTitle divider className="text-5xl sm:text-7xl">
        {title}
      </PageTitle>

      <div className="plate rivets iron mt-8 flex w-full flex-col items-center px-5 py-8 sm:px-8">
        {/* Emblem: icon inside a slowly turning gear */}
        <div className="relative mb-6 grid size-32 place-items-center" aria-hidden="true">
          <Gear teeth={16} holes={0} className="absolute inset-0 animate-spin-slow text-bronze-500/25" />
          <div className="absolute inset-4 rounded-full bg-soot-950 shadow-[inset_0_0_24px_rgb(0_0_0/0.9),0_0_40px_-6px_rgb(255_122_26/0.4)]" />
          <span className="relative text-5xl text-bronze-300 drop-shadow-[0_0_14px_rgb(255_157_77/0.5)]">{icon}</span>
        </div>
        <p className="max-w-md font-display text-2xl leading-snug font-bold tracking-[0.04em] text-balance text-parchment-50">{empty}</p>
        <p className="mt-5 inline-flex items-center gap-3 rounded-full border border-bronze-400/40 bg-soot-950/80 px-5 py-2 font-display text-lg font-bold tracking-[0.3em] text-brass-300 uppercase shadow-[0_0_24px_-8px_rgb(255_157_77/0.6)]">
          <span className="size-2 animate-pulse rounded-full bg-ember-400 shadow-[0_0_8px_rgb(255_157_77)]" />
          {t.common.comingSoon}
        </p>
        <p className="mt-5 max-w-md text-parchment-200">{blurb}</p>
        {locked && !signedIn && <LockedNotice>{locked}</LockedNotice>}
        {needsVerifiedEmail && access === 'unverified' && <VerifyNotice />}
      </div>
    </section>
  )
}
