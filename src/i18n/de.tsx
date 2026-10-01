import type { ReactNode } from 'react'
import type { Quote } from '../game/engine'
import type { GameMessage } from '../game/messages'
import type { RULES } from '../game/rules'
import type { GoodsKind, IndustryKind, LogEntry, RouteKind } from '../game/types'
import game from './game/de'
import { renderWith } from './game/en'
import { pluralizer } from './languages'
import accountWords from './account/de'
import brassWords from './brass/de'
import onlineWords from './online/de'
import tutorialWords from './tutorial/de'
import welcomeWords from './welcome/de'
import type { Messages } from './messages'

/* Alle Worte auf dem Bildschirm auf Deutsch (übersetzt aus en.tsx). */

type Rules = typeof RULES
type Cost = { money: number; coal: number; iron: number }
type Era = 'canal' | 'rail'

const p = pluralizer('de-DE')
const you = 'Du'

const list = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`)
const or = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} oder ${items.at(-1)}`)
/** „3 Baumwolle“, „1 Kohle“ */
const amountOf = (n: number, goods: GoodsKind) => `${n} ${game.goods[goods]}`

const industries: Messages['industries'] = {
  coal: { name: game.industries.coal, output: (r: Rules) => `+1 Kohle pro Runde in dein Lager (bis ${r.storeCap}; Überschuss wird für £${r.coalOverflowValue} verkauft)` },
  iron: { name: game.industries.iron, output: (r: Rules) => `+1 Eisen pro Runde in dein Lager (bis ${r.storeCap}; Überschuss wird für £${r.ironOverflowValue} verkauft)` },
  cotton: { name: game.industries.cotton, output: (r: Rules) => `+1 Baumwolle pro Runde in der Spinnerei (fasst ${r.goodsCapacity})` },
  port: { name: game.industries.port, output: (r: Rules) => `+£${r.portIncome} pro Runde. Kauft Baumwolle für £${r.portPrice}; andere zahlen dir £${r.portFee} pro Einheit` },
  shipyard: { name: game.industries.shipyard, output: () => '+1★ pro Runde' },
}

const routeKind = (kind: RouteKind) => (kind === 'canal' ? 'Kanal' : 'Eisenbahn')

