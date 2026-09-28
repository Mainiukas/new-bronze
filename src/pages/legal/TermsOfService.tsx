import { Localized } from './text/Localized'
import { Bullets, Email, Fill, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { MIN_ACCOUNT_AGE, OPERATOR } from '../../legal/operator'

/** Terms of Service (a template for the operator to review). */
function TermsOfServiceEnglish() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms are the agreement between you and <Fill value={OPERATOR.name} /> (“we”) for using Bronze. By creating an account, you accept
          them. Playing as a guest only needs the parts about fair play and the game being provided as it is.
        </p>
      }
    >
      <Section id="eligibility" title="Who can play">
        <p>
          Anyone can play as a guest. To create an account you must be at least {MIN_ACCOUNT_AGE}. If you are under 18, a parent or guardian must agree
          before you buy anything (Bronze sells nothing today).
        </p>
      </Section>

      <Section id="accounts" title="Your account">
        <Bullets>
          <li>One account per person. Give a real email address you can reach, and keep your password to yourself.</li>
          <li>You are responsible for what happens on your account, unless someone else got in through no fault of yours.</li>
          <li>You can delete your account whenever you like, in Settings → Account.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Usernames">
        <p>
          Usernames are 3–20 letters, numbers and underscores, and other players can see them. Don’t pick one that pretends to be someone else,
          insults or harasses anyone, is hateful or sexual, or advertises something. We may ask you to change a username that breaks these rules, or
          change it ourselves if you don’t.
        </p>
      </Section>

      <Section id="fair-play" title="Fair play">
        <p>Play the game as it’s meant to be played. Don’t:</p>
        <Bullets>
          <li>cheat, use bots or scripts that play for you, or exploit bugs (tell us about them instead);</li>
          <li>interfere with the service, other players’ accounts, or the servers;</li>
          <li>harass, threaten or abuse other players, or share anything illegal.</li>
        </Bullets>
      </Section>

      <Section id="virtual-items" title="Virtual items and currency">
        <p>
          Bronze has no virtual items or in-game currency today. If it offers them later: they are a licence to use them in Bronze, not property; they
          have no real-world value, can’t be exchanged for money, and can’t be sold or transferred to another account. Your rights as a consumer to
          anything you paid for are not affected (see the <TextLink to={PATHS.refunds}>Refund Policy</TextLink>).
        </p>
      </Section>

      <Section id="content" title="The game and its content">
        <p>
          Bronze, its art, maps and code belong to <Fill value={OPERATOR.name} /> or its licensors (see <TextLink to={PATHS.credits}>Credits</TextLink>
          ). You may play it for your own, non-commercial use.
        </p>
      </Section>

      <Section id="termination" title="Suspension and closing accounts">
        <p>
          If you seriously or repeatedly break these terms, we may suspend or close your account. Unless it would be unsafe or unlawful, we’ll tell you
          why first and give you a chance to respond. You can close your account at any time.
        </p>
      </Section>

      <Section id="disclaimers" title="Availability">
        <p>
          Bronze is an early version. We work to keep it running and your data safe, but features can change, and the service can be unavailable or
          have bugs. Guest progress is kept only in your browser: clearing your browser’s data removes it.
        </p>
      </Section>

      <Section id="liability" title="Liability">
        <p>
          Bronze is free. We are not liable for indirect losses, or for losses you could have avoided. Nothing in these terms limits liability for
          death or personal injury caused by negligence, for fraud, for intentional or grossly negligent harm, or any liability that the law doesn’t
          allow us to limit. Your statutory rights as a consumer are not affected.
        </p>
      </Section>

      <Section id="law" title="Law and disputes">
        <p>
          These terms are governed by the law of the Republic of Lithuania. If you are a consumer living in the EU, you also keep the protection of
          the mandatory consumer laws of the country where you live, and you can bring a claim in the courts there.
        </p>
        <p>
          Please contact us first at <Email value={OPERATOR.email} />. Consumers can also turn to the State Consumer Rights Protection Authority
          (Valstybinė vartotojų teisių apsaugos tarnyba,{' '}
          <a href="https://vvtat.lrv.lt" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200" rel="noopener">
            vvtat.lrv.lt
          </a>
          ), which settles consumer disputes out of court.
        </p>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <p>
          We may update these terms, for example when new features arrive. We’ll tell you about important changes before they take effect, in the game
          or by email. If you don’t agree, you can delete your account; otherwise the new terms apply from their date.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <p>
          <Fill value={OPERATOR.name} />, <Fill value={OPERATOR.address} />, <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function TermsOfService() {
  return <Localized page="TermsOfService" english={TermsOfServiceEnglish} />
}
