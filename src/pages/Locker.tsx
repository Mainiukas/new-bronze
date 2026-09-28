import { ComingSoon } from '../components/ComingSoon'
import { useT } from '../i18n'
import { IconTopHat } from '../components/icons'

export function Locker() {
  const t = useT()
  return (
    <ComingSoon
      title={t.pages.locker.title}
      empty={t.pages.locker.empty}
      icon={<IconTopHat />}
      blurb={t.pages.locker.blurb}
      locked={t.pages.locker.locked}
    />
  )
}
