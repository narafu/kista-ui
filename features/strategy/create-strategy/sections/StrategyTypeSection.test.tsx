import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StrategyTypeSection } from './StrategyTypeSection'

describe('StrategyTypeSection', () => {
  it('shows a genuine all-disabled state when no enabled type remains', () => {
    render(<StrategyTypeSection type="" setType={vi.fn()} loading={false} strategyTypes={[]} />)
    expect(screen.getByText('현재 등록 가능한 전략이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
  it('does not show the removed single-strategy hint', () => {
    render(
      <StrategyTypeSection
        type="VR"
        setType={vi.fn()}
        loading={false}
        strategyTypes={[{
          code: 'VR',
          availableTickers: ['TQQQ'],
          requiresPrivacyBase: false,
          tickerFixed: true,
          supportsReverseMode: false,
          divisionCounts: [],
        }]}
      />,
    )

    expect(screen.queryByText('종목당 1개')).not.toBeInTheDocument()
    expect(screen.getByText('매매 전략')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VR' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('selection-indicator')).not.toBeInTheDocument()
  })
})
