import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { EmailList } from '../../auth/backend'
import { LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { useAuth } from '../../hooks/useAuth'
import { UNSUBSCRIBE_EN } from './text/en'
import { useLegalText } from './text/load'

const LISTS: readonly (EmailList | 'all')[] = ['marketing', 'friends', 'tournaments', 'all']

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
  const w = useLegalText()?.unsubscribe ?? UNSUBSCRIBE_EN
  const [params] = useSearchParams()
  const auth = useAuth()
  const token = params.get('token') ?? ''
  const rawList = params.get('list') ?? 'all'
  const list = (LISTS as readonly string[]).includes(rawList) ? (rawList as EmailList | 'all') : 'all'
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
    <LegalPage title={w.title}>
      <Section id="result" title={shown === 'done' ? w.done : shown === 'working' ? w.working : w.failed}>
        <p role="status">
          {shown === 'done' && w.doneBody(w.lists[list])}
          {shown === 'working' && w.workingBody}
          {shown === 'not-found' && w.notFoundBody}
          {shown === 'failed' && w.failedBody}
          {shown === 'unavailable' && w.unavailableBody}
        </p>
        <p>{w.more(<TextLink to={PATHS.dataRequest}>{w.dataRequests}</TextLink>)}</p>
      </Section>
    </LegalPage>
  )
}
