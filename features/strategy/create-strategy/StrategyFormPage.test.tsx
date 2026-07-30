import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StrategyFormPage } from './StrategyFormPage'

const { backMock, pushMock, strategyFormMock } = vi.hoisted(() => ({
  backMock: vi.fn(),
  pushMock: vi.fn(),
  strategyFormMock: vi.fn((_props: unknown) => null),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock, push: pushMock }),
}))
vi.mock('./StrategyForm', () => ({
  StrategyForm: (props: unknown) => strategyFormMock(props),
}))

describe('StrategyFormPage intercepted edit', () => {
  it('dismisses a successful intercepted edit with router.back instead of pushing a stale detail route', () => {
    render(
      <StrategyFormPage
        accountId="account-1"
        dismiss="back"
        initial={{
          id: 'strategy-1',
          accountId: 'account-1',
          type: 'INFINITE',
          status: 'ACTIVE',
          ticker: 'TQQQ',
          cycleSeedType: 'MAX',
          initialUsdDeposit: 1000,
          divisionCount: 20,
          isReverseMode: false,
        }}
      />,
    )

    const props = strategyFormMock.mock.calls.at(-1)?.[0] as { onSuccess: () => void } | undefined
    if (!props) throw new Error('StrategyForm props were not captured')
    act(() => props.onSuccess())

    expect(backMock).toHaveBeenCalledOnce()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
