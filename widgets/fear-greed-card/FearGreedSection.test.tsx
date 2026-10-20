import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FearGreedSection } from './FearGreedSection'

const useFearGreedQueryMock = vi.fn((_days: number): { data: undefined; isError?: boolean } => ({ data: undefined }))

vi.mock('@entities/market', () => ({
  useFearGreedQuery: (days: number) => useFearGreedQueryMock(days),
}))

// FearGreedCard는 next/dynamic(ssr:false)으로 차트 내부 컴포넌트를 비동기 로드한다.
// 이 스위트는 일수 옵션에 따른 useFearGreedQuery 호출 로직만 검증하므로
// 차트 렌더링/canvas 의존 없는 동기 스텁으로 대체한다.
vi.mock('./FearGreedCard', () => ({
  FearGreedCard: ({
    title,
    error,
    onDaysChange,
    daysOptions,
  }: {
    title: string
    error?: boolean
    days: number
    onDaysChange: (days: number) => void
    daysOptions: readonly number[]
  }) => (
    <div>
      <span>{title}</span>
      {error && <span>{title} 데이터를 불러오지 못했습니다.</span>}
      {daysOptions.map((n) => (
        <button key={n} type="button" onClick={() => onDaysChange(n)}>
          {n}
        </button>
      ))}
    </div>
  ),
}))

describe('FearGreedSection', () => {
  it('queries both indices with the 30-day default window', () => {
    useFearGreedQueryMock.mockClear()
    render(<FearGreedSection />)

    expect(useFearGreedQueryMock.mock.calls.map((call) => call[0])).toEqual([30, 30])
  })

  it('re-queries only the CNN window when its day button is clicked, leaving crypto at 30', async () => {
    const user = userEvent.setup()
    render(<FearGreedSection />)

    // 클릭 이후 재렌더 호출만 확인 — 마운트 시점 호출은 제외. 두 카드가 같은 선택지라 첫 번째 '90'이 CNN 카드다
    useFearGreedQueryMock.mockClear()
    await user.click(screen.getAllByRole('button', { name: '90' })[0])

    // 훅 호출 순서는 CNN → 크립토
    expect(useFearGreedQueryMock.mock.calls.map((call) => call[0])).toEqual([90, 30])
  })

  it('renders both the CNN and crypto card titles', () => {
    render(<FearGreedSection />)

    expect(screen.getByText('CNN 공포탐욕지수')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수')).toBeInTheDocument()
  })

  it('passes each failed source to its card error fallback', () => {
    useFearGreedQueryMock
      .mockReturnValueOnce({ data: undefined, isError: true })
      .mockReturnValueOnce({ data: undefined, isError: false })

    render(<FearGreedSection />)

    expect(screen.getByText('CNN 공포탐욕지수 데이터를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('크립토 공포탐욕지수 데이터를 불러오지 못했습니다.')).not.toBeInTheDocument()
  })
})
