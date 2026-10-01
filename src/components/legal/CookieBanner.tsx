import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { PATHS } from '../../data/navigation'
import { LANGUAGES, useT, type LanguageCode } from '../../i18n'
import { consentStore, useConsent } from '../../legal/consent'
import { IconChevronDown } from '../icons'

/**
 * The cookie notice: Bronze stores only what it needs to work, so there's
 * nothing to accept or reject, just an OK. It shows on the first visit (and
 * when the Cookie Policy's version changes, or after 12 months), at the bottom
 * of the page without blocking it, so the Rules and legal pages stay readable.
 */
export function CookieBanner({ language, onLanguage }: { language: LanguageCode; onLanguage: (code: LanguageCode) => void }) {
  const t = useT().cookieBanner
  const { open } = useConsent()
  const panelRef = useRef<HTMLElement>(null)

  // Keep the page's content clear of the notice (see --cookie-banner-height in index.css).
  useEffect(() => {
    const root = document.documentElement
    const panel = panelRef.current
    if (!open || !panel) {
      root.style.removeProperty('--cookie-banner-height')
      return
    }
    const update = () => root.style.setProperty('--cookie-banner-height', `${Math.ceil(window.innerHeight - panel.getBoundingClientRect().top + 12)}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(panel)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--cookie-banner-height')
    }
  }, [open])

  if (!open) return null

  const link = 'font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200'
  return (
    <section
      ref={panelRef}
      aria-labelledby="cookie-banner-title"
      data-testid="cookie-notice"
      className="plate rivets iron fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-3xl border-brass-400/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_40px_-10px_rgb(0_0_0/0.9)] sm:inset-x-4 sm:bottom-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <h2 id="cookie-banner-title" className="flex-1 font-display text-xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {t.title}
        </h2>
        {/* The whole app's language, so the notice can be read first. */}
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
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
        <p className="flex-1 text-sm leading-relaxed text-parchment-200">
          {t.body}{' '}
          <Link to={PATHS.cookies} className={link}>
            {t.cookiePolicy}
          </Link>
          {' · '}
          <Link to={PATHS.privacy} className={link}>
            {t.privacyPolicy}
          </Link>
        </p>
        <button type="button" className="btn btn-primary min-h-11 w-full px-8 sm:w-auto" onClick={() => consentStore.acknowledge()}>
          {t.ok}
        </button>
      </div>
    </section>
  )
}
