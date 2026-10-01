import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { joinPath, onlineGamePath, profilePath } from '../data/navigation'
import { useT } from '../i18n'
import { gameRequest, onlineAvailable } from '../online/client'
import { useOnlineErrors } from '../online/useOnlineErrors'
import type { FriendStatus, FriendsView, Request } from '../server/types'
import { useAccountAccess } from '../hooks/useAccountAccess'
import { IconEye, IconUserPlus, IconUsers } from './icons'
import { LockPill } from './LockPill'
import { VerifyPill } from './VerifyEmail'

/** How often the list looks again (who's online, new requests and invites). */
const FRIENDS_POLL_MS = 30_000

type SearchResult = { username: string; avatar: string | null; friend: FriendStatus }

/**
 * The lobby's friends panel: find players by name and ask them, answer
 * requests, your friends with who's online (and Watch when they're in a game
 * that allows it), and game invites (Join or Dismiss). Guests see a lock.
 * Online status is real: seen by the game server in the last two minutes.
 */
export function FriendsPanel() {
  const t = useT()
  const access = useAccountAccess()
  const ready = onlineAvailable && access === 'ready'
  return (
    <section aria-labelledby="friends-title" className="plate rivets iron flex flex-col p-4" data-testid="friends-panel">
      <header className="flex items-center gap-2.5">
        <IconUsers className="size-5 text-bronze-300" />
        <h2 id="friends-title" className="flex-1 font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {t.friends.title}
        </h2>
        {access === 'guest' ? <LockPill /> : access === 'unverified' ? <VerifyPill /> : !onlineAvailable ? <span className="soon-tag">{t.common.comingSoon}</span> : null}
      </header>
      {ready ? (
        <Friends />
      ) : (
        <div className="flex flex-col items-center px-2 py-6 text-center">
          <span className="mb-3 grid size-16 place-items-center rounded-full border border-dashed border-bronze-500/40 bg-soot-950/50">
            <IconUsers className="size-8 text-bronze-400/70" />
          </span>
          <p className="font-display text-base font-bold tracking-[0.1em] text-parchment-100 uppercase">{t.friends.none}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-parchment-300">{access === 'guest' ? t.friends.guest : access === 'unverified' ? t.verifyEmail.needed : t.friends.noServer}</p>
        </div>
      )}
    </section>
  )
}

