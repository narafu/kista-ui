import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DivisionCountSection } from './DivisionCountSection'

describe('DivisionCountSection', () => {
  const baseProps = {
    visible: true,
    divisionCount: 20 as const,
    setDivisionCount: vi.fn(),
    loading: false,
    isEdit: false,
  }

  it('renders fixed INFINITE division choices with 20 selected by default', () => {
    render(<DivisionCountSection {...baseProps} />)

    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '20분할' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30분할' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '40분할' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selects a fixed division choice', () => {
    const setDivisionCount = vi.fn()

    render(<DivisionCountSection {...baseProps} setDivisionCount={setDivisionCount} />)

    fireEvent.click(screen.getByRole('button', { name: '30분할' }))

    expect(setDivisionCount).toHaveBeenCalledWith(30)
  })

  it('hides when the strategy type does not use division count', () => {
    render(<DivisionCountSection {...baseProps} visible={false} />)

    expect(screen.queryByText('분할 수')).not.toBeInTheDocument()
  })
})
