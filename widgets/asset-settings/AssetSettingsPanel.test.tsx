import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AssetSettingsPanel } from './AssetSettingsPanel'

vi.mock('@features/finance/manage-categories', () => ({ CategoryManager: () => null }))
vi.mock('@features/finance/manage-accounts', () => ({ AccountManager: () => null }))
vi.mock('@features/finance/manage-strategy-suggestions', () => ({ StrategySuggestionManager: () => null }))
vi.mock('@features/finance/manage-group', () => ({ GroupManager: () => null }))
vi.mock('@features/finance/hide-amounts', () => ({ HideAmountsToggle: () => null }))

describe('AssetSettingsPanel', () => {
  it('최상단에 모두 등록 버튼이 /finance/bulk-register 로 연결된다', () => {
    render(<AssetSettingsPanel />)
    const link = screen.getByRole('link', { name: '모두 등록' })
    expect(link).toHaveAttribute('href', '/finance/bulk-register')
  })
})