function Friends() {
  const t = useT()
  const s = t.online.social
  const navigate = useNavigate()
  const showError = useOnlineErrors()
  const [view, setView] = useState<FriendsView | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)

  const load = useCallback(async () => {
    try {
      setView(await gameRequest<FriendsView>({ op: 'friends' }))
    } catch {
      // Shown as an empty list; the next look tries again.
    }
  }, [])
  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0)
    const timer = window.setInterval(() => void load(), FRIENDS_POLL_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [load])

  const run = async (body: Request) => {
    try {
      await gameRequest(body)
      await load()
      return true
    } catch (error) {
      showError(error)
      return false
    }
  }
  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return setResults(null)
    try {
      setResults((await gameRequest<{ results: SearchResult[] }>({ op: 'friend-search', query: query.trim() })).results)
    } catch (error) {
      showError(error)
    }
  }
  const ask = async (username: string) => {
    if (await run({ op: 'friend-request', username })) setResults(null)
  }

  const friends = view?.friends ?? []
  const onlineCount = friends.filter((f) => f.online).length
  const row = 'flex min-h-11 items-center gap-2 py-1.5'
  const small = 'btn min-h-9 px-3 text-xs'

  return (
    <>
      <form className="mt-3 flex gap-2" onSubmit={search} role="search">
        <label htmlFor="add-friend" className="sr-only">
          {s.findPlaceholder}
        </label>
        <input
          id="add-friend"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.findPlaceholder}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-bronze-500/40 bg-soot-950/60 px-3 text-sm text-parchment-50 outline-none placeholder:text-parchment-400 focus-visible:border-brass-300"
        />
        <button type="submit" className="btn btn-ghost min-h-11 px-3" aria-label={t.friends.add}>
          <IconUserPlus className="size-5" />
        </button>
      </form>

      {results && (
        <ul aria-label={s.findPlaceholder} className="mt-2 flex flex-col divide-y divide-bronze-500/15 rounded-lg border border-bronze-500/25 bg-soot-950/50 px-3" data-testid="friend-results">
          {results.length === 0 && <li className="py-2 text-sm text-parchment-400">{s.noResults}</li>}
          {results.map((u) => (
            <li key={u.username} className={row}>
              <Link to={profilePath(u.username)} className="min-w-0 flex-1 truncate text-sm text-parchment-50 hover:underline">
                {u.username}
              </Link>
              {u.friend !== 'none' && u.friend !== 'incoming' ? (
                <span className="text-xs text-parchment-400">{u.friend === 'friends' ? s.isFriend : s.requested}</span>
              ) : (
                <button type="button" className={`${small} btn-primary`} onClick={() => void ask(u.username)}>
                  {u.friend === 'incoming' ? s.accept : s.add}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!!view?.invites.length && (
        <Group title={s.invites}>
          {view.invites.map((i) => (
            <li key={i.id} className={row}>
              <span className="min-w-0 flex-1 text-sm text-parchment-100">{s.invitedYou(i.from)}</span>
              <button type="button" className={`${small} btn-primary`} onClick={() => navigate(joinPath(i.code))}>
                {s.join}
              </button>
              <button type="button" className={`${small} btn-ghost`} onClick={() => void run({ op: 'invite-dismiss', id: i.id })}>
                {s.dismiss}
              </button>
            </li>
          ))}
        </Group>
      )}

      {!!view?.incoming.length && (
        <Group title={s.incoming}>
          {view.incoming.map((f) => (
            <li key={f.username} className={row}>
              <Link to={profilePath(f.username)} className="min-w-0 flex-1 truncate text-sm text-parchment-50 hover:underline">
                {f.username}
              </Link>
              <button type="button" className={`${small} btn-primary`} onClick={() => void run({ op: 'friend-respond', username: f.username, accept: true })}>
                {s.accept}
              </button>
              <button type="button" className={`${small} btn-ghost`} onClick={() => void run({ op: 'friend-respond', username: f.username, accept: false })}>
                {s.decline}
              </button>
            </li>
          ))}
        </Group>
      )}

      {friends.length === 0 ? (
        <p className="px-2 py-5 text-center text-sm leading-relaxed text-parchment-300">{view ? s.none : '…'}</p>
      ) : (
        <ul aria-label={t.friends.title} className="mt-2 flex flex-col divide-y divide-bronze-500/15" data-testid="friend-list">
          {[...friends]
            .sort((a, b) => Number(b.online) - Number(a.online) || a.username.localeCompare(b.username))
            .map((f) => (
              <li key={f.username} className={row}>
                <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${f.online ? 'bg-verdigris-300' : 'border border-parchment-500'}`} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link to={profilePath(f.username)} className="truncate text-sm text-parchment-50 hover:underline">
                    {f.username}
                  </Link>
                  <span className={`text-xs ${f.online ? 'text-verdigris-300' : 'text-parchment-400'}`}>{f.playing ? s.playing : f.online ? s.online : s.offline}</span>
                </span>
                {f.playing?.canWatch && (
                  <button type="button" className={`${small} btn-ghost`} onClick={() => navigate(onlineGamePath(f.playing!.gameId))}>
                    <IconEye className="size-4" />
                    {s.watch}
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}

      {!!view?.outgoing.length && (
        <p className="mt-1 text-xs text-parchment-400">
          {s.outgoing}: {view.outgoing.map((f) => f.username).join(', ')}
        </p>
      )}

      <footer className="mt-2 flex justify-between border-t border-bronze-500/20 pt-3 text-xs text-parchment-400">
        <span>{s.onlineCount(onlineCount, friends.length)}</span>
        <span>
          {t.friends.pending} {view?.incoming.length ?? 0}
        </span>
      </footer>
    </>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 flex flex-col">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-brass-200 uppercase">{title}</h3>
      <ul className="flex flex-col divide-y divide-bronze-500/15">{children}</ul>
    </div>
  )
}
