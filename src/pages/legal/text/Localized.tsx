import type { ComponentType } from 'react'
import { useLegalText } from './load'
import type { LegalPageName } from './types'

/** A legal page in the current language: the translation, or the English original. */
export function Localized({ page, english: English }: { page: LegalPageName; english: ComponentType }) {
  const text = useLegalText()
  const Page = text?.[page] ?? English
  return <Page />
}
