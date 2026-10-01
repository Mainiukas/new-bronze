import { Localized } from './text/Localized'
import { Bullets, DataTable, Email, Fill, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { ACCOUNT_DATA, RECIPIENTS, VISITOR_DATA } from '../../legal/inventory'
import { MIN_ACCOUNT_AGE, OPERATOR, SERVICES } from '../../legal/operator'

const strong = 'text-parchment-50'

/** Privacy Policy, in plain words (a template for the operator to review). The tables come from legal/inventory.ts. */
function PrivacyPolicyEnglish() {
  const dataRows = (items: typeof ACCOUNT_DATA) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This page explains, in plain words, what Bronze knows about you, why, who else sees it, and what you can do about it.
        </p>
      }
    >
      <Section id="short" title="The short version">
        <Bullets>
          <li>You can play against the computer as a guest. Then nothing about you is sent to us.</li>
          <li>An account needs an email address, a password (or Google) and a username. Everything else is up to you.</li>
          <li>Online games keep every move, so games are fair and can be replayed.</li>
          <li>No ads, no analytics, no tracking. We never sell your data.</li>
          <li>
            You can download everything we have about you, or delete your account, at any time in <strong className={strong}>Settings → Account</strong>.
          </li>
        </Bullets>
      </Section>

      <Section id="controller" title="Who we are">
        <p>
          Bronze is run by <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />, company code{' '}
          <Fill value={OPERATOR.companyNumber} />. We decide how your data is used (we are the “controller”). Questions about your data:{' '}
          <Email value={OPERATOR.email} />. More in the <TextLink to={PATHS.legal}>business details</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Playing as a guest">
        <p>
          As a guest you play against the computer in your browser. Your match, settings and record stay in your browser’s storage (see the{' '}
          <TextLink to={PATHS.cookies}>Cookie Policy</TextLink>). Like every website, our host sees some technical data:
        </p>
        <DataTable caption="Data handled for every visitor" head={['What', 'Why', 'Legal reason', 'How long']} rows={dataRows(VISITOR_DATA)} />
      </Section>

      <Section id="account" title="What we keep when you have an account">
        <p>
          We keep only what Bronze needs. We never ask for your birth date, your address or your location. A bio, a country and a picture are
          optional.
        </p>
        <DataTable caption="Data handled for account holders" head={['What', 'Why', 'Legal reason', 'How long']} rows={dataRows(ACCOUNT_DATA)} />
        <p>
          “Legal reason” is the rule in the GDPR (the EU data protection law) that allows each use. “Contract” means we need it to give you the game
          you signed up for.
        </p>
      </Section>

      <Section id="online" title="Online play">
        <Bullets>
          <li>
            Every move in an online game is checked by our server and saved. The players of a game, and spectators of public games, see the board,
            the names and the moves. Nobody else sees your cards.
          </li>
          <li>Finished games can be replayed by their players, and public ones by anyone.</li>
          <li>
            Rated games change your rating. Your rating is on your profile, and once it is settled (after 10 rated games) it is on the leaderboard.
          </li>
          <li>Your friends can see when you’re online: that is, when your app talked to our server in the last 2 minutes.</li>
          <li>
            You choose who sees your profile and your game history in <strong className={strong}>Account settings → Privacy</strong>:{' '}
            <strong className={strong}>Public</strong> (anyone), <strong className={strong}>Friends only</strong> or{' '}
            <strong className={strong}>Private</strong> (only you). Your username and picture are always visible. Your email address never is.
            Accounts of players under 18 start as Friends only.
          </li>
        </Bullets>
      </Section>

      <Section id="recipients" title="Who else sees your data">
        <p>These companies help us run Bronze. They may only use your data to do that job for us (they are “processors”), except Google.</p>
        <DataTable
          caption="Recipients of personal data"
          head={['Who', 'Role', 'What', 'Where']}
          rows={RECIPIENTS.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <p>
          Supabase is an American company. Where your data leaves the European Economic Area, it is protected by{' '}
          <Fill value={SERVICES.transferSafeguards} />. You can ask us for a copy.
        </p>
      </Section>

      <Section id="rights" title="Your rights">
        <Bullets>
          <li>
            <strong className={strong}>See and take your data</strong>: <strong className={strong}>Settings → Account → Download my data</strong>{' '}
            gives you a file (JSON) with everything above: your account, profile, record, online games with your moves, ratings, friends and
            invites.
          </li>
          <li>
            <strong className={strong}>Delete it</strong>: <strong className={strong}>Settings → Account → Delete my account</strong>. You type
            your username to confirm, and everything is deleted at once. Online games you played stay for the other players, with “Deleted player”
            in your seat and no link to you. Backups are overwritten within <Fill value={SERVICES.backupRetention} />.
          </li>
          <li>
            <strong className={strong}>Correct it</strong>: in Account settings, or ask us.
          </li>
          <li>
            <strong className={strong}>Object or ask us to limit</strong> what we do with it, where we rely on “legitimate interest”.
          </li>
          <li>
            <strong className={strong}>Withdraw consent</strong> (for example to optional emails) in <strong className={strong}>Settings → Notifications</strong>.
          </li>
          <li>
            <strong className={strong}>Complain</strong> to the Lithuanian data protection authority, the State Data Protection Inspectorate
            (Valstybinė duomenų apsaugos inspekcija, <span lang="lt">L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200" rel="noopener">
              vdai.lrv.lt
            </a>
            ), or to the one where you live.
          </li>
        </Bullets>
        <p>
          Can’t log in? Use the <TextLink to={PATHS.dataRequest}>data request page</TextLink> or email <Email value={OPERATOR.email} />. We answer
          within 30 days. A hard request can take up to two more months; if so, we tell you why within the first month. We may ask you to confirm from
          your account’s email address, so nobody else gets your data.
        </p>
      </Section>

      <Section id="emails" title="Emails">
        <p>
          We send the emails your account needs: confirming your address, resetting your password, and a note when your password, email or
          two-factor settings change. Anything else (like news) only if you turn it on, and never to anyone under 18. Every optional email has a
          one-click unsubscribe link.
        </p>
      </Section>

      <Section id="children" title="Children">
        <p>
          Accounts are for people aged {MIN_ACCOUNT_AGE} and over ({MIN_ACCOUNT_AGE} is the age at which people in Lithuania can agree to online
          services themselves). Younger players can play as guests. We ask whether you are 14–17 or 18+, not your birth date. If we learn that an
          account belongs to someone under {MIN_ACCOUNT_AGE}, we delete it.
        </p>
      </Section>

      <Section id="security" title="Security">
        <p>
          Connections are encrypted (HTTPS). Passwords and recovery codes are stored only as hashes, which nobody can read. Each player can read only
          their own private data. Log-ins pause after 5 wrong passwords. You can turn on two-factor sign-in, see your recent sign-ins and sign out
          other devices in <strong className={strong}>Account settings → Security</strong>.
        </p>
      </Section>

      <Section id="changes" title="Changes">
        <p>When this policy changes, the date at the top changes. We tell you about important changes before they apply, in the game or by email.</p>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function PrivacyPolicy() {
  return <Localized page="PrivacyPolicy" english={PrivacyPolicyEnglish} />
}
