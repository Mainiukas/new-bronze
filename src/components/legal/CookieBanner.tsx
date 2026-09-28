import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
import { PATHS } from '../../data/navigation'
import { LANGUAGES, useT, type LanguageCode } from '../../i18n'
import { ALL, consentStore, NONE, OPTIONAL_CATEGORIES, useConsent, type OptionalCategory } from '../../legal/consent'
import { IconChevronDown } from '../icons'

/**
 * The cookie banner: on the first visit (and when the Cookie Policy's version
 * changes, or after 12 months), and whenever "Cookie settings" reopens it.
 * It sits at the bottom of the page without blocking it, so the Rules and the
 * legal pages stay readable. Accept all, Reject all and Customise look the
 * same; nothing optional is stored until a choice is made.
 */
export function CookieBanner({ language, onLanguage }: { language: LanguageCode; onLanguage: (code: LanguageCode) => void }) {
  const t = useT().cookieBanner
  const { record, open, reopened } = useConsent()
  const [customising, setCustomising] = useState(false)
  const [choices, setChoices] = useState<Record<OptionalCategory, boolean>>(record?.choices ?? NONE)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Reopened from "Cookie settings": start from the current choices, show them, and move focus here.
  const [seen, setSeen] = useState(reopened)
  if (seen !== reopened) {
    setSeen(reopened)
    setChoices(record?.choices ?? NONE)
    setCustomising(true)
  }
  useEffect(() => {
    if (reopened > 0 && open) headingRef.current?.focus()
  }, [reopened, open])

  // Keep the page's content clear of the banner (see --cookie-banner-height in index.css).
  useEffect(() => {
    const root = document.documentElement
    const panel = panelRef.current
    if (!open || !panel) {
      root.style.removeProperty('--cookie-banner-height')
      return
    }
    // Its height plus the gap under it, and a little room above.
    const update = () => root.style.setProperty('--cookie-banner-height', `${Math.ceil(window.innerHeight - panel.getBoundingClientRect().top + 12)}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--cookie-banner-height')
    }
  }, [open, customising])

  if (!open) return null

  const choiceButton = 'btn btn-primary min-h-11 flex-1 whitespace-nowrap sm:flex-none sm:min-w-40'
  return (
    <section
      ref={panelRef}
      aria-labelledby="cookie-banner-title"
      className="plate rivets iron fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-4xl border-brass-400/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_-10px_rgb(0_0_0/0.9)] sm:inset-x-4 sm:bottom-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <h2 id="cookie-banner-title" ref={headingRef} tabIndex={-1} className="flex-1 font-display text-xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {t.title}
        </h2>
        {/* The whole app's language, so the banner can be read before anything is chosen. */}
        <label className="relative">
          <span className="sr-only">{t.language}</span>
          <select
            value={language}
            onChange={(event) => onLanguage(event.target.value as LanguageCode)}
            className="min-h-11 appearance-none rounded-md border border-bronze-500/35 bg-soot-950/70 py-1 pr-8 pl-2.5 text-sm font-semibold text-brass-200 outline-none hover:border-bronze-300/60"
          >
            {LANGUAGES.map((option) => (
              <option key={option.code} value={option.code} lang={option.code}>
                {option.label}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-bronze-300" />
        </label>
        {record && (
          <button type="button" onClick={() => consentStore.dismiss()} className="min-h-11 rounded-md px-2 text-sm font-semibold text-parchment-200 hover:text-parchment-50">
            {t.close}
          </button>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-parchment-200">
        {t.body}{' '}
        <Link to={PATHS.cookies} className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
          {t.cookiePolicy}
        </Link>
        {' · '}
        <Link to={PATHS.privacy} className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
          {t.privacyPolicy}
        </Link>
      </p>

      {customising && (
        <ul ref={listRef} className="mt-4 grid gap-2 sm:grid-cols-2">
          {(['essential', ...OPTIONAL_CATEGORIES] as const).map((id) => {
            const on = id === 'essential' ? true : choices[id]
            const labelId = `cookie-${id}-label`
            return (
              <li key={id} className="flex items-start justify-between gap-3 rounded-lg border border-bronze-500/30 bg-soot-950/60 p-3">
                <div>
                  <span id={labelId} className="block font-semibold text-parchment-50">
                    {t.categories[id].title}
                  </span>
                  <span id={`${labelId}-desc`} className="block text-sm text-parchment-300">
                    {t.categories[id].description}
                  </span>
                </div>
                {id === 'essential' ? (
                  <span className="shrink-0 pt-0.5 text-sm font-semibold text-verdigris-300">{t.always}</span>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-labelledby={labelId}
                    aria-describedby={`${labelId}-desc`}
                    onClick={() => setChoices((c) => ({ ...c, [id]: !c[id] }))}
                    className={`relative h-7 w-13 shrink-0 rounded-full border transition-colors ${on ? 'border-bronze-300/70 bg-bronze-600' : 'border-bronze-500/40 bg-soot-700'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-1/2 left-0.5 size-5.5 -translate-y-1/2 rounded-full bg-parchment-100 shadow transition-transform motion-reduce:transition-none ${on ? 'translate-x-6' : ''}`}
                    />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={choiceButton} onClick={() => consentStore.save(ALL, 'accept-all')}>
          {t.accept}
        </button>
        <button type="button" className={choiceButton} onClick={() => consentStore.save(NONE, 'reject-all')}>
          {t.reject}
        </button>
        {customising ? (
          <button type="button" className={choiceButton} onClick={() => consentStore.save(choices, 'custom')}>
            {t.save}
          </button>
        ) : (
          <button
            type="button"
            className={choiceButton}
            onClick={() => {
              // Customise goes away, so focus moves to the first switch.
              flushSync(() => setCustomising(true))
              listRef.current?.querySelector<HTMLElement>('[role="switch"]')?.focus()
            }}
          >
            {t.customise}
          </button>
        )}
      </div>
    </section>
  )
}
