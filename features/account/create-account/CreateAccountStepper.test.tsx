import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreateAccountStepper } from './CreateAccountStepper'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      brokers: [
        { code: 'KIS', label: '한국투자증권' },
        { code: 'MOCK', label: '모의계좌' },
      ],
    },
    labelOf: (_category: string, code: string) => (code === 'MOCK' ? '모의계좌' : code),
  }),
}))

vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () => ({
    data: { brokers: { KIS: { enabled: true }, TOSS: { enabled: true }, MOCK: { enabled: true } } },
  }),
}))

vi.mock('@entities/account', () => ({
  useCreateAccountMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useTestKisConnectionMutation: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isSuccess: false, isError: false }),
}))

describe('CreateAccountStepper MOCK broker', () => {
  it('collapses to a 3-step flow with no API key or account number steps', async () => {
    const user = userEvent.setup()
    render(<CreateAccountStepper />)

    await user.click(screen.getByRole('button', { name: /모의계좌/ }))

    // 3단계 스텝퍼: 증권사 / 계좌 별칭 / 확인 — 'API 키'/'계좌 정보' 라벨 없음
    expect(screen.getAllByText('계좌 별칭').length).toBeGreaterThan(0)
    expect(screen.queryByText('API 키')).not.toBeInTheDocument()
    expect(screen.queryByText('계좌 정보')).not.toBeInTheDocument()

    // AccountInfoStep(별칭 전용)으로 바로 진입 — 계좌번호 입력 없음
    expect(screen.queryByLabelText(/계좌번호/)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/계좌 별칭/), '모의 계좌')
    await user.click(screen.getByRole('button', { name: '다음' }))

    // 바로 확인 화면(ConfirmStep)으로 진입 — API Key/계좌번호 행 없음
    expect(screen.getByRole('button', { name: '계좌 연결' })).toBeInTheDocument()
    expect(screen.queryByText('계좌번호')).not.toBeInTheDocument()
    expect(screen.queryByText('API Key')).not.toBeInTheDocument()
  })
})
