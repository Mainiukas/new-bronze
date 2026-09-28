/**
 * Who runs Bronze, and the other facts the legal pages need. Everything in
 * {{DOUBLE_BRACES}} is a placeholder for the operator to fill in (listed in
 * CHECKLIST.md). Pages show a "Draft" notice while any are left.
 */

export const OPERATOR = {
  /** Legal name of the person or company running Bronze. */
  name: '{{OPERATOR_NAME}}',
  /** e.g. "UAB" (private limited company) or "individual activity". */
  legalForm: '{{OPERATOR_LEGAL_FORM}}',
  address: '{{OPERATOR_ADDRESS}}',
  email: '{{OPERATOR_EMAIL}}',
  /** Company code in the Register of Legal Entities (juridinio asmens kodas), if a company. */
  companyNumber: '{{COMPANY_NUMBER}}',
  /** VAT payer code (PVM mokėtojo kodas), if registered for VAT. */
  vatNumber: '{{VAT_NUMBER}}',
  /** The address Bronze is published at. */
  siteUrl: '{{SITE_URL}}',
} as const

export const SERVICES = {
  /** Where the website's files are hosted (e.g. GitHub Pages, Netlify). */
  hosting: '{{HOSTING_PROVIDER}}',
  /** How long the hosting provider keeps its access logs (IP addresses). */
  hostingLogRetention: '{{HOSTING_LOG_RETENTION}}',
  /** The Supabase project's region (e.g. "EU (Frankfurt)"). */
  supabaseRegion: '{{SUPABASE_REGION}}',
  /** Who sends account emails: Supabase's built-in mailer or your SMTP provider. */
  emailProvider: '{{EMAIL_PROVIDER}}',
  /** Who sends phone verification codes by SMS (e.g. "Twilio Ireland Limited"), or "Not used" if phone verification isn't set up. */
  smsProvider: '{{SMS_PROVIDER}}',
  /** How long Supabase keeps database backups for this project. */
  backupRetention: '{{BACKUP_RETENTION}}',
  /** How long Supabase keeps its sign-in (auth audit) logs. */
  authLogRetention: '{{AUTH_LOG_RETENTION}}',
  /** How data leaving the EEA is protected (e.g. Standard Contractual Clauses in the Supabase DPA). */
  transferSafeguards: '{{TRANSFER_SAFEGUARDS}}',
} as const

/** Shown as "Last updated" on every legal page. Change it whenever a text changes. */
export const LEGAL_LAST_UPDATED = '2026-09-28'

/** Version of the Terms and Privacy Policy that people accept. Bump it when either changes materially. */
export const TERMS_VERSION = '2026-09-28'

/** The EU/Lithuanian age of digital consent (GDPR art. 8, as set in Lithuania): younger players can't have an account. */
export const MIN_ACCOUNT_AGE = 14

export const isPlaceholder = (value: string) => /\{\{[A-Z0-9_]+\}\}/.test(value)

/** Every placeholder still waiting to be filled in. */
export function unfilledPlaceholders(): string[] {
  return [...Object.values(OPERATOR), ...Object.values(SERVICES)].filter(isPlaceholder)
}

export const formatLegalDate = (iso: string, locale = 'en-GB') =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
