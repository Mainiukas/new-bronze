// Supabase Edge Function (Deno): the one-click unsubscribe that email apps call
// from the List-Unsubscribe-Post header (RFC 8058). It takes the player's secret
// token and the list from the URL and calls the unsubscribe() database function.
//
// Deploy (see SETUP.md, "Emails"):  supabase functions deploy unsubscribe --no-verify-jwt
// Not deployed or run by the Bronze build: Bronze sends no optional emails yet.

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const LISTS = new Set(['marketing', 'friends', 'tournaments', 'all'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  // RFC 8058: the one-click request is a POST. GET does nothing, so link scanners can't unsubscribe anyone.
  if (request.method !== 'POST') return new Response('Use the unsubscribe link in the email.', { status: 405, headers: { Allow: 'POST' } })
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const list = url.searchParams.get('list') ?? 'all'
  if (!UUID.test(token) || !LISTS.has(list)) return new Response('This unsubscribe link isn’t valid.', { status: 400 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) return new Response('Not configured.', { status: 500 })
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/unsubscribe`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token, p_list: list }),
  })
  const found = response.ok && (await response.json()) === true
  return new Response(found ? 'You’re unsubscribed.' : 'This unsubscribe link isn’t valid.', {
    status: found ? 200 : 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
