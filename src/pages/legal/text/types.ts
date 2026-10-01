import type { ComponentType, ReactNode } from 'react'
import type { EmailList } from '../../../auth/backend'
import type { DataItem, Recipient, StorageItem } from '../../../legal/inventory'

/*
 * The legal pages in one language other than English (English is the pages
 * themselves, and the text that prevails). Each language's file is fetched
 * only when a legal page is opened in it.
 */

/** Everything the Cookie and Privacy Policies list, in this language (same items and order as legal/inventory.ts). */
export interface InventoryText {
  /** Storage key → its type, provider, purpose and duration. */
  storage: Record<string, Pick<StorageItem, 'purpose' | 'duration'> & { where: string; provider: string }>
  account: DataItem[]
  visitor: DataItem[]
  recipients: Recipient[]
}

export interface DataRequestWords {
  title: string
  intro: ReactNode
  howTitle: string
  how: ReactNode[]
  /** "Your rights are explained in the Privacy Policy." */
  rights: (privacyPolicy: ReactNode) => ReactNode
  formTitle: string
  formIntro: (email: ReactNode) => ReactNode
  noAddress: string
  what: string
  requests: Record<'access' | 'erasure' | 'rectification' | 'objection' | 'other', string>
  email: string
  emailError: string
  username: string
  details: string
  submit: string
  /** The email written for the player to send. */
  subject: (request: string) => string
  body: (request: string, email: string, username: string, details: string) => string
  notGiven: string
}

export interface UnsubscribeWords {
  title: string
  lists: Record<EmailList | 'all', string>
  done: string
  working: string
  failed: string
  doneBody: (list: string) => string
  workingBody: string
  notFoundBody: string
  failedBody: string
  unavailableBody: string
  more: (link: ReactNode) => ReactNode
  dataRequests: string
}

export interface LegalText {
  inventory: InventoryText
  PrivacyPolicy: ComponentType
  TermsOfService: ComponentType
  RefundPolicy: ComponentType
  CookiePolicy: ComponentType
  LegalNotice: ComponentType
  Credits: ComponentType
  dataRequest: DataRequestWords
  unsubscribe: UnsubscribeWords
}

export type LegalPageName = 'PrivacyPolicy' | 'TermsOfService' | 'RefundPolicy' | 'CookiePolicy' | 'LegalNotice' | 'Credits'
