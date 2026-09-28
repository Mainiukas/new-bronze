import { useAuth } from '../hooks/useAuth'
import { IconUserPlus, IconUsers } from './icons'
import { LockPill } from './LockPill'

/**
 * The lobby's friends panel. Guests see a lock (log in to use it). Signed in,
 * friends still need a friends and presence server Bronze doesn't have yet,
 * so adding friends stays disabled and the panel says why: no friend list,
 * no requests, and no online count (it would be made up).
 */
export function FriendsPanel() {
  const { signedIn } = useAuth()
  return (
    <section aria-labelledby="friends-title" className="plate rivets iron flex flex-col p-4">
      <header className="flex items-center gap-2.5">
        <IconUsers className="size-5 text-bronze-300" />
        <h2 id="friends-title" className="flex-1 font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          Friends
        </h2>
        {signedIn ? <span className="soon-tag">Coming soon</span> : <LockPill />}
      </header>

      <form className="mt-3 flex gap-2" onSubmit={(event) => event.preventDefault()} aria-describedby="friends-status">
        <label htmlFor="add-friend" className="sr-only">
          Add friend by username
        </label>
        <input
          id="add-friend"
          type="text"
          disabled
          placeholder="Add friend by username"
          className="min-h-11 min-w-0 flex-1 cursor-not-allowed rounded-lg border border-bronze-500/25 bg-soot-950/60 px-3 text-sm text-parchment-50 opacity-60 outline-none placeholder:text-parchment-400"
        />
        <button type="submit" disabled className="btn btn-ghost min-h-11 px-3" aria-label="Add friend">
          <IconUserPlus className="size-5" />
        </button>
      </form>

      <div className="flex flex-col items-center px-2 py-6 text-center">
        <span className="mb-3 grid size-16 place-items-center rounded-full border border-dashed border-bronze-500/40 bg-soot-950/50">
          <IconUsers className="size-8 text-bronze-400/70" />
        </span>
        <p className="font-display text-base font-bold tracking-[0.1em] text-parchment-100 uppercase">No friends yet</p>
        <p id="friends-status" className="mt-1.5 text-sm leading-relaxed text-parchment-300">
          {signedIn
            ? 'Friend lists and online matches need a game server, and Bronze doesn’t have one yet. Until then, play the computer, or pass & play on this device.'
            : 'Log in to add friends. Until then, play the computer, or pass & play on this device.'}
        </p>
      </div>

      {/* No server, so no numbers: a dash, never a made-up count. */}
      <footer className="flex justify-between border-t border-bronze-500/20 pt-3 text-xs text-parchment-400">
        <span>
          Online <span aria-hidden="true">—</span>
          <span className="sr-only">not available</span>
        </span>
        <span>
          Pending <span aria-hidden="true">—</span>
          <span className="sr-only">not available</span>
        </span>
      </footer>
    </section>
  )
}
