import { ComingSoon } from '../components/ComingSoon'
import { useT } from '../i18n'
import { IconCrate } from '../components/icons'

export function Shop() {
  const t = useT()
  return (
    <ComingSoon
      title={t.pages.shop.title}
      empty={t.pages.shop.empty}
      icon={<IconCrate />}
      blurb={t.pages.shop.blurb}
      locked={t.pages.shop.locked}
    />
  )
}
