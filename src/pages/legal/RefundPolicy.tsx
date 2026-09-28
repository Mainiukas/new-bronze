import { Localized } from './text/Localized'
import { Email, LegalPage, Section } from '../../components/legal/LegalPage'
import { OPERATOR } from '../../legal/operator'

/**
 * Refund Policy. Bronze sells nothing for real money and has no in-game currency, so this is short.
 * Before any real-money sale, replace it with the EU 14-day withdrawal terms (see CHECKLIST.md, item 3).
 */
function RefundPolicyEnglish() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={
        <p>
          Bronze is free. There is nothing to buy with real money, and no in-game currency to buy or earn. The Shop is not open yet, so there is
          nothing to refund.
        </p>
      }
    >
      <Section id="future" title="If we start selling">
        <p>
          Before anything is sold, this page will set out your rights, including the EU 14-day right of withdrawal and how it applies to digital
          content, and the full price of every item will be shown before you pay.
        </p>
      </Section>
      <Section id="contact" title="Questions">
        <p>
          Email <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function RefundPolicy() {
  return <Localized page="RefundPolicy" english={RefundPolicyEnglish} />
}
