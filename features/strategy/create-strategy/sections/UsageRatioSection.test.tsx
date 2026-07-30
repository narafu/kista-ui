import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsageRatioSection } from './UsageRatioSection'

describe('UsageRatioSection', () => {
  it('잔고검증 ON이면 사용 비율 슬라이더(PercentGauge)를 렌더한다', () => {
    render(
      <UsageRatioSection
        pct={50}
        setPct={vi.fn()}
        seedUsdInput={null}
        setSeedUsdInput={vi.fn()}
        usdDeposit={1000}
        minSeed={100}
        loading={false}
        loadingBase={false}
        isBelowMinSeed={false}
        seedUnavailableReason={null}
        balanceCheckEnabled
      />,
    )

    expect(screen.getByLabelText('사용 비율 (%)')).toBeInTheDocument()
    expect(screen.queryByLabelText('예수금 (USD)')).not.toBeInTheDocument()
  })

  it('잔고검증 OFF면 예수금 직접입력(SeedAmountInput)을 렌더하고 소수점 둘째 자리까지 입력된다', async () => {
    const setSeedUsdInput = vi.fn()
    const user = userEvent.setup()
    render(
      <UsageRatioSection
        pct={100}
        setPct={vi.fn()}
        seedUsdInput={null}
        setSeedUsdInput={setSeedUsdInput}
        usdDeposit={null}
        minSeed={null}
        loading={false}
        loadingBase={false}
        isBelowMinSeed={false}
        seedUnavailableReason={null}
        balanceCheckEnabled={false}
      />,
    )

    expect(screen.queryByLabelText('사용 비율 (%)')).not.toBeInTheDocument()
    const input = screen.getByLabelText('예수금 (USD)')
    await user.type(input, '500.5')

    expect(input).toHaveValue('500.5')
    expect(setSeedUsdInput).toHaveBeenLastCalledWith(500.5)
  })
})
