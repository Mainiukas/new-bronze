import { OnlineProfile } from '../components/profile/OnlineProfile'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { MatchHistoryPage, PublicProfile as PublicProfileData, ReportReason } from '../auth/backend'
import { authErrorMessage } from '../auth/messages'
import { AchievementList } from '../components/AchievementList'
import { FormAlert, Spinner } from '../components/auth/fields'
import { Dialog } from '../components/Dialog'
import { IconCheck, IconShield } from '../components/icons'
import { Avatar } from '../components/ProfileChip'
import { Corners, PageTitle } from '../components/theme/Ornaments'
import { ACHIEVEMENTS } from '../data/achievements'
import { countryFlag, countryName } from '../data/countries'
import { isGameModeId } from '../data/gameModes'
import { MAPS } from '../data/maps'
import { accountPath } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useOpenAuth } from '../hooks/useOpenAuth'
import { useToast } from '../hooks/useToast'
import { useI18n, type Messages } from '../i18n'
import { FEATURES } from '../lib/features'

type Loaded = { state: 'loading' } | { state: 'error'; message: string } | { state: 'missing' } | { state: 'found'; profile: PublicProfileData }

const mapName = (id: string | null) => (id ? (MAPS.find((map) => map.id === id)?.name ?? id) : null)
const modeName = (t: Messages, id: string | null) => (id && isGameModeId(id) ? t.modes[id].name : id)

/**
 * A player's profile (/u/:username): avatar, name, country, bio and badges,
 * their record and figures from their match history, recent matches and
 * achievements, as far as their privacy settings allow. Old names (changed
 * in the last 30 days) redirect to the new one.
 */
export function PublicProfile() {
  const { t, locale } = useI18n()
  const p = t.profilePage
  const auth = useAuth()
  const navigate = useNavigate()
  const { username = '' } = useParams()
  // What was loaded, for which name: another name shows as loading until its answer arrives.
  const [result, setResult] = useState<{ name: string; loaded: Loaded }>({ name: '', loaded: { state: 'loading' } })
  const loaded: Loaded = result.name === username ? result.loaded : { state: 'loading' }
  const [reporting, setReporting] = useState(false)
  const { getPublicProfile, configured } = auth
  // Reload when the viewer's own profile changes (e.g. after editing it).
  const ownVersion = auth.profile ? `${auth.profile.username}:${auth.profile.avatarUrl}:${auth.profile.stats.matches}` : ''

  useEffect(() => {
    if (!configured) return
    let alive = true
    getPublicProfile(username).then(
      (answer) => {
        if (!alive) return
        if (answer.kind === 'renamed') navigate(`/u/${encodeURIComponent(answer.username)}`, { replace: true })
        else setResult({ name: username, loaded: answer.kind === 'missing' ? { state: 'missing' } : { state: 'found', profile: answer.profile } })
      },
      (error) => alive && setResult({ name: username, loaded: { state: 'error', message: authErrorMessage(error, t.authErrors) } }),
    )
    return () => {
      alive = false
    }
  }, [username, configured, getPublicProfile, navigate, t.authErrors, ownVersion])

  if (!configured) return <Notice title={p.notFound}>{t.auth.notConfigured}</Notice>
  if (loaded.state === 'loading')
    return (
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-20 text-parchment-300" role="status">
        <Spinner /> {p.loading}
      </p>
    )
  if (loaded.state === 'error') return <Notice title={p.loadFailed}>{loaded.message}</Notice>
  if (loaded.state === 'missing') return <Notice title={p.notFound}>{p.notFoundBody}</Notice>

  const profile = loaded.profile
  const since = profile.createdAt ? new Date(profile.createdAt) : null
  // Phone and card verification may be switched off (lib/features.ts): no badges then.
  const cardBadge = FEATURES.cardVerification && profile.cardVerified
  const phoneBadge = FEATURES.phoneVerification && profile.phoneVerified
  const canReport = !profile.isSelf

  return (
    <section className="mx-auto flex max-w-5xl animate-fade-up flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      {/* Who they are */}
      <header className="plate rivets iron relative flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:items-start sm:p-8 sm:text-left">
        <Corners />
        <Avatar name={profile.username} url={profile.avatarUrl} className="size-24 text-5xl" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <PageTitle className="text-4xl break-all sm:text-5xl">{profile.username}</PageTitle>
          {profile.private ? (
            <div className="text-parchment-300">
              <p className="font-display text-lg font-bold tracking-[0.08em] text-parchment-100 uppercase">{p.privateTitle}</p>
              <p className="text-sm">{p.privateBody}</p>
            </div>
          ) : (
            <>
              <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-parchment-300 sm:justify-start">
                {profile.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="text-lg leading-none">
                      {countryFlag(profile.country)}
                    </span>
                    {p.from(countryName(profile.country, locale))}
                  </span>
                )}
                {since && !Number.isNaN(since.getTime()) && <span>{p.memberSince(since.toLocaleDateString(locale, { month: 'long', year: 'numeric' }))}</span>}
              </p>
              {(cardBadge || phoneBadge) && (
                <p className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {cardBadge && <Badge icon={<IconShield className="size-3.5" />}>{p.cardVerified}</Badge>}
                  {phoneBadge && <Badge icon={<IconCheck className="size-3.5" strokeWidth={2.6} />}>{p.phoneVerified}</Badge>}
                </p>
              )}
              {profile.bio && <p className="max-w-prose text-parchment-100 [overflow-wrap:anywhere]">{profile.bio}</p>}
            </>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            {profile.isSelf && (
              <Link to={accountPath('profile')} className="btn btn-ghost">
                {p.editProfile}
              </Link>
            )}
            {canReport && (
              <button type="button" className="btn btn-ghost text-sm text-parchment-300" onClick={() => setReporting(true)}>
                {p.report.button}
              </button>
            )}
          </div>
        </div>
      </header>

      <OnlineProfile username={profile.username} />

      {!profile.private && profile.stats && <StatsGrid profile={profile} />}

      {!profile.private && (
        <section aria-labelledby="recent-matches" className="flex flex-col gap-3">
          <h2 id="recent-matches" className="eyebrow">
            {p.recentMatches}
          </h2>
          {profile.historyVisible ? <MatchHistory username={profile.username} /> : <p className="plate px-5 py-4 text-parchment-300">{p.historyHidden}</p>}
        </section>
      )}

      {!profile.private && profile.stats && (
        <section aria-labelledby="profile-achievements" className="flex flex-col gap-3">
          <h2 id="profile-achievements" className="eyebrow flex flex-wrap items-baseline gap-3">
            {p.achievements}
            <span className="text-parchment-300 normal-case">
              {p.achievementsCount(ACHIEVEMENTS.filter((a) => profile.stats?.unlocked[a.id]).length, ACHIEVEMENTS.length)}
            </span>
          </h2>
          <AchievementList stats={profile.stats} />
        </section>
      )}

      {canReport && <ReportDialog open={reporting} username={profile.username} onClose={() => setReporting(false)} />}
    </section>
  )
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <section className="mx-auto flex max-w-xl animate-fade-up flex-col items-center gap-3 px-4 py-16 text-center">
      <PageTitle className="text-4xl">{title}</PageTitle>
      <p className="text-parchment-200">{children}</p>
    </section>
  )
}

