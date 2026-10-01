import { replayStates, type ReplayData } from '../online/replay'
import { beforeEach, describe, expect, it } from 'vitest'
import { START_RATING, START_RD } from '../rating/config'
import { CLOCK, CONNECTION_LOST_MS, DISCONNECT_GRACE_MS, TIME_CONTROL } from '../rules/config/game'
import { currentPlayerId, type RulesContext } from '../rules/engine'
import { BRASS_MAP } from '../rules/map'
import { RULES_DATA } from '../rules/rulesData'
import type { Action } from '../rules/state'
import { isHiddenCard } from './redact'
import { createMemoryStore } from './memoryStore'
import { createGameServer, type Caller } from './server'
import type { FriendsView, GameView, Leaderboard, OnlineProfile } from './types'

const ctx: RulesContext = { data: RULES_DATA, map: BRASS_MAP }
const ada: Caller = { userId: 'u-ada', username: 'Ada' }
const bob: Caller = { userId: 'u-bob', username: 'Bob' }
const cy: Caller = { userId: 'u-cy', username: 'Cy' }

function setup() {
  let clock = Date.UTC(2026, 8, 30, 12)
  let n = 0
  let r = 0x2545f491
  const store = createMemoryStore()
  const server = createGameServer({
    store,
    ctx,
    now: () => clock,
    // mulberry32: a repeatable stream for the tests.
    random: () => {
      r = (r + 0x6d2b79f5) | 0
      let x = Math.imul(r ^ (r >>> 15), 1 | r)
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296
    },
    newId: () => `g-${++n}`,
  })
  const call = async (caller: Caller | null, body: unknown) => server.request(caller, body)
  const must = async (caller: Caller, body: unknown) => {
    const reply = await call(caller, body)
    if (reply.status !== 200) throw new Error(`${JSON.stringify(body)} → ${reply.status} ${JSON.stringify(reply.body)}`)
    return reply.body as GameView
  }
  /** Time passes with everyone's tab open: each player's heartbeat every 15 s. */
  const wait = async (ms: number, gameId: string, present: Caller[]) => {
    const end = clock + ms
    let last: GameView | null = null
    while (clock < end) {
      clock = Math.min(end, clock + 15_000)
      for (const p of present) last = await must(p, { op: 'ping', gameId })
    }
    return last!
  }
  return { store, server, call, must, wait, tick: (ms: number) => (clock += ms), now: () => clock }
}

type Setup = ReturnType<typeof setup>

/** A 3-player public game of Ada (host), Bob and Cy, started. */
async function started(t: Setup, players = 3) {
  const lobby = await t.must(ada, { op: 'create', players, visibility: 'public' })
  const others = [bob, cy].slice(0, players - 1)
  for (const p of others) {
    await t.must(p, { op: 'join', code: lobby.code })
    await t.must(p, { op: 'ready', gameId: lobby.id, ready: true })
  }
  const view = await t.must(ada, { op: 'start', gameId: lobby.id })
  return { id: lobby.id, view }
}

const callers = [ada, bob, cy]
const callerFor = (view: GameView, seat: number) => callers.find((c) => c.username === view.seats[seat].username)!

/** The seat whose turn it is, its caller, and a legal first-card pass for them. */
async function whoseTurn(t: Setup, id: string) {
  const v = await t.must(ada, { op: 'view', gameId: id })
  const seat = currentPlayerId(v.state!)
  const caller = callerFor(v, seat)
  const mine = await t.must(caller, { op: 'view', gameId: id })
  return { seat, caller, view: mine, pass: { type: 'pass', cards: [mine.state!.players[seat].hand[0].id] } as Action }
}

