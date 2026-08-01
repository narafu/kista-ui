import { describe, expect, it } from 'vitest'
import { dec, num, optDec, optNum, optStr, str } from './normalize'

describe('str', () => {
  it('coerces any value to a string, matching bare String()', () => {
    expect(str('abc')).toBe('abc')
    expect(str(42)).toBe('42')
    expect(str(null)).toBe('null')
    expect(str(undefined)).toBe('undefined')
  })
})

describe('optStr', () => {
  it('returns undefined for null/undefined and String() otherwise', () => {
    expect(optStr(null)).toBeUndefined()
    expect(optStr(undefined)).toBeUndefined()
    expect(optStr('2026-08-01')).toBe('2026-08-01')
    expect(optStr(0)).toBe('0')
  })
})

describe('num', () => {
  it('coerces any value to a number, matching bare Number()', () => {
    expect(num('42')).toBe(42)
    expect(num(3.5)).toBe(3.5)
    expect(num(null)).toBe(0)
    expect(Number.isNaN(num(undefined))).toBe(true)
  })
})

describe('optNum', () => {
  it('returns undefined for null/undefined and Number() otherwise', () => {
    expect(optNum(null)).toBeUndefined()
    expect(optNum(undefined)).toBeUndefined()
    expect(optNum('12')).toBe(12)
    expect(optNum(0)).toBe(0)
  })
})

describe('dec', () => {
  it('parses BigDecimal-style strings like toNum', () => {
    expect(dec('2000.00')).toBe(2000)
    expect(dec('0.75')).toBe(0.75)
  })

  it('falls back to 0 for non-finite input, matching toNum', () => {
    expect(dec('not-a-number')).toBe(0)
    expect(dec(undefined)).toBe(0)
  })
})

describe('optDec', () => {
  it('returns undefined for null/undefined and dec() otherwise', () => {
    expect(optDec(null)).toBeUndefined()
    expect(optDec(undefined)).toBeUndefined()
    expect(optDec('3000.00')).toBe(3000)
  })
})
