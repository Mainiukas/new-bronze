import type { ReactNode } from 'react'
import { AUTH_ERRORS_EN } from '../auth/messages'
import { VALIDATION_EN } from '../auth/validation'
import type { Quote } from '../game/engine'
import type { GameMessage } from '../game/messages'
import type { RULES } from '../game/rules'
import type { GoodsKind, IndustryKind, LogEntry, RouteKind } from '../game/types'
import accountWords from './account/en'
import brassWords from './brass/en'
import onlineWords from './online/en'
import welcomeWords from './welcome/en'
import game, { renderWith } from './game/en'
import { pluralizer } from './languages'

/*
 * Every word on screen, in English: the source the other languages
 * translate (lt.tsx, de.tsx, fr.tsx, es.tsx). Grouped by where it appears.
 * Functions take the numbers and names they mention; a few return markup
 * (a bold phrase, a link) and are typed ReactNode.
 */

type Rules = typeof RULES
type Cost = { money: number; coal: number; iron: number }
type Era = 'canal' | 'rail'

const p = pluralizer('en-GB')

/** "a, b and c" */
const list = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
/** "a, b or c" */
const or = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`)
/** "3 cotton", "1 coal" */
const amountOf = (n: number, goods: GoodsKind) => `${n} ${game.goods[goods]}`

interface IndustryWords {
  name: string
  /** What it makes each round. */
  output: (r: Rules) => string
}

const industries: Record<IndustryKind, IndustryWords> = {
  coal: { name: game.industries.coal, output: (r: Rules) => `+1 coal to your store each round (up to ${r.storeCap}; extra sold for £${r.coalOverflowValue})` },
  iron: { name: game.industries.iron, output: (r: Rules) => `+1 iron to your store each round (up to ${r.storeCap}; extra sold for £${r.ironOverflowValue})` },
  cotton: { name: game.industries.cotton, output: (r: Rules) => `+1 cotton on the mill each round (holds ${r.goodsCapacity})` },
  port: { name: game.industries.port, output: (r: Rules) => `+£${r.portIncome} each round. Buys cotton at £${r.portPrice}; others pay you £${r.portFee} per unit` },
  shipyard: { name: game.industries.shipyard, output: () => '+1★ each round' },
}

const lower = (kind: IndustryKind) => industries[kind].name.toLowerCase()
const routeKind = (kind: RouteKind) => (kind === 'canal' ? 'canal' : 'railway')

const en = {
  common: {
    you: 'You',
    player: (n: number) => `Player ${n}`,
    close: 'Close',
    closeNamed: (title: string) => `Close ${title}`,
    dismiss: 'Dismiss',
    done: 'Done',
    cancel: 'Cancel',
    back: 'Back',
    logIn: 'Log in',
    logOut: 'Log out',
    register: 'Register',
    logInToUse: 'Log in to use this',
    logInToUseNote: '(log in to use)',
    comingSoon: 'Coming soon',
    notAvailable: 'not available',
    skipToContent: 'Skip to content',
  },
  brand: {
    home: 'Bronze: main menu',
    tagline: 'Build · Connect · Industrialize',
  },
  nav: {
    lobby: 'Lobby',
    main: 'Main',
    mainMenu: 'Main Menu',
    play: 'Play',
    tournaments: 'Tournaments',
    locker: 'Locker',
    shop: 'Shop',
    achievements: 'Achievements',
    online: 'Play online',
    board: 'Map board',
    howToPlay: 'How to Play',
    settings: 'Settings',
    credits: 'Credits',
    legal: 'Legal',
    profile: 'Profile',
    more: 'More',
    closeMore: 'Close more',
    account: 'Account',
    accountMenu: (name: string, record: string) => `${name}: ${record}. Account menu`,
    yourProfile: (name: string, record: string) => `${name}: ${record}. Your profile`,
    checkingAccount: 'Checking your account',
    retryAccount: 'Retry account',
    retryAccountTip: 'Retry loading your account',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    refunds: 'Refund Policy',
    cookies: 'Cookie Policy',
    legalNotice: 'Business details',
    dataRequest: 'Data requests',
  },
  /** "3 wins · 7 matches" */
  record: (wins: number, matches: number) =>
    `${p(wins, { one: `${wins} win`, other: `${wins} wins` })} · ${p(matches, { one: `${matches} match`, other: `${matches} matches` })}`,
  list,
  or,
  amountOf,
  stats: {
    wins: 'Wins',
    bestScore: 'Best score',
    matches: 'Matches',
    goodsShipped: 'Goods shipped',
    saveFailed: 'Couldn’t save your record to your account. It’s kept on this device and will be saved next time you log in.',
    guestMoved: 'Your guest progress was added to your account.',
  },
  lobby: {
    tournamentsTeaser: 'Ranked brackets and seasonal cups.',
    achievementsUnlocked: 'Achievements unlocked',
    next: 'Next:',
    allAchievements: 'Every achievement unlocked.',
    outdatedTitle: 'Saved match can’t be continued',
    outdatedBody: 'It was saved by an older version of Bronze, whose rules have changed.',
    discard: 'Discard it',
    gameMode: 'Game mode',
    social: 'Friends and progress',
    continueMatch: 'Continue match',
    abandon: 'Abandon',
    resume: 'Resume',
    abandoned: 'Match abandoned',
    opponentsTitle: 'Opponents',
    mixed: 'Custom: a mix of humans and computers (see Seats)',
    opponents: { computer: 'vs Computer', pass: 'Pass & Play', online: 'Online' },
  },
  friends: {
    title: 'Friends',
    addByUsername: 'Add friend by username',
    add: 'Add friend',
    none: 'No friends yet',
    noServer:
      'Friend lists and online matches need a game server, and Bronze doesn’t have one yet. Until then, play the computer, or pass & play on this device.',
    guest: 'Log in to add friends. Until then, play the computer, or pass & play on this device.',
    online: 'Online',
    pending: 'Pending',
  },
  modes: {
    normal: { name: 'Normal', description: 'Full map, full rules. The complete industrial saga.' },
    blitz: { name: 'Blitz', description: 'Smaller map and shorter timers. Every decision counts.' },
    bullet: { name: 'Bullet', description: 'Smallest map, very short timers. Build on instinct.' },
    mapSize: { full: 'Full map', reduced: 'Reduced map', compact: 'Compact map' },
    perTurn: (time: string) => `${time} per turn`,
  },
  maps: {
    'wales-and-the-west': {
      terrain: 'Canals & Railways',
      flavor: 'Welsh coal, Midlands workshops and Severn ports. Dig canals first, then race to lay the railways.',
    },
    'mersey-valley': { terrain: 'River & Port', flavor: 'A broad tidal river feeds a busy port. Move goods downstream before your rivals do.' },
    'black-country': { terrain: 'Coal & Iron', flavor: 'Coal seams, ironworks and a tangle of canals. Crowded, cutthroat, and glowing all night.' },
    'pennine-mills': { terrain: 'Moors & Mills', flavor: 'Mill towns tucked between windswept moors. Fast water, steep hills and few easy routes.' },
  },
  setup: {
    title: 'Match setup',
    rounds: (n: number) => p(n, { one: `${n} round`, other: `${n} rounds` }),
    roundsPerEra: (n: number) => p(n, { one: `${n} round per era`, other: `${n} rounds per era` }),
    moneyEach: (n: number) => `£${n} each`,
    railFrom: (round: number) => `rail era from round ${round}`,
    map: 'Map',
    practiceMap: 'Practice map, no eras.',
    players: 'Players',
    playersRange: (min: number, max: number) => (min === max ? `${min} players` : `${min}–${max} players`),
    towns: (n: number) => p(n, { one: `${n} town`, other: `${n} towns` }),
    mapTakes: (map: string, min: number, max: number) => `${map} takes ${min}–${max} players`,
    seats: 'Seats',
    seatName: (seat: number) => `Seat ${seat} name`,
    playedBy: (seat: number) => `Seat ${seat} is played by`,
    human: 'Human',
    ai: 'AI',
    seatColour: (seat: number) => `Seat ${seat} colour`,
    colourSwapLabel: (colour: string, seat: number) => `${colour} (swap with seat ${seat})`,
    colourSwapTitle: (colour: string, seat: number) => `${colour}: taken by seat ${seat}; picking it swaps colours`,
    difficulty: (seat: number) => `Seat ${seat} difficulty`,
    humanSeats: 'Human seats take turns on this device (pass & play).',
    advancedSeed: 'Advanced: seed',
    seedLabel: 'Seed (optional)',
    random: 'Random',
    seedHelp: 'The same seed and seats replay the same computer moves. Leave it empty for a new match.',
    seedInvalid: 'A seed is a whole number of up to 9 digits.',
    replaces: 'Starting a new match replaces the match in progress.',
    start: 'Start match',
  },
  colors: { yellow: 'Yellow', blue: 'Blue', purple: 'Purple', red: 'Red', white: 'White' },
  aiLevels: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },
  pages: {
    shop: {
      title: 'Shop',
      empty: 'The shelves are being restocked.',
      blurb: 'Cosmetic boards, building skins and token sets, delivered fresh from the foundry.',
      locked: 'Purchases are tied to your account: log in to buy and keep them.',
    },
    locker: {
      title: 'Locker',
      empty: 'Your locker stands empty — win a match to earn your first fittings.',
      blurb: 'Outfit your industrialist and choose your player tokens, board trims and banners.',
      locked: 'Your locker belongs to your account: log in so what you collect stays yours.',
    },
    tournaments: {
      title: 'Tournaments',
      empty: 'The Exhibition hall is quiet. Check back soon.',
      blurb: 'Ranked brackets and seasonal cups for the most ambitious industrialists.',
      locked: 'Tournaments are played under your account: log in to enter.',
    },
    achievements: { empty: 'No honours on the wall yet. Your first win awaits.' },
  },
  achievements: {
    yourRecord: 'Your record',
    unlocked: (total: number) => `${total} unlocked`,
    savedAccount: 'Saved to your account.',
    savedDevice: 'Saved on this device only.',
    logInToSave: 'Log in to save to your account',
    unlockedOn: (date: string) => `Unlocked ${date}`,
    list: {
      'first-shift': { name: 'First Shift', description: 'Finish a match.' },
      foreman: { name: 'Foreman', description: 'Win a match.' },
      'quick-draw': { name: 'Quick Draw', description: 'Win a Bullet match.' },
      'full-house': { name: 'Full House', description: 'Win a four-player match.' },
      'merchant-fleet': { name: 'Merchant Fleet', description: 'Ship 12 goods in one match.' },
      'iron-web': { name: 'Iron Web', description: 'Own 6 links in one match.' },
      'engine-room': { name: 'Shipwright', description: 'Build 2 Shipyards in one match.' },
      tycoon: { name: 'Tycoon', description: 'Score 55 or more in a match.' },
      'grand-tour': { name: 'Grand Tour', description: 'Finish a match on every map.' },
      veteran: { name: 'Veteran', description: 'Finish 10 matches.' },
    },
  },
  profile: {
    locked: 'Your profile keeps your username, record and achievements with your account, on any device.',
    memberSince: (date: string) => `Member since ${date}`,
  },
  notFound: {
    title: 'This line hasn’t been laid yet',
    body: 'There’s nothing at this address.',
    back: 'Back to the lobby',
  },

  /* ---- The match -------------------------------------------------------- */

  /** The engine's words (log, reasons, refusals). */
  game,
  gameMessage: (message: GameMessage) => renderWith(game, message),
  logEntry: (entry: LogEntry) => (entry.msg ? renderWith(game, entry.msg) : entry.text),
  /** "£6 + 1 iron" */
  cost: (c: Cost) => game.cost(c),
  /** "£11 (buys 1 iron)" */
  quote: (q: Quote) => {
    const bought = [q.coalBought && amountOf(q.coalBought, 'coal'), q.ironBought && amountOf(q.ironBought, 'iron')].filter(Boolean)
    const used = [q.coalUsed && amountOf(q.coalUsed, 'coal'), q.ironUsed && amountOf(q.ironUsed, 'iron')].filter(Boolean)
    const notes = [bought.length ? `buys ${bought.join(' + ')}` : '', used.length ? `uses your ${used.join(' + ')}` : ''].filter(Boolean).join(', ')
    return `£${q.total}${notes ? ` (${notes})` : ''}`
  },
  industries,
  actions: {
    buildIndustry: 'Build industry',
    from: (n: number) => `From £${n}`,
    buildLink: 'Build link',
    ship: 'Ship',
    sourcesReady: (n: number) => p(n, { one: `${n} source ready`, other: `${n} sources ready` }),
    raiseFunds: 'Raise funds',
    endTurn: 'End turn',
    skipsLast: 'Skips the last action',
    skipsBoth: 'Skips both actions',
    canalCost: (money: number) => `Canal £${money}`,
    railwayCost: (quote: string) => `Railway ${quote}`,
    bothCosts: (canal: number, rail: number) => `Canal £${canal} · Railway £${rail} + coal`,
    cancelAction: 'Cancel this action',
    buildAnIndustry: 'Build an industry',
    buildHint: 'Choose what to build. Prices include any coal or iron bought for you.',
    buildA: (kind: IndustryKind) => `Build a ${industries[kind].name}`,
    buildWhere: (quote: string, prestige: number): ReactNode => (
      <>
        {quote}, +{prestige}★. <strong className="text-brass-200">Click a glowing slot</strong> on the board, or pick one here.
      </>
    ),
    slot: (n: number) => `slot ${n}`,
    buildALink: 'Build a link',
    linkHint: (era: Era | null, canal: number, rail: number, coalPrice: number, prestige: number): ReactNode => (
      <>
        {era === 'canal'
          ? `Canal era: canals cost £${canal}.`
          : era === 'rail'
            ? `Rail era: railways cost £${rail} + 1 coal (bought for £${coalPrice} if you have none).`
            : `Canals £${canal}; railways £${rail} + 1 coal.`}{' '}
        +{prestige}★. <strong className="text-brass-200">Click a glowing bubble</strong>, or pick one here.
      </>
    ),
    routeKind: { canal: 'canal', rail: 'railway' },
    inStore: (goods: string) => `${goods} in your store`,
    shipHint: (
      <>
        Choose what to ship: a mill’s cotton, or all the coal or iron in your store from one of your mines or works.{' '}
        <strong className="text-brass-200">Glowing tiles</strong> on the board work too.
      </>
    ) as ReactNode,
    shipLoad: (goods: string) => `Ship ${goods}`,
    shipFrom: (source: string): ReactNode => (
      <>
        From {source}. <strong className="text-brass-200">Click a glowing market</strong> on the board, or pick one here, to see what it pays.
      </>
    ),
    cantPayFees: (n: number) => `You can’t pay the £${n} in tolls and fees`,
    sameTown: 'same town',
    links: (n: number) => p(n, { one: `${n} link`, other: `${n} links` }),
    cantAffordTolls: 'Can’t afford tolls',
    revenue: 'Revenue',
    tolls: 'Tolls',
    ownLinksOnly: 'Only your own links',
    portFee: 'Port fee',
    feePerUnit: (fee: number, owner: string) => `£${fee} a unit to ${owner}`,
    youGet: 'You get',
    prestige: 'Prestige',
    doubled: (n: number) => `doubled: ${n} links`,
    shipTo: (market: string) => `Ship to ${market}`,
    shipSummary: (goods: string, from: string, routes: string[], drop: { market: string; price: number } | null) =>
      `${goods} from ${from}${routes.length ? ` via ${routes.join(', ')}` : ''}.${drop ? ` ${drop.market}’s price then drops to £${drop.price}.` : ''}`,
    confirmShipment: 'Confirm shipment',
  },
  match: {
    final: 'Final',
    roundOf: (round: number, total: number) => `Round ${round}/${total}`,
    actionsLeft: (left: number, total: number) => `${left} of ${total} actions left`,
    actionsLeftTitle: 'Actions left this turn',
    board: 'Board',
    actions: 'Actions',
    seeResults: 'See results',
    waitingFor: (name: string) => `Waiting for ${name} to take the device…`,
    panels: 'Match panels',
    players: 'Players',
    markets: 'Markets',
    log: 'Log',
    matchLog: 'Match log',
    yourTurn: 'Your turn',
    passTo: (name: string) => `Pass to ${name}`,
    handOver: 'Hand the device over, then start the turn. The timer waits.',
    startYourTurn: 'Start your turn',
    startTurnOf: (name: string) => `Start ${name}’s turn`,
    over: 'Match over',
    isPlaying: (name: string) => `${name} is playing`,
    turnOf: (name: string) => `${name}’s turn`,
    actionOf: (n: number, total: number) => `action ${n} of ${total}`,
    fastForward: 'Fast-forward',
    fastForwardTitle: 'Let the computer players act without pausing',
    aiLevel: (level: string) => `${level} AI`,
    choosing: 'is choosing an action.',
    last: (text: string) => `Last: ${text}`,
    canalEraTitle: (round: number) => `Canal era: the rail era begins in round ${round}`,
    railEraTitle: 'Rail era: the canals have closed',
    era: { canal: 'Canal era', rail: 'Rail era' },
    menu: 'Match menu',
    legal: 'Legal & privacy',
    saved: 'The match is saved after every action.',
    timerLabel: (secs: number, paused: boolean) => `${secs} seconds left in this turn${paused ? ', paused' : ''}`,
    timerPaused: 'Timer paused',
    timeLeft: 'Time left this turn',
    eraBanner: {
      title: 'The Rail Era begins — the canals close',
      removed: (n: number) => (n === 0 ? 'No canals had been dug.' : p(n, { one: `${n} canal link removed.`, other: `${n} canal links removed.` })),
      opens: (places: string) => `Railways can now be laid; ${places} open.`,
      clickToContinue: 'Click to continue',
    },
  },
  playersPanel: {
    turn: 'Turn',
    prestigeTitle: 'Prestige earned so far',
    money: 'Money',
    coal: 'Coal',
    iron: 'Iron',
    industries: 'Ind.',
    industriesTitle: (n: number) => p(n, { one: `${n} industry owned`, other: `${n} industries owned` }),
    links: 'Links',
    linksTitle: (n: number, built: number) => `${p(n, { one: `${n} link`, other: `${n} links` })} owned now (${built} built in all)`,
    ifEnded: 'If ended',
    ifEndedTitle: (prestige: number, money: number, hubs: number) => `Score if the match ended now: ${prestige}★ + ${money} for money + ${hubs} for hubs`,
  },
  marketsPanel: {
    buys: (goods: string) => `Buys ${goods}`,
    down: (base: number, recovery: number) => `Down from £${base}; recovers £${recovery} a round`,
    full: 'At its full price',
    note: (r: Rules, ports: string[]) =>
      `Each unit sold drops a hub’s price by £${r.priceDropPerGoods} (not below £${r.priceFloor}). Ports buy cotton at a flat £${r.portPrice}${
        ports.length ? `: ${ports.join(', ')}.` : '; none built yet.'
      }`,
  },
  results: {
    title: 'Results',
    shared: (names: string[]) => `Shared victory: ${names.join(' & ')}`,
    youWin: 'You win!',
    wins: (name: string) => `${name} wins`,
    nobody: 'Nobody',
    rematch: 'Rematch',
    formula: 'Total = ★ earned in play + 1★ per £5 held + 2★ per hub in your network. Ties go to the richer player.',
    finalScores: 'Final scores',
    player: 'Player',
    playStars: 'Play ★',
    moneyBonus: 'Money bonus',
    hubBonus: 'Hub bonus',
    total: 'Total',
    stats: 'Match stats',
    linksBuilt: 'Links built',
    industries: 'Industries',
    achievementsUnlocked: 'Achievements unlocked',
  },
  zoom: {
    group: (label: string) => `${label} zoom`,
    in: 'Zoom in',
    out: 'Zoom out',
    reset: 'Show the whole board',
  },
  boardLabels: {
    gameBoard: 'Game board',
    mapAlt: 'Illustrated map of Wales, the Midlands and the South West',
    route: (from: string, to: string, kind: RouteKind) => `${from} to ${to} ${routeKind(kind)}`,
    buildRoute: (route: string, cost: string) => `Build the ${route}, ${cost}`,
    routeTitle: (from: string, to: string, kind: RouteKind, owner: string | null) => `${from} – ${to} (${routeKind(kind)}${owner ? `, ${owner}` : ''})`,
    link: (from: string, to: string, era: Era, extra: string | null) => `${from} to ${to} (${routeKind(era)})${extra ? `: ${extra}` : ''}`,
    shipTo: (town: string, pays: string) => `Ship to ${town}: ${pays}`,
    townTitle: (town: string, price: number | null) => (price === null ? town : `${town} — market town, buys cotton, coal and iron at £${price} a unit`),
    slotFree: (town: string, n: number, kinds: IndustryKind[]) => `${town}, slot ${n}: ${or(kinds.map(lower))}, free`,
    slotBuilt: (town: string, n: number, owner: string, kind: IndustryKind, cotton: number | null) =>
      `${town}, slot ${n}: ${owner === 'You' ? 'your' : `${owner}’s`} ${lower(kind)}${cotton !== null ? `, ${amountOf(cotton, 'cotton')}` : ''}`,
    builtBy: (name: string) => `built by ${name}`,
    notBuilt: 'not built yet',
  },
  tooltip: {
    connections: 'Connections',
    linkType: { canal: 'Canal', rail: 'Rail', both: 'Canal and rail' },
    eraOnly: { canal: 'canal era', rail: 'rail era' },
    city: (region: string) => `City · ${region}`,
    stop: 'Stop · routes pass through; no building or trade',
    hub: 'Trade hub · goods are sold here',
    railOnly: 'Available in the Rail Era',
    owned: (owner: string, kind: IndustryKind) => `${owner === 'You' ? 'Your' : `${owner}’s`} ${industries[kind].name}`,
    buys: 'Buys:',
    priceNow: 'Price now:',
    priceRule: (max: number) => `a unit, £1 less for each unit sold (recovers £1 a round, up to £${max})`,
    both: (era: Era) => `Canal and rail · a ${routeKind(era)} in this era`,
    only: (kind: Era): string => (kind === 'canal' ? 'Canal only' : 'Rail only'),
    builtBy: (era: Era, name: string) => `${era === 'canal' ? 'Canal dug' : 'Railway laid'} by ${name}`,
  },
  mapBoard: {
    editMap: 'Edit map',
    doneEditing: 'Done editing',
    draftNote: 'Showing your unsaved calibration from this browser. Open edit mode to export or discard it.',
    era: 'Era',
    eraNote: (era: Era, railOnly: string) =>
      `Only this era’s links are drawn: ${era === 'canal' ? 'canals, with “both” links as canals' : 'railways, with “both” links as railways'}. ${railOnly} can only be reached in the rail era.`,
    sandbox: 'Sandbox',
    tool: 'Tool',
    inspect: 'Inspect',
    place: 'Place tiles',
    placeFor: 'Place tiles for',
    inspectHint: 'Click a location, slot or link marker to see its details.',
    placeHint: 'Click a slot to build there (click again to switch industry, then to clear), or a link marker to claim it.',
    preview: 'This is a preview of how builds look, not a match.',
    clear: 'Clear tiles',
    selected: 'Selected',
    regions: 'Regions',
    stopKey: 'Stop (no building or trade)',
    hubKey: 'Trade hub',
    nothing: 'Nothing selected yet.',
    usable: (active: boolean, era: Era) => `${active ? 'usable' : 'closed'} in the ${era} era`,
    bend: (value: number) => (value === 0 ? 'straight' : `bend ${value > 0 ? '+' : ''}${value} %`),
    stop: 'Stop',
    hub: 'Trade hub',
    offset: (x: number, y: number) => `plaque offset ${x}%, ${y}%`,
    startsAt: (price: number) => `starts at £${price}`,
  },
  rules: {
    title: 'Rules',
    goal: {
      title: 'Goal',
      body: (r: Rules): ReactNode => (
        <>
          Have the highest total when the last round ends: the <strong className="text-brass-300">★ you earned</strong> in play, plus 1★ for every £
          {r.moneyPerPrestige} you hold, plus {r.hubBonus}★ for every trade hub in your network. A tie goes to the richer player; if they’re level on
          money too, the victory is shared.
        </>
      ),
    },
    setup: {
      title: 'Setup and modes',
      body: (maxPlayers: number) =>
        `2–${maxPlayers} players, each human or computer (Easy, Normal or Hard), each with their own colour. Everyone starts with the mode’s money, no coal, no iron and no ★. Round 1 is played in seat order; each round the first seat moves on by one.`,
      columns: ['Mode', 'Map', 'Rounds', 'Rail era from', 'Money', 'Turn timer'],
      rings: { full: 'Whole map', reduced: 'Rings 1–2', compact: 'Ring 1 only' },
      round: (n: number) => `round ${n}`,
      faded: 'Places outside the mode’s rings, and their links, are drawn faded and aren’t part of the match. The timer can be turned off in Settings.',
    },
    turn: {
      title: (n: number) => `Your turn: ${n} actions`,
      intro: 'You may end your turn early. If the turn timer runs out, the actions you have left are lost.',
      build: {
        name: 'Build an industry',
        body: (railOnly: string) =>
          `On a free slot that allows it, in a town in your network. Your very first build of the match can go anywhere. Nothing can be built in ${railOnly} during the canal era. Pay the cost and gain the industry’s ★.`,
      },
      link: {
        name: 'Build a link',
        body: (canal: string, rail: string, prestige: number) =>
          `An unbuilt route that exists in the current era and touches your network (anywhere, before your first build). A canal costs ${canal}; a railway ${rail}. +${prestige}★, and the link is yours.`,
      },
      ship: {
        name: 'Ship',
        intro: 'Pick one of your industries and a market it can reach:',
        sources: [
          'a cotton mill sends all its cotton to a hub that buys cotton, or to any port (yours or another player’s);',
          'a coal mine sends all the coal in your store to a hub that buys coal;',
          'an iron works sends all the iron in your store to a hub that buys iron.',
        ],
        body: (r: Rules) =>
          `Goods travel over built links of the current era, anyone’s; the industry and the market may be in the same town. The way with the fewest opponent links is used, then the shortest. Each opponent link costs a £${r.toll} toll, paid to its owner. A hub pays its current price for each unit, and the price drops £${r.priceDropPerGoods} with each unit sold (never below £${r.priceFloor}): at £6, three units pay £6 + £5 + £4. A port pays £${r.portPrice} a unit; at another player’s port you pay them £${r.portFee} a unit. You earn +1★ per unit, doubled if the goods used ${r.longHaulLinks} or more links. You can’t ship if your money plus the revenue won’t cover the tolls and fees. Afterwards the mill, or your coal or iron store, is empty.`,
      },
      funds: { name: 'Raise funds', body: (n: number) => `Take £${n}.` },
      end: { name: 'End turn', body: 'Ends your turn now.' },
    },
    industries: {
      title: 'Industries',
      emptyStore: (total: number) => `(£${total} with an empty store)`,
      supply: (r: Rules) =>
        `Coal and iron you don’t have for a cost are bought for you from the general supply: £${r.coalPrice} a coal, £${r.ironPrice} an iron. Prices shown in the game include this. Your store holds up to ${r.storeCap} coal and ${r.storeCap} iron; what your mines and works make beyond that is sold for £${r.coalOverflowValue} a coal and £${r.ironOverflowValue} an iron.`,
    },
    network: {
      title: 'Your network',
      body: 'Every town where you own an industry, plus both ends of every link you own. Hubs and stops count as towns. You may build anywhere only until your first build. If your network is later wiped out (say your only links were canals and the rail era removed them) you still build next to any town where you own an industry; if you own no industry either, you may build anywhere again, and the log says so.',
    },
    roundEnd: {
      title: 'End of each round',
      steps: (r: Rules) => [
        'Industries produce (see above).',
        `Every player collects £${r.baseIncome}.`,
        `Every hub’s price recovers £${r.priceRecovery}, up to its starting price.`,
        'If the rail era begins next round, every canal link comes off the board. Owners keep the ★ they earned, and industries stay.',
        'After the last round, the match ends and is scored.',
      ],
    },
    eras: {
      title: 'Eras and the board',
      body: (railOnly: string) =>
        `The match starts in the canal era. Only the current era’s network is on the board: canal routes and “both” routes as canals first, then rail routes and “both” routes as railways. ${railOnly} (marked with a locomotive) can only be reached by rail, so they open in the rail era.`,
      bubbleAlt: 'An empty connection bubble',
      bubble: 'An empty bubble: a link nobody has built. It glows when you can build it.',
      hexAlt: 'A link hexagon',
      hex: (stops: string) => `Two hexagons mark stops (${stops}: routes pass through, no building or trade) and hubs.`,
      canalAlt: 'A built canal token',
      canal: 'A built canal, in its owner’s colour.',
      railAlt: 'A built rail token',
      rail: 'A built railway, in its owner’s colour.',
      hubsIntro: 'Trade hubs, and what they buy (the price on the badge is the current one):',
      hub: (price: number, buys: string, railOnly: boolean) => `starts at £${price}, buys ${buys}${railOnly ? ' (rail era only)' : ''}`,
    },
    practice: {
      title: 'Practice maps',
      body: (maps: string) =>
        `${maps} are drawn maps without eras: canals and railways can be built at any time and nothing is removed. Their market towns work like hubs and buy cotton, coal and iron. Everything else is the same.`,
    },
  },

  /* ---- Accounts ---------------------------------------------------------- */

  auth: {
    username: 'Username',
    usernameHint: '3–20 characters: letters, numbers and _.',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    strength: (label: string) => `Strength: ${label}`,
    strengths: { weak: 'Weak', ok: 'OK', strong: 'Strong' },
    available: 'Available',
    taken: 'Taken',
    checking: 'Checking…',
    usernameTaken: 'That username is taken.',
    usernameCheckFailed: 'Couldn’t check this username. Try again.',
    google: 'Continue with Google',
    or: 'or',
    registerOrLogIn: 'Register or log in',
    newHere: 'New here?',
    haveAccount: 'I already have an account',
    keepPlaying: 'Keep playing as a guest',
    backToLogIn: 'Back to log in',
    cancelSignup: 'Cancel sign-up',
    notConfigured: 'Accounts aren’t configured yet. You can keep playing as a guest; nothing here will sign you in.',
    welcome: (name: string | null, isNew: boolean) => (name ? `${isNew ? 'Welcome' : 'Welcome back'}, ${name}!` : 'Welcome!'),
    loggedOut: 'Logged out',
    passwordUpdated: 'Password updated',
    profileFailed: 'Logged in, but your profile couldn’t be loaded.',
    signupCancelled: 'Sign-up cancelled. Nothing was kept.',
    signupLoggedOut: 'Logged out. The unfinished sign-up will be deleted automatically.',
    login: {
      intro: 'Welcome back, industrialist.',
      identifier: 'Username or email',
      enterIdentifier: 'Enter your username or email.',
      enterPassword: 'Enter your password.',
      remember: 'Remember me',
      forgot: 'Forgot password?',
      loggingIn: 'Logging in…',
      tryAgainIn: (s: number) => `Try again in ${s}s`,
      tooMany: (s: number) => `Too many tries: wait ${s} seconds before trying again.`,
    },
    register: {
      title: 'Create an account',
      create: 'Create account',
      creating: 'Creating account…',
      intro: 'Save your record, and be ready for friends and online play.',
      googleNote: 'With Google too, you’ll confirm your age and accept the Terms before your account is created.',
      chooseAge: 'Choose your age group.',
      mustAgree: 'Agree to the Terms and Privacy Policy to continue.',
    },
    checkEmail: {
      title: 'Check your email',
      body: (email: ReactNode): ReactNode => <>Check your email to confirm your account. We sent a link to {email}; open it in this browser to finish.</>,
      spam: 'No email after a few minutes? Check your spam folder.',
      back: 'Back to the lobby',
      again: 'Wrong address? Register again',
    },
    choose: {
      title: 'Finish your account',
      signedInAs: (who: string) => `Signed in with Google as ${who}`,
      yourGoogle: 'your Google account',
      intro: 'Choose the name other players will see. Your Bronze account is only created when you continue.',
      deleteAndPlay: 'Delete this sign-in and play as a guest',
      notNow: 'Not now: cancel and delete what Google shared',
    },
    forgot: {
      title: 'Forgot password',
      intro: 'Enter the email you registered with and we’ll send you a link to set a new password.',
      sent: 'If an account exists for that email, we’ve sent a reset link. Check your inbox (and spam).',
      send: 'Send reset link',
      resend: 'Resend link',
      resendIn: (s: number) => `Resend in ${s}s`,
    },
    reset: {
      title: 'Set a new password',
      checking: 'Checking your link…',
      invalid: 'This reset link is invalid or has expired.',
      howLinksWork: 'Reset links work once, for a limited time, in the browser you asked for them in. Ask for a new one and open it here.',
      newPassword: 'New password',
      confirmNew: 'Confirm new password',
      submit: 'Set new password',
    },
    callback: {
      signingIn: 'Signing you in',
      failed: 'Couldn’t sign you in',
      moment: 'One moment…',
      linkProblem:
        'This sign-in link can’t be used here: it may have expired, been used already, or been opened in a different browser. If you just confirmed your email, log in now.',
      nothing: 'There’s nothing to finish here. Try logging in again.',
    },
  },
  authErrors: AUTH_ERRORS_EN,
  validation: VALIDATION_EN,
  consents: {
    howOld: 'How old are you?',
    ages: {
      'under-14': (min: number) => `Under ${min}`,
      '14-17': (min: number) => `${min} to 17`,
      '18+': () => '18 or over',
    } as Record<'under-14' | '14-17' | '18+', (min: number) => string>,
    noBirthDate: 'We don’t ask for your birth date.',
    underAge: (min: number) =>
      `You need to be ${min} or over to have an account. You can still play every offline mode as a guest, and nothing about you is stored on our servers.`,
    agree: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        I agree to the {terms} and the {privacy}
      </>
    ),
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    newTab: '(opens in a new tab)',
    required: '(required)',
    marketing: 'Email me news about Bronze',
    marketingNote: '(optional; unsubscribe any time)',
  },
  account: {
    exportNote: 'Everything Bronze stores about you. Matches are played in your browser, so there is no match history on the server.',
    downloading: 'Your data is downloading.',
    loggedInAs: (name: ReactNode, email: string | null): ReactNode => (
      <>
        Logged in as {name}
        {email ? ` (${email})` : ''}.
      </>
    ),
    guest: 'You’re playing as a guest: nothing about you is stored on our servers. Your settings, record and match stay in this browser.',
    download: 'Download my data',
    downloadAccount: 'Your profile, record, consents and email choices, plus this device’s data, as a file.',
    downloadGuest: 'What Bronze keeps in this browser, as a file.',
    downloadButton: 'Download',
    delete: 'Delete my account',
    deleteNote: 'Deletes your account and everything stored with it. It can’t be undone.',
    deleteButton: 'Delete',
    clear: 'Clear this device',
    clearNote: (signedIn: boolean) => `Removes everything Bronze stored in this browser${signedIn ? ', and logs you out here' : ''}. Your account stays.`,
    clearButton: 'Clear',
    clearAsk: 'Clear…',
    keep: 'Keep',
    deleted: 'Your account and its data have been deleted. You’re now playing as a guest.',
    deleteDialog: {
      title: 'Delete your account?',
      intro: 'This deletes, straight away and for good:',
      items: [
        'your login (email address and password, or your Google sign-in),',
        'your username, avatar, record and achievements,',
        'your age answer, consents and email choices.',
      ],
      note: 'Matches are played in your browser, so no match history is kept on our servers. Your guest data in this browser stays until you clear it.',
      typeToConfirm: (name: ReactNode): ReactNode => <>Type your username, {name}, to confirm</>,
    },
    notifications: {
      guest: 'Log in to choose which emails you get. Guests never get emails.',
      loading: 'Loading your email choices…',
      intro: 'Account emails (confirming your address, resetting your password) are always sent. Everything else is up to you; Bronze doesn’t send any of it yet.',
      lists: {
        marketing: { label: 'News about Bronze', description: 'New features and events. Only with your consent, and never to under-18s.' },
        friends: { label: 'Friend emails', description: 'When someone sends you a friend request.' },
        tournaments: { label: 'Tournament emails', description: 'Reminders for tournaments you’ve joined.' },
      },
      from18: 'Available from 18.',
      nowAdult: 'I’m 18 or over now',
    },
    privacy: {
      cookies: 'Cookie settings',
      cookiesNote: 'Change what Bronze may store in this browser.',
      open: 'Open',
    },
  },
  settings: {
    reset: 'Reset',
    game: 'Game',
    animationSpeed: 'Animation speed',
    animationHint: 'Flashes and the shipping dot on the board.',
    aiSpeed: 'Computer speed',
    aiSpeedHint: 'The pause between a computer player’s actions.',
    speeds: { slow: 'Slow', normal: 'Normal', fast: 'Fast', off: 'Off' },
    moveTimer: 'Move timer',
    moveTimerHint: 'Each turn has a time limit; when it runs out, the rest of the turn is lost. Off: play untimed.',
    showLog: 'Show the match log',
    audio: 'Audio',
    sound: 'Sound',
    masterVolume: 'Master volume',
    musicVolume: 'Music volume',
    general: 'General',
    language: 'Language',
    account: 'Account',
    notifications: 'Notifications',
    privacy: 'Privacy',
  },
  cookieBanner: {
    title: 'Cookies and storage',
    body: 'Bronze keeps a few things in your browser. Essential ones keep you logged in and keep your match in progress. With your consent, Bronze also remembers your settings and your guest record on this device. There are no ads, analytics or trackers.',
    accept: 'Accept all',
    reject: 'Reject all',
    customise: 'Customise',
    save: 'Save my choices',
    close: 'Close',
    always: 'Always on',
    cookiePolicy: 'Cookie Policy',
    privacyPolicy: 'Privacy Policy',
    language: 'Language',
    categories: {
      essential: { title: 'Essential', description: 'Keep you logged in, keep your match in progress and remember these choices.' },
      preferences: { title: 'Preferences', description: 'Remember your settings (including your language), your last game mode, map and seats, and your guest record.' },
      analytics: { title: 'Analytics', description: 'Not used today. If Bronze ever adds analytics, it will only run with this on.' },
      marketing: { title: 'Marketing', description: 'Not used today. If Bronze ever adds marketing tools, they will only run with this on.' },
    },
  },
  legal: {
    lastUpdated: 'Last updated:',
    translationNote: '',
    draft: (example: ReactNode): ReactNode => <>Draft: some details of who runs Bronze aren’t filled in yet (shown like {example}).</>,
    table: (caption: string) => `${caption} (table)`,
    freeToPlay: 'Bronze is free to play; nothing is sold.',
  },
  ...accountWords,
  brass: brassWords,
  welcome: welcomeWords,
  online: onlineWords,
}

export default en
