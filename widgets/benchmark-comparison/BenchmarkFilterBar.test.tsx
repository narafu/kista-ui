import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BenchmarkFilterBar } from './BenchmarkFilterBar'
import { BENCHMARK_PERIODS } from './model/benchmarkPeriods'

function makeProps(overrides: Partial<Parameters<typeof BenchmarkFilterBar>[0]> = {}) {
  return {
    activeAsset: 'HOUSING' as const,
    setActiveAsset: vi.fn(),
    strategies: [],
    strategiesQuery: { isLoading: false, isError: false },
    accountsById: new Map(),
    strategySelection: 'ALL',
    setStrategySelection: vi.fn(),
    etfSymbol: 'SPY' as never,
    handleEtfSymbolChange: vi.fn(),
    etfBenchmarks: [],
    regionCode: '11',
    setRegionCode: vi.fn(),
    regions: [{ code: '11', name: '서울' }] as never,
    regionsQuery: { isLoading: false, isError: false },
    period: 'CUSTOM' as const,
    setPeriod: vi.fn(),
    periods: BENCHMARK_PERIODS,
    isCustomPeriod: true,
    defaultTo: '2026-08-23',
    customFromMonth: '2025-06',
    setCustomFromMonth: vi.fn(),
    customToMonth: '2026-03',
    setCustomToMonth: vi.fn(),
    customFromDate: '2026-05-23',
    setCustomFromDate: vi.fn(),
    customToDate: '2026-08-23',
    setCustomToDate: vi.fn(),
    showRefetchingStatus: false,
    ...overrides,
  }
}

describe('BenchmarkFilterBar 커스텀 기간(아파트)', () => {
  it('네이티브 month input 대신 YearMonthSelect 팝오버 트리거를 렌더한다', () => {
    render(<BenchmarkFilterBar {...makeProps()} />)

    expect(document.querySelector('input[type="month"]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /시작월/ })).toHaveTextContent('2025년 6월')
    expect(screen.getByRole('button', { name: /종료월/ })).toHaveTextContent('2026년 3월')
  })

  it('시작월을 종료월보다 뒤로 고르면 종료월로 clamp한다', async () => {
    const user = userEvent.setup()
    const setCustomFromMonth = vi.fn()
    render(<BenchmarkFilterBar {...makeProps({ setCustomFromMonth })} />)

    await user.click(screen.getByRole('button', { name: /시작월/ }))
    await user.click(screen.getByRole('button', { name: '다음 연도' })) // 2025 → 2026
    await user.click(screen.getByRole('button', { name: '2026년 8월' }))

    expect(setCustomFromMonth).toHaveBeenCalledWith('2026-03')
  })

  it('종료월을 시작월보다 앞으로 고르면 시작월로 clamp한다', async () => {
    const user = userEvent.setup()
    const setCustomToMonth = vi.fn()
    render(<BenchmarkFilterBar {...makeProps({ setCustomToMonth })} />)

    await user.click(screen.getByRole('button', { name: /종료월/ }))
    await user.click(screen.getByRole('button', { name: '이전 연도' })) // 2026 → 2025
    await user.click(screen.getByRole('button', { name: '2025년 1월' }))

    expect(setCustomToMonth).toHaveBeenCalledWith('2025-06')
  })

  it('종료월을 defaultTo 이후로 고르면 defaultTo 월로 clamp한다', async () => {
    const user = userEvent.setup()
    const setCustomToMonth = vi.fn()
    render(<BenchmarkFilterBar {...makeProps({ setCustomToMonth, customToMonth: '2026-08' })} />)

    await user.click(screen.getByRole('button', { name: /종료월/ }))
    await user.click(screen.getByRole('button', { name: '2026년 12월' }))

    expect(setCustomToMonth).toHaveBeenCalledWith('2026-08')
  })
})
