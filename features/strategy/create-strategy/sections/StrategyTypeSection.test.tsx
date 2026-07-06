import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StrategyTypeSection } from './StrategyTypeSection'

describe('StrategyTypeSection', () => {
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
  })
})
