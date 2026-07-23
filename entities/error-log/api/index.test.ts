import { describe, expect, it, vi, beforeEach } from 'vitest'
import { reportClientError } from './index'

const { clientFetchMock, jsonBodyMock } = vi.hoisted(() => ({
  clientFetchMock: vi.fn(),
  jsonBodyMock: vi.fn((method: string, body: unknown) => ({ method, body })),
}))

vi.mock('@shared/lib/api-client', () => ({
  clientFetch: clientFetchMock,
  jsonBody: jsonBodyMock,
}))

describe('entities/error-log/api reportClientError', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
    jsonBodyMock.mockClear()
  })

  it('POST /api/client-errors로 전달한다', async () => {
    clientFetchMock.mockResolvedValue(undefined)

    await reportClientError({ errorType: 'TypeError', message: 'boom' })

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/client-errors',
      { method: 'POST', body: { errorType: 'TypeError', message: 'boom' } },
    )
  })

  it('요청 실패는 무시하고 throw하지 않는다', async () => {
    clientFetchMock.mockRejectedValue(new Error('network error'))

    await expect(reportClientError({ errorType: 'TypeError' })).resolves.toBeUndefined()
  })
})
