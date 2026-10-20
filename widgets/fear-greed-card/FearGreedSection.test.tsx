import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FearGreedSection } from './FearGreedSection'

const useFearGreedQueryMock = vi.fn((_days: number): { data: unknown; isError?: boolean } => ({ data: undefined }))

vi.mock('@entities/market', () => ({
  useFearGreedQuery: (days: number) => useFearGreedQueryMock(days),
}))

// FearGreedCard는 next/dynamic(ssr:false)으로 차트 내부 컴포넌트를 비동기 로드한다.
// 이 스위트는 조회·기간 자르기 로직만 검증하므로 차트 렌더링/canvas 의존 없는 동기 스텁으로 대체한다.
vi.mock('./FearGreedCard', () => ({
  FearGreedCard: ({
    title,
    data,
    error,
    onDaysChange,
    daysOptions,
  }: {
    title: string
    data?: { history: unknown[] }
    error?: boolean
    days: number
    onDaysChange: (days: number) => void
    daysOptions: readonly number[]
  }) => (
    <div>
      <span>{title}</span>
      <span>{`${title} 점 ${data?.history.length ?? 0}`}</span>
      {error && !data && <span>{title} 데이터를 불러오지 못했습니다.</span>}
      {daysOptions.map((n) => (
        <button key={n} type="button" onClick={() => onDaysChange(n)}>
          {n}
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

describe('FearGreedSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    useFearGreedQueryMock.mockReset()
    useFearGreedQueryMock.mockImplementation(() => ({ data: { cnn: view, crypto: view } }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('queries the 365-day window once and shows the last 30 days on both cards by default', () => {
    render(<FearGreedSection />)

    expect(useFearGreedQueryMock.mock.calls.map((call) => call[0])).toEqual([365])
    // KST 오늘 - 30일부터 오늘까지 31건 (kista-api since 기준과 동일)
    expect(screen.getByText('CNN 공포탐욕지수 점 31')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수 점 31')).toBeInTheDocument()
  })

  it('slices only the CNN card when its day button is clicked, without re-querying', async () => {
    const user = userEvent.setup()
    render(<FearGreedSection />)

    useFearGreedQueryMock.mockClear()
    // 두 카드가 같은 선택지라 첫 번째 '90'이 CNN 카드다
    await user.click(screen.getAllByRole('button', { name: '90' })[0])

    expect(useFearGreedQueryMock.mock.calls.every((call) => call[0] === 365)).toBe(true)
    expect(screen.getByText('CNN 공포탐욕지수 점 91')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수 점 31')).toBeInTheDocument()
  })

  it('shows the error fallback on both cards when the query fails without data', () => {
    useFearGreedQueryMock.mockImplementation(() => ({ data: undefined, isError: true }))
    render(<FearGreedSection />)

    expect(screen.getByText('CNN 공포탐욕지수 데이터를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수 데이터를 불러오지 못했습니다.')).toBeInTheDocument()
  })
})
