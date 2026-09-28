import en from './en'
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages'
import type { Messages } from './messages'

/*
 * Which language is chosen, and each language's words. English is bundled;
 * the other catalogues are split out and fetched the first time they're
 * needed (main.tsx waits for the starting one, so a German visitor never
 * sees an English first frame).
 */

const loaders: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: Messages }>> = {
  lt: () => import('./lt'),
  de: () => import('./de'),
  fr: () => import('./fr'),
  es: () => import('./es'),
}

const loaded: Partial<Record<LanguageCode, Messages>> = { en }

/** A language's words, if they have been fetched. */
export const messagesIfLoaded = (code: LanguageCode): Messages | undefined => loaded[code]

/** Fetch a language's words (English: at once). Falls back to English if the file can't be fetched. */
export async function loadMessages(code: LanguageCode): Promise<Messages> {
  const ready = loaded[code]
  if (ready) return ready
  try {
    const module = await loaders[code as Exclude<LanguageCode, 'en'>]()
    loaded[code] = module.default
    return module.default
  } catch {
    return en
  }
}

/* The chosen language: set from the settings (App.tsx), read by the provider above everything. */
let chosen: LanguageCode = DEFAULT_LANGUAGE
const listeners = new Set<() => void>()

/** Switch the app to a language (its words load first if needed). */
export function setLanguage(code: LanguageCode) {
  if (code === chosen) return
  chosen = code
  for (const listener of listeners) listener()
}

export const chosenLanguage = () => chosen

export const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
