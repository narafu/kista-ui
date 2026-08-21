import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceSummary } from './FinanceSummary'
import type { FinanceTransaction } from '@entities/finance'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: () => '소비' }),
}))

const index = new Map([['cat-1', { type: 'EXPENSE' as const, rootId: 'cat-1', name: '식비', sortOrder: 0 }]])

function tx(date: string, amount: number): FinanceTransaction {
  return { id: date + amount, categoryId: 'cat-1', transactionDate: date, amount, memo: undefined } as FinanceTransaction
}

describe('FinanceSummary 연간 모드', () => {
  it('연간 모드일 때 월 선택 input 대신 연도 숫자 입력을 렌더한다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'yearly' }}
        onPeriodChange={() => {}}
      />,
    )
    expect(screen.queryByLabelText('기준 월')).not.toBeInTheDocument()
    expect(screen.getByLabelText('기준 연도')).toHaveValue(2026)
  })

  it('연간 모드에서 전년 동기간 거래가 있으면 전년 대비 카드를 보여준다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[tx('2026-03-01', 30000)]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'yearly' }}
        onPeriodChange={() => {}}
        previousYearTransactions={[tx('2025-03-01', 10000)]}
      />,
    )
    expect(screen.getByText('전년 대비')).toBeInTheDocument()
  })
})
