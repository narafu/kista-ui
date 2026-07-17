import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmStep } from './ConfirmStep'
import { ApiError } from '@shared/lib/api-client'
import type { StepData } from '../CreateAccountStepper'

const mutateMock = vi.fn()
let mockState: { isPending: boolean; isError: boolean; error: unknown } = {
  isPending: false,
  isError: false,
  error: null,
}

vi.mock('@entities/account', () => ({
  useCreateAccountMutation: () => ({ mutate: mutateMock, ...mockState }),
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: () => '한국투자증권' }),
}))

const data: StepData = {
  broker: 'KIS',
  apiKey: 'app-key-1234',
  apiSecret: 'app-secret-1234',
  accountNo: '74420614-01',
  nickname: '메인 계좌',
}

describe('ConfirmStep', () => {
  it('submits the create-account request with the collected step data', async () => {
    mockState = { isPending: false, isError: false, error: null }
    const user = userEvent.setup()
    render(<ConfirmStep data={data} onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '계좌 연결' }))

    expect(mutateMock).toHaveBeenCalledWith({
      nickname: '메인 계좌',
      appKey: 'app-key-1234',
      secretKey: 'app-secret-1234',
      accountNo: '74420614-01',
      broker: 'KIS',
    })
  })

  it('shows the server detail message when the account number is already registered (409)', () => {
    mockState = {
      isPending: false,
      isError: true,
      error: new ApiError(409, { detail: '이미 등록된 계좌입니다.' }),
    }
    render(<ConfirmStep data={data} onBack={vi.fn()} />)

    expect(screen.getByText('이미 등록된 계좌입니다.')).toBeInTheDocument()
  })

  it('shows a broker-specific credential error on a 422 response', () => {
    mockState = { isPending: false, isError: true, error: new ApiError(422, null) }
    render(<ConfirmStep data={data} onBack={vi.fn()} />)

    expect(screen.getByText(/App Key, App Secret 또는 계좌번호를 다시 확인하세요/)).toBeInTheDocument()
  })
})
