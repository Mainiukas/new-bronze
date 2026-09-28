import { ComingSoon } from '../components/ComingSoon'
import { IconCrate } from '../components/icons'

export function Shop() {
  return (
    <ComingSoon
      title="Shop"
      empty="The shelves are being restocked."
      icon={<IconCrate />}
      blurb="Cosmetic boards, building skins and token sets, delivered fresh from the foundry."
      locked="Purchases are tied to your account: log in to buy and keep them."
    />
  )
}
