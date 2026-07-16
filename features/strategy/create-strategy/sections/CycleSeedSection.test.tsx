import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CycleSeedSection } from './CycleSeedSection'

describe('CycleSeedSection', () => {
  it('shows an indicator only on the selected descriptive choice', () => {
    render(
      <CycleSeedSection
        autoStart
        setAutoStart={vi.fn()}
        seedMode="MAX"
        setSeedMode={vi.fn()}
        loading={false}
      />,
    )

    expect(screen.getByRole('button', { name: /시드 MAX/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /시드 유지/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getAllByTestId('selection-indicator')).toHaveLength(1)
  })
})
