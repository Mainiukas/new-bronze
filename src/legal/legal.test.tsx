import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { CookiePolicy } from '../pages/legal/CookiePolicy'
import { Credits } from '../pages/legal/Credits'
import { DataRequest } from '../pages/legal/DataRequest'
import { LegalNotice } from '../pages/legal/LegalNotice'
import { PrivacyPolicy } from '../pages/legal/PrivacyPolicy'
import { RefundPolicy } from '../pages/legal/RefundPolicy'
import { TermsOfService } from '../pages/legal/TermsOfService'
import { SiteFooter } from '../components/legal/SiteFooter'
import type { LegalText } from '../pages/legal/text/types'
import { FEATURES } from '../lib/features'
import { stripeConfigured } from '../lib/stripe'
import { STORAGE_KEYS } from '../lib/storageKeys'
import checklist from '../../CHECKLIST.md?raw'
import { CONSENT_MAX_AGE_MS, CONSENT_VERSION, createConsentStore, parseConsent } from './consent'
import { ACCOUNT_DATA, AUTH_STORAGE_KEY, RECIPIENTS, STORAGE_ITEMS } from './inventory'
import { formatLegalDate, LEGAL_LAST_UPDATED, OPERATOR, SERVICES, unfilledPlaceholders } from './operator'

