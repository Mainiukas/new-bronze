/**
 * The online game server's records and messages. Plain JSON: the server keeps
 * a whole game as one GameRecord (its full state, hidden cards and all, never
 * leaves the server), and sends each viewer a GameView made for them.
 */

import type { Action, Card, GameState } from '../rules/state'

export type GameStatus = 'lobby' | 'playing' | 'finished' | 'aborted'
export type Visibility = 'public' | 'private'
export type ModeId = 'normal' | 'blitz' | 'bullet'
import type { BotLevel } from '../rules/bots'

export type { BotLevel }

export interface Seat {
  seat: number
  /** Null for a bot seat (and for a player whose account was deleted). */
  userId: string | null
  username: string
  /** A computer seat, and its level. */
  bot: BotLevel | null
  ready: boolean
  /** When the server last heard from this player (ms). */
  lastSeen: number
  /** A bot is playing this seat: the player was disconnected past the grace time (until they come back), or forfeited. */
  botPlaying: boolean
  /** Times their clock ran out this game. */
  timeouts: number
  /** Time left on their chess clock (ms). */
  clockMs: number
  /** Gave up the game (3 timeouts or left after the first round): a bot plays on, and they finish last. */
  forfeited: boolean
}

export interface RatingResult {
  userId: string
  /** Their seat (= their player number in the game). */
  seat: number
  before: number
  after: number
  delta: number
}

export interface GameResult {
  /** Place of each seat (1 = first; forfeits share the last place). */
  places: number[]
  ratings: RatingResult[]
  /** Ended in the first round because someone left: nobody is rated. */
  aborted: boolean
}

export interface GameRecord {
  id: string
  /** Six letters, for invites. */
  code: string
  hostId: string
  status: GameStatus
  visibility: Visibility
  /** Rated at the end (decided when it starts: public, Normal, no bots; or a private game the host marked rated). */
  rated: boolean
  /** The host asked for a rated private game. */
  ratedRequested: boolean
  allowSpectators: boolean
  mode: ModeId
  mapId: string
  maxPlayers: number
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
  /** Goes up by one with every change: a save that isn't based on the latest version is refused. */
  version: number
  seats: Seat[]
  /** The full game (hidden information included): server only. */
  state: GameState | null
  /** The shuffle seed, made on the server (revealed only for replays of finished games). */
  seed: number | null
  /** Whose turn the clock is timing, since when. */
  turn: { seat: number; startedAt: number } | null
  result: GameResult | null
  /** Moves made so far (the action log's length). */
  moves: number
  /** A rematch of this game, once one is made. */
  rematchId: string | null
}

/** One row of the action log: every move in order, from which a game can be replayed. */
export interface ActionRow {
  seq: number
  seat: number
  action: Action
  /** Who made it: the player, a bot (a bot seat or a stand-in), or the clock (a timeout's pass). */
  by: 'player' | 'bot' | 'clock'
  at: number
}

export interface SeatView {
  seat: number
  username: string
  bot: BotLevel | null
  /** A signed-in player (not a bot). */
  human: boolean
  ready: boolean
  connected: boolean
  /** Disconnected: when the bot takes over (the grace timer everyone sees), until then. */
  graceEndsAt: number | null
  botPlaying: boolean
  timeouts: number
  clockMs: number
  forfeited: boolean
  host: boolean
  rating: number | null
  /** The rating's uncertainty now (grown for idle days), and rated games played: for the "?" tooltip. */
  ratingRd: number | null
  gamesPlayed: number
  provisional: boolean
}

/** What one viewer sees of a game: only their own hand; spectators see no hands. */
export interface GameView {
  id: string
  /** The invite code: for the players, and anyone who opened the game with it. */
  code: string | null
  status: GameStatus
  visibility: Visibility
  rated: boolean
  /** In the lobby: would it be rated if it started now (public or marked rated, Normal, no bots)? */
  willBeRated: boolean
  ratedRequested: boolean
  allowSpectators: boolean
  mode: ModeId
  mapId: string
  maxPlayers: number
  version: number
  seats: SeatView[]
  /** The viewer's seat, or null when watching. */
  mySeat: number | null
  isHost: boolean
  /** The game as this viewer may see it (other hands, the deck and the distant-market order hidden). */
  state: GameState | null
  turn: { seat: number; startedAt: number } | null
  result: GameResult | null
  rematchId: string | null
  /** The server's clock, for showing timers. */
  serverNow: number
}

