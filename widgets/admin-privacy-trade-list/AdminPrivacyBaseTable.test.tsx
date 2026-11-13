import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it } from 'vitest'
import { mockApi } from '@testing/mockApi'
import { createQueryClient } from '@shared/lib/query/createQueryClient'
import { renderApp } from '@testing/renderApp'
import { privacyKeys } from '@entities/privacy'
import type { AdminPrivacyBase } from '@entities/privacy'
import { AdminPrivacyBaseTable } from './AdminPrivacyBaseTable'

const base: AdminPrivacyBase = {
  id: 'base-1',
  releaseDate: '2026-07-02',
  ticker: 'NVDA',
  currentCycleStart: 1234.56,
  currentCycleRealizedPnl: 12.34,
  avgPrice: 98.76,
  holdings: 3,
  orders: [
    {
      id: 'order-1',
      direction: 'BUY',
      orderType: 'LOC',
      price: 100.25,
      quantity: 1,
    },
  ],
}

function renderTable(bases: AdminPrivacyBase[] = [base], props: Partial<Parameters<typeof AdminPrivacyBaseTable>[0]> = {}) {
  const queryClient = createQueryClient()
  queryClient.setQueryData(privacyKeys.list(), bases)
  return renderApp(<AdminPrivacyBaseTable pageSize={10} page={1} {...props} />, { queryClient })
}

describe('AdminPrivacyBaseTable mobile UX', () => {
  it('renders a mobile card list instead of the scroll table on mobile', () => {
    renderTable()

    const mobileList = screen.getByTestId('admin-privacy-mobile-list')
    const desktopWrap = screen.getByTestId('admin-privacy-desktop-table-wrap')

    expect(mobileList).toHaveClass('lg:hidden')
    expect(desktopWrap).toHaveClass('hidden')
    expect(desktopWrap).toHaveClass('lg:block')
  })

  it('shows the important trade-base values in the mobile card', () => {
    renderTable()

    const mobileList = screen.getByTestId('admin-privacy-mobile-list')
    const metrics = within(mobileList)
      .getAllByText(/^(시작금액|실현손익|평단가|보유)$/)
      .map((node) => node.textContent)

    expect(within(mobileList).getByText('2026-07-02')).toBeInTheDocument()
    expect(within(mobileList).getByRole('heading', { name: /NVDA/ })).toBeInTheDocument()
    expect(metrics).toEqual(['시작금액', '실현손익', '평단가', '보유'])
    expect(within(mobileList).getByText('시작금액')).toBeInTheDocument()
    expect(within(mobileList).getByText('$1,234.56')).toBeInTheDocument()
    expect(within(mobileList).getByText('보유')).toBeInTheDocument()
    expect(within(mobileList).getByText('3')).toBeInTheDocument()
    expect(within(mobileList).getByText('평단가')).toBeInTheDocument()
    expect(within(mobileList).getByText('$98.76')).toBeInTheDocument()
    expect(within(mobileList).getByText('실현손익')).toBeInTheDocument()
    expect(within(mobileList).getByText('+12.34')).toBeInTheDocument()
    expect(within(mobileList).getByText('1건')).toBeInTheDocument()
  })

  it('expands the order details inside the mobile card', () => {
    renderTable()

    const mobileList = screen.getByTestId('admin-privacy-mobile-list')
    const toggle = within(mobileList).getByRole('button', { name: /NVDA.*2026-07-02/ })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(mobileList).getByText('LOC(종가지정가)')).toBeInTheDocument()
    expect(within(mobileList).getByText('$100.25')).toBeInTheDocument()
  })
})

