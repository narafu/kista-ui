import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeConfig } from '@entities/runtime-config'
import { AdminSettingsForm } from './AdminSettingsForm'

const { mutateMock, queryState } = vi.hoisted(() => ({
  mutateMock: vi.fn(), queryState: { data: undefined as RuntimeConfig | undefined },
}))

vi.mock('@entities/admin-settings', () => ({
  useAdminSettingsQuery: (initial: RuntimeConfig) => ({ data: queryState.data ?? initial }),
  useUpdateAdminSettingsMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

const settings: RuntimeConfig = {
  auth: { approvalRequired: true },
  brokers: { KIS: { enabled: true }, TOSS: { enabled: true } },
  strategies: {
    INFINITE: { enabled: true, fields: {
      ticker: { customizable: true, allowedValues: ['SOXL', 'TQQQ'], defaultValue: 'SOXL' },
      divisionCount: { customizable: true, allowedValues: [20, 30], defaultValue: 20 },
    } },
    PRIVACY: { enabled: true, fields: { ticker: { customizable: false, allowedValues: ['SOXL'], defaultValue: 'SOXL' } } },
    VR: { enabled: true, fields: {
      ticker: { customizable: false, allowedValues: ['TQQQ'], defaultValue: 'TQQQ' },
      recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
      bandWidth: { customizable: true, allowedValues: [10, 15], defaultValue: 15 },
      intervalWeeks: { customizable: true, allowedValues: [1, 2], defaultValue: 2 },
    } },
  },
}

describe('AdminSettingsForm', () => {
  beforeEach(() => { mutateMock.mockReset(); queryState.data = undefined })

  it('warns about and submits the approval side effect without optimistic changes', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)
    await user.click(screen.getByRole('switch', { name: '관리자 승인 필요' }))
    expect(screen.getByText(/가입 승인 대기 상태가 해제/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ auth: { approvalRequired: false } }), expect.any(Object))
  })

  it('restores the last server state when changes are discarded', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)
    const toggle = screen.getByRole('switch', { name: 'KIS' })
    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /변경 취소/ }))
    expect(toggle).toBeChecked()
  })

  it('blocks an empty allowed-value list and exposes the validation error', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)
    const input = screen.getByLabelText('종목', { selector: '#infinite-ticker-values' })
    fireEvent.change(input, { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('빈 허용값 없이')
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('keeps comma-separated numeric text editable and submits incrementally added values', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)
    const input = screen.getByLabelText('분할 수', { selector: '#infinite-division-values' })
    await user.clear(input)
    await user.type(input, '20,30,40')
    expect(input).toHaveValue('20,30,40')
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ INFINITE: expect.objectContaining({
        fields: expect.objectContaining({ divisionCount: expect.objectContaining({ allowedValues: [20, 30, 40] }) }),
      }) }),
    }), expect.any(Object))
  })

  it('reports malformed and empty numeric tokens without dropping them', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)
    const input = screen.getByLabelText('분할 수', { selector: '#infinite-division-values' })
    await user.clear(input)
    await user.type(input, '20,,abc,40')
    await user.tab()
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('올바른 숫자를 쉼표로 구분')
    expect(input).toHaveValue('20,,abc,40')
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('discards malformed raw text back to the server value', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)
    const input = screen.getByLabelText('분할 수', { selector: '#infinite-division-values' })
    await user.clear(input)
    await user.type(input, '20,abc')
    await user.click(screen.getByRole('button', { name: /변경 취소/ }))
    expect(input).toHaveValue('20, 30')
  })

  it('preserves dirty edits across incoming server data and resets to the latest snapshot', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AdminSettingsForm initialSettings={settings} />)
    const kis = screen.getByRole('switch', { name: 'KIS' })
    await user.click(kis)
    const latest = structuredClone(settings)
    latest.brokers.TOSS.enabled = false
    queryState.data = latest
    rerender(<AdminSettingsForm initialSettings={settings} />)
    expect(kis).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /변경 취소/ }))
    expect(screen.getByRole('switch', { name: 'KIS' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'TOSS' })).not.toBeChecked()
  })

  it('does not warn when approval was already disabled on the server', async () => {
    const alreadyDisabled = structuredClone(settings)
    alreadyDisabled.auth.approvalRequired = false
    render(<AdminSettingsForm initialSettings={alreadyDisabled} />)
    expect(screen.queryByText(/가입 승인 대기 상태가 해제/)).not.toBeInTheDocument()
  })
})
