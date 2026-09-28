import type { ReactNode } from 'react'
import type { Quote } from '../game/engine'
import type { GameMessage } from '../game/messages'
import type { RULES } from '../game/rules'
import type { GoodsKind, IndustryKind, LogEntry, RouteKind } from '../game/types'
import { renderWith } from './game/en'
import game from './game/lt'
import { pluralizer } from './languages'
import accountWords from './account/lt'
import brassWords from './brass/lt'
import type { Messages } from './messages'

/* Visi ekrano žodžiai lietuviškai (vertimas iš en.tsx). */

type Rules = typeof RULES
type Cost = { money: number; coal: number; iron: number }
type Era = 'canal' | 'rail'

const p = pluralizer('lt-LT')
const you = 'Jūs'

const list = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ir ${items.at(-1)}`)
const or = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} arba ${items.at(-1)}`)
const goodsOf: Record<GoodsKind, string> = { cotton: 'medvilnės', coal: 'anglies', iron: 'geležies' }
/** „3 vnt. medvilnės“ */
const amountOf = (n: number, goods: GoodsKind) => `${n} vnt. ${goodsOf[goods]}`

const industries: Messages['industries'] = {
  coal: { name: game.industries.coal, output: (r: Rules) => `+1 vnt. anglies į jūsų atsargas kas raundą (iki ${r.storeCap}; perteklius parduodamas po £${r.coalOverflowValue})` },
  iron: { name: game.industries.iron, output: (r: Rules) => `+1 vnt. geležies į jūsų atsargas kas raundą (iki ${r.storeCap}; perteklius parduodamas po £${r.ironOverflowValue})` },
  cotton: { name: game.industries.cotton, output: (r: Rules) => `+1 vnt. medvilnės fabrike kas raundą (telpa ${r.goodsCapacity})` },
  port: { name: game.industries.port, output: (r: Rules) => `+£${r.portIncome} kas raundą. Perka medvilnę po £${r.portPrice}; kiti jums moka po £${r.portFee} už vienetą` },
  shipyard: { name: game.industries.shipyard, output: () => '+1★ kas raundą' },
}

const lower = (kind: IndustryKind) => industries[kind].name.toLowerCase()
const routeKind = (kind: RouteKind) => (kind === 'canal' ? 'kanalas' : 'geležinkelis')

