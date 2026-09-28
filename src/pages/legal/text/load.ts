import { use } from 'react'
import { useI18n, type LanguageCode } from '../../../i18n'
import type { LegalText } from './types'

const loaders: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: LegalText }>> = {
  lt: () => import('./lt'),
  de: () => import('./de'),
  fr: () => import('./fr'),
  es: () => import('./es'),
}

const cache = new Map<LanguageCode, Promise<LegalText>>()

/**
 * The legal text in the current language, or null for English (the pages
 * themselves). Suspends while a language's file is fetched (the legal routes
 * sit in a Suspense boundary).
 */
export function useLegalText(): LegalText | null {
  const { lang } = useI18n()
  if (lang === 'en') return null
  let promise = cache.get(lang)
  if (!promise) {
    promise = loaders[lang]().then((module) => module.default)
    cache.set(lang, promise)
  }
  return use(promise)
}