describe('online games: the lobby', () => {
  let t: Setup
  beforeEach(() => {
    t = setup()
  })

  it('creates a game with a 6-letter invite code; others join by the code, get ready, and the host starts it', async () => {
    const lobby = await t.must(ada, { op: 'create', players: 3, visibility: 'public' })
    expect(lobby.code).toMatch(/^[A-Z]{6}$/)
    expect(lobby.status).toBe('lobby')
    expect(lobby.isHost).toBe(true)
    await t.must(bob, { op: 'join', code: lobby.code!.toLowerCase() })
    await t.must(cy, { op: 'join', code: lobby.code })
    expect((await t.call(cy, { op: 'start', gameId: lobby.id })).body).toMatchObject({ error: 'not-host' })
    expect((await t.call(ada, { op: 'start', gameId: lobby.id })).body).toMatchObject({ error: 'not-ready' })
    await t.must(bob, { op: 'ready', gameId: lobby.id, ready: true })
    await t.must(cy, { op: 'ready', gameId: lobby.id, ready: true })
    const game = await t.must(ada, { op: 'start', gameId: lobby.id })
    expect(game.status).toBe('playing')
    expect(game.rated).toBe(true) // public, Normal, all human
    expect(game.seats.map((s) => s.clockMs)).toEqual([1, 2, 3].map(() => TIME_CONTROL.normal.baseMs))
  })

  it('lists open public games (with their average rating) and my games; private games stay out of the public list', async () => {
    await t.must(ada, { op: 'create', players: 2, visibility: 'public' })
    await t.must(bob, { op: 'create', players: 4, visibility: 'private' })
    const list = (await t.call(cy, { op: 'list' })).body as { open: { host: string; code: string | null }[]; mine: unknown[] }
    expect(list.open.map((g) => g.host)).toEqual(['Ada'])
    expect(list.open[0].code).toBeNull() // codes only for players
    const bobs = (await t.call(bob, { op: 'list' })).body as { mine: { host: string; code: string | null }[] }
    expect(bobs.mine[0]).toMatchObject({ host: 'Bob' })
    expect(bobs.mine[0].code).toMatch(/^[A-Z]{6}$/)
  })

  it('keeps a private game to its invite link, and bots only in private games', async () => {
    const lobby = await t.must(ada, { op: 'create', players: 3, visibility: 'private' })
    expect((await t.call(bob, { op: 'join', gameId: lobby.id })).body).toMatchObject({ error: 'private' })
    await t.must(bob, { op: 'join', code: lobby.code })
    await t.must(ada, { op: 'add-bot', gameId: lobby.id, level: 'easy' })
    expect((await t.call(ada, { op: 'settings', gameId: lobby.id, visibility: 'public' })).body).toMatchObject({ error: 'bots-private' })
    const pub = await t.must(cy, { op: 'create', players: 2, visibility: 'public' })
    expect((await t.call(cy, { op: 'add-bot', gameId: pub.id, level: 'easy' })).body).toMatchObject({ error: 'bots-private' })
  })

  it('only lets Normal on Wales & the West be played', async () => {
    expect((await t.call(ada, { op: 'create', players: 2, visibility: 'public', mode: 'blitz' })).body).toMatchObject({ error: 'mode-unavailable' })
    expect((await t.call(ada, { op: 'create', players: 2, visibility: 'public', mapId: 'mersey-valley' })).body).toMatchObject({ error: 'map-unavailable' })
    expect((await t.call(null, { op: 'list' })).status).toBe(401)
  })
})

