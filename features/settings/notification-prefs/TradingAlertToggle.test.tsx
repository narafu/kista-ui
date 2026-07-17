import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TradingAlertToggle } from './TradingAlertToggle'

const mutateMock = vi.fn()
const { toastInfoMock } = vi.hoisted(() => ({ toastInfoMock: vi.fn() }))

vi.mock('sonner', () => ({
  toast: { info: toastInfoMock },
}))

vi.mock('@entities/user', () => ({
  useUpdateNotificationPrefMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

describe('TradingAlertToggle', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    toastInfoMock.mockReset()
  })

  it('toggles the preference and calls the mutation when a channel is set', async () => {
    const user = userEvent.setup()
    render(<TradingAlertToggle type="ORDER_FILLED" initialEnabled={false} channel="TELEGRAM" />)

    await user.click(screen.getByRole('switch', { name: '매매 알림' }))

    expect(mutateMock).toHaveBeenCalledWith({ type: 'ORDER_FILLED', enabled: true })
  })

  it('blocks the toggle and prompts to pick a channel when notifications are off', async () => {
    const user = userEvent.setup()
    render(<TradingAlertToggle type="ORDER_FILLED" initialEnabled={true} channel="NONE" />)

    expect(screen.getByText('알림 수단을 먼저 선택하세요')).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: '매매 알림' }))

    expect(toastInfoMock).toHaveBeenCalledWith('알림 수단을 먼저 선택해주세요')
    expect(mutateMock).not.toHaveBeenCalled()
  })
})
