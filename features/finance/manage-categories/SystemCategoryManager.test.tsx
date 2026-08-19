import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemCategoryManager } from './SystemCategoryManager'
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
    ],
  },
]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useSystemFinanceCategoriesQuery: () => ({ data: assetCategories }),
    useCreateSystemFinanceCategoryMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateSystemFinanceCategoryMutation: () => ({ mutate: updateMutateMock, isPending: false }),
    useDeleteSystemFinanceCategoryMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
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

describe('SystemCategoryManager', () => {
  beforeEach(() => {
    createMutateMock.mockClear()
    updateMutateMock.mockClear()
    deleteMutateMock.mockClear()
  })

  it('시스템 카테고리 목록을 렌더한다', () => {
    render(<SystemCategoryManager />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('기타자산')).toBeInTheDocument()
  })

  // 회귀 포인트: 그룹 스코프 CategoryManager는 system:true 항목의 수정·삭제를 잠그지만
  // 관리자 화면은 정확히 시스템 카테고리를 관리하는 화면이라 잠금이 걸리면 안 된다.
  // disabled 속성뿐 아니라 pointer-events-none(클릭 무력화) 클래스도 없어야 실제로 클릭 가능하다.
  it('시스템 카테고리라도 수정·삭제 버튼이 비활성화되지 않는다', () => {
    render(<SystemCategoryManager />)

    const systemRow = screen.getByText('투자').closest('li')
    expect(systemRow).not.toBeNull()

    const editBtn = within(systemRow as HTMLElement).getByRole('button', { name: '수정' })
    const deleteBtn = within(systemRow as HTMLElement).getByRole('button', { name: '삭제' })

    expect(editBtn).not.toBeDisabled()
    expect(deleteBtn).not.toBeDisabled()
    expect(editBtn).not.toHaveClass('pointer-events-none')
    expect(deleteBtn).not.toHaveClass('pointer-events-none')
  })

  it('삭제 버튼을 누르면 시스템 카테고리 삭제 mutation이 호출된다', async () => {
    const user = userEvent.setup()
    render(<SystemCategoryManager />)

    const systemRow = screen.getByText('투자').closest('li')
    await user.click(within(systemRow as HTMLElement).getByRole('button', { name: '삭제' }))

    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    expect(deleteMutateMock).toHaveBeenCalledWith('l1-invest', expect.anything())
  })
})
