import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { MarketChartCategory } from './marketChartCategories'
import MarketChartCardInner from './MarketChartCardInner'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillStyle: '',
    fillRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) })),
  } as unknown as CanvasRenderingContext2D)
})

const useCandlesQueryMock = vi.fn((_ticker: string, _count: number) => ({ data: [] }))

vi.mock('@entities/market', () => ({
  useCandlesQuery: (ticker: string, count: number) => useCandlesQueryMock(ticker, count),
}))

vi.mock('lightweight-charts', () => ({
  createChart: () => ({
    addSeries: () => ({ setData: vi.fn(), applyOptions: vi.fn() }),
    timeScale: () => ({ fitContent: vi.fn() }),
    applyOptions: vi.fn(),
    remove: vi.fn(),
  }),
  CandlestickSeries: {},
  ColorType: { Solid: 'solid' },
}))

const category: MarketChartCategory = {
  title: '주식형 자산',
  options: [
    { symbol: 'SPY', label: 'SPY · S&P 500', description: 'S&P 500 추종' },
    { symbol: 'QQQ', label: 'QQQ · 나스닥 100', description: '나스닥 100 추종' },
  ],
}

describe('MarketChartCardInner', () => {
  it('queries candles for the first option at the default 200-candle count', () => {
    useCandlesQueryMock.mockClear()
    render(<MarketChartCardInner category={category} />)

    expect(useCandlesQueryMock).toHaveBeenCalledWith('SPY', 200)
  })

  it('switches the candle count query when a different count button is clicked', async () => {
    useCandlesQueryMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    await user.click(screen.getByRole('button', { name: '50' }))

    expect(useCandlesQueryMock).toHaveBeenLastCalledWith('SPY', 50)
  })

  it('switches the queried symbol when a different option is selected', async () => {
    useCandlesQueryMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'QQQ · 나스닥 100' }))

    expect(useCandlesQueryMock).toHaveBeenLastCalledWith('QQQ', 200)
  })
})
