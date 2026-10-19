import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FearGreedSourceView } from '@entities/market'
import FearGreedCardInner from './FearGreedCardInner'

describe('FearGreedCardInner', () => {
  it('shows a 데이터 없음 placeholder and no gauge when data is undefined', () => {
    render(
      <FearGreedCardInner
        title="CNN 공포탐욕지수"
        data={undefined}
        days={365}
        onDaysChange={vi.fn()}
        daysOptions={[365, 180, 90, 30]}
      />,
    )

    expect(screen.getByText('데이터 없음')).toBeInTheDocument()
    expect(screen.queryByText('중립')).not.toBeInTheDocument()
  })

  it('shows a loading message instead of 데이터 없음 while the query is pending', () => {
    render(
      <FearGreedCardInner
        title="CNN 공포탐욕지수"
        data={undefined}
        loading
        days={365}
        onDaysChange={vi.fn()}
        daysOptions={[365, 180, 90, 30]}
      />,
    )

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
    expect(screen.queryByText('데이터 없음')).not.toBeInTheDocument()
  })

  it('renders the current gauge value when data.current is present', () => {
    const data: FearGreedSourceView = {
      current: { date: '2026-07-01', value: 80, rating: 'EXTREME_GREED' },
      history: [],
    }
    render(
      <FearGreedCardInner
        title="CNN 공포탐욕지수"
        data={data}
        days={365}
        onDaysChange={vi.fn()}
        daysOptions={[365, 180, 90, 30]}
      />,
    )

    expect(screen.getByText('극탐욕')).toBeInTheDocument()
    expect(screen.queryByText('데이터 없음')).not.toBeInTheDocument()
  })

  it('calls onDaysChange with the clicked option', async () => {
    const onDaysChange = vi.fn()
    const user = userEvent.setup()
    render(
      <FearGreedCardInner
        title="CNN 공포탐욕지수"
        data={undefined}
        days={365}
        onDaysChange={onDaysChange}
        daysOptions={[365, 180, 90, 30]}
      />,
    )

    await user.click(screen.getByRole('button', { name: '90' }))

    expect(onDaysChange).toHaveBeenCalledWith(90)
  })

  it('shows day-over-day and week-over-week deltas from history', () => {
    const data: FearGreedSourceView = {
      current: { date: '2026-07-10T03:00:01.038742Z', value: 60, rating: 'GREED' },
      history: [
        { date: '2026-07-02T03:00:01.038742Z', value: 70, rating: 'GREED' },
        { date: '2026-07-03T03:00:01.038742Z', value: 65, rating: 'GREED' },
        { date: '2026-07-09T03:00:01.038742Z', value: 55, rating: 'NEUTRAL' },
        { date: '2026-07-10T03:00:01.038742Z', value: 60, rating: 'GREED' },
      ],
    }
    render(
      <FearGreedCardInner
        title="CNN 공포탐욕지수"
        data={data}
        days={365}
        onDaysChange={vi.fn()}
        daysOptions={[365, 180, 90, 30]}
      />,
    )

    expect(screen.getByText('+5')).toHaveClass('text-foreground')
    expect(screen.getByText('-5')).toHaveClass('text-foreground')
  })
})
