/**
 * The draw deck and the discard pile, outside the board frame:
 * - the deck: a face-down stack with the cards left in the middle; the train
 *   ("rail era coming") once the canal deck is used up, with the cards still
 *   in hands; the no-loan coin once no more loans can be taken;
 * - the discard pile: smaller, face up (the last card played), slightly
 *   turned, labelled; its tooltip names the card and who played it, and
 *   clicking it lists the cards played this round.
 */

import { useId, useState } from 'react'
import { useT } from '../../i18n'
import type { Card, GameState } from '../../rules/state'
import { Dialog } from '../Dialog'
import { CARD_BACK_URL, DECK_TRAIN_URL, DECK_URL, NO_LOAN_URL, cardArt, deckMode } from './cardArt'

export function DeckIndicator({ state }: { state: GameState }) {
  const t = useT()
  const b = t.brass
  const mode = deckMode(state)
  const inHands = state.players.reduce((n, p) => n + p.hand.length, 0)
  const tip = mode === 'train' ? b.deckTrain(inHands) : mode === 'last-loans' ? b.lastLoanRound : mode === 'no-loans' ? `${b.noMoreLoans} (${b.deckCount(state.deck.length)})` : b.deckCount(state.deck.length)
  return (
    <div id="deck-pile" role="img" aria-label={tip} title={tip} className="relative w-14 shrink-0">
      {mode === 'train' ? (
        <>
          <img src={DECK_TRAIN_URL} alt="" className="mt-2 w-full" />
          <span className="mx-auto mt-1 block w-fit rounded-full border border-brass-300/60 bg-soot-950 px-1.5 font-display text-xs font-bold text-parchment-50 tabular-nums">{inHands}</span>
        </>
      ) : (
        <>
          <img src={DECK_URL} alt="" className="w-full" />
          <span className="absolute top-[49.3%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-lg font-extrabold text-parchment-50 tabular-nums">{state.deck.length}</span>
          {mode !== 'deck' && <img src={NO_LOAN_URL} alt="" className={`absolute -right-2 -bottom-1 drop-shadow-[0_2px_3px_rgb(0_0_0/0.8)] ${mode === 'no-loans' ? 'size-8' : 'size-6'}`} />}
        </>
      )}
    </div>
  )
}

/** The cards played this round: [player, card], oldest first. */
function playedThisRound(state: GameState): { player: number; card: Card }[] {
  const start = state.log.findLastIndex((e) => e.kind === 'round' || e.kind === 'deal')
  const byId = new Map(state.discard.map((c) => [c.id, c]))
  return state.log.slice(start + 1).flatMap((e) => (e.kind === 'discard' ? e.cards.flatMap((id) => (byId.has(id) ? [{ player: e.player, card: byId.get(id)! }] : [])) : []))
}

export function DiscardPile({ state, cardName }: { state: GameState; cardName: (card: Card) => string }) {
  const t = useT()
  const b = t.brass
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const top = state.discard.at(-1)
  const lastPlay = [...state.log].reverse().find((e) => e.kind === 'discard' && e.cards.length)
  const tip = top && lastPlay?.kind === 'discard' ? b.lastCard(cardName(top), state.players[lastPlay.player].name) : b.discardEmpty
  const played = open ? playedThisRound(state) : []
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button id="discard-pile" type="button" onClick={() => setOpen(true)} title={tip} aria-label={`${b.discard}: ${tip}`} className="relative aspect-[5/7] w-10 -rotate-6 rounded-[7%] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-200">
        {state.discard.length > 1 && <img src={CARD_BACK_URL} alt="" className="absolute inset-0 size-full translate-x-1 translate-y-0.5 rotate-6 rounded-[7%] object-cover opacity-60" />}
        {top ? <img src={cardArt(top)} alt="" className="relative size-full rounded-[7%] object-cover shadow-md" /> : <span className="block size-full rounded-[7%] border border-dashed border-bronze-400/50" />}
      </button>
      <span className="font-display text-[0.6rem] font-bold tracking-[0.12em] text-parchment-300 uppercase">{b.discard}</span>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <div className="plate rivets flex max-w-lg flex-col gap-3 bg-soot-900/[0.98] p-5">
          <h2 id={titleId} className="font-display text-lg font-extrabold tracking-[0.06em] text-parchment-50">
            {b.playedThisRound}
          </h2>
          {played.length === 0 ? (
            <p className="text-sm text-parchment-300">{b.nothingPlayed}</p>
          ) : (
            <ol className="flex flex-wrap gap-2">
              {played.map(({ player, card }) => (
                <li key={card.id} className="flex w-20 flex-col items-center gap-1 text-center">
                  <img src={cardArt(card)} alt="" className="aspect-[5/7] w-full rounded-[7%] object-cover shadow" />
                  <span className="text-[0.7rem] leading-tight text-parchment-100">{cardName(card)}</span>
                  <span className="text-[0.65rem] leading-tight text-parchment-400">{state.players[player].name}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {b.close}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
