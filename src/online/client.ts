/**
 * Online play's connection: every request goes to the `game` Edge Function
 * (supabase/functions/game), which runs the rules on the server; changes are
 * announced over Supabase Realtime (`game:<id>`, `lobby`), and the screens
 * then ask for their own view. When Realtime can't connect, the screens poll.
 */

import { SUPABASE_ANON_KEY, SUPABASE_URL, sharedSupabaseClient, supabaseConfigured } from '../lib/supabase'
import type { GameSummary, GameView, Request } from '../server/types'

export type { GameSummary, GameView, Request }

/** A refused request: the server's code (e.g. 'not-your-turn', 'full'), for the words catalogue. */
export class OnlineError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export interface GameLists {
  open: GameSummary[]
  live: GameSummary[]
  mine: GameSummary[]
}

export type QuickPlayReply = { status: 'matched'; gameId: string } | { status: 'waiting'; range: number; waitedMs: number }

export const onlineAvailable = supabaseConfigured

/** Sends one request to the game server as the signed-in player (or a visitor). */
export async function gameRequest<T>(body: Request): Promise<T> {
  if (!onlineAvailable) throw new OnlineError('not-set-up', 'Online play isn’t set up.', 503)
  const client = await sharedSupabaseClient()
  const token = client ? (await client.auth.getSession()).data.session?.access_token : undefined
  let response: Response
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/game`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new OnlineError('network', 'No connection.', 0)
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string; message?: string }) | null
  if (!response.ok) throw new OnlineError(data?.error ?? (response.status === 404 ? 'not-set-up' : 'server'), data?.message ?? response.statusText, response.status)
  return data as T
}

/**
 * Calls `onChange` whenever the server announces a change on `topic`.
 * `onStatus(true)` once Realtime is connected; false when it isn't (then poll).
 */
export function watchTopic(topic: string, onChange: () => void, onStatus: (live: boolean) => void): () => void {
  let stopped = false
  let stop = () => {}
  void sharedSupabaseClient().then((client) => {
    if (stopped || !client) return onStatus(false)
    const channel = client
      .channel(topic)
      .on('broadcast', { event: 'changed' }, () => onChange())
      .subscribe((status) => onStatus(status === 'SUBSCRIBED'))
    stop = () => void client.removeChannel(channel)
  })
  return () => {
    stopped = true
    stop()
  }
}
