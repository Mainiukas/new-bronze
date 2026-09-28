import type { GameMessageRenderers, MarketPlace, Payment } from '../../game/messages'
import type { GoodsKind, IndustryKind } from '../../game/types'
import { pluralizer } from '../languages'
import type { GameWords } from './en'

/* Les mots du moteur en français : journal de partie, pourquoi une action est impossible, pourquoi un coup est refusé. */

const p = pluralizer('fr-FR')

const goods: Record<GoodsKind, string> = { cotton: 'coton', coal: 'charbon', iron: 'fer' }
const industries: Record<IndustryKind, string> = {
  coal: 'Mine de charbon',
  iron: 'Fonderie',
  cotton: 'Filature de coton',
  port: 'Port',
  shipyard: 'Chantier naval',
}
const feminine: Record<IndustryKind, boolean> = { coal: true, iron: true, cotton: true, port: false, shipyard: false }
const lower = (kind: IndustryKind) => industries[kind].charAt(0).toLowerCase() + industries[kind].slice(1)
/** « une mine de charbon », « un port » */
const withArticle = (kind: IndustryKind) => `${feminine[kind] ? 'une' : 'un'} ${lower(kind)}`
/** « du charbon », « du fer », « du coton » */
const partitive = (kind: GoodsKind) => `du ${goods[kind]}`

const name = (raw: string) => {
  if (raw === 'You') return 'Vous'
  const player = /^Player (\d+)$/.exec(raw)
  return player ? `Joueur ${player[1]}` : raw
}

function payment(q: Payment): string {
  const parts = [`−£${q.money}`]
  if (q.coal) parts.push(`−${q.coal} charbon`)
  if (q.iron) parts.push(`−${q.iron} fer`)
  return parts.join(', ')
}

function cost(c: Payment): string {
  const parts = [`£${c.money}`]
  if (c.coal) parts.push(`${c.coal} charbon`)
  if (c.iron) parts.push(`${c.iron} fer`)
  return parts.join(' + ')
}

const market = (m: MarketPlace) => (m.port ? `port de ${m.town}` : m.town)
const route = (from: string, to: string) => `${from}–${to}`

const messages: GameMessageRenderers = {
  matchStart: (m) =>
    m.railRound !== null
      ? `La manche 1 sur ${m.rounds} commence à l’ère des canaux. L’ère du rail commence à la manche ${m.railRound}.`
      : `La manche 1 sur ${m.rounds} commence.`,
  built: (m) =>
    `${name(m.player)} : ${withArticle(m.industry)} ${feminine[m.industry] ? 'construite' : 'construit'} à ${m.town} (${payment(m.payment)}, +${m.prestige}★)`,
  linked: (m) =>
    `${name(m.player)} : ${m.kind === 'canal' ? 'canal' : 'voie ferrée'} ${route(m.from, m.to)} ${m.kind === 'canal' ? 'creusé' : 'posée'} (${payment(m.payment)}, +${m.prestige}★)`,
  shipped: (m) => {
    const extras = [
      ...m.tolls.map((toll) => `£${toll.amount} de péage à ${name(toll.owner)}`),
      ...(m.fee ? [`£${m.fee.amount} de droits de port à ${name(m.fee.owner)}`] : []),
    ].join(', ')
    const load = `${m.amount} ${goods[m.goods]}`
    const where = m.from === null ? `${load} vendu à ${market(m.market)}` : `${load} expédié de ${m.from} à ${market(m.market)}`
    return `${name(m.player)} : ${where} (+£${m.revenue}${extras ? `, ${extras}` : ''}, +${m.prestige}★)`
  },
  raisedFunds: (m) => `${name(m.player)} : fonds levés (+£${m.amount})`,
  timedOut: (m) => `${name(m.player)} : temps écoulé (${p(m.lost, { one: `${m.lost} action perdue`, other: `${m.lost} actions perdues` })})`,
  endedTurn: (m) => `${name(m.player)} : tour terminé ${m.early ? 'plus tôt' : 'sans agir'}`,
  roundEnds: (m) => `Fin de la manche ${m.round} : les industries produisent et chacun reçoit £${m.income}.`,
  won: (m) => (m.winners.length > 1 ? `Victoire partagée : ${m.winners.map(name).join(' et ')}.` : `Victoire : ${name(m.winners[0])}.`),
  roundBegins: (m) => `La manche ${m.round} sur ${m.total} commence.`,
  railEra: (m) =>
    `L’ère du rail commence — les canaux ferment${m.removed ? ` et ${p(m.removed, { one: `${m.removed} liaison fluviale est retirée`, other: `${m.removed} liaisons fluviales sont retirées` })}` : ''}. On peut désormais poser des voies ferrées.`,
  networkReset: (m) => `${name(m.player)} : plus de réseau, peut de nouveau construire n’importe où.`,

  notOnMap: () => 'Absent de cette carte',
  plotsTaken: () => 'Tous les emplacements sont pris',
  opensInRail: () => 'Ouvre à l’ère du rail',
  noPlotInNetwork: () => 'Aucun emplacement libre dans votre réseau',
  needsMoney: (m) => `Il faut £${m.amount}`,
  noRoute: () => 'Aucune liaison libre ne touche votre réseau',
  buildSourceFirst: () => 'Construisez d’abord une filature, une mine ou une fonderie',
  nothingToShip: () => 'Rien à expédier pour l’instant',
  notReachable: () => 'Inaccessible',
  cantAffordTolls: () => 'Péages trop chers',

  cantPay: (m) => `Il faut £${m.amount} ; vous avez £${m.have}`,
  noPlots: (m) => `${m.town} n’a pas d’emplacement`,
  noSuchPlot: (m) => `${m.town} n’a pas d’emplacement ${m.plot}`,
  plotTaken: (m) => `Cet emplacement de ${m.town} est pris`,
  wrongPlot: (m) => `Impossible de construire ${withArticle(m.industry)} sur cet emplacement`,
  townOpensInRail: (m) => `${m.town} ouvre à l’ère du rail`,
  notInNetwork: (m) => `${m.town} n’est pas dans votre réseau`,
  linkBuilt: (m) => `${route(m.from, m.to)} est déjà construite`,
  linkNotInEra: (m) => `${route(m.from, m.to)} n’existe pas à cette ère`,
  linkOffNetwork: (m) => `${route(m.from, m.to)} ne touche pas votre réseau`,
  matchOver: () => 'La partie est terminée',
  pickSource: () => 'Choisissez une de vos filatures, mines ou fonderies',
  noCottonYet: (m) => `La ${lower(m.industry)} n’a pas encore de coton`,
  storeEmpty: (m) => `Votre réserve de ${goods[m.goods]} est vide`,
  portsOnlyBuy: (m) => `Les ports n’achètent que ${partitive(m.goods)}`,
  doesntBuy: (m) => `${m.town ?? 'Ce lieu'} n’achète pas de ${goods[m.goods]}`,
  unreachable: (m) => `${market(m.market).replace(/^port/, 'Le port')} n’est pas accessible par les liaisons construites`,
  cantAffordFees: (m) => `Vous ne pouvez pas payer les £${m.amount} de péages et de droits`,
  unknownAction: () => 'Action inconnue',
  internal: (m) => m.text,
}

const game: GameWords = { goods, industries, name, payment, cost, market, route, messages }

export default game