/** A localStorage stand-in for the node test environment. */
function fakeStorage() {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    keys: () => [...data.keys()],
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('storage inventory (the Cookie Policy table)', () => {
  it('lists every storage key the app writes, with a purpose and duration', () => {
    for (const key of Object.values(STORAGE_KEYS)) expect(STORAGE_ITEMS.some((i) => i.key === key), key).toBe(true)
    for (const item of STORAGE_ITEMS) {
      expect(item.purpose.length).toBeGreaterThan(10)
      expect(item.duration.length).toBeGreaterThan(3)
    }
    expect(STORAGE_ITEMS.map((i) => i.key)).toContain(AUTH_STORAGE_KEY)
  })

  it('covers every bronze key, cookie and storage call in the source', () => {
    const sources = import.meta.glob<string>('../**/*.{ts,tsx}', { eager: true, query: '?raw', import: 'default' })
    const found = new Set<string>()
    for (const [path, text] of Object.entries(sources)) {
      if (path.endsWith('.test.ts') || path.includes('/legal/inventory')) continue
      for (const m of text.matchAll(/['"`](bronze[._][A-Za-z0-9_.-]*)['"`]/g)) found.add(m[1])
    }
    const listed = (key: string) => STORAGE_ITEMS.some((i) => i.key === key || (i.key.includes('<id>') && key.startsWith(i.key.split('<id>')[0])))
    const missing = [...found].filter((key) => !listed(key))
    expect(missing).toEqual([])
  })
})

describe('switched-off features (VERIFICATION.md)', () => {
  it('lists Stripe in the policies exactly when card verification is on', () => {
    expect(STORAGE_ITEMS.some((item) => item.key.startsWith('__stripe'))).toBe(FEATURES.cardVerification)
    expect(RECIPIENTS.some((r) => r.name.includes('Stripe'))).toBe(FEATURES.cardVerification)
    expect(ACCOUNT_DATA.some((d) => /card/i.test(d.what))).toBe(FEATURES.cardVerification)
    if (!FEATURES.cardVerification) expect(stripeConfigured).toBe(false)
  })

  it('lists the phone number in the policies exactly when phone verification is on', () => {
    expect(ACCOUNT_DATA.some((d) => /phone number/i.test(d.what))).toBe(FEATURES.phoneVerification)
    expect('smsProvider' in SERVICES).toBe(FEATURES.phoneVerification)
  })
})

describe('cookie notice (essential storage only)', () => {
  it('accepts only a current, unexpired record', () => {
    const now = Date.parse('2026-09-27T12:00:00Z')
    const good = { version: CONSENT_VERSION, timestamp: '2026-09-01T10:00:00Z', method: 'notice' }
    expect(parseConsent(good, now)).toEqual(good)
    expect(parseConsent({ ...good, version: 1, method: 'accept-all' }, now)).toBeNull()
    expect(parseConsent({ ...good, timestamp: new Date(now - CONSENT_MAX_AGE_MS - 1000).toISOString() }, now)).toBeNull()
    expect(parseConsent('yes', now)).toBeNull()
  })

  it('shows the notice until OK, then remembers it with its time and version', () => {
    const storage = fakeStorage()
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('localStorage', storage)
    const store = createConsentStore()
    expect(store.getSnapshot().open).toBe(true)
    store.acknowledge(new Date('2026-09-27T09:00:00Z'))
    expect(store.getSnapshot().open).toBe(false)
    expect(JSON.parse(storage.getItem('bronze.consent')!)).toEqual({ version: CONSENT_VERSION, timestamp: '2026-09-27T09:00:00.000Z', method: 'notice' })
    expect(createConsentStore().getSnapshot().open).toBe(false)
  })

  it('needs no choice: settings are saved before the notice is dismissed', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('localStorage', storage)
    const { writeStorage } = await import('../lib/storage')
    writeStorage(STORAGE_KEYS.settings, { sound: false })
    expect(storage.getItem(STORAGE_KEYS.settings)).toBe('{"sound":false}')
  })
})

describe('legal pages', () => {
  const render = (Page: ComponentType) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider backend={null}>
          <Page />
        </AuthProvider>
      </MemoryRouter>,
    )
  const pages: [string, ComponentType][] = [
    ['Privacy Policy', PrivacyPolicy],
    ['Terms of Service', TermsOfService],
    ['Refund Policy', RefundPolicy],
    ['Cookie Policy', CookiePolicy],
    ['Business details', LegalNotice],
    ['Data requests', DataRequest],
    ['Credits', Credits],
  ]

  it.each(pages)('%s has its title and a visible "Last updated" date', (title, Page) => {
    const html = render(Page)
    expect(html).toContain(`>${title}</h1>`)
    expect(html).toContain(`Last updated: <time dateTime="${LEGAL_LAST_UPDATED}">${formatLegalDate(LEGAL_LAST_UPDATED)}</time>`)
    expect(html).not.toMatch(/reviewed by (a )?lawyer|legally reviewed/i)
  })

  it('lists every storage item in the Cookie Policy table', () => {
    const html = render(CookiePolicy)
    for (const item of STORAGE_ITEMS) expect(html).toContain(item.key.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
  })

  it('names the Lithuanian data protection authority and the 30-day answer in the Privacy Policy', () => {
    const html = render(PrivacyPolicy)
    expect(html).toContain('Valstybinė duomenų apsaugos inspekcija')
    expect(html).toMatch(/within 30 days/)
  })

  it('shows placeholders clearly until they are filled in, and CHECKLIST.md lists every one', () => {
    const placeholders = unfilledPlaceholders()
    expect(placeholders).toEqual([...Object.values(OPERATOR), ...Object.values(SERVICES)].filter((v) => v.startsWith('{{')))
    for (const p of placeholders) expect(checklist, p).toContain(p)
    expect(render(LegalNotice)).toContain('Draft:')
  })

  it('puts the fan-made notice in the footer of every page', () => {
    const html = render(() => <SiteFooter />)
    expect(html).toContain('Bronze is a fan-made game inspired by Brass. Not affiliated with Roxley Games.')
    expect(render(() => <SiteFooter compact />)).toContain('Not affiliated with Roxley Games.')
  })

  it('explains online play, Download my data and “Deleted player” in the Privacy Policy, and the fan-made status in the Terms', () => {
    const privacy = render(PrivacyPolicy)
    expect(privacy).toContain('Download my data')
    expect(privacy).toContain('Deleted player')
    expect(privacy).toMatch(/last 2 minutes/)
    expect(render(TermsOfService)).toContain('not affiliated with, or endorsed by, Roxley Games')
    expect(render(CookiePolicy)).not.toMatch(/Accept all|Reject all|Customise/)
  })

  it.each(['lt', 'de', 'fr', 'es'])('has the same pages in %s, with every data row and storage item', async (lang) => {
    const text = (await import(`../pages/legal/text/${lang}.tsx`)).default as LegalText
    expect(text.inventory.account).toHaveLength(ACCOUNT_DATA.length)
    expect(text.inventory.recipients).toHaveLength(RECIPIENTS.length)
    for (const item of STORAGE_ITEMS) expect(text.inventory.storage[item.key], item.key).toBeDefined()
    const privacy = render(text.PrivacyPolicy)
    expect(privacy).toContain('vdai.lrv.lt')
    expect(privacy).toContain('JSON')
    expect(render(text.TermsOfService)).toContain('Roxley Games')
    const cookies = render(text.CookiePolicy)
    for (const item of STORAGE_ITEMS) expect(cookies).toContain(item.key.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
  })
})
