import { Link } from 'react-router'
import { SiteFooter } from '../components/legal/SiteFooter'
import { Logo } from '../components/theme/Logo'
import { PageTitle } from '../components/theme/Ornaments'
import { PageBackground } from '../components/theme/PageBackground'
import { PATHS } from '../data/navigation'

/** Any address Bronze doesn't have: the ironworks, the logo and the way back. */
export function NotFound() {
  return (
    <>
      <PageBackground name="splash" />
      <main id="main-content" tabIndex={-1} className="flex min-h-dvh flex-col px-4 outline-none">
        <div className="flex flex-1 animate-fade-up flex-col items-center justify-center py-10 text-center">
          <Logo variant="stacked" className="w-[200px] md:w-[280px]" />
          <PageTitle className="mt-6 max-w-2xl text-4xl text-balance sm:text-5xl">This line hasn’t been laid yet</PageTitle>
          <p className="mt-4 max-w-md rounded-lg bg-soot-950/70 px-3 py-1.5 text-parchment-200">There’s nothing at this address.</p>
          <Link to={PATHS.mainMenu} replace className="btn-brass mt-8 text-lg">
            Back to the lobby
          </Link>
        </div>
        <div className="mx-auto mb-4 w-full max-w-3xl rounded-xl bg-soot-950/85 px-4 pb-3 backdrop-blur-[3px]">
          <SiteFooter compact />
        </div>
      </main>
    </>
  )
}
