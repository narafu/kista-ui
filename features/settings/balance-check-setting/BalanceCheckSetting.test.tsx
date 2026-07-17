import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BalanceCheckSetting } from './BalanceCheckSetting'

const mutateMock = vi.fn()

vi.mock('@entities/user', () => ({
  useUpdateBalanceCheckEnabledMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

describe('BalanceCheckSetting', () => {
  it('turns the switch off and calls the mutation with false', async () => {
    const user = userEvent.setup()
    render(<BalanceCheckSetting initialEnabled />)

    const toggle = screen.getByRole('switch', { name: '잔고 검증' })
    expect(toggle).toBeChecked()

    await user.click(toggle)

    expect(toggle).not.toBeChecked()
    expect(mutateMock).toHaveBeenCalledWith(false)
  })

  it('turns the switch on from a disabled initial state', async () => {
    const user = userEvent.setup()
    render(<BalanceCheckSetting initialEnabled={false} />)

    await user.click(screen.getByRole('switch', { name: '잔고 검증' }))

    expect(mutateMock).toHaveBeenCalledWith(true)
  })
})
