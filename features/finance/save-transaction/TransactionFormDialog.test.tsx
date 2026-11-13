import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { TransactionFormDialog } from './TransactionFormDialog'
import type { FinanceCategory, FinanceTransaction } from '@entities/finance'

const categoryTree: FinanceCategory[] = [
  { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
]
const source: FinanceTransaction = { id: 't1', categoryId: 'cat-food', transactionDate: '2026-03-05', amount: 12_000, memo: '점심' }

function setup(handlers: Parameters<typeof mockApi>[0] = {}, { groups = false }: { groups?: boolean } = {}) {
  return mockApi({
    'GET /api/finance/categories': categoryTree,
    'GET /api/finance/groups': groups ? [{ id: 'g1' }] : [],
    'GET /api/finance/monthly-closings': [],
    ...handlers,
  })
}

async function categoryLabel(name: string) {
  await waitFor(() => expect(screen.getByLabelText('카테고리')).toHaveTextContent(name))
}

describe('TransactionFormDialog 제출 요청', () => {
  it('복제(생성) 제출은 POST로 보내고 그룹 소속이면 shareToGroup=true 쿼리를 붙인다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { requests } = setup({ 'POST /api/finance/transactions': source as never }, { groups: true })
    renderApp(<TransactionFormDialog open onClose={onClose} type="EXPENSE" duplicateFrom={source} />)
    await categoryLabel('식비')
    await screen.findByRole('switch', { name: '그룹으로 저장' })

    await user.clear(screen.getByLabelText('금액'))
    await user.type(screen.getByLabelText('금액'), '15000')
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('거래내역이 등록되었습니다'))
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].path).toBe('/api/finance/transactions')
    expect(posts[0].query.get('shareToGroup')).toBe('true')
    expect(posts[0].body).toEqual({ categoryId: 'cat-food', transactionDate: '2026-03-05', amount: 15_000, memo: '점심' })
  })

  it('그룹으로 저장 스위치를 끄면 shareToGroup 쿼리가 없다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/transactions': source as never }, { groups: true })
    renderApp(<TransactionFormDialog open onClose={() => {}} type="EXPENSE" duplicateFrom={source} />)
    await categoryLabel('식비')
    await user.click(await screen.findByRole('switch', { name: '그룹으로 저장' }))
    await user.click(screen.getByRole('button', { name: '등록' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(requests.find((r) => r.method === 'POST')!.query.has('shareToGroup')).toBe(false)
  })

  it('수정 제출은 PUT으로 그 내역을 고친다(공유 스위치 없음)', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'PUT /api/finance/transactions/{id}': source as never }, { groups: true })
    renderApp(<TransactionFormDialog open onClose={() => {}} type="EXPENSE" initial={source} />)
    await categoryLabel('식비')

    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('메모', { exact: false }))
    await user.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('거래내역이 수정되었습니다'))
    const puts = requests.filter((r) => r.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe('/api/finance/transactions/t1')
    expect(puts[0].query.has('shareToGroup')).toBe(false)
    expect(puts[0].body).toEqual({ categoryId: 'cat-food', transactionDate: '2026-03-05', amount: 12_000 })
    expect(requests.some((r) => r.method === 'POST')).toBe(false)
  })

  it('마감된 달이면 안내를 보이고 저장 버튼이 잠긴다', async () => {
    setup({ 'GET /api/finance/monthly-closings': [{ month: '2026-03', completed: true, groupId: undefined }] })
    renderApp(<TransactionFormDialog open onClose={() => {}} type="EXPENSE" initial={source} />)

    expect(await screen.findByText(/기록 점검이 완료되어 잠겨 있습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '수정' })).toBeDisabled()
  })
})
