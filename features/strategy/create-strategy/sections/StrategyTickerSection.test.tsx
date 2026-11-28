import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StrategyTickerSection } from './StrategyTickerSection'

describe('StrategyTickerSection', () => {
  it('종목이 고정이면 2개 이상이어도 선택값을 읽기전용으로 보인다', () => {
    render(
      <StrategyTickerSection ticker="SOXL" availableTickers={['TQQQ', 'SOXL']} prices={{ SOXL: 145.97 }} basePrice={null} loading={false} onTickerChange={vi.fn()} customizable={false} />,
    )
    expect(screen.getByText('SOXL')).toBeInTheDocument()
    expect(screen.getByText('$145.97')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('선택 가능한 종목이 없습니다.')).not.toBeInTheDocument()
  })

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
