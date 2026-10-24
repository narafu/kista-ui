import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { CycleSeedSection } from './CycleSeedSection'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

const meta = { ...dcaTestMeta, cycleSeedTypes: [{ code: 'MAINTAIN', label: 'ON(유지)' }, { code: 'MAX', label: 'ON(MAX)' }] }

describe('CycleSeedSection', () => {
  it('marks only the selected seed mode as selected', () => {
    render(
      <MetaProvider meta={meta}>
      <CycleSeedSection
        autoStart
        setAutoStart={vi.fn()}
        seedMode="MAX"
        setSeedMode={vi.fn()}
        loading={false}
      />
      </MetaProvider>,
    )

    expect(screen.getByRole('button', { name: /ON\(MAX\)/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /ON\(유지\)/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
