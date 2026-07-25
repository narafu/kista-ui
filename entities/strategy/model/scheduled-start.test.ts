import { describe, expect, it } from 'vitest'
import { todayKst } from '@shared/lib/format'
import { isScheduledStart, scheduledStartBadgeLabel } from './scheduled-start'
import type { Strategy } from './types'

const baseStrategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TSLA',
  cycleSeedType: 'MAX',
  isReverseMode: false,
}

function addDaysToKstDate(days: number): string {
  const [y, m, d] = todayKst().split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

describe('isScheduledStart', () => {
  it('returns true when startDate is in the future', () => {
    expect(isScheduledStart({ ...baseStrategy, startDate: addDaysToKstDate(7) })).toBe(true)
  })

  it('returns false when startDate is today', () => {
    expect(isScheduledStart({ ...baseStrategy, startDate: todayKst() })).toBe(false)
  })

  it('returns false when startDate is in the past', () => {
    expect(isScheduledStart({ ...baseStrategy, startDate: addDaysToKstDate(-7) })).toBe(false)
  })

  it('returns false when startDate is absent', () => {
    expect(isScheduledStart(baseStrategy)).toBe(false)
  })
})

describe('scheduledStartBadgeLabel', () => {
  it('formats as "N월 N일 시작예정"', () => {
    expect(scheduledStartBadgeLabel('2026-08-01')).toBe('8월 1일 시작예정')
  })
})
