import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountInfoStep } from './AccountInfoStep'
import type { StepData } from '../CreateAccountStepper'

const baseData: StepData = { broker: 'KIS', apiKey: '', apiSecret: '', accountNo: '', nickname: '' }

describe('AccountInfoStep', () => {
  it('auto-inserts the KIS account number hyphen and proceeds with the formatted value', async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<AccountInfoStep data={baseData} onNext={onNext} onBack={vi.fn()} />)

    await user.type(screen.getByLabelText(/계좌 별칭/), '메인 계좌')
    await user.type(screen.getByLabelText(/계좌번호/), '7442061401')

    const accountNoInput = screen.getByLabelText(/계좌번호/) as HTMLInputElement
    expect(accountNoInput.value).toBe('74420614-01')

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(onNext).toHaveBeenCalledWith({ nickname: '메인 계좌', accountNo: '74420614-01' })
  })

  it('formats the Toss account number with two hyphens instead of the KIS pattern', async () => {
    const user = userEvent.setup()
    render(<AccountInfoStep data={{ ...baseData, broker: 'TOSS' }} onNext={vi.fn()} onBack={vi.fn()} />)

    await user.type(screen.getByLabelText(/계좌번호/), '13101001931')

    const accountNoInput = screen.getByLabelText(/계좌번호/) as HTMLInputElement
    expect(accountNoInput.value).toBe('131-01-001931')
  })

  it('shows a validation error and blocks proceeding for an incomplete account number', async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<AccountInfoStep data={baseData} onNext={onNext} onBack={vi.fn()} />)

    await user.type(screen.getByLabelText(/계좌 별칭/), '메인 계좌')
    await user.type(screen.getByLabelText(/계좌번호/), '123')
    await user.tab()

    expect(screen.getByText(/올바른 계좌번호 형식으로 입력해주세요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('MOCK broker: skips the account number field and proceeds with nickname only', async () => {
    const onNext = vi.fn()
    const user = userEvent.setup()
    render(<AccountInfoStep data={{ ...baseData, broker: 'MOCK' }} onNext={onNext} onBack={vi.fn()} />)

    expect(screen.queryByLabelText(/계좌번호/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()

    await user.type(screen.getByLabelText(/계좌 별칭/), '모의 계좌')
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(onNext).toHaveBeenCalledWith({ nickname: '모의 계좌', accountNo: '' })
  })
})