describe('online games: every move checked on the server', () => {
  let t: Setup
  beforeEach(() => {
    t = setup()
  })

  it('gives each player only their own hand; spectators see no hands, no deck order, no seed', async () => {
    const { id } = await started(t)
    const views = await Promise.all(callers.map((c) => t.must(c, { op: 'view', gameId: id })))
    for (const v of views) {
      const seat = v.mySeat!
      v.state!.players.forEach((p, i) => {
        if (i === seat) expect(p.hand.some(isHiddenCard)).toBe(false)
        else expect(p.hand.every(isHiddenCard)).toBe(true)
      })
      expect(v.state!.deck.every(isHiddenCard)).toBe(true)
      expect(v.state!.seed).toBe(0)
      expect(v.state!.distant.deck.every((i) => i === -1)).toBe(true)
    }
    const watcher = await t.must({ userId: 'u-dee', username: 'Dee' }, { op: 'view', gameId: id })
    expect(watcher.mySeat).toBeNull()
    expect(watcher.state!.players.every((p) => p.hand.every(isHiddenCard))).toBe(true)
    expect(watcher.code).toBeNull()
  })

  it('rejects an illegal move', async () => {
    const { id } = await started(t)
    const { caller, view } = await whoseTurn(t, id)
    // A card they don't hold.
    const bad = await t.call(caller, { op: 'act', gameId: id, version: view.version, action: { type: 'pass', cards: ['loc_birmingham#9'] } })
    expect(bad.status).toBe(422)
    expect(bad.body).toMatchObject({ error: 'card' })
    // Building where nothing can be built with that card.
    const build = await t.call(caller, { op: 'act', gameId: id, version: view.version, action: { type: 'build', cards: [view.state!.players[view.mySeat!].hand[0].id], slot: 'nowhere:0', industry: 'cotton' } })
    expect(build.status).toBe(422)
    // Nothing changed.
    expect((await t.must(caller, { op: 'view', gameId: id })).version).toBe(view.version)
  })

  it('rejects a move out of turn', async () => {
    const { id } = await started(t)
    const { seat } = await whoseTurn(t, id)
    const current = callerFor(await t.must(ada, { op: 'view', gameId: id }), seat)
    const other = callers.find((c) => c !== current)!
    const mine = await t.must(other, { op: 'view', gameId: id })
    const reply = await t.call(other, { op: 'act', gameId: id, version: mine.version, action: { type: 'pass', cards: [mine.state!.players[mine.mySeat!].hand[0].id] } })
    expect(reply.status).toBe(403)
    expect(reply.body).toMatchObject({ error: 'not-your-turn' })
    // And someone who isn't in the game at all.
    expect((await t.call({ userId: 'u-x', username: 'X' }, { op: 'act', gameId: id, version: mine.version, action: { type: 'pass', cards: [] } })).body).toMatchObject({ error: 'not-a-player' })
  })

  it('rejects a tampered request: a game state (or anything but the move) sent with it', async () => {
    const { id } = await started(t)
    const { caller, view, pass } = await whoseTurn(t, id)
    const forged = structuredClone(view.state!)
    forged.players[view.mySeat!].money = 999
    const reply = await t.call(caller, { op: 'act', gameId: id, version: view.version, action: pass, state: forged })
    expect(reply.status).toBe(400)
    expect(reply.body).toMatchObject({ error: 'tampered' })
    // The money didn't change.
    const after = await t.must(caller, { op: 'view', gameId: id })
    expect(after.state!.players[view.mySeat!].money).toBe(view.state!.players[view.mySeat!].money)
  })

  it('lets only one of two moves made at the same time succeed', async () => {
    const { id } = await started(t)
    const { caller, view, pass } = await whoseTurn(t, id)
    // The same player on two devices, both from the same version.
    const second = { type: 'pass', cards: [view.state!.players[view.mySeat!].hand[1].id] } as Action
    const [a, b] = await Promise.all([
      t.call(caller, { op: 'act', gameId: id, version: view.version, action: pass }),
      t.call(caller, { op: 'act', gameId: id, version: view.version, action: second }),
    ])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const after = await t.must(caller, { op: 'view', gameId: id })
    expect(after.state!.log.filter((e) => e.kind === 'discard')).toHaveLength(1)
  })

  it('refuses a stale version (the board moved on) and a save based on an older version', async () => {
    const { id } = await started(t)
    const first = await whoseTurn(t, id)
    await t.must(first.caller, { op: 'act', gameId: id, version: first.view.version, action: first.pass })
    const next = await whoseTurn(t, id)
    const stale = await t.call(next.caller, { op: 'act', gameId: id, version: first.view.version, action: next.pass })
    expect(stale.body).toMatchObject({ error: 'stale' })
    // The store itself refuses an out-of-date save.
    const record = (await t.store.loadGame(id))!
    expect(await t.store.saveGame(record, record.version - 1, [])).toBe(false)
  })

  it('logs every move, so a finished game can be replayed from the seed and the log', async () => {
    const { id } = await started(t, 2)
    for (let i = 0; i < 6; i++) {
      const { caller, view, pass } = await whoseTurn(t, id)
      await t.must(caller, { op: 'act', gameId: id, version: view.version, action: pass })
    }
    const rows = await t.store.loadActions(id)
    expect(rows.map((r) => r.seq)).toEqual(rows.map((_, i) => i + 1))
    expect(rows.every((r) => r.by === 'player')).toBe(true)
    // Not before the end.
    expect((await t.call(ada, { op: 'replay', gameId: id })).body).toMatchObject({ error: 'not-finished' })
  })
})

