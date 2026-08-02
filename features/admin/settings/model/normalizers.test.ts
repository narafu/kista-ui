import { describe, expect, it } from 'vitest'
import { normalizeNumber, normalizeSymbol, normalizeText } from './normalizers'

describe('normalizers', () => {
  describe('normalizeSymbol', () => {
    it('trims and converts to uppercase', () => {
      expect(normalizeSymbol('  tqqq  ')).toBe('TQQQ')
      expect(normalizeSymbol('soxl')).toBe('SOXL')
      expect(normalizeSymbol('QLD')).toBe('QLD')
    })
  })

  describe('normalizeText', () => {
    it('trims whitespace', () => {
      expect(normalizeText('  hello  ')).toBe('hello')
      expect(normalizeText('world')).toBe('world')
      expect(normalizeText('\n\ttab\n')).toBe('tab')
    })
  })

  describe('normalizeNumber', () => {
    it('parses valid integers and decimals', () => {
      expect(normalizeNumber('42')).toBe(42)
      expect(normalizeNumber('3.14')).toBe(3.14)
      expect(normalizeNumber('  100  ')).toBe(100)
    })

    it('returns null for empty string', () => {
      expect(normalizeNumber('')).toBe(null)
      expect(normalizeNumber('  ')).toBe(null)
    })

    it('returns null for non-numeric strings', () => {
      expect(normalizeNumber('abc')).toBe(null)
      expect(normalizeNumber('12a34')).toBe(null)
    })

    it('returns null for non-finite numbers', () => {
      expect(normalizeNumber('Infinity')).toBe(null)
      expect(normalizeNumber('NaN')).toBe(null)
    })
  })
})