describe('AdminPrivacyBaseTable desktop table', () => {
  it('keeps the desktop table min width and exposes a keyboard-scrollable region', () => {
    renderTable()

    const table = screen.getByTestId('admin-privacy-desktop-table')
    const wrap = screen.getByTestId('admin-privacy-desktop-table-wrap')

    expect(table).toHaveClass('min-w-[760px]')
    expect(wrap).toHaveAttribute('role', 'region')
    expect(wrap).toHaveAttribute('aria-label', 'P 매매표 목록')
    expect(wrap).toHaveAttribute('tabindex', '0')
    expect(within(table).getByRole('columnheader', { name: '사이클 시작금액' })).toBeInTheDocument()
  })

  it('expands a row via a real keyboard-focusable toggle button', () => {
    renderTable()

    const table = screen.getByTestId('admin-privacy-desktop-table')
    const toggle = within(table).getByRole('button', { name: '2026-07-02 NVDA 주문 명세' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle.getAttribute('aria-controls')).toBe('privacy-base-base-1-details')
    expect(document.getElementById('privacy-base-base-1-details')).not.toBeNull()
  })

  it('centers headers, shrinks numeric columns and right-aligns numeric cells', () => {
    renderTable()

    const table = screen.getByTestId('admin-privacy-desktop-table')
    const desktopTable = within(table)

    const dateHeader = desktopTable.getByRole('columnheader', { name: '날짜' })
    const tickerHeader = desktopTable.getByRole('columnheader', { name: '종목' })
    const startHeader = desktopTable.getByRole('columnheader', { name: /시작금액/ })
    const holdingsHeader = desktopTable.getByRole('columnheader', { name: '보유' })
    const avgHeader = desktopTable.getByRole('columnheader', { name: '평단가' })
    const realizedHeader = desktopTable.getByRole('columnheader', { name: '실현손익' })
    const ordersHeader = desktopTable.getByRole('columnheader', { name: '주문' })

    const dateCell = desktopTable.getByText('2026-07-02').closest('td')
    const tickerCell = desktopTable.getByText('NVDA').closest('td')
    const startCell = desktopTable.getByText('$1,234.56').closest('td')
    const holdingsCell = desktopTable.getByText('3').closest('td')
    const avgCell = desktopTable.getByText('$98.76').closest('td')
    const realizedCell = desktopTable.getByText('+12.34').closest('td')
    const ordersCell = desktopTable.getByText('1건').closest('td')

    expect(dateHeader).toHaveClass('text-center')
    expect(tickerHeader).toHaveClass('text-center')
    expect(startHeader).toHaveClass('text-center', 'w-px')
    expect(holdingsHeader).toHaveClass('text-center', 'w-px')
    expect(avgHeader).toHaveClass('text-center', 'w-px')
    expect(realizedHeader).toHaveClass('text-center', 'w-px')
    expect(ordersHeader).toHaveClass('text-center', 'w-px')

    expect(dateCell).toHaveClass('text-center')
    expect(tickerCell).toHaveClass('text-center')
    expect(startCell).toHaveClass('text-right')
    expect(holdingsCell).toHaveClass('text-right')
    expect(avgCell).toHaveClass('text-right')
    expect(realizedCell).toHaveClass('text-right')
    expect(ordersCell).toHaveClass('text-right')
  })
})

describe('AdminPrivacyBaseTable filtering and paging', () => {
  const older: AdminPrivacyBase = { ...base, id: 'base-2', releaseDate: '2026-06-01', ticker: 'AAPL' }

  it('filters by window and paginates from the canonical query cache', () => {
    renderTable([base, older], { windowFrom: '2026-07-01' })

    expect(screen.getByText('총 1건')).toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })

  it('recomputes totalPages/PaginationBar from the live cache when a mutation adds a row beyond the SSR snapshot (regression: previously PaginationBar was a static SSR value and newly created rows could become unreachable)', () => {
    // pageSize=1이라 1건만 있을 땐 totalPages=1 → PaginationBar 미노출(totalPages<=1)
    const { queryClient, rerender } = renderTable([base], { pageSize: 1 })
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument()

    // 뮤테이션이 캐시에 새 항목을 얹으면(entities/privacy usePrivacyMutations와 동일한 효과) 위젯이
    // 리렌더 시 새 totalCount로 totalPages를 다시 계산해 2페이지 링크를 노출해야 한다 —
    // page.tsx가 SSR 시점 스냅샷으로 한 번만 계산하던 이전 구조에서는 갱신되지 않았다.
    queryClient.setQueryData(privacyKeys.list(), [base, older])
    rerender(<AdminPrivacyBaseTable pageSize={1} page={1} />)
    expect(screen.getByText('총 2건')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument()
  })
})

describe('AdminPrivacyBaseTable empty states', () => {
  it('distinguishes a range-filtered empty result from no data at all', () => {
    const { unmount } = renderTable([base], { windowFrom: '2027-01-01' })
    expect(screen.getByText('선택한 기간에 매매표가 없습니다. 기간을 넓혀 보세요.')).toBeInTheDocument()
    unmount()

    renderTable([])
    expect(screen.getByText('P 매매표가 없습니다. 매매표 등록 버튼으로 추가할 수 있습니다.')).toBeInTheDocument()
  })

  it('includes price and quantity in the delete confirmation', () => {
    renderTable()
    const table = screen.getByTestId('admin-privacy-desktop-table')
    fireEvent.click(within(table).getByRole('button', { name: '2026-07-02 NVDA 주문 명세' }))
    fireEvent.click(within(table).getByRole('button', { name: /삭제$/ }))
    expect(screen.getByText('매수 LOC(종가지정가) $100.25 × 1주 주문을 삭제합니다.')).toBeInTheDocument()
  })
})

// 다이얼로그 제출 요청 고정 — 폼 구현이 바뀌어도 나가는 요청(method·path·body)은 같아야 한다
describe('AdminPrivacyBaseTable dialog requests', () => {
  const saved = { ...base } as never
  const listKey = 'GET /api/admin/privacy-trade-bases' as const

  async function openDesktopDetails() {
    const table = screen.getByTestId('admin-privacy-desktop-table')
    await userEvent.click(within(table).getByRole('button', { name: '2026-07-02 NVDA 주문 명세' }))
    return table
  }

  async function pick(label: string, option: string, index = 0) {
    await userEvent.click(within(screen.getByRole('dialog')).getAllByLabelText(label)[index])
    await userEvent.click(await screen.findByRole('option', { name: option }))
  }

  const bodiesOf = (requests: { method: string; path: string; body: unknown }[], method: string) => requests.filter((r) => r.method === method)

  it('주문 추가는 POST /orders로 방향·유형·가격·수량을 보낸다', async () => {
    const { requests } = mockApi({ [listKey]: [base] as never, 'POST /api/admin/privacy-trade-bases/{baseId}/orders': saved })
    renderTable()
    const table = await openDesktopDetails()
    await userEvent.click(within(table).getByRole('button', { name: /주문 추가/ }))

    const dialog = screen.getByRole('dialog')
    await pick('방향', '매도')
    await pick('유형', 'MOC(종가시장가)')
    await userEvent.type(within(dialog).getByLabelText('가격'), '50.5')
    await userEvent.type(within(dialog).getByLabelText(/^수량/), '2')
    await userEvent.click(within(dialog).getByRole('button', { name: '추가' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('주문이 추가되었습니다'))
    const posts = bodiesOf(requests, 'POST')
    expect(posts).toHaveLength(1)
    expect((posts[0].path)).toBe('/api/admin/privacy-trade-bases/base-1/orders')
    expect(posts[0].body).toEqual({ direction: 'SELL', orderType: 'MOC', price: 50.5, quantity: 2 })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('주문 수정은 PATCH로 가격·수량만 보낸다', async () => {
    const { requests } = mockApi({ [listKey]: [base] as never, 'PATCH /api/admin/privacy-trade-bases/{baseId}/orders/{orderId}': saved })
    renderTable()
    const table = await openDesktopDetails()
    await userEvent.click(within(table).getByRole('button', { name: /\$100\.25.*수정$/ }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('가격')).toHaveValue(100.25)
    await userEvent.clear(within(dialog).getByLabelText('가격'))
    await userEvent.type(within(dialog).getByLabelText('가격'), '101.5')
    await userEvent.clear(within(dialog).getByLabelText(/^수량/))
    await userEvent.type(within(dialog).getByLabelText(/^수량/), '3')
    await userEvent.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('주문이 수정되었습니다'))
    const patches = bodiesOf(requests, 'PATCH')
    expect(patches).toHaveLength(1)
    expect((patches[0].path)).toBe('/api/admin/privacy-trade-bases/base-1/orders/order-1')
    expect(patches[0].body).toEqual({ price: 101.5, quantity: 3 })
  })

  it('기준 등록은 주문 행 둘을 숫자로 바꿔 POST한다', async () => {
    const { requests } = mockApi({ [listKey]: [base] as never, 'POST /api/admin/privacy-trade-bases': saved })
    renderTable()
    await userEvent.click(screen.getByRole('button', { name: /매매표 등록/ }))

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('날짜'), { target: { value: '2026-08-01' } })
    await userEvent.type(within(dialog).getByLabelText('사이클 시작금액'), '1000')
    await userEvent.type(within(dialog).getByLabelText('평단가 (없으면 비움)'), '12.5')
    await userEvent.clear(within(dialog).getByLabelText('보유'))
    await userEvent.type(within(dialog).getByLabelText('보유'), '7')
    await userEvent.type(within(dialog).getAllByLabelText('가격')[0], '10')
    await userEvent.type(within(dialog).getAllByLabelText(/^수량/)[0], '1')
    await userEvent.click(within(dialog).getByRole('button', { name: /^주문 추가$/ }))
    await userEvent.type(within(dialog).getAllByLabelText('가격')[1], '20.5')
    await pick('방향', '매도', 1)
    await userEvent.click(within(dialog).getByRole('button', { name: '등록' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('P 매매표가 등록되었습니다'))
    const posts = bodiesOf(requests, 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].path).toBe('/api/admin/privacy-trade-bases')
    expect(posts[0].body).toEqual({
        releaseDate: '2026-08-01', ticker: 'SOXL', currentCycleStart: 1000, currentCycleRealizedPnl: 0, avgPrice: 12.5, holdings: 7,
        orders: [
          { direction: 'BUY', orderType: 'LOC', price: 10, quantity: 1 },
          { direction: 'SELL', orderType: 'LOC', price: 20.5, quantity: null },
        ],
    })
  })

  it('기준 수정은 PATCH로 네 필드만 보낸다(평단가를 비우면 null)', async () => {
    const { requests } = mockApi({ [listKey]: [base] as never, 'PATCH /api/admin/privacy-trade-bases/{id}': saved })
    renderTable()
    const table = await openDesktopDetails()
    await userEvent.click(within(table).getByRole('button', { name: '2026-07-02 NVDA 매매표 수정' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('사이클 시작금액')).toHaveValue(1234.56)
    await userEvent.clear(within(dialog).getByLabelText('평단가 (없으면 비움)'))
    await userEvent.clear(within(dialog).getByLabelText('보유'))
    await userEvent.type(within(dialog).getByLabelText('보유'), '9')
    await userEvent.click(within(dialog).getByRole('button', { name: '수정' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('P 매매표가 수정되었습니다'))
    const patches = bodiesOf(requests, 'PATCH')
    expect(patches).toHaveLength(1)
    expect(patches[0].path).toBe('/api/admin/privacy-trade-bases/base-1')
    expect(patches[0].body).toEqual({ currentCycleStart: 1234.56, currentCycleRealizedPnl: 12.34, avgPrice: null, holdings: 9 })
  })
})
