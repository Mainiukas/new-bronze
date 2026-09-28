import { Link } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { useOpenAuth } from '../hooks/useOpenAuth'
import { useT } from '../i18n'
import { ACHIEVEMENTS, type AchievementId, type PlayerStats } from '../data/achievements'
import { PATHS } from '../data/navigation'
import { IconBracket, IconLock, IconTrophy } from './icons'
import { VerifyPill } from './VerifyEmail'
import { useAccountAccess } from '../hooks/useAccountAccess'

const cardClass =
  'plate rivets iron group block rounded-xl p-4 transition-[border-color,box-shadow] hover:border-ember-400/60 hover:shadow-[0_0_24px_-8px_rgb(255_122_26/0.55)]'

/** Teaser for the Tournaments page ("Coming soon"). Guests: a lock that opens the log-in screen. */
export function TournamentsCard() {
  const t = useT()
  const { signedIn } = useAuth()
  const access = useAccountAccess()
  const openAuth = useOpenAuth()
  if (!signedIn) {
    return (
      <button type="button" onClick={() => openAuth('login')} className={`${cardClass} w-full text-left`}>
        <span className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full border border-bronze-400/50 bg-soot-950/60 text-2xl text-bronze-300 group-hover:text-ember-300">
            <IconBracket />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">{t.nav.tournaments}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-brass-300/50 bg-soot-950/80 px-2.5 py-1 font-display text-[0.7rem] leading-none font-bold tracking-[0.14em] text-brass-200 uppercase">
              <IconLock className="size-3.5" strokeWidth={2.2} />
              {t.common.logInToUse}
            </span>
          </span>
        </span>
      </button>
    )
  }
  return (
    <Link to={PATHS.tournaments} className={cardClass}>
      <span className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-bronze-400/50 bg-soot-950/60 text-2xl text-bronze-300 group-hover:text-ember-300">
          <IconBracket />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">{t.nav.tournaments}</span>
            {access === 'unverified' ? <VerifyPill /> : <span className="soon-tag">{t.common.comingSoon}</span>}
          </span>
          <span className="block text-sm text-parchment-300">{t.lobby.tournamentsTeaser}</span>
        </span>
      </span>
    </Link>
  )
}

/** Achievements progress: how many are unlocked, and the next one to go for. */
export function AchievementsCard({ stats }: { stats: PlayerStats }) {
  const t = useT()
  const unlocked = ACHIEVEMENTS.filter((a) => stats.unlocked[a.id]).length
  const next = ACHIEVEMENTS.find((a) => !stats.unlocked[a.id])
  const progress = next?.progress?.(stats)
  return (
    <Link to={PATHS.achievements} className={cardClass}>
      <span className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-bronze-400/50 bg-soot-950/60 text-2xl text-bronze-300 group-hover:text-ember-300">
          <IconTrophy />
        </span>
        <span className="flex-1 font-display text-lg font-extrabold tracking-[0.1em] text-parchment-50 uppercase">{t.nav.achievements}</span>
        <span className="font-display text-lg font-bold text-parchment-200 tabular-nums">
          <span className="text-brass-300">{unlocked}</span>/{ACHIEVEMENTS.length}
        </span>
      </span>
      <span
        role="progressbar"
        aria-label={t.lobby.achievementsUnlocked}
        aria-valuemin={0}
        aria-valuemax={ACHIEVEMENTS.length}
        aria-valuenow={unlocked}
        className="mt-3 block h-2 overflow-hidden rounded-full bg-soot-950/80 shadow-[inset_0_1px_2px_rgb(0_0_0/0.7)]"
      >
        <span
          className="block h-full rounded-full bg-linear-to-r from-bronze-500 via-brass-300 to-ember-400"
          style={{ width: `${(unlocked / ACHIEVEMENTS.length) * 100}%` }}
        />
      </span>
      <span className="mt-2.5 block text-sm text-parchment-300">
        {next ? (
          <>
            <span className="text-parchment-400">{t.lobby.next} </span>
            <span className="font-semibold text-parchment-100">{t.achievements.list[next.id as AchievementId].name}</span> · {t.achievements.list[next.id as AchievementId].description}
            {progress && (
              <span className="text-parchment-400 tabular-nums">
                {' '}
                ({progress.value}/{progress.target})
              </span>
            )}
          </>
        ) : (
          t.lobby.allAchievements
        )}
      </span>
    </Link>
  )
}
