import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { CategoryFormDialog } from './CategoryFormDialog'
import type { FinanceCategory } from '@entities/finance'

const tree: FinanceCategory[] = [
  { id: 'sys-1', type: 'EXPENSE', name: '시스템부모', sortOrder: 1, system: true, children: [] },
  { id: 'personal-1', type: 'EXPENSE', name: '개인부모', sortOrder: 2, system: false, children: [
    { id: 'p-child', parentId: 'personal-1', type: 'EXPENSE', name: '개인자식', sortOrder: 1, system: false, children: [] },
  ] },
  { id: 'group-1', type: 'EXPENSE', name: '그룹부모', groupId: 'g1', sortOrder: 3, system: false, children: [] },
]
const existing: FinanceCategory = { id: 'c9', parentId: 'group-1', type: 'EXPENSE', name: '식비', sortOrder: 4, system: false, children: [] }

function setup(handlers: Parameters<typeof mockApi>[0] = {}, groups = true) {
  return mockApi({ 'GET /api/finance/categories': [], 'GET /api/admin/finance/categories': [], 'GET /api/finance/groups': groups ? [{ id: 'g1' }] : [], ...handlers })
}

function renderGroup(category: FinanceCategory | null) {
  return renderApp(<CategoryFormDialog open onClose={() => {}} type="EXPENSE" l1Categories={tree} category={category} />)
}
function renderSystem(category: FinanceCategory | null) {
  return renderApp(<CategoryFormDialog open onClose={() => {}} type="EXPENSE" l1Categories={tree} category={category} system />)
}

describe('CategoryFormDialog(그룹 스코프) 제출 요청', () => {
  it('생성은 POST /api/finance/categories — 그룹 소속이면 shareToGroup=true, 비운 정렬순서는 1', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/categories': existing })
    renderGroup(null)
    await screen.findByRole('switch', { name: '그룹으로 저장' })

    await user.type(screen.getByLabelText('이름'), ' 식비 ')
    await user.clear(screen.getByLabelText('정렬순서'))
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('카테고리가 추가되었습니다'))
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].query.get('shareToGroup')).toBe('true')
    expect(posts[0].body).toEqual({ type: 'EXPENSE', name: '식비', sortOrder: 1 })
  })

  it('스위치를 끄면 쿼리가 없고, 이름이 비면 요청이 없다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/categories': existing })
    renderGroup(null)
    await user.click(await screen.findByRole('switch', { name: '그룹으로 저장' }))
    await user.click(screen.getByRole('button', { name: '저장' }))
    expect(requests.filter((r) => r.method === 'POST')).toHaveLength(0)

    await user.type(screen.getByLabelText('이름'), '식비')
    await user.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    expect(requests.find((r) => r.method === 'POST')!.query.has('shareToGroup')).toBe(false)
  })

  it('개인 부모를 고르면 스위치를 숨기고 안내를 띄우며 shareToGroup 없이 보낸다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/finance/categories': existing })
    renderGroup(null)
    await screen.findByRole('switch', { name: '그룹으로 저장' })

    await user.click(screen.getByLabelText('상위 카테고리'))
    await user.click(await screen.findByRole('option', { name: '개인부모' }))

    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
    expect(screen.getByText('개인 카테고리 하위에는 그룹 공유 카테고리를 만들 수 없습니다.')).toBeInTheDocument()
    // 하위가 있는 부모를 고르면 2단계 Select에 단계 이름이 붙는다
    expect(screen.getByRole('combobox', { name: '상위 카테고리 2단계' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('이름'), '식비')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(requests.some((r) => r.method === 'POST')).toBe(true))
    const post = requests.find((r) => r.method === 'POST')!
    expect(post.query.has('shareToGroup')).toBe(false)
    expect(post.body).toEqual({ parentId: 'personal-1', type: 'EXPENSE', name: '식비', sortOrder: 1 })
  })

  it('개인 부모에서 그룹 부모로 바꾸면 스위치가 다시 나타난다', async () => {
    const user = userEvent.setup()
    setup()
    renderGroup(null)
    await screen.findByRole('switch', { name: '그룹으로 저장' })

    await user.click(screen.getByLabelText('상위 카테고리'))
    await user.click(await screen.findByRole('option', { name: '개인부모' }))
    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('상위 카테고리'))
    await user.click(await screen.findByRole('option', { name: '그룹부모' }))
    expect(screen.getByRole('switch', { name: '그룹으로 저장' })).toBeInTheDocument()
  })

  it('수정은 PUT — 기존 parentId를 그대로 싣고 부모·스위치는 보이지 않는다', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'PUT /api/finance/categories/{id}': existing })
    renderGroup(existing)

    expect(screen.queryByLabelText('상위 카테고리')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '외식')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('카테고리가 수정되었습니다'))
    const puts = requests.filter((r) => r.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe('/api/finance/categories/c9')
    expect(puts[0].body).toEqual({ parentId: 'group-1', type: 'EXPENSE', name: '외식', sortOrder: 4 })
  })
})

describe('CategoryFormDialog(시스템 스코프) 제출 요청', () => {
  it('생성은 POST /api/admin/finance/categories — 공유 스위치·쿼리 없고 정렬순서 0 허용', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'POST /api/admin/finance/categories': existing })
    renderSystem(null)
    // 다이얼로그가 열린 뒤 비동기로 첫 포커스를 옮긴다 — 그 전에 타이핑하면 입력이 유실된다
    await waitFor(() => expect(document.activeElement?.id).toBe('systemCategoryParentId'))

    expect(screen.queryByRole('switch', { name: '그룹으로 저장' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('이름'), '식비')
    await user.clear(screen.getByLabelText('정렬순서'))
    await user.type(screen.getByLabelText('정렬순서'), '0')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('카테고리가 추가되었습니다'))
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].query.toString()).toBe('')
    expect(posts[0].body).toEqual({ type: 'EXPENSE', name: '식비', sortOrder: 0 })
    // 관리자 화면은 그룹 개념이 없어 그룹 목록을 조회하지 않는다
    expect(requests.some((r) => r.path === '/api/finance/groups')).toBe(false)
  })

  it('수정은 PUT /api/admin/finance/categories/{id}', async () => {
    const user = userEvent.setup()
    const { requests } = setup({ 'PUT /api/admin/finance/categories/{id}': existing })
    renderSystem(existing)

    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '외식')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('카테고리가 수정되었습니다'))
    const puts = requests.filter((r) => r.method === 'PUT')
    expect(puts).toHaveLength(1)
    expect(puts[0].path).toBe('/api/admin/finance/categories/c9')
    expect(puts[0].body).toEqual({ parentId: 'group-1', type: 'EXPENSE', name: '외식', sortOrder: 4 })
  })
})
