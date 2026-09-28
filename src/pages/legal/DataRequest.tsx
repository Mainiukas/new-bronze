import { useId, useState, type FormEvent } from 'react'
import { Bullets, Email, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { useT } from '../../i18n'
import { isPlaceholder, OPERATOR } from '../../legal/operator'
import { DATA_REQUEST_EN } from './text/en'
import { useLegalText } from './text/load'

const REQUESTS = ['access', 'erasure', 'rectification', 'objection', 'other'] as const

/**
 * For people who can't log in: how to ask about their data. The form only
 * writes an email for them to send (nothing is sent or stored by the page).
 */
export function DataRequest() {
  const t = useT()
  const w = useLegalText()?.dataRequest ?? DATA_REQUEST_EN
  const [type, setType] = useState<(typeof REQUESTS)[number]>('access')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ids = { type: useId(), email: useId(), username: useId(), details: useId(), error: useId() }
  const noAddress = isPlaceholder(OPERATOR.email)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(w.emailError)
      return
    }
    setError(null)
    const label = w.requests[type]
    const body = w.body(label, email.trim(), username.trim() || w.notGiven, details.trim())
    window.location.href = `mailto:${OPERATOR.email}?subject=${encodeURIComponent(w.subject(label))}&body=${encodeURIComponent(body)}`
  }

  const field = 'h-12 w-full rounded-lg border border-bronze-500/35 bg-soot-950/75 px-3.5 text-parchment-50 outline-none focus:border-ember-400/80'
  return (
    <LegalPage
      title={w.title}
      intro={w.intro}
    >
      <Section id="how" title={w.howTitle}>
        <Bullets>
          {w.how.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
          <li>{w.rights(<TextLink to={PATHS.privacy}>{t.nav.privacy}</TextLink>)}</li>
        </Bullets>
      </Section>

      <Section id="form" title={w.formTitle}>
        <p>{w.formIntro(<Email value={OPERATOR.email} />)}</p>
        {noAddress && (
          <p className="rounded-lg border border-dashed border-brass-400/60 px-3 py-2 text-sm text-brass-200" role="note">
            {w.noAddress}
          </p>
        )}
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor={ids.type} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              {w.what}
            </label>
            <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as typeof type)} className={field}>
              {REQUESTS.map((r) => (
                <option key={r} value={r}>
                  {w.requests[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.email} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              {w.email}
            </label>
            <input
              id={ids.email}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={ids.error}
              required
              className={field}
            />
            <p id={ids.error} aria-live="polite" className="mt-1 min-h-5 text-sm text-rust-300">
              {error}
            </p>
          </div>
          <div>
            <label htmlFor={ids.username} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              {w.username}
            </label>
            <input id={ids.username} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor={ids.details} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              {w.details}
            </label>
            <textarea id={ids.details} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} className={`${field} h-auto py-3`} />
          </div>
          <button type="submit" className="btn btn-primary self-start" disabled={noAddress}>
            {w.submit}
          </button>
        </form>
      </Section>
    </LegalPage>
  )
}
