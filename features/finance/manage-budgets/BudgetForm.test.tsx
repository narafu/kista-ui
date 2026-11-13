import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { apiError, mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { BudgetForm } from './BudgetForm'
import type { FinanceBudget, FinanceCategory } from '@entities/finance'

const categoryTree: FinanceCategory[] = [
  { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
  { id: 'cat-transit', type: 'EXPENSE', name: '교통', sortOrder: 1, system: false, children: [] },
]

const source: FinanceBudget = { id: 'b1', categoryId: 'cat-food', applyStartDate: '2026-01-01', amount: 100_000 }

function setup(handlers: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /api/finance/categories': categoryTree,
    'GET /api/finance/groups': [],
    ...handlers,
  })
}

// 카테고리 트리는 비동기로 도착한다 — 선택 영역에 이름이 뜰 때까지 기다린다
async function categoryLabel(name: string) {
  await waitFor(() => expect(screen.getByLabelText('카테고리')).toHaveTextContent(name))
}

describe('BudgetForm', () => {
  it('복제 원본의 카테고리·금액·시작일이 그대로 채워진다', async () => {
    setup()
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={source} onDone={vi.fn()} />)

    await categoryLabel('식비')
    expect(screen.getByLabelText('월 예산')).toHaveValue('100,000')
    expect(screen.getByLabelText('적용 시작일')).toHaveValue('2026-01-01')
  })

  it('복제 제출(날짜 변경)은 POST로 새 예산을 만들고 성공하면 onDone을 부른다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    const { requests } = setup({ 'POST /api/finance/budgets': { ...source, id: 'b2', applyStartDate: '2026-09-01' } })
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={source} onDone={onDone} />)
    await categoryLabel('식비')

    await user.clear(screen.getByLabelText('적용 시작일'))
    await user.type(screen.getByLabelText('적용 시작일'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: '추가' }))

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].body).toEqual({ categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-09-01' })
    expect(requests.some((r) => r.method === 'PUT')).toBe(false)
    expect(toast.success).toHaveBeenCalledWith('예산이 추가되었습니다')
  })

  it('그룹 소속이면 생성 제출에 shareToGroup=true 쿼리가 붙는다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'GET /api/finance/groups': [{ id: 'g1' }], 'POST /api/finance/budgets': source })
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={source} onDone={vi.fn()} />)
    await categoryLabel('식비')
    await screen.findByRole('switch', { name: '그룹으로 저장' })
    await user.click(screen.getByRole('button', { name: '추가' }))
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(requests.find((r) => r.method === 'POST')!.query.get('shareToGroup')).toBe('true')
  })

  it('적용 종료일이 있으면 그대로 보내고, 비우면 키를 생략한다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/budgets': source })
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={{ ...source, applyEndDate: '2026-12-31' }} onDone={vi.fn()} />)
    await categoryLabel('식비')
    await user.click(screen.getByRole('button', { name: '추가' }))
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(requests.find((r) => r.method === 'POST')!.body).toEqual({ categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-01-01', applyEndDate: '2026-12-31' })
  })

  it('수정 제출은 PUT으로 그 예산을 고치고 성공하면 onDone을 부른다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    const { requests } = setup({ 'PUT /api/finance/budgets/{id}': source })
    renderApp(<BudgetForm type="EXPENSE" initial={source} onDone={onDone} />)
    await categoryLabel('식비')

    await user.clear(screen.getByLabelText('월 예산'))
    await user.type(screen.getByLabelText('월 예산'), '120000')
    await user.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    const puts = requests.filter((r) => r.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe('/api/finance/budgets/b1')
    expect(puts[0].body).toEqual({ categoryId: 'cat-food', amount: 120_000, applyStartDate: '2026-01-01' })
    expect(requests.some((r) => r.method === 'POST')).toBe(false)
    expect(toast.success).toHaveBeenCalledWith('예산이 수정되었습니다')
  })

  it('서버가 거절하면(겹침 409) onDone을 부르지 않는다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    const { requests } = setup({ 'POST /api/finance/budgets': apiError(409, { detail: '기간이 겹칩니다' }) })
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={source} onDone={onDone} />)
    await categoryLabel('식비')

    await user.click(screen.getByRole('button', { name: '추가' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    await waitFor(() => expect(screen.getByRole('button', { name: '추가' })).toBeEnabled())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('defaultCategoryId로 카테고리만 프리필된다', async () => {
    setup()
    renderApp(<BudgetForm type="EXPENSE" defaultCategoryId="cat-transit" onDone={vi.fn()} />)

    await categoryLabel('교통')
    expect(screen.getByLabelText('월 예산')).toHaveValue('')
  })

  it('월 예산이 0원이면 저장 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    setup()
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={source} onDone={vi.fn()} />)

    await user.clear(screen.getByLabelText('월 예산'))
    await user.type(screen.getByLabelText('월 예산'), '0')

    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  it('추가 폼은 이번 달 1일을 시작일 기본값으로 채운다', () => {
    setup()
    renderApp(<BudgetForm type="EXPENSE" onDone={vi.fn()} />)

    expect((screen.getByLabelText('적용 시작일') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('종료일이 시작일보다 앞서면 안내가 뜨고 저장 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    setup()
    renderApp(<BudgetForm type="EXPENSE" duplicateFrom={{ ...source, applyStartDate: '2026-05-01' }} onDone={vi.fn()} />)

    await user.type(screen.getByLabelText('적용 종료일'), '2026-04-30')

    expect(screen.getByText('종료일은 시작일 이후여야 합니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
  })

  it('취소를 누르면 onDone을 부른다', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    setup()
    renderApp(<BudgetForm type="EXPENSE" onDone={onDone} />)

    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
