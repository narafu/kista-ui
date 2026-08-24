import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
}))

describe('backtest api', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
  })

  it('getBacktest builds query string with required params only', async () => {
    const { getBacktest } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [], summary: {}, warnings: [] })

    await getBacktest({
      type: 'INFINITE',
      ticker: 'TQQQ',
      from: '2026-01-01',
      to: '2026-06-01',
      seed: 10000,
    })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/backtest?type=INFINITE&ticker=TQQQ&from=2026-01-01&to=2026-06-01&seed=10000',
      { method: 'GET' },
      undefined
    )
  })

  it('getBacktest includes VR-only params when provided', async () => {
    const { getBacktest } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [], summary: {}, warnings: [] })

    await getBacktest({
      type: 'VR',
      ticker: 'TQQQ',
      from: '2026-01-01',
      to: '2026-06-01',
      seed: 10000,
      vrBandWidth: 15,
      vrIntervalWeeks: 4,
      vrRecurringAmount: 0,
      vrInitialValue: 5000,
    })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/backtest?type=VR&ticker=TQQQ&from=2026-01-01&to=2026-06-01&seed=10000&vrBandWidth=15&vrIntervalWeeks=4&vrRecurringAmount=0&vrInitialValue=5000',
      { method: 'GET' },
      undefined
    )
  })
})
