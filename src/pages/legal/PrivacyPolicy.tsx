import { Localized } from './text/Localized'
import { Bullets, DataTable, Email, Fill, LegalPage, Section, Sub, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { ACCOUNT_DATA, RECIPIENTS, VISITOR_DATA } from '../../legal/inventory'
import { MIN_ACCOUNT_AGE, OPERATOR, SERVICES } from '../../legal/operator'

/** Privacy Policy (a template for the operator to review). Data, bases and recipients come from legal/inventory.ts. */
function PrivacyPolicyEnglish() {
  const dataRows = (items: typeof ACCOUNT_DATA) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Bronze is a strategy game you can play in your browser. You can play as a guest without giving us anything about you. This policy explains
          what we handle when you create an account, why, and your rights.
        </p>
      }
    >
      <Section id="controller" title="Who we are">
        <p>
          The controller of your personal data is <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />
          . Company code <Fill value={OPERATOR.companyNumber} />. For anything about your data, email <Email value={OPERATOR.email} />. See also our{' '}
          <TextLink to={PATHS.legal}>business details</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Playing as a guest">
        <p>
          As a guest, nothing about you is sent to us. Your matches are played in your browser, and what Bronze remembers (your match in progress, and,
          if you allow it, your settings and record) stays in your browser’s storage. See the <TextLink to={PATHS.cookies}>Cookie Policy</TextLink>{' '}
          for the full list. Our hosting provider still sees technical data every website receives:
        </p>
        <DataTable caption="Data handled for every visitor" head={['What', 'Why', 'Legal basis', 'How long']} rows={dataRows(VISITOR_DATA)} />
      </Section>

      <Section id="account" title="With an account">
        <p>
          An account is optional. It lets you keep your record and achievements across devices, and it will be needed for online play when that
          arrives. We collect only what the account needs, and never your birth date or your location. A bio, a country, an avatar picture, a phone
          number and a card check are all optional: we have them only if you add them.
        </p>
        <DataTable caption="Data handled for account holders" head={['What', 'Why', 'Legal basis', 'How long']} rows={dataRows(ACCOUNT_DATA)} />
        <Sub title="Your profile and who sees it">
          <p>
            Your profile has its own page. In Account settings → Privacy you choose who sees your profile, and separately your match history:{' '}
            <strong className="text-parchment-50">Public</strong> (anyone, including visitors who aren’t logged in),{' '}
            <strong className="text-parchment-50">Friends only</strong> (until Bronze has friends, only you) or{' '}
            <strong className="text-parchment-50">Private</strong> (only you). Your username and avatar are always visible, so other players can
            recognise you. Accounts of players under 18 start as Friends only. Your email address, phone number and card details are never shown to
            anyone.
          </p>
        </Sub>
        <Sub title="Card and phone checks">
          <p>
            If you verify a card, you type it into Stripe’s own form, which sends it straight to Stripe. Stripe checks the card without charging it; we
            receive only that the check passed, the card brand and its last 4 digits. Stripe keeps its own record of the check under{' '}
            <a href="https://stripe.com/privacy" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200" rel="noopener">
              its privacy policy
            </a>
            . If you verify a phone number, our SMS provider sends the code to it. You can remove a card verification any time in Account settings →
            Security.
          </p>
        </Sub>
        <p>
          When you delete your account, all of the above is deleted straight away, including any picture you uploaded. Copies can remain in database backups for up to{' '}
          <Fill value={SERVICES.backupRetention} /> until they are overwritten. If you start signing in with Google but don’t finish creating your account,
          choosing “Not now” deletes it at once; otherwise the unfinished sign-up is deleted after 7 days. So is an email sign-up that is never
          confirmed.
        </p>
        <p>
          We don’t sell your data, show you ads, profile you, or make decisions about you by automated means. Bronze has no analytics or tracking
          tools.
        </p>
      </Section>

      <Section id="emails" title="Emails">
        <p>
          We send account emails you need: confirming your address, resetting your password, and security notices when your password, email address,
          phone number or two-factor settings change or a card is verified. They contain nothing else. We would only send
          news or other optional emails if you turn them on, and never to anyone under 18. Bronze doesn’t send any optional emails yet. Every
          optional email will have a one-click unsubscribe link, and you can change your choices any time in Settings → Notifications.
        </p>
      </Section>

      <Section id="recipients" title="Who else handles your data">
        <DataTable
          caption="Recipients of personal data"
          head={['Who', 'Role', 'What', 'Where']}
          rows={RECIPIENTS.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <Sub title="Transfers outside the EEA">
          <p>
            Supabase, Inc. is based in the United States. Your account data is stored in the project region above; where it is accessed or transferred
            outside the European Economic Area, it is protected by <Fill value={SERVICES.transferSafeguards} />. Stripe and our SMS provider may also
            process data in the United States, protected by the safeguards in their own data protection terms (such as the EU–US Data Privacy
            Framework or the Standard Contractual Clauses). You can ask us for a copy of these safeguards.
          </p>
        </Sub>
      </Section>

      <Section id="rights" title="Your rights">
        <p>Under the GDPR you can:</p>
        <Bullets>
          <li>
            <strong className="text-parchment-50">access</strong> your data, and <strong className="text-parchment-50">take it with you</strong>{' '}
            (portability): Settings → Account → Download my data gives you a copy as a file;
          </li>
          <li>
            <strong className="text-parchment-50">correct</strong> it (rectification): change it in Account settings, or email us;
          </li>
          <li>
            <strong className="text-parchment-50">delete</strong> it (erasure): Settings → Account → Delete my account;
          </li>
          <li>
            <strong className="text-parchment-50">object</strong> to processing based on legitimate interest, or ask us to{' '}
            <strong className="text-parchment-50">restrict</strong> it;
          </li>
          <li>
            <strong className="text-parchment-50">withdraw consent</strong> any time, without affecting what came before: Cookie settings (in the
            footer) and Settings → Notifications;
          </li>
          <li>
            <strong className="text-parchment-50">complain</strong> to the Lithuanian data protection authority, the State Data Protection Inspectorate
            (Valstybinė duomenų apsaugos inspekcija, <span lang="lt">L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200" rel="noopener">
              vdai.lrv.lt
            </a>
            ), or to the authority where you live.
          </li>
        </Bullets>
        <p>
          If you can’t log in, use the <TextLink to={PATHS.dataRequest}>data request page</TextLink> or email <Email value={OPERATOR.email} />. We
          answer within 30 days (one month). For complex requests we may extend this by up to two more months, and we’ll tell you why within the
          first month. We may ask you to confirm the request from your account’s email address so that nobody else gets your data.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          Accounts are only for people aged {MIN_ACCOUNT_AGE} or over ({MIN_ACCOUNT_AGE} is the age at which people in Lithuania can consent to online
          services themselves under GDPR article 8). Younger players can play as guests, which stores nothing about them with us. When you register we
          ask whether you are 14–17 or 18 or over; we don’t ask for your birth date. We never send marketing to anyone under 18, and anyone under 18
          needs a parent’s or guardian’s permission for any purchase (Bronze sells nothing today). If we learn that an account belongs to someone under{' '}
          {MIN_ACCOUNT_AGE}, we delete it.
        </p>
      </Section>

      <Section id="security" title="Security">
        <p>
          Connections are encrypted (HTTPS). Passwords and recovery codes are stored only as hashes. Each player can read and change only their own
          private data; after 5 wrong passwords, log-ins for that username pause for 30 seconds, and passwords, codes and reports can only be tried a
          few times an hour. In Account settings → Security you can turn on two-factor authentication, see your recent sign-ins and sign out your
          other devices.
        </p>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <p>
          When we change this policy we update the date at the top. We’ll tell you about important changes before they take effect, in the game
          or by email.
        </p>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function PrivacyPolicy() {
  return <Localized page="PrivacyPolicy" english={PrivacyPolicyEnglish} />
}
