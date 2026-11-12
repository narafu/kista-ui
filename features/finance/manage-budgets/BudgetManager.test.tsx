import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi, type ApiHandlers } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { BudgetManager } from './BudgetManager'
import type { FinanceBudget, FinanceCategory } from '@entities/finance'

const categoryTree: FinanceCategory[] = [
  { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
  { id: 'cat-transit', type: 'EXPENSE', name: '교통', sortOrder: 1, system: false, children: [] },
]

function budget(overrides: Partial<FinanceBudget>): FinanceBudget {
  return {
    id: 'b1',
    categoryId: 'cat-food',
    applyStartDate: '2026-01-01',
    applyEndDate: undefined,
    amount: 100_000,
    ...overrides,
  }
}

// 예산 목록·카테고리·그룹을 서버 응답으로 깔고 화면을 그린 뒤 로딩이 끝날 때까지 기다린다.
// 전역 useSearchParams 대역은 URL을 구독하지 않아 replaceState만으로는 다시 그려지지 않는다 — 실제 Next처럼 갱신되게 replaceState 뒤에 rerender한다. 같은 element 참조는 React가 건너뛰므로 매번 새로 만든다.
async function renderManager(budgets: FinanceBudget[], { groups = [], handlers = {} }: { groups?: { id: string }[]; handlers?: ApiHandlers } = {}) {
  const api = mockApi({
    'GET /api/finance/categories': categoryTree,
    'GET /api/finance/budgets': budgets,
    'GET /api/finance/groups': groups,
    ...handlers,
  })
  const ui = () => <BudgetManager type="EXPENSE" />
  const view = renderApp(ui())
  const original = window.history.replaceState.bind(window.history)
  vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
    original(...args)
    act(() => view.rerender(ui()))
  })
  await waitFor(() => expect(screen.queryByText('불러오는 중…')).not.toBeInTheDocument())
  return api
}

const labelsIn = (item: HTMLElement) => Array.from(item.querySelectorAll('[aria-label]')).map((el) => el.getAttribute('aria-label'))

