import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceSummary } from './FinanceSummary'
import type { FinanceTransaction } from '@entities/finance'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: () => '소비' }),
}))

const index = new Map([
  ['cat-1', { type: 'EXPENSE' as const, rootId: 'cat-1', name: '식비', sortOrder: 0 }],
  ['cat-income', { type: 'INCOME' as const, rootId: 'cat-income', name: '급여', sortOrder: 0 }],
])

function tx(date: string, amount: number, categoryId = 'cat-1'): FinanceTransaction {
  return { id: date + amount + categoryId, categoryId, transactionDate: date, amount, memo: undefined } as FinanceTransaction
}

describe('FinanceSummary 월간 모드', () => {
  it('네이티브 month input 대신 연도·월 select 쌍을 렌더한다 (데스크탑 사파리 type="month" 미지원 대응)', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    expect(document.querySelector('input[type="month"]')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '기준 연도' })).toHaveTextContent('2026년')
    expect(screen.getByRole('combobox', { name: '기준 월' })).toHaveTextContent('8월')
  })
})

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
        today="2026-08-23"
      />,
    )
    expect(screen.queryByLabelText('기준 월')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '기준 연도' })).toHaveTextContent('2026년')
  })

  it('연간 모드에서 전년 동기간 거래가 있으면 합계 카드에 전년대비를 함께 보여준다', () => {
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
        today="2026-08-23"
      />,
    )
    expect(screen.getByText(/전년대비/)).toBeInTheDocument()
  })
})

describe('FinanceSummary 수입 대비 비율', () => {
  it('EXPENSE/SAVING 탭은 같은 기간 INCOME 합계 대비 비율을 보여준다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[tx('2026-08-05', 30000, 'cat-1'), tx('2026-08-01', 100000, 'cat-income')]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    expect(screen.getByText('수입 대비 비율')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('INCOME 탭은 자기 자신 대비라 항상 100%라 카드를 보여주지 않는다', () => {
    render(
      <FinanceSummary
        type="INCOME"
        transactions={[tx('2026-08-01', 100000, 'cat-income')]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    expect(screen.queryByText('수입 대비 비율')).not.toBeInTheDocument()
  })

  it('같은 기간 수입이 없으면 나눗셈 0 분모를 피해 카드를 보여주지 않는다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[tx('2026-08-05', 30000, 'cat-1')]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    expect(screen.queryByText('수입 대비 비율')).not.toBeInTheDocument()
  })
})

describe('FinanceSummary 올해 월평균 카드', () => {
  it('월간/연간 모드 상관없이 선택 연도 1월~선택 월 합계를 경과 개월 수로 나눠 보여준다', () => {
    const transactions = [tx('2026-01-10', 100000), tx('2026-08-10', 200000), tx('2025-12-10', 999999)]
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={transactions}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    // (100000 + 200000) / 8개월(1~8월) = 37500
    expect(screen.getByText('올해 월평균')).toBeInTheDocument()
    expect(screen.getByText('37,500원')).toBeInTheDocument()
  })

  it('월간 모드에서 오늘이 아닌 과거 월을 선택해도 그 월까지의 경과 개월로 나눈다', () => {
    // 실제로는 windowRange(선택 월 기준 trailing 12개월)라 선택 월(3월) 이후 거래는 애초에 조회되지
    // 않는다 — today(8월) 기준 8개월로 나누면 과소집계된 평균이 나오는 회귀를 방지하는 테스트.
    const transactions = [tx('2026-01-10', 100000), tx('2026-02-10', 200000)]
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={transactions}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-02', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    // (100000 + 200000) / 2개월(1~2월) = 150000 — 8개월로 나누면 37500이 돼 값이 달라진다
    expect(screen.getByText('150,000원')).toBeInTheDocument()
  })
})

describe('FinanceSummary 남은 금액 카드', () => {
  it('EXPENSE/SAVING 탭은 남은 금액 카드를 보여주지 않는다', () => {
    render(
      <FinanceSummary
        type="EXPENSE"
        transactions={[tx('2026-08-05', 30000)]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    expect(screen.queryByText('남은 금액')).not.toBeInTheDocument()
  })

  it('INCOME 탭은 남은 금액 카드를 올해 월평균 카드보다 앞에 배치한다', () => {
    render(
      <FinanceSummary
        type="INCOME"
        transactions={[tx('2026-08-01', 100000, 'cat-income')]}
        index={index}
        isLoading={false}
        isError={false}
        period={{ month: '2026-08', mode: 'monthly' }}
        onPeriodChange={() => {}}
        today="2026-08-23"
      />,
    )
    const labels = screen.getAllByText(/^(남은 금액|올해 월평균)$/).map((el) => el.textContent)
    expect(labels).toEqual(['남은 금액', '올해 월평균'])
  })
})
