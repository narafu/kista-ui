import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RevealableValue } from './RevealableValue'

describe('RevealableValue', () => {
  it('shows the hidden display by default with a "보기" toggle', () => {
    render(<RevealableValue value="123-456789-01" hiddenDisplay="123-45****" />)

    expect(screen.getByText('123-45****')).toBeInTheDocument()
    expect(screen.queryByText('123-456789-01')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보기' })).toBeInTheDocument()
  })

  it('reveals the real value and flips the toggle label on click, then hides again on a second click', async () => {
    const user = userEvent.setup()
    render(<RevealableValue value="123-456789-01" hiddenDisplay="123-45****" />)

    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(screen.getByText('123-456789-01')).toBeInTheDocument()
    expect(screen.queryByText('123-45****')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '숨기기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '숨기기' }))

    expect(screen.getByText('123-45****')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보기' })).toBeInTheDocument()
  })

  it('stops the click from bubbling to an ancestor handler when toggling', async () => {
    const user = userEvent.setup()
    const onAncestorClick = vi.fn()
    render(
      <div onClick={onAncestorClick}>
        <RevealableValue value="123-456789-01" />
      </div>,
    )

    await user.click(screen.getByRole('button', { name: '보기' }))

    expect(onAncestorClick).not.toHaveBeenCalled()
  })

  it('falls back to the default masked placeholder when hiddenDisplay is not provided', () => {
    render(<RevealableValue value="secret" />)

    expect(screen.getByText('••••••••')).toBeInTheDocument()
  })
})
