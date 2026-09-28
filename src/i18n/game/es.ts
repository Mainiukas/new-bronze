import type { GameMessageRenderers, MarketPlace, Payment } from '../../game/messages'
import type { GoodsKind, IndustryKind } from '../../game/types'
import { pluralizer } from '../languages'
import type { GameWords } from './en'

/* Las palabras del motor en español: registro de la partida, por qué una acción no está disponible, por qué se rechazó una jugada. */

const p = pluralizer('es-ES')

const goods: Record<GoodsKind, string> = { cotton: 'algodón', coal: 'carbón', iron: 'hierro' }
const industries: Record<IndustryKind, string> = {
  coal: 'Mina de carbón',
  iron: 'Fundición',
  cotton: 'Hilandería de algodón',
  port: 'Puerto',
  shipyard: 'Astillero',
}
const feminine: Record<IndustryKind, boolean> = { coal: true, iron: true, cotton: true, port: false, shipyard: false }
const lower = (kind: IndustryKind) => industries[kind].charAt(0).toLowerCase() + industries[kind].slice(1)
/** «una mina de carbón», «un puerto» */
const withArticle = (kind: IndustryKind) => `${feminine[kind] ? 'una' : 'un'} ${lower(kind)}`

const name = (raw: string) => {
  if (raw === 'You') return 'Tú'
  const player = /^Player (\d+)$/.exec(raw)
  return player ? `Jugador ${player[1]}` : raw
}

function payment(q: Payment): string {
  const parts = [`−£${q.money}`]
  if (q.coal) parts.push(`−${q.coal} carbón`)
  if (q.iron) parts.push(`−${q.iron} hierro`)
  return parts.join(', ')
}

function cost(c: Payment): string {
  const parts = [`£${c.money}`]
  if (c.coal) parts.push(`${c.coal} carbón`)
  if (c.iron) parts.push(`${c.iron} hierro`)
  return parts.join(' + ')
}

const market = (m: MarketPlace) => (m.port ? `puerto de ${m.town}` : m.town)
const route = (from: string, to: string) => `${from}–${to}`

const messages: GameMessageRenderers = {
  matchStart: (m) =>
    m.railRound !== null
      ? `Empieza la ronda 1 de ${m.rounds} en la era de los canales. La era del ferrocarril empieza en la ronda ${m.railRound}.`
      : `Empieza la ronda 1 de ${m.rounds}.`,
  built: (m) =>
    `${name(m.player)}: ${withArticle(m.industry)} ${feminine[m.industry] ? 'construida' : 'construido'} en ${m.town} (${payment(m.payment)}, +${m.prestige}★)`,
  linked: (m) =>
    `${name(m.player)}: ${m.kind === 'canal' ? 'canal' : 'vía férrea'} ${route(m.from, m.to)} ${m.kind === 'canal' ? 'excavado' : 'tendida'} (${payment(m.payment)}, +${m.prestige}★)`,
  shipped: (m) => {
    const extras = [
      ...m.tolls.map((toll) => `£${toll.amount} de peaje a ${name(toll.owner)}`),
      ...(m.fee ? [`£${m.fee.amount} de tasa portuaria a ${name(m.fee.owner)}`] : []),
    ].join(', ')
    const load = `${m.amount} ${goods[m.goods]}`
    const where = m.from === null ? `${load} vendido en ${market(m.market)}` : `${load} enviado de ${m.from} a ${market(m.market)}`
    return `${name(m.player)}: ${where} (+£${m.revenue}${extras ? `, ${extras}` : ''}, +${m.prestige}★)`
  },
  raisedFunds: (m) => `${name(m.player)}: fondos reunidos (+£${m.amount})`,
  timedOut: (m) => `${name(m.player)}: se acabó el tiempo (${p(m.lost, { one: `${m.lost} acción perdida`, other: `${m.lost} acciones perdidas` })})`,
  endedTurn: (m) => `${name(m.player)}: turno terminado ${m.early ? 'antes de tiempo' : 'sin actuar'}`,
  roundEnds: (m) => `Termina la ronda ${m.round}: las industrias producen y todos cobran £${m.income}.`,
  won: (m) => (m.winners.length > 1 ? `Victoria compartida: ${m.winners.map(name).join(' y ')}.` : `Victoria para ${name(m.winners[0])}.`),
  roundBegins: (m) => `Empieza la ronda ${m.round} de ${m.total}.`,
  railEra: (m) =>
    `Empieza la era del ferrocarril — los canales cierran${m.removed ? ` y se ${p(m.removed, { one: `retira ${m.removed} enlace de canal`, other: `retiran ${m.removed} enlaces de canal` })}` : ''}. Ya se pueden tender vías férreas.`,
  networkReset: (m) => `${name(m.player)}: sin red, puede volver a construir en cualquier sitio.`,

  notOnMap: () => 'No está en este mapa',
  plotsTaken: () => 'Todas las parcelas están ocupadas',
  opensInRail: () => 'Se abre en la era del ferrocarril',
  noPlotInNetwork: () => 'No hay parcela libre en tu red',
  needsMoney: (m) => `Necesita £${m.amount}`,
  noRoute: () => 'Ninguna ruta libre toca tu red',
  buildSourceFirst: () => 'Construye antes una hilandería, una mina o una fundición',
  nothingToShip: () => 'Todavía no hay nada que enviar',
  notReachable: () => 'Inalcanzable',
  cantAffordTolls: () => 'No alcanza para los peajes',

  cantPay: (m) => `Necesita £${m.amount}; tienes £${m.have}`,
  noPlots: (m) => `${m.town} no tiene parcelas`,
  noSuchPlot: (m) => `${m.town} no tiene la parcela ${m.plot}`,
  plotTaken: (m) => `Esa parcela de ${m.town} está ocupada`,
  wrongPlot: (m) => `No se puede construir ${withArticle(m.industry)} en esa parcela`,
  townOpensInRail: (m) => `${m.town} se abre en la era del ferrocarril`,
  notInNetwork: (m) => `${m.town} no está en tu red`,
  linkBuilt: (m) => `${route(m.from, m.to)} ya está construida`,
  linkNotInEra: (m) => `${route(m.from, m.to)} no existe en esta era`,
  linkOffNetwork: (m) => `${route(m.from, m.to)} no toca tu red`,
  matchOver: () => 'La partida ha terminado',
  pickSource: () => 'Elige una de tus hilanderías, minas o fundiciones',
  noCottonYet: (m) => `La ${lower(m.industry)} aún no tiene algodón`,
  storeEmpty: (m) => `Tu reserva de ${goods[m.goods]} está vacía`,
  portsOnlyBuy: (m) => `Los puertos solo compran ${goods[m.goods]}`,
  doesntBuy: (m) => `${m.town ?? 'Ese lugar'} no compra ${goods[m.goods]}`,
  unreachable: (m) => `${m.market.port ? `El puerto de ${m.market.town}` : m.market.town} no es accesible por los enlaces construidos`,
  cantAffordFees: (m) => `No puedes pagar las £${m.amount} de peajes y tasas`,
  unknownAction: () => 'Acción desconocida',
  internal: (m) => m.text,
}

const game: GameWords = { goods, industries, name, payment, cost, market, route, messages }

export default game
