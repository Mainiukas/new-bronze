import { Localized } from './text/Localized'
import { Link } from 'react-router'
import { Email, Fill, LegalPage, Section } from '../../components/legal/LegalPage'
import { LEGAL_LINKS, PATHS } from '../../data/navigation'
import { OPERATOR, SERVICES } from '../../legal/operator'

/** Business details: who runs Bronze, and the index of the legal pages. */
function LegalNoticeEnglish() {
  const details: [string, string][] = [
    ['Operator', OPERATOR.name],
    ['Legal form', OPERATOR.legalForm],
    ['Address', OPERATOR.address],
    ['Email', OPERATOR.email],
    ['Company code', OPERATOR.companyNumber],
    ['VAT number', OPERATOR.vatNumber],
    ['Website', OPERATOR.siteUrl],
    ['Hosting', SERVICES.hosting],
  ]
  return (
    <LegalPage title="Business details">
      <Section id="operator" title="Who runs Bronze">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="font-display font-bold tracking-[0.08em] text-parchment-100 uppercase">{term}</dt>
              <dd className="mb-2 sm:mb-0">{term === 'Email' ? <Email value={value} /> : <Fill value={value} />}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-parchment-300">
          If the operator is not registered for VAT, the VAT line can be removed. Leave out any line that doesn’t apply.
        </p>
      </Section>

      <Section id="documents" title="Legal pages">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...LEGAL_LINKS.filter((l) => l.path !== PATHS.legal), { path: PATHS.credits, label: 'Credits and licences' }].map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className="flex min-h-11 items-center rounded-lg border border-bronze-500/30 bg-soot-950/50 px-3 font-semibold text-parchment-100 hover:border-bronze-300/60 hover:text-parchment-50"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function LegalNotice() {
  return <Localized page="LegalNotice" english={LegalNoticeEnglish} />
}
