import { describe, expect, it, vi, beforeEach } from 'vitest'
import { unregisterTokenFromServer } from './index'

const { clientFetchMock } = vi.hoisted(() => ({
  clientFetchMock: vi.fn(),
}))

vi.mock('@shared/lib/api-client', () => ({
  clientFetch: clientFetchMock,
  jsonBody: (method: string, body: unknown) => ({ method, body: JSON.stringify(body) }),
}))

describe('unregisterTokenFromServer', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
  })

  it('URL 인코딩된 토큰 경로로 DELETE 요청을 보낸다', async () => {
    clientFetchMock.mockResolvedValue(undefined)

    await unregisterTokenFromServer('token/with special+chars')

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/fcm/tokens/token%2Fwith%20special%2Bchars',
      { method: 'DELETE' },
    )
  })
})
