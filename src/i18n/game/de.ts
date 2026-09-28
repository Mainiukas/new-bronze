import type { GameMessageRenderers, MarketPlace, Payment } from '../../game/messages'
import type { GoodsKind, IndustryKind } from '../../game/types'
import { pluralizer } from '../languages'
import type { GameWords } from './en'

/* Die Worte der Spiel-Engine auf Deutsch: Partieprotokoll, warum eine Aktion nicht geht, warum ein Zug abgelehnt wurde. */

const p = pluralizer('de-DE')

const goods: Record<GoodsKind, string> = { cotton: 'Baumwolle', coal: 'Kohle', iron: 'Eisen' }
const industries: Record<IndustryKind, string> = {
  coal: 'Kohlebergwerk',
  iron: 'Eisenhütte',
  cotton: 'Baumwollspinnerei',
  port: 'Hafen',
  shipyard: 'Werft',
}
/** Unbestimmter Artikel im Akkusativ: „ein Kohlebergwerk“, „eine Werft“, „einen Hafen“. */
const article: Record<IndustryKind, string> = { coal: 'ein', iron: 'eine', cotton: 'eine', port: 'einen', shipyard: 'eine' }
/** „kein Hafen“, „keine Werft“ (Nominativ). */
const none: Record<IndustryKind, string> = { coal: 'kein', iron: 'keine', cotton: 'keine', port: 'kein', shipyard: 'keine' }
/** Bestimmter Artikel im Nominativ: „die Baumwollspinnerei“. */
const the: Record<IndustryKind, string> = { coal: 'Das', iron: 'Die', cotton: 'Die', port: 'Der', shipyard: 'Die' }

const name = (raw: string) => {
  if (raw === 'You') return 'Du'
  const player = /^Player (\d+)$/.exec(raw)
  return player ? `Spieler ${player[1]}` : raw
}

function payment(q: Payment): string {
  const parts = [`−£${q.money}`]
  if (q.coal) parts.push(`−${q.coal} Kohle`)
  if (q.iron) parts.push(`−${q.iron} Eisen`)
  return parts.join(', ')
}

function cost(c: Payment): string {
  const parts = [`£${c.money}`]
  if (c.coal) parts.push(`${c.coal} Kohle`)
  if (c.iron) parts.push(`${c.iron} Eisen`)
  return parts.join(' + ')
}

const market = (m: MarketPlace) => (m.port ? `Hafen ${m.town}` : m.town)
const route = (from: string, to: string) => `${from}–${to}`

