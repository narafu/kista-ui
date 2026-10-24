import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { CycleSeedSection } from './CycleSeedSection'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'

describe('CycleSeedSection', () => {
  it('marks only the selected seed mode as selected', () => {
    render(
      <MetaProvider meta={testMeta}>
      <CycleSeedSection
        autoStart
        setAutoStart={vi.fn()}
        seedMode="MAX"
        setSeedMode={vi.fn()}
        loading={false}
      />
      </MetaProvider>,
    )

    expect(screen.getByRole('button', { name: /시드 MAX/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /시드 유지/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