describe('BudgetManager', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/finance/budgets/expense')
    // jsdom의 history.back은 popstate를 보내지 않는다 — 브라우저처럼 다음 태스크에 보낸다(FormDialog가 popstate에서 닫힌다)
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('공유 불가 상태에서는 복제·수정·삭제 순서로 아이콘 버튼이 나타난다', async () => {
    await renderManager([budget({})])

    expect(labelsIn(screen.getByText('식비').closest('li') as HTMLElement)).toEqual(['복제', '수정', '삭제'])
  })

  it('공유 가능 상태에서는 공유·복제·수정·삭제 순서로 아이콘 버튼이 나타난다', async () => {
    await renderManager([budget({})], { groups: [{ id: 'g1' }] })

    await waitFor(() => expect(labelsIn(screen.getByText('식비').closest('li') as HTMLElement)).toEqual(['공유', '복제', '수정', '삭제']))
  })

  it('그룹 소유 예산에만 공유 배지를 붙인다', async () => {
    await renderManager([budget({ id: 'b1', groupId: 'g1' }), budget({ id: 'b2', categoryId: 'cat-transit' })])

    expect(within(screen.getByText('식비').closest('li') as HTMLElement).getByText('공유')).toBeInTheDocument()
    expect(within(screen.getByText('교통').closest('li') as HTMLElement).queryByText('공유')).not.toBeInTheDocument()
  })

  it('카테고리 필터를 적용하면 목록이 좁혀진다', async () => {
    const user = userEvent.setup()
    await renderManager([budget({ id: 'b1', categoryId: 'cat-food' }), budget({ id: 'b2', categoryId: 'cat-transit', amount: 50_000 })])

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).getByText('교통')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '식비' }))

    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()
  })

  it('상태 필터를 적용하면 진행중/종료 예산만 남는다', async () => {
    const user = userEvent.setup()
    await renderManager([
      budget({ id: 'active', categoryId: 'cat-food', applyEndDate: undefined }),
      budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
    ])

    // 기본 상태 필터가 '진행중'이라 종료된 예산은 초기 화면에 보이지 않는다 — 먼저 '전체 상태'로
    // 바꿔 둘 다 보이는 것을 확인한 뒤 필터 전환을 검증한다.
    const list = screen.getByRole('list', { name: '예산 목록' })
    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '전체 상태' }))
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).getByText('교통')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))

    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))

    expect(within(list).queryByText('식비')).not.toBeInTheDocument()
    expect(within(list).getByText('교통')).toBeInTheDocument()
  })

  it('시작일이 미래인 예산은 종료일이 없어도 "진행중"으로 분류되지 않는다', async () => {
    const user = userEvent.setup()
    await renderManager([budget({ id: 'not-started', categoryId: 'cat-food', applyStartDate: '2099-01-01', applyEndDate: undefined })])

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))

    expect(screen.queryByText('식비')).not.toBeInTheDocument()
  })

  it('시작일이 미래인 예산은 "예정" 필터에만 나오고 "종료"에는 섞이지 않는다', async () => {
    const user = userEvent.setup()
    await renderManager([budget({ id: 'not-started', categoryId: 'cat-food', applyStartDate: '2099-01-01', applyEndDate: undefined })])

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))
    expect(screen.queryByText('식비')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '예정' }))
    expect(screen.getByText('식비')).toBeInTheDocument()
  })

  it('전체 상태에서 예정·종료 예산에는 상태 배지가 붙고 진행중에는 붙지 않는다', async () => {
    const user = userEvent.setup()
    await renderManager([
      budget({ id: 'active', categoryId: 'cat-food', applyEndDate: undefined }),
      budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
    ])

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '전체 상태' }))

    const items = within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')
    const ended = items.find((li) => within(li).queryByText('교통'))!
    const active = items.find((li) => within(li).queryByText('식비'))!
    expect(within(ended).getByText('종료')).toBeInTheDocument()
    expect(within(active).queryByText('진행중')).not.toBeInTheDocument()
  })

  it('11건 이상이면 페이지가 나뉘고 다음 버튼으로 다음 페이지 항목을 볼 수 있다', async () => {
    const user = userEvent.setup()
    await renderManager(Array.from({ length: 11 }, (_, i) =>
      budget({ id: `b${i}`, categoryId: 'cat-food', applyStartDate: `2026-01-${String(i + 1).padStart(2, '0')}`, amount: i }),
    ))

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(10)

    await user.click(screen.getByRole('button', { name: '다음 페이지' }))

    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  })

  it('필터 결과가 없으면 등록된 예산 없음이 아니라 조건에 맞는 예산 없음을 보여준다', async () => {
    const user = userEvent.setup()
    await renderManager([budget({ id: 'b1', categoryId: 'cat-food' })])

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '교통' }))

    expect(screen.getByText('조건에 맞는 예산이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('등록된 예산이 없습니다.')).not.toBeInTheDocument()
  })

  it('URL의 필터·페이지를 초기 상태로 읽는다', async () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?status=ENDED&category=cat-transit')
    await renderManager([
      budget({ id: 'a', categoryId: 'cat-food', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
      budget({ id: 'b', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
      budget({ id: 'c', categoryId: 'cat-transit' }),
    ])

    const items = within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('교통')).toBeInTheDocument()
    expect(within(items[0]).getByText('종료')).toBeInTheDocument()
  })

  it('잘못된 URL 값은 기본값(진행중·전체 카테고리·1페이지·10개)으로 폴백한다', async () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?status=FOO&category=nope&page=-3&size=7')
    await renderManager([
      budget({ id: 'active', categoryId: 'cat-food' }),
      budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
    ])

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()
  })

  it('필터 변경은 URL에 기록되고 page는 지워진다(기본값은 생략)', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/finance/budgets/expense?page=2')
    await renderManager([budget({})])

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))
    expect(window.location.search).toBe('?status=ENDED')

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))
    expect(window.location.search).toBe('')
  })

  it('범위를 벗어난 page는 마지막 페이지로 클램프한다', async () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?page=9')
    await renderManager(Array.from({ length: 11 }, (_, i) =>
      budget({ id: `b${i}`, categoryId: 'cat-food', applyStartDate: `2026-01-${String(i + 1).padStart(2, '0')}` }),
    ))

    expect(within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')).toHaveLength(1)
  })

  describe('추가·복제·수정 대화상자', () => {
    it('예산 추가는 빈 폼 대화상자를 열고 제출하면 POST 후 닫힌다', async () => {
      const user = userEvent.setup()
      const { requests } = await renderManager([budget({})], { handlers: { 'POST /api/finance/budgets': budget({ id: 'b2', categoryId: 'cat-transit', amount: 50_000 }) } })

      await user.click(screen.getByRole('button', { name: '예산 추가' }))
      const dialog = await screen.findByRole('dialog', { name: '예산 추가' })
      expect(within(dialog).getByLabelText('월 예산')).toHaveValue('')

      await user.click(within(dialog).getByLabelText('카테고리'))
      await user.click(await screen.findByRole('option', { name: '교통' }))
      await user.type(within(dialog).getByLabelText('월 예산'), '50000')
      await user.click(within(dialog).getByRole('button', { name: '추가' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const posts = requests.filter((r) => r.method === 'POST')
      expect(posts).toHaveLength(1)
      expect(posts[0].body).toMatchObject({ categoryId: 'cat-transit', amount: 50_000 })
      expect(toast.success).toHaveBeenCalledWith('예산이 추가되었습니다')
    })

    it('복제는 원본 값이 채워진 예산 복제 대화상자를 열고 제출하면 POST로 새 예산을 만든다', async () => {
      const user = userEvent.setup()
      const { requests } = await renderManager([budget({ id: 'b1', amount: 100_000 })], { handlers: { 'POST /api/finance/budgets': budget({ id: 'b2' }) } })

      await user.click(screen.getByRole('button', { name: '복제' }))
      const dialog = await screen.findByRole('dialog', { name: '예산 복제' })
      expect(within(dialog).getByText(/원본과 적용 기간이 겹치면 저장되지 않습니다/)).toBeInTheDocument()
      expect(within(dialog).getByLabelText('월 예산')).toHaveValue('100,000')
      expect(within(dialog).getByLabelText('적용 시작일')).toHaveValue('2026-01-01')

      await user.clear(within(dialog).getByLabelText('적용 시작일'))
      await user.type(within(dialog).getByLabelText('적용 시작일'), '2026-09-01')
      await user.click(within(dialog).getByRole('button', { name: '추가' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const posts = requests.filter((r) => r.method === 'POST')
      expect(posts).toHaveLength(1)
      expect(posts[0].body).toEqual({ categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-09-01' })
      expect(requests.some((r) => r.method === 'PUT')).toBe(false)
    })

    it('수정은 그 예산이 채워진 예산 수정 대화상자를 열고 제출하면 해당 id로 PUT한다', async () => {
      const user = userEvent.setup()
      const { requests } = await renderManager(
        [budget({ id: 'b1', categoryId: 'cat-food' }), budget({ id: 'b2', categoryId: 'cat-transit', amount: 50_000 })],
        { handlers: { 'PUT /api/finance/budgets/{id}': budget({ id: 'b2', categoryId: 'cat-transit', amount: 70_000 }) } },
      )

      const row = screen.getByText('교통').closest('li') as HTMLElement
      await user.click(within(row).getByRole('button', { name: '수정' }))
      const dialog = await screen.findByRole('dialog', { name: '예산 수정' })
      expect(within(dialog).getByLabelText('월 예산')).toHaveValue('50,000')

      await user.clear(within(dialog).getByLabelText('월 예산'))
      await user.type(within(dialog).getByLabelText('월 예산'), '70000')
      await user.click(within(dialog).getByRole('button', { name: '수정' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const puts = requests.filter((r) => r.method === 'PUT')
      expect(puts).toHaveLength(1)
      expect(puts[0].path).toBe('/api/finance/budgets/b2')
      expect(puts[0].body).toEqual({ categoryId: 'cat-transit', amount: 70_000, applyStartDate: '2026-01-01' })
      expect(toast.success).toHaveBeenCalledWith('예산이 수정되었습니다')
    })

    it('취소하면 요청 없이 닫히고, 다시 열면 초기값으로 시작한다', async () => {
      const user = userEvent.setup()
      const { requests } = await renderManager([budget({ id: 'b1', amount: 100_000 })])

      await user.click(screen.getByRole('button', { name: '수정' }))
      const dialog = await screen.findByRole('dialog', { name: '예산 수정' })
      await user.clear(within(dialog).getByLabelText('월 예산'))
      await user.type(within(dialog).getByLabelText('월 예산'), '1')
      await user.click(within(dialog).getByRole('button', { name: '취소' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

      await user.click(screen.getByRole('button', { name: '수정' }))
      expect(within(await screen.findByRole('dialog', { name: '예산 수정' })).getByLabelText('월 예산')).toHaveValue('100,000')
      expect(requests.filter((r) => r.method !== 'GET')).toEqual([])
    })
  })
})
