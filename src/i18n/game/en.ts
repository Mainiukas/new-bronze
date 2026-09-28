import type { GameMessage, GameMessageRenderers, Payment } from '../../game/messages'
import type { GoodsKind, IndustryKind } from '../../game/types'
import { pluralizer } from '../languages'

/*
 * The engine's words in English: the match log, why an action is
 * unavailable, why a move was refused. The engine also stores this English
 * as each log entry's `text` (older saves have only that).
 */

const p = pluralizer('en-GB')

const goods: Record<GoodsKind, string> = { cotton: 'cotton', coal: 'coal', iron: 'iron' }
const industries: Record<IndustryKind, string> = {
  coal: 'Coal mine',
  iron: 'Iron works',
  cotton: 'Cotton mill',
  port: 'Port',
  shipyard: 'Shipyard',
}

/** "a Coal mine", "an Iron works" */
const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`

/** A seat's default name follows the language ("You", "Player 2"); typed names stay. */
function name(raw: string): string {
  if (raw === 'You') return 'You'
  const player = /^Player (\d+)$/.exec(raw)
  return player ? `Player ${player[1]}` : raw
}

/** "−£6, −1 iron" */
function payment(q: Payment): string {
  const parts = [`−£${q.money}`]
  if (q.coal) parts.push(`−${q.coal} coal`)
  if (q.iron) parts.push(`−${q.iron} iron`)
  return parts.join(', ')
}

/** "£6 + 1 iron" */
function cost(c: Payment): string {
  const parts = [`£${c.money}`]
  if (c.coal) parts.push(`${c.coal} coal`)
  if (c.iron) parts.push(`${c.iron} iron`)
  return parts.join(' + ')
}

const market = (m: { town: string; port: boolean }) => (m.port ? `${m.town} port` : m.town)
const route = (from: string, to: string) => `${from}–${to}`

const messages: GameMessageRenderers = {
  matchStart: (m) =>
    m.railRound !== null
      ? `Round 1 of ${m.rounds} begins in the canal era. The rail era begins in round ${m.railRound}.`
      : `Round 1 of ${m.rounds} begins.`,
  built: (m) => `${name(m.player)} built ${withArticle(industries[m.industry])} in ${m.town} (${payment(m.payment)}, +${m.prestige}★)`,
  linked: (m) =>
    `${name(m.player)} ${m.kind === 'canal' ? 'dug the' : 'laid the'} ${route(m.from, m.to)} ${m.kind === 'canal' ? 'canal' : 'railway'} (${payment(m.payment)}, +${m.prestige}★)`,
  shipped: (m) => {
    const extras = [
      ...m.tolls.map((toll) => `£${toll.amount} toll to ${name(toll.owner)}`),
      ...(m.fee ? [`£${m.fee.amount} port fee to ${name(m.fee.owner)}`] : []),
    ].join(', ')
    const load = `${m.amount} ${goods[m.goods]}`
    const where = m.from === null ? `sold ${load} at ${market(m.market)}` : `shipped ${load} from ${m.from} to ${market(m.market)}`
    return `${name(m.player)} ${where} (+£${m.revenue}${extras ? `, ${extras}` : ''}, +${m.prestige}★)`
  },
  raisedFunds: (m) => `${name(m.player)} raised funds (+£${m.amount})`,
  timedOut: (m) => `${name(m.player)} ran out of time (${p(m.lost, { one: `${m.lost} action`, other: `${m.lost} actions` })} lost)`,
  endedTurn: (m) => `${name(m.player)} ended the turn${m.early ? ' early' : ' without acting'}`,
  roundEnds: (m) => `Round ${m.round} ends: industries produce and everyone collects £${m.income}.`,
  won: (m) => (m.winners.length > 1 ? `Shared victory: ${m.winners.map(name).join(' and ')}.` : `${name(m.winners[0])} won the match.`),
  roundBegins: (m) => `Round ${m.round} of ${m.total} begins.`,
  railEra: (m) =>
    `The Rail Era begins — the canals close${m.removed ? ` and ${p(m.removed, { one: `${m.removed} canal link is`, other: `${m.removed} canal links are` })} removed` : ''}. Railways can now be laid.`,
  networkReset: (m) => `${name(m.player)} has no network left and may build anywhere again.`,

  notOnMap: () => 'Not on this map',
  plotsTaken: () => 'Every plot is taken',
  opensInRail: () => 'Opens in the rail era',
  noPlotInNetwork: () => 'No free plot in your network',
  needsMoney: (m) => `Needs £${m.amount}`,
  noRoute: () => 'No free route touches your network',
  buildSourceFirst: () => 'Build a mill, mine or iron works first',
  nothingToShip: () => 'Nothing to ship yet',
  notReachable: () => 'Not reachable',
  cantAffordTolls: () => 'Can’t afford the tolls',

  cantPay: (m) => `Needs £${m.amount}; you have £${m.have}`,
  noPlots: (m) => `${m.town} has no building plots`,
  noSuchPlot: (m) => `${m.town} has no plot ${m.plot}`,
  plotTaken: (m) => `That plot in ${m.town} is taken`,
  wrongPlot: (m) => `${withArticle(industries[m.industry]).replace(/^a/, 'A')} can’t be built on that plot`,
  townOpensInRail: (m) => `${m.town} opens in the rail era`,
  notInNetwork: (m) => `${m.town} isn’t in your network`,
  linkBuilt: (m) => `${route(m.from, m.to)} is already built`,
  linkNotInEra: (m) => `${route(m.from, m.to)} doesn’t exist in the ${m.era} era`,
  linkOffNetwork: (m) => `${route(m.from, m.to)} doesn’t touch your network`,
  matchOver: () => 'The match is over',
  pickSource: () => 'Pick one of your mills, coal mines or iron works',
  noCottonYet: (m) => `The ${industries[m.industry]} has no cotton yet`,
  storeEmpty: (m) => `Your ${goods[m.goods]} store is empty`,
  portsOnlyBuy: (m) => `Ports only buy ${goods[m.goods]}`,
  doesntBuy: (m) => `${m.town ?? 'That place'} doesn’t buy ${goods[m.goods]}`,
  unreachable: (m) => `${market(m.market)} isn’t reachable over built links`,
  cantAffordFees: (m) => `You can’t afford the £${m.amount} in tolls and fees`,
  unknownAction: () => 'Unknown action',
  internal: (m) => m.text,
}

const game = {
  goods,
  industries,
  name,
  payment,
  cost,
  market,
  route,
  messages,
}

export type GameWords = typeof game

/** A message in this language. */
export const renderWith = (words: GameWords, message: GameMessage): string =>
  (words.messages[message.key] as (m: GameMessage) => string)(message)

/** A message in English (the engine's log text and error messages). */
export const english = (message: GameMessage) => renderWith(game, message)

export default game
