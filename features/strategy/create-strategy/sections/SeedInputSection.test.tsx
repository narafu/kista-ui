import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeedInputSection } from './SeedInputSection'

const baseProps = {
  seedUsdInput: null,
  setSeedUsdInput: vi.fn(),
  availableCash: null,
  minSeed: null,
  loading: false,
}

describe('SeedInputSection', () => {
  it('항상 예수금 직접입력을 렌더하고 소수점 둘째 자리까지 입력된다', async () => {
    const setSeedUsdInput = vi.fn()
    const user = userEvent.setup()
    render(<SeedInputSection {...baseProps} setSeedUsdInput={setSeedUsdInput} />)

    expect(screen.queryByLabelText('사용 비율 (%)')).not.toBeInTheDocument()
    const input = screen.getByLabelText('예수금 (USD)')
    await user.type(input, '500.5')

    expect(input).toHaveValue('500.5')
    expect(setSeedUsdInput).toHaveBeenLastCalledWith(500.5)
  })

  it('가용 예수금이 있으면 힌트로 보여주고 OFF 배지는 없다', () => {
    render(<SeedInputSection {...baseProps} availableCash={1234.5} />)

    expect(screen.getByText('가용 예수금 $1,234.50')).toBeInTheDocument()
    expect(screen.queryByText(/OFF/)).not.toBeInTheDocument()
  })

  it('가용 예수금이 null이면 모의계좌만 배지를 보이고 그 외는 힌트가 없다', () => {
    const { rerender } = render(<SeedInputSection {...baseProps} mockBadgeLabel="모의계좌" />)
    expect(screen.getByText('모의계좌')).toBeInTheDocument()

    rerender(<SeedInputSection {...baseProps} />)
    expect(screen.queryByText('모의계좌')).not.toBeInTheDocument()
    expect(screen.queryByText(/가용 예수금/)).not.toBeInTheDocument()
  })

  it('비율 버튼은 100%만 내림, 나머지는 올림으로 시드를 채운다', async () => {
    const setSeedUsdInput = vi.fn()
    const user = userEvent.setup()
    render(<SeedInputSection {...baseProps} availableCash={1001.5} setSeedUsdInput={setSeedUsdInput} />)

    await user.click(screen.getByRole('button', { name: '25%' }))
    expect(setSeedUsdInput).toHaveBeenLastCalledWith(251)
    await user.click(screen.getByRole('button', { name: '100%' }))
    expect(setSeedUsdInput).toHaveBeenLastCalledWith(1001)
  })

  it('가용 예수금이 없거나 0이면 비율 버튼을 보이지 않는다', () => {
    const { rerender } = render(<SeedInputSection {...baseProps} availableCash={null} />)
    expect(screen.queryByRole('button', { name: '50%' })).not.toBeInTheDocument()

    rerender(<SeedInputSection {...baseProps} availableCash={0} />)
    expect(screen.queryByRole('button', { name: '50%' })).not.toBeInTheDocument()
  })
})