function Badge({ icon, children }: { icon: React.ReactNode; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-verdigris-400/50 bg-verdigris-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-verdigris-300">
      {icon}
      {children}
    </span>
  )
}

function StatsGrid({ profile }: { profile: PublicProfileData }) {
  const { t, locale } = useI18n()
  const p = t.profilePage
  const stats = profile.stats!
  const summary = profile.summary
  const number = (value: number) => value.toLocaleString(locale)
  const tiles: { label: string; value: string }[] = [
    { label: p.stats.matches, value: number(stats.matches) },
    { label: p.stats.wins, value: number(stats.wins) },
    {
      label: p.stats.winRate,
      value: stats.matches ? (stats.wins / stats.matches).toLocaleString(locale, { style: 'percent', maximumFractionDigits: 0 }) : p.none,
    },
    { label: p.stats.bestScore, value: `${number(stats.bestScore)}★` },
    {
      label: p.stats.averageScore,
      value: summary?.averageScore !== null && summary?.averageScore !== undefined ? summary.averageScore.toLocaleString(locale, { maximumFractionDigits: 1 }) : p.none,
    },
    { label: p.stats.goodsShipped, value: number(stats.goodsShipped) },
    { label: p.stats.links, value: summary ? number(summary.links) : p.none },
    { label: p.stats.industries, value: summary ? number(summary.industries) : p.none },
    { label: p.stats.favouriteMode, value: modeName(t, summary?.favouriteMode ?? null) ?? p.none },
    { label: p.stats.favouriteMap, value: mapName(summary?.favouriteMap ?? null) ?? p.none },
  ]
  return (
    <section aria-label={t.nav.achievements} className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="plate rivets iron px-4 py-3">
            <dt className="eyebrow">{tile.label}</dt>
            <dd className="font-display text-2xl leading-tight font-extrabold text-parchment-50 tabular-nums [overflow-wrap:anywhere]">{tile.value}</dd>
          </div>
        ))}
      </dl>
      {summary && summary.recordedMatches > 0 && <p className="text-xs text-parchment-400">{p.fromHistory(summary.recordedMatches)}</p>}
    </section>
  )
}

