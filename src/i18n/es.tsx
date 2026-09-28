import type { ReactNode } from 'react'
import type { Quote } from '../game/engine'
import type { GameMessage } from '../game/messages'
import type { RULES } from '../game/rules'
import type { GoodsKind, IndustryKind, LogEntry, RouteKind } from '../game/types'
import { renderWith } from './game/en'
import game from './game/es'
import { pluralizer } from './languages'
import type { Messages } from './messages'

/* Todas las palabras de la pantalla en español (traducidas de en.tsx). */

type Rules = typeof RULES
type Cost = { money: number; coal: number; iron: number }
type Era = 'canal' | 'rail'

const p = pluralizer('es-ES')
const you = 'Tú'

const list = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`)
const or = (items: readonly string[]) => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} o ${items.at(-1)}`)
/** «3 algodón», «1 carbón» (como recursos de juego) */
const amountOf = (n: number, goods: GoodsKind) => `${n} ${game.goods[goods]}`

const industries: Messages['industries'] = {
  coal: { name: game.industries.coal, output: (r: Rules) => `+1 carbón a tu reserva cada ronda (hasta ${r.storeCap}; el excedente se vende a £${r.coalOverflowValue})` },
  iron: { name: game.industries.iron, output: (r: Rules) => `+1 hierro a tu reserva cada ronda (hasta ${r.storeCap}; el excedente se vende a £${r.ironOverflowValue})` },
  cotton: { name: game.industries.cotton, output: (r: Rules) => `+1 algodón en la hilandería cada ronda (caben ${r.goodsCapacity})` },
  port: { name: game.industries.port, output: (r: Rules) => `+£${r.portIncome} cada ronda. Compra algodón a £${r.portPrice}; los demás te pagan £${r.portFee} por unidad` },
  shipyard: { name: game.industries.shipyard, output: () => '+1★ cada ronda' },
}

const lower = (kind: IndustryKind) => industries[kind].name.charAt(0).toLowerCase() + industries[kind].name.slice(1)
const routeKind = (kind: RouteKind) => (kind === 'canal' ? 'canal' : 'vía férrea')

