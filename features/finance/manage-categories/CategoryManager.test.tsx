import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CategoryManager } from './CategoryManager'
import type { FinanceCategory } from '@entities/finance'

const { createMutateMock, updateMutateMock, deleteMutateMock } = vi.hoisted(() => ({
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  deleteMutateMock: vi.fn(),
}))

const assetCategories: FinanceCategory[] = [
  { id: 'l1-invest', type: 'ASSET', name: '투자', sortOrder: 10, system: true, children: [] },
  {
    id: 'l1-custom',
    type: 'ASSET',
    name: '기타자산',
    sortOrder: 20,
    system: false,
    children: [
      { id: 'l2-a', parentId: 'l1-custom', type: 'ASSET', name: '세부A', sortOrder: 10, system: false, children: [] },
      { id: 'l2-b', parentId: 'l1-custom', type: 'ASSET', name: '세부B', sortOrder: 20, system: false, children: [] },
    ],
  },
]

const incomeCategories: FinanceCategory[] = [
  { id: 'l1-salary', type: 'INCOME', name: '급여', sortOrder: 10, system: false, children: [] },
]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceCategoriesQuery: (type: string) => ({
      data: type === 'ASSET' ? assetCategories : type === 'INCOME' ? incomeCategories : [],
    }),
    useCreateFinanceCategoryMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateFinanceCategoryMutation: () => ({ mutate: updateMutateMock, isPending: false }),
    useDeleteFinanceCategoryMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      financeCategoryTypes: [
        { code: 'ASSET', label: '자산' },
        { code: 'INCOME', label: '수입' },
        { code: 'EXPENSE', label: '지출' },
        { code: 'SAVING', label: '저축' },
      ],
    },
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('CategoryManager', () => {
  beforeEach(() => {
    createMutateMock.mockClear()
    updateMutateMock.mockClear()
    deleteMutateMock.mockClear()
  })

  it('기본은 자산 타입 카테고리를 보여주고, 타입 세그먼트를 전환하면 해당 타입 카테고리로 바뀐다', async () => {
    const user = userEvent.setup()
    render(<CategoryManager />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('기타자산')).toBeInTheDocument()
    expect(screen.queryByText('급여')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '수입' }))

    expect(screen.getByText('급여')).toBeInTheDocument()
    expect(screen.queryByText('투자')).not.toBeInTheDocument()
  })

  it('시스템 카테고리는 수정·삭제 버튼이 비활성화된다', () => {
    render(<CategoryManager />)

    const systemRow = screen.getByText('투자').closest('li')
    expect(systemRow).not.toBeNull()
    expect(within(systemRow as HTMLElement).getByRole('button', { name: '수정' })).toBeDisabled()
    expect(within(systemRow as HTMLElement).getByRole('button', { name: '삭제' })).toBeDisabled()

    const normalRow = screen.getByText('기타자산').closest('li')
    expect(normalRow).not.toBeNull()
    expect(within(normalRow as HTMLElement).getByRole('button', { name: '수정' })).not.toBeDisabled()
    expect(within(normalRow as HTMLElement).getByRole('button', { name: '삭제' })).not.toBeDisabled()
  })

  it('하위 카테고리가 있는 항목을 삭제하면 확인 문구에 하위 개수와 과거 기록 유지 안내가 표시된다', async () => {
    const user = userEvent.setup()
    render(<CategoryManager />)

    const normalRow = screen.getByText('기타자산').closest('li')
    await user.click(within(normalRow as HTMLElement).getByRole('button', { name: '삭제' }))

    expect(screen.getByText('기타자산 카테고리를 삭제하시겠습니까?')).toBeInTheDocument()
    expect(screen.getByText(/하위 2개 카테고리가 함께 삭제됩니다/)).toBeInTheDocument()
    expect(screen.getByText(/이 카테고리를 사용한 과거 기록은 유지됩니다/)).toBeInTheDocument()
  })
})
