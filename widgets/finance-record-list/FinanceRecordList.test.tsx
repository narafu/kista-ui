import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceRecordList } from './FinanceRecordList'
import type { CategoryIndex, FinanceCategory, FinanceTransaction } from '@entities/finance'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useDeleteFinanceTransactionMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useShareFinanceTransactionMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useUnshareFinanceTransactionMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useCanShareToGroup: () => false,
  }
})

const categoryTree: FinanceCategory[] = [
  { id: 'cat-1', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
]

const index: CategoryIndex = new Map([
  ['cat-1', { type: 'EXPENSE' as const, rootId: 'cat-1', name: '식비', path: [{ id: 'cat-1', name: '식비', sortOrder: 0 }], sortOrder: 0 }],
])

function tx(date: string, amount: number): FinanceTransaction {
  return { id: date, categoryId: 'cat-1', transactionDate: date, amount, memo: undefined }
}

const transactions = [tx('2026-03-05', 10000), tx('2026-08-10', 20000)]

describe('FinanceRecordList 연간 모드', () => {
  it('연간 모드에서도 기준월 하위 필터 없이 그 해 전체 내역을 보여준다(자산탭과 동일)', () => {
    render(
      <FinanceRecordList
        type="EXPENSE"
        transactions={transactions}
        categoryTree={categoryTree}
        index={index}
        period={{ month: '2026-08', mode: 'yearly' }}
        isLoading={false}
        isError={false}
        today="2026-08-23"
      />,
    )

    expect(screen.queryByLabelText('기준월')).not.toBeInTheDocument()
    // 2026년 전체(3월·8월) 2건 모두 노출
    expect(within(screen.getByRole('table', { name: '거래내역' })).getAllByRole('row')).toHaveLength(3)
  })

  it('월간 모드에서도 기준월 필터가 없다', () => {
    render(
      <FinanceRecordList
        type="EXPENSE"
        transactions={transactions}
        categoryTree={categoryTree}
        index={index}
        period={{ month: '2026-08', mode: 'monthly' }}
        isLoading={false}
        isError={false}
        today="2026-08-23"
      />,
    )

    expect(screen.queryByLabelText('기준월')).not.toBeInTheDocument()
    // 8월 1건만
    expect(within(screen.getByRole('table', { name: '거래내역' })).getAllByRole('row')).toHaveLength(2)
  })
})
