import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetForm } from './BudgetForm'
import type { FinanceBudget, FinanceCategory } from '@entities/finance'

const { pushMock, backMock, createMutateMock, updateMutateMock, categoryTree } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  categoryTree: [
    { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
    { id: 'cat-transit', type: 'EXPENSE', name: '교통', sortOrder: 1, system: false, children: [] },
  ] as FinanceCategory[],
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceCategoriesQuery: () => ({ data: categoryTree }),
    useCanShareToGroup: () => false,
    useCreateFinanceBudgetMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateFinanceBudgetMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  }
})
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, back: backMock }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))

const source: FinanceBudget = { id: 'b1', categoryId: 'cat-food', applyStartDate: '2026-01-01', amount: 100_000 }

describe('BudgetForm', () => {
  beforeEach(() => {
    pushMock.mockClear()
    backMock.mockClear()
    createMutateMock.mockReset()
    updateMutateMock.mockReset()
  })

  it('복제 원본의 카테고리·금액·시작일이 그대로 채워진다', () => {
    render(<BudgetForm type="EXPENSE" duplicateFrom={source} />)

    expect(screen.getByLabelText('카테고리')).toHaveTextContent('식비')
    expect(screen.getByLabelText('월 예산 (원)')).toHaveValue('100,000')
    expect(screen.getByLabelText('적용 시작일')).toHaveValue('2026-01-01')
  })

  it('복제 제출(날짜 변경) 시 create mutation이 호출된다(update 아님)', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" duplicateFrom={source} />)

    await user.clear(screen.getByLabelText('적용 시작일'))
    await user.type(screen.getByLabelText('적용 시작일'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(createMutateMock).toHaveBeenCalledTimes(1)
    expect(createMutateMock.mock.calls[0][0]).toMatchObject({ categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-09-01' })
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('수정 제출 시 update mutation이 호출된다', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" initial={source} />)

    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMutateMock).toHaveBeenCalledTimes(1)
    expect(createMutateMock).not.toHaveBeenCalled()
  })

  it('defaultCategoryId로 카테고리만 프리필된다', () => {
    render(<BudgetForm type="EXPENSE" defaultCategoryId="cat-transit" />)

    expect(screen.getByLabelText('카테고리')).toHaveTextContent('교통')
    expect(screen.getByLabelText('월 예산 (원)')).toHaveValue('')
  })

  it('월 예산이 0원이면 저장 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" duplicateFrom={source} />)

    await user.clear(screen.getByLabelText('월 예산 (원)'))
    await user.type(screen.getByLabelText('월 예산 (원)'), '0')

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('추가 폼은 이번 달 1일을 시작일 기본값으로 채운다', () => {
    render(<BudgetForm type="EXPENSE" />)

    expect((screen.getByLabelText('적용 시작일') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('종료일이 시작일보다 앞서면 안내가 뜨고 저장 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" duplicateFrom={{ ...source, applyStartDate: '2026-05-01' }} />)

    await user.type(screen.getByLabelText('적용 종료일 (선택)'), '2026-04-30')

    expect(screen.getByText('종료일은 시작일 이후여야 합니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('dismiss=back이면 취소 시 router.back()', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" dismiss="back" />)

    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(backMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('dismiss 기본값(push)이면 저장 성공 후 목록 라우트로 이동한다', async () => {
    const user = userEvent.setup()
    updateMutateMock.mockImplementation((_payload: unknown, opts: { onSuccess: () => void }) => opts.onSuccess())
    render(<BudgetForm type="EXPENSE" initial={source} />)

    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(pushMock).toHaveBeenCalledWith('/finance/budgets/expense')
  })
})
