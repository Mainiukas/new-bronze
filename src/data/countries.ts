/**
 * Countries: ISO 3166-1 alpha-2 codes with their international dialling
 * codes, for the profile's country (optional) and the phone-number field.
 * Names come from the browser in the player's language (Intl.DisplayNames).
 */

/** "LT370" = Lithuania, +370. */
const RAW =
  'AD376 AE971 AF93 AG1 AI1 AL355 AM374 AO244 AR54 AS1 AT43 AU61 AW297 AX358 AZ994 BA387 BB1 BD880 BE32 BF226 BG359 BH973 BI257 BJ229 ' +
  'BL590 BM1 BN673 BO591 BQ599 BR55 BS1 BT975 BW267 BY375 BZ501 CA1 CD243 CF236 CG242 CH41 CI225 CK682 CL56 CM237 CN86 CO57 CR506 CU53 ' +
  'CV238 CW599 CY357 CZ420 DE49 DJ253 DK45 DM1 DO1 DZ213 EC593 EE372 EG20 ER291 ES34 ET251 FI358 FJ679 FK500 FM691 FO298 FR33 GA241 GB44 ' +
  'GD1 GE995 GF594 GG44 GH233 GI350 GL299 GM220 GN224 GP590 GQ240 GR30 GT502 GU1 GW245 GY592 HK852 HN504 HR385 HT509 HU36 ID62 IE353 IL972 ' +
  'IM44 IN91 IQ964 IR98 IS354 IT39 JE44 JM1 JO962 JP81 KE254 KG996 KH855 KI686 KM269 KN1 KP850 KR82 KW965 KY1 KZ7 LA856 LB961 LC1 LI423 ' +
  'LK94 LR231 LS266 LT370 LU352 LV371 LY218 MA212 MC377 MD373 ME382 MF590 MG261 MH692 MK389 ML223 MM95 MN976 MO853 MP1 MQ596 MR222 MS1 ' +
  'MT356 MU230 MV960 MW265 MX52 MY60 MZ258 NA264 NC687 NE227 NG234 NI505 NL31 NO47 NP977 NR674 NU683 NZ64 OM968 PA507 PE51 PF689 PG675 ' +
  'PH63 PK92 PL48 PM508 PR1 PS970 PT351 PW680 PY595 QA974 RE262 RO40 RS381 RU7 RW250 SA966 SB677 SC248 SD249 SE46 SG65 SH290 SI386 SK421 ' +
  'SL232 SM378 SN221 SO252 SR597 SS211 ST239 SV503 SX1 SY963 SZ268 TC1 TD235 TG228 TH66 TJ992 TL670 TM993 TN216 TO676 TR90 TT1 TV688 TW886 ' +
  'TZ255 UA380 UG256 US1 UY598 UZ998 VA39 VC1 VE58 VG1 VI1 VN84 VU678 WF681 WS685 XK383 YE967 YT262 ZA27 ZM260 ZW263'

export interface Country {
  /** ISO 3166-1 alpha-2, e.g. 'LT'. */
  code: string
  /** International dialling code without +, e.g. '370'. */
  dial: string
}

export const COUNTRIES: readonly Country[] = RAW.split(' ').map((entry) => ({ code: entry.slice(0, 2), dial: entry.slice(2) }))

export const DEFAULT_PHONE_COUNTRY = 'LT'

export const isCountryCode = (value: unknown): value is string => typeof value === 'string' && COUNTRIES.some((country) => country.code === value)

/** The flag emoji for a country code ('LT' → 🇱🇹). */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65))
}

const namers = new Map<string, Intl.DisplayNames | null>()

/** The country's name in the given locale (falls back to the code). */
export function countryName(code: string, locale: string): string {
  if (!namers.has(locale)) {
    try {
      namers.set(locale, new Intl.DisplayNames([locale], { type: 'region' }))
    } catch {
      namers.set(locale, null)
    }
  }
  try {
    return namers.get(locale)?.of(code) ?? code
  } catch {
    return code
  }
}

/** Every country, sorted by name in the locale. */
export function countriesByName(locale: string): (Country & { name: string })[] {
  const collator = new Intl.Collator(locale)
  return COUNTRIES.map((country) => ({ ...country, name: countryName(country.code, locale) })).sort((a, b) => collator.compare(a.name, b.name))
}

/**
 * A full international number (E.164, '+37060012345') from a country and what
 * was typed. The national trunk prefix is dropped: a leading 0, and in
 * Lithuania the traditional 8 ('8 600 12345' → +37060012345). A number typed
 * with + is used as it is. Null when it can't be a phone number.
 */
export function toE164(countryCode: string, typed: string): string | null {
  const country = COUNTRIES.find((item) => item.code === countryCode)
  const digits = typed.replace(/[^\d+]/g, '')
  if (!digits) return null
  if (digits.startsWith('+')) {
    const whole = digits.slice(1).replace(/\D/g, '')
    return whole.length >= 8 && whole.length <= 15 ? `+${whole}` : null
  }
  if (!country) return null
  let national = digits.replace(/\D/g, '').replace(/^0+/, '')
  if (countryCode === 'LT' && national.length === 9 && national.startsWith('8')) national = national.slice(1)
  const whole = `${country.dial}${national}`
  return national.length >= 4 && whole.length >= 8 && whole.length <= 15 ? `+${whole}` : null
}
