import { Link } from 'react-router'
import { LockedNotice } from '../components/LockPill'
import { ProfileAvatar, type LobbyProfile } from '../components/ProfileChip'
import { ACHIEVEMENTS, type PlayerStats } from '../data/achievements'
import { PATHS } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useLogOut } from '../hooks/useLogOut'

/** The signed-in player's account: who they are, their record, and Log out. */
export function Profile({ profile, stats, onOpenSettings }: { profile: LobbyProfile | null; stats: PlayerStats; onOpenSettings: () => void }) {
  const auth = useAuth()
  const logOut = useLogOut()

  if (!profile || !auth.profile) {
    return (
      <section className="mx-auto max-w-2xl animate-fade-up px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="page-title text-center text-5xl">Profile</h1>
        <LockedNotice>Your profile keeps your username, record and achievements with your account, on any device.</LockedNotice>
      </section>
    )
  }

  const unlocked = ACHIEVEMENTS.filter((a) => stats.unlocked[a.id]).length
  const tiles = [
    { label: 'Matches', value: stats.matches },
    { label: 'Wins', value: stats.wins },
    { label: 'Best score', value: `${stats.bestScore}★` },
    { label: 'Achievements', value: `${unlocked}/${ACHIEVEMENTS.length}` },
  ]
  const since = new Date(auth.profile.createdAt)

  return (
    <section className="mx-auto flex max-w-3xl animate-fade-up flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <div className="plate rivets iron flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <ProfileAvatar profile={profile} className="size-20 text-4xl" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Profile</p>
          <h1 className="truncate font-display text-4xl font-extrabold tracking-[0.08em] text-parchment-50">{profile.name}</h1>
          <p className="truncate text-sm text-parchment-300">{auth.user?.email}</p>
          {!Number.isNaN(since.getTime()) && <p className="text-xs text-parchment-400">Member since {since.toLocaleDateString()}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="plate rivets iron px-4 py-3">
            <dt className="eyebrow">{tile.label}</dt>
            <dd className="font-display text-3xl font-extrabold text-parchment-50 tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap gap-3">
        <Link to={PATHS.achievements} className="btn btn-ghost">
          Achievements
        </Link>
        <button type="button" className="btn btn-ghost" onClick={onOpenSettings}>
          Settings
        </button>
        <button type="button" className="btn btn-ghost border-rust-400/50 text-rust-300 hover:border-rust-300 hover:text-rust-300" onClick={() => void logOut()}>
          Log out
        </button>
      </div>
    </section>
  )
}
