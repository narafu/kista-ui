import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeConfig } from '@entities/runtime-config'
import { AdminSettingsForm } from './AdminSettingsForm'

const { invalidateQueriesMock, mutateMock, queryState } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  mutateMock: vi.fn(),
  queryState: { data: undefined as RuntimeConfig | undefined },
}))

vi.mock('@entities/admin-settings', () => ({
  useAdminSettingsQuery: () => ({ data: queryState.data }),
  useUpdateAdminSettingsMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const BROKER_LABELS: Record<string, string> = { KIS: '한국투자증권', TOSS: '토스증권', MOCK: '모의계좌' }

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
    labelOf: (_category: string, code: string) => BROKER_LABELS[code] ?? code,
  }),
}))

const settings: RuntimeConfig = {
  auth: { approvalRequired: true },
  brokers: { KIS: { enabled: true }, TOSS: { enabled: true }, MOCK: { enabled: true } },
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
  beforeEach(() => {
    invalidateQueriesMock.mockReset()
    invalidateQueriesMock.mockResolvedValue(undefined)
    mutateMock.mockReset()
    queryState.data = settings
  })

  it('warns about and submits the approval side effect without optimistic changes', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)
    await user.click(screen.getByRole('switch', { name: '관리자 승인 필요' }))
    expect(screen.getByText(/가입 승인 대기 상태가 해제/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ auth: { approvalRequired: false } }))
  })

  it('renders a toggle for the MOCK broker', () => {
    render(<AdminSettingsForm />)
    expect(screen.getByRole('switch', { name: '모의계좌' })).toBeInTheDocument()
  })

  it('restores the last server state when changes are discarded', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)
    const toggle = screen.getByRole('switch', { name: '한국투자증권' })
    await user.click(toggle)
    expect(toggle).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /변경 취소/ }))
    expect(toggle).toBeChecked()
  })

  it('adds string and numeric allowed values through structured rows', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)

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
    }))
  })

  it('rejects empty duplicate and malformed added values before save', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)

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
    render(<AdminSettingsForm />)

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
    }))
  })

  it('collapses customizable values to the current default when user changes are disabled', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)

    await user.click(screen.getByRole('switch', { name: '분할 수 사용자 변경 허용' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      strategies: expect.objectContaining({ INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          divisionCount: { customizable: false, allowedValues: [20], defaultValue: 20 },
        }),
      }) }),
    }))
  })

  it('edits recurring mode using fixed candidates and forces HOLD when fixed', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)

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
    }))
  })

  it('preserves dirty edits across incoming server data and resets to the latest snapshot', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<AdminSettingsForm />)
    const kis = screen.getByRole('switch', { name: '한국투자증권' })
    await user.click(kis)
    const latest = structuredClone(settings)
    latest.brokers.TOSS.enabled = false
    queryState.data = latest
    rerender(<AdminSettingsForm />)
    expect(kis).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /변경 취소/ }))
    expect(screen.getByRole('switch', { name: '한국투자증권' })).toBeChecked()
    expect(screen.getByRole('switch', { name: '토스증권' })).not.toBeChecked()
  })

  it('does not warn when approval was already disabled on the server', async () => {
    const alreadyDisabled = structuredClone(settings)
    alreadyDisabled.auth.approvalRequired = false
    queryState.data = alreadyDisabled
    render(<AdminSettingsForm />)
    expect(screen.queryByText(/가입 승인 대기 상태가 해제/)).not.toBeInTheDocument()
  })

  it('submits benchmark ETF allowed values and default', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)

    await user.type(screen.getByRole('combobox', { name: 'ETF 벤치마크 자산 추가' }), 'qld')
    await user.click(screen.getByRole('button', { name: 'ETF 벤치마크 자산 추가 확정' }))
    await user.click(screen.getByRole('radio', { name: 'QLD 기본값' }))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      benchmarks: {
        etf: { allowedValues: ['SPY', 'QQQ', 'QLD'], defaultValue: 'QLD' },
      },
    }))
  })

  it('자산 등록 폼 추천 목록에 새 기관을 추가하면 저장 payload에 반영된다', async () => {
    const user = userEvent.setup()
    render(<AdminSettingsForm />)

    await user.type(screen.getByLabelText('기관 추가'), '카카오뱅크')
    await user.click(screen.getByLabelText('기관 추가 확정'))
    await user.click(screen.getByRole('button', { name: /변경 저장/ }))

    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
      assetFormOptions: expect.objectContaining({
        institutionSuggestions: expect.arrayContaining(['카카오뱅크']),
      }),
    }))
  })
})
