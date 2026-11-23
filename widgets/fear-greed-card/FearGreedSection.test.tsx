import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FearGreedSection } from './FearGreedSection'

const useFearGreedQueryMock = vi.fn((_days: number, _enabled?: boolean): { data: unknown; error?: unknown } => ({ data: undefined }))

vi.mock('@entities/market', () => ({
  useFearGreedQuery: (days: number, enabled?: boolean) => useFearGreedQueryMock(days, enabled),
}))

// FearGreedCard는 next/dynamic(ssr:false)으로 차트 내부 컴포넌트를 비동기 로드한다.
// 이 스위트는 조회·기간 자르기 로직만 검증하므로 차트 렌더링/canvas 의존 없는 동기 스텁으로 대체한다.
vi.mock('./FearGreedCard', () => ({
  FearGreedCard: ({
    title,
    data,
    deltaHistory,
    error,
    onDaysChange,
    daysOptions,
  }: {
    title: string
    data?: { history: unknown[] }
    deltaHistory?: unknown[]
    error?: unknown
    days: number
    onDaysChange: (days: number) => void
    daysOptions: readonly number[]
  }) => (
    <div>
      <span>{title}</span>
      <span>{`${title} 점 ${data?.history.length ?? 0}`}</span>
      <span>{`${title} 증감 ${deltaHistory?.length ?? '기본'}`}</span>
      {!!error && !data && <span>{title} 데이터를 불러오지 못했습니다.</span>}
      {daysOptions.map((n) => (
        <button key={n} type="button" onClick={() => onDaysChange(n)}>
          {`${title} ${n}`}
        </button>
      ))}
    </div>
  ),
}))

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-20T03:00:00Z') // KST 정오
// 오늘부터 364일 전까지 KST 정오에 하루 1건 — 날짜 경계에 걸리지 않는다
const history = Array.from({ length: 365 }, (_, i) => ({ date: new Date(NOW - (364 - i) * DAY_MS).toISOString(), value: 50, rating: 'NEUTRAL' }))
const view = { current: history.at(-1), history }

// 전체 기간 응답 — 주별 축약이라 일별 응답과 건수가 다르다
const weekly = { current: history.at(-1), history: history.filter((_, i) => i % 7 === 0) }

function mockQueries() {
  useFearGreedQueryMock.mockImplementation((days) =>
    days === 0 ? { data: { cnn: weekly, crypto: weekly } } : { data: { cnn: view, crypto: view } },
  )
}

describe('FearGreedSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    useFearGreedQueryMock.mockReset()
    mockQueries()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queries only the 365-day window up front and shows the last 30 days on both cards', () => {
    render(<FearGreedSection />)

    expect(useFearGreedQueryMock).toHaveBeenCalledWith(365, undefined)
    expect(useFearGreedQueryMock).toHaveBeenCalledWith(0, false)
    expect(useFearGreedQueryMock).not.toHaveBeenCalledWith(0, true)
    // KST 오늘 - 30일부터 오늘까지 31건 (kista-api since 기준과 동일)
    expect(screen.getByText('CNN 공포탐욕지수 점 31')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수 점 31')).toBeInTheDocument()
  })

  it('slices only the clicked card without re-querying', async () => {
    const user = userEvent.setup()
    render(<FearGreedSection />)

    useFearGreedQueryMock.mockClear()
    await user.click(screen.getByRole('button', { name: 'CNN 공포탐욕지수 90' }))

    expect(useFearGreedQueryMock).not.toHaveBeenCalledWith(0, true)
    expect(screen.getByText('CNN 공포탐욕지수 점 91')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수 점 31')).toBeInTheDocument()
  })

  it('fetches the full-period response only after ALL is chosen and uses it for that card', async () => {
    const user = userEvent.setup()
    render(<FearGreedSection />)

    await user.click(screen.getByRole('button', { name: '크립토 공포탐욕지수 0' }))

    expect(useFearGreedQueryMock).toHaveBeenLastCalledWith(0, true)
    expect(screen.getByText(`크립토 공포탐욕지수 점 ${weekly.history.length}`)).toBeInTheDocument()
    // 증감은 주별이 아닌 일별 1년치로 계산한다
    expect(screen.getByText('크립토 공포탐욕지수 증감 365')).toBeInTheDocument()
    expect(screen.getByText('CNN 공포탐욕지수 증감 기본')).toBeInTheDocument()
    expect(screen.getByText('CNN 공포탐욕지수 점 31')).toBeInTheDocument()
  })

  it('hides deltas in ALL mode until the daily history arrives', async () => {
    useFearGreedQueryMock.mockImplementation((days) => (days === 0 ? { data: { cnn: weekly, crypto: weekly } } : { data: undefined }))
    const user = userEvent.setup()
    render(<FearGreedSection />)

    await user.click(screen.getByRole('button', { name: 'CNN 공포탐욕지수 0' }))

    expect(screen.getByText('CNN 공포탐욕지수 증감 0')).toBeInTheDocument()
  })

  it('shows the error fallback on both cards when the query fails without data', () => {
    useFearGreedQueryMock.mockImplementation(() => ({ data: undefined, error: new Error('fail') }))
    render(<FearGreedSection />)

    expect(screen.getByText('CNN 공포탐욕지수 데이터를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수 데이터를 불러오지 못했습니다.')).toBeInTheDocument()
  })
})
