import { useNavigate } from 'react-router'
import { authErrorMessage } from '../auth/messages'
import { PATHS } from '../data/navigation'
import { useT } from '../i18n'
import { useAuth } from './useAuth'
import { useToast } from './useToast'

/** Sign out on this browser, back to the lobby as a guest, with a toast. */
export function useLogOut() {
  const t = useT()
  const auth = useAuth()
  const notify = useToast()
  const navigate = useNavigate()
  return async () => {
    try {
      await auth.logOut()
      navigate(PATHS.mainMenu)
      notify(t.auth.loggedOut)
    } catch (error) {
      notify(authErrorMessage(error, t.authErrors))
    }
  }
}
