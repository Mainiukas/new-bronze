/**
 * A GameStore in memory: for the tests and the local development server.
 * Every load and save copies the data, as a database would, and a save based
 * on an older version is refused. Players become known when they first make
 * a request (touch), as signing up would make them in the database.
 */

import type { ActionRow, Friendship, GameRecord, GameStore, Invite, ModeId, QueueEntry, RatingHistoryRow, RatingRow, UserInfo } from './types'

const copy = <T,>(value: T): T => structuredClone(value)

type HistoryRow = RatingHistoryRow & { userId: string; mapId: string }

export function createMemoryStore(): GameStore & { ratings: Map<string, RatingRow>; history: HistoryRow[]; users: Map<string, UserInfo> } {
  const games = new Map<string, GameRecord>()
  const actions = new Map<string, ActionRow[]>()
  const ratings = new Map<string, RatingRow>()
  const history: HistoryRow[] = []
  const users = new Map<string, UserInfo>()
  const seen = new Map<string, number>()
  let friendships: Friendship[] = []
  let invites: Invite[] = []
  let queue: QueueEntry[] = []
  const key = (userId: string, mapId: string) => `${userId}|${mapId}`
  const pair = (f: { a: string; b: string }, x: string, y: string) => (f.a === x && f.b === y) || (f.a === y && f.b === x)

  return {
    ratings,
    history,
    users,
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

    async touch(userId, username, at) {
      seen.set(userId, at)
      if (!users.has(userId)) users.set(userId, { userId, username, avatar: null, profileVisibility: 'public', historyVisibility: 'public' })
    },
    async lastSeen(userIds) {
      return Object.fromEntries(userIds.flatMap((id) => (seen.has(id) ? [[id, seen.get(id)!]] : [])))
    },
    async findUser(username) {
      const u = [...users.values()].find((x) => x.username.toLowerCase() === username.trim().toLowerCase())
      return u ? copy(u) : null
    },
    async getUsers(userIds) {
      return Object.fromEntries(userIds.flatMap((id) => (users.has(id) ? [[id, copy(users.get(id)!)]] : [])))
    },
    async searchUsers(prefix, limit) {
      const p = prefix.trim().toLowerCase()
      return [...users.values()]
        .filter((u) => u.username.toLowerCase().startsWith(p))
        .sort((a, b) => a.username.localeCompare(b.username))
        .slice(0, limit)
        .map(copy)
    },
    async friendships(userId) {
      return copy(friendships.filter((f) => f.a === userId || f.b === userId))
    },
    async putFriendship(f) {
      friendships = [...friendships.filter((x) => !pair(x, f.a, f.b)), copy(f)]
    },
    async removeFriendship(a, b) {
      friendships = friendships.filter((x) => !pair(x, a, b))
    },
    async putInvite(invite) {
      invites = [...invites.filter((i) => !(i.to === invite.to && i.gameId === invite.gameId)), copy(invite)]
    },
    async invitesFor(userId) {
      // Only invites to games that haven't started (as the database's bronze_invites_for).
      return copy(invites.filter((i) => i.to === userId && games.get(i.gameId)?.status === 'lobby'))
    },
    async removeInvite(id) {
      invites = invites.filter((i) => i.id !== id)
    },
    async ratingsFor(userId) {
      return [...ratings.values()].filter((r) => r.userId === userId).map(copy)
    },
    async ratingHistory(userId, mapId, limit) {
      return copy(history.filter((h) => h.userId === userId && h.mapId === mapId).sort((a, b) => a.at - b.at).slice(-limit)).map(({ gameId, before, after, delta, mode, at }) => ({ gameId, before, after, delta, mode: mode as ModeId, at }))
    },
    async finishedGames(userId, limit) {
      return [...games.values()]
        .filter((g) => (g.status === 'finished' || g.status === 'aborted') && g.seats.some((s) => s.userId === userId))
        .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))
        .slice(0, limit)
        .map(copy)
    },
    async leaderboardRows(mapId, minGames, limit) {
      return [...ratings.values()]
        .filter((r) => r.mapId === mapId && r.gamesPlayed >= minGames)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, limit)
        .map((r) => ({ ...copy(r), username: users.get(r.userId)?.username ?? '' }))
    },
  }
}
