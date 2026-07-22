import { render, screen } from '@testing-library/react'
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

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      tickers: [
        { code: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X Shares' },
        { code: 'TQQQ', name: 'ProShares UltraPro QQQ' },
        { code: 'QLD', name: 'ProShares Ultra QQQ' },
        { code: 'IBIT', name: 'iShares Bitcoin Trust' },
      ],
    },
  }),
}))

const settings: RuntimeConfig = {
  auth: { approvalRequired: true },
  brokers: { KIS: { enabled: true }, TOSS: { enabled: true } },
  benchmarks: {
    etf: { allowedValues: ['SPY', 'QQQ'], defaultValue: 'SPY' },
  },
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

  it('adds string and numeric allowed values through structured rows', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)

    await user.type(screen.getByRole('combobox', { name: '종목 추가' }), 'qld')
    await user.click(screen.getByRole('button', { name: '종목 추가 확정' }))
    await user.type(screen.getByRole('textbox', { name: '분할 수 추가' }), '40')
    await user.click(screen.getByRole('button', { name: '분할 수 추가 확정' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          ticker: expect.objectContaining({ allowedValues: ['SOXL', 'TQQQ', 'QLD'] }),
          divisionCount: expect.objectContaining({ allowedValues: [20, 30, 40] }),
        }),
      }) }),
    }), expect.any(Object))
  })

  it('rejects empty duplicate and malformed added values before save', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)

    await user.click(screen.getByRole('button', { name: '종목 추가 확정' }))
    expect(screen.getByRole('alert')).toHaveTextContent('값을 입력하세요.')
    await user.type(screen.getByRole('combobox', { name: '종목 추가' }), 'soxl')
    await user.click(screen.getByRole('button', { name: '종목 추가 확정' }))
    expect(screen.getByRole('alert')).toHaveTextContent('이미 추가된 값입니다.')

    await user.type(screen.getByRole('textbox', { name: '분할 수 추가' }), 'abc')
    await user.click(screen.getByRole('button', { name: '분할 수 추가 확정' }))
    expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent('올바른 숫자를 입력하세요.')

    await user.click(screen.getByRole('button', { name: /변경 저장/ }))
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('changes the default through row radios and blocks deleting the default row', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)

    await user.click(screen.getByRole('radio', { name: 'TQQQ 기본값' }))
    await user.click(screen.getByRole('button', { name: 'TQQQ 삭제' }))
    expect(screen.getByRole('alert')).toHaveTextContent('기본값은 삭제할 수 없습니다.')

    await user.click(screen.getByRole('button', { name: 'SOXL 삭제' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          ticker: expect.objectContaining({ allowedValues: ['TQQQ'], defaultValue: 'TQQQ' }),
        }),
      }) }),
    }), expect.any(Object))
  })

  it('collapses customizable values to the current default when user changes are disabled', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)

    await user.click(screen.getByRole('switch', { name: '분할 수 사용자 변경 허용' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          divisionCount: { customizable: false, allowedValues: [20], defaultValue: 20 },
        }),
      }) }),
    }), expect.any(Object))
  })

  it('edits recurring mode using fixed candidates and forces HOLD when fixed', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)

    await user.click(screen.getByRole('radio', { name: 'DEPOSIT 기본값' }))
    await user.click(screen.getByRole('checkbox', { name: 'WITHDRAW 허용' }))
    await user.click(screen.getByRole('switch', { name: '정기 입출금 방식 사용자 변경 허용' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ VR: expect.objectContaining({
        fields: expect.objectContaining({
          recurringMode: { customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' },
        }),
      }) }),
    }), expect.any(Object))
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

  it('submits benchmark ETF allowed values and default', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm initialSettings={settings} />)

    await user.type(screen.getByRole('combobox', { name: 'ETF 벤치마크 자산 추가' }), 'qld')
    await user.click(screen.getByRole('button', { name: 'ETF 벤치마크 자산 추가 확정' }))
    await user.click(screen.getByRole('radio', { name: 'QLD 기본값' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      benchmarks: {
        etf: { allowedValues: ['SPY', 'QQQ', 'QLD'], defaultValue: 'QLD' },
      },
    }), expect.any(Object))
  })
})
