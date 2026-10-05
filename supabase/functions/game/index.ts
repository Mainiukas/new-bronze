// Supabase Edge Function (Deno): the online game server. Every lobby and game
// request goes through here; it runs the same rules engine as the browser
// (bundled into ../_shared/game-server.js by `npm run build:server`), checks
// whose turn it is and whether the move is legal, and saves the game and its
// log in one transaction. Hidden cards, the deck and the random seed never
// leave the server. After a change it tells watchers over Realtime
// (topics `game:<id>` and `lobby`); they then ask for their own view.
//
// Secrets (Supabase): SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase; the service key is used only here, never in the app.
// It checks the player's log-in itself (visitors may watch public games), so
// it's deployed with --no-verify-jwt (see SETUP.md):
//   supabase functions deploy game --no-verify-jwt

import { botThinkTime, createGameServer, RULES_CONTEXT } from '../_shared/game-server.js'
import { supabaseGameStore } from '../_shared/supabaseGameStore.ts'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

/** A crypto-strong random number in [0, 1). */
function random(): number {
  const words = new Uint32Array(2)
  crypto.getRandomValues(words)
  return (words[0] * 2 ** 21 + (words[1] >>> 11)) / 2 ** 53
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (request.method !== 'POST') return json({ error: 'bad-request', message: 'Use POST.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || request.headers.get('apikey')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'not-set-up', message: 'Online play isn’t set up.' }, 503)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'bad-request', message: 'Send JSON.' }, 400)
  }

  // Who is asking: Supabase checks the token. No token (or the public key) = a visitor.
  const authorization = request.headers.get('Authorization') ?? ''
  let caller: { userId: string; username: string } | null = null
  if (authorization && authorization !== `Bearer ${anonKey}`) {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } })
    if (!userResponse.ok) return json({ error: 'signed-out', message: 'Log in again.' }, 401)
    const user = (await userResponse.json()) as { id: string }
    const profile = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=username,needs_username`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    const rows = profile.ok ? ((await profile.json()) as { username: string; needs_username: boolean }[]) : []
    if (!rows[0] || rows[0].needs_username) return json({ error: 'no-username', message: 'Choose a username first.' }, 403)
    caller = { userId: user.id, username: rows[0].username }
  }

  const server = createGameServer({
    store: supabaseGameStore(supabaseUrl, serviceKey),
    ctx: RULES_CONTEXT,
    now: () => Date.now(),
    random,
    newId: () => crypto.randomUUID(),
    // Bots move one at a time after a moment's thought, like a person.
    botThinkMs: (firstOfTurn: boolean) => botThinkTime(firstOfTurn),
  })

  let reply
  try {
    reply = await server.request(caller, body)
  } catch (error) {
    console.error(error)
    return json({ error: 'server', message: 'Something went wrong. Try again.' }, 500)
  }

  // Tell watchers something changed (best effort: players also poll).
  const messages = [
    ...reply.changed.map((id) => ({ topic: `game:${id}`, event: 'changed', payload: { id } })),
    ...(reply.lobbyChanged ? [{ topic: 'lobby', event: 'changed', payload: {} }] : []),
  ]
  if (messages.length) {
    await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    }).catch((error) => console.error('broadcast', error))
  }
  return json(reply.body, reply.status)
})
