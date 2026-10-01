import { CardImage } from '../components/brass/Cards'
import { useT } from '../i18n'
import { buildDeck, faceOf } from '../rules/config/cards'
import { BRASS_MAP } from '../rules/map'
import type { Card } from '../rules/state'

/** One card of each kind (19 towns, 5 industries), in deck order. */
const FACES: Card[] = buildDeck(BRASS_MAP, 4).filter((card, i, deck) => deck.findIndex((c) => faceOf(c) === faceOf(card)) === i)

/** The sizes cards are drawn at: the hand at 1440 × 900 and 1920 × 1080, and the large hover view (2.5×). */
const SIZES = [
  { width: 108, label: 'Hand at 1440 × 900' },
  { width: 130, label: 'Hand at 1920 × 1080' },
  { width: 325, label: 'Large view (2.5×)' },
]

/**
 * A test page (not linked from the menus): every card type at every size it's
 * drawn at, to check the names on the ribbons (two lines for names of several
 * words, single words shrunk to fit, nothing overflowing).
 */
export function CardSheet() {
  const b = useT().brass
  const name = (card: Card) => (card.kind === 'location' ? (BRASS_MAP.places[card.town]?.name ?? card.town) : b.industry[card.industry])
  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-8 px-4 py-6" data-testid="card-sheet">
      <h1 className="font-display text-2xl font-extrabold tracking-[0.08em] text-parchment-50 uppercase">All cards ({FACES.length})</h1>
      {SIZES.map(({ width, label }) => (
        <section key={width} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-brass-200 uppercase">
            {label} · {width} px
          </h2>
          <ul className="flex flex-wrap gap-3">
            {FACES.map((card) => (
              <li key={faceOf(card)} style={{ width }} title={name(card)}>
                <CardImage card={card} label={name(card)} width={width} compact={width < 200} className="aspect-[5/7] w-full" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
