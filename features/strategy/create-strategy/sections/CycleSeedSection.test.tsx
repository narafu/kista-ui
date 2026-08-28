import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CycleSeedSection } from './CycleSeedSection'

describe('CycleSeedSection', () => {
  it('marks only the selected seed mode as selected', () => {
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
  })
})