const es: Messages = {
  common: {
    you,
    player: (n: number) => `Jugador ${n}`,
    close: 'Cerrar',
    closeNamed: (title: string) => `Cerrar: ${title}`,
    dismiss: 'Descartar',
    done: 'Listo',
    cancel: 'Cancelar',
    back: 'Atrás',
    logIn: 'Iniciar sesión',
    logOut: 'Cerrar sesión',
    register: 'Registrarse',
    logInToUse: 'Inicia sesión para usarlo',
    logInToUseNote: '(requiere iniciar sesión)',
    comingSoon: 'Próximamente',
    notAvailable: 'no disponible',
    skipToContent: 'Saltar al contenido',
  },
  brand: {
    home: 'Bronze: menú principal',
    tagline: 'Construye · Conecta · Industrializa',
  },
  nav: {
    lobby: 'Vestíbulo',
    main: 'Navegación principal',
    mainMenu: 'Menú principal',
    play: 'Jugar',
    tournaments: 'Torneos',
    locker: 'Taquilla',
    shop: 'Tienda',
    achievements: 'Logros',
    board: 'Tablero',
    howToPlay: 'Cómo jugar',
    settings: 'Ajustes',
    credits: 'Créditos',
    legal: 'Aviso legal',
    profile: 'Perfil',
    more: 'Más',
    closeMore: 'Cerrar menú',
    account: 'Cuenta',
    accountMenu: (name: string, record: string) => `${name}: ${record}. Menú de la cuenta`,
    yourProfile: (name: string, record: string) => `${name}: ${record}. Tu perfil`,
    checkingAccount: 'Comprobando tu cuenta',
    retryAccount: 'Reintentar',
    retryAccountTip: 'Volver a cargar tu cuenta',
    privacy: 'Política de privacidad',
    terms: 'Condiciones del servicio',
    refunds: 'Política de reembolsos',
    cookies: 'Política de cookies',
    legalNotice: 'Datos de la empresa',
    dataRequest: 'Solicitudes de datos',
  },
  record: (wins: number, matches: number) =>
    `${p(wins, { one: `${wins} victoria`, other: `${wins} victorias` })} · ${p(matches, { one: `${matches} partida`, other: `${matches} partidas` })}`,
  list,
  or,
  amountOf,
  stats: {
    wins: 'Victorias',
    bestScore: 'Mejor puntuación',
    matches: 'Partidas',
    goodsShipped: 'Mercancías enviadas',
    saveFailed: 'No se pudo guardar tu historial en tu cuenta. Se conserva en este dispositivo y se guardará la próxima vez que inicies sesión.',
    guestMoved: 'Tu progreso como invitado se ha añadido a tu cuenta.',
  },
  lobby: {
    tournamentsTeaser: 'Cuadros clasificatorios y copas de temporada.',
    achievementsUnlocked: 'Logros desbloqueados',
    next: 'Siguiente:',
    allAchievements: 'Todos los logros desbloqueados.',
    outdatedTitle: 'La partida guardada no se puede continuar',
    outdatedBody: 'Se guardó con una versión anterior de Bronze, cuyas reglas han cambiado.',
    discard: 'Descartarla',
    gameMode: 'Modo de juego',
    social: 'Amigos y progreso',
    continueMatch: 'Continuar partida',
    abandon: 'Abandonar',
    resume: 'Reanudar',
    abandoned: 'Partida abandonada',
    opponentsTitle: 'Rivales',
    mixed: 'Personalizado: humanos y ordenadores mezclados (ver Asientos)',
    opponents: { computer: 'Contra el ordenador', pass: 'Por turnos', online: 'En línea' },
    onlineNeedsServer: 'Jugar en línea requiere un servidor de juego, que Bronze aún no tiene',
  },
  friends: {
    title: 'Amigos',
    addByUsername: 'Añadir amigo por nombre de usuario',
    add: 'Añadir amigo',
    none: 'Aún no tienes amigos',
    noServer:
      'Las listas de amigos y las partidas en línea requieren un servidor de juego, y Bronze aún no lo tiene. Mientras tanto, juega contra el ordenador o por turnos en este dispositivo.',
    guest: 'Inicia sesión para añadir amigos. Mientras tanto, juega contra el ordenador o por turnos en este dispositivo.',
    online: 'En línea',
    pending: 'Pendientes',
  },
  modes: {
    normal: { name: 'Normal', description: 'Mapa completo, reglas completas. Toda la saga industrial.' },
    blitz: { name: 'Blitz', description: 'Mapa más pequeño y menos tiempo. Cada decisión cuenta.' },
    bullet: { name: 'Bullet', description: 'El mapa más pequeño, muy poco tiempo. Construye por instinto.' },
    mapSize: { full: 'Mapa completo', reduced: 'Mapa reducido', compact: 'Mapa compacto' },
    perTurn: (time: string) => `${time} por turno`,
  },
  maps: {
    'wales-and-the-west': {
      terrain: 'Canales y ferrocarriles',
      flavor: 'Carbón galés, talleres de las Midlands y puertos del Severn. Primero excava canales y luego compite por tender las vías.',
    },
    'mersey-valley': { terrain: 'Río y puerto', flavor: 'Un ancho río de marea alimenta un puerto bullicioso. Lleva tus mercancías río abajo antes que tus rivales.' },
    'black-country': { terrain: 'Carbón y hierro', flavor: 'Vetas de carbón, fundiciones y una maraña de canales. Abarrotado, despiadado y resplandeciente toda la noche.' },
    'pennine-mills': { terrain: 'Páramos e hilanderías', flavor: 'Pueblos de hilanderías entre páramos azotados por el viento. Aguas rápidas, cuestas empinadas y pocas rutas fáciles.' },
  },
  setup: {
    title: 'Preparar la partida',
    rounds: (n: number) => p(n, { one: `${n} ronda`, other: `${n} rondas` }),
    moneyEach: (n: number) => `£${n} cada uno`,
    railFrom: (round: number) => `era del ferrocarril desde la ronda ${round}`,
    map: 'Mapa',
    practiceMap: 'Mapa de práctica, sin eras.',
    players: 'Jugadores',
    playersRange: (min: number, max: number) => (min === max ? `${min} jugadores` : `${min}–${max} jugadores`),
    towns: (n: number) => p(n, { one: `${n} ciudad`, other: `${n} ciudades` }),
    mapTakes: (map: string, min: number, max: number) => `${map} es para ${min}–${max} jugadores`,
    seats: 'Asientos',
    seatName: (seat: number) => `Nombre del asiento ${seat}`,
    playedBy: (seat: number) => `Quién juega el asiento ${seat}`,
    human: 'Humano',
    ai: 'IA',
    seatColour: (seat: number) => `Color del asiento ${seat}`,
    colourSwapLabel: (colour: string, seat: number) => `${colour} (intercambiar con el asiento ${seat})`,
    colourSwapTitle: (colour: string, seat: number) => `${colour}: lo tiene el asiento ${seat}; elegirlo intercambia los colores`,
    difficulty: (seat: number) => `Dificultad del asiento ${seat}`,
    humanSeats: 'Los asientos humanos se turnan en este dispositivo.',
    advancedSeed: 'Avanzado: semilla',
    seedLabel: 'Semilla (opcional)',
    random: 'Aleatoria',
    seedHelp: 'La misma semilla y los mismos asientos repiten las mismas jugadas del ordenador. Déjala vacía para una partida nueva.',
    seedInvalid: 'Una semilla es un número entero de hasta 9 cifras.',
    replaces: 'Empezar una partida nueva sustituye la partida en curso.',
    start: 'Empezar partida',
  },
  colors: { yellow: 'Amarillo', blue: 'Azul', purple: 'Morado', red: 'Rojo', white: 'Blanco' },
  aiLevels: { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' },
  pages: {
    shop: {
      title: 'Tienda',
      empty: 'Estamos reponiendo los estantes.',
      blurb: 'Tableros decorativos, aspectos de edificios y juegos de fichas, recién salidos de la fundición.',
      locked: 'Las compras van ligadas a tu cuenta: inicia sesión para comprar y conservarlas.',
    },
    locker: {
      title: 'Taquilla',
      empty: 'Tu taquilla está vacía — gana una partida para conseguir tus primeras piezas.',
      blurb: 'Equipa a tu industrial y elige tus fichas, adornos de tablero y estandartes.',
      locked: 'Tu taquilla pertenece a tu cuenta: inicia sesión para que lo que coleccionas siga siendo tuyo.',
    },
    tournaments: {
      title: 'Torneos',
      empty: 'El pabellón de la Exposición está en calma. Vuelve pronto.',
      blurb: 'Cuadros clasificatorios y copas de temporada para los industriales más ambiciosos.',
      locked: 'Los torneos se juegan con tu cuenta: inicia sesión para participar.',
    },
    achievements: { empty: 'Aún no hay honores en la pared. Tu primera victoria te espera.' },
  },
  achievements: {
    yourRecord: 'Tu historial',
    unlocked: (total: number) => `${total} desbloqueados`,
    savedAccount: 'Guardado en tu cuenta.',
    savedDevice: 'Guardado solo en este dispositivo.',
    logInToSave: 'Inicia sesión para guardarlo en tu cuenta',
    unlockedOn: (date: string) => `Desbloqueado el ${date}`,
    list: {
      'first-shift': { name: 'Primer turno', description: 'Termina una partida.' },
      foreman: { name: 'Capataz', description: 'Gana una partida.' },
      'quick-draw': { name: 'Desenfunde rápido', description: 'Gana una partida Bullet.' },
      'full-house': { name: 'Casa llena', description: 'Gana una partida de cuatro jugadores.' },
      'merchant-fleet': { name: 'Flota mercante', description: 'Envía 12 mercancías en una partida.' },
      'iron-web': { name: 'Red de hierro', description: 'Posee 6 enlaces en una partida.' },
      'engine-room': { name: 'Carpintero de ribera', description: 'Construye 2 astilleros en una partida.' },
      tycoon: { name: 'Magnate', description: 'Consigue 55 puntos o más en una partida.' },
      'grand-tour': { name: 'Gran gira', description: 'Termina una partida en cada mapa.' },
      veteran: { name: 'Veterano', description: 'Termina 10 partidas.' },
    },
  },
  profile: {
    locked: 'Tu perfil guarda tu nombre de usuario, historial y logros en tu cuenta, en cualquier dispositivo.',
    memberSince: (date: string) => `Miembro desde el ${date}`,
  },
  notFound: {
    title: 'Esta línea aún no se ha tendido',
    body: 'No hay nada en esta dirección.',
    back: 'Volver al vestíbulo',
  },

  game,
  gameMessage: (message: GameMessage) => renderWith(game, message),
  logEntry: (entry: LogEntry) => (entry.msg ? renderWith(game, entry.msg) : entry.text),
  cost: (c: Cost) => game.cost(c),
  quote: (q: Quote) => {
    const bought = [q.coalBought && amountOf(q.coalBought, 'coal'), q.ironBought && amountOf(q.ironBought, 'iron')].filter(Boolean)
    const used = [q.coalUsed && amountOf(q.coalUsed, 'coal'), q.ironUsed && amountOf(q.ironUsed, 'iron')].filter(Boolean)
    const notes = [bought.length ? `compra ${bought.join(' + ')}` : '', used.length ? `usa tu ${used.join(' + ')}` : ''].filter(Boolean).join(', ')
    return `£${q.total}${notes ? ` (${notes})` : ''}`
  },
  industries,
  actions: {
    buildIndustry: 'Construir industria',
    from: (n: number) => `Desde £${n}`,
    buildLink: 'Construir enlace',
    ship: 'Enviar',
    sourcesReady: (n: number) => p(n, { one: `${n} origen listo`, other: `${n} orígenes listos` }),
    raiseFunds: 'Reunir fondos',
    endTurn: 'Terminar turno',
    skipsLast: 'Omite la última acción',
    skipsBoth: 'Omite ambas acciones',
    canalCost: (money: number) => `Canal £${money}`,
    railwayCost: (quote: string) => `Vía férrea ${quote}`,
    bothCosts: (canal: number, rail: number) => `Canal £${canal} · Vía férrea £${rail} + carbón`,
    cancelAction: 'Cancelar esta acción',
    buildAnIndustry: 'Construir una industria',
    buildHint: 'Elige qué construir. Los precios incluyen el carbón o el hierro que se compre por ti.',
    buildA: (kind: IndustryKind) => `Construir: ${lower(kind)}`,
    buildWhere: (quote: string, prestige: number): ReactNode => (
      <>
        {quote}, +{prestige}★. <strong className="text-brass-200">Haz clic en una parcela iluminada</strong> del tablero, o elige una aquí.
      </>
    ),
    slot: (n: number) => `parcela ${n}`,
    buildALink: 'Construir un enlace',
    linkHint: (era: Era | null, canal: number, rail: number, coalPrice: number, prestige: number): ReactNode => (
      <>
        {era === 'canal'
          ? `Era de los canales: un canal cuesta £${canal}.`
          : era === 'rail'
            ? `Era del ferrocarril: una vía férrea cuesta £${rail} + 1 carbón (se compra por £${coalPrice} si no tienes).`
            : `Canales £${canal}; vías férreas £${rail} + 1 carbón.`}{' '}
        +{prestige}★. <strong className="text-brass-200">Haz clic en una burbuja iluminada</strong>, o elige una aquí.
      </>
    ),
    routeKind: { canal: 'canal', rail: 'vía férrea' },
    inStore: (goods: string) => `${goods} en tu reserva`,
    shipHint: (
      <>
        Elige qué enviar: el algodón de una hilandería, o todo el carbón o hierro de tu reserva desde una de tus minas o fundiciones.{' '}
        <strong className="text-brass-200">Las casillas iluminadas</strong> del tablero también sirven.
      </>
    ) as ReactNode,
    shipLoad: (goods: string) => `Enviar ${goods}`,
    shipFrom: (source: string): ReactNode => (
      <>
        Desde: {source}. <strong className="text-brass-200">Haz clic en un mercado iluminado</strong> del tablero, o elige uno aquí, para ver cuánto paga.
      </>
    ),
    cantPayFees: (n: number) => `No puedes pagar las £${n} de peajes y tasas`,
    sameTown: 'misma ciudad',
    links: (n: number) => p(n, { one: `${n} enlace`, other: `${n} enlaces` }),
    cantAffordTolls: 'No alcanza para los peajes',
    revenue: 'Ingresos',
    tolls: 'Peajes',
    ownLinksOnly: 'Solo tus propios enlaces',
    portFee: 'Tasa portuaria',
    feePerUnit: (fee: number, owner: string) => `£${fee} por unidad a ${owner}`,
    youGet: 'Recibes',
    prestige: 'Prestigio',
    doubled: (n: number) => `doble: ${n} enlaces`,
    shipTo: (market: string) => `Enviar a ${market}`,
    shipSummary: (goods: string, from: string, routes: string[], drop: { market: string; price: number } | null) =>
      `${goods} desde ${from}${routes.length ? ` por ${routes.join(', ')}` : ''}.${drop ? ` Después el precio de ${drop.market} baja a £${drop.price}.` : ''}`,
    confirmShipment: 'Confirmar envío',
  },
  match: {
    final: 'Final',
    roundOf: (round: number, total: number) => `Ronda ${round}/${total}`,
    actionsLeft: (left: number, total: number) => p(left, { one: `Queda ${left} de ${total} acciones`, other: `Quedan ${left} de ${total} acciones` }),
    actionsLeftTitle: 'Acciones que quedan en este turno',
    board: 'Tablero',
    actions: 'Acciones',
    seeResults: 'Ver resultados',
    waitingFor: (name: string) => `Esperando a que ${name} tome el dispositivo…`,
    panels: 'Paneles de la partida',
    players: 'Jugadores',
    markets: 'Mercados',
    log: 'Registro',
    matchLog: 'Registro de la partida',
    yourTurn: 'Tu turno',
    passTo: (name: string) => `Pásalo a ${name}`,
    handOver: 'Pasa el dispositivo y luego empieza el turno. El temporizador espera.',
    startYourTurn: 'Empezar tu turno',
    startTurnOf: (name: string) => `Empezar el turno de ${name}`,
    over: 'Partida terminada',
    isPlaying: (name: string) => `Juega ${name}`,
    turnOf: (name: string) => `Turno de ${name}`,
    actionOf: (n: number, total: number) => `acción ${n} de ${total}`,
    fastForward: 'Avance rápido',
    fastForwardTitle: 'Dejar que los jugadores del ordenador actúen sin pausas',
    aiLevel: (level: string) => `IA ${level.toLowerCase()}`,
    choosing: 'está eligiendo una acción.',
    last: (text: string) => `Última: ${text}`,
    canalEraTitle: (round: number) => `Era de los canales: la era del ferrocarril empieza en la ronda ${round}`,
    railEraTitle: 'Era del ferrocarril: los canales han cerrado',
    era: { canal: 'Era de los canales', rail: 'Era del ferrocarril' },
    menu: 'Menú de la partida',
    legal: 'Aviso legal y privacidad',
    saved: 'La partida se guarda después de cada acción.',
    timerLabel: (secs: number, paused: boolean) => `Quedan ${secs} segundos en este turno${paused ? ', en pausa' : ''}`,
    timerPaused: 'Temporizador en pausa',
    timeLeft: 'Tiempo que queda en este turno',
    eraBanner: {
      title: 'Empieza la era del ferrocarril — los canales cierran',
      removed: (n: number) => (n === 0 ? 'No se había excavado ningún canal.' : p(n, { one: `Se retira ${n} enlace de canal.`, other: `Se retiran ${n} enlaces de canal.` })),
      opens: (places: string) => `Ya se pueden tender vías férreas; se abren ${places}.`,
      clickToContinue: 'Haz clic para continuar',
    },
  },
  playersPanel: {
    turn: 'Turno',
    prestigeTitle: 'Prestigio ganado hasta ahora',
    money: 'Dinero',
    coal: 'Carbón',
    iron: 'Hierro',
    industries: 'Ind.',
    industriesTitle: (n: number) => p(n, { one: `${n} industria en propiedad`, other: `${n} industrias en propiedad` }),
    links: 'Enlaces',
    linksTitle: (n: number, built: number) => `${p(n, { one: `${n} enlace`, other: `${n} enlaces` })} en propiedad (${built} construidos en total)`,
    ifEnded: 'Si acaba',
    ifEndedTitle: (prestige: number, money: number, hubs: number) => `Puntuación si la partida acabara ahora: ${prestige}★ + ${money} por dinero + ${hubs} por nodos`,
  },
  marketsPanel: {
    buys: (goods: string) => `Compra ${goods}`,
    down: (base: number, recovery: number) => `Bajó desde £${base}; se recupera £${recovery} por ronda`,
    full: 'A precio completo',
    note: (r: Rules, ports: string[]) =>
      `Cada unidad vendida baja el precio de un nodo en £${r.priceDropPerGoods} (no por debajo de £${r.priceFloor}). Los puertos compran algodón a un precio fijo de £${r.portPrice}${
        ports.length ? `: ${ports.join(', ')}.` : '; aún no se ha construido ninguno.'
      }`,
  },
  results: {
    title: 'Resultados',
    shared: (names: string[]) => `Victoria compartida: ${names.join(' y ')}`,
    youWin: '¡Has ganado!',
    wins: (name: string) => `Gana ${name}`,
    nobody: 'Nadie',
    rematch: 'Revancha',
    formula: 'Total = ★ ganadas en juego + 1★ por cada £5 que tengas + 2★ por cada nodo de tu red. En caso de empate gana el más rico.',
    finalScores: 'Puntuaciones finales',
    player: 'Jugador',
    playStars: '★ de juego',
    moneyBonus: 'Bonus de dinero',
    hubBonus: 'Bonus de nodos',
    total: 'Total',
    stats: 'Estadísticas de la partida',
    linksBuilt: 'Enlaces construidos',
    industries: 'Industrias',
    achievementsUnlocked: 'Logros desbloqueados',
  },
  zoom: {
    group: (label: string) => `${label}: zoom`,
    in: 'Acercar',
    out: 'Alejar',
    reset: 'Ver todo el tablero',
  },
  boardLabels: {
    gameBoard: 'Tablero de juego',
    mapAlt: 'Mapa ilustrado de Gales, las Midlands y el suroeste de Inglaterra',
    route: (from: string, to: string, kind: RouteKind) => `${routeKind(kind)} ${from}–${to}`,
    buildRoute: (route: string, cost: string) => `Construir: ${route}, ${cost}`,
    routeTitle: (from: string, to: string, kind: RouteKind, owner: string | null) => `${from} – ${to} (${routeKind(kind)}${owner ? `, ${owner}` : ''})`,
    link: (from: string, to: string, era: Era, extra: string | null) => `${from}–${to} (${routeKind(era)})${extra ? `: ${extra}` : ''}`,
    shipTo: (town: string, pays: string) => `Enviar a ${town}: ${pays}`,
    townTitle: (town: string, price: number | null) => (price === null ? town : `${town} — ciudad comercial, compra algodón, carbón y hierro a £${price} la unidad`),
    slotFree: (town: string, n: number, kinds: IndustryKind[]) => `${town}, parcela ${n}: ${or(kinds.map(lower))}, libre`,
    slotBuilt: (town: string, n: number, owner: string, kind: IndustryKind, cotton: number | null) =>
      `${town}, parcela ${n}: ${lower(kind)} (${owner === you ? 'tuya' : owner})${cotton !== null ? `, ${amountOf(cotton, 'cotton')}` : ''}`,
    builtBy: (name: string) => `construido por ${name}`,
    notBuilt: 'aún sin construir',
  },
  tooltip: {
    connections: 'Conexiones',
    linkType: { canal: 'Canal', rail: 'Ferrocarril', both: 'Canal y ferrocarril' },
    eraOnly: { canal: 'era de los canales', rail: 'era del ferrocarril' },
    city: (region: string) => `Ciudad · ${region}`,
    stop: 'Parada · las rutas pasan por ella; sin construcción ni comercio',
    hub: 'Nodo comercial · aquí se venden las mercancías',
    railOnly: 'Disponible en la era del ferrocarril',
    owned: (owner: string, kind: IndustryKind) => `${industries[kind].name} (${owner === you ? 'tuya' : owner})`,
    buys: 'Compra:',
    priceNow: 'Precio actual:',
    priceRule: (max: number) => `la unidad, £1 menos por cada unidad vendida (se recupera £1 por ronda, hasta £${max})`,
    both: (era: Era) => `Canal y ferrocarril · ${era === 'canal' ? 'un canal' : 'una vía férrea'} en esta era`,
    only: (kind: Era) => (kind === 'canal' ? 'Solo canal' : 'Solo ferrocarril'),
    builtBy: (era: Era, name: string) => `${era === 'canal' ? 'Canal excavado' : 'Vía tendida'} por ${name}`,
  },
  mapBoard: {
    editMap: 'Editar mapa',
    doneEditing: 'Terminar de editar',
    draftNote: 'Se muestra tu calibración sin guardar de este navegador. Abre el modo de edición para exportarla o descartarla.',
    era: 'Era',
    eraNote: (era: Era, railOnly: string) =>
      `Solo se dibujan los enlaces de esta era: ${era === 'canal' ? 'canales, y los enlaces «mixtos» como canales' : 'vías férreas, y los enlaces «mixtos» como vías férreas'}. ${railOnly} solo se alcanzan en la era del ferrocarril.`,
    sandbox: 'Caja de arena',
    tool: 'Herramienta',
    inspect: 'Inspeccionar',
    place: 'Colocar fichas',
    placeFor: 'Colocar fichas para',
    inspectHint: 'Haz clic en un lugar, una parcela o un marcador de enlace para ver sus detalles.',
    placeHint: 'Haz clic en una parcela para construir ahí (otra vez: cambiar de industria, luego vaciar), o en un marcador de enlace para reclamarlo.',
    preview: 'Es una vista previa de cómo se ven las construcciones, no una partida.',
    clear: 'Quitar fichas',
    selected: 'Selección',
    regions: 'Regiones',
    stopKey: 'Parada (sin construcción ni comercio)',
    hubKey: 'Nodo comercial',
    nothing: 'Aún no hay nada seleccionado.',
    usable: (active: boolean, era: Era) => `${active ? 'utilizable' : 'cerrado'} en la ${era === 'canal' ? 'era de los canales' : 'era del ferrocarril'}`,
    bends: (n: number) => (n === 0 ? 'curva automática' : p(n, { one: `${n} punto de curva`, other: `${n} puntos de curva` })),
    stop: 'Parada',
    hub: 'Nodo comercial',
    offset: (x: number, y: number) => `placa desplazada ${x} %, ${y} %`,
    startsAt: (price: number) => `empieza en £${price}`,
  },
  rules: {
    title: 'Reglas',
    goal: {
      title: 'Objetivo',
      body: (r: Rules): ReactNode => (
        <>
          Tener el mayor total al acabar la última ronda: las <strong className="text-brass-300">★ que ganaste</strong> en juego, más 1★ por cada £
          {r.moneyPerPrestige} que tengas, más {r.hubBonus}★ por cada nodo comercial de tu red. En caso de empate gana el más rico; si también empatan en dinero, la
          victoria se comparte.
        </>
      ),
    },
    setup: {
      title: 'Preparación y modos',
      body: (maxPlayers: number) =>
        `De 2 a ${maxPlayers} jugadores, cada uno humano u ordenador (fácil, normal o difícil), cada uno con su color. Todos empiezan con el dinero del modo, sin carbón, sin hierro y sin ★. La ronda 1 se juega en el orden de los asientos; en cada ronda el primer asiento avanza uno.`,
      columns: ['Modo', 'Mapa', 'Rondas', 'Era del ferrocarril desde', 'Dinero', 'Tiempo por turno'],
      rings: { full: 'Mapa completo', reduced: 'Anillos 1–2', compact: 'Solo anillo 1' },
      round: (n: number) => `ronda ${n}`,
      faded: 'Los lugares fuera de los anillos del modo, y sus enlaces, se dibujan atenuados y no forman parte de la partida. El temporizador se puede desactivar en Ajustes.',
    },
    turn: {
      title: (n: number) => `Tu turno: ${n} acciones`,
      intro: 'Puedes terminar tu turno antes. Si se acaba el tiempo del turno, las acciones que te queden se pierden.',
      build: {
        name: 'Construir una industria',
        body: (railOnly: string) =>
          `En una parcela libre que lo permita, en una ciudad de tu red. Tu primera construcción de la partida puede ir en cualquier sitio. En ${railOnly} no se puede construir nada durante la era de los canales. Paga el coste y gana las ★ de la industria.`,
      },
      link: {
        name: 'Construir un enlace',
        body: (canal: string, rail: string, prestige: number) =>
          `Una ruta sin construir que exista en la era actual y toque tu red (en cualquier sitio, antes de tu primera construcción). Un canal cuesta ${canal}; una vía férrea, ${rail}. +${prestige}★, y el enlace es tuyo.`,
      },
      ship: {
        name: 'Enviar',
        intro: 'Elige una de tus industrias y un mercado al que llegue:',
        sources: [
          'una hilandería de algodón envía todo su algodón a un nodo que compre algodón, o a cualquier puerto (tuyo o de otro jugador);',
          'una mina de carbón envía todo el carbón de tu reserva a un nodo que compre carbón;',
          'una fundición envía todo el hierro de tu reserva a un nodo que compre hierro.',
        ],
        body: (r: Rules) =>
          `Las mercancías viajan por enlaces construidos de la era actual, de quien sean; la industria y el mercado pueden estar en la misma ciudad. Se usa el camino con menos enlaces rivales y, después, el más corto. Cada enlace rival cuesta un peaje de £${r.toll}, que se paga a su dueño. Un nodo paga su precio actual por cada unidad, y el precio baja £${r.priceDropPerGoods} con cada unidad vendida (nunca por debajo de £${r.priceFloor}): a £6, tres unidades pagan £6 + £5 + £4. Un puerto paga £${r.portPrice} por unidad; en el puerto de otro jugador le pagas £${r.portFee} por unidad. Ganas +1★ por unidad, el doble si las mercancías usaron ${r.longHaulLinks} enlaces o más. No puedes enviar si tu dinero más los ingresos no cubren los peajes y las tasas. Después, la hilandería, o tu reserva de carbón o de hierro, queda vacía.`,
      },
      funds: { name: 'Reunir fondos', body: (n: number) => `Toma £${n}.` },
      end: { name: 'Terminar turno', body: 'Termina tu turno ahora.' },
    },
    industries: {
      title: 'Industrias',
      emptyStore: (total: number) => `(£${total} con la reserva vacía)`,
      supply: (r: Rules) =>
        `El carbón y el hierro que te falten para un coste se compran por ti en el suministro general: £${r.coalPrice} el carbón, £${r.ironPrice} el hierro. Los precios que muestra el juego ya lo incluyen. Tu reserva guarda hasta ${r.storeCap} de carbón y ${r.storeCap} de hierro; lo que tus minas y fundiciones produzcan por encima se vende a £${r.coalOverflowValue} el carbón y £${r.ironOverflowValue} el hierro.`,
    },
    network: {
      title: 'Tu red',
      body: 'Cada ciudad en la que tengas una industria, más los dos extremos de cada enlace que poseas. Los nodos y las paradas cuentan como ciudades. Solo puedes construir en cualquier sitio hasta tu primera construcción. Si después tu red desaparece (por ejemplo, tus únicos enlaces eran canales y la era del ferrocarril los retiró), sigues construyendo junto a cualquier ciudad donde tengas una industria; si tampoco tienes ninguna industria, vuelves a poder construir en cualquier sitio, y el registro lo indica.',
    },
    roundEnd: {
      title: 'Final de cada ronda',
      steps: (r: Rules) => [
        'Las industrias producen (ver arriba).',
        `Cada jugador cobra £${r.baseIncome}.`,
        `El precio de cada nodo se recupera £${r.priceRecovery}, hasta su precio inicial.`,
        'Si la era del ferrocarril empieza en la ronda siguiente, todos los enlaces de canal salen del tablero. Los dueños conservan sus ★ y las industrias se quedan.',
        'Tras la última ronda, la partida termina y se puntúa.',
      ],
    },
    eras: {
      title: 'Las eras y el tablero',
      body: (railOnly: string) =>
        `La partida empieza en la era de los canales. En el tablero solo está la red de la era actual: primero las rutas de canal y las «mixtas» como canales, después las rutas de ferrocarril y las «mixtas» como vías férreas. ${railOnly} (marcados con una locomotora) solo se alcanzan por ferrocarril, así que se abren en la era del ferrocarril.`,
      bubbleAlt: 'Una burbuja de enlace vacía',
      bubble: 'Una burbuja vacía: un enlace que nadie ha construido. Brilla cuando puedes construirlo.',
      hexAlt: 'Un hexágono de enlace',
      hex: (stops: string) => `Dos hexágonos marcan las paradas (${stops}: las rutas pasan por ellas, sin construcción ni comercio) y los nodos.`,
      canalAlt: 'Una ficha de canal construido',
      canal: 'Un canal construido, del color de su dueño.',
      railAlt: 'Una ficha de vía férrea construida',
      rail: 'Una vía férrea construida, del color de su dueño.',
      hubsIntro: 'Nodos comerciales y lo que compran (el precio de la insignia es el actual):',
      hub: (price: number, buys: string, railOnly: boolean) => `empieza en £${price}, compra ${buys}${railOnly ? ' (solo en la era del ferrocarril)' : ''}`,
    },
    practice: {
      title: 'Mapas de práctica',
      body: (maps: string) =>
        `${maps} son mapas dibujados sin eras: los canales y las vías férreas se pueden construir en cualquier momento y no se retira nada. Sus ciudades comerciales funcionan como nodos y compran algodón, carbón y hierro. Todo lo demás es igual.`,
    },
  },

  auth: {
    username: 'Nombre de usuario',
    usernameHint: 'De 3 a 20 caracteres: letras, números y _.',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    strength: (label: string) => `Seguridad: ${label}`,
    strengths: { weak: 'débil', ok: 'aceptable', strong: 'fuerte' },
    available: 'Disponible',
    taken: 'Ocupado',
    checking: 'Comprobando…',
    usernameTaken: 'Ese nombre de usuario está ocupado.',
    usernameCheckFailed: 'No se pudo comprobar este nombre de usuario. Inténtalo de nuevo.',
    google: 'Continuar con Google',
    or: 'o',
    registerOrLogIn: 'Registrarse o iniciar sesión',
    newHere: '¿Eres nuevo?',
    haveAccount: 'Ya tengo una cuenta',
    keepPlaying: 'Seguir jugando como invitado',
    backToLogIn: 'Volver a iniciar sesión',
    cancelSignup: 'Cancelar el registro',
    notConfigured: 'Las cuentas aún no están configuradas. Puedes seguir jugando como invitado; nada de aquí iniciará tu sesión.',
    welcome: (name: string | null, isNew: boolean) => (name ? `${isNew ? '¡Te damos la bienvenida' : '¡Hola de nuevo'}, ${name}!` : '¡Te damos la bienvenida!'),
    loggedOut: 'Sesión cerrada',
    passwordUpdated: 'Contraseña actualizada',
    profileFailed: 'Sesión iniciada, pero no se pudo cargar tu perfil.',
    signupCancelled: 'Registro cancelado. No se ha guardado nada.',
    signupLoggedOut: 'Sesión cerrada. El registro sin terminar se eliminará automáticamente.',
    login: {
      intro: 'Hola de nuevo, industrial.',
      identifier: 'Nombre de usuario o correo electrónico',
      enterIdentifier: 'Escribe tu nombre de usuario o correo electrónico.',
      enterPassword: 'Escribe tu contraseña.',
      remember: 'Recordarme',
      forgot: '¿Has olvidado la contraseña?',
      loggingIn: 'Iniciando sesión…',
      tryAgainIn: (s: number) => `Reintentar en ${s} s`,
      tooMany: (s: number) => `Demasiados intentos: espera ${s} segundos antes de volver a intentarlo.`,
    },
    register: {
      title: 'Crear una cuenta',
      create: 'Crear cuenta',
      creating: 'Creando la cuenta…',
      intro: 'Guarda tu historial y prepárate para jugar con amigos y en línea.',
      googleNote: 'También con Google confirmarás tu edad y aceptarás las Condiciones antes de que se cree tu cuenta.',
      chooseAge: 'Elige tu grupo de edad.',
      mustAgree: 'Acepta las Condiciones y la Política de privacidad para continuar.',
    },
    checkEmail: {
      title: 'Revisa tu correo',
      body: (email: ReactNode): ReactNode => <>Confirma tu cuenta desde tu correo. Hemos enviado un enlace a {email}; ábrelo en este navegador para terminar.</>,
      spam: '¿No llega el correo tras unos minutos? Revisa la carpeta de spam.',
      back: 'Volver al vestíbulo',
      again: '¿Dirección equivocada? Registrarte de nuevo',
    },
    choose: {
      title: 'Completa tu cuenta',
      signedInAs: (who: string) => `Sesión iniciada con Google como ${who}`,
      yourGoogle: 'tu cuenta de Google',
      intro: 'Elige el nombre que verán los demás jugadores. Tu cuenta de Bronze solo se crea si continúas.',
      deleteAndPlay: 'Borrar este inicio de sesión y jugar como invitado',
      notNow: 'Ahora no: cancelar y borrar lo que compartió Google',
    },
    forgot: {
      title: 'Contraseña olvidada',
      intro: 'Escribe el correo con el que te registraste y te enviaremos un enlace para crear una contraseña nueva.',
      sent: 'Si existe una cuenta con ese correo, hemos enviado un enlace para restablecerla. Revisa tu bandeja de entrada (y el spam).',
      send: 'Enviar enlace',
      resend: 'Reenviar enlace',
      resendIn: (s: number) => `Reenviar en ${s} s`,
    },
    reset: {
      title: 'Crea una contraseña nueva',
      checking: 'Comprobando tu enlace…',
      invalid: 'Este enlace para restablecer la contraseña no es válido o ha caducado.',
      howLinksWork: 'Los enlaces para restablecer funcionan una sola vez, durante un tiempo limitado, en el navegador donde los pediste. Pide uno nuevo y ábrelo aquí.',
      newPassword: 'Contraseña nueva',
      confirmNew: 'Confirmar la contraseña nueva',
      submit: 'Guardar contraseña nueva',
    },
    callback: {
      signingIn: 'Iniciando sesión',
      failed: 'No se pudo iniciar sesión',
      moment: 'Un momento…',
      linkProblem:
        'Este enlace de inicio de sesión no se puede usar aquí: puede haber caducado, haberse usado ya o haberse abierto en otro navegador. Si acabas de confirmar tu correo, inicia sesión ahora.',
      nothing: 'Aquí no hay nada que terminar. Vuelve a intentar iniciar sesión.',
    },
  },
  authErrors: {
    'invalid-credentials': 'El nombre de usuario/correo o la contraseña no son correctos.',
    'email-not-confirmed': 'Primero confirma tu correo: sigue el enlace que te enviamos y luego inicia sesión.',
    'email-taken': 'Ese correo ya está registrado. Inicia sesión o restablece tu contraseña.',
    'username-taken': 'Ese nombre de usuario está ocupado. Elige otro.',
    'rate-limited': 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    'weak-password': 'Esa contraseña es demasiado fácil de adivinar. Elige una más segura.',
    'same-password': 'Elige una contraseña distinta de la actual.',
    'link-invalid': 'Este enlace no es válido o ha caducado.',
    cancelled: 'Se canceló el inicio de sesión. Vuelve a intentarlo o usa tu nombre de usuario o correo.',
    network: 'No se puede contactar con el servidor de cuentas. Revisa tu conexión y vuelve a intentarlo.',
    unknown: 'Algo ha fallado. Inténtalo de nuevo.',
  },
  validation: {
    chooseUsername: 'Elige un nombre de usuario.',
    atLeast: (n: number) => `Al menos ${n} caracteres.`,
    atMost: (n: number) => `Como máximo ${n} caracteres.`,
    usernameChars: 'Solo letras, números y _.',
    enterEmail: 'Escribe tu correo electrónico.',
    validEmail: 'Escribe un correo válido, como nombre@ejemplo.es.',
    choosePassword: 'Elige una contraseña.',
    typeAgain: 'Vuelve a escribir la contraseña.',
    noMatch: 'Las contraseñas no coinciden.',
  },
  consents: {
    howOld: '¿Cuántos años tienes?',
    ages: {
      'under-14': (min: number) => `Menos de ${min}`,
      '14-17': (min: number) => `De ${min} a 17`,
      '18+': () => '18 o más',
    },
    noBirthDate: 'No te pedimos la fecha de nacimiento.',
    underAge: (min: number) =>
      `Necesitas tener ${min} años o más para tener una cuenta. Aun así puedes jugar a todos los modos sin conexión como invitado, y no se guarda nada sobre ti en nuestros servidores.`,
    agree: (terms: ReactNode, privacy: ReactNode): ReactNode => (
      <>
        Acepto las {terms} y la {privacy}
      </>
    ),
    terms: 'Condiciones del servicio',
    privacy: 'Política de privacidad',
    newTab: '(se abre en una pestaña nueva)',
    required: '(obligatorio)',
    marketing: 'Enviadme novedades de Bronze por correo',
    marketingNote: '(opcional; puedes darte de baja cuando quieras)',
  },
  account: {
    exportNote: 'Todo lo que Bronze guarda sobre ti. Las partidas se juegan en tu navegador, así que no hay historial de partidas en el servidor.',
    downloading: 'Se están descargando tus datos.',
    loggedInAs: (name: ReactNode, email: string | null): ReactNode => (
      <>
        Sesión iniciada como {name}
        {email ? ` (${email})` : ''}.
      </>
    ),
    guest: 'Juegas como invitado: no se guarda nada sobre ti en nuestros servidores. Tus ajustes, historial y partida se quedan en este navegador.',
    download: 'Descargar mis datos',
    downloadAccount: 'Tu perfil, historial, consentimientos y preferencias de correo, más los datos de este dispositivo, en un archivo.',
    downloadGuest: 'Lo que Bronze guarda en este navegador, en un archivo.',
    downloadButton: 'Descargar',
    delete: 'Eliminar mi cuenta',
    deleteNote: 'Elimina tu cuenta y todo lo que se guarda con ella. No se puede deshacer.',
    deleteButton: 'Eliminar',
    clear: 'Borrar este dispositivo',
    clearNote: (signedIn: boolean) => `Borra todo lo que Bronze guardó en este navegador${signedIn ? ' y cierra aquí tu sesión' : ''}. Tu cuenta se mantiene.`,
    clearButton: 'Borrar',
    clearAsk: 'Borrar…',
    keep: 'Conservar',
    deleted: 'Tu cuenta y sus datos se han eliminado. Ahora juegas como invitado.',
    deleteDialog: {
      title: '¿Eliminar tu cuenta?',
      intro: 'Esto elimina, de inmediato y para siempre:',
      items: [
        'tu acceso (correo y contraseña, o tu inicio de sesión con Google),',
        'tu nombre de usuario, avatar, historial y logros,',
        'tu respuesta sobre la edad, tus consentimientos y tus preferencias de correo.',
      ],
      note: 'Las partidas se juegan en tu navegador, así que no se guarda historial de partidas en nuestros servidores. Tus datos de invitado en este navegador se conservan hasta que los borres.',
      typeToConfirm: (name: ReactNode): ReactNode => <>Escribe tu nombre de usuario, {name}, para confirmar</>,
    },
    notifications: {
      guest: 'Inicia sesión para elegir qué correos recibes. Los invitados nunca reciben correos.',
      loading: 'Cargando tus preferencias de correo…',
      intro: 'Los correos de la cuenta (confirmar la dirección, restablecer la contraseña) se envían siempre. Lo demás lo decides tú; Bronze aún no envía nada de eso.',
      lists: {
        marketing: { label: 'Novedades de Bronze', description: 'Nuevas funciones y eventos. Solo con tu consentimiento, y nunca a menores de 18 años.' },
        friends: { label: 'Correos de amigos', description: 'Cuando alguien te envía una solicitud de amistad.' },
        tournaments: { label: 'Correos de torneos', description: 'Recordatorios de los torneos en los que participas.' },
      },
      from18: 'Disponible desde los 18 años.',
      nowAdult: 'Ya tengo 18 años o más',
    },
    privacy: {
      cookies: 'Ajustes de cookies',
      cookiesNote: 'Cambia lo que Bronze puede guardar en este navegador.',
      open: 'Abrir',
    },
  },
  settings: {
    reset: 'Restablecer',
    game: 'Juego',
    animationSpeed: 'Velocidad de animación',
    animationHint: 'Destellos y el punto de envío en el tablero.',
    aiSpeed: 'Velocidad del ordenador',
    aiSpeedHint: 'La pausa entre las acciones de un jugador del ordenador.',
    speeds: { slow: 'Lenta', normal: 'Normal', fast: 'Rápida', off: 'Desactivada' },
    moveTimer: 'Temporizador de turno',
    moveTimerHint: 'Cada turno tiene un límite de tiempo; al agotarse, se pierde el resto del turno. Desactivado: se juega sin tiempo.',
    showLog: 'Mostrar el registro de la partida',
    audio: 'Audio',
    sound: 'Sonido',
    masterVolume: 'Volumen general',
    musicVolume: 'Volumen de la música',
    general: 'General',
    language: 'Idioma',
    account: 'Cuenta',
    notifications: 'Notificaciones',
    privacy: 'Privacidad',
  },
  cookieBanner: {
    title: 'Cookies y almacenamiento',
    body: 'Bronze guarda algunas cosas en tu navegador. Las esenciales mantienen tu sesión iniciada y conservan tu partida en curso. Con tu consentimiento, Bronze también recuerda tus ajustes y tu historial de invitado en este dispositivo. No hay anuncios, analítica ni rastreadores.',
    accept: 'Aceptar todo',
    reject: 'Rechazar todo',
    customise: 'Personalizar',
    save: 'Guardar mis opciones',
    close: 'Cerrar',
    always: 'Siempre activas',
    cookiePolicy: 'Política de cookies',
    privacyPolicy: 'Política de privacidad',
    language: 'Idioma',
    categories: {
      essential: { title: 'Esenciales', description: 'Mantienen tu sesión iniciada, conservan tu partida en curso y recuerdan estas opciones.' },
      preferences: { title: 'Preferencias', description: 'Recuerdan tus ajustes (incluido el idioma), tu último modo de juego, mapa y asientos, y tu historial de invitado.' },
      analytics: { title: 'Analítica', description: 'Hoy no se usa. Si Bronze añade analítica algún día, solo funcionará con esto activado.' },
      marketing: { title: 'Marketing', description: 'Hoy no se usa. Si Bronze añade herramientas de marketing algún día, solo funcionarán con esto activado.' },
    },
  },
  legal: {
    lastUpdated: 'Última actualización:',
    translationNote: 'Esta traducción se ofrece para tu comodidad. Si difiere del texto en inglés, prevalece la versión inglesa.',
    draft: (example: ReactNode): ReactNode => <>Borrador: faltan algunos datos de quién gestiona Bronze (se muestran así: {example}).</>,
    table: (caption: string) => `${caption} (tabla)`,
    freeToPlay: 'Bronze es gratuito; no se vende nada.',
  },
}

export default es