const messages: GameMessageRenderers = {
  matchStart: (m) =>
    m.railRound !== null
      ? `Runde 1 von ${m.rounds} beginnt in der Kanal-Ära. Die Eisenbahn-Ära beginnt in Runde ${m.railRound}.`
      : `Runde 1 von ${m.rounds} beginnt.`,
  built: (m) => `${name(m.player)}: ${article[m.industry]} ${industries[m.industry]} in ${m.town} gebaut (${payment(m.payment)}, +${m.prestige}★)`,
  linked: (m) =>
    `${name(m.player)}: ${m.kind === 'canal' ? 'Kanal' : 'Eisenbahn'} ${route(m.from, m.to)} ${m.kind === 'canal' ? 'gegraben' : 'verlegt'} (${payment(m.payment)}, +${m.prestige}★)`,
  shipped: (m) => {
    const extras = [
      ...m.tolls.map((toll) => `£${toll.amount} Maut an ${name(toll.owner)}`),
      ...(m.fee ? [`£${m.fee.amount} Hafengebühr an ${name(m.fee.owner)}`] : []),
    ].join(', ')
    const load = `${m.amount} ${goods[m.goods]}`
    const where = m.from === null ? `${load} in ${market(m.market)} verkauft` : `${load} von ${m.from} nach ${market(m.market)} verschifft`
    return `${name(m.player)}: ${where} (+£${m.revenue}${extras ? `, ${extras}` : ''}, +${m.prestige}★)`
  },
  raisedFunds: (m) => `${name(m.player)}: Geld beschafft (+£${m.amount})`,
  timedOut: (m) => `${name(m.player)}: Zeit abgelaufen (${p(m.lost, { one: `${m.lost} Aktion`, other: `${m.lost} Aktionen` })} verloren)`,
  endedTurn: (m) => `${name(m.player)}: Zug ${m.early ? 'vorzeitig beendet' : 'ohne Aktion beendet'}`,
  roundEnds: (m) => `Runde ${m.round} endet: Die Industrien produzieren, alle erhalten £${m.income}.`,
  won: (m) => (m.winners.length > 1 ? `Geteilter Sieg: ${m.winners.map(name).join(' und ')}.` : `Sieg für ${name(m.winners[0])}.`),
  roundBegins: (m) => `Runde ${m.round} von ${m.total} beginnt.`,
  railEra: (m) =>
    `Die Eisenbahn-Ära beginnt — die Kanäle schließen${m.removed ? `, ${p(m.removed, { one: `${m.removed} Kanalverbindung wird`, other: `${m.removed} Kanalverbindungen werden` })} entfernt` : ''}. Jetzt können Eisenbahnen verlegt werden.`,
  networkReset: (m) => `${name(m.player)}: kein Netz mehr, darf wieder überall bauen.`,

  notOnMap: () => 'Nicht auf dieser Karte',
  plotsTaken: () => 'Alle Bauplätze belegt',
  opensInRail: () => 'Öffnet in der Eisenbahn-Ära',
  noPlotInNetwork: () => 'Kein freier Bauplatz in deinem Netz',
  needsMoney: (m) => `Braucht £${m.amount}`,
  noRoute: () => 'Keine freie Strecke berührt dein Netz',
  buildSourceFirst: () => 'Baue zuerst eine Spinnerei, ein Bergwerk oder eine Hütte',
  nothingToShip: () => 'Noch nichts zu verschiffen',
  notReachable: () => 'Nicht erreichbar',
  cantAffordTolls: () => 'Maut nicht bezahlbar',

  cantPay: (m) => `Braucht £${m.amount}; du hast £${m.have}`,
  noPlots: (m) => `${m.town} hat keine Bauplätze`,
  noSuchPlot: (m) => `${m.town} hat keinen Bauplatz ${m.plot}`,
  plotTaken: (m) => `Dieser Bauplatz in ${m.town} ist belegt`,
  wrongPlot: (m) => `Auf diesem Bauplatz kann ${none[m.industry]} ${industries[m.industry]} gebaut werden`,
  townOpensInRail: (m) => `${m.town} öffnet in der Eisenbahn-Ära`,
  notInNetwork: (m) => `${m.town} ist nicht in deinem Netz`,
  linkBuilt: (m) => `${route(m.from, m.to)} ist schon gebaut`,
  linkNotInEra: (m) => `${route(m.from, m.to)} gibt es in dieser Ära nicht`,
  linkOffNetwork: (m) => `${route(m.from, m.to)} berührt dein Netz nicht`,
  matchOver: () => 'Die Partie ist vorbei',
  pickSource: () => 'Wähle eine deiner Spinnereien, Bergwerke oder Hütten',
  noCottonYet: (m) => `${the[m.industry]} ${industries[m.industry]} hat noch keine Baumwolle`,
  storeEmpty: (m) => `Dein ${goods[m.goods]}-Lager ist leer`,
  portsOnlyBuy: (m) => `Häfen kaufen nur ${goods[m.goods]}`,
  doesntBuy: (m) => `${m.town ?? 'Dieser Ort'} kauft kein${m.goods === 'iron' ? '' : 'e'} ${goods[m.goods]}`,
  unreachable: (m) => `${market(m.market)} ist über gebaute Verbindungen nicht erreichbar`,
  cantAffordFees: (m) => `Du kannst die £${m.amount} für Maut und Gebühren nicht bezahlen`,
  unknownAction: () => 'Unbekannte Aktion',
  internal: (m) => m.text,
}

const game: GameWords = { goods, industries, name, payment, cost, market, route, messages }

export default game
