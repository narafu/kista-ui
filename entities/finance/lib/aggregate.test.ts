import { describe, expect, it } from 'vitest'
import {
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  formatAssetL1CategoryLabel,
  isMonthClosed,
} from './aggregate'

describe('isMonthClosed', () => {
  it('completed=true 레코드가 있으면 true', () => {
    expect(isMonthClosed([{ month: '2026-08', completed: true }], '2026-08')).toBe(true)
  })

  it('completed=false 레코드면 false', () => {
    expect(isMonthClosed([{ month: '2026-08', completed: false }], '2026-08')).toBe(false)
  })

  it('해당 월 레코드가 없으면 false', () => {
    expect(isMonthClosed([{ month: '2026-07', completed: true }], '2026-08')).toBe(false)
  })

  it('그룹 소속이면 그 그룹의 마감 행만 본다 — 같은 달 개인 마감은 무시', () => {
    const closings = [
      { month: '2026-08', completed: true, groupId: null },
      { month: '2026-08', completed: false, groupId: 'g1' },
    ]
    expect(isMonthClosed(closings, '2026-08', 'g1')).toBe(false)
  })

  it('무그룹이면 개인 마감 행(groupId null)만 본다 — 같은 달 그룹 마감은 무시', () => {
    const closings = [
      { month: '2026-08', completed: true, groupId: null },
      { month: '2026-08', completed: false, groupId: 'g1' },
    ]
    expect(isMonthClosed(closings, '2026-08')).toBe(true)
  })

  it('그룹 소속인데 그 그룹 마감 행이 없으면 개인 마감 행으로 폴백하지 않는다(가드와 동일)', () => {
    const closings = [{ month: '2026-08', completed: true, groupId: null }]
    expect(isMonthClosed(closings, '2026-08', 'g1')).toBe(false)
  })
})


describe('formatAssetL1CategoryLabel', () => {
  it('4개 L1 카테고리 ID를 한글 라벨로 변환한다', () => {
    expect(formatAssetL1CategoryLabel(SYSTEM_INVESTMENT_CATEGORY_ID)).toBe('투자')
    expect(formatAssetL1CategoryLabel(SYSTEM_SAVINGS_CATEGORY_ID)).toBe('예적금')
    expect(formatAssetL1CategoryLabel(SYSTEM_LOAN_CATEGORY_ID)).toBe('대출')
    expect(formatAssetL1CategoryLabel(SYSTEM_REAL_ESTATE_CATEGORY_ID)).toBe('부동산')
  })

  it('알 수 없는 ID는 원본을 그대로 반환한다', () => {
    expect(formatAssetL1CategoryLabel('unknown-id')).toBe('unknown-id')
  })
})
