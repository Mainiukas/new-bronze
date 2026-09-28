import { IconCheck, IconTrophy } from '../components/icons'
import { LockPill } from '../components/LockPill'
import { PageTitle, Seal } from '../components/theme/Ornaments'
import { ACHIEVEMENTS, type PlayerStats } from '../data/achievements'
import { useAuth } from '../hooks/useAuth'

/** Lifetime stats and achievements: your account's when signed in, this device's as a guest. */
export function Achievements({ stats }: { stats: PlayerStats }) {
  const { signedIn, configured } = useAuth()
  const unlockedCount = ACHIEVEMENTS.filter((a) => stats.unlocked[a.id]).length
  const tiles = [
    { label: 'Matches', value: stats.matches },
    { label: 'Wins', value: stats.wins },
    { label: 'Best score', value: `${stats.bestScore}★` },
    { label: 'Goods shipped', value: stats.goodsShipped },
  ]

  return (
    <section className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col items-center text-center">
        <PageTitle divider className="text-5xl sm:text-6xl">
          Achievements
        </PageTitle>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-bronze-500/25 bg-soot-950/85 px-5 py-2.5 backdrop-blur-[3px]">
          <p className="font-display text-xl font-bold tracking-wide text-parchment-200">
            <span className="eyebrow mr-2 align-middle">Your record</span>
            <span className="text-brass-300">{unlockedCount}</span> / {ACHIEVEMENTS.length} unlocked
          </p>
          <p className="flex flex-wrap items-center justify-center gap-3 text-sm text-parchment-300">
            {signedIn ? (
              'Saved to your account.'
            ) : (
              <>
                Saved on this device only.
                <LockPill label={configured ? 'Log in to save to your account' : 'Log in to use this'} />
              </>
            )}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="plate rivets px-4 py-3">
            <dt className="eyebrow">{tile.label}</dt>
            <dd className="font-display text-3xl font-extrabold text-parchment-50 tabular-nums">{tile.value}</dd>
          </div>
        ))}
      </dl>

      {unlockedCount === 0 && (
        <p className="plate px-5 py-4 text-center font-display text-xl leading-snug font-bold tracking-[0.04em] text-balance text-parchment-50">
          No honours on the wall yet. Your first win awaits.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((achievement) => {
          const date = stats.unlocked[achievement.id]
          const progress = achievement.progress?.(stats)
          return (
            <li
              key={achievement.id}
              className={`relative flex items-center gap-4 rounded-xl border bg-soot-900/90 p-4 backdrop-blur-[3px] ${
                date ? 'border-brass-300/50 bg-linear-to-b from-bronze-500/20 to-transparent' : 'border-bronze-500/20'
              }`}
            >
              {/* The badge, in the brass seal (dimmed until it's earned) */}
              <Seal dim={!date} className={`mx-1.5 ${date ? 'drop-shadow-[0_0_10px_rgb(255_157_77/0.45)]' : ''}`}>
                <span className={`grid size-10 place-items-center ${date ? 'text-brass-300' : 'text-parchment-400'}`}>
                  {date ? <IconCheck className="size-5" strokeWidth={2.6} /> : <IconTrophy className="size-5" />}
                </span>
              </Seal>
              <div className="min-w-0 flex-1">
                <p className={`font-display text-lg font-bold tracking-[0.08em] uppercase ${date ? 'text-parchment-50' : 'text-parchment-300'}`}>
                  {achievement.name}
                </p>
                <p className="text-sm text-parchment-300">{achievement.description}</p>
                {date ? (
                  <p className="mt-1 text-xs text-brass-300">Unlocked {new Date(date).toLocaleDateString()}</p>
                ) : (
                  progress && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soot-700">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-bronze-500 to-ember-400"
                          style={{ width: `${(progress.value / progress.target) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-parchment-400 tabular-nums">
                        {progress.value}/{progress.target}
                      </span>
                    </div>
                  )
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
