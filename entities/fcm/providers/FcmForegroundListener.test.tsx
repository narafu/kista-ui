import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FcmForegroundListener } from './FcmForegroundListener'

type MessagePayload = {
  notification?: {
    title?: string
    body?: string
    image?: string
  }
}

const { getFirebaseMessagingMock, onMessageMock } = vi.hoisted(() => ({
  getFirebaseMessagingMock: vi.fn(),
  onMessageMock: vi.fn(),
}))

vi.mock('@shared/lib/firebase', () => ({
  getFirebaseMessaging: getFirebaseMessagingMock,
}))

vi.mock('firebase/messaging', () => ({
  onMessage: onMessageMock,
}))

describe('FcmForegroundListener', () => {
  beforeEach(() => {
    getFirebaseMessagingMock.mockReset()
    onMessageMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('foreground FCM 메시지를 서비스 워커 알림으로 표시한다', async () => {
    const messaging = { app: 'firebase-app' }
    const handlers: Array<(payload: MessagePayload) => void> = []
    const notificationMock = vi.fn()
    const showNotification = vi.fn().mockResolvedValue(undefined)

    getFirebaseMessagingMock.mockReturnValue(messaging)
    onMessageMock.mockImplementation((_messaging, callback) => {
      handlers.push(callback)
      return vi.fn()
    })
    vi.stubGlobal('Notification', Object.assign(notificationMock, { permission: 'granted' }))
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({ showNotification }) },
    })

    render(<FcmForegroundListener enabled />)
    expect(handlers).toHaveLength(1)
    const handleMessage = handlers[0]
    handleMessage({ notification: { title: '장 마감', body: '오늘 거래가 종료되었습니다.' } })

    await waitFor(() => {
      expect(showNotification).toHaveBeenCalledWith('장 마감', {
        body: '오늘 거래가 종료되었습니다.',
        icon: '/icon-192.png',
      })
    })
    expect(notificationMock).not.toHaveBeenCalled()
  })

  it('FCM을 사용하지 않는 채널이면 foreground 구독을 만들지 않는다', () => {
    getFirebaseMessagingMock.mockReturnValue({ app: 'firebase-app' })

    render(<FcmForegroundListener enabled={false} />)

    expect(getFirebaseMessagingMock).not.toHaveBeenCalled()
    expect(onMessageMock).not.toHaveBeenCalled()
  })

  it('언마운트 시 foreground FCM 구독을 해제한다', () => {
    const unsubscribe = vi.fn()

    getFirebaseMessagingMock.mockReturnValue({ app: 'firebase-app' })
    onMessageMock.mockReturnValue(unsubscribe)
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'granted' }))

    const { unmount } = render(<FcmForegroundListener enabled />)
    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('Firebase Messaging을 사용할 수 없으면 foreground 구독을 만들지 않는다', () => {
    getFirebaseMessagingMock.mockReturnValue(null)
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'granted' }))

    render(<FcmForegroundListener enabled />)

    expect(onMessageMock).not.toHaveBeenCalled()
  })
})
