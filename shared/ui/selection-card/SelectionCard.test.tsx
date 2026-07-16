import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionCard } from './SelectionCard'

describe('SelectionCard', () => {
  it('exposes the selected state and renders an optional indicator', () => {
    render(
      <SelectionCard selected showIndicator>
        푸시 알림
      </SelectionCard>,
    )

    expect(screen.getByRole('button', { name: '푸시 알림' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
  })

  it('does not render an indicator for compact choices', () => {
    render(<SelectionCard selected>20분할</SelectionCard>)

    expect(screen.getByRole('button', { name: '20분할' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('selection-indicator')).not.toBeInTheDocument()
  })

  it('keeps selected as the source of truth for aria-pressed', () => {
    render(
      <SelectionCard selected aria-pressed={false}>
        20분할
      </SelectionCard>,
    )

    expect(screen.getByRole('button', { name: '20분할' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('preserves native button interaction and disabled behavior', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <SelectionCard selected={false} onClick={onClick}>
        텔레그램
      </SelectionCard>,
    )

    const button = screen.getByRole('button', { name: '텔레그램' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()

    rerender(
      <SelectionCard selected={false} disabled onClick={onClick}>
        텔레그램
      </SelectionCard>,
    )
    await user.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })
})
