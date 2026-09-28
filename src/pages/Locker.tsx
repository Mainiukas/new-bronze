import { ComingSoon } from '../components/ComingSoon'
import { IconTopHat } from '../components/icons'

export function Locker() {
  return (
    <ComingSoon
      title="Locker"
      empty="Your locker stands empty — win a match to earn your first fittings."
      icon={<IconTopHat />}
      blurb="Outfit your industrialist and choose your player tokens, board trims and banners."
      locked="Your locker belongs to your account: log in so what you collect stays yours."
    />
  )
}
