/**
 * The deck and discard pile, top-left of the board:
 * - the draw deck with the number of cards left in the middle;
 * - canal era, deck used up: the train ("rail era coming") with the cards
 *   still in hands;
 * - rail era, once the draw reaches the Rothschild marker: the no-loan coin
 *   on the deck (the last round to take a loan), and once the deck is empty,
 *   no more loans.
 */

import { useT } from '../../i18n'
import type { GameState } from '../../rules/state'
import { CARD_BACK_URL, DECK_TRAIN_URL, DECK_URL, NO_LOAN_URL, cardArt, deckMode } from './cardArt'

export function DeckIndicator({ state }: { state: GameState }) {
  const t = useT()
  const b = t.brass
  const mode = deckMode(state)
  const inHands = state.players.reduce((n, p) => n + p.hand.length, 0)
  const tip = mode === 'train' ? b.deckTrain(inHands) : mode === 'last-loans' ? b.lastLoanRound : mode === 'no-loans' ? b.errors['no-more-loans'] : b.deckCount(state.deck.length)
  const top = state.discard.at(-1)
  return (
    <div className="flex items-start gap-1.5 rounded-lg border border-bronze-500/40 bg-soot-950/75 p-1.5 shadow-lg backdrop-blur-[2px]">
      <div id="deck-pile" role="img" aria-label={tip} title={tip} className="relative w-12 sm:w-14">
        {mode === 'train' ? (
          <>
            <img src={DECK_TRAIN_URL} alt="" className="mt-1 w-full" />
            <span className="mx-auto mt-0.5 block w-fit rounded-full border border-brass-300/60 bg-soot-950 px-1.5 font-display text-xs font-bold text-parchment-50 tabular-nums">
              {inHands}
            </span>
          </>
        ) : (
          <>
            <img src={DECK_URL} alt="" className="w-full" />
            <span className="absolute top-[49.3%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-base font-extrabold text-parchment-50 tabular-nums sm:text-lg">{state.deck.length}</span>
            {mode !== 'deck' && <img src={NO_LOAN_URL} alt="" className={`absolute -right-2 -bottom-1 drop-shadow-[0_2px_3px_rgb(0_0_0/0.8)] ${mode === 'no-loans' ? 'size-8' : 'size-6 animate-[pulse-border_1.6s_ease-in-out_infinite] rounded-full'}`} />}
          </>
        )}
      </div>
      <div id="discard-pile" role="img" aria-label={b.discardPile(state.discard.length)} title={b.discardPile(state.discard.length)} className="relative mt-1 aspect-[5/7] w-9 sm:w-10">
        {top ? (
          <img src={cardArt(top)} alt="" className="size-full rounded-[7%] object-cover shadow-md" />
        ) : (
          <span className="block size-full rounded-[7%] border border-dashed border-bronze-400/50" />
        )}
        {state.discard.length > 1 && <img src={CARD_BACK_URL} alt="" className="absolute inset-0 -z-10 size-full translate-x-0.5 translate-y-0.5 rounded-[7%] object-cover opacity-70" />}
      </div>
    </div>
  )
}
