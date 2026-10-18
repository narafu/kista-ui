import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiStep } from './ApiStep'
import { ApiError } from '@shared/lib/api-client'
import type { StepData } from '../CreateAccountStepper'

const testMutateMock = vi.fn()
const resetMock = vi.fn()
let mockError: unknown = null
let mockState: { isPending: boolean; isSuccess: boolean; isError: boolean } = {
  isPending: false,
  isSuccess: false,
  isError: false,
}

vi.mock('@entities/account', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/account')>()),
  useTestKisConnectionMutation: () => ({
    mutate: testMutateMock,
    reset: resetMock,
    error: mockError,
    ...mockState,
  }),
}))

let mockRuntimeLoading = false
vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () =>
    mockRuntimeLoading
      ? { data: undefined, isLoading: true }
      : { data: { brokers: { UPBIT: { enabled: true, allowedIp: '168.107.63.152' } } }, isLoading: false },
}))

const baseData: StepData = { broker: 'KIS', apiKey: '', apiSecret: '', accountNo: '', nickname: '' }

describe('ApiStep', () => {
  beforeEach(() => {
    mockError = null
    mockRuntimeLoading = false
    mockState = { isPending: false, isSuccess: false, isError: false }
  })

  it('runs the KIS connection test with the entered credentials', async () => {
    mockState = { isPending: false, isSuccess: false, isError: false }
    const user = userEvent.setup()
    render(<ApiStep data={baseData} onNext={vi.fn()} onBack={vi.fn()} />)

    await user.type(screen.getByLabelText(/App Key/), '1234567890')
    await user.type(screen.getByLabelText(/App Secret/), 'abcdefghij')
    await user.click(screen.getByRole('button', { name: '연결 테스트' }))

    expect(testMutateMock).toHaveBeenCalledWith({ appKey: '1234567890', appSecret: 'abcdefghij', broker: 'KIS' })
  })

  it('blocks proceeding to the next step until the connection test succeeds', () => {
    mockState = { isPending: false, isSuccess: false, isError: false }
    render(<ApiStep data={{ ...baseData, apiKey: '1234567890', apiSecret: 'abcdefghij' }} onNext={vi.fn()} onBack={vi.fn()} />)

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('enables the next step once the connection test has succeeded', async () => {
    mockState = { isPending: false, isSuccess: true, isError: false }
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<ApiStep data={{ ...baseData, apiKey: '1234567890', apiSecret: 'abcdefghij' }} onNext={onNext} onBack={vi.fn()} />)

    const nextButton = screen.getByRole('button', { name: '다음' })
    expect(nextButton).not.toBeDisabled()
    await user.click(nextButton)
    expect(onNext).toHaveBeenCalledWith({ apiKey: '1234567890', apiSecret: 'abcdefghij' })
  })

  it('업비트는 허용 IP와 필요한 권한을 안내하고 출금 권한을 켜지 말라고 강조한다', () => {
    render(<ApiStep data={{ ...baseData, broker: 'UPBIT' }} onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('168.107.63.152')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '허용 IP 복사' })).toBeInTheDocument()
    expect(screen.getByText(/자산 조회, 주문 조회, 주문하기/)).toBeInTheDocument()
    expect(screen.getByText(/출금하기 권한은 켜지 마세요/)).toBeInTheDocument()
  })

  it('업비트도 연결 테스트를 통과해야 다음으로 넘어간다', async () => {
    mockState = { isPending: false, isSuccess: false, isError: false }
    const user = userEvent.setup()
    render(<ApiStep data={{ ...baseData, broker: 'UPBIT' }} onNext={vi.fn()} onBack={vi.fn()} />)
    await user.type(screen.getByLabelText(/Access Key/), 'access-key-1234')
    await user.type(screen.getByLabelText(/Secret Key/), 'secret-key-1234')
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '연결 테스트' }))
    expect(testMutateMock).toHaveBeenCalledWith({ appKey: 'access-key-1234', appSecret: 'secret-key-1234', broker: 'UPBIT' })
  })

  it('연결 테스트가 IP 미허용으로 실패하면 IP 안내 문구를 보여준다', () => {
    mockState = { isPending: false, isSuccess: false, isError: true }
    mockError = new ApiError(422, { code: 'BROKER_IP_NOT_ALLOWED', detail: 'x' })
    render(<ApiStep data={{ ...baseData, broker: 'UPBIT', apiKey: 'access-key-1234', apiSecret: 'secret-key-1234' }} onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/허용 IP가 등록되지 않았습니다/)).toBeInTheDocument()
  })

  it('업비트 허용 IP를 불러오는 중에는 실패 문구 대신 확인 중을 보여준다', () => {
    mockRuntimeLoading = true
    render(<ApiStep data={{ ...baseData, broker: 'UPBIT' }} onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('확인 중')).toBeInTheDocument()
    expect(screen.queryByText('불러오지 못했습니다.')).not.toBeInTheDocument()
  })
})
