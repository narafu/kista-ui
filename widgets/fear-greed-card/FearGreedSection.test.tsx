import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FearGreedSection } from './FearGreedSection'

const useFearGreedQueryMock = vi.fn((_days: number) => ({ data: undefined }))

vi.mock('@entities/market', () => ({
  useFearGreedQuery: (days: number) => useFearGreedQueryMock(days),
}))

// FearGreedCard는 next/dynamic(ssr:false)으로 차트 내부 컴포넌트를 비동기 로드한다.
// 이 스위트는 일수 옵션에 따른 useFearGreedQuery 호출 로직만 검증하므로
// 차트 렌더링/canvas 의존 없는 동기 스텁으로 대체한다.
vi.mock('./FearGreedCard', () => ({
  FearGreedCard: ({
    title,
    days,
    onDaysChange,
    daysOptions,
  }: {
    title: string
    days: number
    onDaysChange: (days: number) => void
    daysOptions: readonly number[]
  }) => (
    <div>
      <span>{title}</span>
      {daysOptions.map((n) => (
        <button key={n} type="button" onClick={() => onDaysChange(n)}>
          {n}
        </button>
      ))}
    </div>
  ),
}))

describe('FearGreedSection', () => {
  it('queries CNN (200) and crypto (365) with independent default day windows', () => {
    useFearGreedQueryMock.mockClear()
    render(<FearGreedSection />)

    const calledDays = useFearGreedQueryMock.mock.calls.map((call) => call[0])
    expect(calledDays).toContain(200)
    expect(calledDays).toContain(365)
  })

  it('re-queries only the CNN window when its day button is clicked, leaving crypto at 365', async () => {
    const user = userEvent.setup()
    render(<FearGreedSection />)

    // 클릭 이후 재렌더 호출만 확인 — 마운트 시점 호출은 제외
    useFearGreedQueryMock.mockClear()
    // CNN_OPTIONS(200/120/50/20)와 CRYPTO_OPTIONS(365/180/90/30)는 겹치지 않아 '50' 버튼은 CNN 카드에만 존재
    await user.click(screen.getByRole('button', { name: '50' }))

    const calledDays = useFearGreedQueryMock.mock.calls.map((call) => call[0])
    expect(calledDays).toContain(50)
    expect(calledDays).toContain(365)
    expect(calledDays).not.toContain(200)
  })

  it('renders both the CNN and crypto card titles', () => {
    render(<FearGreedSection />)

    expect(screen.getByText('CNN 공포탐욕지수')).toBeInTheDocument()
    expect(screen.getByText('크립토 공포탐욕지수')).toBeInTheDocument()
  })
})
