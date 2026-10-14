import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FearGreedGauge } from './FearGreedGauge'

describe('FearGreedGauge', () => {
  it('labels the lowest zone (0) as 극공포', () => {
    render(<FearGreedGauge value={0} title="게이지" />)
    expect(screen.getByText('극공포')).toBeInTheDocument()
  })

  it('labels the 극공포/공포 boundary correctly (24 vs 25)', () => {
    const { rerender } = render(<FearGreedGauge value={24} title="게이지" />)
    expect(screen.getByText('극공포')).toBeInTheDocument()

    rerender(<FearGreedGauge value={25} title="게이지" />)
    expect(screen.getByText('공포')).toBeInTheDocument()
  })

  it('labels the middle of the range (50) as 중립', () => {
    render(<FearGreedGauge value={50} title="게이지" />)
    expect(screen.getByText('중립')).toBeInTheDocument()
  })

  it('labels the highest value (100) as 극탐욕 and displays the raw value', () => {
    render(<FearGreedGauge value={100} title="게이지" />)
    expect(screen.getByText('극탐욕')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
