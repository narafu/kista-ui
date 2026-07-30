import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { NotificationSettings } from './NotificationSettings'

const {
  refreshMock,
  mutateAsyncMock,
  getCachedTokenMock,
  acquireTokenMock,
  unregisterTokenFromServerMock,
  registerTokenToServerMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  getCachedTokenMock: vi.fn(),
  acquireTokenMock: vi.fn(),
  unregisterTokenFromServerMock: vi.fn(),
  registerTokenToServerMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@entities/user', () => ({
  useUpdateNotificationChannelMutation: () => ({ mutateAsync: mutateAsyncMock }),
}))

vi.mock('@entities/fcm', () => ({
  useFcmToken: () => ({
    status: 'idle',
    prewarm: vi.fn(),
    acquireToken: acquireTokenMock,
    getCachedToken: getCachedTokenMock,
  }),
  registerTokenToServer: registerTokenToServerMock,
  unregisterTokenFromServer: unregisterTokenFromServerMock,
}))

describe('NotificationSettings — FCM 해제', () => {
  beforeEach(() => {
    refreshMock.mockClear()
    mutateAsyncMock.mockClear().mockResolvedValue(undefined)
    getCachedTokenMock.mockClear().mockReturnValue(null)
    acquireTokenMock.mockClear()
    unregisterTokenFromServerMock.mockClear().mockResolvedValue(undefined)
    registerTokenToServerMock.mockClear()
    // jsdom에는 Notification/PushManager가 없음 — FCM 등록 분기의 브라우저 지원 가드를 통과시키기 위해 스텁
    vi.stubGlobal('Notification', {})
    vi.stubGlobal('PushManager', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('현재 알림 수단을 선택 상태와 체크로 표시한다', () => {
    render(<NotificationSettings currentChannel="FCM" hasTelegram={false} />)

    expect(screen.getByRole('button', { name: /푸시 알림/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
  })

  it('FCM에서 NONE으로 전환하고 캐시된 토큰이 있으면 서버에서 해제한다', async () => {
    getCachedTokenMock.mockReturnValue('cached-token')
    const user = userEvent.setup()
    render(<NotificationSettings currentChannel="FCM" hasTelegram={false} />)

    await user.click(screen.getByRole('button', { name: /끄기/ }))

    expect(mutateAsyncMock).toHaveBeenCalledWith('NONE')
    expect(unregisterTokenFromServerMock).toHaveBeenCalledWith('cached-token')
    expect(acquireTokenMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('ALL에서 TELEGRAM으로 전환하고 캐시된 토큰이 없으면 해제를 호출하지 않는다', async () => {
    getCachedTokenMock.mockReturnValue(null)
    const user = userEvent.setup()
    render(<NotificationSettings currentChannel="ALL" hasTelegram={true} />)

    // 버튼 접근성 이름은 label+desc 텍스트가 이어붙어 계산된다 — "모두" 버튼의 desc("텔레그램 + 푸시 동시 수신")도
    // "텔레그램"을 포함하므로 /텔레그램/만으로는 두 버튼과 모두 매칭된다. label이 "텔레그램"으로 시작하는 버튼만 선택하도록 앵커 처리.
    await user.click(screen.getByRole('button', { name: /^텔레그램/ }))

    expect(mutateAsyncMock).toHaveBeenCalledWith('TELEGRAM')
    expect(unregisterTokenFromServerMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('TELEGRAM에서 FCM으로 전환(등록)할 때는 해제를 호출하지 않는다', async () => {
    acquireTokenMock.mockResolvedValue('new-token')
    registerTokenToServerMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<NotificationSettings currentChannel="TELEGRAM" hasTelegram={true} />)

    await user.click(screen.getByRole('button', { name: /푸시 알림/ }))

    expect(registerTokenToServerMock).toHaveBeenCalledWith('new-token')
    expect(unregisterTokenFromServerMock).not.toHaveBeenCalled()
  })
})