export interface GameSummary {
  id: string
  code: string | null
  status: GameStatus
  visibility: Visibility
  rated: boolean
  mode: ModeId
  mapId: string
  maxPlayers: number
  players: { username: string; bot: boolean; ready: boolean }[]
  averageRating: number | null
  host: string
  createdAt: number
  /** Round and era, while playing. */
  progress: { era: string; round: number } | null
  mine: boolean
  /** A finished rated game: the caller's rating change. */
  myRatingChange: number | null
}

export interface RatingRow {
  userId: string
  mapId: string
  rating: number
  rd: number
  volatility: number
  gamesPlayed: number
  peakRating: number
  updatedAt: number
}

/** A player's own rating on a map, as it stands now. */
export interface MyRating {
  mapId: string
  rating: number
  /** Uncertainty now (grown for the days without a rated game). */
  rd: number
  gamesPlayed: number
  provisional: boolean
  peakRating: number
  /** No rated game yet, and no starting level saved: the default start is shown. */
  unplaced: boolean
}

export interface QueueEntry {
  userId: string
  username: string
  rating: number
  players: number
  mode: ModeId
  mapId: string
  since: number
  /** Set when matched: the game to go to. */
  matchedGameId: string | null
}

/** Where the server keeps games. The Supabase version runs every save in one transaction. */
export interface GameStore {
  insertGame(record: GameRecord): Promise<void>
  loadGame(id: string): Promise<GameRecord | null>
  findByCode(code: string): Promise<string | null>
  /** Save if the stored version is still `expectedVersion` (then it's record.version), with new log rows. False: someone else saved first. */
  saveGame(record: GameRecord, expectedVersion: number, actions: ActionRow[]): Promise<boolean>
  loadActions(gameId: string): Promise<ActionRow[]>
  /** Lobbies open to join, and games being played that anyone may watch. */
  listPublic(): Promise<GameRecord[]>
  /** The caller's games that aren't over (lobby or playing), and their recent finished ones. */
  listFor(userId: string): Promise<GameRecord[]>
  getRatings(userIds: string[], mapId: string): Promise<Record<string, RatingRow>>
  saveRatings(rows: RatingRow[], history: { userId: string; mapId: string; gameId: string; before: number; after: number; delta: number; mode: ModeId; at: number }[]): Promise<void>
  getQueue(): Promise<QueueEntry[]>
  putQueue(entry: QueueEntry): Promise<void>
  removeQueue(userIds: string[]): Promise<void>

  /* ---- People (profiles, friends, presence) ---- */
  /** Note that a player was here (and, in memory, who they are). */
  touch(userId: string, username: string, at: number): Promise<void>
  lastSeen(userIds: string[]): Promise<Record<string, number>>
  findUser(username: string): Promise<UserInfo | null>
  getUsers(userIds: string[]): Promise<Record<string, UserInfo>>
  /** Usernames starting with `prefix` (case-insensitive), at most `limit`. */
  searchUsers(prefix: string, limit: number): Promise<UserInfo[]>
  friendships(userId: string): Promise<Friendship[]>
  putFriendship(f: Friendship): Promise<void>
  removeFriendship(a: string, b: string): Promise<void>
  putInvite(invite: Invite): Promise<void>
  invitesFor(userId: string): Promise<Invite[]>
  removeInvite(id: string): Promise<void>
  /** Every map's rating of one player. */
  ratingsFor(userId: string): Promise<RatingRow[]>
  /** Their rating changes on a map, oldest first (the last `limit`). */
  ratingHistory(userId: string, mapId: string, limit: number): Promise<RatingHistoryRow[]>
  /** Their finished games, newest first. */
  finishedGames(userId: string, limit: number): Promise<GameRecord[]>
  /** Ratings on a map with at least `minGames` games, highest first, with usernames. */
  leaderboardRows(mapId: string, minGames: number, limit: number): Promise<(RatingRow & { username: string })[]>
}

