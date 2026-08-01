import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FcmAutoRegister } from './FcmAutoRegister'

const requestFcmToken = vi.fn().mockResolvedValue('tok')
const registerTokenToServer = vi.fn().mockResolvedValue(undefined)
vi.mock('@entities/fcm', () => ({
  requestFcmToken: (...args: unknown[]) => requestFcmToken(...args),
  registerTokenToServer: (...args: unknown[]) => registerTokenToServer(...args),
}))

describe('FcmAutoRegister', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('권한이 granted인 기기에서만 자동 등록한다', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    render(<FcmAutoRegister notificationChannel="FCM" />)
    await vi.waitFor(() => expect(requestFcmToken).toHaveBeenCalled())
  })

  it('권한 미결정(default) 기기에서는 권한 팝업을 유발하지 않는다', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    render(<FcmAutoRegister notificationChannel="FCM" />)
    expect(requestFcmToken).not.toHaveBeenCalled()
  })
})
