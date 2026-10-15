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

const useCandlesQueryMock = vi.fn((_ticker: string, _count: number): { data: unknown[] | undefined; isError?: boolean; isPending?: boolean } => ({ data: [] }))

vi.mock('@entities/market', () => ({
  CHART_CANDLE_COUNT: 200,
  useCandlesQuery: (ticker: string, count: number) => useCandlesQueryMock(ticker, count),
}))

const addSeriesMock = vi.fn((..._args: unknown[]) => ({ setData: vi.fn(), applyOptions: vi.fn(), createPriceLine: vi.fn() }))

const createChartMock = vi.fn()

vi.mock('lightweight-charts', () => ({
  createChart: () => (createChartMock(), {
    addSeries: addSeriesMock,
    timeScale: () => ({ setVisibleLogicalRange: vi.fn() }),
    panes: () => [{ setHeight: vi.fn() }, { setHeight: vi.fn() }],
    applyOptions: vi.fn(),
    remove: vi.fn(),
  }),
  CandlestickSeries: {},
  LineSeries: {},
  LineStyle: { Dashed: 2 },
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
  it('rebuilds the chart in the new container when a failed refetch recovers with the same data', () => {
    const data = [{ date: '2026-10-01', open: 1, high: 2, low: 1, close: 2, volume: 0 }]
    useCandlesQueryMock.mockReturnValue({ data })
    const { rerender } = render(<MarketChartCardInner category={category} />)
    createChartMock.mockClear()

    useCandlesQueryMock.mockReturnValue({ data, isError: true })
    rerender(<MarketChartCardInner category={category} />)
    useCandlesQueryMock.mockReturnValue({ data })
    rerender(<MarketChartCardInner category={category} />)

    expect(createChartMock).toHaveBeenCalledTimes(1)
    useCandlesQueryMock.mockReturnValue({ data: [] })
  })

  it('distinguishes loading from an empty candle response', () => {
    useCandlesQueryMock.mockReturnValueOnce({ data: undefined, isPending: true })
    const { unmount } = render(<MarketChartCardInner category={category} />)
    expect(screen.getByText('차트 불러오는 중…')).toBeInTheDocument()
    unmount()

    useCandlesQueryMock.mockReturnValueOnce({ data: [] })
    render(<MarketChartCardInner category={category} />)
    expect(screen.getByText('표시할 시세가 없습니다.')).toBeInTheDocument()
  })

  it('queries candles for the first option at the default 200-candle count', () => {
    useCandlesQueryMock.mockClear()
    render(<MarketChartCardInner category={category} />)

    expect(useCandlesQueryMock).toHaveBeenCalledWith('SPY', 200)
  })

  it('shows the description label on the trigger for the initially selected option', () => {
    render(<MarketChartCardInner category={category} />)

    expect(screen.getByRole('combobox')).toHaveTextContent('SPY · S&P 500')
  })

  it('keeps querying the max candle count when a different count button is clicked', async () => {
    useCandlesQueryMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    await user.click(screen.getByRole('button', { name: '50' }))

    expect(screen.getByRole('button', { name: '50' })).toHaveAttribute('aria-pressed', 'true')
    expect(useCandlesQueryMock).toHaveBeenLastCalledWith('SPY', 200)
  })

  it('adds an RSI series on pane 1 only when the RSI toggle is on', async () => {
    useCandlesQueryMock.mockReturnValue({
      data: [{ date: '2026-10-01', open: 1, high: 2, low: 1, close: 2, volume: 0 }],
    })
    addSeriesMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    expect(addSeriesMock.mock.calls.some((call) => call[2] === 1)).toBe(false)

    await user.click(screen.getByRole('button', { name: 'RSI' }))

    expect(screen.getByRole('button', { name: 'RSI' })).toHaveAttribute('aria-pressed', 'true')
    expect(addSeriesMock.mock.calls.some((call) => call[2] === 1)).toBe(true)
    useCandlesQueryMock.mockReturnValue({ data: [] })
  })

  it('switches the queried symbol when a different option is selected', async () => {
    useCandlesQueryMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'QQQ · 나스닥 100' }))

    expect(useCandlesQueryMock).toHaveBeenLastCalledWith('QQQ', 200)
  })

  it('keeps the description label on the trigger after selecting an option', async () => {
    useCandlesQueryMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'QQQ · 나스닥 100' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('QQQ · 나스닥 100')
  })

  it('shows an explicit error fallback when candle data cannot be loaded', () => {
    useCandlesQueryMock.mockReturnValueOnce({ data: undefined, isError: true })

    render(<MarketChartCardInner category={category} />)

    expect(screen.getByText('시장 차트를 불러오지 못했습니다.')).toBeInTheDocument()
  })
})
