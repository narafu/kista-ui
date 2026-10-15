import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CyclePerformanceList } from './CyclePerformanceList'

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ push: vi.fn() }),
}))

const useStatsCyclesQueryMock = vi.fn()
const useAccountsQueryMock = vi.fn()
const useAllStrategiesQueryMock = vi.fn(() => ({ data: [] as { ticker: string }[] }))

vi.mock('@entities/stats', () => ({
  useStatsCyclesQuery: (filters: unknown) => useStatsCyclesQueryMock(filters),
}))

vi.mock('@entities/strategy', () => ({
  useAllStrategiesQuery: () => useAllStrategiesQueryMock(),
}))

vi.mock('@entities/account', () => ({
  useAccountsQuery: () => useAccountsQueryMock(),
}))

describe('CyclePerformanceList', () => {
  it('shows an error fallback instead of treating a failed request as empty cycle performance', () => {
    useStatsCyclesQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    useAccountsQueryMock.mockReturnValue({ data: [] })

    render(<CyclePerformanceList />)

    expect(screen.getByText('사이클 성과를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(useStatsCyclesQueryMock).toHaveBeenCalledWith({ type: undefined, accountId: undefined, ticker: undefined, status: 'ACTIVE', page: 0, size: 10 })
    expect(screen.queryByText('사이클 내역이 없습니다.')).not.toBeInTheDocument()
  })

  it('전략 뱃지 앞에 계좌 닉네임 뱃지를 표시한다', () => {
    useStatsCyclesQueryMock.mockReturnValue({
      data: {
        page: 0,
        totalElements: 1,
        totalPages: 1,
        items: [
        {
          cycleId: 'cycle-1',
          accountId: 'account-1',
          strategyType: 'INFINITE',
          ticker: 'SOXL',
          startDate: '2026-01-01',
          endDate: null,
          startAmount: 1000,
          endAmount: null,
          pnl: null,
          returnRate: null,
          durationDays: null,
          closed: false,
        },
        ],
      },
      isLoading: false,
      isError: false,
    })
    useAccountsQueryMock.mockReturnValue({
      data: [{ id: 'account-1', nickname: '메인계좌', accountNoMasked: '****0001', broker: 'KIS' }],
    })

    render(<CyclePerformanceList />)

    expect(screen.getAllByText('메인계좌').length).toBeGreaterThan(0)
  })

  it('선택한 종목을 필터로 넘기고, 종목이 선택지에서 사라지면 전체로 되돌린다', async () => {
    const user = userEvent.setup()
    useStatsCyclesQueryMock.mockReturnValue({
      data: { items: [], page: 0, totalElements: 0, totalPages: 0 },
      isLoading: false,
      isError: false,
    })
    useAccountsQueryMock.mockReturnValue({ data: [] })
    useAllStrategiesQueryMock.mockReturnValue({ data: [{ ticker: 'SOXL' }, { ticker: 'TQQQ' }, { ticker: 'SOXL' }] })

    const { rerender } = render(<CyclePerformanceList typeFilter="VR" />)

    await user.click(screen.getByRole('combobox', { name: '종목' }))
    await user.click(await screen.findByRole('option', { name: 'SOXL' }))

    expect(useStatsCyclesQueryMock).toHaveBeenLastCalledWith({ type: 'VR', accountId: undefined, ticker: 'SOXL', status: 'ACTIVE', page: 0, size: 10 })
    expect(screen.getByText('조건에 맞는 사이클이 없습니다.')).toBeInTheDocument()

    useAllStrategiesQueryMock.mockReturnValue({ data: [{ ticker: 'TQQQ' }] })
    rerender(<CyclePerformanceList typeFilter="VR" />)

    expect(useStatsCyclesQueryMock).toHaveBeenLastCalledWith({ type: 'VR', accountId: undefined, ticker: undefined, status: 'ACTIVE', page: 0, size: 10 })
  })

  it('상태 기본값은 진행 중이고, 전체 상태를 고르면 status 없이 조회한다', async () => {
    const user = userEvent.setup()
    useStatsCyclesQueryMock.mockReturnValue({
      data: { items: [], page: 0, totalElements: 0, totalPages: 0 },
      isLoading: false,
      isError: false,
    })
    useAccountsQueryMock.mockReturnValue({ data: [] })
    useAllStrategiesQueryMock.mockReturnValue({ data: [] })

    render(<CyclePerformanceList />)

    expect(screen.getByRole('combobox', { name: '상태' })).toHaveTextContent('진행 중')
    await user.click(screen.getByRole('combobox', { name: '상태' }))
    await user.click(await screen.findByRole('option', { name: '전체 상태' }))

    expect(useStatsCyclesQueryMock).toHaveBeenLastCalledWith({ type: undefined, accountId: undefined, ticker: undefined, status: undefined, page: 0, size: 10 })
    expect(screen.getByText('사이클 내역이 없습니다.')).toBeInTheDocument()
  })

  it('페이지 번호를 누르면 0-based page로 조회하고, 필터를 바꾸면 첫 페이지로 돌아간다', async () => {
    const user = userEvent.setup()
    useStatsCyclesQueryMock.mockReturnValue({
      data: { items: [], page: 0, totalElements: 50, totalPages: 3 },
      isLoading: false,
      isError: false,
    })
    useAccountsQueryMock.mockReturnValue({ data: [] })
    useAllStrategiesQueryMock.mockReturnValue({ data: [] })

    render(<CyclePerformanceList />)

    await user.click(screen.getByRole('button', { name: '2' }))
    expect(useStatsCyclesQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))

    await user.click(screen.getByRole('combobox', { name: '상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))
    expect(useStatsCyclesQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'CLOSED', page: 0, size: 10 }))

    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('combobox', { name: '페이지당 표시 개수' }))
    await user.click(await screen.findByRole('option', { name: '30개' }))
    expect(useStatsCyclesQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, size: 30 }))
  })
})
