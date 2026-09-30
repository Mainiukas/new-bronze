/**
 * A GameStore in memory: for the tests and the local development server.
 * Every load and save copies the data, as a database would, and a save based
 * on an older version is refused.
 */

import type { ActionRow, GameRecord, GameStore, QueueEntry, RatingRow } from './types'

const copy = <T,>(value: T): T => structuredClone(value)

export function createMemoryStore(): GameStore & { ratings: Map<string, RatingRow>; history: unknown[] } {
  const games = new Map<string, GameRecord>()
  const actions = new Map<string, ActionRow[]>()
  const ratings = new Map<string, RatingRow>()
  const history: unknown[] = []
  let queue: QueueEntry[] = []
  const key = (userId: string, mapId: string) => `${userId}|${mapId}`

  return {
    ratings,
    history,
    async insertGame(record) {
      if (games.has(record.id)) throw new Error('duplicate game id')
      if ([...games.values()].some((g) => g.code === record.code)) throw new Error('duplicate code')
      games.set(record.id, copy(record))
      actions.set(record.id, [])
    },
    async loadGame(id) {
      const record = games.get(id)
      return record ? copy(record) : null
    },
    async findByCode(code) {
      return [...games.values()].find((g) => g.code === code)?.id ?? null
    },
    async saveGame(record, expectedVersion, rows) {
      const stored = games.get(record.id)
      if (!stored || stored.version !== expectedVersion) return false
      games.set(record.id, copy(record))
      actions.get(record.id)!.push(...copy(rows))
      return true
    },
    async loadActions(gameId) {
      return copy(actions.get(gameId) ?? [])
    },
    async listPublic() {
      return [...games.values()].filter((g) => g.visibility === 'public' && (g.status === 'lobby' || g.status === 'playing')).map(copy)
    },
    async listFor(userId) {
      return [...games.values()].filter((g) => g.seats.some((s) => s.userId === userId)).sort((a, b) => b.createdAt - a.createdAt).map(copy)
    },
    async getRatings(userIds, mapId) {
      const out: Record<string, RatingRow> = {}
      for (const id of userIds) {
        const row = ratings.get(key(id, mapId))
        if (row) out[id] = copy(row)
      }
      return out
    },
    async saveRatings(rows, rowsHistory) {
      for (const row of rows) ratings.set(key(row.userId, row.mapId), copy(row))
      history.push(...copy(rowsHistory))
    },
    async getQueue() {
      return copy(queue)
    },
    async putQueue(entry) {
      queue = [...queue.filter((e) => e.userId !== entry.userId), copy(entry)]
    },
    async removeQueue(userIds) {
      queue = queue.filter((e) => !userIds.includes(e.userId))
    },
  }
}
