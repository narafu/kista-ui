import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const apiFetchMock = vi.fn()
const clientFetchMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  clientFetch: (...args: unknown[]) => clientFetchMock(...args),
}))

describe('market api', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    clientFetchMock.mockReset()
    // API_BASE_URL은 모듈 top-level에서 1회 평가되므로, env 스텁이 반영되도록 매 테스트 재-import한다
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getMonthlyHolidays (Server Component) requests the year/month query via apiFetch', async () => {
    const { getMonthlyHolidays } = await import('./index')
    apiFetchMock.mockResolvedValueOnce(['2026-01-01'])

    const result = await getMonthlyHolidays(2026, 1, 'token-1')

    expect(apiFetchMock).toHaveBeenCalledWith('/api/market/holidays?year=2026&month=1', { method: 'GET' }, 'token-1')
    expect(result).toEqual(['2026-01-01'])
  })

  it('getMonthlyHolidaysClient requests via clientFetch (Route Handler proxy)', async () => {
    const { getMonthlyHolidaysClient } = await import('./index')
    clientFetchMock.mockResolvedValueOnce(['2026-02-14'])

    const result = await getMonthlyHolidaysClient(2026, 2)

    expect(clientFetchMock).toHaveBeenCalledWith('/api/market/holidays?year=2026&month=2')
    expect(result).toEqual(['2026-02-14'])
  })

  it('getMonthlyHolidaysPublic (unauthenticated) calls kista-api directly and returns json on success', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://kista-api.fly.dev')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(['2026-03-01']) })
    vi.stubGlobal('fetch', fetchMock)

    const { getMonthlyHolidaysPublic } = await import('./index')
    const result = await getMonthlyHolidaysPublic(2026, 3)

    expect(fetchMock).toHaveBeenCalledWith('https://kista-api.fly.dev/api/market/holidays?year=2026&month=3')
    expect(result).toEqual(['2026-03-01'])
  })

  it('getMonthlyHolidaysPublic swallows non-ok responses and network errors into an empty array', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://kista-api.fly.dev')
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    vi.stubGlobal('fetch', fetchMock)

    const { getMonthlyHolidaysPublic } = await import('./index')
    const result = await getMonthlyHolidaysPublic(2026, 4)

    expect(result).toEqual([])
  })

  it('getCandlesClient defaults count to CHART_CANDLE_COUNT (200) and builds ticker query', async () => {
    const { getCandlesClient } = await import('./index')
    clientFetchMock.mockResolvedValueOnce([])

    await getCandlesClient('TQQQ')

    expect(clientFetchMock).toHaveBeenCalledWith('/api/market/candles?ticker=TQQQ&count=200')
  })

  it('getFearGreedClient and getMarketSessionClient hit their respective endpoints', async () => {
    const { getFearGreedClient, getMarketSessionClient } = await import('./index')
    clientFetchMock.mockResolvedValueOnce({ value: 50 })
    clientFetchMock.mockResolvedValueOnce({ session: 'DIRECT', isDst: true })

    await getFearGreedClient(30)
    const session = await getMarketSessionClient()

    expect(clientFetchMock).toHaveBeenCalledWith('/api/market/fear-greed?days=30')
    expect(clientFetchMock).toHaveBeenCalledWith('/api/market/session')
    expect(session).toEqual({ session: 'DIRECT', isDst: true })
  })
})
