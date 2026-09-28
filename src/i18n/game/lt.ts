import type { GameMessageRenderers, MarketPlace, Payment } from '../../game/messages'
import type { GoodsKind, IndustryKind } from '../../game/types'
import { pluralizer } from '../languages'
import type { GameWords } from './en'

/* Variklio žodžiai lietuviškai: partijos žurnalas, kodėl veiksmas negalimas, kodėl ėjimas atmestas. */

const p = pluralizer('lt-LT')

const goods: Record<GoodsKind, string> = { cotton: 'medvilnė', coal: 'anglis', iron: 'geležis' }
/** Kilmininkas: „3 vnt. anglies“. */
const goodsOf: Record<GoodsKind, string> = { cotton: 'medvilnės', coal: 'anglies', iron: 'geležies' }
/** Galininkas: „perka medvilnę“. */
const goodsAcc: Record<GoodsKind, string> = { cotton: 'medvilnę', coal: 'anglį', iron: 'geležį' }
const industries: Record<IndustryKind, string> = {
  coal: 'Anglių kasykla',
  iron: 'Geležies liejykla',
  cotton: 'Medvilnės fabrikas',
  port: 'Uostas',
  shipyard: 'Laivų statykla',
}
const feminine: Record<IndustryKind, boolean> = { coal: true, iron: true, cotton: false, port: false, shipyard: true }

const name = (raw: string) => {
  if (raw === 'You') return 'Jūs'
  const player = /^Player (\d+)$/.exec(raw)
  return player ? `Žaidėjas ${player[1]}` : raw
}

const units = (n: number, kind: GoodsKind) => `${n} vnt. ${goodsOf[kind]}`

function payment(q: Payment): string {
  const parts = [`−£${q.money}`]
  if (q.coal) parts.push(`−${units(q.coal, 'coal')}`)
  if (q.iron) parts.push(`−${units(q.iron, 'iron')}`)
  return parts.join(', ')
}

function cost(c: Payment): string {
  const parts = [`£${c.money}`]
  if (c.coal) parts.push(units(c.coal, 'coal'))
  if (c.iron) parts.push(units(c.iron, 'iron'))
  return parts.join(' + ')
}

const market = (m: MarketPlace) => (m.port ? `${m.town} uostas` : m.town)
const route = (from: string, to: string) => `${from}–${to}`
const lower = (kind: IndustryKind) => industries[kind].toLowerCase()

