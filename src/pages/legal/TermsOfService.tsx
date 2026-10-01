import { Localized } from './text/Localized'
import { Bullets, Email, Fill, LegalPage, Section, TextLink } from '../../components/legal/LegalPage'
import { PATHS } from '../../data/navigation'
import { MIN_ACCOUNT_AGE, OPERATOR } from '../../legal/operator'

/** Terms of Service, in plain words (a template for the operator to review). */
function TermsOfServiceEnglish() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These are the rules for using Bronze. They are an agreement between you and <Fill value={OPERATOR.name} /> (“we”). By creating an
          account, you accept them. As a guest, only the parts about fair play and the game being “as it is” apply.
        </p>
      }
    >
      <Section id="fan-made" title="A fan-made game">
        <p>
          Bronze is a fan-made game inspired by Brass. It is not affiliated with, or endorsed by, Roxley Games or the designers of Brass. Bronze is
          free: there is nothing to buy, and no in-game money.
        </p>
      </Section>

      <Section id="eligibility" title="Who can play">
        <p>Anyone can play against the computer as a guest. For an account, and for online play, you must be {MIN_ACCOUNT_AGE} or older.</p>
      </Section>

      <Section id="accounts" title="Your account">
        <Bullets>
          <li>One account per person. Use an email address you can reach, and keep your password to yourself.</li>
          <li>You are responsible for what happens on your account, unless someone got in through no fault of yours.</li>
          <li>You can delete your account at any time in Settings → Account.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Usernames">
        <p>
          Usernames are 3–20 letters, numbers and underscores, and everyone can see them. Don’t choose one that pretends to be someone else,
          insults anyone, is hateful or sexual, or advertises something. If yours breaks these rules, we may ask you to change it, or change it
          ourselves.
        </p>
      </Section>

      <Section id="fair-play" title="Fair play">
        <p>Play fair and be kind. Don’t:</p>
        <Bullets>
          <li>cheat, let a program play for you in online games, or use bugs to win (tell us about them instead);</li>
          <li>leave games on purpose to avoid losing, or play several accounts in one game;</li>
          <li>attack the service, other players’ accounts or our servers;</li>
          <li>harass, threaten or insult other players, or share anything illegal.</li>
        </Bullets>
        <p>
          A player who leaves a started online game forfeits it: a bot finishes their seat and they come last. You can report a player from their
          profile.
        </p>
      </Section>

      <Section id="content" title="The game">
        <p>
          The Bronze app, its art, maps and code belong to <Fill value={OPERATOR.name} /> or to the people who made them (see{' '}
          <TextLink to={PATHS.credits}>Credits</TextLink>). You may play it for your own, non-commercial fun.
        </p>
      </Section>

      <Section id="termination" title="If you break these rules">
        <p>
          If you break these rules badly or again and again, we may suspend or close your account. Unless that would be unsafe or against the law,
          we tell you why first and let you reply.
        </p>
      </Section>

      <Section id="disclaimers" title="The game “as it is”">
        <p>
          Bronze is an early version. We work to keep it running and your data safe, but features can change, and it can be down or have bugs.
          Ratings and results can be corrected if a bug or cheating affected them. Guest progress lives only in your browser: clearing your
          browser’s data removes it.
        </p>
      </Section>

      <Section id="liability" title="Liability">
        <p>
          Bronze is free. We are not responsible for indirect losses, or for losses you could have avoided. This never limits our responsibility
          for death or injury caused by negligence, for fraud, for harm we cause on purpose or by gross negligence, or anything else the law does
          not let us limit. Your rights as a consumer stay as they are.
        </p>
      </Section>

      <Section id="law" title="Law and disputes">
        <p>
          Lithuanian law applies to these terms. If you are a consumer living in the EU, the consumer laws of your country still protect you, and
          you can go to court there.
        </p>
        <p>
          Please talk to us first: <Email value={OPERATOR.email} />. Consumers can also ask the State Consumer Rights Protection Authority
          (Valstybinė vartotojų teisių apsaugos tarnyba,{' '}
          <a href="https://vvtat.lrv.lt" className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200" rel="noopener">
            vvtat.lrv.lt
          </a>
          ) to help settle a dispute out of court.
        </p>
      </Section>

      <Section id="changes" title="Changes">
        <p>
          We may update these terms, for example when new features arrive. We tell you about important changes before they apply, in the game or
          by email. If you don’t agree, you can delete your account.
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
