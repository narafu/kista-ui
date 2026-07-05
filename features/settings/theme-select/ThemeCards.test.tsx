import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeCards } from './ThemeCards'

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}))

describe('ThemeCards', () => {
  it('keeps the selected checkmark out of the text flow on mobile cards', () => {
    render(<ThemeCards />)

    const systemCard = screen.getByRole('button', { name: /시스템 자동/ })
    const checkmark = screen.getByText('✓')

    expect(systemCard).toHaveClass('relative')
    expect(checkmark).toHaveClass('absolute')
    expect(checkmark).toHaveClass('right-3')
    expect(checkmark).toHaveClass('bottom-3')
  })
})
