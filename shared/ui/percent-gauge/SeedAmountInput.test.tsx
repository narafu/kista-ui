import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SeedAmountInput } from './SeedAmountInput'

describe('SeedAmountInput', () => {
  it('renders a plain USD input without stepper buttons', () => {
    render(
      <SeedAmountInput
        value={1000}
        onChange={vi.fn()}
        deposit={null}
        minSeed={null}
      />,
    )

    expect(screen.getByLabelText('시드 금액 (USD)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '최소시드 단위 감소' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '최소시드 단위 증가' })).not.toBeInTheDocument()
  })
})