/** The last 20 matches, 10 to a page. */
function MatchHistory({ username }: { username: string }) {
  const { t, locale } = useI18n()
  const p = t.profilePage
  const { getMatchHistory } = useAuth()
  const [page, setPage] = useState(0)
  const key = `${username}|${page}`
  const [loaded, setLoaded] = useState<{ key: string; data: MatchHistoryPage | null | 'error' } | null>(null)
  const data = loaded?.key === key ? loaded.data : 'loading'

  useEffect(() => {
    let alive = true
    getMatchHistory(username, page).then(
      (result) => alive && setLoaded({ key: `${username}|${page}`, data: result }),
      () => alive && setLoaded({ key: `${username}|${page}`, data: 'error' }),
    )
    return () => {
      alive = false
    }
  }, [username, page, getMatchHistory])

  if (data === 'loading')
    return (
      <p className="flex items-center gap-3 text-parchment-300" role="status">
        <Spinner /> {p.loading}
      </p>
    )
  if (data === 'error') return <FormAlert message={p.loadFailed} />
  if (!data) return <p className="plate px-5 py-4 text-parchment-300">{p.historyHidden}</p>
  if (data.total === 0) return <p className="plate px-5 py-4 text-parchment-300">{p.noMatches}</p>

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return (
    <div className="plate overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="border-b border-bronze-500/25 bg-soot-950/60">
            <tr>
              {Object.values(p.columns).map((column) => (
                <th key={column} scope="col" className="px-4 py-2.5 font-display text-xs font-bold tracking-[0.12em] text-parchment-300 uppercase">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((match, index) => (
              <tr key={`${match.finishedAt}-${index}`} className="border-b border-bronze-500/10 last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-parchment-200">{new Date(match.finishedAt).toLocaleDateString(locale, { dateStyle: 'medium' })}</td>
                <td className="px-4 py-2.5 text-parchment-100">{mapName(match.mapId) ?? p.none}</td>
                <td className="px-4 py-2.5 text-parchment-200">{modeName(t, match.modeId) ?? p.none}</td>
                <td className="px-4 py-2.5 text-parchment-200 tabular-nums">{match.players ?? p.none}</td>
                <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${match.won ? 'text-brass-300' : 'text-parchment-200'}`}>
                  {match.placement ? p.placement(match.placement, match.players) : p.none}
                </td>
                <td className="px-4 py-2.5 font-semibold text-parchment-50 tabular-nums">{match.score}★</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-between gap-3 border-t border-bronze-500/25 px-4 py-2" aria-label={p.recentMatches}>
          <button type="button" className="btn btn-ghost min-h-10 text-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            ← {p.newer}
          </button>
          <span className="text-sm text-parchment-300 tabular-nums">{p.page(page + 1, pages)}</span>
          <button type="button" className="btn btn-ghost min-h-10 text-sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
            {p.older} →
          </button>
        </nav>
      )}
    </div>
  )
}

const REASONS: ReportReason[] = ['cheating', 'offensive-name', 'harassment', 'spam', 'other']

function ReportDialog({ open, username, onClose }: { open: boolean; username: string; onClose: () => void }) {
  const t = useI18n().t
  const r = t.profilePage.report
  const auth = useAuth()
  const notify = useToast()
  const openAuth = useOpenAuth()
  const [reason, setReason] = useState<ReportReason>('cheating')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const detailsId = useId()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await auth.reportUser(username, reason, details)
      notify(r.sent)
      setDetails('')
      onClose()
    } catch (failure) {
      setError(authErrorMessage(failure, t.authErrors))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <form className="plate rivets flex flex-col gap-4 bg-soot-900/95 p-5 sm:p-6" onSubmit={(event) => void submit(event)}>
        <h2 id={titleId} className="font-display text-2xl font-extrabold tracking-[0.1em] text-parchment-50 uppercase">
          {r.title(username)}
        </h2>
        {!auth.signedIn ? (
          <>
            <p className="text-parchment-200">{r.logIn}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t.common.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose()
                  openAuth('login')
                }}
              >
                {t.common.logIn}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-parchment-300">{r.intro}</p>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1.5 font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">{r.reason}</legend>
              {REASONS.map((value) => (
                <label key={value} className="flex min-h-10 cursor-pointer items-center gap-3 text-parchment-100">
                  <input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-bronze-400" />
                  {r.reasons[value]}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor={detailsId} className="mb-1.5 block font-display text-sm font-bold tracking-[0.12em] text-parchment-200 uppercase">
                {r.details}
              </label>
              <textarea
                id={detailsId}
                value={details}
                maxLength={500}
                rows={3}
                onChange={(event) => setDetails(event.target.value)}
                className="w-full rounded-lg border border-bronze-500/35 bg-soot-950/75 px-3.5 py-2.5 text-parchment-50 outline-none focus:border-ember-400/80"
              />
            </div>
            <FormAlert message={error} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t.common.cancel}
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy} aria-busy={busy || undefined}>
                {busy && <Spinner className="size-4" />}
                {r.send}
              </button>
            </div>
          </>
        )}
      </form>
    </Dialog>
  )
}