const de: Messages = {
  common: {
    you,
    player: (n: number) => `Spieler ${n}`,
    close: 'Schließen',
    closeNamed: (title: string) => `${title} schließen`,
    dismiss: 'Ausblenden',
    done: 'Fertig',
    cancel: 'Abbrechen',
    back: 'Zurück',
    logIn: 'Anmelden',
    logOut: 'Abmelden',
    register: 'Registrieren',
    logInToUse: 'Zum Nutzen anmelden',
    logInToUseNote: '(Anmeldung nötig)',
    comingSoon: 'Demnächst',
    notAvailable: 'nicht verfügbar',
    skipToContent: 'Zum Inhalt springen',
  },
  brand: {
    home: 'Bronze: Hauptmenü',
    tagline: 'Bauen · Verbinden · Industrialisieren',
  },
  nav: {
    lobby: 'Lobby',
    main: 'Hauptnavigation',
    mainMenu: 'Hauptmenü',
    play: 'Spielen',
    tournaments: 'Turniere',
    locker: 'Spind',
    shop: 'Laden',
    achievements: 'Erfolge',
    online: 'Online spielen',
    leaderboard: 'Bestenliste',
    board: 'Kartenbrett',
    howToPlay: 'Spielanleitung',
    settings: 'Einstellungen',
    credits: 'Mitwirkende',
    legal: 'Rechtliches',
    profile: 'Profil',
    more: 'Mehr',
    closeMore: 'Menü schließen',
    account: 'Konto',
    accountMenu: (name: string, record: string) => `${name}: ${record}. Kontomenü`,
    yourProfile: (name: string, record: string) => `${name}: ${record}. Dein Profil`,
    checkingAccount: 'Dein Konto wird geprüft',
    retryAccount: 'Konto erneut laden',
    retryAccountTip: 'Dein Konto erneut laden',
    privacy: 'Datenschutzerklärung',
    terms: 'Nutzungsbedingungen',
    refunds: 'Erstattungsrichtlinie',
    cookies: 'Cookie-Richtlinie',
    legalNotice: 'Impressum',
    dataRequest: 'Datenanfragen',
  },
  record: (wins: number, matches: number) =>
    `${p(wins, { one: `${wins} Sieg`, other: `${wins} Siege` })} · ${p(matches, { one: `${matches} Partie`, other: `${matches} Partien` })}`,
  list,
  or,
  amountOf,
  stats: {
    wins: 'Siege',
    bestScore: 'Bestwert',
    matches: 'Partien',
    goodsShipped: 'Verschiffte Waren',
    saveFailed: 'Deine Bilanz konnte nicht im Konto gespeichert werden. Sie bleibt auf diesem Gerät und wird bei der nächsten Anmeldung gespeichert.',
    guestMoved: 'Dein Fortschritt als Gast wurde deinem Konto hinzugefügt.',
  },
  lobby: {
    tournamentsTeaser: 'Ranglisten-Turniere und Saison-Pokale.',
    achievementsUnlocked: 'Freigeschaltete Erfolge',
    next: 'Als Nächstes:',
    allAchievements: 'Alle Erfolge freigeschaltet.',
    outdatedTitle: 'Gespeicherte Partie kann nicht fortgesetzt werden',
    outdatedBody: 'Sie wurde mit einer älteren Bronze-Version gespeichert, deren Regeln sich geändert haben.',
    discard: 'Verwerfen',
    gameMode: 'Spielmodus',
    social: 'Freunde und Fortschritt',
    continueMatch: 'Partie fortsetzen',
    abandon: 'Aufgeben',
    resume: 'Fortsetzen',
    abandoned: 'Partie aufgegeben',
    opponentsTitle: 'Gegner',
    mixed: 'Eigene Wahl: Menschen und Computer gemischt (siehe Plätze)',
    opponents: { computer: 'Gegen Computer', pass: 'Hot-Seat', online: 'Online' },
  },
  friends: {
    title: 'Freunde',
    addByUsername: 'Freund per Benutzername hinzufügen',
    add: 'Freund hinzufügen',
    none: 'Noch keine Freunde',
    noServer:
      'Freundeslisten und Online-Partien brauchen einen Spielserver, und den hat Bronze noch nicht. Bis dahin spiel gegen den Computer oder im Hot-Seat auf diesem Gerät.',
    guest: 'Melde dich an, um Freunde hinzuzufügen. Bis dahin spiel gegen den Computer oder im Hot-Seat auf diesem Gerät.',
    online: 'Online',
    pending: 'Ausstehend',
  },
  modes: {
    normal: { name: 'Normal', description: 'Ganze Karte, alle Regeln. Die komplette Industrie-Saga.' },
    blitz: { name: 'Blitz', description: 'Kleinere Karte, kürzere Zeit. Jede Entscheidung zählt.' },
    bullet: { name: 'Bullet', description: 'Kleinste Karte, sehr wenig Zeit. Bau nach Gefühl.' },
    mapSize: { full: 'Ganze Karte', reduced: 'Verkleinerte Karte', compact: 'Kompakte Karte' },
    clock: (minutes: number, seconds: number) => `${minutes} Min. + ${seconds} s pro Zug`,
  },
  maps: {
    'wales-and-the-west': {
      terrain: 'Kanäle & Eisenbahnen',
      flavor: 'Walisische Kohle, Werkstätten der Midlands und Häfen am Severn. Erst Kanäle graben, dann um die Wette Schienen verlegen.',
    },
    'mersey-valley': { terrain: 'Fluss & Hafen', flavor: 'Ein breiter Gezeitenfluss speist einen geschäftigen Hafen. Bring deine Waren flussabwärts, bevor es die Konkurrenz tut.' },
    'black-country': { terrain: 'Kohle & Eisen', flavor: 'Kohleflöze, Eisenhütten und ein Gewirr von Kanälen. Eng, gnadenlos und die ganze Nacht glühend.' },
    'pennine-mills': { terrain: 'Moore & Spinnereien', flavor: 'Spinnereistädte zwischen windigen Mooren. Schnelles Wasser, steile Hänge und wenige leichte Wege.' },
  },
  setup: {
    title: 'Partie einrichten',
    rounds: (n: number) => p(n, { one: `${n} Runde`, other: `${n} Runden` }),
    roundsPerEra: (n: number) => p(n, { one: `${n} Runde pro Ära`, other: `${n} Runden pro Ära` }),
    moneyEach: (n: number) => `je £${n}`,
    railFrom: (round: number) => `Eisenbahn-Ära ab Runde ${round}`,
    map: 'Karte',
    practiceMap: 'Übungskarte, ohne Ären.',
    moreMaps: 'Weitere Karten folgen',
    moreMapsText: 'Neue Spielbretter werden gezeichnet. Bis dahin wird jede Partie auf Wales & the West gespielt.',
    players: 'Spieler',
    playersRange: (min: number, max: number) => (min === max ? `${min} Spieler` : `${min}–${max} Spieler`),
    towns: (n: number) => p(n, { one: `${n} Stadt`, other: `${n} Städte` }),
    mapTakes: (map: string, min: number, max: number) => `${map} ist für ${min}–${max} Spieler`,
    seats: 'Plätze',
    seatName: (seat: number) => `Name auf Platz ${seat}`,
    playedBy: (seat: number) => `Platz ${seat} spielt`,
    human: 'Mensch',
    ai: 'KI',
    seatColour: (seat: number) => `Farbe von Platz ${seat}`,
    colourSwapLabel: (colour: string, seat: number) => `${colour} (mit Platz ${seat} tauschen)`,
    colourSwapTitle: (colour: string, seat: number) => `${colour}: vergeben an Platz ${seat}; wählen tauscht die Farben`,
    difficulty: (seat: number) => `Schwierigkeit von Platz ${seat}`,
    humanSeats: 'Menschliche Plätze wechseln sich an diesem Gerät ab (Hot-Seat).',
    advancedSeed: 'Erweitert: Seed',
    seedLabel: 'Seed (optional)',
    random: 'Zufällig',
    seedHelp: 'Derselbe Seed und dieselben Plätze wiederholen dieselben Computerzüge. Leer lassen für eine neue Partie.',
    seedInvalid: 'Ein Seed ist eine ganze Zahl mit bis zu 9 Ziffern.',
    replaces: 'Eine neue Partie ersetzt die laufende Partie.',
    start: 'Partie starten',
  },
  colors: { yellow: 'Gelb', blue: 'Blau', purple: 'Lila', red: 'Rot', white: 'Weiß' },
  aiLevels: { easy: 'Leicht', normal: 'Normal', hard: 'Schwer' },
  pages: {
    shop: {
      title: 'Laden',
      empty: 'Die Regale werden gerade aufgefüllt.',
      blurb: 'Kosmetische Bretter, Gebäude-Designs und Spielsteinsätze, frisch aus der Gießerei.',
      locked: 'Käufe hängen an deinem Konto: Melde dich an, um zu kaufen und sie zu behalten.',
    },
    locker: {
      title: 'Spind',
      empty: 'Dein Spind ist leer — gewinne eine Partie für deine ersten Beschläge.',
      blurb: 'Statte deinen Industriellen aus und wähle Spielsteine, Brettverzierungen und Banner.',
      locked: 'Dein Spind gehört zu deinem Konto: Melde dich an, damit deine Sammlung dir gehört.',
    },
    tournaments: {
      title: 'Turniere',
      empty: 'In der Ausstellungshalle ist es still. Schau bald wieder vorbei.',
      blurb: 'Ranglisten-Turniere und Saison-Pokale für die ehrgeizigsten Industriellen.',
      locked: 'Turniere werden mit deinem Konto gespielt: Melde dich an, um teilzunehmen.',
    },
    achievements: { empty: 'Noch keine Ehrungen an der Wand. Dein erster Sieg wartet.' },
  },
  achievements: {
    yourRecord: 'Deine Bilanz',
    unlocked: (total: number) => `${total} freigeschaltet`,
    savedAccount: 'In deinem Konto gespeichert.',
    savedDevice: 'Nur auf diesem Gerät gespeichert.',
    logInToSave: 'Anmelden, um im Konto zu speichern',
    unlockedOn: (date: string) => `Freigeschaltet am ${date}`,
    list: {
      'first-shift': { name: 'Erste Schicht', description: 'Beende eine Partie.' },
      foreman: { name: 'Vorarbeiter', description: 'Gewinne eine Partie.' },
      'quick-draw': { name: 'Schnellschuss', description: 'Gewinne eine Bullet-Partie.' },
      'full-house': { name: 'Volles Haus', description: 'Gewinne eine Partie zu viert.' },
      'merchant-fleet': { name: 'Handelsflotte', description: 'Verschiffe 12 Waren in einer Partie.' },
      'iron-web': { name: 'Eisernes Netz', description: 'Besitze 6 Verbindungen in einer Partie.' },
      'engine-room': { name: 'Schiffbauer', description: 'Baue 2 Werften in einer Partie.' },
      tycoon: { name: 'Magnat', description: 'Erreiche 55 oder mehr Punkte in einer Partie.' },
      'grand-tour': { name: 'Große Rundreise', description: 'Beende auf jeder Karte eine Partie.' },
      veteran: { name: 'Veteran', description: 'Beende 10 Partien.' },
    },
  },
  profile: {
    locked: 'Dein Profil bewahrt Benutzername, Bilanz und Erfolge in deinem Konto auf, auf jedem Gerät.',
    memberSince: (date: string) => `Mitglied seit ${date}`,
  },
  notFound: {
    title: 'Diese Strecke ist noch nicht verlegt',
    body: 'Unter dieser Adresse gibt es nichts.',
    back: 'Zurück zur Lobby',
  },

  game,
  gameMessage: (message: GameMessage) => renderWith(game, message),
  logEntry: (entry: LogEntry) => (entry.msg ? renderWith(game, entry.msg) : entry.text),
  cost: (c: Cost) => game.cost(c),
  quote: (q: Quote) => {
    const bought = [q.coalBought && amountOf(q.coalBought, 'coal'), q.ironBought && amountOf(q.ironBought, 'iron')].filter(Boolean)
    const used = [q.coalUsed && amountOf(q.coalUsed, 'coal'), q.ironUsed && amountOf(q.ironUsed, 'iron')].filter(Boolean)
    const notes = [bought.length ? `kauft ${bought.join(' + ')}` : '', used.length ? `nutzt dein ${used.join(' + ')}` : ''].filter(Boolean).join(', ')
    return `£${q.total}${notes ? ` (${notes})` : ''}`
  },
  industries,
  actions: {
    buildIndustry: 'Industrie bauen',
    from: (n: number) => `Ab £${n}`,
    buildLink: 'Verbindung bauen',
    ship: 'Verschiffen',
    sourcesReady: (n: number) => p(n, { one: `${n} Quelle bereit`, other: `${n} Quellen bereit` }),
    raiseFunds: 'Geld beschaffen',
    endTurn: 'Zug beenden',
    skipsLast: 'Überspringt die letzte Aktion',
    skipsBoth: 'Überspringt beide Aktionen',
    canalCost: (money: number) => `Kanal £${money}`,
    railwayCost: (quote: string) => `Eisenbahn ${quote}`,
    bothCosts: (canal: number, rail: number) => `Kanal £${canal} · Eisenbahn £${rail} + Kohle`,
    cancelAction: 'Diese Aktion abbrechen',
    buildAnIndustry: 'Eine Industrie bauen',
    buildHint: 'Wähle, was du baust. Die Preise enthalten Kohle oder Eisen, das für dich gekauft wird.',
    buildA: (kind: IndustryKind) => `${industries[kind].name} bauen`,
    buildWhere: (quote: string, prestige: number): ReactNode => (
      <>
        {quote}, +{prestige}★. <strong className="text-brass-200">Klicke auf einen leuchtenden Bauplatz</strong> auf dem Brett oder wähle hier einen.
      </>
    ),
    slot: (n: number) => `Bauplatz ${n}`,
    buildALink: 'Eine Verbindung bauen',
    linkHint: (era: Era | null, canal: number, rail: number, coalPrice: number, prestige: number): ReactNode => (
      <>
        {era === 'canal'
          ? `Kanal-Ära: Kanäle kosten £${canal}.`
          : era === 'rail'
            ? `Eisenbahn-Ära: Eisenbahnen kosten £${rail} + 1 Kohle (für £${coalPrice} gekauft, wenn du keine hast).`
            : `Kanäle £${canal}; Eisenbahnen £${rail} + 1 Kohle.`}{' '}
        +{prestige}★. <strong className="text-brass-200">Klicke auf eine leuchtende Blase</strong> oder wähle hier eine.
      </>
    ),
    routeKind: { canal: 'Kanal', rail: 'Eisenbahn' },
    inStore: (goods: string) => `${goods} in deinem Lager`,
    shipHint: (
      <>
        Wähle, was du verschiffst: die Baumwolle einer Spinnerei oder die ganze Kohle bzw. das ganze Eisen aus deinem Lager von einem deiner Bergwerke oder
        einer deiner Hütten. <strong className="text-brass-200">Leuchtende Felder</strong> auf dem Brett gehen auch.
      </>
    ) as ReactNode,
    shipLoad: (goods: string) => `${goods} verschiffen`,
    shipFrom: (source: string): ReactNode => (
      <>
        Von {source}. <strong className="text-brass-200">Klicke auf einen leuchtenden Markt</strong> auf dem Brett oder wähle hier einen, um zu sehen, was er
        zahlt.
      </>
    ),
    cantPayFees: (n: number) => `Du kannst die £${n} für Maut und Gebühren nicht bezahlen`,
    sameTown: 'gleiche Stadt',
    links: (n: number) => p(n, { one: `${n} Verbindung`, other: `${n} Verbindungen` }),
    cantAffordTolls: 'Maut zu teuer',
    revenue: 'Erlös',
    tolls: 'Maut',
    ownLinksOnly: 'Nur deine eigenen Verbindungen',
    portFee: 'Hafengebühr',
    feePerUnit: (fee: number, owner: string) => `£${fee} pro Einheit an ${owner}`,
    youGet: 'Du erhältst',
    prestige: 'Prestige',
    doubled: (n: number) => `verdoppelt: ${n} Verbindungen`,
    shipTo: (market: string) => `Nach ${market} verschiffen`,
    shipSummary: (goods: string, from: string, routes: string[], drop: { market: string; price: number } | null) =>
      `${goods} von ${from}${routes.length ? ` über ${routes.join(', ')}` : ''}.${drop ? ` Der Preis in ${drop.market} fällt dann auf £${drop.price}.` : ''}`,
    confirmShipment: 'Lieferung bestätigen',
  },
  match: {
    final: 'Endstand',
    roundOf: (round: number, total: number) => `Runde ${round}/${total}`,
    actionsLeft: (left: number, total: number) => `Noch ${left} von ${total} Aktionen`,
    actionsLeftTitle: 'Verbleibende Aktionen in diesem Zug',
    board: 'Brett',
    actions: 'Aktionen',
    seeResults: 'Ergebnisse ansehen',
    waitingFor: (name: string) => `Warte, bis ${name} das Gerät übernimmt…`,
    panels: 'Partie-Tafeln',
    players: 'Spieler',
    markets: 'Märkte',
    log: 'Protokoll',
    matchLog: 'Partieprotokoll',
    yourTurn: 'Du bist am Zug',
    passTo: (name: string) => `Weitergeben an ${name}`,
    handOver: 'Gib das Gerät weiter und starte dann den Zug. Der Timer wartet.',
    startYourTurn: 'Deinen Zug starten',
    startTurnOf: (name: string) => `Zug von ${name} starten`,
    over: 'Partie vorbei',
    isPlaying: (name: string) => `${name} ist am Zug`,
    turnOf: (name: string) => `${name} ist am Zug`,
    actionOf: (n: number, total: number) => `Aktion ${n} von ${total}`,
    fastForward: 'Vorspulen',
    fastForwardTitle: 'Computerspieler ohne Pause ziehen lassen',
    aiLevel: (level: string) => `KI ${level}`,
    choosing: 'wählt eine Aktion.',
    last: (text: string) => `Zuletzt: ${text}`,
    canalEraTitle: (round: number) => `Kanal-Ära: Die Eisenbahn-Ära beginnt in Runde ${round}`,
    railEraTitle: 'Eisenbahn-Ära: Die Kanäle sind geschlossen',
    era: { canal: 'Kanal-Ära', rail: 'Eisenbahn-Ära' },
    menu: 'Partiemenü',
    legal: 'Rechtliches & Datenschutz',
    saved: 'Die Partie wird nach jeder Aktion gespeichert.',
    timerLabel: (secs: number, paused: boolean) => `Noch ${secs} Sekunden in diesem Zug${paused ? ', pausiert' : ''}`,
    timerPaused: 'Timer pausiert',
    timeLeft: 'Restzeit in diesem Zug',
    eraBanner: {
      title: 'Die Eisenbahn-Ära beginnt — die Kanäle schließen',
      removed: (n: number) => (n === 0 ? 'Es waren keine Kanäle gegraben.' : p(n, { one: `${n} Kanalverbindung entfernt.`, other: `${n} Kanalverbindungen entfernt.` })),
      opens: (places: string) => `Jetzt können Eisenbahnen verlegt werden; ${places} öffnen.`,
      clickToContinue: 'Klicken zum Fortfahren',
    },
  },
  playersPanel: {
    turn: 'Am Zug',
    prestigeTitle: 'Bisher erworbenes Prestige',
    money: 'Geld',
    coal: 'Kohle',
    iron: 'Eisen',
    industries: 'Ind.',
    industriesTitle: (n: number) => p(n, { one: `${n} Industrie im Besitz`, other: `${n} Industrien im Besitz` }),
    links: 'Verb.',
    linksTitle: (n: number, built: number) => `${p(n, { one: `${n} Verbindung`, other: `${n} Verbindungen` })} im Besitz (insgesamt ${built} gebaut)`,
    ifEnded: 'Bei Ende',
    ifEndedTitle: (prestige: number, money: number, hubs: number) => `Punkte, wenn die Partie jetzt endete: ${prestige}★ + ${money} für Geld + ${hubs} für Knoten`,
  },
  marketsPanel: {
    buys: (goods: string) => `Kauft ${goods}`,
    down: (base: number, recovery: number) => `Gefallen von £${base}; erholt sich um £${recovery} pro Runde`,
    full: 'Voller Preis',
    note: (r: Rules, ports: string[]) =>
      `Jede verkaufte Einheit senkt den Preis eines Knotens um £${r.priceDropPerGoods} (nicht unter £${r.priceFloor}). Häfen kaufen Baumwolle zum Festpreis von £${r.portPrice}${
        ports.length ? `: ${ports.join(', ')}.` : '; noch keiner gebaut.'
      }`,
  },
  results: {
    title: 'Ergebnisse',
    shared: (names: string[]) => `Geteilter Sieg: ${names.join(' & ')}`,
    youWin: 'Du gewinnst!',
    wins: (name: string) => `${name} gewinnt`,
    nobody: 'Niemand',
    rematch: 'Revanche',
    formula: 'Gesamt = im Spiel erworbene ★ + 1★ pro £5 im Besitz + 2★ pro Knoten in deinem Netz. Bei Gleichstand gewinnt, wer mehr Geld hat.',
    finalScores: 'Endstand',
    player: 'Spieler',
    playStars: 'Spiel-★',
    moneyBonus: 'Geldbonus',
    hubBonus: 'Knotenbonus',
    total: 'Gesamt',
    stats: 'Partiestatistik',
    linksBuilt: 'Gebaute Verbindungen',
    industries: 'Industrien',
    achievementsUnlocked: 'Freigeschaltete Erfolge',
  },
  zoom: {
    group: (label: string) => `${label}: Zoom`,
    in: 'Vergrößern',
    out: 'Verkleinern',
    reset: 'Ganzes Brett zeigen',
  },
  boardLabels: {
    gameBoard: 'Spielbrett',
    mapAlt: 'Illustrierte Karte von Wales, den Midlands und Südwestengland',
    route: (from: string, to: string, kind: RouteKind) => `${routeKind(kind)} ${from}–${to}`,
    buildRoute: (route: string, cost: string) => `${route} bauen, ${cost}`,
    routeTitle: (from: string, to: string, kind: RouteKind, owner: string | null) => `${from} – ${to} (${routeKind(kind)}${owner ? `, ${owner}` : ''})`,
    link: (from: string, to: string, era: Era, extra: string | null) => `${from}–${to} (${routeKind(era)})${extra ? `: ${extra}` : ''}`,
    shipTo: (town: string, pays: string) => `Nach ${town} verschiffen: ${pays}`,
    townTitle: (town: string, price: number | null) => (price === null ? town : `${town} — Handelsstadt, kauft Baumwolle, Kohle und Eisen für £${price} pro Einheit`),
    slotFree: (town: string, n: number, kinds: IndustryKind[]) => `${town}, Bauplatz ${n}: ${or(kinds.map((k) => industries[k].name))}, frei`,
    slotBuilt: (town: string, n: number, owner: string, kind: IndustryKind, cotton: number | null) =>
      `${town}, Bauplatz ${n}: ${industries[kind].name} (${owner === you ? 'deins' : owner})${cotton !== null ? `, ${amountOf(cotton, 'cotton')}` : ''}`,
    builtBy: (name: string) => `gebaut von ${name}`,
    notBuilt: 'noch nicht gebaut',
  },
  tooltip: {
    connections: 'Verbindungen',
    linkType: { canal: 'Kanal', rail: 'Eisenbahn', both: 'Kanal und Eisenbahn' },
    eraOnly: { canal: 'Kanal-Ära', rail: 'Eisenbahn-Ära' },
    city: (region: string) => `Stadt · ${region}`,
    stop: 'Haltepunkt · Strecken führen hindurch; kein Bauen, kein Handel',
    hub: 'Handelsknoten · hier werden Waren verkauft',
    railOnly: 'In der Eisenbahn-Ära verfügbar',
    owned: (owner: string, kind: IndustryKind) => `${industries[kind].name} (${owner === you ? 'deins' : owner})`,
    buys: 'Kauft:',
    priceNow: 'Aktueller Preis:',
    priceRule: (max: number) => `pro Einheit, £1 weniger je verkaufter Einheit (erholt sich um £1 pro Runde, bis £${max})`,
    both: (era: Era) => `Kanal und Eisenbahn · in dieser Ära ${era === 'canal' ? 'ein Kanal' : 'eine Eisenbahn'}`,
    only: (kind: Era) => (kind === 'canal' ? 'Nur Kanal' : 'Nur Eisenbahn'),
    builtBy: (era: Era, name: string) => `${era === 'canal' ? 'Kanal gegraben' : 'Eisenbahn verlegt'} von ${name}`,
  },
  mapBoard: {
    editMap: 'Karte bearbeiten',
    doneEditing: 'Bearbeitung beenden',
    draftNote: 'Zeigt deine ungespeicherte Kalibrierung aus diesem Browser. Öffne den Bearbeitungsmodus, um sie zu exportieren oder zu verwerfen.',
    era: 'Ära',
    eraNote: (era: Era, railOnly: string) =>
      `Nur die Verbindungen dieser Ära werden gezeigt: ${era === 'canal' ? 'Kanäle, „beide“ Verbindungen als Kanäle' : 'Eisenbahnen, „beide“ Verbindungen als Eisenbahnen'}. ${railOnly} sind nur in der Eisenbahn-Ära erreichbar.`,
    sandbox: 'Sandkasten',
    tool: 'Werkzeug',
    inspect: 'Ansehen',
    place: 'Plättchen legen',
    placeFor: 'Plättchen legen für',
    inspectHint: 'Klicke auf einen Ort, einen Bauplatz oder eine Verbindungsmarke, um Details zu sehen.',
    placeHint: 'Klicke auf einen Bauplatz, um dort zu bauen (erneut: Industrie wechseln, dann leeren), oder auf eine Verbindungsmarke, um sie zu besetzen.',
    preview: 'Das ist eine Vorschau, wie Bauten aussehen, keine Partie.',
    clear: 'Plättchen entfernen',
    selected: 'Ausgewählt',
    regions: 'Regionen',
    stopKey: 'Haltepunkt (kein Bauen, kein Handel)',
    hubKey: 'Handelsknoten',
    nothing: 'Noch nichts ausgewählt.',
    usable: (active: boolean, era: Era) => `in der ${era === 'canal' ? 'Kanal-Ära' : 'Eisenbahn-Ära'} ${active ? 'nutzbar' : 'geschlossen'}`,
    bends: (n: number) => (n === 0 ? 'automatische Biegung' : p(n, { one: `${n} Biegepunkt`, other: `${n} Biegepunkte` })),
    stop: 'Haltepunkt',
    hub: 'Handelsknoten',
    offset: (x: number, y: number) => `Schild versetzt um ${x}%, ${y}%`,
    startsAt: (price: number) => `beginnt bei £${price}`,
  },
  rules: {
    title: 'Regeln',
    goal: {
      title: 'Ziel',
      body: (r: Rules): ReactNode => (
        <>
          Hab am Ende der letzten Runde die höchste Summe: die <strong className="text-brass-300">im Spiel erworbenen ★</strong>, plus 1★ für je £
          {r.moneyPerPrestige} in deinem Besitz, plus {r.hubBonus}★ für jeden Handelsknoten in deinem Netz. Bei Gleichstand gewinnt, wer mehr Geld hat; ist
          auch das gleich, wird der Sieg geteilt.
        </>
      ),
    },
    setup: {
      title: 'Aufbau und Modi',
      body: (maxPlayers: number) =>
        `2–${maxPlayers} Spieler, jeweils Mensch oder Computer (leicht, normal oder schwer), jeder mit eigener Farbe. Alle beginnen mit dem Geld des Modus, ohne Kohle, ohne Eisen und ohne ★. Runde 1 wird in Platzreihenfolge gespielt; jede Runde rückt der erste Platz um eins weiter.`,
      columns: ['Modus', 'Karte', 'Runden', 'Eisenbahn-Ära ab', 'Geld', 'Zugzeit'],
      rings: { full: 'Ganze Karte', reduced: 'Ringe 1–2', compact: 'Nur Ring 1' },
      round: (n: number) => `Runde ${n}`,
      faded: 'Orte außerhalb der Ringe des Modus und ihre Verbindungen sind blass gezeichnet und gehören nicht zur Partie. Der Timer lässt sich in den Einstellungen abschalten.',
    },
    turn: {
      title: (n: number) => `Dein Zug: ${n} Aktionen`,
      intro: 'Du kannst deinen Zug früher beenden. Läuft die Zugzeit ab, verfallen deine übrigen Aktionen.',
      build: {
        name: 'Industrie bauen',
        body: (railOnly: string) =>
          `Auf einem freien, passenden Bauplatz in einer Stadt deines Netzes. Dein allererster Bau der Partie darf überall stehen. In ${railOnly} kann in der Kanal-Ära nichts gebaut werden. Zahle die Kosten und erhalte die ★ der Industrie.`,
      },
      link: {
        name: 'Verbindung bauen',
        body: (canal: string, rail: string, prestige: number) =>
          `Eine noch nicht gebaute Strecke, die es in der aktuellen Ära gibt und die dein Netz berührt (vor deinem ersten Bau: überall). Ein Kanal kostet ${canal}, eine Eisenbahn ${rail}. +${prestige}★, und die Verbindung gehört dir.`,
      },
      ship: {
        name: 'Verschiffen',
        intro: 'Wähle eine deiner Industrien und einen Markt, den sie erreicht:',
        sources: [
          'eine Baumwollspinnerei schickt ihre ganze Baumwolle zu einem Knoten, der Baumwolle kauft, oder zu einem beliebigen Hafen (deinem oder dem eines anderen);',
          'ein Kohlebergwerk schickt die ganze Kohle deines Lagers zu einem Knoten, der Kohle kauft;',
          'eine Eisenhütte schickt das ganze Eisen deines Lagers zu einem Knoten, der Eisen kauft.',
        ],
        body: (r: Rules) =>
          `Waren reisen über gebaute Verbindungen der aktuellen Ära, egal wessen; Industrie und Markt dürfen in derselben Stadt liegen. Genommen wird der Weg mit den wenigsten gegnerischen Verbindungen, dann der kürzeste. Jede gegnerische Verbindung kostet £${r.toll} Maut an ihren Besitzer. Ein Knoten zahlt seinen aktuellen Preis pro Einheit, und der Preis fällt mit jeder verkauften Einheit um £${r.priceDropPerGoods} (nie unter £${r.priceFloor}): Bei £6 bringen drei Einheiten £6 + £5 + £4. Ein Hafen zahlt £${r.portPrice} pro Einheit; im Hafen eines anderen zahlst du ihm £${r.portFee} pro Einheit. Du erhältst +1★ pro Einheit, doppelt, wenn die Waren ${r.longHaulLinks} oder mehr Verbindungen genutzt haben. Du kannst nicht verschiffen, wenn dein Geld plus der Erlös Maut und Gebühren nicht deckt. Danach sind die Spinnerei bzw. dein Kohle- oder Eisenlager leer.`,
      },
      funds: { name: 'Geld beschaffen', body: (n: number) => `Nimm £${n}.` },
      end: { name: 'Zug beenden', body: 'Beendet deinen Zug sofort.' },
    },
    industries: {
      title: 'Industrien',
      emptyStore: (total: number) => `(£${total} bei leerem Lager)`,
      supply: (r: Rules) =>
        `Kohle und Eisen, die dir für Kosten fehlen, werden für dich aus dem allgemeinen Vorrat gekauft: £${r.coalPrice} pro Kohle, £${r.ironPrice} pro Eisen. Die Preise im Spiel enthalten das. Dein Lager fasst bis zu ${r.storeCap} Kohle und ${r.storeCap} Eisen; was deine Bergwerke und Hütten darüber hinaus erzeugen, wird für £${r.coalOverflowValue} pro Kohle und £${r.ironOverflowValue} pro Eisen verkauft.`,
    },
    network: {
      title: 'Dein Netz',
      body: 'Jede Stadt, in der dir eine Industrie gehört, plus beide Enden jeder Verbindung, die dir gehört. Knoten und Haltepunkte zählen als Städte. Überall bauen darfst du nur bis zu deinem ersten Bau. Wird dein Netz später ausgelöscht (etwa weil deine einzigen Verbindungen Kanäle waren und die Eisenbahn-Ära sie entfernt hat), baust du weiterhin neben jeder Stadt, in der dir eine Industrie gehört; gehört dir auch keine Industrie, darfst du wieder überall bauen, und das Protokoll vermerkt es.',
    },
    roundEnd: {
      title: 'Ende jeder Runde',
      steps: (r: Rules) => [
        'Die Industrien produzieren (siehe oben).',
        `Jeder Spieler erhält £${r.baseIncome}.`,
        `Der Preis jedes Knotens erholt sich um £${r.priceRecovery}, bis zu seinem Startpreis.`,
        'Beginnt in der nächsten Runde die Eisenbahn-Ära, verlassen alle Kanalverbindungen das Brett. Die Besitzer behalten ihre ★, und die Industrien bleiben.',
        'Nach der letzten Runde endet die Partie und wird gewertet.',
      ],
    },
    eras: {
      title: 'Ären und das Brett',
      body: (railOnly: string) =>
        `Die Partie beginnt in der Kanal-Ära. Auf dem Brett ist nur das Netz der aktuellen Ära: zuerst Kanalstrecken und „beide“ Strecken als Kanäle, dann Eisenbahnstrecken und „beide“ Strecken als Eisenbahnen. ${railOnly} (mit einer Lokomotive markiert) sind nur per Bahn erreichbar und öffnen daher in der Eisenbahn-Ära.`,
      bubbleAlt: 'Eine leere Verbindungsblase',
      bubble: 'Eine leere Blase: eine Verbindung, die noch niemand gebaut hat. Sie leuchtet, wenn du sie bauen kannst.',
      hexAlt: 'Ein Verbindungs-Sechseck',
      hex: (stops: string) => `Zwei Sechsecke markieren Haltepunkte (${stops}: Strecken führen hindurch, kein Bauen, kein Handel) und Knoten.`,
      canalAlt: 'Ein gebauter Kanal-Spielstein',
      canal: 'Ein gebauter Kanal in der Farbe seines Besitzers.',
      railAlt: 'Ein gebauter Eisenbahn-Spielstein',
      rail: 'Eine gebaute Eisenbahn in der Farbe ihres Besitzers.',
      hubsIntro: 'Handelsknoten und was sie kaufen (der Preis auf dem Abzeichen ist der aktuelle):',
      hub: (price: number, buys: string, railOnly: boolean) => `beginnt bei £${price}, kauft ${buys}${railOnly ? ' (nur Eisenbahn-Ära)' : ''}`,
    },
    practice: {
      title: 'Übungskarten',
      body: (maps: string) =>
        `${maps} sind gezeichnete Karten ohne Ären: Kanäle und Eisenbahnen können jederzeit gebaut werden, und nichts wird entfernt. Ihre Handelsstädte funktionieren wie Knoten und kaufen Baumwolle, Kohle und Eisen. Alles andere ist gleich.`,
    },
  },

  auth: {
    username: 'Benutzername',
    usernameHint: '3–20 Zeichen: Buchstaben, Ziffern und _.',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
    showPassword: 'Passwort zeigen',
    hidePassword: 'Passwort verbergen',
    strength: (label: string) => `Stärke: ${label}`,
    strengths: { weak: 'schwach', ok: 'mittel', strong: 'stark' },
    available: 'Verfügbar',
    taken: 'Vergeben',
    checking: 'Wird geprüft…',
    usernameTaken: 'Dieser Benutzername ist vergeben.',
    usernameCheckFailed: 'Der Benutzername konnte nicht geprüft werden. Versuch es noch einmal.',
    google: 'Weiter mit Google',
    or: 'oder',
    registerOrLogIn: 'Registrieren oder anmelden',
    newHere: 'Neu hier?',
    haveAccount: 'Ich habe schon ein Konto',
    keepPlaying: 'Als Gast weiterspielen',
    backToLogIn: 'Zurück zur Anmeldung',
    cancelSignup: 'Registrierung abbrechen',
    notConfigured: 'Konten sind noch nicht eingerichtet. Du kannst als Gast weiterspielen; hier meldet dich nichts an.',
    welcome: (name: string | null, isNew: boolean) => (name ? `${isNew ? 'Willkommen' : 'Willkommen zurück'}, ${name}!` : 'Willkommen!'),
    loggedOut: 'Abgemeldet',
    passwordUpdated: 'Passwort geändert',
    profileFailed: 'Angemeldet, aber dein Profil konnte nicht geladen werden.',
    signupCancelled: 'Registrierung abgebrochen. Nichts wurde behalten.',
    signupLoggedOut: 'Abgemeldet. Die unfertige Registrierung wird automatisch gelöscht.',
    login: {
      intro: 'Willkommen zurück, Industrieller.',
      identifier: 'Benutzername oder E-Mail',
      enterIdentifier: 'Gib deinen Benutzernamen oder deine E-Mail ein.',
      enterPassword: 'Gib dein Passwort ein.',
      remember: 'Angemeldet bleiben',
      forgot: 'Passwort vergessen?',
      loggingIn: 'Anmeldung läuft…',
      tryAgainIn: (s: number) => `Erneut in ${s} s`,
      tooMany: (s: number) => `Zu viele Versuche: Warte ${s} Sekunden, bevor du es erneut versuchst.`,
    },
    register: {
      title: 'Konto erstellen',
      create: 'Konto erstellen',
      creating: 'Konto wird erstellt…',
      intro: 'Speichere deine Bilanz und sei bereit für Freunde und Online-Partien.',
      googleNote: 'Auch mit Google bestätigst du dein Alter und akzeptierst die Bedingungen, bevor dein Konto erstellt wird.',
      chooseAge: 'Wähle deine Altersgruppe.',
      mustAgree: 'Stimme den Nutzungsbedingungen und der Datenschutzerklärung zu, um fortzufahren.',
    },
    checkEmail: {
      title: 'Prüfe deine E-Mails',
      body: (email: ReactNode): ReactNode => <>Bestätige dein Konto per E-Mail. Wir haben einen Link an {email} geschickt; öffne ihn in diesem Browser, um abzuschließen.</>,
      spam: 'Nach ein paar Minuten keine E-Mail? Sieh im Spam-Ordner nach.',
      back: 'Zurück zur Lobby',
      again: 'Falsche Adresse? Erneut registrieren',
    },
    choose: {
      title: 'Konto fertigstellen',
      signedInAs: (who: string) => `Mit Google angemeldet als ${who}`,
      yourGoogle: 'dein Google-Konto',
      intro: 'Wähle den Namen, den andere Spieler sehen. Dein Bronze-Konto wird erst erstellt, wenn du fortfährst.',
      deleteAndPlay: 'Diese Anmeldung löschen und als Gast spielen',
      notNow: 'Nicht jetzt: abbrechen und löschen, was Google übermittelt hat',
    },
    forgot: {
      title: 'Passwort vergessen',
      intro: 'Gib die E-Mail-Adresse deiner Registrierung ein, und wir schicken dir einen Link, um ein neues Passwort festzulegen.',
      sent: 'Falls es zu dieser E-Mail ein Konto gibt, haben wir einen Link zum Zurücksetzen geschickt. Sieh in dein Postfach (und in den Spam).',
      send: 'Link zum Zurücksetzen senden',
      resend: 'Link erneut senden',
      resendIn: (s: number) => `Erneut senden in ${s} s`,
    },
    reset: {
      title: 'Neues Passwort festlegen',
      checking: 'Dein Link wird geprüft…',
      invalid: 'Dieser Link zum Zurücksetzen ist ungültig oder abgelaufen.',
      howLinksWork: 'Links zum Zurücksetzen funktionieren einmal, für begrenzte Zeit, in dem Browser, in dem du sie angefordert hast. Fordere einen neuen an und öffne ihn hier.',
      newPassword: 'Neues Passwort',
      confirmNew: 'Neues Passwort bestätigen',
      submit: 'Neues Passwort festlegen',
    },
    callback: {
      signingIn: 'Anmeldung läuft',
      failed: 'Anmeldung fehlgeschlagen',
      moment: 'Einen Moment…',
      linkProblem:
        'Dieser Anmeldelink kann hier nicht verwendet werden: Er ist vielleicht abgelaufen, schon benutzt oder wurde in einem anderen Browser geöffnet. Wenn du gerade deine E-Mail bestätigt hast, melde dich jetzt an.',
      nothing: 'Hier gibt es nichts abzuschließen. Versuch dich erneut anzumelden.',
    },
  },
  authErrors: {
    'invalid-credentials': 'Benutzername/E-Mail oder Passwort ist falsch.',
    'email-not-confirmed': 'Bestätige zuerst deine E-Mail: Folge dem Link, den wir dir geschickt haben, und melde dich dann an.',
    'email-taken': 'Diese E-Mail ist schon registriert. Melde dich an oder setze dein Passwort zurück.',
    'username-taken': 'Dieser Benutzername ist vergeben. Wähle einen anderen.',
    'rate-limited': 'Zu viele Versuche. Warte eine Minute und versuch es dann erneut.',
    'weak-password': 'Dieses Passwort ist zu leicht zu erraten. Wähle ein stärkeres.',
    'same-password': 'Wähle ein anderes Passwort als dein aktuelles.',
    'link-invalid': 'Dieser Link ist ungültig oder abgelaufen.',
    cancelled: 'Die Anmeldung wurde abgebrochen. Versuch es erneut oder nutze Benutzername oder E-Mail.',
    network: 'Der Kontoserver ist nicht erreichbar. Prüfe deine Verbindung und versuch es erneut.',
    'wrong-password': 'Dein aktuelles Passwort ist falsch.',
    'too-soon': 'Du kannst deinen Benutzernamen einmal alle 30 Tage ändern.',
    'same-username': 'Das ist bereits dein Benutzername.',
    'reauth-needed': 'Melde dich zu deiner Sicherheit erneut an und versuch es dann noch einmal.',
    'mfa-required': 'Gib zuerst deinen Code für die Zwei-Faktor-Authentifizierung ein.',
    'invalid-code': 'Der Code ist falsch oder abgelaufen. Prüfe ihn und versuch es erneut.',
    unavailable: 'Das ist noch nicht verfügbar.',
    'last-identity': 'Du kannst deine einzige Anmeldemethode nicht entfernen. Lege zuerst ein Passwort fest oder verknüpfe ein anderes Konto.',
    'identity-taken': 'Dieses Konto ist bereits mit einem anderen Bronze-Spieler verknüpft.',
    'invalid-input': 'Prüfe deine Eingabe und versuch es erneut.',
    unknown: 'Etwas ist schiefgegangen. Bitte versuch es erneut.',
  },
  validation: {
    chooseUsername: 'Wähle einen Benutzernamen.',
    atLeast: (n: number) => `Mindestens ${n} Zeichen.`,
    atMost: (n: number) => `Höchstens ${n} Zeichen.`,
    usernameChars: 'Nur Buchstaben, Ziffern und _.',
    enterEmail: 'Gib deine E-Mail ein.',
    validEmail: 'Gib eine gültige E-Mail ein, zum Beispiel name@beispiel.de.',
    choosePassword: 'Wähle ein Passwort.',
    typeAgain: 'Gib das Passwort noch einmal ein.',
    noMatch: 'Die Passwörter stimmen nicht überein.',
    sameUsername: 'Das ist bereits dein Benutzername.',
    enterCurrentPassword: 'Gib dein aktuelles Passwort ein.',
    sameAsCurrent: 'Wähle ein anderes Passwort als dein aktuelles.',
  },
  consents: {
    howOld: 'Wie alt bist du?',
    ages: {
      'under-14': (min: number) => `Unter ${min}`,
      '14-17': (min: number) => `${min} bis 17`,
      '18+': () => '18 oder älter',
    },
    noBirthDate: 'Wir fragen nicht nach deinem Geburtsdatum.',
    underAge: (min: number) =>
      `Für ein Konto musst du mindestens ${min} sein. Du kannst trotzdem alle Offline-Modi als Gast spielen, und auf unseren Servern wird nichts über dich gespeichert.`,
    agree: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        Ich stimme den {terms} und der {privacy} zu
      </>
    ),
    terms: 'Nutzungsbedingungen',
    privacy: 'Datenschutzerklärung',
    newTab: '(öffnet in einem neuen Tab)',
    required: '(erforderlich)',
    marketing: 'Schickt mir Neuigkeiten zu Bronze per E-Mail',
    marketingNote: '(optional; jederzeit abbestellbar)',
  },
  account: {
    exportNote: 'Alles, was Bronze über dich speichert: Konto, Profil, Bilanz, Online-Partien (mit deinen eigenen Zügen), Wertungen, Freunde und Einladungen.',
    downloading: 'Deine Daten werden heruntergeladen.',
    loggedInAs: (name: ReactNode, email: string | null): ReactNode => (
      <>
        Angemeldet als {name}
        {email ? ` (${email})` : ''}.
      </>
    ),
    guest: 'Du spielst als Gast: Auf unseren Servern wird nichts über dich gespeichert. Einstellungen, Bilanz und Partie bleiben in diesem Browser.',
    download: 'Meine Daten herunterladen',
    downloadAccount: 'Dein Konto, Profil, deine Bilanz, Online-Partien, Wertungen, Freunde und Einladungen sowie die Daten dieses Geräts als eine JSON-Datei.',
    downloadGuest: 'Was Bronze in diesem Browser speichert, als Datei.',
    downloadButton: 'Herunterladen',
    delete: 'Mein Konto löschen',
    deleteNote: 'Löscht dein Konto und alles, was damit gespeichert ist. Das lässt sich nicht rückgängig machen.',
    deleteButton: 'Löschen',
    clear: 'Dieses Gerät leeren',
    clearNote: (signedIn: boolean) => `Entfernt alles, was Bronze in diesem Browser gespeichert hat${signedIn ? ', und meldet dich hier ab' : ''}. Dein Konto bleibt.`,
    clearButton: 'Leeren',
    clearAsk: 'Leeren…',
    keep: 'Behalten',
    deleted: 'Dein Konto und seine Daten wurden gelöscht. Du spielst jetzt als Gast.',
    deleteDialog: {
      title: 'Konto löschen?',
      intro: 'Das löscht sofort und endgültig:',
      items: [
        'deine Anmeldung (E-Mail-Adresse und Passwort oder deine Google-Anmeldung),',
        'deinen Benutzernamen, Avatar, deine Bilanz, Erfolge und Wertungen,',
        'deine Freunde, Freundschaftsanfragen und Spieleinladungen,',
        'deine Altersangabe, Einwilligungen und E-Mail-Einstellungen.',
      ],
      note: 'Deine gespielten Online-Partien bleiben für die anderen Spieler erhalten, mit „Gelöschter Spieler“ auf deinem Platz. Aus einer noch nicht begonnenen Partie wird dein Platz entfernt; in einer laufenden Partie spielt ein Bot deinen Platz zu Ende. Deine Gastdaten in diesem Browser bleiben, bis du sie löschst.',
      typeToConfirm: (name: ReactNode): ReactNode => <>Gib zur Bestätigung deinen Benutzernamen {name} ein</>,
    },
    notifications: {
      guest: 'Melde dich an, um zu wählen, welche E-Mails du bekommst. Gäste bekommen nie E-Mails.',
      loading: 'Deine E-Mail-Einstellungen werden geladen…',
      intro: 'Konto-E-Mails (Adresse bestätigen, Passwort zurücksetzen) werden immer gesendet. Alles andere entscheidest du; Bronze verschickt davon noch nichts.',
      lists: {
        marketing: { label: 'Neuigkeiten zu Bronze', description: 'Neue Funktionen und Events. Nur mit deiner Einwilligung und nie an unter 18-Jährige.' },
        friends: { label: 'Freundes-E-Mails', description: 'Wenn dir jemand eine Freundschaftsanfrage schickt.' },
        tournaments: { label: 'Turnier-E-Mails', description: 'Erinnerungen an Turniere, bei denen du dabei bist.' },
      },
      from18: 'Ab 18 verfügbar.',
      nowAdult: 'Ich bin jetzt 18 oder älter',
    },
    privacy: {
      cookies: 'Cookies',
      cookiesNote: 'Bronze speichert nur, was es zum Funktionieren braucht. Keine Werbung, Analyse oder Tracking.',
      open: 'Lesen',
    },
  },
  settings: {
    reset: 'Zurücksetzen',
    game: 'Spiel',
    animationSpeed: 'Animationstempo',
    animationHint: 'Aufblitzen und der Lieferpunkt auf dem Brett.',
    aiSpeed: 'Computertempo',
    aiSpeedHint: 'Die Pause zwischen den Aktionen eines Computerspielers.',
    speeds: { slow: 'Langsam', normal: 'Normal', fast: 'Schnell', off: 'Aus' },
    moveTimer: 'Zugtimer',
    moveTimerHint: 'Jeder Zug hat ein Zeitlimit; läuft es ab, verfällt der Rest des Zugs. Aus: ohne Zeitlimit spielen.',
    showLog: 'Partieprotokoll anzeigen',
    audio: 'Audio',
    sound: 'Ton',
    masterVolume: 'Gesamtlautstärke',
    musicVolume: 'Musiklautstärke',
    general: 'Allgemein',
    language: 'Sprache',
    account: 'Konto',
    notifications: 'Benachrichtigungen',
    privacy: 'Datenschutz',
  },
  cookieBanner: {
    title: 'Cookies und Speicher',
    body: 'Bronze speichert in diesem Browser nur, was es zum Funktionieren braucht: deine Anmeldung, deine laufende Partie und deine Einstellungen. Keine Werbung, keine Analyse, kein Tracking – daher gibt es nichts zu akzeptieren oder abzulehnen.',
    ok: 'OK',
    cookiePolicy: 'Cookie-Richtlinie',
    privacyPolicy: 'Datenschutzerklärung',
    language: 'Sprache',
  },
  legal: {
    lastUpdated: 'Zuletzt aktualisiert:',
    translationNote: 'Diese Übersetzung dient Ihrer Bequemlichkeit. Weicht sie vom englischen Text ab, gilt die englische Fassung.',
    draft: (example: ReactNode): ReactNode => <>Entwurf: Einige Angaben dazu, wer Bronze betreibt, fehlen noch (so markiert: {example}).</>,
    table: (caption: string) => `${caption} (Tabelle)`,
    freeToPlay: 'Bronze ist kostenlos; es wird nichts verkauft.',
    fanMade: 'Bronze ist ein von Fans gemachtes Spiel, inspiriert von Brass. Nicht mit Roxley Games verbunden.',
  },
  ...accountWords,
  brass: brassWords,
  welcome: welcomeWords,
  online: onlineWords,
  tutorial: tutorialWords,
}

export default de
