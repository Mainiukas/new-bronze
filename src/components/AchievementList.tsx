import { ACHIEVEMENTS, type PlayerStats } from '../data/achievements'
import { useI18n } from '../i18n'
import { IconCheck, IconTrophy } from './icons'
import { Seal } from './theme/Ornaments'

/**
 * Every achievement: unlocked ones in colour with the date, locked ones
 * greyed out with what unlocks them (and progress, where it counts up).
 */
export function AchievementList({ stats, className = '' }: { stats: PlayerStats; className?: string }) {
  const { t, locale } = useI18n()
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {ACHIEVEMENTS.map((achievement) => {
        const date = stats.unlocked[achievement.id]
        const progress = achievement.progress?.(stats)
        const words = t.achievements.list[achievement.id]
        return (
          <li
            key={achievement.id}
            className={`relative flex items-center gap-4 rounded-xl border bg-soot-900/90 p-4 backdrop-blur-[3px] ${
              date ? 'border-brass-300/50 bg-linear-to-b from-bronze-500/20 to-transparent' : 'border-bronze-500/20'
            }`}
          >
            {/* The badge, in the brass seal (greyed out until it's earned) */}
            <Seal dim={!date} className={`mx-1.5 ${date ? 'drop-shadow-[0_0_10px_rgb(255_157_77/0.45)]' : 'grayscale'}`}>
              <span className={`grid size-10 place-items-center ${date ? 'text-brass-300' : 'text-parchment-400'}`}>
                {date ? <IconCheck className="size-5" strokeWidth={2.6} /> : <IconTrophy className="size-5" />}
              </span>
            </Seal>
            <div className="min-w-0 flex-1">
              <p className={`font-display text-lg font-bold tracking-[0.08em] uppercase ${date ? 'text-parchment-50' : 'text-parchment-300'}`}>{words.name}</p>
              <p className="text-sm text-parchment-300">
                {!date && <span className="sr-only">{t.profilePage.requirement} </span>}
                {words.description}
              </p>
              {date ? (
                <p className="mt-1 text-xs text-brass-300">{t.achievements.unlockedOn(new Date(date).toLocaleDateString(locale))}</p>
              ) : (
                progress && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soot-700">
                      <div className="h-full rounded-full bg-linear-to-r from-bronze-500 to-ember-400" style={{ width: `${(progress.value / progress.target) * 100}%` }} />
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
  )
}
