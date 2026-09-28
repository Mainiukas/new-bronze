import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { I18nContext } from './context'
import en from './en'
import { DEFAULT_LANGUAGE, localeOf, type LanguageCode } from './languages'
import { chosenLanguage, loadMessages, messagesIfLoaded, subscribeLanguage } from './store'

/** Shows the app in the chosen language (Settings → Language); until a newly chosen one has arrived, keeps showing the previous one. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeLanguage, chosenLanguage, chosenLanguage)
  const [shown, setShown] = useState<LanguageCode>(() => (messagesIfLoaded(lang) ? lang : DEFAULT_LANGUAGE))
  useEffect(() => {
    let cancelled = false
    void loadMessages(lang).then((messages) => {
      if (!cancelled) setShown(messages === en ? 'en' : lang)
    })
    return () => {
      cancelled = true
    }
  }, [lang])
  useEffect(() => {
    document.documentElement.lang = shown
  }, [shown])
  const t = messagesIfLoaded(shown) ?? en
  return <I18nContext.Provider value={{ lang: shown, locale: localeOf(shown), t }}>{children}</I18nContext.Provider>
}
