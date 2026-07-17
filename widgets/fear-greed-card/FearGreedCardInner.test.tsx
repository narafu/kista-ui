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
        days={200}
        onDaysChange={vi.fn()}
        daysOptions={[200, 120, 50, 20]}
      />,
    )

    expect(screen.getByText('데이터 없음')).toBeInTheDocument()
    expect(screen.queryByText('중립')).not.toBeInTheDocument()
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
        days={200}
        onDaysChange={vi.fn()}
        daysOptions={[200, 120, 50, 20]}
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
        days={200}
        onDaysChange={onDaysChange}
        daysOptions={[200, 120, 50, 20]}
      />,
    )

    await user.click(screen.getByRole('button', { name: '50' }))

    expect(onDaysChange).toHaveBeenCalledWith(50)
  })
})