const messages: GameMessageRenderers = {
  matchStart: (m) =>
    m.railRound !== null
      ? `Prasideda 1 raundas iš ${m.rounds}, kanalų era. Geležinkelių era prasidės ${m.railRound} raunde.`
      : `Prasideda 1 raundas iš ${m.rounds}.`,
  built: (m) =>
    `${name(m.player)}: ${feminine[m.industry] ? 'pastatyta' : 'pastatytas'} ${lower(m.industry)}, ${m.town} (${payment(m.payment)}, +${m.prestige}★)`,
  linked: (m) =>
    `${name(m.player)}: ${m.kind === 'canal' ? 'iškastas kanalas' : 'nutiestas geležinkelis'} ${route(m.from, m.to)} (${payment(m.payment)}, +${m.prestige}★)`,
  shipped: (m) => {
    const extras = [
      ...m.tolls.map((toll) => `£${toll.amount} mokestis ${name(toll.owner)}`),
      ...(m.fee ? [`£${m.fee.amount} uosto mokestis ${name(m.fee.owner)}`] : []),
    ].join(', ')
    const load = units(m.amount, m.goods)
    const where = m.from === null ? `parduota ${load}: ${market(m.market)}` : `išgabenta ${load}: ${m.from} → ${market(m.market)}`
    return `${name(m.player)}: ${where} (+£${m.revenue}${extras ? `, ${extras}` : ''}, +${m.prestige}★)`
  },
  raisedFunds: (m) => `${name(m.player)}: sutelkta lėšų (+£${m.amount})`,
  timedOut: (m) => `${name(m.player)}: baigėsi laikas (${p(m.lost, { one: `prarastas ${m.lost} veiksmas`, few: `prarasti ${m.lost} veiksmai`, other: `prarasta ${m.lost} veiksmų` })})`,
  endedTurn: (m) => `${name(m.player)}: ėjimas baigtas ${m.early ? 'anksčiau' : 'nieko nedarius'}`,
  roundEnds: (m) => `${m.round} raundas baigiasi: pramonė gamina, visi gauna £${m.income}.`,
  won: (m) => (m.winners.length > 1 ? `Bendra pergalė: ${m.winners.map(name).join(' ir ')}.` : `Laimėjo: ${name(m.winners[0])}.`),
  roundBegins: (m) => `Prasideda ${m.round} raundas iš ${m.total}.`,
  railEra: (m) =>
    `Prasideda geležinkelių era — kanalai uždaromi${m.removed ? ` (${p(m.removed, { one: `pašalinta ${m.removed} kanalo jungtis`, few: `pašalintos ${m.removed} kanalų jungtys`, other: `pašalinta ${m.removed} kanalų jungčių` })})` : ''}. Dabar galima tiesti geležinkelius.`,
  networkReset: (m) => `${name(m.player)}: tinklo neliko, vėl galima statyti bet kur.`,

  notOnMap: () => 'Šiame žemėlapyje nėra',
  plotsTaken: () => 'Visi sklypai užimti',
  opensInRail: () => 'Atsivers geležinkelių eroje',
  noPlotInNetwork: () => 'Jūsų tinkle nėra laisvo sklypo',
  needsMoney: (m) => `Reikia £${m.amount}`,
  noRoute: () => 'Jokia laisva trasa neliečia jūsų tinklo',
  buildSourceFirst: () => 'Pirma pastatykite fabriką, kasyklą ar liejyklą',
  nothingToShip: () => 'Kol kas nėra ką gabenti',
  notReachable: () => 'Nepasiekiama',
  cantAffordTolls: () => 'Neužtenka pinigų mokesčiams',

  cantPay: (m) => `Reikia £${m.amount}; jūs turite £${m.have}`,
  noPlots: (m) => `${m.town}: statybų sklypų nėra`,
  noSuchPlot: (m) => `${m.town}: nėra ${m.plot} sklypo`,
  plotTaken: (m) => `Šis sklypas (${m.town}) užimtas`,
  wrongPlot: (m) => `Šiame sklype negalima statyti: ${lower(m.industry)}`,
  townOpensInRail: (m) => `${m.town} atsivers geležinkelių eroje`,
  notInNetwork: (m) => `${m.town} nėra jūsų tinkle`,
  linkBuilt: (m) => `${route(m.from, m.to)} jau nutiesta`,
  linkNotInEra: (m) => `${route(m.from, m.to)} šioje eroje neegzistuoja`,
  linkOffNetwork: (m) => `${route(m.from, m.to)} neliečia jūsų tinklo`,
  matchOver: () => 'Partija baigta',
  pickSource: () => 'Pasirinkite savo fabriką, kasyklą ar liejyklą',
  noCottonYet: (m) => `${industries[m.industry]} dar neturi medvilnės`,
  storeEmpty: (m) => `Jūsų ${goodsOf[m.goods]} atsargos tuščios`,
  portsOnlyBuy: (m) => `Uostai perka tik ${goodsAcc[m.goods]}`,
  doesntBuy: (m) => `${m.town ?? 'Ši vieta'} neperka ${goodsOf[m.goods]}`,
  unreachable: (m) => `${market(m.market)} nepasiekiamas nutiestomis jungtimis`,
  cantAffordFees: (m) => `Neužtenka pinigų £${m.amount} mokesčiams`,
  unknownAction: () => 'Nežinomas veiksmas',
  internal: (m) => m.text,
}

const game: GameWords = { goods, industries, name, payment, cost, market, route, messages }

export default game
