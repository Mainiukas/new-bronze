// The game server's store on Supabase: every read and write is one of the
// service-role functions in supabase/migrations/004_multiplayer.sql, called
// through PostgREST (plain fetch, no libraries). A save writes the game, the
// viewer copies (the public state for spectators, each player's own hand) and
// the new log rows in one transaction, and is refused if someone saved first.

import { redactState } from './game-server.js'
import type { ActionRow, GameRecord, GameStore, QueueEntry, RatingRow } from '../../../src/server/types.ts'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export function supabaseGameStore(url: string, serviceKey: string, fetcher: Fetch = fetch): GameStore {
  async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const response = await fetcher(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    if (!response.ok) throw new Error(`${name}: ${response.status} ${await response.text()}`)
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
  }

  /** What viewers may read without the server: the spectators' copy, and each player's own hand. */
  function copies(record: GameRecord) {
    const state = record.state
    return {
      p_public_state: state ? redactState(state, null) : null,
      p_hands: state ? record.seats.filter((s) => s.userId).map((s) => ({ seat: s.seat, userId: s.userId, cards: state.players[s.seat]?.hand ?? [] })) : [],
    }
  }

  return {
    async insertGame(record) {
      await rpc('bronze_game_insert', { p_record: record, ...copies(record) })
    },
    async loadGame(id) {
      return rpc<GameRecord | null>('bronze_game_load', { p_id: id })
    },
    async findByCode(code) {
      return rpc<string | null>('bronze_game_by_code', { p_code: code })
    },
    async saveGame(record, expectedVersion, actions) {
      return rpc<boolean>('bronze_game_save', { p_record: record, p_expected: expectedVersion, p_actions: actions satisfies ActionRow[], ...copies(record) })
    },
    async loadActions(gameId) {
      return rpc<ActionRow[]>('bronze_game_actions', { p_id: gameId })
    },
    async listPublic() {
      return rpc<GameRecord[]>('bronze_games_public', {})
    },
    async listFor(userId) {
      return rpc<GameRecord[]>('bronze_games_for', { p_user: userId })
    },
    async getRatings(userIds, mapId) {
      if (!userIds.length) return {}
      return rpc<Record<string, RatingRow>>('bronze_ratings_get', { p_users: userIds, p_map: mapId })
    },
    async saveRatings(rows, history) {
      await rpc('bronze_ratings_save', { p_rows: rows, p_history: history })
    },
    async getQueue() {
      return rpc<QueueEntry[]>('bronze_queue_get', {})
    },
    async putQueue(entry) {
      await rpc('bronze_queue_put', { p_entry: entry })
    },
    async removeQueue(userIds) {
      await rpc('bronze_queue_remove', { p_users: userIds })
    },
  }
}
