import { describe, expect, it } from 'vitest'
import { passwordStrength, suggestUsername, validateConfirmation, validateEmail, validatePassword, validateUsername } from './validation'

describe('username', () => {
  it('accepts 3–20 letters, numbers and _', () => {
    for (const name of ['abc', 'Brunel_1843', 'a_b', 'x'.repeat(20)]) expect(validateUsername(name)).toBeNull()
  })
  it('explains what is wrong', () => {
    expect(validateUsername('')).toMatch(/choose/i)
    expect(validateUsername('ab')).toMatch(/at least 3/i)
    expect(validateUsername('x'.repeat(21))).toMatch(/at most 20/i)
    expect(validateUsername('ada lovelace')).toMatch(/letters, numbers and _/i)
    expect(validateUsername('ada-l')).toMatch(/letters, numbers and _/i)
    expect(validateUsername('adä')).toMatch(/letters, numbers and _/i)
  })
  it('suggests a valid name from a display name', () => {
    expect(suggestUsername('Ada Lovelace')).toBe('Ada_Lovelace')
    expect(suggestUsername('  Émile  Zola! ')).toBe('Emile_Zola')
    expect(suggestUsername('Isambard Kingdom Brunel the Great')).toBe('Isambard_Kingdom_Bru')
    for (const name of ['', null, 'Jo', '李', '!!!']) expect(validateUsername(suggestUsername(name))).toBeNull()
  })
})

describe('email', () => {
  it('accepts ordinary addresses', () => {
    for (const email of ['ada@example.com', 'a.b+bronze@mail.co.uk', ' ada@example.com ']) expect(validateEmail(email)).toBeNull()
  })
  it('rejects malformed ones', () => {
    expect(validateEmail('')).toMatch(/enter your email/i)
    for (const email of ['ada', 'ada@', '@example.com', 'ada@example', 'ada@@example.com', 'ada @example.com', 'ada@example.']) {
      expect(validateEmail(email)).toMatch(/valid email/i)
    }
  })
})

describe('password', () => {
  it('needs at least 8 characters', () => {
    expect(validatePassword('')).toMatch(/choose/i)
    expect(validatePassword('1234567')).toMatch(/at least 8/i)
    expect(validatePassword('12345678')).toBeNull()
  })
  it('must be typed the same twice', () => {
    expect(validateConfirmation('Sprocket-42', '')).toMatch(/again/i)
    expect(validateConfirmation('Sprocket-42', 'sprocket-42')).toMatch(/match/i)
    expect(validateConfirmation('Sprocket-42', 'Sprocket-42')).toBeNull()
  })
  it('rates strength by length and variety', () => {
    expect(passwordStrength('short1')).toBe('weak')
    expect(passwordStrength('allletters')).toBe('weak')
    expect(passwordStrength('12345678')).toBe('weak')
    expect(passwordStrength('canal2rail')).toBe('ok')
    expect(passwordStrength('Canal2Railways')).toBe('strong')
    expect(passwordStrength('correcthorsebatterystaple')).toBe('strong')
  })
})
