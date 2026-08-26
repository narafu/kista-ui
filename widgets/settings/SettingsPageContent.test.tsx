import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SettingsPageContent } from './SettingsPageContent'

vi.mock('@entities/user', async () => {
  const actual = await vi.importActual<typeof import('@entities/user')>('@entities/user')
  return { ...actual, useMeQuery: () => ({ data: { nickname: '테스터', status: 'ACTIVE', notificationPrefs: {} } }) }
})
vi.mock('@features/settings/delete-user-account', () => ({ DeleteAccountButton: () => null }))
vi.mock('@features/settings/telegram-connect', () => ({ TelegramSection: () => null }))
vi.mock('@features/settings/notification-channel', () => ({ NotificationSettings: () => null }))
vi.mock('@features/settings/theme-select', () => ({ ThemeCards: () => null }))
vi.mock('@features/settings/balance-check-setting', () => ({ BalanceCheckSetting: () => null }))
vi.mock('@features/settings/edit-nickname', () => ({ NicknameEditor: () => null }))
vi.mock('@features/settings/notification-prefs', () => ({
  TradingAlertToggle: ({ type }: { type: string }) => <span>toggle:{type}</span>,
}))

describe('SettingsPageContent', () => {
  it('가계부 등록 알림 토글이 장 시작/마감 알림 아래에 노출된다', () => {
    render(<SettingsPageContent />)
    expect(screen.getByText('가계부 등록 알림')).toBeInTheDocument()
    expect(screen.getByText('toggle:FINANCE_REMINDER')).toBeInTheDocument()
  })
})