const lt: Messages = {
  common: {
    you,
    player: (n: number) => `Žaidėjas ${n}`,
    close: 'Uždaryti',
    closeNamed: (title: string) => `Uždaryti: ${title}`,
    dismiss: 'Paslėpti',
    done: 'Gatava',
    cancel: 'Atšaukti',
    back: 'Atgal',
    logIn: 'Prisijungti',
    logOut: 'Atsijungti',
    register: 'Registruotis',
    logInToUse: 'Prisijunkite, kad naudotumėte',
    logInToUseNote: '(reikia prisijungti)',
    comingSoon: 'Netrukus',
    notAvailable: 'nepasiekiama',
    skipToContent: 'Pereiti prie turinio',
  },
  brand: {
    home: 'Bronze: pagrindinis meniu',
    tagline: 'Statyk · Junk · Industrializuok',
  },
  nav: {
    lobby: 'Laukiamasis',
    main: 'Pagrindinė navigacija',
    mainMenu: 'Pagrindinis meniu',
    play: 'Žaisti',
    tournaments: 'Turnyrai',
    locker: 'Spintelė',
    shop: 'Parduotuvė',
    achievements: 'Pasiekimai',
    board: 'Žemėlapio lenta',
    howToPlay: 'Kaip žaisti',
    settings: 'Nustatymai',
    credits: 'Autoriai',
    legal: 'Teisinė informacija',
    profile: 'Profilis',
    more: 'Daugiau',
    closeMore: 'Uždaryti meniu',
    account: 'Paskyra',
    accountMenu: (name: string, record: string) => `${name}: ${record}. Paskyros meniu`,
    yourProfile: (name: string, record: string) => `${name}: ${record}. Jūsų profilis`,
    checkingAccount: 'Tikrinama jūsų paskyra',
    retryAccount: 'Bandyti vėl',
    retryAccountTip: 'Dar kartą įkelti paskyrą',
    privacy: 'Privatumo politika',
    terms: 'Paslaugų teikimo sąlygos',
    refunds: 'Pinigų grąžinimo politika',
    cookies: 'Slapukų politika',
    legalNotice: 'Rekvizitai',
    dataRequest: 'Duomenų užklausos',
  },
  record: (wins: number, matches: number) =>
    `${p(wins, { one: `${wins} pergalė`, few: `${wins} pergalės`, other: `${wins} pergalių` })} · ${p(matches, { one: `${matches} partija`, few: `${matches} partijos`, other: `${matches} partijų` })}`,
  list,
  or,
  amountOf,
  stats: {
    wins: 'Pergalės',
    bestScore: 'Geriausias rezultatas',
    matches: 'Partijos',
    goodsShipped: 'Išgabenta prekių',
    saveFailed: 'Nepavyko išsaugoti jūsų rezultatų paskyroje. Jie laikomi šiame įrenginyje ir bus išsaugoti kitą kartą prisijungus.',
    guestMoved: 'Jūsų svečio pažanga perkelta į paskyrą.',
  },
  lobby: {
    tournamentsTeaser: 'Reitinginės lentelės ir sezono taurės.',
    achievementsUnlocked: 'Atrakinti pasiekimai',
    next: 'Toliau:',
    allAchievements: 'Atrakinti visi pasiekimai.',
    outdatedTitle: 'Išsaugotos partijos tęsti negalima',
    outdatedBody: 'Ji išsaugota senesne Bronze versija, kurios taisyklės pasikeitė.',
    discard: 'Išmesti',
    gameMode: 'Žaidimo režimas',
    social: 'Draugai ir pažanga',
    continueMatch: 'Tęsti partiją',
    abandon: 'Nutraukti',
    resume: 'Tęsti',
    abandoned: 'Partija nutraukta',
    opponentsTitle: 'Varžovai',
    mixed: 'Pasirinktinai: žmonės ir kompiuteriai (žr. Vietas)',
    opponents: { computer: 'Prieš kompiuterį', pass: 'Perduok ir žaisk', online: 'Internetu' },
    onlineNeedsServer: 'Žaidimui internetu reikia žaidimų serverio, kurio Bronze kol kas neturi',
  },
  friends: {
    title: 'Draugai',
    addByUsername: 'Pridėti draugą pagal vartotojo vardą',
    add: 'Pridėti draugą',
    none: 'Draugų dar nėra',
    noServer:
      'Draugų sąrašams ir partijoms internetu reikia žaidimų serverio, o Bronze jo dar neturi. Kol kas žaiskite prieš kompiuterį arba perduodami šį įrenginį.',
    guest: 'Prisijunkite, kad galėtumėte pridėti draugų. Kol kas žaiskite prieš kompiuterį arba perduodami šį įrenginį.',
    online: 'Prisijungę',
    pending: 'Laukia',
  },
  modes: {
    normal: { name: 'Įprastas', description: 'Visas žemėlapis, visos taisyklės. Visa pramonės saga.' },
    blitz: { name: 'Blicas', description: 'Mažesnis žemėlapis ir trumpesnis laikas. Svarbus kiekvienas sprendimas.' },
    bullet: { name: 'Kulka', description: 'Mažiausias žemėlapis, labai trumpas laikas. Statyk iš nuojautos.' },
    mapSize: { full: 'Visas žemėlapis', reduced: 'Sumažintas žemėlapis', compact: 'Kompaktiškas žemėlapis' },
    perTurn: (time: string) => `${time} ėjimui`,
  },
  maps: {
    'wales-and-the-west': {
      terrain: 'Kanalai ir geležinkeliai',
      flavor: 'Velso anglis, Midlandso dirbtuvės ir Severno uostai. Pirma kaskite kanalus, paskui lenktyniaukite tiesdami geležinkelius.',
    },
    'mersey-valley': { terrain: 'Upė ir uostas', flavor: 'Plati potvynių upė maitina judrų uostą. Plukdykite prekes pasroviui anksčiau už varžovus.' },
    'black-country': { terrain: 'Anglis ir geležis', flavor: 'Anglies klodai, liejyklos ir kanalų raizgalynė. Ankšta, negailestinga ir švyti visą naktį.' },
    'pennine-mills': { terrain: 'Viržynai ir fabrikai', flavor: 'Fabrikų miesteliai tarp vėjuotų viržynų. Srauni tėkmė, statūs šlaitai ir mažai lengvų kelių.' },
  },
  setup: {
    title: 'Partijos nustatymai',
    rounds: (n: number) => p(n, { one: `${n} raundas`, few: `${n} raundai`, other: `${n} raundų` }),
    moneyEach: (n: number) => `po £${n}`,
    railFrom: (round: number) => `geležinkelių era nuo ${round} raundo`,
    map: 'Žemėlapis',
    practiceMap: 'Treniruočių žemėlapis, be erų.',
    players: 'Žaidėjai',
    playersRange: (min: number, max: number) => (min === max ? `${min} žaidėjai` : `${min}–${max} žaidėjai`),
    towns: (n: number) => p(n, { one: `${n} miestas`, few: `${n} miestai`, other: `${n} miestų` }),
    mapTakes: (map: string, min: number, max: number) => `${map}: ${min}–${max} žaidėjai`,
    seats: 'Vietos',
    seatName: (seat: number) => `${seat} vietos vardas`,
    playedBy: (seat: number) => `Kas žaidžia ${seat} vietoje`,
    human: 'Žmogus',
    ai: 'DI',
    seatColour: (seat: number) => `${seat} vietos spalva`,
    colourSwapLabel: (colour: string, seat: number) => `${colour} (sukeisti su ${seat} vieta)`,
    colourSwapTitle: (colour: string, seat: number) => `${colour}: užima ${seat} vieta; pasirinkus spalvos sukeičiamos`,
    difficulty: (seat: number) => `${seat} vietos sunkumas`,
    humanSeats: 'Žmonės žaidžia paeiliui šiame įrenginyje (perduok ir žaisk).',
    advancedSeed: 'Išplėstiniai: sėkla',
    seedLabel: 'Sėkla (nebūtina)',
    random: 'Atsitiktinė',
    seedHelp: 'Ta pati sėkla ir vietos pakartoja tuos pačius kompiuterio ėjimus. Palikite tuščią naujai partijai.',
    seedInvalid: 'Sėkla yra sveikasis skaičius iki 9 skaitmenų.',
    replaces: 'Pradėjus naują partiją, vykstanti partija bus pakeista.',
    start: 'Pradėti partiją',
  },
  colors: { yellow: 'Geltona', blue: 'Mėlyna', purple: 'Violetinė', red: 'Raudona', white: 'Balta' },
  aiLevels: { easy: 'Lengvas', normal: 'Vidutinis', hard: 'Sunkus' },
  pages: {
    shop: {
      title: 'Parduotuvė',
      empty: 'Lentynos pildomos.',
      blurb: 'Kosmetinės lentos, pastatų išvaizdos ir žetonų rinkiniai, ką tik iš liejyklos.',
      locked: 'Pirkiniai susieti su jūsų paskyra: prisijunkite, kad galėtumėte pirkti ir juos išsaugoti.',
    },
    locker: {
      title: 'Spintelė',
      empty: 'Jūsų spintelė tuščia — laimėkite partiją ir gaukite pirmąsias detales.',
      blurb: 'Aprenkite savo pramonininką ir išsirinkite žetonus, lentos apdailą ir vėliavas.',
      locked: 'Spintelė priklauso jūsų paskyrai: prisijunkite, kad surinkti daiktai liktų jūsų.',
    },
    tournaments: {
      title: 'Turnyrai',
      empty: 'Parodų salėje tylu. Užsukite vėliau.',
      blurb: 'Reitinginės lentelės ir sezono taurės patiems ambicingiausiems pramonininkams.',
      locked: 'Turnyrai žaidžiami su jūsų paskyra: prisijunkite, kad galėtumėte dalyvauti.',
    },
    achievements: { empty: 'Garbės ženklų ant sienos dar nėra. Jūsų laukia pirmoji pergalė.' },
  },
  achievements: {
    yourRecord: 'Jūsų rezultatai',
    unlocked: (total: number) => `${total} atrakinta`,
    savedAccount: 'Išsaugota jūsų paskyroje.',
    savedDevice: 'Išsaugota tik šiame įrenginyje.',
    logInToSave: 'Prisijunkite, kad išsaugotumėte paskyroje',
    unlockedOn: (date: string) => `Atrakinta ${date}`,
    list: {
      'first-shift': { name: 'Pirmoji pamaina', description: 'Užbaikite partiją.' },
      foreman: { name: 'Meistras', description: 'Laimėkite partiją.' },
      'quick-draw': { name: 'Greita ranka', description: 'Laimėkite partiją režimu „Kulka“.' },
      'full-house': { name: 'Pilni namai', description: 'Laimėkite keturių žaidėjų partiją.' },
      'merchant-fleet': { name: 'Prekybos laivynas', description: 'Per vieną partiją išgabenkite 12 prekių.' },
      'iron-web': { name: 'Geležinis tinklas', description: 'Per vieną partiją turėkite 6 jungtis.' },
      'engine-room': { name: 'Laivų meistras', description: 'Per vieną partiją pastatykite 2 laivų statyklas.' },
      tycoon: { name: 'Magnatas', description: 'Surinkite 55 ar daugiau taškų per partiją.' },
      'grand-tour': { name: 'Didžioji kelionė', description: 'Užbaikite partiją kiekviename žemėlapyje.' },
      veteran: { name: 'Veteranas', description: 'Užbaikite 10 partijų.' },
    },
  },
  profile: {
    locked: 'Profilis saugo jūsų vartotojo vardą, rezultatus ir pasiekimus paskyroje, bet kuriame įrenginyje.',
    memberSince: (date: string) => `Narys nuo ${date}`,
  },
  notFound: {
    title: 'Ši linija dar nenutiesta',
    body: 'Šiuo adresu nieko nėra.',
    back: 'Atgal į laukiamąjį',
  },

  game,
  gameMessage: (message: GameMessage) => renderWith(game, message),
  logEntry: (entry: LogEntry) => (entry.msg ? renderWith(game, entry.msg) : entry.text),
  cost: (c: Cost) => game.cost(c),
  quote: (q: Quote) => {
    const bought = [q.coalBought && amountOf(q.coalBought, 'coal'), q.ironBought && amountOf(q.ironBought, 'iron')].filter(Boolean)
    const used = [q.coalUsed && amountOf(q.coalUsed, 'coal'), q.ironUsed && amountOf(q.ironUsed, 'iron')].filter(Boolean)
    const notes = [bought.length ? `perkama ${bought.join(' + ')}` : '', used.length ? `naudojama jūsų ${used.join(' + ')}` : ''].filter(Boolean).join(', ')
    return `£${q.total}${notes ? ` (${notes})` : ''}`
  },
  industries,
  actions: {
    buildIndustry: 'Statyti pramonę',
    from: (n: number) => `Nuo £${n}`,
    buildLink: 'Tiesti jungtį',
    ship: 'Gabenti',
    sourcesReady: (n: number) => p(n, { one: `Paruoštas ${n} šaltinis`, few: `Paruošti ${n} šaltiniai`, other: `Paruošta ${n} šaltinių` }),
    raiseFunds: 'Sutelkti lėšų',
    endTurn: 'Baigti ėjimą',
    skipsLast: 'Praleidžia paskutinį veiksmą',
    skipsBoth: 'Praleidžia abu veiksmus',
    canalCost: (money: number) => `Kanalas £${money}`,
    railwayCost: (quote: string) => `Geležinkelis ${quote}`,
    bothCosts: (canal: number, rail: number) => `Kanalas £${canal} · Geležinkelis £${rail} + anglis`,
    cancelAction: 'Atšaukti šį veiksmą',
    buildAnIndustry: 'Statyti pramonę',
    buildHint: 'Pasirinkite, ką statyti. Į kainas įskaičiuota jums perkama anglis ar geležis.',
    buildA: (kind: IndustryKind) => `Statyti: ${lower(kind)}`,
    buildWhere: (quote: string, prestige: number): ReactNode => (
      <>
        {quote}, +{prestige}★. <strong className="text-brass-200">Spustelėkite švytintį sklypą</strong> lentoje arba pasirinkite čia.
      </>
    ),
    slot: (n: number) => `${n} sklypas`,
    buildALink: 'Tiesti jungtį',
    linkHint: (era: Era | null, canal: number, rail: number, coalPrice: number, prestige: number): ReactNode => (
      <>
        {era === 'canal'
          ? `Kanalų era: kanalas kainuoja £${canal}.`
          : era === 'rail'
            ? `Geležinkelių era: geležinkelis kainuoja £${rail} + 1 vnt. anglies (nuperkama už £${coalPrice}, jei neturite).`
            : `Kanalai £${canal}; geležinkeliai £${rail} + 1 vnt. anglies.`}{' '}
        +{prestige}★. <strong className="text-brass-200">Spustelėkite švytintį burbulą</strong> arba pasirinkite čia.
      </>
    ),
    routeKind: { canal: 'kanalas', rail: 'geležinkelis' },
    inStore: (goods: string) => `${goods} jūsų atsargose`,
    shipHint: (
      <>
        Pasirinkite, ką gabenti: fabriko medvilnę arba visą anglį ar geležį iš atsargų iš vienos savo kasyklų ar liejyklų.{' '}
        <strong className="text-brass-200">Švytintys langeliai</strong> lentoje taip pat tinka.
      </>
    ) as ReactNode,
    shipLoad: (goods: string) => `Gabenti ${goods}`,
    shipFrom: (source: string): ReactNode => (
      <>
        Iš: {source}. <strong className="text-brass-200">Spustelėkite švytinčią rinką</strong> lentoje arba pasirinkite čia, kad pamatytumėte, kiek ji moka.
      </>
    ),
    cantPayFees: (n: number) => `Negalite sumokėti £${n} rinkliavų ir mokesčių`,
    sameTown: 'tas pats miestas',
    links: (n: number) => p(n, { one: `${n} jungtis`, few: `${n} jungtys`, other: `${n} jungčių` }),
    cantAffordTolls: 'Neužtenka rinkliavoms',
    revenue: 'Pajamos',
    tolls: 'Rinkliavos',
    ownLinksOnly: 'Tik jūsų jungtys',
    portFee: 'Uosto mokestis',
    feePerUnit: (fee: number, owner: string) => `£${fee} už vienetą: ${owner}`,
    youGet: 'Gaunate',
    prestige: 'Prestižas',
    doubled: (n: number) => `dvigubai: ${p(n, { one: `${n} jungtis`, few: `${n} jungtys`, other: `${n} jungčių` })}`,
    shipTo: (market: string) => `Gabenti į: ${market}`,
    shipSummary: (goods: string, from: string, routes: string[], drop: { market: string; price: number } | null) =>
      `${goods} iš: ${from}${routes.length ? `, per ${routes.join(', ')}` : ''}.${drop ? ` Tada ${drop.market} kaina nukris iki £${drop.price}.` : ''}`,
    confirmShipment: 'Patvirtinti gabenimą',
  },
  match: {
    final: 'Pabaiga',
    roundOf: (round: number, total: number) => `Raundas ${round}/${total}`,
    actionsLeft: (left: number, total: number) => `Liko ${left} iš ${total} veiksmų`,
    actionsLeftTitle: 'Šio ėjimo likę veiksmai',
    board: 'Lenta',
    actions: 'Veiksmai',
    seeResults: 'Rezultatai',
    waitingFor: (name: string) => `Laukiama, kol ${name} paims įrenginį…`,
    panels: 'Partijos skydeliai',
    players: 'Žaidėjai',
    markets: 'Rinkos',
    log: 'Žurnalas',
    matchLog: 'Partijos žurnalas',
    yourTurn: 'Jūsų ėjimas',
    passTo: (name: string) => `Perduokite: ${name}`,
    handOver: 'Perduokite įrenginį, tada pradėkite ėjimą. Laikmatis laukia.',
    startYourTurn: 'Pradėti savo ėjimą',
    startTurnOf: (name: string) => `Pradėti ėjimą: ${name}`,
    over: 'Partija baigta',
    isPlaying: (name: string) => `Žaidžia ${name}`,
    turnOf: (name: string) => `Ėjimas: ${name}`,
    actionOf: (n: number, total: number) => `veiksmas ${n} iš ${total}`,
    fastForward: 'Pagreitinti',
    fastForwardTitle: 'Leisti kompiuteriui žaisti be pauzių',
    aiLevel: (level: string) => `${level} DI`,
    choosing: 'renkasi veiksmą.',
    last: (text: string) => `Paskutinis: ${text}`,
    canalEraTitle: (round: number) => `Kanalų era: geležinkelių era prasidės ${round} raunde`,
    railEraTitle: 'Geležinkelių era: kanalai uždaryti',
    era: { canal: 'Kanalų era', rail: 'Geležinkelių era' },
    menu: 'Partijos meniu',
    legal: 'Teisinė informacija ir privatumas',
    saved: 'Partija išsaugoma po kiekvieno veiksmo.',
    timerLabel: (secs: number, paused: boolean) => `Šiam ėjimui liko ${secs} s${paused ? ', sustabdyta' : ''}`,
    timerPaused: 'Laikmatis sustabdytas',
    timeLeft: 'Šiam ėjimui likęs laikas',
    eraBanner: {
      title: 'Prasideda geležinkelių era — kanalai uždaromi',
      removed: (n: number) =>
        n === 0 ? 'Kanalų nebuvo iškasta.' : p(n, { one: `Pašalinta ${n} kanalo jungtis.`, few: `Pašalintos ${n} kanalų jungtys.`, other: `Pašalinta ${n} kanalų jungčių.` }),
      opens: (places: string) => `Dabar galima tiesti geležinkelius; atsiveria ${places}.`,
      clickToContinue: 'Spustelėkite, kad tęstumėte',
    },
  },
  playersPanel: {
    turn: 'Ėjimas',
    prestigeTitle: 'Kol kas uždirbtas prestižas',
    money: 'Pinigai',
    coal: 'Anglis',
    iron: 'Geležis',
    industries: 'Pram.',
    industriesTitle: (n: number) => p(n, { one: `Turima ${n} pramonės įmonė`, few: `Turimos ${n} pramonės įmonės`, other: `Turima ${n} pramonės įmonių` }),
    links: 'Jungtys',
    linksTitle: (n: number, built: number) => `Dabar turima jungčių: ${n} (iš viso nutiesta ${built})`,
    ifEnded: 'Jei baigtųsi',
    ifEndedTitle: (prestige: number, money: number, hubs: number) => `Rezultatas, jei partija baigtųsi dabar: ${prestige}★ + ${money} už pinigus + ${hubs} už mazgus`,
  },
  marketsPanel: {
    buys: (goods: string) => `Perka: ${goods}`,
    down: (base: number, recovery: number) => `Nukrito nuo £${base}; atsigauna po £${recovery} per raundą`,
    full: 'Pilna kaina',
    note: (r: Rules, ports: string[]) =>
      `Kiekvienas parduotas vienetas mazgo kainą sumažina £${r.priceDropPerGoods} (ne mažiau nei £${r.priceFloor}). Uostai perka medvilnę už pastovią £${r.portPrice} kainą${
        ports.length ? `: ${ports.join(', ')}.` : '; kol kas nė vieno nepastatyta.'
      }`,
  },
  results: {
    title: 'Rezultatai',
    shared: (names: string[]) => `Bendra pergalė: ${names.join(' ir ')}`,
    youWin: 'Jūs laimėjote!',
    wins: (name: string) => `Laimėjo ${name}`,
    nobody: 'Niekas',
    rematch: 'Revanšas',
    formula: 'Iš viso = žaidžiant uždirbti ★ + 1★ už kiekvienus turimus £5 + 2★ už kiekvieną mazgą jūsų tinkle. Lygiųjų atveju laimi turtingesnis.',
    finalScores: 'Galutiniai rezultatai',
    player: 'Žaidėjas',
    playStars: 'Žaidimo ★',
    moneyBonus: 'Premija už pinigus',
    hubBonus: 'Premija už mazgus',
    total: 'Iš viso',
    stats: 'Partijos statistika',
    linksBuilt: 'Nutiesta jungčių',
    industries: 'Pramonė',
    achievementsUnlocked: 'Atrakinti pasiekimai',
  },
  zoom: {
    group: (label: string) => `${label}: mastelis`,
    in: 'Priartinti',
    out: 'Nutolinti',
    reset: 'Rodyti visą lentą',
  },
  boardLabels: {
    gameBoard: 'Žaidimo lenta',
    mapAlt: 'Iliustruotas Velso, Midlandso ir Pietvakarių Anglijos žemėlapis',
    route: (from: string, to: string, kind: RouteKind) => `${routeKind(kind)} ${from}–${to}`,
    buildRoute: (route: string, cost: string) => `Tiesti: ${route}, ${cost}`,
    routeTitle: (from: string, to: string, kind: RouteKind, owner: string | null) => `${from} – ${to} (${routeKind(kind)}${owner ? `, ${owner}` : ''})`,
    link: (from: string, to: string, era: Era, extra: string | null) => `${from}–${to} (${routeKind(era)})${extra ? `: ${extra}` : ''}`,
    shipTo: (town: string, pays: string) => `Gabenti į ${town}: ${pays}`,
    townTitle: (town: string, price: number | null) => (price === null ? town : `${town} — prekybos miestas, perka medvilnę, anglį ir geležį po £${price} už vienetą`),
    slotFree: (town: string, n: number, kinds: IndustryKind[]) => `${town}, ${n} sklypas: ${or(kinds.map(lower))}, laisvas`,
    slotBuilt: (town: string, n: number, owner: string, kind: IndustryKind, cotton: number | null) =>
      `${town}, ${n} sklypas: ${lower(kind)} (${owner === you ? 'jūsų' : owner})${cotton !== null ? `, ${amountOf(cotton, 'cotton')}` : ''}`,
    builtBy: (name: string) => `nutiesė ${name}`,
    notBuilt: 'dar nenutiesta',
  },
  tooltip: {
    connections: 'Jungtys',
    linkType: { canal: 'Kanalas', rail: 'Geležinkelis', both: 'Kanalas ir geležinkelis' },
    eraOnly: { canal: 'kanalų era', rail: 'geležinkelių era' },
    city: (region: string) => `Miestas · ${region}`,
    stop: 'Stotelė · trasos eina pro šalį; negalima statyti ar prekiauti',
    hub: 'Prekybos mazgas · čia parduodamos prekės',
    railOnly: 'Prieinama geležinkelių eroje',
    owned: (owner: string, kind: IndustryKind) => `${industries[kind].name} (${owner === you ? 'jūsų' : owner})`,
    buys: 'Perka:',
    priceNow: 'Dabartinė kaina:',
    priceRule: (max: number) => `už vienetą, £1 mažiau už kiekvieną parduotą vienetą (atsigauna po £1 per raundą, iki £${max})`,
    both: (era: Era) => `Kanalas ir geležinkelis · šioje eroje ${routeKind(era)}`,
    only: (kind: Era) => (kind === 'canal' ? 'Tik kanalas' : 'Tik geležinkelis'),
    builtBy: (era: Era, name: string) => `${era === 'canal' ? 'Kanalą iškasė' : 'Geležinkelį nutiesė'} ${name}`,
  },
  mapBoard: {
    editMap: 'Redaguoti žemėlapį',
    doneEditing: 'Baigti redaguoti',
    draftNote: 'Rodoma neišsaugota kalibracija iš šios naršyklės. Atverkite redagavimo režimą, kad ją eksportuotumėte ar atmestumėte.',
    era: 'Era',
    eraNote: (era: Era, railOnly: string) =>
      `Rodomos tik šios eros jungtys: ${era === 'canal' ? 'kanalai, o bendros jungtys – kaip kanalai' : 'geležinkeliai, o bendros jungtys – kaip geležinkeliai'}. ${railOnly} pasiekiami tik geležinkelių eroje.`,
    sandbox: 'Smėlio dėžė',
    tool: 'Įrankis',
    inspect: 'Apžiūrėti',
    place: 'Dėlioti langelius',
    placeFor: 'Dėlioti žaidėjui',
    inspectHint: 'Spustelėkite vietą, sklypą ar jungties žymeklį, kad pamatytumėte informaciją.',
    placeHint: 'Spustelėkite sklypą, kad jame statytumėte (dar kartą – pakeisti pramonę, dar – išvalyti), arba jungties žymeklį, kad ją užimtumėte.',
    preview: 'Tai tik peržiūra, kaip atrodo statiniai, o ne partija.',
    clear: 'Išvalyti langelius',
    selected: 'Pasirinkta',
    regions: 'Regionai',
    stopKey: 'Stotelė (negalima statyti ar prekiauti)',
    hubKey: 'Prekybos mazgas',
    nothing: 'Dar nieko nepasirinkta.',
    usable: (active: boolean, era: Era) => `${active ? 'naudojama' : 'uždaryta'}: ${era === 'canal' ? 'kanalų era' : 'geležinkelių era'}`,
    bends: (n: number) => (n === 0 ? 'automatinis lenkimas' : p(n, { one: `${n} lenkimo taškas`, few: `${n} lenkimo taškai`, other: `${n} lenkimo taškų` })),
    stop: 'Stotelė',
    hub: 'Prekybos mazgas',
    offset: (x: number, y: number) => `lentelės poslinkis ${x}%, ${y}%`,
    startsAt: (price: number) => `pradinė kaina £${price}`,
  },
  rules: {
    title: 'Taisyklės',
    goal: {
      title: 'Tikslas',
      body: (r: Rules): ReactNode => (
        <>
          Turėti didžiausią sumą pasibaigus paskutiniam raundui: žaidžiant <strong className="text-brass-300">uždirbtus ★</strong>, plius 1★ už kiekvienus turimus £
          {r.moneyPerPrestige}, plius {r.hubBonus}★ už kiekvieną prekybos mazgą jūsų tinkle. Lygiųjų atveju laimi turtingesnis žaidėjas; jei ir pinigų vienodai,
          pergalė dalijama.
        </>
      ),
    },
    setup: {
      title: 'Pasiruošimas ir režimai',
      body: (maxPlayers: number) =>
        `2–${maxPlayers} žaidėjai, kiekvienas žmogus arba kompiuteris (lengvas, vidutinis ar sunkus), kiekvienas savos spalvos. Visi pradeda su režimo pinigais, be anglies, be geležies ir be ★. 1 raundas žaidžiamas vietų tvarka; kiekvieną raundą pirmoji vieta pasislenka per vieną.`,
      columns: ['Režimas', 'Žemėlapis', 'Raundai', 'Geležinkelių era nuo', 'Pinigai', 'Ėjimo laikas'],
      rings: { full: 'Visas žemėlapis', reduced: '1–2 žiedai', compact: 'Tik 1 žiedas' },
      round: (n: number) => `${n} raundo`,
      faded: 'Vietos už režimo žiedų ir jų jungtys rodomos blankiai ir partijoje nedalyvauja. Laikmatį galima išjungti nustatymuose.',
    },
    turn: {
      title: (n: number) => `Jūsų ėjimas: ${n} veiksmai`,
      intro: 'Ėjimą galite baigti anksčiau. Jei baigiasi ėjimo laikas, likę veiksmai prarandami.',
      build: {
        name: 'Statyti pramonę',
        body: (railOnly: string) =>
          `Laisvame tinkamame sklype, jūsų tinklo mieste. Pirmąjį statinį partijoje galite statyti bet kur. Kanalų eroje nieko negalima statyti šiose vietose: ${railOnly}. Sumokėkite kainą ir gaukite pramonės ★.`,
      },
      link: {
        name: 'Tiesti jungtį',
        body: (canal: string, rail: string, prestige: number) =>
          `Nenutiesta trasa, egzistuojanti dabartinėje eroje ir liečianti jūsų tinklą (iki pirmojo statinio – bet kur). Kanalas kainuoja ${canal}; geležinkelis ${rail}. +${prestige}★, ir jungtis jūsų.`,
      },
      ship: {
        name: 'Gabenti',
        intro: 'Pasirinkite vieną savo pramonės įmonių ir rinką, kurią ji pasiekia:',
        sources: [
          'medvilnės fabrikas išgabena visą savo medvilnę į mazgą, perkantį medvilnę, arba į bet kurį uostą (savo ar kito žaidėjo);',
          'anglių kasykla išgabena visą jūsų atsargų anglį į mazgą, perkantį anglį;',
          'geležies liejykla išgabena visą jūsų atsargų geležį į mazgą, perkantį geležį.',
        ],
        body: (r: Rules) =>
          `Prekės keliauja nutiestomis dabartinės eros jungtimis, bet kieno; pramonė ir rinka gali būti tame pačiame mieste. Pasirenkamas kelias su mažiausiai varžovų jungčių, paskui trumpiausias. Kiekviena varžovo jungtis kainuoja £${r.toll} rinkliavą savininkui. Mazgas už kiekvieną vienetą moka dabartinę kainą, o ji su kiekvienu parduotu vienetu krenta £${r.priceDropPerGoods} (niekada ne mažiau nei £${r.priceFloor}): kai kaina £6, trys vienetai atneša £6 + £5 + £4. Uostas moka £${r.portPrice} už vienetą; kito žaidėjo uoste jūs jam mokate £${r.portFee} už vienetą. Uždirbate +1★ už vienetą, dvigubai, jei prekės keliavo ${r.longHaulLinks} ar daugiau jungčių. Gabenti negalima, jei jūsų pinigai ir pajamos nepadengia rinkliavų ir mokesčių. Po to fabrikas arba jūsų anglies ar geležies atsargos ištuštėja.`,
      },
      funds: { name: 'Sutelkti lėšų', body: (n: number) => `Gaukite £${n}.` },
      end: { name: 'Baigti ėjimą', body: 'Iš karto baigia jūsų ėjimą.' },
    },
    industries: {
      title: 'Pramonė',
      emptyStore: (total: number) => `(£${total}, jei atsargos tuščios)`,
      supply: (r: Rules) =>
        `Trūkstama anglis ir geležis jums nuperkama iš bendro sandėlio: £${r.coalPrice} už anglies vienetą, £${r.ironPrice} už geležies vienetą. Žaidime rodomose kainose tai įskaičiuota. Jūsų atsargose telpa iki ${r.storeCap} vnt. anglies ir ${r.storeCap} vnt. geležies; tai, ką kasyklos ir liejyklos pagamina viršijant, parduodama po £${r.coalOverflowValue} už anglį ir £${r.ironOverflowValue} už geležį.`,
    },
    network: {
      title: 'Jūsų tinklas',
      body: 'Kiekvienas miestas, kuriame turite pramonės įmonę, plius abu kiekvienos jūsų jungties galai. Mazgai ir stotelės laikomi miestais. Bet kur statyti galite tik iki pirmojo statinio. Jei vėliau jūsų tinklas sunaikinamas (pavyzdžiui, turėjote tik kanalus, o geležinkelių era juos pašalino), vis tiek statote šalia bet kurio miesto, kuriame turite pramonės įmonę; jei ir jų neturite, vėl galite statyti bet kur, ir žurnale tai parašoma.',
    },
    roundEnd: {
      title: 'Kiekvieno raundo pabaiga',
      steps: (r: Rules) => [
        'Pramonė gamina (žr. aukščiau).',
        `Kiekvienas žaidėjas gauna £${r.baseIncome}.`,
        `Kiekvieno mazgo kaina atsigauna £${r.priceRecovery}, iki pradinės kainos.`,
        'Jei kitą raundą prasideda geležinkelių era, visos kanalų jungtys pašalinamos. Savininkai pasilieka uždirbtus ★, o pramonė lieka.',
        'Po paskutinio raundo partija baigiasi ir suskaičiuojami taškai.',
      ],
    },
    eras: {
      title: 'Eros ir lenta',
      body: (railOnly: string) =>
        `Partija prasideda kanalų eroje. Lentoje rodomas tik dabartinės eros tinklas: pirma kanalų trasos ir bendros trasos kaip kanalai, paskui geležinkelių trasos ir bendros trasos kaip geležinkeliai. ${railOnly} (pažymėti garvežiu) pasiekiami tik geležinkeliu, todėl atsiveria geležinkelių eroje.`,
      bubbleAlt: 'Tuščias jungties burbulas',
      bubble: 'Tuščias burbulas: niekieno nenutiesta jungtis. Švyti, kai galite ją nutiesti.',
      hexAlt: 'Jungties šešiakampis',
      hex: (stops: string) => `Du šešiakampiai žymi stoteles (${stops}: trasos eina pro šalį, negalima statyti ar prekiauti) ir mazgus.`,
      canalAlt: 'Nutiesto kanalo žetonas',
      canal: 'Nutiestas kanalas, savininko spalvos.',
      railAlt: 'Nutiesto geležinkelio žetonas',
      rail: 'Nutiestas geležinkelis, savininko spalvos.',
      hubsIntro: 'Prekybos mazgai ir ką jie perka (ženklelyje – dabartinė kaina):',
      hub: (price: number, buys: string, railOnly: boolean) => `pradinė kaina £${price}, perka: ${buys}${railOnly ? ' (tik geležinkelių eroje)' : ''}`,
    },
    practice: {
      title: 'Treniruočių žemėlapiai',
      body: (maps: string) =>
        `${maps} yra nupiešti žemėlapiai be erų: kanalus ir geležinkelius galima tiesti bet kada ir niekas nepašalinama. Jų prekybos miestai veikia kaip mazgai ir perka medvilnę, anglį ir geležį. Visa kita – taip pat.`,
    },
  },

  auth: {
    username: 'Vartotojo vardas',
    usernameHint: '3–20 simbolių: raidės, skaičiai ir _.',
    email: 'El. paštas',
    password: 'Slaptažodis',
    confirmPassword: 'Pakartokite slaptažodį',
    showPassword: 'Rodyti slaptažodį',
    hidePassword: 'Slėpti slaptažodį',
    strength: (label: string) => `Stiprumas: ${label}`,
    strengths: { weak: 'silpnas', ok: 'vidutinis', strong: 'stiprus' },
    available: 'Laisvas',
    taken: 'Užimtas',
    checking: 'Tikrinama…',
    usernameTaken: 'Šis vartotojo vardas užimtas.',
    usernameCheckFailed: 'Nepavyko patikrinti vartotojo vardo. Bandykite dar kartą.',
    google: 'Tęsti su „Google“',
    or: 'arba',
    registerOrLogIn: 'Registruotis arba prisijungti',
    newHere: 'Esate naujas?',
    haveAccount: 'Jau turiu paskyrą',
    keepPlaying: 'Žaisti toliau kaip svečias',
    backToLogIn: 'Atgal į prisijungimą',
    cancelSignup: 'Atšaukti registraciją',
    notConfigured: 'Paskyros dar nesukonfigūruotos. Galite žaisti toliau kaip svečias; čia niekas jūsų neprijungs.',
    welcome: (name: string | null, isNew: boolean) => (name ? `${isNew ? 'Sveiki' : 'Sveiki sugrįžę'}, ${name}!` : 'Sveiki!'),
    loggedOut: 'Atsijungta',
    passwordUpdated: 'Slaptažodis atnaujintas',
    profileFailed: 'Prisijungta, bet nepavyko įkelti jūsų profilio.',
    signupCancelled: 'Registracija atšaukta. Niekas neišsaugota.',
    signupLoggedOut: 'Atsijungta. Nebaigta registracija bus ištrinta automatiškai.',
    login: {
      intro: 'Sveiki sugrįžę, pramonininke.',
      identifier: 'Vartotojo vardas arba el. paštas',
      enterIdentifier: 'Įveskite vartotojo vardą arba el. paštą.',
      enterPassword: 'Įveskite slaptažodį.',
      remember: 'Prisiminti mane',
      forgot: 'Pamiršote slaptažodį?',
      loggingIn: 'Jungiamasi…',
      tryAgainIn: (s: number) => `Bandykite po ${s} s`,
      tooMany: (s: number) => `Per daug bandymų: palaukite ${s} sekundžių ir bandykite vėl.`,
    },
    register: {
      title: 'Sukurti paskyrą',
      create: 'Sukurti paskyrą',
      creating: 'Kuriama paskyra…',
      intro: 'Išsaugokite savo rezultatus ir pasiruoškite draugams bei žaidimui internetu.',
      googleNote: 'Ir su „Google“ prieš sukuriant paskyrą patvirtinsite savo amžių ir sutiksite su sąlygomis.',
      chooseAge: 'Pasirinkite savo amžiaus grupę.',
      mustAgree: 'Norėdami tęsti, sutikite su Sąlygomis ir Privatumo politika.',
    },
    checkEmail: {
      title: 'Patikrinkite el. paštą',
      body: (email: ReactNode): ReactNode => <>Patikrinkite el. paštą ir patvirtinkite paskyrą. Nuorodą išsiuntėme adresu {email}; atverkite ją šioje naršyklėje.</>,
      spam: 'Laiško nėra po kelių minučių? Patikrinkite šlamšto aplanką.',
      back: 'Atgal į laukiamąjį',
      again: 'Neteisingas adresas? Registruokitės iš naujo',
    },
    choose: {
      title: 'Užbaikite paskyrą',
      signedInAs: (who: string) => `Prisijungta su „Google“ kaip ${who}`,
      yourGoogle: 'jūsų „Google“ paskyra',
      intro: 'Pasirinkite vardą, kurį matys kiti žaidėjai. Jūsų Bronze paskyra sukuriama tik jums tęsiant.',
      deleteAndPlay: 'Ištrinti šį prisijungimą ir žaisti kaip svečias',
      notNow: 'Ne dabar: atšaukti ir ištrinti tai, ką pateikė „Google“',
    },
    forgot: {
      title: 'Pamiršote slaptažodį',
      intro: 'Įveskite registracijos el. pašto adresą ir atsiųsime nuorodą naujam slaptažodžiui nustatyti.',
      sent: 'Jei šiuo adresu yra paskyra, išsiuntėme slaptažodžio atkūrimo nuorodą. Patikrinkite pašto dėžutę (ir šlamštą).',
      send: 'Siųsti atkūrimo nuorodą',
      resend: 'Siųsti dar kartą',
      resendIn: (s: number) => `Siųsti vėl po ${s} s`,
    },
    reset: {
      title: 'Nustatykite naują slaptažodį',
      checking: 'Tikrinama jūsų nuoroda…',
      invalid: 'Ši atkūrimo nuoroda netinkama arba nebegalioja.',
      howLinksWork: 'Atkūrimo nuorodos veikia vieną kartą, ribotą laiką, toje naršyklėje, kurioje jų paprašėte. Paprašykite naujos ir atverkite ją čia.',
      newPassword: 'Naujas slaptažodis',
      confirmNew: 'Pakartokite naują slaptažodį',
      submit: 'Nustatyti naują slaptažodį',
    },
    callback: {
      signingIn: 'Jungiamasi',
      failed: 'Nepavyko prisijungti',
      moment: 'Akimirką…',
      linkProblem:
        'Šios prisijungimo nuorodos čia naudoti negalima: ji galėjo nebegalioti, būti jau panaudota arba atverta kitoje naršyklėje. Jei ką tik patvirtinote el. paštą, prisijunkite dabar.',
      nothing: 'Čia nėra ko užbaigti. Pabandykite prisijungti iš naujo.',
    },
  },
  authErrors: {
    'invalid-credentials': 'Neteisingas vartotojo vardas, el. paštas arba slaptažodis.',
    'email-not-confirmed': 'Pirma patvirtinkite el. paštą: atverkite mūsų atsiųstą nuorodą, tada prisijunkite.',
    'email-taken': 'Šis el. paštas jau užregistruotas. Prisijunkite arba atkurkite slaptažodį.',
    'username-taken': 'Šis vartotojo vardas užimtas. Pasirinkite kitą.',
    'rate-limited': 'Per daug bandymų. Palaukite minutę ir bandykite vėl.',
    'weak-password': 'Šį slaptažodį per lengva atspėti. Pasirinkite stipresnį.',
    'same-password': 'Pasirinkite slaptažodį, kuris skiriasi nuo dabartinio.',
    'link-invalid': 'Ši nuoroda netinkama arba nebegalioja.',
    cancelled: 'Prisijungimas atšauktas. Bandykite dar kartą arba naudokite vartotojo vardą ar el. paštą.',
    network: 'Nepavyksta pasiekti paskyrų serverio. Patikrinkite ryšį ir bandykite vėl.',
    'wrong-password': 'Neteisingas dabartinis slaptažodis.',
    'too-soon': 'Vartotojo vardą galite keisti kartą per 30 dienų.',
    'same-username': 'Tai jau yra jūsų vartotojo vardas.',
    'reauth-needed': 'Dėl saugumo prisijunkite iš naujo ir bandykite dar kartą.',
    'mfa-required': 'Pirmiausia įveskite dviejų veiksnių kodą.',
    'invalid-code': 'Kodas neteisingas arba nebegalioja. Patikrinkite ir bandykite dar kartą.',
    unavailable: 'Tai dar neprieinama.',
    'last-identity': 'Negalite pašalinti vienintelio prisijungimo būdo. Pirmiausia nustatykite slaptažodį arba susiekite kitą paskyrą.',
    'identity-taken': 'Ši paskyra jau susieta su kitu Bronze žaidėju.',
    'invalid-input': 'Patikrinkite, ką įvedėte, ir bandykite dar kartą.',
    unknown: 'Kažkas nepavyko. Bandykite dar kartą.',
  },
  validation: {
    chooseUsername: 'Pasirinkite vartotojo vardą.',
    atLeast: (n: number) => `Mažiausiai ${n} simboliai.`,
    atMost: (n: number) => `Daugiausiai ${n} simbolių.`,
    usernameChars: 'Tik raidės, skaičiai ir _.',
    enterEmail: 'Įveskite el. pašto adresą.',
    validEmail: 'Įveskite tinkamą el. pašto adresą, pvz., vardas@pavyzdys.lt.',
    choosePassword: 'Pasirinkite slaptažodį.',
    typeAgain: 'Įveskite slaptažodį dar kartą.',
    noMatch: 'Slaptažodžiai nesutampa.',
    sameUsername: 'Tai jau yra jūsų vartotojo vardas.',
    enterCurrentPassword: 'Įveskite dabartinį slaptažodį.',
    sameAsCurrent: 'Pasirinkite kitokį nei dabartinis slaptažodį.',
  },
  consents: {
    howOld: 'Kiek jums metų?',
    ages: {
      'under-14': (min: number) => `Iki ${min}`,
      '14-17': (min: number) => `${min}–17`,
      '18+': () => '18 ar daugiau',
    },
    noBirthDate: 'Gimimo datos neklausiame.',
    underAge: (min: number) =>
      `Paskyrą galima turėti nuo ${min} metų. Vis tiek galite žaisti visus režimus be interneto kaip svečias, ir jokie jūsų duomenys nesaugomi mūsų serveriuose.`,
    agree: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        Sutinku su {terms} ir {privacy}
      </>
    ),
    terms: 'Paslaugų teikimo sąlygomis',
    privacy: 'Privatumo politika',
    newTab: '(atsidaro naujoje kortelėje)',
    required: '(privaloma)',
    marketing: 'Siųskite man Bronze naujienas el. paštu',
    marketingNote: '(nebūtina; atsisakyti galima bet kada)',
  },
  account: {
    exportNote: 'Viskas, ką Bronze apie jus saugo. Partijos žaidžiamos jūsų naršyklėje, todėl serveryje partijų istorijos nėra.',
    downloading: 'Jūsų duomenys atsisiunčiami.',
    loggedInAs: (name: ReactNode, email: string | null): ReactNode => (
      <>
        Prisijungta kaip {name}
        {email ? ` (${email})` : ''}.
      </>
    ),
    guest: 'Žaidžiate kaip svečias: mūsų serveriuose apie jus nieko nesaugoma. Jūsų nustatymai, rezultatai ir partija lieka šioje naršyklėje.',
    download: 'Atsisiųsti mano duomenis',
    downloadAccount: 'Jūsų profilis, rezultatai, sutikimai ir el. laiškų pasirinkimai bei šio įrenginio duomenys, failu.',
    downloadGuest: 'Ką Bronze saugo šioje naršyklėje, failu.',
    downloadButton: 'Atsisiųsti',
    delete: 'Ištrinti mano paskyrą',
    deleteNote: 'Ištrina jūsų paskyrą ir viską, kas su ja saugoma. To atšaukti negalima.',
    deleteButton: 'Ištrinti',
    clear: 'Išvalyti šį įrenginį',
    clearNote: (signedIn: boolean) => `Pašalina viską, ką Bronze išsaugojo šioje naršyklėje${signedIn ? ', ir jus čia atjungia' : ''}. Jūsų paskyra lieka.`,
    clearButton: 'Išvalyti',
    clearAsk: 'Išvalyti…',
    keep: 'Palikti',
    deleted: 'Jūsų paskyra ir jos duomenys ištrinti. Dabar žaidžiate kaip svečias.',
    deleteDialog: {
      title: 'Ištrinti paskyrą?',
      intro: 'Tai iš karto ir visam laikui ištrina:',
      items: [
        'jūsų prisijungimą (el. pašto adresą ir slaptažodį arba „Google“ prisijungimą),',
        'jūsų vartotojo vardą, avatarą, rezultatus ir pasiekimus,',
        'jūsų atsakymą apie amžių, sutikimus ir el. laiškų pasirinkimus.',
      ],
      note: 'Partijos žaidžiamos jūsų naršyklėje, todėl mūsų serveriuose partijų istorija nesaugoma. Jūsų svečio duomenys šioje naršyklėje lieka, kol jų neišvalysite.',
      typeToConfirm: (name: ReactNode): ReactNode => <>Norėdami patvirtinti, įveskite savo vartotojo vardą {name}</>,
    },
    notifications: {
      guest: 'Prisijunkite, kad pasirinktumėte, kokius el. laiškus gauti. Svečiai el. laiškų negauna.',
      loading: 'Įkeliami jūsų el. laiškų pasirinkimai…',
      intro: 'Paskyros laiškai (adreso patvirtinimas, slaptažodžio atkūrimas) siunčiami visada. Visa kita – jūsų pasirinkimas; Bronze kol kas nieko iš to nesiunčia.',
      lists: {
        marketing: { label: 'Bronze naujienos', description: 'Naujos funkcijos ir renginiai. Tik su jūsų sutikimu ir niekada jaunesniems nei 18 metų.' },
        friends: { label: 'Draugų laiškai', description: 'Kai kas nors atsiunčia jums kvietimą draugauti.' },
        tournaments: { label: 'Turnyrų laiškai', description: 'Priminimai apie turnyrus, kuriuose dalyvaujate.' },
      },
      from18: 'Prieinama nuo 18 metų.',
      nowAdult: 'Man jau 18 ar daugiau',
    },
    privacy: {
      cookies: 'Slapukų nustatymai',
      cookiesNote: 'Keiskite, ką Bronze gali saugoti šioje naršyklėje.',
      open: 'Atverti',
    },
  },
  settings: {
    reset: 'Atkurti',
    game: 'Žaidimas',
    animationSpeed: 'Animacijos greitis',
    animationHint: 'Blyksniai ir gabenimo taškas lentoje.',
    aiSpeed: 'Kompiuterio greitis',
    aiSpeedHint: 'Pauzė tarp kompiuterio žaidėjo veiksmų.',
    speeds: { slow: 'Lėtas', normal: 'Įprastas', fast: 'Greitas', off: 'Išjungta' },
    moveTimer: 'Ėjimo laikmatis',
    moveTimerHint: 'Kiekvienas ėjimas turi laiko ribą; jai pasibaigus, likusi ėjimo dalis prarandama. Išjungta – žaidžiama be laiko.',
    showLog: 'Rodyti partijos žurnalą',
    audio: 'Garsas',
    sound: 'Garsas',
    masterVolume: 'Bendras garsumas',
    musicVolume: 'Muzikos garsumas',
    general: 'Bendri',
    language: 'Kalba',
    account: 'Paskyra',
    notifications: 'Pranešimai',
    privacy: 'Privatumas',
  },
  cookieBanner: {
    title: 'Slapukai ir saugykla',
    body: 'Bronze jūsų naršyklėje saugo kelis dalykus. Būtinieji leidžia likti prisijungus ir išsaugo vykstančią partiją. Jums sutikus, Bronze šiame įrenginyje taip pat įsimena jūsų nustatymus ir svečio rezultatus. Jokių reklamų, analitikos ar sekimo įrankių nėra.',
    accept: 'Priimti visus',
    reject: 'Atmesti visus',
    customise: 'Pasirinkti',
    save: 'Išsaugoti pasirinkimus',
    close: 'Uždaryti',
    always: 'Visada įjungti',
    cookiePolicy: 'Slapukų politika',
    privacyPolicy: 'Privatumo politika',
    language: 'Kalba',
    categories: {
      essential: { title: 'Būtinieji', description: 'Leidžia likti prisijungus, išsaugo vykstančią partiją ir šiuos pasirinkimus.' },
      preferences: { title: 'Nuostatos', description: 'Įsimena jūsų nustatymus (taip pat kalbą), paskutinį žaidimo režimą, žemėlapį, vietas ir svečio rezultatus.' },
      analytics: { title: 'Analitika', description: 'Šiuo metu nenaudojama. Jei Bronze kada nors pridės analitiką, ji veiks tik tai įjungus.' },
      marketing: { title: 'Rinkodara', description: 'Šiuo metu nenaudojama. Jei Bronze kada nors pridės rinkodaros įrankių, jie veiks tik tai įjungus.' },
    },
  },
  legal: {
    lastUpdated: 'Atnaujinta:',
    translationNote: 'Šis vertimas pateikiamas jūsų patogumui. Jei jis kuo nors skiriasi nuo angliškojo teksto, galioja angliškasis.',
    draft: (example: ReactNode): ReactNode => <>Juodraštis: dalis duomenų apie tai, kas valdo Bronze, dar neįrašyti (rodoma taip: {example}).</>,
    table: (caption: string) => `${caption} (lentelė)`,
    freeToPlay: 'Bronze žaisti nemokama; niekas neparduodama.',
  },
  ...accountWords,
  brass: brassWords,
}

export default lt
