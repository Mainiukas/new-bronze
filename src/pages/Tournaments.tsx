import { ComingSoon } from '../components/ComingSoon'
import { IconBracket } from '../components/icons'

export function Tournaments() {
  return (
    <ComingSoon
      title="Tournaments"
      empty="The Exhibition hall is quiet. Check back soon."
      icon={<IconBracket />}
      blurb="Ranked brackets and seasonal cups for the most ambitious industrialists."
      locked="Tournaments are played under your account: log in to enter."
    />
  )
}
