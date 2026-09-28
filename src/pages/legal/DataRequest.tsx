import { useId, useState, type FormEvent } from 'react'
import { Bullets, Email, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { isPlaceholder, OPERATOR } from '../../legal/operator'

const REQUESTS = [
  { id: 'access', label: 'A copy of my data (access / portability)' },
  { id: 'erasure', label: 'Delete my account and data' },
  { id: 'rectification', label: 'Correct my data' },
  { id: 'objection', label: 'Object to or restrict processing' },
  { id: 'other', label: 'Something else' },
] as const

/**
 * For people who can't log in: how to ask about their data. The form only
 * writes an email for them to send (nothing is sent or stored by the page).
 */
export function DataRequest() {
  const [type, setType] = useState<(typeof REQUESTS)[number]['id']>('access')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ids = { type: useId(), email: useId(), username: useId(), details: useId(), error: useId() }
  const noAddress = isPlaceholder(OPERATOR.email)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address of your Bronze account, so we can find it and reply.')
      return
    }
    setError(null)
    const label = REQUESTS.find((r) => r.id === type)!.label
    const body = [`Request: ${label}`, `Account email: ${email.trim()}`, `Username: ${username.trim() || '(not given)'}`, '', details.trim()].join('\n')
    window.location.href = `mailto:${OPERATOR.email}?subject=${encodeURIComponent(`Bronze data request: ${label}`)}&body=${encodeURIComponent(body)}`
  }

  const field = 'h-12 w-full rounded-lg border border-bronze-500/35 bg-soot-950/75 px-3.5 text-parchment-50 outline-none focus:border-ember-400/80'
  return (
    <LegalPage
      title="Data requests"
      intro={
        <p>
          If you can log in, the quickest way is in the game: Settings → Account has <strong>Download my data</strong> and{' '}
          <strong>Delete my account</strong>. If you can’t log in, ask us here.
        </p>
      }
    >
      <Section id="how" title="How it works">
        <Bullets>
          <li>We answer within 30 days (one month). For complex requests this can be extended by two months; we’ll tell you within the first month.</li>
          <li>To protect your account, we’ll reply to the email address of the account and may ask you to confirm the request from it.</li>
          <li>
            Your rights are explained in the <TextLink to={PATHS.privacy}>Privacy Policy</TextLink>.
          </li>
        </Bullets>
      </Section>

      <Section id="form" title="Make a request">
        <p>
          This form writes an email for you to send from your own email app, to <Email value={OPERATOR.email} />. Nothing is sent until you send it.
        </p>
        {noAddress && (
          <p className="rounded-lg border border-dashed border-brass-400/60 px-3 py-2 text-sm text-brass-200" role="note">
            The operator’s email address isn’t filled in yet, so this form can’t be sent.
          </p>
        )}
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <div>
            <label htmlFor={ids.type} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              What would you like?
            </label>
            <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as typeof type)} className={field}>
              {REQUESTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.email} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              Your account’s email address
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
              Username (optional)
            </label>
            <input id={ids.username} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={field} />
          </div>
          <div>
            <label htmlFor={ids.details} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
              Details (optional)
            </label>
            <textarea id={ids.details} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} className={`${field} h-auto py-3`} />
          </div>
          <button type="submit" className="btn btn-primary self-start" disabled={noAddress}>
            Write the email
          </button>
        </form>
      </Section>
    </LegalPage>
  )
}