describe('online games: clocks, disconnections and bots', () => {
  let t: Setup
  beforeEach(() => {
    t = setup()
  })

  it('uses a 20 min clock with 20 s added per turn', () => {
    expect(CLOCK).toEqual({ clockSeconds: 1200, incrementSeconds: 20 })
    expect(TIME_CONTROL.normal).toEqual({ baseMs: 1_200_000, incrementMs: 20_000 })
  })

  it('charges a turn to the player’s clock and adds 20 s after it', async () => {
    const { id } = await started(t, 2)
    const { caller, view, seat } = await whoseTurn(t, id)
    t.tick(60_000)
    // Play the whole turn (1 action in round 1).
    const v = await t.must(caller, { op: 'act', gameId: id, version: view.version, action: { type: 'pass', cards: [view.state!.players[seat].hand[0].id] } })
    expect(v.seats[seat].clockMs).toBe(TIME_CONTROL.normal.baseMs - 60_000 + TIME_CONTROL.normal.incrementMs)
  })

  it('runs one clock through both actions of a turn, adds the increment once, and is frozen on the other player’s turn', async () => {
    const { id } = await started(t, 2)
    // Round 1: one action each.
    for (let i = 0; i < 2; i++) {
      const turn = await whoseTurn(t, id)
      await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    const first = await whoseTurn(t, id)
    expect(first.view.state!.actionsLeft).toBe(2)
    const other = 1 - first.seat
    const before = first.view.seats.map((s) => s.clockMs)
    // First action after 30 s: nothing is charged yet, the clock keeps running.
    t.tick(30_000)
    let v = await t.must(first.caller, { op: 'act', gameId: id, version: first.view.version, action: first.pass })
    expect(currentPlayerId(v.state!)).toBe(first.seat)
    expect(v.seats[first.seat].clockMs).toBe(before[first.seat])
    // Second action 20 s later: 50 s charged, +20 s once.
    t.tick(20_000)
    const mine = await t.must(first.caller, { op: 'view', gameId: id })
    v = await t.must(first.caller, { op: 'act', gameId: id, version: mine.version, action: { type: 'pass', cards: [mine.state!.players[first.seat].hand[0].id] } })
    expect(v.seats[first.seat].clockMs).toBe(before[first.seat] - 50_000 + 20_000)
    // The other player's turn: 3 minutes pass; only their clock runs.
    expect(currentPlayerId(v.state!)).toBe(other)
    v = await t.wait(180_000, id, [ada, bob])
    expect(v.seats[first.seat].clockMs).toBe(before[first.seat] - 30_000)
    expect(v.seats[other].clockMs).toBe(before[other])
    expect(v.turn).toMatchObject({ seat: other })
  })

  it('flags a player whose clock runs out: the log says so, the turn’s remaining actions pass, and a bot takes the seat (last place)', async () => {
    const { id } = await started(t, 2)
    for (let i = 0; i < 2; i++) {
      const turn = await whoseTurn(t, id)
      await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    // Round 2 (2 actions): the player to move plays one action, then their clock runs out.
    const turn = await whoseTurn(t, id)
    const flagged = turn.seat
    await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    const handBefore = (await t.must(turn.caller, { op: 'view', gameId: id })).state!.players[flagged].hand.length
    const v = await t.wait(turn.view.seats[flagged].clockMs + 15_000, id, [ada, bob])
    expect(v.seats[flagged]).toMatchObject({ forfeited: true, botPlaying: true, timeouts: 1, clockMs: 0 })
    const rows = await t.store.loadActions(id)
    const at = rows.findIndex((r) => r.action.type === 'out-of-time')
    expect(rows[at]).toMatchObject({ seat: flagged, by: 'clock' })
    // The one remaining action was passed with a card from their hand.
    expect(rows[at + 1]).toMatchObject({ seat: flagged, by: 'clock', action: { type: 'pass' } })
    expect(rows.slice(at + 1).filter((r) => r.seat === flagged && r.by === 'clock')).toHaveLength(1)
    expect(v.state!.log.some((e) => e.kind === 'out-of-time' && e.player === flagged)).toBe(true)
    // From then on, the bot plays the seat.
    expect(rows.slice(at + 2).some((r) => r.seat === flagged && r.by === 'bot') || currentPlayerId(v.state!) !== flagged).toBe(true)
    expect(handBefore).toBeGreaterThan(0)
    // Players can't send "out of time" themselves.
    const other = callers.find((c) => c.username === v.seats[1 - flagged].username)!
    const now = await t.must(other, { op: 'view', gameId: id })
    expect((await t.call(other, { op: 'act', gameId: id, version: now.version, action: { type: 'out-of-time' } })).status).toBe(400)
  })

  it('finishes a flagged player last', async () => {
    const { id } = await started(t, 2)
    const first = await whoseTurn(t, id)
    let v = await t.wait(TIME_CONTROL.normal.baseMs + 15_000, id, [ada, bob])
    expect(v.seats[first.seat].forfeited).toBe(true)
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    expect(v.status).toBe('finished')
    expect(v.result!.places[first.seat]).toBe(2)
  })

  it('shows a 2-minute grace timer when a player disconnects, then a bot plays their seat until they come back', async () => {
    const { id } = await started(t, 2)
    const { seat, caller } = await whoseTurn(t, id)
    const other = callers.find((c) => c.username !== caller.username && c.userId !== 'u-cy')!
    t.tick(CONNECTION_LOST_MS + 1)
    let v = await t.must(other, { op: 'ping', gameId: id })
    expect(v.seats[seat].connected).toBe(false)
    expect(v.seats[seat].graceEndsAt).toBe(v.seats[seat].graceEndsAt) // shown to everyone
    expect(v.seats[seat].graceEndsAt! - t.now()).toBeGreaterThan(DISCONNECT_GRACE_MS - 2)
    expect(v.seats[seat].botPlaying).toBe(false)
    t.tick(DISCONNECT_GRACE_MS)
    v = await t.must(other, { op: 'ping', gameId: id })
    expect(v.seats[seat].botPlaying).toBe(true)
    // The bot played their turn.
    expect((await t.store.loadActions(id)).some((r) => r.seat === seat && r.by === 'bot')).toBe(true)
    // Back again: the seat is theirs.
    v = await t.must(caller, { op: 'ping', gameId: id })
    expect(v.seats[seat]).toMatchObject({ botPlaying: false, connected: true })
  })

  it('plays whole games with bot seats (never rated), and ends with places', async () => {
    const lobby = await t.must(ada, { op: 'create', players: 3, visibility: 'private', rated: true })
    await t.must(ada, { op: 'add-bot', gameId: lobby.id, level: 'easy' })
    await t.must(ada, { op: 'add-bot', gameId: lobby.id, level: 'normal' })
    let v = await t.must(ada, { op: 'start', gameId: lobby.id })
    expect(v.rated).toBe(false)
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      v = await t.must(ada, { op: 'act', gameId: lobby.id, version: v.version, action: { type: 'pass', cards: [v.state!.players[v.mySeat!].hand[0].id] } })
    }
    expect(v.status).toBe('finished')
    expect([...v.result!.places].sort()).toEqual([1, 2, 3])
    expect(v.result!.ratings).toEqual([])
    const replay = (await t.call(ada, { op: 'replay', gameId: lobby.id })).body as ReplayData
    expect(replay.seed).toBeGreaterThan(0)
    expect(replay.actions.length).toBeGreaterThan(50)
    // The browser rebuilds every position from the seed and the log, ending where the server did.
    const states = replayStates(replay)
    expect(states).toHaveLength(replay.actions.length + 1)
    expect(states.at(-1)!.finished).toBe(true)
    expect(states.at(-1)!.players.map((p) => p.vp)).toEqual((await t.store.loadGame(lobby.id))!.state!.players.map((p) => p.vp))
  })
})

describe('online games: results and ratings', () => {
  let t: Setup
  beforeEach(() => {
    t = setup()
  })

  it('plays on when a player deletes their account mid-game (as 006_privacy.sql leaves the record): a bot finishes "Deleted player"', async () => {
    const { id } = await started(t, 3)
    let v = await t.must(ada, { op: 'view', gameId: id })
    for (let guard = 0; guard < 20 && v.state!.round === 1; guard++) {
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    // What delete_my_account does to Cy's seat in the stored record.
    const record = (await t.store.loadGame(id))!
    const cySeat = record.seats.find((s) => s.username === 'Cy')!
    const seat = cySeat.seat
    Object.assign(cySeat, { userId: null, username: 'Deleted player', forfeited: true, botPlaying: true })
    const players = record.state!.players.map((p, i) => (i === seat ? { ...p, name: 'Deleted player' } : p))
    record.state = { ...record.state!, players }
    expect(await t.store.saveGame({ ...record, version: record.version + 1 }, record.version, [])).toBe(true)
    // Ada and Bob pass to the end; the bot plays the deleted seat (on the clients' regular ping).
    v = await t.must(ada, { op: 'view', gameId: id })
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      await t.must(ada, { op: 'ping', gameId: id })
      v = await t.must(ada, { op: 'view', gameId: id })
      if (v.status !== 'playing') break
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    expect(v.status).toBe('finished')
    expect(v.seats[seat].username).toBe('Deleted player')
    expect(v.state!.players[seat].name).toBe('Deleted player')
    // Only the two people with accounts are rated.
    expect(v.result!.ratings.map((r) => r.seat).sort()).toEqual(v.seats.filter((s) => s.seat !== seat).map((s) => s.seat).sort())
    // Replays still work.
    const replay = (await t.call(ada, { op: 'replay', gameId: id })).body as ReplayData
    expect(replay.seats[seat].name).toBe('Deleted player')
  })

  it('rates a finished public game once, and a forfeit finishes last', async () => {
    const { id } = await started(t, 3)
    // Cy leaves after the first round: forfeits.
    let v = await t.must(ada, { op: 'view', gameId: id })
    for (let guard = 0; guard < 20 && v.state!.round === 1; guard++) {
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    const cySeat = v.seats.find((s) => s.username === 'Cy')!.seat
    v = await t.must(cy, { op: 'leave', gameId: id })
    expect(v.seats[cySeat]).toMatchObject({ forfeited: true, botPlaying: true })
    // Ada and Bob pass to the end.
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    expect(v.status).toBe('finished')
    expect(v.result!.places[cySeat]).toBe(3)
    expect(v.result!.ratings).toHaveLength(3)
    const cyDelta = v.result!.ratings.find((r) => r.userId === 'u-cy')!.delta
    expect(cyDelta).toBeLessThan(0)
    expect(t.store.ratings.get('u-cy|wales-and-the-west')!.gamesPlayed).toBe(1)
    // Pinging again doesn't rate twice.
    await t.must(ada, { op: 'ping', gameId: id })
    expect(t.store.history).toHaveLength(3)
  })

  it('lists each player’s own rating change on their finished games', async () => {
    const { id } = await started(t, 2)
    let v = await t.must(ada, { op: 'view', gameId: id })
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    const lists = (await t.call(ada, { op: 'list' })).body as { mine: { id: string; myRatingChange: number | null }[] }
    const mine = lists.mine.find((g) => g.id === id)!
    expect(mine.myRatingChange).toBeCloseTo(v.result!.ratings.find((r) => r.userId === 'u-ada')!.delta)
  })

  it('decides rated or not: public all-human Normal games yes; private only when ticked; bots never', async () => {
    const pub = await t.must(ada, { op: 'create', players: 2, visibility: 'public' })
    expect(pub.willBeRated).toBe(true)
    const priv = await t.must(bob, { op: 'create', players: 3, visibility: 'private' })
    expect(priv.willBeRated).toBe(false)
    const ticked = await t.must(bob, { op: 'settings', gameId: priv.id, rated: true })
    expect(ticked.willBeRated).toBe(true)
    // A bot makes it unrated, ticked or not.
    const withBot = await t.must(bob, { op: 'add-bot', gameId: priv.id, level: 'normal' })
    expect(withBot.willBeRated).toBe(false)
    await t.must(cy, { op: 'join', code: priv.code! })
    await t.must(cy, { op: 'ready', gameId: priv.id, ready: true })
    const startedView = await t.must(bob, { op: 'start', gameId: priv.id })
    expect(startedView.rated).toBe(false)
  })

  it('shows your own rating: the starting one until you play, with the RD grown for idle days', async () => {
    const fresh = (await t.call(ada, { op: 'my-rating' })).body
    expect(fresh).toMatchObject({ rating: START_RATING.beginner, rd: START_RD, gamesPlayed: 0, provisional: true, unplaced: true })
    // Settled 30 days ago: 20 games, RD 60. Now its RD has grown, and with it back past 110 it's provisional again.
    t.store.ratings.set('u-ada|wales-and-the-west', { userId: 'u-ada', mapId: 'wales-and-the-west', rating: 1320, rd: 60, volatility: 0.06, gamesPlayed: 20, peakRating: 1350, updatedAt: t.now() - 30 * 86_400_000 })
    const later = (await t.call(ada, { op: 'my-rating' })).body as { rating: number; rd: number; provisional: boolean; unplaced: boolean }
    expect(later).toMatchObject({ rating: 1320, unplaced: false, peakRating: 1350 })
    expect(later.rd).toBeGreaterThan(60)
    // A week later it's still settled.
    t.store.ratings.set('u-ada|wales-and-the-west', { userId: 'u-ada', mapId: 'wales-and-the-west', rating: 1320, rd: 60, volatility: 0.06, gamesPlayed: 20, peakRating: 1350, updatedAt: t.now() - 7 * 86_400_000 })
    expect((await t.call(ada, { op: 'my-rating' })).body).toMatchObject({ provisional: false })
  })

  it('calls a game off, unrated, when someone leaves in the first round', async () => {
    const { id } = await started(t, 2)
    await t.must(bob, { op: 'leave', gameId: id })
    const v = await t.must(ada, { op: 'view', gameId: id })
    expect(v.status).toBe('aborted')
    expect(v.result).toMatchObject({ aborted: true, ratings: [] })
    expect(t.store.history).toHaveLength(0)
  })

  it('offers a rematch with the same players', async () => {
    const lobby = await t.must(ada, { op: 'create', players: 2, visibility: 'private' })
    await t.must(ada, { op: 'add-bot', gameId: lobby.id, level: 'easy' })
    let v = await t.must(ada, { op: 'start', gameId: lobby.id })
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      v = await t.must(ada, { op: 'act', gameId: lobby.id, version: v.version, action: { type: 'pass', cards: [v.state!.players[v.mySeat!].hand[0].id] } })
    }
    const again = await t.must(ada, { op: 'rematch', gameId: lobby.id })
    expect(again.status).toBe('lobby')
    expect(again.seats.map((s) => s.username)).toEqual(['Ada', 'Bot (Easy)'])
    expect((await t.must(ada, { op: 'view', gameId: lobby.id })).rematchId).toBe(again.id)
  })
})

describe('online games: quick play', () => {
  it('matches players of similar rating, widening the range by 50 every 10 s', async () => {
    const t = setup()
    t.store.ratings.set('u-ada|wales-and-the-west', { userId: 'u-ada', mapId: 'wales-and-the-west', rating: 1000, rd: 350, volatility: 0.06, gamesPlayed: 0, peakRating: 1000, updatedAt: 0 })
    t.store.ratings.set('u-bob|wales-and-the-west', { userId: 'u-bob', mapId: 'wales-and-the-west', rating: 1400, rd: 350, volatility: 0.06, gamesPlayed: 0, peakRating: 1400, updatedAt: 0 })
    t.store.ratings.set('u-cy|wales-and-the-west', { userId: 'u-cy', mapId: 'wales-and-the-west', rating: 1100, rd: 350, volatility: 0.06, gamesPlayed: 0, peakRating: 1100, updatedAt: 0 })
    expect((await t.call(ada, { op: 'quick-play', players: 2 })).body).toMatchObject({ status: 'waiting', range: 150 })
    // Bob is 400 away: no match yet.
    expect((await t.call(bob, { op: 'quick-play', players: 2 })).body).toMatchObject({ status: 'waiting' })
    // Cy is 100 from Ada: matched at once.
    const cyReply = (await t.call(cy, { op: 'quick-play', players: 2 })).body as { status: string; gameId: string }
    expect(cyReply.status).toBe('matched')
    expect((await t.call(ada, { op: 'quick-play', players: 2 })).body).toMatchObject({ status: 'matched', gameId: cyReply.gameId })
    const game = await t.must(ada, { op: 'view', gameId: cyReply.gameId })
    expect(game).toMatchObject({ status: 'playing', visibility: 'public', rated: true })
    // Bob waits; after 60 s his range is 450, but nobody else is queued.
    t.tick(60_000)
    expect((await t.call(bob, { op: 'quick-play', players: 2 })).body).toMatchObject({ status: 'waiting', range: 450 })
  })
})

describe('people: profiles, the leaderboard, friends', () => {
  let t: Setup
  beforeEach(() => {
    t = setup()
  })

  /** Plays a 2-player public game between Ada and Bob to the end (both pass). */
  async function playOut(): Promise<string> {
    const { id } = await started(t, 2)
    let v = await t.must(ada, { op: 'view', gameId: id })
    for (let guard = 0; guard < 400 && v.status === 'playing'; guard++) {
      const turn = await whoseTurn(t, id)
      v = await t.must(turn.caller, { op: 'act', gameId: id, version: turn.view.version, action: turn.pass })
    }
    return id
  }

  it('shows a profile: ratings per map, the rating graph, stats and the last games (replayable)', async () => {
    const id = await playOut()
    const p = (await t.call(cy, { op: 'profile', username: 'ada' })).body as OnlineProfile
    expect(p).toMatchObject({ username: 'Ada', hidden: false, friend: 'none' })
    expect(p.ratings).toHaveLength(1)
    expect(p.ratings[0]).toMatchObject({ mapId: 'wales-and-the-west', gamesPlayed: 1, provisional: true })
    expect(p.graph).toHaveLength(1)
    expect(p.stats).toMatchObject({ games: 1, rated: 1 })
    expect(p.games[0]).toMatchObject({ id, rated: true, replayable: true })
    expect(p.games[0].players.map((x) => x.username).sort()).toEqual(['Ada', 'Bob'])
    expect((await t.call(cy, { op: 'profile', username: 'nobody' })).body).toMatchObject({ error: 'no-player' })
  })

  it('keeps private and friends-only profiles to their owner (and friends)', async () => {
    await playOut()
    await t.call(cy, { op: 'friends' })
    t.store.users.get('u-ada')!.profileVisibility = 'friends'
    const stranger = (await t.call(cy, { op: 'profile', username: 'Ada' })).body as OnlineProfile
    expect(stranger).toMatchObject({ hidden: true, ratings: [], games: [] })
    // Friends see it.
    await t.call(cy, { op: 'friend-request', username: 'Ada' })
    await t.call(ada, { op: 'friend-respond', username: 'Cy', accept: true })
    expect(((await t.call(cy, { op: 'profile', username: 'Ada' })).body as OnlineProfile).hidden).toBe(false)
    // History private: ratings show, games don't.
    t.store.users.get('u-ada')!.historyVisibility = 'private'
    const p = (await t.call(cy, { op: 'profile', username: 'Ada' })).body as OnlineProfile
    expect(p).toMatchObject({ hidden: false, historyHidden: true, games: [], graph: [] })
    expect(p.ratings).toHaveLength(1)
    // The owner always sees everything.
    expect(((await t.call(ada, { op: 'profile', username: 'Ada' })).body as OnlineProfile).games).toHaveLength(1)
  })

  it('ranks the top 100 settled ratings and says where you are (or that you are still provisional)', async () => {
    const settled = (userId: string, rating: number) => ({ userId, mapId: 'wales-and-the-west', rating, rd: 60, volatility: 0.06, gamesPlayed: 20, peakRating: rating, updatedAt: t.now() })
    for (let i = 0; i < 120; i++) {
      await t.store.touch(`u-${i}`, `Player${i}`, t.now())
      t.store.ratings.set(`u-${i}|wales-and-the-west`, settled(`u-${i}`, 1000 + i * 5))
    }
    // A provisional high rating isn't ranked.
    await t.store.touch('u-new', 'Newcomer', t.now())
    t.store.ratings.set('u-new|wales-and-the-west', { ...settled('u-new', 2000), gamesPlayed: 3 })
    await t.call(ada, { op: 'friends' })
    t.store.ratings.set('u-ada|wales-and-the-west', settled('u-ada', 1012))
    const board = (await t.call(ada, { op: 'leaderboard' })).body as Leaderboard
    expect(board.rows).toHaveLength(100)
    expect(board.rows[0]).toMatchObject({ rank: 1, username: 'Player119', rating: 1595 })
    expect(board.rows.some((r) => r.username === 'Newcomer')).toBe(false)
    // Ada (1012) is outside the top 100 but still told her rank.
    expect(board.me).toMatchObject({ rating: 1012, provisional: false })
    expect(board.me!.rank).toBe(118)
    // Cy has no rating yet.
    expect(((await t.call(cy, { op: 'leaderboard' })).body as Leaderboard).me).toBeNull()
  })

  it('finds players, sends, accepts and declines friend requests, and shows who is online and what they play', async () => {
    for (const p of [ada, bob, cy]) await t.call(p, { op: 'friends' })
    const found = (await t.call(ada, { op: 'friend-search', query: 'bo' })).body as { results: { username: string; friend: string }[] }
    expect(found.results).toEqual([{ username: 'Bob', avatar: null, friend: 'none' }])
    let view = (await t.call(ada, { op: 'friend-request', username: 'Bob' })).body as FriendsView
    expect(view.outgoing.map((x) => x.username)).toEqual(['Bob'])
    expect(((await t.call(bob, { op: 'friends' })).body as FriendsView).incoming.map((x) => x.username)).toEqual(['Ada'])
    view = (await t.call(bob, { op: 'friend-respond', username: 'Ada', accept: true })).body as FriendsView
    expect(view.friends).toMatchObject([{ username: 'Ada', online: true, playing: null }])
    // Declined: nothing left.
    await t.call(cy, { op: 'friend-request', username: 'Ada' })
    view = (await t.call(ada, { op: 'friend-respond', username: 'Cy', accept: false })).body as FriendsView
    expect(view.incoming).toEqual([])
    // Online goes after 2 minutes of silence; a game in progress shows (and may be watched).
    t.tick(3 * 60_000)
    expect(((await t.call(bob, { op: 'friends' })).body as FriendsView).friends[0].online).toBe(false)
    const lobby = await t.must(ada, { op: 'create', players: 2, visibility: 'public' })
    await t.must(cy, { op: 'join', code: lobby.code! })
    await t.must(cy, { op: 'ready', gameId: lobby.id, ready: true })
    await t.must(ada, { op: 'start', gameId: lobby.id })
    expect(((await t.call(bob, { op: 'friends' })).body as FriendsView).friends[0]).toMatchObject({ online: true, playing: { gameId: lobby.id, canWatch: true } })
    // Removing a friend.
    view = (await t.call(bob, { op: 'friend-remove', username: 'Ada' })).body as FriendsView
    expect(view.friends).toEqual([])
  })

  it('lets you invite friends (only friends) to a game that hasn’t started', async () => {
    for (const p of [ada, bob, cy]) await t.call(p, { op: 'friends' })
    await t.call(ada, { op: 'friend-request', username: 'Bob' })
    await t.call(bob, { op: 'friend-request', username: 'Ada' }) // asking back accepts
    const lobby = await t.must(ada, { op: 'create', players: 3, visibility: 'private' })
    expect((await t.call(ada, { op: 'invite', username: 'Cy', gameId: lobby.id })).body).toMatchObject({ error: 'not-friends' })
    expect((await t.call(ada, { op: 'invite', username: 'Bob', gameId: lobby.id })).status).toBe(200)
    const inv = ((await t.call(bob, { op: 'friends' })).body as FriendsView).invites
    expect(inv).toMatchObject([{ from: 'Ada', gameId: lobby.id, code: lobby.code }])
    // The invite's code joins the private game, and the invite goes once used.
    expect((await t.call(bob, { op: 'join', code: inv[0].code })).status).toBe(200)
    expect(((await t.call(bob, { op: 'friends' })).body as FriendsView).invites).toEqual([])
    // Or dismiss it.
    await t.call(ada, { op: 'friend-request', username: 'Cy' })
    await t.call(cy, { op: 'friend-respond', username: 'Ada', accept: true })
    await t.must(ada, { op: 'invite', username: 'Cy', gameId: lobby.id })
    const cyInv = ((await t.call(cy, { op: 'friends' })).body as FriendsView).invites
    expect(cyInv).toHaveLength(1)
    const after = (await t.call(cy, { op: 'invite-dismiss', id: cyInv[0].id })).body as FriendsView
    expect(after.invites).toEqual([])
  })
})
