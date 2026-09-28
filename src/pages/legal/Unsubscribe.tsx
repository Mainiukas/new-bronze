import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { EmailList } from '../../auth/backend'
import { LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { useAuth } from '../../hooks/useAuth'

const LISTS: Record<EmailList | 'all', string> = {
  marketing: 'news about Bronze',
  friends: 'friend emails',
  tournaments: 'tournament emails',
  all: 'every optional email',
}

type Result = 'working' | 'done' | 'not-found' | 'failed' | 'unavailable'

/** Runs each unsubscribe link once, even if the page is shown twice. */
const done = new Map<string, Promise<boolean>>()

/**
 * The page behind the unsubscribe link in every optional email
 * (#/unsubscribe?token=…&list=marketing): it unsubscribes as soon as it opens,
 * without logging in. Emails also carry a List-Unsubscribe header for the
 * one-click button in email apps (see SETUP.md, "Emails").
 */
export function Unsubscribe() {
  const [params] = useSearchParams()
  const auth = useAuth()
  const token = params.get('token') ?? ''
  const rawList = params.get('list') ?? 'all'
  const list = (rawList in LISTS ? rawList : 'all') as EmailList | 'all'
  const valid = /^[0-9a-f-]{36}$/i.test(token)
  const [result, setResult] = useState<Result>('working')
  const { configured, unsubscribe } = auth

  useEffect(() => {
    if (!valid || !configured) return
    const key = `${token}|${list}`
    if (!done.has(key)) done.set(key, unsubscribe(token, list))
    let alive = true
    done.get(key)!.then(
      (found) => alive && setResult(found ? 'done' : 'not-found'),
      () => alive && setResult('failed'),
    )
    return () => {
      alive = false
    }
  }, [valid, configured, token, list, unsubscribe])

  const shown: Result = !configured ? 'unavailable' : !valid ? 'not-found' : result
  return (
    <LegalPage title="Unsubscribe">
      <Section id="result" title={shown === 'done' ? 'You’re unsubscribed' : shown === 'working' ? 'Unsubscribing…' : 'Couldn’t unsubscribe'}>
        <p role="status">
          {shown === 'done' && <>You won’t get {LISTS[list]} any more. It can take a few minutes for emails already on their way.</>}
          {shown === 'working' && <>One moment…</>}
          {shown === 'not-found' && <>This unsubscribe link isn’t valid. It may have been copied incompletely.</>}
          {shown === 'failed' && <>Something went wrong. Please try the link again in a minute.</>}
          {shown === 'unavailable' && <>Accounts aren’t set up on this site, so there are no emails to unsubscribe from.</>}
        </p>
        <p>
          You can change all your email choices, when logged in, in Settings → Notifications. Questions:{' '}
          <TextLink to={PATHS.dataRequest}>data requests</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}
