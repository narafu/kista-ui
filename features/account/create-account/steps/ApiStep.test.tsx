import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiStep } from './ApiStep'
import type { StepData } from '../CreateAccountStepper'

const testMutateMock = vi.fn()
const resetMock = vi.fn()
let mockState: { isPending: boolean; isSuccess: boolean; isError: boolean } = {
  isPending: false,
  isSuccess: false,
  isError: false,
}

vi.mock('@entities/account', () => ({
  useTestKisConnectionMutation: () => ({
    mutate: testMutateMock,
    reset: resetMock,
    ...mockState,
  }),
}))

const baseData: StepData = { broker: 'KIS', apiKey: '', apiSecret: '', accountNo: '', nickname: '' }

describe('ApiStep', () => {
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
})
