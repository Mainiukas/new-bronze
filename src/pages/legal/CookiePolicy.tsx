import { Bullets, DataTable, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { consentStore } from '../../legal/consent'
import { CATEGORIES, STORAGE_ITEMS } from '../../legal/inventory'

/** Cookie Policy: the table is generated from legal/inventory.ts, the same list the consent banner enforces. */
export function CookiePolicy() {
  const title = (id: string) => CATEGORIES.find((c) => c.id === id)!.title
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          Bronze uses one cookie and a few entries in your browser’s local and session storage. All of them are Bronze’s own: nothing is shared with
          other websites, and there are no advertising, analytics or social media trackers.
        </p>
      }
    >
      <Section id="categories" title="Categories">
        <Bullets>
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <strong className="text-parchment-50">{c.title}.</strong> {c.description}
            </li>
          ))}
        </Bullets>
        <p>
          Essential storage is needed for what you ask Bronze to do, so it doesn’t need your consent. Everything else waits for your consent: until
          you allow Preferences, your settings last only until you close the page.
        </p>
      </Section>

      <Section id="list" title="Everything Bronze stores">
        <DataTable
          caption="Cookies and storage used by Bronze"
          head={['Name', 'Type', 'Provider', 'Purpose', 'Category', 'Duration']}
          rows={STORAGE_ITEMS.map((item) => [<code key="k" className="font-mono text-[0.85em] break-all">{item.key}</code>, item.where, item.provider, item.purpose, title(item.category), item.duration])}
        />
      </Section>

      <Section id="choices" title="Your choices">
        <p>
          You can change your choices at any time with{' '}
          <button type="button" onClick={() => consentStore.reopen()} className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
            Cookie settings
          </button>{' '}
          (also in the footer of every page). Turning a category off deletes what it stored. You can also clear everything Bronze stored in Settings →
          Account, or through your browser. We ask again after 12 months, or sooner if this policy changes.
        </p>
        <p>
          More about your data: <TextLink to={PATHS.privacy}>Privacy Policy</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}
