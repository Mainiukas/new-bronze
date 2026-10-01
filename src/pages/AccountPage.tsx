import { useId, useRef, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ProfileTab } from '../components/account/ProfileTab'
import { PrivacyTab } from '../components/account/PrivacyTab'
import { SecurityTab } from '../components/account/SecurityTab'
import { LockedNotice } from '../components/LockPill'
import { AccountSection, NotificationsSection } from '../components/settings/AccountSettings'
import { PageTitle } from '../components/theme/Ornaments'
import { ACCOUNT_TABS, type AccountTab } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useT } from '../i18n'

const isTab = (value: string | null): value is AccountTab => (ACCOUNT_TABS as readonly string[]).includes(value ?? '')

/**
 * Account settings (/settings/account?tab=…): Profile · Security · Privacy ·
 * Notifications · Data. Tabs follow the ARIA tabs pattern (arrow keys move).
 */
export function AccountPage() {
  const t = useT()
  const a = t.accountPage
  const auth = useAuth()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const tab: AccountTab = isTab(params.get('tab')) ? (params.get('tab') as AccountTab) : 'profile'
  const baseId = useId()
  const tabRefs = useRef<Partial<Record<AccountTab, HTMLButtonElement | null>>>({})

  const select = (next: AccountTab, focus = false) => {
    setParams({ tab: next }, { replace: true })
    if (focus) tabRefs.current[next]?.focus()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    const index = ACCOUNT_TABS.indexOf(tab)
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (event.key === 'Home') select(ACCOUNT_TABS[0], true)
    else if (event.key === 'End') select(ACCOUNT_TABS[ACCOUNT_TABS.length - 1], true)
    else if (move) select(ACCOUNT_TABS[(index + move + ACCOUNT_TABS.length) % ACCOUNT_TABS.length], true)
    else return
    event.preventDefault()
  }

  if (!auth.signedIn || !auth.profile) {
    return (
      <section className="mx-auto max-w-2xl animate-fade-up px-4 py-10 sm:px-6 sm:py-14">
        <PageTitle divider className="text-center text-5xl">
          {a.title}
        </PageTitle>
        <LockedNotice>{a.locked}</LockedNotice>
      </section>
    )
  }

  return (
    <section className="mx-auto flex max-w-4xl animate-fade-up flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <PageTitle divider className="text-center text-5xl sm:text-6xl">
        {a.title}
      </PageTitle>

      <div role="tablist" aria-label={a.title} onKeyDown={onKeyDown} className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-bronze-500/30 bg-soot-950/85 p-1 backdrop-blur-[3px]">
        {ACCOUNT_TABS.map((value) => (
          <button
            key={value}
            ref={(element) => {
              tabRefs.current[value] = element
            }}
            type="button"
            role="tab"
            id={`${baseId}-${value}-tab`}
            aria-selected={tab === value}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === value ? 0 : -1}
            onClick={() => select(value)}
            className={`min-h-11 flex-1 rounded-lg px-4 font-display text-sm font-bold tracking-[0.12em] whitespace-nowrap uppercase transition-colors ${
              tab === value ? 'bg-bronze-500/35 text-parchment-50 shadow-[inset_0_0_0_1px_rgb(240_215_138/0.4)]' : 'text-parchment-300 hover:text-parchment-50'
            }`}
          >
            {a.tabs[value]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}-tab`} className="flex flex-col gap-5">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'notifications' && (
          <div className="plate rivets iron p-5 sm:p-6">
            <NotificationsSection />
          </div>
        )}
        {tab === 'data' && (
          <div className="plate rivets iron p-5 sm:p-6">
            <AccountSection onDone={() => undefined} notify={notify} />
          </div>
        )}
      </div>
    </section>
  )
}
