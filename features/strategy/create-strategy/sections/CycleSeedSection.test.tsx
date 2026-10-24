import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { CycleSeedSection } from './CycleSeedSection'
import { dcaTestMeta } from './__fixtures__/dcaTestMeta'

const meta = { ...dcaTestMeta, cycleSeedTypes: [{ code: 'MAINTAIN', label: '시드 유지' }, { code: 'MAX', label: '시드 MAX' }] }

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

    expect(screen.getByRole('button', { name: /시드 MAX/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /시드 유지/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
