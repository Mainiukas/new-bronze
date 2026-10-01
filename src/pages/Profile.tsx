import { Navigate } from 'react-router'
import { LockedNotice } from '../components/LockPill'
import { profilePath } from '../data/navigation'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'

/** /profile: your own profile page (/u/<your username>); guests see what an account is for. */
export function Profile() {
  const t = useT()
  const auth = useAuth()
  if (auth.signedIn && auth.profile) return <Navigate to={profilePath(auth.profile.username)} replace />
  return (
    <section className="mx-auto max-w-2xl animate-fade-up px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="page-title text-center text-5xl">{t.nav.profile}</h1>
      <LockedNotice>{t.profile.locked}</LockedNotice>
    </section>
  )
}
