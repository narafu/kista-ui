import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useFcmToken } from './useFcmToken'

const { requestFcmTokenMock } = vi.hoisted(() => ({
  requestFcmTokenMock: vi.fn(),
}))

vi.mock('../api', () => ({
  requestFcmToken: requestFcmTokenMock,
  registerTokenToServer: vi.fn(),
}))

describe('useFcmToken.getCachedToken', () => {
  beforeEach(() => {
    requestFcmTokenMock.mockReset()
  })

  it('아직 토큰을 취득하지 않았으면 null을 반환하고 새로 요청하지 않는다', () => {
    const { result } = renderHook(() => useFcmToken())

    expect(result.current.getCachedToken()).toBeNull()
    expect(requestFcmTokenMock).not.toHaveBeenCalled()
  })

  it('acquireToken으로 이미 취득한 토큰이 있으면 그 값을 반환한다', async () => {
    requestFcmTokenMock.mockResolvedValue('cached-token')
    const { result } = renderHook(() => useFcmToken())

    await act(async () => {
      await result.current.acquireToken()
    })

    expect(result.current.getCachedToken()).toBe('cached-token')
  })
})
