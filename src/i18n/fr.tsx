import type { ReactNode } from 'react'
import type { Quote } from '../game/engine'
import type { GameMessage } from '../game/messages'
import type { RULES } from '../game/rules'
import type { GoodsKind, IndustryKind, LogEntry, RouteKind } from '../game/types'
import { renderWith } from './game/en'
import game from './game/fr'
import { pluralizer } from './languages'
import accountWords from './account/fr'
import brassWords from './brass/fr'
import type { Messages } from './messages'

/* Tous les mots de l’écran en français (traduits de en.tsx). */

type Rules = typeof RULES
type Cost = { money: number; coal: number; iron: number }
type Era = 'canal' | 'rail'

const p = pluralizer('fr-FR')
const you = 'Vous'

const list = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`)
const or = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ou ${items.at(-1)}`)
/** « 3 coton », « 1 charbon » (comme des ressources de jeu) */
const amountOf = (n: number, goods: GoodsKind) => `${n} ${game.goods[goods]}`

const industries: Messages['industries'] = {
  coal: { name: game.industries.coal, output: (r: Rules) => `+1 charbon dans votre réserve à chaque manche (jusqu’à ${r.storeCap} ; le surplus est vendu £${r.coalOverflowValue})` },
  iron: { name: game.industries.iron, output: (r: Rules) => `+1 fer dans votre réserve à chaque manche (jusqu’à ${r.storeCap} ; le surplus est vendu £${r.ironOverflowValue})` },
  cotton: { name: game.industries.cotton, output: (r: Rules) => `+1 coton à la filature à chaque manche (contient ${r.goodsCapacity})` },
  port: { name: game.industries.port, output: (r: Rules) => `+£${r.portIncome} à chaque manche. Achète le coton £${r.portPrice} ; les autres vous paient £${r.portFee} par unité` },
  shipyard: { name: game.industries.shipyard, output: () => '+1★ à chaque manche' },
}

const lower = (kind: IndustryKind) => industries[kind].name.charAt(0).toLowerCase() + industries[kind].name.slice(1)
const routeKind = (kind: RouteKind) => (kind === 'canal' ? 'canal' : 'voie ferrée')

