/**
 * The online game server: the lobby, and every move checked with the same
 * rules engine as the browser (src/rules). It never takes a game state from a
 * client: a player sends a move, the server loads the game, checks it's that
 * player's turn and the move is legal, applies it and saves the new state and
 * the log row together (a save based on an older version is refused, so two
 * players acting at once can't both succeed). Hidden information (hands, the
 * deck, the distant-market order, the seed) stays here; each viewer gets a
 * view with only their own hand.
 *
 * Also here: the chess clocks, timeouts (auto-pass; 3 forfeit), disconnect
 * grace (then a bot plays the seat), bot seats, the result and ratings, quick
 * play, rematches and replays. Pure logic over a GameStore: the Supabase Edge
 * Function (supabase/functions/game) and the tests use the same code.
 */

import { DEFAULT_MAP_ID } from '../data/maps'
import { MATCHMAKING, START_RATING, START_RD, START_VOLATILITY } from '../rating/config'
import { rateGame, ratingNow } from '../rating/glicko2'
import { CONNECTION_LOST_MS, DISCONNECT_GRACE_MS, MAX_PLAYERS, MAX_TIMEOUTS, MIN_PLAYERS, TIME_CONTROL } from '../rules/config/game'
import { applyAction, createGame, currentPlayerId, type RulesContext } from '../rules/engine'
import { RuleError, type Action, type GameState } from '../rules/state'
import { botAction, timeoutAction } from '../rules/bots'
import { redactState } from './redact'
import type { ActionRow, BotLevel, GameRecord, GameStore, GameSummary, GameView, ModeId, MyRating, QueueEntry, RatingRow, Request, Seat, SeatView } from './types'

export class ServerError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface Caller {
  userId: string
  username: string
}

export interface ServerDeps {
  store: GameStore
  ctx: RulesContext
  now: () => number
  /** A random number in [0, 1) (seeds, codes, ids): crypto-strong on the server. */
  random: () => number
  newId: () => string
}

export interface Reply {
  status: number
  body: unknown
  /** Games whose version changed: tell their watchers (Realtime). */
  changed: string[]
  /** The public lobby list changed. */
  lobbyChanged: boolean
}

/** Only these modes and maps can be played online for now. */
const PLAYABLE_MODES: readonly ModeId[] = ['normal']
const PLAYABLE_MAPS: readonly string[] = [DEFAULT_MAP_ID]
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
/** Bots and stand-ins move at most this many times in one go (a whole game is far fewer). */
const MAX_BOT_MOVES = 2000

const ok = (body: unknown, changed: string[] = [], lobbyChanged = false): Reply => ({ status: 200, body, changed, lobbyChanged })
const fail = (status: number, code: string, message: string): never => {
  throw new ServerError(status, code, message)
}

/* ---- Seats ------------------------------------------------------------------------ */

const isHuman = (s: Seat) => s.bot === null && s.userId !== null
const botPlays = (s: Seat) => s.bot !== null || s.botPlaying || s.forfeited
export const connected = (s: Seat, now: number) => s.bot !== null || now - s.lastSeen <= CONNECTION_LOST_MS
export const graceEndsAt = (s: Seat, now: number) => (isHuman(s) && !s.forfeited && !connected(s, now) ? s.lastSeen + CONNECTION_LOST_MS + DISCONNECT_GRACE_MS : null)

function newSeat(seat: number, caller: Caller, now: number, mode: ModeId): Seat {
  return { seat, userId: caller.userId, username: caller.username, bot: null, ready: false, lastSeen: now, botPlaying: false, timeouts: 0, clockMs: TIME_CONTROL[mode].baseMs, forfeited: false }
}

function botSeat(seat: number, level: BotLevel, now: number, mode: ModeId): Seat {
  return { seat, userId: null, username: level === 'easy' ? 'Bot (Easy)' : 'Bot (Normal)', bot: level, ready: true, lastSeen: now, botPlaying: false, timeouts: 0, clockMs: TIME_CONTROL[mode].baseMs, forfeited: false }
}

