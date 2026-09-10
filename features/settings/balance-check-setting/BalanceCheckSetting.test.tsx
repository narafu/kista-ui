import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BalanceCheckSetting } from './BalanceCheckSetting'

const mutateMock = vi.fn()

vi.mock('@entities/user', () => ({
  useUpdateBalanceCheckEnabledMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

describe('BalanceCheckSetting', () => {
  beforeEach(() => {
    mutateMock.mockReset()
  })

  it('turns the switch off and calls the mutation with false', async () => {
    const user = userEvent.setup()
    render(<BalanceCheckSetting initialEnabled />)

    const toggle = screen.getByRole('switch', { name: '잔고 검증' })
    expect(toggle).toBeChecked()

    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(mutateMock).toHaveBeenCalledWith(false, { onError: expect.any(Function) })
  })

  it('turns the switch on from a disabled initial state', async () => {
    const user = userEvent.setup()
    render(<BalanceCheckSetting initialEnabled={false} />)

    await user.click(screen.getByRole('switch', { name: '잔고 검증' }))

    expect(mutateMock).toHaveBeenCalledWith(true, { onError: expect.any(Function) })
  })

  it('rolls back the switch when the mutation fails', async () => {
    const user = userEvent.setup()
    render(<BalanceCheckSetting initialEnabled />)

    const toggle = screen.getByRole('switch', { name: '잔고 검증' })
    await user.click(toggle)
    expect(toggle).not.toBeChecked()

    const [, options] = mutateMock.mock.calls[0]
    act(() => options.onError())

    expect(toggle).toBeChecked()
  })
})
