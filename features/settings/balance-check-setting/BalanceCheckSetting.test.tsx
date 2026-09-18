import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BalanceCheckSetting } from './BalanceCheckSetting'

const mutateMock = vi.fn()
let meData: { balanceCheckEnabled: boolean } | undefined = { balanceCheckEnabled: true }

vi.mock('@entities/user', () => ({
  useMeQuery: () => ({ data: meData }),
  useUpdateBalanceCheckEnabledMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

describe('BalanceCheckSetting', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    meData = { balanceCheckEnabled: true }
  })

  it('reflects the current me query value', () => {
    render(<BalanceCheckSetting />)
    expect(screen.getByRole('switch', { name: '잔고 검증' })).toBeChecked()
  })

  it('turns the switch off and calls the mutation with false', async () => {
    const user = userEvent.setup()
    render(<BalanceCheckSetting />)

    await user.click(screen.getByRole('switch', { name: '잔고 검증' }))

    expect(mutateMock).toHaveBeenCalledWith(false)
  })

  it('turns the switch on from a disabled state', async () => {
    meData = { balanceCheckEnabled: false }
    const user = userEvent.setup()
    render(<BalanceCheckSetting />)

    await user.click(screen.getByRole('switch', { name: '잔고 검증' }))

    expect(mutateMock).toHaveBeenCalledWith(true)
  })
})
