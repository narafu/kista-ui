import { describe, expect, it } from 'vitest'
import { optDec, optNum, optStr } from './normalize'

describe('optStr', () => {
  it('returns undefined for null/undefined and String() otherwise', () => {
    expect(optStr(null)).toBeUndefined()
    expect(optStr(undefined)).toBeUndefined()
    expect(optStr('2026-08-01')).toBe('2026-08-01')
    expect(optStr(0)).toBe('0')
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

describe('optDec', () => {
  it('returns undefined for null/undefined and dec() otherwise', () => {
    expect(optDec(null)).toBeUndefined()
    expect(optDec(undefined)).toBeUndefined()
    expect(optDec('3000.00')).toBe(3000)
  })
})
