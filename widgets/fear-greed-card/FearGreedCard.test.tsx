import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FearGreedCard } from './FearGreedCard'

vi.mock('next/dynamic', () => ({
  default: () => () => <div>chart</div>,
}))

describe('FearGreedCard', () => {
  it('shows an explicit fallback instead of the no-data chart when its request fails', () => {
    render(
      <FearGreedCard
        title="CNN 공포탐욕지수"
        data={undefined}
        error={true}
        days={200}
        onDaysChange={vi.fn()}
        daysOptions={[200, 120, 50, 20]}
      />,
    )

    expect(screen.getByText('공포탐욕지수를 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText('chart')).not.toBeInTheDocument()
  })
})
