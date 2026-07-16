import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StrategyTickerSection } from './StrategyTickerSection'

describe('StrategyTickerSection', () => {
  it('marks the ticker selection without adding a compact-card indicator', () => {
    render(
      <StrategyTickerSection
        ticker="SOXL"
        availableTickers={['TQQQ', 'SOXL']}
        prices={{ TQQQ: 71.85, SOXL: 145.97 }}
        basePrice={145.97}
        loading={false}
        onTickerChange={vi.fn()}
        customizable
      />,
    )

    expect(screen.getByRole('button', { name: /SOXL/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /TQQQ/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByTestId('selection-indicator')).not.toBeInTheDocument()
  })
})
