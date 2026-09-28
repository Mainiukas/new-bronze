import { Link } from 'react-router'
import { LEGAL_LINKS, PATHS } from '../../data/navigation'
import { consentStore } from '../../legal/consent'
import { useT } from '../../i18n'
import { OPERATOR } from '../../legal/operator'
import { Fill } from './LegalPage'

const linkClass = 'rounded px-1 py-1.5 text-parchment-300 underline-offset-4 hover:text-parchment-50 hover:underline'

/** The footer on every lobby page: the legal pages, Credits and Cookie settings. */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const t = useT()
  return (
    <footer className={`border-t border-bronze-500/20 text-sm ${compact ? 'mt-6 pt-4' : 'mt-10 bg-soot-950/90 px-4 py-6 backdrop-blur-[3px] sm:px-6'}`}>
      <nav aria-label={t.nav.legal} className={`${compact ? 'justify-center' : 'mx-auto max-w-6xl'} flex flex-wrap items-center gap-x-3 gap-y-1`}>
        {LEGAL_LINKS.map((link) => (
          <Link key={link.path} to={link.path} className={linkClass}>
            {t.nav[link.key]}
          </Link>
        ))}
        <Link to={PATHS.credits} className={linkClass}>
          {t.nav.credits}
        </Link>
        <button type="button" onClick={() => consentStore.reopen()} className={`${linkClass} font-semibold text-brass-300`}>
          {t.account.privacy.cookies}
        </button>
      </nav>
      {!compact && (
        <p className="mx-auto mt-3 max-w-6xl px-1 text-xs text-parchment-400">
          © {new Date().getFullYear()} <Fill value={OPERATOR.name} />. {t.legal.freeToPlay}
        </p>
      )}
    </footer>
  )
}