const fr: Messages = {
  common: {
    you,
    player: (n: number) => `Joueur ${n}`,
    close: 'Fermer',
    closeNamed: (title: string) => `Fermer : ${title}`,
    dismiss: 'Masquer',
    done: 'Terminé',
    cancel: 'Annuler',
    back: 'Retour',
    logIn: 'Se connecter',
    logOut: 'Se déconnecter',
    register: 'S’inscrire',
    logInToUse: 'Connectez-vous pour l’utiliser',
    logInToUseNote: '(connexion requise)',
    comingSoon: 'Bientôt',
    notAvailable: 'indisponible',
    skipToContent: 'Aller au contenu',
  },
  brand: {
    home: 'Bronze : menu principal',
    tagline: 'Bâtir · Relier · Industrialiser',
  },
  nav: {
    lobby: 'Salon',
    main: 'Navigation principale',
    mainMenu: 'Menu principal',
    play: 'Jouer',
    tournaments: 'Tournois',
    locker: 'Vestiaire',
    shop: 'Boutique',
    achievements: 'Succès',
    board: 'Plateau',
    howToPlay: 'Comment jouer',
    settings: 'Paramètres',
    credits: 'Crédits',
    legal: 'Mentions légales',
    profile: 'Profil',
    more: 'Plus',
    closeMore: 'Fermer le menu',
    account: 'Compte',
    accountMenu: (name: string, record: string) => `${name} : ${record}. Menu du compte`,
    yourProfile: (name: string, record: string) => `${name} : ${record}. Votre profil`,
    checkingAccount: 'Vérification de votre compte',
    retryAccount: 'Réessayer',
    retryAccountTip: 'Recharger votre compte',
    privacy: 'Politique de confidentialité',
    terms: 'Conditions d’utilisation',
    refunds: 'Politique de remboursement',
    cookies: 'Politique relative aux cookies',
    legalNotice: 'Informations légales',
    dataRequest: 'Demandes de données',
  },
  record: (wins: number, matches: number) =>
    `${p(wins, { one: `${wins} victoire`, other: `${wins} victoires` })} · ${p(matches, { one: `${matches} partie`, other: `${matches} parties` })}`,
  list,
  or,
  amountOf,
  stats: {
    wins: 'Victoires',
    bestScore: 'Meilleur score',
    matches: 'Parties',
    goodsShipped: 'Marchandises expédiées',
    saveFailed: 'Impossible d’enregistrer votre palmarès sur votre compte. Il est conservé sur cet appareil et sera enregistré à votre prochaine connexion.',
    guestMoved: 'Votre progression d’invité a été ajoutée à votre compte.',
  },
  lobby: {
    tournamentsTeaser: 'Tableaux classés et coupes saisonnières.',
    achievementsUnlocked: 'Succès débloqués',
    next: 'Prochain :',
    allAchievements: 'Tous les succès sont débloqués.',
    outdatedTitle: 'La partie enregistrée ne peut pas être reprise',
    outdatedBody: 'Elle a été enregistrée par une ancienne version de Bronze, dont les règles ont changé.',
    discard: 'L’effacer',
    gameMode: 'Mode de jeu',
    social: 'Amis et progression',
    continueMatch: 'Reprendre la partie',
    abandon: 'Abandonner',
    resume: 'Reprendre',
    abandoned: 'Partie abandonnée',
    opponentsTitle: 'Adversaires',
    mixed: 'Personnalisé : humains et ordinateurs mélangés (voir Places)',
    opponents: { computer: 'Contre l’ordinateur', pass: 'Chacun son tour', online: 'En ligne' },
    onlineNeedsServer: 'Le jeu en ligne nécessite un serveur de jeu, que Bronze n’a pas encore',
  },
  friends: {
    title: 'Amis',
    addByUsername: 'Ajouter un ami par pseudo',
    add: 'Ajouter un ami',
    none: 'Pas encore d’amis',
    noServer:
      'Les listes d’amis et les parties en ligne nécessitent un serveur de jeu, et Bronze n’en a pas encore. En attendant, jouez contre l’ordinateur ou à plusieurs sur cet appareil.',
    guest: 'Connectez-vous pour ajouter des amis. En attendant, jouez contre l’ordinateur ou à plusieurs sur cet appareil.',
    online: 'En ligne',
    pending: 'En attente',
  },
  modes: {
    normal: { name: 'Normal', description: 'Carte entière, règles complètes. Toute la saga industrielle.' },
    blitz: { name: 'Blitz', description: 'Carte plus petite, temps plus court. Chaque décision compte.' },
    bullet: { name: 'Bullet', description: 'La plus petite carte, très peu de temps. Construisez à l’instinct.' },
    mapSize: { full: 'Carte entière', reduced: 'Carte réduite', compact: 'Carte compacte' },
    perTurn: (time: string) => `${time} par tour`,
  },
  maps: {
    'wales-and-the-west': {
      terrain: 'Canaux et chemins de fer',
      flavor: 'Charbon gallois, ateliers des Midlands et ports de la Severn. Creusez d’abord les canaux, puis lancez-vous dans la course au rail.',
    },
    'mersey-valley': { terrain: 'Fleuve et port', flavor: 'Un large fleuve à marée alimente un port animé. Descendez vos marchandises avant vos rivaux.' },
    'black-country': { terrain: 'Charbon et fer', flavor: 'Veines de charbon, fonderies et enchevêtrement de canaux. Encombré, impitoyable et rougeoyant toute la nuit.' },
    'pennine-mills': { terrain: 'Landes et filatures', flavor: 'Des villes de filatures nichées entre des landes battues par le vent. Eaux vives, pentes raides et peu de routes faciles.' },
  },
  setup: {
    title: 'Préparer la partie',
    rounds: (n: number) => p(n, { one: `${n} manche`, other: `${n} manches` }),
    roundsPerEra: (n: number) => p(n, { one: `${n} manche par ère`, other: `${n} manches par ère` }),
    moneyEach: (n: number) => `£${n} chacun`,
    railFrom: (round: number) => `ère du rail dès la manche ${round}`,
    map: 'Carte',
    practiceMap: 'Carte d’entraînement, sans ères.',
    players: 'Joueurs',
    playersRange: (min: number, max: number) => (min === max ? `${min} joueurs` : `${min}–${max} joueurs`),
    towns: (n: number) => p(n, { one: `${n} ville`, other: `${n} villes` }),
    mapTakes: (map: string, min: number, max: number) => `${map} se joue à ${min}–${max} joueurs`,
    seats: 'Places',
    seatName: (seat: number) => `Nom de la place ${seat}`,
    playedBy: (seat: number) => `Qui joue la place ${seat}`,
    human: 'Humain',
    ai: 'IA',
    seatColour: (seat: number) => `Couleur de la place ${seat}`,
    colourSwapLabel: (colour: string, seat: number) => `${colour} (échanger avec la place ${seat})`,
    colourSwapTitle: (colour: string, seat: number) => `${colour} : prise par la place ${seat} ; la choisir échange les couleurs`,
    difficulty: (seat: number) => `Difficulté de la place ${seat}`,
    humanSeats: 'Les places humaines jouent chacune leur tour sur cet appareil.',
    advancedSeed: 'Avancé : graine',
    seedLabel: 'Graine (facultatif)',
    random: 'Aléatoire',
    seedHelp: 'La même graine et les mêmes places rejouent les mêmes coups de l’ordinateur. Laissez vide pour une nouvelle partie.',
    seedInvalid: 'Une graine est un nombre entier de 9 chiffres au plus.',
    replaces: 'Lancer une nouvelle partie remplace la partie en cours.',
    start: 'Lancer la partie',
  },
  colors: { yellow: 'Jaune', blue: 'Bleu', purple: 'Violet', red: 'Rouge', white: 'Blanc' },
  aiLevels: { easy: 'Facile', normal: 'Normale', hard: 'Difficile' },
  pages: {
    shop: {
      title: 'Boutique',
      empty: 'Les rayons sont en cours de réassort.',
      blurb: 'Plateaux décoratifs, habillages de bâtiments et jeux de pions, tout frais sortis de la fonderie.',
      locked: 'Les achats sont liés à votre compte : connectez-vous pour acheter et les conserver.',
    },
    locker: {
      title: 'Vestiaire',
      empty: 'Votre vestiaire est vide — gagnez une partie pour obtenir vos premières pièces.',
      blurb: 'Équipez votre industriel et choisissez vos pions, garnitures de plateau et bannières.',
      locked: 'Votre vestiaire appartient à votre compte : connectez-vous pour garder ce que vous collectionnez.',
    },
    tournaments: {
      title: 'Tournois',
      empty: 'Le palais de l’Exposition est calme. Revenez bientôt.',
      blurb: 'Tableaux classés et coupes saisonnières pour les industriels les plus ambitieux.',
      locked: 'Les tournois se jouent avec votre compte : connectez-vous pour participer.',
    },
    achievements: { empty: 'Aucune distinction au mur pour l’instant. Votre première victoire vous attend.' },
  },
  achievements: {
    yourRecord: 'Votre palmarès',
    unlocked: (total: number) => `${total} débloqués`,
    savedAccount: 'Enregistré sur votre compte.',
    savedDevice: 'Enregistré sur cet appareil uniquement.',
    logInToSave: 'Connectez-vous pour enregistrer sur votre compte',
    unlockedOn: (date: string) => `Débloqué le ${date}`,
    list: {
      'first-shift': { name: 'Premier poste', description: 'Terminez une partie.' },
      foreman: { name: 'Contremaître', description: 'Gagnez une partie.' },
      'quick-draw': { name: 'Dégaine rapide', description: 'Gagnez une partie Bullet.' },
      'full-house': { name: 'Salle comble', description: 'Gagnez une partie à quatre joueurs.' },
      'merchant-fleet': { name: 'Flotte marchande', description: 'Expédiez 12 marchandises en une partie.' },
      'iron-web': { name: 'Toile de fer', description: 'Possédez 6 liaisons en une partie.' },
      'engine-room': { name: 'Constructeur naval', description: 'Construisez 2 chantiers navals en une partie.' },
      tycoon: { name: 'Magnat', description: 'Marquez 55 points ou plus dans une partie.' },
      'grand-tour': { name: 'Grand Tour', description: 'Terminez une partie sur chaque carte.' },
      veteran: { name: 'Vétéran', description: 'Terminez 10 parties.' },
    },
  },
  profile: {
    locked: 'Votre profil garde votre pseudo, votre palmarès et vos succès sur votre compte, sur tous vos appareils.',
    memberSince: (date: string) => `Membre depuis le ${date}`,
  },
  notFound: {
    title: 'Cette voie n’a pas encore été posée',
    body: 'Il n’y a rien à cette adresse.',
    back: 'Retour au salon',
  },

  game,
  gameMessage: (message: GameMessage) => renderWith(game, message),
  logEntry: (entry: LogEntry) => (entry.msg ? renderWith(game, entry.msg) : entry.text),
  cost: (c: Cost) => game.cost(c),
  quote: (q: Quote) => {
    const bought = [q.coalBought && amountOf(q.coalBought, 'coal'), q.ironBought && amountOf(q.ironBought, 'iron')].filter(Boolean)
    const used = [q.coalUsed && amountOf(q.coalUsed, 'coal'), q.ironUsed && amountOf(q.ironUsed, 'iron')].filter(Boolean)
    const notes = [bought.length ? `achète ${bought.join(' + ')}` : '', used.length ? `utilise votre ${used.join(' + ')}` : ''].filter(Boolean).join(', ')
    return `£${q.total}${notes ? ` (${notes})` : ''}`
  },
  industries,
  actions: {
    buildIndustry: 'Construire une industrie',
    from: (n: number) => `Dès £${n}`,
    buildLink: 'Construire une liaison',
    ship: 'Expédier',
    sourcesReady: (n: number) => p(n, { one: `${n} source prête`, other: `${n} sources prêtes` }),
    raiseFunds: 'Lever des fonds',
    endTurn: 'Finir le tour',
    skipsLast: 'Saute la dernière action',
    skipsBoth: 'Saute les deux actions',
    canalCost: (money: number) => `Canal £${money}`,
    railwayCost: (quote: string) => `Voie ferrée ${quote}`,
    bothCosts: (canal: number, rail: number) => `Canal £${canal} · Voie ferrée £${rail} + charbon`,
    cancelAction: 'Annuler cette action',
    buildAnIndustry: 'Construire une industrie',
    buildHint: 'Choisissez quoi construire. Les prix incluent le charbon ou le fer acheté pour vous.',
    buildA: (kind: IndustryKind) => `Construire : ${lower(kind)}`,
    buildWhere: (quote: string, prestige: number): ReactNode => (
      <>
        {quote}, +{prestige}★. <strong className="text-brass-200">Cliquez sur un emplacement lumineux</strong> du plateau, ou choisissez-en un ici.
      </>
    ),
    slot: (n: number) => `emplacement ${n}`,
    buildALink: 'Construire une liaison',
    linkHint: (era: Era | null, canal: number, rail: number, coalPrice: number, prestige: number): ReactNode => (
      <>
        {era === 'canal'
          ? `Ère des canaux : un canal coûte £${canal}.`
          : era === 'rail'
            ? `Ère du rail : une voie ferrée coûte £${rail} + 1 charbon (acheté £${coalPrice} si vous n’en avez pas).`
            : `Canaux £${canal} ; voies ferrées £${rail} + 1 charbon.`}{' '}
        +{prestige}★. <strong className="text-brass-200">Cliquez sur une bulle lumineuse</strong>, ou choisissez-en une ici.
      </>
    ),
    routeKind: { canal: 'canal', rail: 'voie ferrée' },
    inStore: (goods: string) => `${goods} en réserve`,
    shipHint: (
      <>
        Choisissez quoi expédier : le coton d’une filature, ou tout le charbon ou le fer de votre réserve depuis une de vos mines ou fonderies.{' '}
        <strong className="text-brass-200">Les cases lumineuses</strong> du plateau fonctionnent aussi.
      </>
    ) as ReactNode,
    shipLoad: (goods: string) => `Expédier ${goods}`,
    shipFrom: (source: string): ReactNode => (
      <>
        Depuis : {source}. <strong className="text-brass-200">Cliquez sur un marché lumineux</strong> du plateau, ou choisissez-en un ici, pour voir ce qu’il paie.
      </>
    ),
    cantPayFees: (n: number) => `Vous ne pouvez pas payer les £${n} de péages et de droits`,
    sameTown: 'même ville',
    links: (n: number) => p(n, { one: `${n} liaison`, other: `${n} liaisons` }),
    cantAffordTolls: 'Péages trop chers',
    revenue: 'Recette',
    tolls: 'Péages',
    ownLinksOnly: 'Uniquement vos liaisons',
    portFee: 'Droits de port',
    feePerUnit: (fee: number, owner: string) => `£${fee} par unité à ${owner}`,
    youGet: 'Vous recevez',
    prestige: 'Prestige',
    doubled: (n: number) => `doublé : ${n} liaisons`,
    shipTo: (market: string) => `Expédier vers ${market}`,
    shipSummary: (goods: string, from: string, routes: string[], drop: { market: string; price: number } | null) =>
      `${goods} depuis ${from}${routes.length ? ` via ${routes.join(', ')}` : ''}.${drop ? ` Le prix de ${drop.market} passe ensuite à £${drop.price}.` : ''}`,
    confirmShipment: 'Confirmer l’expédition',
  },
  match: {
    final: 'Final',
    roundOf: (round: number, total: number) => `Manche ${round}/${total}`,
    actionsLeft: (left: number, total: number) => p(left, { one: `${left} action restante sur ${total}`, other: `${left} actions restantes sur ${total}` }),
    actionsLeftTitle: 'Actions restantes ce tour',
    board: 'Plateau',
    actions: 'Actions',
    seeResults: 'Voir les résultats',
    waitingFor: (name: string) => `En attente que ${name} prenne l’appareil…`,
    panels: 'Panneaux de la partie',
    players: 'Joueurs',
    markets: 'Marchés',
    log: 'Journal',
    matchLog: 'Journal de partie',
    yourTurn: 'À vous de jouer',
    passTo: (name: string) => `Passez à ${name}`,
    handOver: 'Passez l’appareil, puis commencez le tour. Le chrono attend.',
    startYourTurn: 'Commencer votre tour',
    startTurnOf: (name: string) => `Commencer le tour de ${name}`,
    over: 'Partie terminée',
    isPlaying: (name: string) => `${name} joue`,
    turnOf: (name: string) => `Au tour de ${name}`,
    actionOf: (n: number, total: number) => `action ${n} sur ${total}`,
    fastForward: 'Avance rapide',
    fastForwardTitle: 'Laisser les joueurs ordinateur agir sans pause',
    aiLevel: (level: string) => `IA ${level.toLowerCase()}`,
    choosing: 'choisit une action.',
    last: (text: string) => `Dernier : ${text}`,
    canalEraTitle: (round: number) => `Ère des canaux : l’ère du rail commence à la manche ${round}`,
    railEraTitle: 'Ère du rail : les canaux sont fermés',
    era: { canal: 'Ère des canaux', rail: 'Ère du rail' },
    menu: 'Menu de la partie',
    legal: 'Mentions légales et confidentialité',
    saved: 'La partie est enregistrée après chaque action.',
    timerLabel: (secs: number, paused: boolean) => `${secs} secondes restantes pour ce tour${paused ? ', en pause' : ''}`,
    timerPaused: 'Chrono en pause',
    timeLeft: 'Temps restant pour ce tour',
    eraBanner: {
      title: 'L’ère du rail commence — les canaux ferment',
      removed: (n: number) => (n === 0 ? 'Aucun canal n’avait été creusé.' : p(n, { one: `${n} liaison fluviale retirée.`, other: `${n} liaisons fluviales retirées.` })),
      opens: (places: string) => `On peut désormais poser des voies ferrées ; ${places} ouvrent.`,
      clickToContinue: 'Cliquez pour continuer',
    },
  },
  playersPanel: {
    turn: 'Tour',
    prestigeTitle: 'Prestige gagné jusqu’ici',
    money: 'Argent',
    coal: 'Charbon',
    iron: 'Fer',
    industries: 'Ind.',
    industriesTitle: (n: number) => p(n, { one: `${n} industrie possédée`, other: `${n} industries possédées` }),
    links: 'Liais.',
    linksTitle: (n: number, built: number) => `${p(n, { one: `${n} liaison possédée`, other: `${n} liaisons possédées` })} (${built} construites au total)`,
    ifEnded: 'Si fin',
    ifEndedTitle: (prestige: number, money: number, hubs: number) => `Score si la partie finissait maintenant : ${prestige}★ + ${money} pour l’argent + ${hubs} pour les pôles`,
  },
  marketsPanel: {
    buys: (goods: string) => `Achète ${goods}`,
    down: (base: number, recovery: number) => `En baisse depuis £${base} ; remonte de £${recovery} par manche`,
    full: 'Au prix plein',
    note: (r: Rules, ports: string[]) =>
      `Chaque unité vendue fait baisser le prix d’un pôle de £${r.priceDropPerGoods} (pas en dessous de £${r.priceFloor}). Les ports achètent le coton au prix fixe de £${r.portPrice}${
        ports.length ? ` : ${ports.join(', ')}.` : ' ; aucun construit pour l’instant.'
      }`,
  },
  results: {
    title: 'Résultats',
    shared: (names: string[]) => `Victoire partagée : ${names.join(' & ')}`,
    youWin: 'Vous gagnez !',
    wins: (name: string) => `${name} gagne`,
    nobody: 'Personne',
    rematch: 'Revanche',
    formula: 'Total = ★ gagnées en jeu + 1★ par tranche de £5 détenue + 2★ par pôle dans votre réseau. En cas d’égalité, le plus riche l’emporte.',
    finalScores: 'Scores finaux',
    player: 'Joueur',
    playStars: '★ de jeu',
    moneyBonus: 'Bonus argent',
    hubBonus: 'Bonus pôles',
    total: 'Total',
    stats: 'Statistiques de la partie',
    linksBuilt: 'Liaisons construites',
    industries: 'Industries',
    achievementsUnlocked: 'Succès débloqués',
  },
  zoom: {
    group: (label: string) => `${label} : zoom`,
    in: 'Zoom avant',
    out: 'Zoom arrière',
    reset: 'Voir tout le plateau',
  },
  boardLabels: {
    gameBoard: 'Plateau de jeu',
    mapAlt: 'Carte illustrée du pays de Galles, des Midlands et du sud-ouest de l’Angleterre',
    route: (from: string, to: string, kind: RouteKind) => `${routeKind(kind)} ${from}–${to}`,
    buildRoute: (route: string, cost: string) => `Construire : ${route}, ${cost}`,
    routeTitle: (from: string, to: string, kind: RouteKind, owner: string | null) => `${from} – ${to} (${routeKind(kind)}${owner ? `, ${owner}` : ''})`,
    link: (from: string, to: string, era: Era, extra: string | null) => `${from}–${to} (${routeKind(era)})${extra ? ` : ${extra}` : ''}`,
    shipTo: (town: string, pays: string) => `Expédier vers ${town} : ${pays}`,
    townTitle: (town: string, price: number | null) => (price === null ? town : `${town} — ville marchande, achète coton, charbon et fer à £${price} l’unité`),
    slotFree: (town: string, n: number, kinds: IndustryKind[]) => `${town}, emplacement ${n} : ${or(kinds.map(lower))}, libre`,
    slotBuilt: (town: string, n: number, owner: string, kind: IndustryKind, cotton: number | null) =>
      `${town}, emplacement ${n} : ${lower(kind)} (${owner === you ? 'à vous' : owner})${cotton !== null ? `, ${amountOf(cotton, 'cotton')}` : ''}`,
    builtBy: (name: string) => `construite par ${name}`,
    notBuilt: 'pas encore construite',
  },
  tooltip: {
    connections: 'Liaisons',
    linkType: { canal: 'Canal', rail: 'Rail', both: 'Canal et rail' },
    eraOnly: { canal: 'ère des canaux', rail: 'ère du rail' },
    city: (region: string) => `Ville · ${region}`,
    stop: 'Halte · les liaisons la traversent ; ni construction ni commerce',
    hub: 'Pôle commercial · on y vend des marchandises',
    railOnly: 'Disponible à l’ère du rail',
    owned: (owner: string, kind: IndustryKind) => `${industries[kind].name} (${owner === you ? 'à vous' : owner})`,
    buys: 'Achète :',
    priceNow: 'Prix actuel :',
    priceRule: (max: number) => `l’unité, £1 de moins par unité vendue (remonte de £1 par manche, jusqu’à £${max})`,
    both: (era: Era) => `Canal et rail · ${era === 'canal' ? 'un canal' : 'une voie ferrée'} à cette ère`,
    only: (kind: Era) => (kind === 'canal' ? 'Canal uniquement' : 'Rail uniquement'),
    builtBy: (era: Era, name: string) => `${era === 'canal' ? 'Canal creusé' : 'Voie ferrée posée'} par ${name}`,
  },
  mapBoard: {
    editMap: 'Modifier la carte',
    doneEditing: 'Terminer',
    draftNote: 'Affiche votre calibrage non enregistré de ce navigateur. Ouvrez le mode édition pour l’exporter ou l’abandonner.',
    era: 'Ère',
    eraNote: (era: Era, railOnly: string) =>
      `Seules les liaisons de cette ère sont dessinées : ${era === 'canal' ? 'les canaux, les liaisons « mixtes » en canaux' : 'les voies ferrées, les liaisons « mixtes » en voies ferrées'}. ${railOnly} ne sont accessibles qu’à l’ère du rail.`,
    sandbox: 'Bac à sable',
    tool: 'Outil',
    inspect: 'Inspecter',
    place: 'Poser des tuiles',
    placeFor: 'Poser des tuiles pour',
    inspectHint: 'Cliquez sur un lieu, un emplacement ou un repère de liaison pour voir ses détails.',
    placeHint: 'Cliquez sur un emplacement pour y construire (encore : changer d’industrie, puis vider), ou sur un repère de liaison pour la prendre.',
    preview: 'Ceci est un aperçu des constructions, pas une partie.',
    clear: 'Retirer les tuiles',
    selected: 'Sélection',
    regions: 'Régions',
    stopKey: 'Halte (ni construction ni commerce)',
    hubKey: 'Pôle commercial',
    nothing: 'Rien de sélectionné pour l’instant.',
    usable: (active: boolean, era: Era) => `${active ? 'utilisable' : 'fermée'} à ${era === 'canal' ? 'l’ère des canaux' : 'l’ère du rail'}`,
    bend: (value: number) => (value === 0 ? 'droite' : `courbure ${value > 0 ? '+' : ''}${value} %`),
    stop: 'Halte',
    hub: 'Pôle commercial',
    offset: (x: number, y: number) => `plaque décalée de ${x} %, ${y} %`,
    startsAt: (price: number) => `départ à £${price}`,
  },
  rules: {
    title: 'Règles',
    goal: {
      title: 'But',
      body: (r: Rules): ReactNode => (
        <>
          Avoir le plus haut total à la fin de la dernière manche : les <strong className="text-brass-300">★ gagnées</strong> en jeu, plus 1★ par tranche de £
          {r.moneyPerPrestige} détenue, plus {r.hubBonus}★ par pôle commercial de votre réseau. En cas d’égalité, le plus riche l’emporte ; si l’argent est aussi à
          égalité, la victoire est partagée.
        </>
      ),
    },
    setup: {
      title: 'Mise en place et modes',
      body: (maxPlayers: number) =>
        `2 à ${maxPlayers} joueurs, chacun humain ou ordinateur (facile, normal ou difficile), chacun de sa couleur. Tout le monde commence avec l’argent du mode, sans charbon, sans fer et sans ★. La manche 1 se joue dans l’ordre des places ; à chaque manche, la première place avance d’un cran.`,
      columns: ['Mode', 'Carte', 'Manches', 'Ère du rail dès', 'Argent', 'Chrono du tour'],
      rings: { full: 'Carte entière', reduced: 'Anneaux 1–2', compact: 'Anneau 1 seul' },
      round: (n: number) => `manche ${n}`,
      faded: 'Les lieux hors des anneaux du mode, et leurs liaisons, sont estompés et ne font pas partie de la partie. Le chrono peut être désactivé dans les Paramètres.',
    },
    turn: {
      title: (n: number) => `Votre tour : ${n} actions`,
      intro: 'Vous pouvez finir votre tour plus tôt. Si le chrono s’écoule, les actions restantes sont perdues.',
      build: {
        name: 'Construire une industrie',
        body: (railOnly: string) =>
          `Sur un emplacement libre qui l’accepte, dans une ville de votre réseau. Votre toute première construction de la partie peut se faire n’importe où. Rien ne peut être construit à ${railOnly} pendant l’ère des canaux. Payez le coût et gagnez les ★ de l’industrie.`,
      },
      link: {
        name: 'Construire une liaison',
        body: (canal: string, rail: string, prestige: number) =>
          `Un tracé non construit qui existe à l’ère actuelle et touche votre réseau (n’importe où, avant votre première construction). Un canal coûte ${canal} ; une voie ferrée ${rail}. +${prestige}★, et la liaison est à vous.`,
      },
      ship: {
        name: 'Expédier',
        intro: 'Choisissez une de vos industries et un marché qu’elle peut atteindre :',
        sources: [
          'une filature de coton envoie tout son coton vers un pôle qui achète du coton, ou vers n’importe quel port (le vôtre ou celui d’un autre joueur) ;',
          'une mine de charbon envoie tout le charbon de votre réserve vers un pôle qui achète du charbon ;',
          'une fonderie envoie tout le fer de votre réserve vers un pôle qui achète du fer.',
        ],
        body: (r: Rules) =>
          `Les marchandises passent par les liaisons construites de l’ère actuelle, quel que soit leur propriétaire ; l’industrie et le marché peuvent être dans la même ville. On prend le chemin avec le moins de liaisons adverses, puis le plus court. Chaque liaison adverse coûte un péage de £${r.toll}, payé à son propriétaire. Un pôle paie son prix actuel pour chaque unité, et le prix baisse de £${r.priceDropPerGoods} à chaque unité vendue (jamais sous £${r.priceFloor}) : à £6, trois unités rapportent £6 + £5 + £4. Un port paie £${r.portPrice} l’unité ; dans le port d’un autre joueur, vous lui payez £${r.portFee} l’unité. Vous gagnez +1★ par unité, doublé si les marchandises ont emprunté ${r.longHaulLinks} liaisons ou plus. Impossible d’expédier si votre argent plus la recette ne couvre pas les péages et droits. Ensuite, la filature ou votre réserve de charbon ou de fer est vide.`,
      },
      funds: { name: 'Lever des fonds', body: (n: number) => `Prenez £${n}.` },
      end: { name: 'Finir le tour', body: 'Termine votre tour tout de suite.' },
    },
    industries: {
      title: 'Industries',
      emptyStore: (total: number) => `(£${total} avec une réserve vide)`,
      supply: (r: Rules) =>
        `Le charbon et le fer qui vous manquent pour un coût sont achetés pour vous à la réserve générale : £${r.coalPrice} le charbon, £${r.ironPrice} le fer. Les prix affichés en jeu l’incluent. Votre réserve contient jusqu’à ${r.storeCap} charbon et ${r.storeCap} fer ; ce que vos mines et fonderies produisent au-delà est vendu £${r.coalOverflowValue} le charbon et £${r.ironOverflowValue} le fer.`,
    },
    network: {
      title: 'Votre réseau',
      body: 'Chaque ville où vous possédez une industrie, plus les deux extrémités de chaque liaison que vous possédez. Pôles et haltes comptent comme des villes. Vous ne pouvez construire n’importe où que jusqu’à votre première construction. Si votre réseau disparaît plus tard (par exemple, vos seules liaisons étaient des canaux retirés par l’ère du rail), vous construisez encore à côté de toute ville où vous possédez une industrie ; si vous n’en possédez aucune, vous pouvez de nouveau construire n’importe où, et le journal l’indique.',
    },
    roundEnd: {
      title: 'Fin de chaque manche',
      steps: (r: Rules) => [
        'Les industries produisent (voir plus haut).',
        `Chaque joueur reçoit £${r.baseIncome}.`,
        `Le prix de chaque pôle remonte de £${r.priceRecovery}, jusqu’à son prix de départ.`,
        'Si l’ère du rail commence à la manche suivante, toutes les liaisons fluviales quittent le plateau. Les propriétaires gardent leurs ★, et les industries restent.',
        'Après la dernière manche, la partie se termine et on compte les points.',
      ],
    },
    eras: {
      title: 'Les ères et le plateau',
      body: (railOnly: string) =>
        `La partie commence à l’ère des canaux. Seul le réseau de l’ère actuelle est sur le plateau : d’abord les tracés fluviaux et « mixtes » en canaux, puis les tracés ferroviaires et « mixtes » en voies ferrées. ${railOnly} (marqués d’une locomotive) ne sont accessibles que par le rail et ouvrent donc à l’ère du rail.`,
      bubbleAlt: 'Une bulle de liaison vide',
      bubble: 'Une bulle vide : une liaison que personne n’a construite. Elle brille quand vous pouvez la construire.',
      hexAlt: 'Un hexagone de liaison',
      hex: (stops: string) => `Deux hexagones marquent les haltes (${stops} : les liaisons les traversent, ni construction ni commerce) et les pôles.`,
      canalAlt: 'Un pion de canal construit',
      canal: 'Un canal construit, à la couleur de son propriétaire.',
      railAlt: 'Un pion de voie ferrée construite',
      rail: 'Une voie ferrée construite, à la couleur de son propriétaire.',
      hubsIntro: 'Les pôles commerciaux et ce qu’ils achètent (le prix sur le badge est le prix actuel) :',
      hub: (price: number, buys: string, railOnly: boolean) => `départ à £${price}, achète ${buys}${railOnly ? ' (ère du rail uniquement)' : ''}`,
    },
    practice: {
      title: 'Cartes d’entraînement',
      body: (maps: string) =>
        `${maps} sont des cartes dessinées sans ères : canaux et voies ferrées peuvent être construits à tout moment et rien n’est retiré. Leurs villes marchandes fonctionnent comme des pôles et achètent coton, charbon et fer. Tout le reste est identique.`,
    },
  },

  auth: {
    username: 'Pseudo',
    usernameHint: '3 à 20 caractères : lettres, chiffres et _.',
    email: 'E-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    strength: (label: string) => `Robustesse : ${label}`,
    strengths: { weak: 'faible', ok: 'moyenne', strong: 'forte' },
    available: 'Disponible',
    taken: 'Pris',
    checking: 'Vérification…',
    usernameTaken: 'Ce pseudo est déjà pris.',
    usernameCheckFailed: 'Impossible de vérifier ce pseudo. Réessayez.',
    google: 'Continuer avec Google',
    or: 'ou',
    registerOrLogIn: 'S’inscrire ou se connecter',
    newHere: 'Nouveau ici ?',
    haveAccount: 'J’ai déjà un compte',
    keepPlaying: 'Continuer en tant qu’invité',
    backToLogIn: 'Retour à la connexion',
    cancelSignup: 'Annuler l’inscription',
    notConfigured: 'Les comptes ne sont pas encore configurés. Vous pouvez continuer en tant qu’invité ; rien ici ne vous connectera.',
    welcome: (name: string | null, isNew: boolean) => (name ? `${isNew ? 'Bienvenue' : 'Bon retour'}, ${name} !` : 'Bienvenue !'),
    loggedOut: 'Déconnecté',
    passwordUpdated: 'Mot de passe modifié',
    profileFailed: 'Connecté, mais votre profil n’a pas pu être chargé.',
    signupCancelled: 'Inscription annulée. Rien n’a été conservé.',
    signupLoggedOut: 'Déconnecté. L’inscription inachevée sera supprimée automatiquement.',
    login: {
      intro: 'Bon retour, industriel.',
      identifier: 'Pseudo ou e-mail',
      enterIdentifier: 'Saisissez votre pseudo ou votre e-mail.',
      enterPassword: 'Saisissez votre mot de passe.',
      remember: 'Se souvenir de moi',
      forgot: 'Mot de passe oublié ?',
      loggingIn: 'Connexion…',
      tryAgainIn: (s: number) => `Réessayer dans ${s} s`,
      tooMany: (s: number) => `Trop d’essais : attendez ${s} secondes avant de réessayer.`,
    },
    register: {
      title: 'Créer un compte',
      create: 'Créer le compte',
      creating: 'Création du compte…',
      intro: 'Enregistrez votre palmarès et préparez-vous à jouer avec vos amis et en ligne.',
      googleNote: 'Avec Google aussi, vous confirmerez votre âge et accepterez les Conditions avant la création de votre compte.',
      chooseAge: 'Choisissez votre tranche d’âge.',
      mustAgree: 'Acceptez les Conditions et la Politique de confidentialité pour continuer.',
    },
    checkEmail: {
      title: 'Vérifiez vos e-mails',
      body: (email: ReactNode): ReactNode => <>Confirmez votre compte par e-mail. Nous avons envoyé un lien à {email} ; ouvrez-le dans ce navigateur pour terminer.</>,
      spam: 'Pas d’e-mail après quelques minutes ? Regardez dans vos indésirables.',
      back: 'Retour au salon',
      again: 'Mauvaise adresse ? Recommencer l’inscription',
    },
    choose: {
      title: 'Finalisez votre compte',
      signedInAs: (who: string) => `Connecté avec Google en tant que ${who}`,
      yourGoogle: 'votre compte Google',
      intro: 'Choisissez le nom que verront les autres joueurs. Votre compte Bronze n’est créé que si vous continuez.',
      deleteAndPlay: 'Supprimer cette connexion et jouer en invité',
      notNow: 'Pas maintenant : annuler et supprimer ce que Google a transmis',
    },
    forgot: {
      title: 'Mot de passe oublié',
      intro: 'Saisissez l’e-mail de votre inscription et nous vous enverrons un lien pour choisir un nouveau mot de passe.',
      sent: 'Si un compte existe pour cet e-mail, nous avons envoyé un lien de réinitialisation. Consultez votre boîte de réception (et les indésirables).',
      send: 'Envoyer le lien',
      resend: 'Renvoyer le lien',
      resendIn: (s: number) => `Renvoyer dans ${s} s`,
    },
    reset: {
      title: 'Choisir un nouveau mot de passe',
      checking: 'Vérification de votre lien…',
      invalid: 'Ce lien de réinitialisation est invalide ou a expiré.',
      howLinksWork: 'Les liens de réinitialisation fonctionnent une fois, pour une durée limitée, dans le navigateur où vous les avez demandés. Demandez-en un nouveau et ouvrez-le ici.',
      newPassword: 'Nouveau mot de passe',
      confirmNew: 'Confirmer le nouveau mot de passe',
      submit: 'Enregistrer le mot de passe',
    },
    callback: {
      signingIn: 'Connexion en cours',
      failed: 'Connexion impossible',
      moment: 'Un instant…',
      linkProblem:
        'Ce lien de connexion ne peut pas être utilisé ici : il a peut-être expiré, déjà servi, ou été ouvert dans un autre navigateur. Si vous venez de confirmer votre e-mail, connectez-vous maintenant.',
      nothing: 'Il n’y a rien à terminer ici. Essayez de vous reconnecter.',
    },
  },
  authErrors: {
    'invalid-credentials': 'Pseudo/e-mail ou mot de passe incorrect.',
    'email-not-confirmed': 'Confirmez d’abord votre e-mail : suivez le lien que nous vous avons envoyé, puis connectez-vous.',
    'email-taken': 'Cet e-mail est déjà inscrit. Connectez-vous ou réinitialisez votre mot de passe.',
    'username-taken': 'Ce pseudo est déjà pris. Choisissez-en un autre.',
    'rate-limited': 'Trop de tentatives. Attendez une minute, puis réessayez.',
    'weak-password': 'Ce mot de passe est trop facile à deviner. Choisissez-en un plus robuste.',
    'same-password': 'Choisissez un mot de passe différent de l’actuel.',
    'link-invalid': 'Ce lien est invalide ou a expiré.',
    cancelled: 'La connexion a été annulée. Réessayez, ou utilisez votre pseudo ou votre e-mail.',
    network: 'Le serveur des comptes est injoignable. Vérifiez votre connexion et réessayez.',
    'wrong-password': 'Votre mot de passe actuel est incorrect.',
    'too-soon': 'Vous pouvez changer de pseudo une fois tous les 30 jours.',
    'same-username': 'C’est déjà votre pseudo.',
    'reauth-needed': 'Pour votre sécurité, reconnectez-vous, puis réessayez.',
    'mfa-required': 'Saisissez d’abord votre code de double authentification.',
    'invalid-code': 'Ce code est erroné ou a expiré. Vérifiez-le et réessayez.',
    unavailable: 'Ce n’est pas encore disponible.',
    'last-identity': 'Vous ne pouvez pas supprimer votre seul moyen de connexion. Définissez d’abord un mot de passe ou liez un autre compte.',
    'identity-taken': 'Ce compte est déjà lié à un autre joueur de Bronze.',
    'invalid-input': 'Vérifiez votre saisie et réessayez.',
    unknown: 'Une erreur s’est produite. Veuillez réessayer.',
  },
  validation: {
    chooseUsername: 'Choisissez un pseudo.',
    atLeast: (n: number) => `Au moins ${n} caractères.`,
    atMost: (n: number) => `Au plus ${n} caractères.`,
    usernameChars: 'Lettres, chiffres et _ uniquement.',
    enterEmail: 'Saisissez votre e-mail.',
    validEmail: 'Saisissez un e-mail valide, par exemple nom@exemple.fr.',
    choosePassword: 'Choisissez un mot de passe.',
    typeAgain: 'Saisissez à nouveau le mot de passe.',
    noMatch: 'Les mots de passe ne correspondent pas.',
    sameUsername: 'C’est déjà votre pseudo.',
    enterCurrentPassword: 'Saisissez votre mot de passe actuel.',
    sameAsCurrent: 'Choisissez un mot de passe différent de l’actuel.',
  },
  consents: {
    howOld: 'Quel âge avez-vous ?',
    ages: {
      'under-14': (min: number) => `Moins de ${min} ans`,
      '14-17': (min: number) => `${min} à 17 ans`,
      '18+': () => '18 ans ou plus',
    },
    noBirthDate: 'Nous ne demandons pas votre date de naissance.',
    underAge: (min: number) =>
      `Il faut avoir au moins ${min} ans pour avoir un compte. Vous pouvez tout de même jouer à tous les modes hors ligne en tant qu’invité, et rien vous concernant n’est conservé sur nos serveurs.`,
    agree: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        J’accepte les {terms} et la {privacy}
      </>
    ),
    terms: 'Conditions d’utilisation',
    privacy: 'Politique de confidentialité',
    newTab: '(s’ouvre dans un nouvel onglet)',
    required: '(obligatoire)',
    marketing: 'M’envoyer les nouvelles de Bronze par e-mail',
    marketingNote: '(facultatif ; désinscription à tout moment)',
  },
  account: {
    exportNote: 'Tout ce que Bronze conserve à votre sujet. Les parties se jouent dans votre navigateur : il n’y a donc pas d’historique de parties sur le serveur.',
    downloading: 'Vos données sont en cours de téléchargement.',
    loggedInAs: (name: ReactNode, email: string | null): ReactNode => (
      <>
        Connecté en tant que {name}
        {email ? ` (${email})` : ''}.
      </>
    ),
    guest: 'Vous jouez en tant qu’invité : rien vous concernant n’est conservé sur nos serveurs. Vos paramètres, votre palmarès et votre partie restent dans ce navigateur.',
    download: 'Télécharger mes données',
    downloadAccount: 'Votre profil, palmarès, consentements et choix d’e-mails, plus les données de cet appareil, dans un fichier.',
    downloadGuest: 'Ce que Bronze conserve dans ce navigateur, dans un fichier.',
    downloadButton: 'Télécharger',
    delete: 'Supprimer mon compte',
    deleteNote: 'Supprime votre compte et tout ce qui y est enregistré. C’est irréversible.',
    deleteButton: 'Supprimer',
    clear: 'Effacer cet appareil',
    clearNote: (signedIn: boolean) => `Supprime tout ce que Bronze a enregistré dans ce navigateur${signedIn ? ' et vous y déconnecte' : ''}. Votre compte est conservé.`,
    clearButton: 'Effacer',
    clearAsk: 'Effacer…',
    keep: 'Garder',
    deleted: 'Votre compte et ses données ont été supprimés. Vous jouez maintenant en tant qu’invité.',
    deleteDialog: {
      title: 'Supprimer votre compte ?',
      intro: 'Ceci supprime, immédiatement et définitivement :',
      items: [
        'votre identifiant (adresse e-mail et mot de passe, ou votre connexion Google),',
        'votre pseudo, avatar, palmarès et succès,',
        'votre réponse sur l’âge, vos consentements et vos choix d’e-mails.',
      ],
      note: 'Les parties se jouent dans votre navigateur : aucun historique de parties n’est conservé sur nos serveurs. Vos données d’invité dans ce navigateur restent jusqu’à ce que vous les effaciez.',
      typeToConfirm: (name: ReactNode): ReactNode => <>Saisissez votre pseudo, {name}, pour confirmer</>,
    },
    notifications: {
      guest: 'Connectez-vous pour choisir les e-mails que vous recevez. Les invités ne reçoivent jamais d’e-mails.',
      loading: 'Chargement de vos choix d’e-mails…',
      intro: 'Les e-mails du compte (confirmation d’adresse, réinitialisation du mot de passe) sont toujours envoyés. Le reste dépend de vous ; Bronze n’en envoie encore aucun.',
      lists: {
        marketing: { label: 'Nouvelles de Bronze', description: 'Nouvelles fonctionnalités et événements. Uniquement avec votre accord, et jamais aux moins de 18 ans.' },
        friends: { label: 'E-mails d’amis', description: 'Quand quelqu’un vous envoie une demande d’ami.' },
        tournaments: { label: 'E-mails de tournois', description: 'Rappels pour les tournois auxquels vous participez.' },
      },
      from18: 'Disponible dès 18 ans.',
      nowAdult: 'J’ai maintenant 18 ans ou plus',
    },
    privacy: {
      cookies: 'Paramètres des cookies',
      cookiesNote: 'Modifier ce que Bronze peut conserver dans ce navigateur.',
      open: 'Ouvrir',
    },
  },
  settings: {
    reset: 'Réinitialiser',
    game: 'Jeu',
    animationSpeed: 'Vitesse des animations',
    animationHint: 'Les éclairs et le point d’expédition sur le plateau.',
    aiSpeed: 'Vitesse de l’ordinateur',
    aiSpeedHint: 'La pause entre les actions d’un joueur ordinateur.',
    speeds: { slow: 'Lente', normal: 'Normale', fast: 'Rapide', off: 'Désactivée' },
    moveTimer: 'Chrono des tours',
    moveTimerHint: 'Chaque tour a une limite de temps ; une fois écoulée, le reste du tour est perdu. Désactivé : jeu sans limite.',
    showLog: 'Afficher le journal de partie',
    audio: 'Audio',
    sound: 'Son',
    masterVolume: 'Volume général',
    musicVolume: 'Volume de la musique',
    general: 'Général',
    language: 'Langue',
    account: 'Compte',
    notifications: 'Notifications',
    privacy: 'Confidentialité',
  },
  cookieBanner: {
    title: 'Cookies et stockage',
    body: 'Bronze conserve quelques éléments dans votre navigateur. Les essentiels vous gardent connecté et conservent votre partie en cours. Avec votre accord, Bronze mémorise aussi vos paramètres et votre palmarès d’invité sur cet appareil. Aucune publicité, aucune mesure d’audience, aucun traceur.',
    accept: 'Tout accepter',
    reject: 'Tout refuser',
    customise: 'Personnaliser',
    save: 'Enregistrer mes choix',
    close: 'Fermer',
    always: 'Toujours actifs',
    cookiePolicy: 'Politique relative aux cookies',
    privacyPolicy: 'Politique de confidentialité',
    language: 'Langue',
    categories: {
      essential: { title: 'Essentiels', description: 'Vous gardent connecté, conservent votre partie en cours et mémorisent ces choix.' },
      preferences: { title: 'Préférences', description: 'Mémorisent vos paramètres (dont la langue), votre dernier mode de jeu, carte et places, et votre palmarès d’invité.' },
      analytics: { title: 'Mesure d’audience', description: 'Pas utilisés aujourd’hui. Si Bronze ajoute un jour de la mesure d’audience, elle ne fonctionnera qu’avec ceci activé.' },
      marketing: { title: 'Marketing', description: 'Pas utilisés aujourd’hui. Si Bronze ajoute un jour des outils marketing, ils ne fonctionneront qu’avec ceci activé.' },
    },
  },
  legal: {
    lastUpdated: 'Dernière mise à jour :',
    translationNote: 'Cette traduction est fournie pour votre commodité. En cas de divergence avec le texte anglais, la version anglaise fait foi.',
    draft: (example: ReactNode): ReactNode => <>Brouillon : certaines informations sur l’exploitant de Bronze ne sont pas encore renseignées (affichées ainsi : {example}).</>,
    table: (caption: string) => `${caption} (tableau)`,
    freeToPlay: 'Bronze est gratuit ; rien n’est vendu.',
  },
  ...accountWords,
  brass: brassWords,
}

export default fr
