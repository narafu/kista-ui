import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { userKeys } from '@entities/user'
import { FcmBridge } from './FcmBridge'

vi.mock('@entities/fcm', () => ({
  FcmAutoRegister: () => <div data-testid="fcm-auto-register" />,
  FcmForegroundListener: () => <div data-testid="fcm-foreground-listener" />,
}))

function renderWithChannel(notificationChannel: string) {
  const client = new QueryClient()
  client.setQueryData(userKeys.me(), {
    id: 'u1', nickname: 'n', status: 'ACTIVE', hasTelegram: false,
    role: 'USER', notificationChannel,
  })
  return render(
    <QueryClientProvider client={client}>
      <FcmBridge />
    </QueryClientProvider>,
  )
}

describe('FcmBridge', () => {
  it('FCM 채널이면 FCM provider들을 마운트한다', () => {
    renderWithChannel('FCM')
    expect(screen.getByTestId('fcm-auto-register')).toBeInTheDocument()
    expect(screen.getByTestId('fcm-foreground-listener')).toBeInTheDocument()
  })

  it('TELEGRAM 채널이면 아무것도 렌더링하지 않는다', () => {
    renderWithChannel('TELEGRAM')
    expect(screen.queryByTestId('fcm-auto-register')).not.toBeInTheDocument()
  })
})
