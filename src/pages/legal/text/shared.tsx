/* oxlint-disable react/only-export-components -- shared by the lazily loaded text bundles */
import { Link } from 'react-router'
import { LEGAL_LINKS, PATHS } from '../../../data/navigation'

/* Pieces the legal pages share in every language. */

export const linkClass = 'font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200'
export const strongClass = 'text-parchment-50'

export type LegalLinkKey = (typeof LEGAL_LINKS)[number]['key']

/** A link to a file served next to the page (licence texts, notices). */
export const fileLink = (href: string, label: string) => (
  <a href={href} className={linkClass}>
    {label}
  </a>
)

/** The legal index on Business details: every legal page, then Credits. */
export function DocumentLinks({ credits, label }: { credits: string; label: (key: LegalLinkKey) => string }) {
  const items = [...LEGAL_LINKS.filter((l) => l.path !== PATHS.legal).map((l) => ({ path: l.path, text: label(l.key) })), { path: PATHS.credits, text: credits }]
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.path}>
          <Link
            to={item.path}
            className="flex min-h-11 items-center rounded-lg border border-bronze-500/30 bg-soot-950/50 px-3 font-semibold text-parchment-100 hover:border-bronze-300/60 hover:text-parchment-50"
          >
            {item.text}
          </Link>
        </li>
      ))}
    </ul>
  )
}