export type ProfileVisibility = 'public' | 'friends' | 'private'

export interface UserInfo {
  userId: string
  username: string
  avatar: string | null
  profileVisibility: ProfileVisibility
  historyVisibility: ProfileVisibility
}

/** Two players, one row: `requester` asked; `accepted` once the other said yes. */
export interface Friendship {
  a: string
  b: string
  requester: string
  status: 'pending' | 'accepted'
  since: number
}

export interface Invite {
  id: string
  from: string
  fromName: string
  to: string
  gameId: string
  code: string
  at: number
}

export interface RatingHistoryRow {
  gameId: string
  before: number
  after: number
  delta: number
  mode: ModeId
  at: number
}

export type FriendStatus = 'self' | 'none' | 'requested' | 'incoming' | 'friends'

/** A player's online profile: what the viewer may see of it. */
export interface OnlineProfile {
  username: string
  avatar: string | null
  /** Hidden by their privacy settings: only the name and picture. */
  hidden: boolean
  historyHidden: boolean
  friend: FriendStatus
  online: boolean
  ratings: { mapId: string; rating: number; rd: number; provisional: boolean; gamesPlayed: number; peakRating: number }[]
  /** The rating after each rated game on the main map, oldest first. */
  graph: { at: number; rating: number; delta: number; gameId: string }[]
  stats: { games: number; wins: number; averagePlace: number | null; rated: number }
  games: ProfileGame[]
}

export interface ProfileGame {
  id: string
  finishedAt: number
  mode: ModeId
  mapId: string
  rated: boolean
  aborted: boolean
  place: number | null
  players: { username: string; place: number | null; bot: boolean }[]
  ratingChange: number | null
  /** The viewer may replay it (a public game, or one they played in). */
  replayable: boolean
}

export interface LeaderboardRow {
  rank: number
  username: string
  rating: number
  gamesPlayed: number
}

export interface Leaderboard {
  mapId: string
  rows: LeaderboardRow[]
  /** The caller: their rank (when not provisional and not in the top rows, still shown), or why they're not ranked. */
  me: { rank: number | null; rating: number; provisional: boolean; gamesPlayed: number } | null
}

export interface FriendsView {
  friends: { username: string; avatar: string | null; online: boolean; playing: { gameId: string; canWatch: boolean } | null }[]
  incoming: { username: string; avatar: string | null }[]
  outgoing: { username: string; avatar: string | null }[]
  invites: { id: string; from: string; gameId: string; code: string; at: number }[]
}

export type Request =
  | { op: 'create'; players: number; visibility: Visibility; rated?: boolean; allowSpectators?: boolean; mode?: ModeId; mapId?: string }
  | { op: 'join'; code?: string; gameId?: string }
  | { op: 'leave'; gameId: string }
  | { op: 'ready'; gameId: string; ready: boolean }
  | { op: 'settings'; gameId: string; visibility?: Visibility; rated?: boolean; allowSpectators?: boolean }
  | { op: 'add-bot'; gameId: string; level: BotLevel }
  | { op: 'remove-seat'; gameId: string; seat: number }
  | { op: 'start'; gameId: string }
  | { op: 'act'; gameId: string; version: number; action: Action }
  | { op: 'ping'; gameId: string }
  | { op: 'view'; gameId?: string; code?: string }
  | { op: 'list' }
  | { op: 'rematch'; gameId: string }
  | { op: 'replay'; gameId: string }
  | { op: 'quick-play'; players: number; mode?: ModeId; mapId?: string }
  | { op: 'quick-cancel' }
  | { op: 'my-rating'; mapId?: string }
  | { op: 'profile'; username: string }
  | { op: 'leaderboard'; mapId?: string }
  | { op: 'friends' }
  | { op: 'friend-search'; query: string }
  | { op: 'friend-request'; username: string }
  | { op: 'friend-respond'; username: string; accept: boolean }
  | { op: 'friend-remove'; username: string }
  | { op: 'invite'; username: string; gameId: string }
  | { op: 'invite-dismiss'; id: string }

export type { Action, Card, GameState }