/* ---- The server ----------------------------------------------------------------- */

export function createGameServer(deps: ServerDeps) {
  const { store, ctx } = deps

  async function load(id: unknown): Promise<GameRecord> {
    if (typeof id !== 'string' || !id) fail(400, 'bad-request', 'A game id is needed')
    const record = await store.loadGame(id as string)
    if (!record) fail(404, 'not-found', 'No such game')
    return record!
  }

  const seatOf = (record: GameRecord, caller: Caller | null) => (caller ? record.seats.find((s) => s.userId === caller.userId) : undefined)

  /** Save; if someone saved first, tell the caller to try again with the current game. */
  async function save(record: GameRecord, expected: number, actions: ActionRow[] = []) {
    if (!(await store.saveGame(record, expected, actions))) fail(409, 'conflict', 'Someone else moved first: try again')
  }

  async function newCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const code = Array.from({ length: 6 }, () => CODE_LETTERS[Math.floor(deps.random() * CODE_LETTERS.length)]).join('')
      if (!(await store.findByCode(code))) return code
    }
    return fail(503, 'busy', 'Couldn’t make an invite code: try again')
  }

  /* ---- Moves, clocks and bots ---- */

  /** Apply one move for a seat; the clock charges the turn's time when the turn passes on. */
  function apply(record: GameRecord, seat: number, action: Action, by: ActionRow['by'], now: number, log: ActionRow[]) {
    const state = record.state!
    const before = currentPlayerId(state)
    const next = applyAction(state, ctx, seat, action)
    record.state = next
    record.moves += 1
    log.push({ seq: record.moves, seat, action, by, at: now })
    const after = next.finished ? null : currentPlayerId(next)
    if (after !== before || next.finished) {
      const prev = record.seats[before]
      const turn = record.turn
      if (turn && turn.seat === before && !botPlays(prev)) {
        const increment = TIME_CONTROL[record.mode].incrementMs
        prev.clockMs = by === 'clock' ? increment : Math.max(0, prev.clockMs - (now - turn.startedAt)) + increment
      }
      record.turn = after === null ? null : { seat: after, startedAt: now }
    }
    if (next.finished) finish(record, now)
  }

  /**
   * Bring a game up to now: disconnected players past their grace get a
   * stand-in, a clock that ran out passes the turn (3 times forfeits), and bots
   * play until it's a human's turn.
   */
  function advance(record: GameRecord, now: number, log: ActionRow[]): boolean {
    let changed = false
    for (let guard = 0; guard < MAX_BOT_MOVES && record.status === 'playing' && record.state; guard++) {
      for (const s of record.seats) {
        const ends = graceEndsAt(s, now)
        if (!s.botPlaying && ends !== null && now >= ends) {
          s.botPlaying = true
          changed = true
        }
      }
      const seatId = currentPlayerId(record.state)
      const seat = record.seats[seatId]
      if (botPlays(seat)) {
        apply(record, seatId, botAction(record.state, ctx, seatId, seat.bot ?? 'normal', record.moves), 'bot', now, log)
        changed = true
        continue
      }
      const turn = record.turn
      if (turn && turn.seat === seatId && now - turn.startedAt > seat.clockMs) {
        // Out of time: the turn passes with random cards.
        seat.timeouts += 1
        seat.clockMs = 0
        if (seat.timeouts >= MAX_TIMEOUTS) {
          seat.forfeited = true
          seat.botPlaying = true
        }
        while (record.status === 'playing' && record.state && currentPlayerId(record.state) === seatId && !seat.forfeited) {
          apply(record, seatId, timeoutAction(record.state, seatId, record.moves), 'clock', now, log)
        }
        changed = true
        continue
      }
      break
    }
    return changed
  }

  /** The game is over: places (forfeits share the last), and the result. Ratings follow in rate(). */
  function finish(record: GameRecord, now: number) {
    const state = record.state!
    record.status = 'finished'
    record.finishedAt = now
    record.turn = null
    const ranking = state.ranking ?? []
    const places: number[] = new Array(record.seats.length).fill(0)
    let place = 1
    for (const id of ranking) if (!record.seats[id].forfeited) places[id] = place++
    for (const s of record.seats) if (s.forfeited) places[s.seat] = place
    record.result = { places, ratings: [], aborted: false }
  }

  /** A finished rated game: everyone's new rating on this map (Glicko-2, pairs by place, the mode's weight). */
  async function rate(record: GameRecord) {
    if (record.status !== 'finished' || !record.rated || !record.result || record.result.ratings.length) return
    const humans = record.seats.filter(isHuman)
    const now = record.finishedAt ?? deps.now()
    const rows = await store.getRatings(
      humans.map((s) => s.userId!),
      record.mapId,
    )
    const current = (userId: string): RatingRow => rows[userId] ?? { userId, mapId: record.mapId, rating: START_RATING.beginner, rd: START_RD, volatility: START_VOLATILITY, gamesPlayed: 0, peakRating: START_RATING.beginner, updatedAt: now }
    const changes = rateGame(
      humans.map((s) => {
        const r = current(s.userId!)
        return { id: s.userId!, place: record.result!.places[s.seat], rating: { rating: r.rating, rd: r.rd, volatility: r.volatility, gamesPlayed: r.gamesPlayed, updatedAt: r.updatedAt } }
      }),
      record.mode,
      now,
    )
    const saved: RatingRow[] = changes.map((c) => {
      const r = current(c.id)
      return { ...r, rating: c.after, rd: c.rd, volatility: c.volatility, gamesPlayed: r.gamesPlayed + 1, peakRating: Math.max(r.peakRating, c.after), updatedAt: now }
    })
    await store.saveRatings(
      saved,
      changes.map((c) => ({ userId: c.id, mapId: record.mapId, gameId: record.id, before: c.before, after: c.after, delta: c.delta, mode: record.mode, at: now })),
    )
    record.result.ratings = changes.map((c) => ({ userId: c.id, seat: record.seats.find((x) => x.userId === c.id)!.seat, before: c.before, after: c.after, delta: c.delta }))
  }

  /* ---- Views ---- */

  async function view(record: GameRecord, caller: Caller | null, withCode: boolean): Promise<GameView> {
    const now = deps.now()
    const mine = seatOf(record, caller)
    const humans = record.seats.filter(isHuman).map((s) => s.userId!)
    const ratings = humans.length ? await store.getRatings(humans, record.mapId) : {}
    const seats: SeatView[] = record.seats.map((s) => {
      const r = s.userId ? ratings[s.userId] : undefined
      const nowRating = r ? ratingNow(r, now) : null
      return {
        seat: s.seat,
        username: s.username,
        bot: s.bot,
        human: isHuman(s),
        ready: s.ready,
        connected: connected(s, now),
        graceEndsAt: record.status === 'playing' ? graceEndsAt(s, now) : null,
        botPlaying: s.botPlaying,
        timeouts: s.timeouts,
        clockMs: s.clockMs,
        forfeited: s.forfeited,
        host: s.userId === record.hostId,
        rating: r ? Math.round(r.rating) : null,
        ratingRd: nowRating ? Math.round(nowRating.rd) : null,
        gamesPlayed: r?.gamesPlayed ?? 0,
        provisional: nowRating?.provisional ?? true,
      }
    })
    return {
      id: record.id,
      code: mine || withCode ? record.code : null,
      status: record.status,
      visibility: record.visibility,
      rated: record.rated,
      willBeRated: record.status === 'lobby' ? willBeRated(record) : record.rated,
      ratedRequested: record.ratedRequested,
      allowSpectators: record.allowSpectators,
      mode: record.mode,
      mapId: record.mapId,
      maxPlayers: record.maxPlayers,
      version: record.version,
      seats,
      mySeat: mine ? mine.seat : null,
      isHost: !!caller && caller.userId === record.hostId,
      state: record.state ? redactState(record.state, mine ? mine.seat : null) : null,
      turn: record.turn,
      result: record.result,
      rematchId: record.rematchId,
      serverNow: now,
    }
  }

  /** May this caller look at the game? Players always; public games anyone; private ones with the code if spectators are allowed. */
  function mayView(record: GameRecord, caller: Caller | null, withCode: boolean) {
    if (seatOf(record, caller)) return true
    if (record.visibility === 'public') return true
    return withCode && (record.status === 'lobby' || record.allowSpectators)
  }

  async function summary(record: GameRecord, caller: Caller | null): Promise<GameSummary> {
    const humans = record.seats.filter(isHuman).map((s) => s.userId!)
    const ratings = humans.length ? await store.getRatings(humans, record.mapId) : {}
    const values = humans.map((id) => ratings[id]?.rating).filter((r): r is number => r !== undefined)
    const mine = !!seatOf(record, caller)
    return {
      id: record.id,
      code: mine ? record.code : null,
      status: record.status,
      visibility: record.visibility,
      rated: record.rated || (record.status === 'lobby' && willBeRated(record)),
      mode: record.mode,
      mapId: record.mapId,
      maxPlayers: record.maxPlayers,
      players: record.seats.map((s) => ({ username: s.username, bot: s.bot !== null, ready: s.ready })),
      averageRating: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
      host: record.seats.find((s) => s.userId === record.hostId)?.username ?? '',
      createdAt: record.createdAt,
      progress: record.state && record.status === 'playing' ? { era: record.state.era, round: record.state.round } : null,
      mine,
      myRatingChange: (caller && record.result?.ratings.find((r) => r.userId === caller.userId)?.delta) ?? null,
    }
  }

  /** Rated: public Normal games of humans only; private ones only if the host asked (and still no bots). */
  function willBeRated(record: GameRecord) {
    const allHuman = record.seats.every(isHuman)
    if (!allHuman || record.mode !== 'normal') return false
    return record.visibility === 'public' || record.ratedRequested
  }

  /* ---- Starting a game ---- */

  function start(record: GameRecord, now: number, log: ActionRow[]) {
    const seed = Math.floor(deps.random() * 2 ** 31)
    record.seed = seed
    record.rated = willBeRated(record)
    record.state = createGame(
      ctx,
      record.seats.map((s) => ({ name: s.username, isAI: s.bot !== null, aiLevel: s.bot ?? 'normal' })),
      seed,
    )
    record.status = 'playing'
    record.startedAt = now
    record.version += 1
    for (const s of record.seats) {
      s.clockMs = TIME_CONTROL[record.mode].baseMs
      s.lastSeen = s.bot ? now : s.lastSeen
    }
    record.turn = { seat: currentPlayerId(record.state), startedAt: now }
    advance(record, now, log)
  }

  function blankRecord(caller: Caller, now: number, opts: { players: number; visibility: 'public' | 'private'; rated: boolean; allowSpectators: boolean; mode: ModeId; mapId: string }, code: string): GameRecord {
    return {
      id: deps.newId(),
      code,
      hostId: caller.userId,
      status: 'lobby',
      visibility: opts.visibility,
      rated: false,
      ratedRequested: opts.rated,
      allowSpectators: opts.allowSpectators,
      mode: opts.mode,
      mapId: opts.mapId,
      maxPlayers: opts.players,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      version: 1,
      seats: [newSeat(0, caller, now, opts.mode)],
      state: null,
      seed: null,
      turn: null,
      result: null,
      moves: 0,
      rematchId: null,
    }
  }

  /* ---- Quick play ---- */

  const rangeFor = (entry: QueueEntry, now: number) => MATCHMAKING.startRange + MATCHMAKING.widenBy * Math.floor((now - entry.since) / (MATCHMAKING.widenEverySeconds * 1000))

  async function matchQueue(now: number): Promise<string[]> {
    const queue = (await store.getQueue()).filter((e) => !e.matchedGameId).sort((a, b) => a.since - b.since)
    const games: string[] = []
    const taken = new Set<string>()
    for (const first of queue) {
      if (taken.has(first.userId)) continue
      const group = [first]
      for (const other of queue) {
        if (group.length === first.players) break
        if (other === first || taken.has(other.userId) || other.players !== first.players || other.mode !== first.mode || other.mapId !== first.mapId) continue
        // Everyone in the group within everyone else's range.
        if (group.every((g) => Math.abs(g.rating - other.rating) <= Math.min(rangeFor(g, now), rangeFor(other, now)))) group.push(other)
      }
      if (group.length < first.players) continue
      for (const g of group) taken.add(g.userId)
      const host = { userId: group[0].userId, username: group[0].username }
      const record = blankRecord(host, now, { players: first.players, visibility: 'public', rated: true, allowSpectators: true, mode: first.mode, mapId: first.mapId }, await newCode())
      record.seats = group.map((g, i) => ({ ...newSeat(i, { userId: g.userId, username: g.username }, now, first.mode), ready: true }))
      const log: ActionRow[] = []
      start(record, now, log)
      await store.insertGame(record)
      if (log.length) await save(record, record.version, log)
      for (const g of group) await store.putQueue({ ...g, matchedGameId: record.id })
      games.push(record.id)
    }
    return games
  }

  /* ---- Requests ---- */

  async function handle(caller: Caller | null, raw: unknown): Promise<Reply> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(400, 'bad-request', 'Send a JSON object')
    const req = raw as Request & Record<string, unknown>
    if (!caller) fail(401, 'signed-out', 'Sign in to play online')
    const me = caller!
    const now = deps.now()

    switch (req.op) {
      case 'create': {
        const players = Number(req.players)
        if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) fail(400, 'bad-request', 'Games are for 2 to 4 players')
        if (req.visibility !== 'public' && req.visibility !== 'private') fail(400, 'bad-request', 'Public or private?')
        const mode = req.mode ?? 'normal'
        if (!PLAYABLE_MODES.includes(mode)) fail(400, 'mode-unavailable', 'Only Normal can be played for now')
        const mapId = req.mapId ?? DEFAULT_MAP_ID
        if (!PLAYABLE_MAPS.includes(mapId)) fail(400, 'map-unavailable', 'Only Wales & the West can be played for now')
        const record = blankRecord(me, now, { players, visibility: req.visibility, rated: !!req.rated, allowSpectators: req.allowSpectators ?? true, mode, mapId }, await newCode())
        await store.insertGame(record)
        return ok(await view(record, me, true), [record.id], record.visibility === 'public')
      }

      case 'join': {
        const id = req.gameId ?? (typeof req.code === 'string' ? await store.findByCode(req.code.trim().toUpperCase()) : null)
        if (!id) fail(404, 'not-found', 'No game with that code')
        const record = await load(id)
        const seated = seatOf(record, me)
        if (seated) {
          seated.lastSeen = now
          return ok(await view(record, me, true))
        }
        if (record.status !== 'lobby') fail(409, 'started', 'That game has already started')
        if (record.seats.length >= record.maxPlayers) fail(409, 'full', 'That game is full')
        if (record.visibility === 'private' && !req.code && record.hostId !== me.userId) fail(403, 'private', 'That game is private: use its invite link')
        const expected = record.version
        record.seats.push(newSeat(record.seats.length, me, now, record.mode))
        record.version += 1
        await save(record, expected)
        return ok(await view(record, me, true), [record.id], record.visibility === 'public')
      }

      case 'leave': {
        const record = await load(req.gameId)
        const seat = seatOf(record, me)
        if (!seat) fail(403, 'not-a-player', 'You’re not in this game')
        const expected = record.version
        if (record.status === 'lobby') {
          record.seats = record.seats.filter((s) => s !== seat).map((s, i) => ({ ...s, seat: i }))
          if (!record.seats.some(isHuman)) record.status = 'aborted'
          else if (record.hostId === me.userId) record.hostId = record.seats.find(isHuman)!.userId!
        } else if (record.status === 'playing' && record.state) {
          if (record.state.era === 'canal' && record.state.round === 1) {
            // Left in the first round: the game is called off, and nobody is rated.
            record.status = 'aborted'
            record.finishedAt = now
            record.turn = null
            record.result = { places: [], ratings: [], aborted: true }
          } else {
            seat!.forfeited = true
            seat!.botPlaying = true
            const log: ActionRow[] = []
            advance(record, now, log)
            record.version += 1
            await save(record, expected, log)
            await rate(record)
            if (record.result?.ratings.length) await save(record, record.version)
            return ok(await view(record, me, true), [record.id], record.visibility === 'public')
          }
        }
        record.version += 1
        await save(record, expected)
        await store.removeQueue([me.userId])
        return ok({ left: true }, [record.id], record.visibility === 'public')
      }

      case 'ready': {
        const record = await load(req.gameId)
        const seat = seatOf(record, me)
        if (!seat || record.status !== 'lobby') fail(409, 'not-in-lobby', 'Not in this game’s lobby')
        const expected = record.version
        seat!.ready = !!req.ready
        seat!.lastSeen = now
        record.version += 1
        await save(record, expected)
        return ok(await view(record, me, true), [record.id], record.visibility === 'public')
      }

      case 'settings': {
        const record = await load(req.gameId)
        if (record.hostId !== me.userId || record.status !== 'lobby') fail(403, 'not-host', 'Only the host can change the game before it starts')
        const expected = record.version
        if (req.visibility === 'public' || req.visibility === 'private') record.visibility = req.visibility
        if (typeof req.rated === 'boolean') record.ratedRequested = req.rated
        if (typeof req.allowSpectators === 'boolean') record.allowSpectators = req.allowSpectators
        // Bots only in private games.
        if (record.visibility === 'public' && record.seats.some((s) => s.bot)) fail(409, 'bots-private', 'Bots can only play in private games')
        record.version += 1
        await save(record, expected)
        return ok(await view(record, me, true), [record.id], true)
      }

      case 'add-bot': {
        const record = await load(req.gameId)
        if (record.hostId !== me.userId || record.status !== 'lobby') fail(403, 'not-host', 'Only the host can add bots')
        if (record.visibility !== 'private') fail(409, 'bots-private', 'Bots can only play in private games')
        if (record.seats.length >= record.maxPlayers) fail(409, 'full', 'The game is full')
        if (req.level !== 'easy' && req.level !== 'normal') fail(400, 'bad-request', 'Easy or Normal?')
        const expected = record.version
        record.seats.push(botSeat(record.seats.length, req.level, now, record.mode))
        record.version += 1
        await save(record, expected)
        return ok(await view(record, me, true), [record.id])
      }

      case 'remove-seat': {
        const record = await load(req.gameId)
        if (record.hostId !== me.userId || record.status !== 'lobby') fail(403, 'not-host', 'Only the host can do that')
        const target = record.seats[Number(req.seat)]
        if (!target || target.userId === me.userId) fail(400, 'bad-request', 'No such seat')
        const expected = record.version
        record.seats = record.seats.filter((s) => s !== target).map((s, i) => ({ ...s, seat: i }))
        record.version += 1
        await save(record, expected)
        return ok(await view(record, me, true), [record.id], record.visibility === 'public')
      }

      case 'start': {
        const record = await load(req.gameId)
        if (record.hostId !== me.userId) fail(403, 'not-host', 'Only the host can start the game')
        if (record.status !== 'lobby') fail(409, 'started', 'The game has already started')
        if (record.seats.length < MIN_PLAYERS) fail(409, 'not-enough', 'At least 2 players are needed')
        if (record.seats.some((s) => s.userId !== me.userId && !s.ready)) fail(409, 'not-ready', 'Everyone must be ready')
        const expected = record.version
        const log: ActionRow[] = []
        start(record, now, log)
        await save(record, expected, log)
        return ok(await view(record, me, true), [record.id], true)
      }

      case 'act': {
        // Only a move is accepted: never a game state, or anything else a client might add.
        const allowed = new Set(['op', 'gameId', 'version', 'action'])
        if (Object.keys(req).some((k) => !allowed.has(k))) fail(400, 'tampered', 'Only a move can be sent')
        const record = await load(req.gameId)
        const seat = seatOf(record, me)
        if (!seat) fail(403, 'not-a-player', 'You’re not in this game')
        if (record.status !== 'playing' || !record.state) fail(409, 'not-playing', 'The game isn’t being played')
        if (req.version !== record.version) fail(409, 'stale', 'The game has moved on: look again')
        seat!.lastSeen = now
        if (seat!.botPlaying && !seat!.forfeited) seat!.botPlaying = false
        const expected = record.version
        const log: ActionRow[] = []
        // Anything that was due first (a stand-in's turns, a clock that ran out).
        advance(record, now, log)
        if (record.status !== 'playing' || currentPlayerId(record.state!) !== seat!.seat) fail(403, 'not-your-turn', 'It’s not your turn')
        if (seat!.forfeited) fail(403, 'forfeited', 'You’ve forfeited this game')
        const action = req.action as Action
        if (!action || typeof action !== 'object' || typeof (action as { type?: unknown }).type !== 'string') fail(400, 'bad-request', 'That isn’t a move')
        try {
          apply(record, seat!.seat, structuredClone(action), 'player', now, log)
        } catch (error) {
          if (error instanceof RuleError) fail(422, error.code, error.message)
          throw error
        }
        advance(record, now, log)
        record.version += 1
        await save(record, expected, log)
        await rate(record)
        if (record.result?.ratings.length) await save(record, record.version)
        return ok(await view(record, me, true), [record.id], record.status !== 'playing')
      }

      case 'ping': {
        const record = await load(req.gameId)
        const seat = seatOf(record, me)
        const expected = record.version
        let changed = false
        if (seat) {
          const wasAway = !connected(seat, now) || (seat.botPlaying && !seat.forfeited)
          seat.lastSeen = now
          if (seat.botPlaying && !seat.forfeited) seat.botPlaying = false
          changed = wasAway
        }
        const log: ActionRow[] = []
        if (advance(record, now, log)) changed = true
        if (changed) record.version += 1
        // A heartbeat alone is saved without a new version (nobody needs to redraw for it).
        if (seat || changed) await save(record, expected, log)
        if (changed) {
          await rate(record)
          if (record.result?.ratings.length) await save(record, record.version)
        }
        if (!mayView(record, me, false)) fail(403, 'private', 'That game is private')
        return ok(await view(record, me, false), changed ? [record.id] : [])
      }

      case 'view': {
        const withCode = typeof req.code === 'string'
        const id = req.gameId ?? (withCode ? await store.findByCode(String(req.code).trim().toUpperCase()) : null)
        if (!id) fail(404, 'not-found', 'No such game')
        const record = await load(id)
        if (!mayView(record, me, withCode)) fail(403, 'private', 'That game is private')
        return ok(await view(record, me, withCode))
      }

      case 'list': {
        const [pub, mine] = await Promise.all([store.listPublic(), store.listFor(me.userId)])
        const open = pub.filter((r) => r.status === 'lobby' && r.seats.length < r.maxPlayers)
        const live = pub.filter((r) => r.status === 'playing')
        return ok({
          open: await Promise.all(open.map((r) => summary(r, me))),
          live: await Promise.all(live.map((r) => summary(r, me))),
          mine: await Promise.all(mine.map((r) => summary(r, me))),
        })
      }

      case 'rematch': {
        const old = await load(req.gameId)
        if (!seatOf(old, me)) fail(403, 'not-a-player', 'You’re not in this game')
        if (old.status !== 'finished' && old.status !== 'aborted') fail(409, 'not-finished', 'The game isn’t over')
        if (old.rematchId) {
          // Someone asked first: join theirs.
          return handle(me, { op: 'join', gameId: old.rematchId })
        }
        const record = blankRecord(me, now, { players: old.seats.length, visibility: 'private', rated: old.rated, allowSpectators: old.allowSpectators, mode: old.mode, mapId: old.mapId }, await newCode())
        record.seats[0].ready = true
        for (const s of old.seats) if (s.bot) record.seats.push(botSeat(record.seats.length, s.bot, now, record.mode))
        await store.insertGame(record)
        const expected = old.version
        old.rematchId = record.id
        old.version += 1
        await save(old, expected)
        return ok(await view(record, me, true), [old.id, record.id])
      }

      case 'replay': {
        const record = await load(req.gameId)
        if (record.status !== 'finished' && record.status !== 'aborted') fail(409, 'not-finished', 'Replays open once the game is over')
        if (!seatOf(record, me) && record.visibility !== 'public') fail(403, 'private', 'That game is private')
        return ok({
          id: record.id,
          seed: record.seed,
          mode: record.mode,
          mapId: record.mapId,
          seats: record.seats.map((s) => ({ name: s.username, isAI: s.bot !== null, aiLevel: s.bot ?? 'normal' })),
          actions: await store.loadActions(record.id),
          result: record.result,
          finishedAt: record.finishedAt,
        })
      }

      case 'quick-play': {
        const players = Number(req.players)
        if (!Number.isInteger(players) || players < MIN_PLAYERS || players > MAX_PLAYERS) fail(400, 'bad-request', 'Games are for 2 to 4 players')
        const mode = req.mode ?? 'normal'
        if (!PLAYABLE_MODES.includes(mode)) fail(400, 'mode-unavailable', 'Only Normal can be played for now')
        const mapId = req.mapId ?? DEFAULT_MAP_ID
        if (!PLAYABLE_MAPS.includes(mapId)) fail(400, 'map-unavailable', 'Only Wales & the West can be played for now')
        const queue = await store.getQueue()
        let entry = queue.find((e) => e.userId === me.userId)
        if (entry?.matchedGameId) {
          await store.removeQueue([me.userId])
          return ok({ status: 'matched', gameId: entry.matchedGameId })
        }
        if (!entry || entry.players !== players || entry.mode !== mode || entry.mapId !== mapId) {
          const rating = (await store.getRatings([me.userId], mapId))[me.userId]?.rating ?? START_RATING.beginner
          entry = { userId: me.userId, username: me.username, rating, players, mode, mapId, since: now, matchedGameId: null }
          await store.putQueue(entry)
        }
        const made = await matchQueue(now)
        const mine = (await store.getQueue()).find((e) => e.userId === me.userId)
        if (mine?.matchedGameId) {
          await store.removeQueue([me.userId])
          return ok({ status: 'matched', gameId: mine.matchedGameId }, made, made.length > 0)
        }
        return ok({ status: 'waiting', range: rangeFor(entry, now), waitedMs: now - entry.since }, made, made.length > 0)
      }

      case 'my-rating': {
        // Your rating as it stands now (players may read it; only the server ever changes it).
        const mapId = req.mapId ?? DEFAULT_MAP_ID
        const row = (await store.getRatings([me.userId], mapId))[me.userId]
        const r = row ?? { rating: START_RATING.beginner, rd: START_RD, volatility: START_VOLATILITY, gamesPlayed: 0, peakRating: START_RATING.beginner, updatedAt: now }
        const current = ratingNow(r, now)
        const reply: MyRating = { mapId, rating: Math.round(current.rating), rd: Math.round(current.rd), gamesPlayed: current.gamesPlayed, provisional: current.provisional, peakRating: Math.round(r.peakRating), unplaced: !row }
        return ok(reply)
      }

      case 'quick-cancel': {
        await store.removeQueue([me.userId])
        return ok({ cancelled: true })
      }

      default:
        return fail(400, 'bad-request', 'Unknown request')
    }
  }

  return {
    /** Answer one request. Errors come back as a status and a code (never a stack trace). */
    async request(caller: Caller | null, raw: unknown): Promise<Reply> {
      try {
        return await handle(caller, raw)
      } catch (error) {
        if (error instanceof ServerError) return { status: error.status, body: { error: error.code, message: error.message }, changed: [], lobbyChanged: false }
        throw error
      }
    },
  }
}

export type GameServer = ReturnType<typeof createGameServer>
export type { GameState }
