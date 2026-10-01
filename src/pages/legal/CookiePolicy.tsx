import { Localized } from './text/Localized'
import { DataTable, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { STORAGE_ITEMS } from '../../legal/inventory'

/** Cookie Policy: the table is generated from legal/inventory.ts, which a test checks against the code. */
function CookiePolicyEnglish() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          Bronze uses one cookie and a few entries in your browser’s storage, and only for what Bronze needs to work. They are all Bronze’s own:
          nothing is shared with other websites, and there are no ads, analytics or social media trackers.
        </p>
      }
    >
      <Section id="essential" title="Only what’s needed">
        <p>
          Everything below is essential: it keeps you logged in, keeps your match in progress, and remembers the settings and picks you make.
          The law doesn’t ask for your consent to this kind of storage, so Bronze shows a notice once instead of asking you to accept or reject.
        </p>
      </Section>

      <Section id="list" title="Everything Bronze stores">
        <DataTable
          caption="Cookies and storage used by Bronze"
          head={['Name', 'Type', 'Provider', 'Purpose', 'How long']}
          rows={STORAGE_ITEMS.map((item) => [<code key="k" className="font-mono text-[0.85em] break-all">{item.key}</code>, item.where, item.provider, item.purpose, item.duration])}
        />
      </Section>

      <Section id="choices" title="Removing it">
        <p>
          You can remove everything Bronze stored in this browser with Settings → Account → Clear this device, or through your browser’s settings.
          You’ll be logged out, and your guest progress is lost.
        </p>
        <p>
          More about your data: <TextLink to={PATHS.privacy}>Privacy Policy</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function CookiePolicy() {
  return <Localized page="CookiePolicy" english={CookiePolicyEnglish} />
}
