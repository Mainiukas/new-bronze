import { ComingSoon } from '../components/ComingSoon'
import { useT } from '../i18n'
import { IconBracket } from '../components/icons'

export function Tournaments() {
  const t = useT()
  return (
    <ComingSoon
      title={t.pages.tournaments.title}
      empty={t.pages.tournaments.empty}
      icon={<IconBracket />}
      blurb={t.pages.tournaments.blurb}
      needsVerifiedEmail
      locked={t.pages.tournaments.locked}
    />
  )
}
