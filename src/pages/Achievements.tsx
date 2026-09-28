import { AchievementList } from '../components/AchievementList'
import { LockPill } from '../components/LockPill'
import { PageTitle } from '../components/theme/Ornaments'
import { ACHIEVEMENTS, type PlayerStats } from '../data/achievements'
import { useAuth } from '../hooks/useAuth'
import { useI18n } from '../i18n'

/** Lifetime stats and achievements: your account's when signed in, this device's as a guest. */
export function Achievements({ stats }: { stats: PlayerStats }) {
  const { t } = useI18n()
  const { signedIn, configured } = useAuth()
  const unlockedCount = ACHIEVEMENTS.filter((a) => stats.unlocked[a.id]).length
  const tiles = [
    { label: t.stats.matches, value: stats.matches },
    { label: t.stats.wins, value: stats.wins },
    { label: t.stats.bestScore, value: `${stats.bestScore}★` },
    { label: t.stats.goodsShipped, value: stats.goodsShipped },
  ]

  return (
    <section className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col items-center text-center">
        <PageTitle divider className="text-5xl sm:text-6xl">
          {t.nav.achievements}
        </PageTitle>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-2xl border border-bronze-500/25 bg-soot-950/85 px-5 py-2.5 backdrop-blur-[3px]">
          <p className="font-display text-xl font-bold tracking-wide text-parchment-200">
            <span className="eyebrow mr-2 align-middle">{t.achievements.yourRecord}</span>
            <span className="text-brass-300">{unlockedCount}</span> / {t.achievements.unlocked(ACHIEVEMENTS.length)}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-3 text-sm text-parchment-300">
            {signedIn ? (
              t.achievements.savedAccount
            ) : (
              <>
                {t.achievements.savedDevice}
                <LockPill label={configured ? t.achievements.logInToSave : t.common.logInToUse} />
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
          {t.pages.achievements.empty}
        </p>
      )}

      <AchievementList stats={stats} />
    </section>
  )
}
