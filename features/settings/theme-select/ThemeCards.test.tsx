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
  it('marks the active theme card as selected', () => {
    render(<ThemeCards />)

    const systemCard = screen.getByRole('button', { name: /시스템 자동/ })

    expect(systemCard).toHaveAttribute('aria-pressed', 'true')
  })
})
