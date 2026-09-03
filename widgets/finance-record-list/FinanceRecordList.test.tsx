import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('FinanceRecordList 연간 모드 기준월 필터', () => {
  it('연간 모드에서만 기준월 select를 렌더한다', () => {
    const { rerender } = render(
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

    rerender(
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
    expect(screen.getByLabelText('기준월')).toBeInTheDocument()
  })

  it('기준월을 선택하면 목록이 그 달로 좁혀지고, 전체 기간으로 되돌리면 다시 넓어진다', async () => {
    const user = userEvent.setup()
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

    const desktopTable = screen.getByRole('table', { name: '거래내역' })
    expect(within(desktopTable).getAllByRole('row')).toHaveLength(3) // 헤더 + 2건

    const monthTrigger = screen.getByRole('combobox', { name: '기준월' })
    await user.click(monthTrigger)
    await user.click(await screen.findByRole('option', { name: '2026-03' }))

    expect(within(desktopTable).getAllByRole('row')).toHaveLength(2) // 헤더 + 1건(3월)

    await user.click(monthTrigger)
    await user.click(await screen.findByRole('option', { name: '전체 기간' }))

    expect(within(desktopTable).getAllByRole('row')).toHaveLength(3)
  })

  it('기준월 선택 중 월간 모드로 전환돼도 무효해진 필터로 인한 빈 목록 깜빡임 없이 즉시 정상 표시된다', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
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

    await user.click(screen.getByRole('combobox', { name: '기준월' }))
    await user.click(await screen.findByRole('option', { name: '2026-03' }))
    expect(within(screen.getByRole('table', { name: '거래내역' })).getAllByRole('row')).toHaveLength(2)

    // 연간 모드에서 3월로 좁힌 채 월간(2026-08)으로 전환 — monthFilter='2026-03'은 더 이상
    // monthOptions에 없어 무효하다. useEffect 리셋만 의존하면 리셋이 반영되기 전 한 렌더 동안
    // effectiveMonthFilter가 무효값 그대로 남아 2026-08 거래(8월)까지 걸러내 목록이 텅 비어 보인다.
    rerender(
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

    expect(screen.queryByText('조건에 맞는 거래내역이 없습니다.')).not.toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: '거래내역' })).getAllByRole('row')).toHaveLength(2) // 헤더 + 1건(8월)
  })
})
