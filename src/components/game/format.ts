import { getRoute, getTown, type ShipQuote } from '../../game/engine'
import type { GameState } from '../../game/types'
import type { Messages } from '../../i18n'

/** "+£16 · +6★" */
export const payoutLabel = (q: ShipQuote) => `${q.net >= 0 ? '+' : '−'}£${Math.abs(q.net)} · +${q.prestige}★`

/** Where a shipment goes, in the player's language: "Bristol", "Gloucester port". */
export const marketLabel = (t: Messages, game: GameState, q: ShipQuote) =>
  t.game.market({ town: q.portOwner === null ? q.marketName : getTown(game, q.marketTownId).name, port: q.portOwner !== null })

/** "Birmingham–Oxford" */
export const routeLabel = (t: Messages, game: GameState, routeId: string) => {
  const route = getRoute(game, routeId)
  return t.game.route(getTown(game, route.from).name, getTown(game, route.to).name)
}
