import { describe, expect, it } from 'vitest'
import { createGameServer, RULES_CONTEXT } from './game-server.js'
import { createMemoryStore } from '../../../src/server/memoryStore.ts'
import { supabaseGameStore } from './supabaseGameStore.ts'
import type { GameRecord } from '../../../src/server/types.ts'

/** Starts a real 3-player game in memory and returns its record. */
async function startedRecord(): Promise<GameRecord> {
  const store = createMemoryStore()
  let n = 0
  const server = createGameServer({ store, ctx: RULES_CONTEXT, now: () => Date.UTC(2026, 8, 30), random: Math.random, newId: () => `g-${++n}` })
  const [ada, bob, cy] = ['Ada', 'Bob', 'Cy'].map((name) => ({ userId: `u-${name}`, username: name }))
  const lobby = (await server.request(ada, { op: 'create', players: 3, visibility: 'public' })).body as { id: string; code: string }
  for (const p of [bob, cy]) {
    await server.request(p, { op: 'join', code: lobby.code })
    await server.request(p, { op: 'ready', gameId: lobby.id, ready: true })
  }
  await server.request(ada, { op: 'start', gameId: lobby.id })
  return (await store.loadGame(lobby.id))!
}

describe('the Supabase game store', () => {
  it('calls the service functions with the service key, and hands each player only their own cards', async () => {
    const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = []
    const store = supabaseGameStore('https://x.supabase.co', 'service-key', async (url, init) => {
      calls.push({ url, headers: init!.headers as Record<string, string>, body: JSON.parse(String(init!.body)) })
      return new Response('true', { status: 200 })
    })
    const record = await startedRecord()
    expect(await store.saveGame(record, 3, [])).toBe(true)

    const call = calls[0]
    expect(call.url).toBe('https://x.supabase.co/rest/v1/rpc/bronze_game_save')
    expect(call.headers.Authorization).toBe('Bearer service-key')
    const hands = call.body.p_hands as { seat: number; userId: string; cards: { id: string }[] }[]
    expect(hands).toHaveLength(3)
    for (const hand of hands) {
      expect(hand.userId).toBe(record.seats[hand.seat].userId)
      expect(hand.cards.map((c) => c.id)).toEqual(record.state!.players[hand.seat].hand.map((c) => c.id))
    }
    // The spectators' copy has no real cards, deck or seed.
    const text = JSON.stringify(call.body.p_public_state)
    for (const card of record.state!.players[0].hand) expect(text).not.toContain(`"${card.id}"`)
    expect(call.body.p_public_state).toMatchObject({ seed: 0, rng: 0 })
  })

  it('reports a failed call instead of pretending it worked', async () => {
    const store = supabaseGameStore('https://x.supabase.co', 'k', async () => new Response('nope', { status: 500 }))
    await expect(store.loadGame('g-1')).rejects.toThrow('bronze_game_load: 500')
  })
})
