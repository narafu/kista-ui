import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteModal } from './RouteModal'

const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
}))

describe('RouteModal', () => {
  beforeEach(() => {
    mockBack.mockClear()
  })

  it('renders a dialog role with aria-modal for assistive tech', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('closes on Escape keydown', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking the backdrop', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement)

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking the close button', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(mockBack).toHaveBeenCalledTimes(1)
  })
})
