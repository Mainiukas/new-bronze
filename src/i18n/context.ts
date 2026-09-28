import { createContext, useContext } from 'react'
import en from './en'
import { DEFAULT_LANGUAGE, localeOf, type LanguageCode } from './languages'
import type { Messages } from './messages'

export interface I18nValue {
  lang: LanguageCode
  /** "de-DE": for dates and numbers. */
  locale: string
  t: Messages
}

/** English until an I18nProvider says otherwise (also in tests that render a single component). */
export const I18nContext = createContext<I18nValue>({ lang: DEFAULT_LANGUAGE, locale: localeOf(DEFAULT_LANGUAGE), t: en })

/** The words for the current language: `t.nav.play`, `t.match.roundOf(3, 10)`. */
export const useT = () => useContext(I18nContext).t

/** The current language, its locale, and its words. */
export const useI18n = () => useContext(I18nContext)
