/**
 * The languages Bronze is written in. English is the source; the others are
 * translations of it (src/i18n/<code>.ts) and load when first chosen.
 */

export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-GB' },
  { code: 'lt', label: 'Lietuvių', locale: 'lt-LT' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
  { code: 'es', label: 'Español', locale: 'es-ES' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

export const DEFAULT_LANGUAGE: LanguageCode = 'en'

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value)
}

/** The locale for dates and numbers ("de-DE"). */
export const localeOf = (code: LanguageCode) => LANGUAGES.find((language) => language.code === code)?.locale ?? 'en-GB'

/** The browser's first language that Bronze has, or English. */
export function detectLanguage(preferred: readonly string[] = browserLanguages()): LanguageCode {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0]
    if (isLanguageCode(code)) return code
  }
  return DEFAULT_LANGUAGE
}

function browserLanguages(): readonly string[] {
  try {
    return navigator.languages?.length ? navigator.languages : [navigator.language]
  } catch {
    return []
  }
}

type PluralForms = { one: string; other: string; few?: string; many?: string; two?: string; zero?: string }

/**
 * Picks the plural form a language uses for a number (Lithuanian has three:
 * 1 "raundas", 2–9 "raundai", 10–20 "raundų"). Missing forms fall back to `other`.
 */
export function pluralizer(locale: string) {
  const rules = new Intl.PluralRules(locale)
  return (n: number, forms: PluralForms) => forms[rules.select(n) as keyof PluralForms] ?? forms.other
}
