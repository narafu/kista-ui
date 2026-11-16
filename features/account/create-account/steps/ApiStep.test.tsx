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
  useTestBrokerConnectionMutation: () => ({
    mutate: testMutateMock,
    reset: resetMock,
    error: mockError,
    ...mockState,
  }),
}))

vi.mock('@entities/meta', async () => {
  const { testMeta } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ findBroker: (code: string) => testMeta.brokers.find(b => b.code === code) }) }
})

const baseData: StepData = { broker: 'TOSS', apiKey: '', apiSecret: '', accountNo: '', nickname: '', apiKeyExpiresOn: '' }

describe('ApiStep', () => {
  beforeEach(() => {
    mockError = null
    mockState = { isPending: false, isSuccess: false, isError: false }
  })

  it('runs the Toss connection test with the entered credentials', async () => {
    mockState = { isPending: false, isSuccess: false, isError: false }
    const user = userEvent.setup()
    render(<ApiStep data={baseData} onNext={vi.fn()} onBack={vi.fn()} />)

    await user.type(screen.getByLabelText(/Client ID/), '1234567890')
    await user.type(screen.getByLabelText(/Client Secret/), 'abcdefghij')
    await user.click(screen.getByRole('button', { name: '연결 테스트' }))

    expect(testMutateMock).toHaveBeenCalledWith({ appKey: '1234567890', appSecret: 'abcdefghij', broker: 'TOSS' })
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
    expect(onNext).toHaveBeenCalledWith({ apiKey: '1234567890', apiSecret: 'abcdefghij', apiKeyExpiresOn: '' })
  })

  it('추정 만료일 broker(TOSS)는 만료일 입력란을 보여주고 입력값을 넘긴다', async () => {
    mockState = { isPending: false, isSuccess: true, isError: false }
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<ApiStep data={{ ...baseData, apiKey: '1234567890', apiSecret: 'abcdefghij' }} onNext={onNext} onBack={vi.fn()} />)
    await user.type(screen.getByLabelText('API 키 만료일'), '2027-03-01')
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(onNext).toHaveBeenCalledWith({ apiKey: '1234567890', apiSecret: 'abcdefghij', apiKeyExpiresOn: '2027-03-01' })
  })

  it.each([
    ['TOSS', /증권사 API 인증에 실패했습니다\. Client ID 또는 Client Secret을 확인하세요\./],
    ['MERITZ', /증권사 API 인증에 실패했습니다\. App Key 또는 App Secret을 확인하세요\./],
  ] as const)('%s 연결 테스트가 자격증명 오류로 실패하면 broker에 맞는 입력 항목을 짚는다', (broker, message) => {
    mockState = { isPending: false, isSuccess: false, isError: true }
    mockError = new ApiError(422, { code: 'BROKER_CREDENTIAL_INVALID', detail: 'x' })
    render(<ApiStep data={{ ...baseData, broker }} onNext={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(message)).toBeInTheDocument()
  })

})
