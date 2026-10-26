import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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

vi.mock('@entities/market', async (importOriginal) => ({
  CHART_CANDLE_COUNT: (await importOriginal<typeof import('@entities/market')>()).CHART_CANDLE_COUNT,
  useCandlesQuery: (ticker: string, count: number) => useCandlesQueryMock(ticker, count),
}))

const addSeriesMock = vi.fn((..._args: unknown[]) => ({ setData: vi.fn(), applyOptions: vi.fn(), createPriceLine: vi.fn() }))

const createChartMock = vi.fn()
const setVisibleLogicalRangeMock = vi.fn()

vi.mock('lightweight-charts', () => ({
  createChart: () => (createChartMock(), {
    addSeries: addSeriesMock,
    timeScale: () => ({ setVisibleLogicalRange: setVisibleLogicalRangeMock }),
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
  afterEach(() => {
    useCandlesQueryMock.mockReturnValue({ data: [] })
  })

  it('keeps the chart when a refetch fails but candles are already loaded', () => {
    const data = [{ date: '2026-10-01', open: 1, high: 2, low: 1, close: 2, volume: 0 }]
    useCandlesQueryMock.mockReturnValue({ data })
    const { rerender } = render(<MarketChartCardInner category={category} />)
    createChartMock.mockClear()

    useCandlesQueryMock.mockReturnValue({ data, isError: true })
    rerender(<MarketChartCardInner category={category} />)

    expect(screen.queryByText('시장 차트를 불러오지 못했습니다.')).not.toBeInTheDocument()
    expect(createChartMock).not.toHaveBeenCalled()
  })

  it('builds the chart in the container mounted once loading finishes', () => {
    const data = [{ date: '2026-10-01', open: 1, high: 2, low: 1, close: 2, volume: 0 }]
    useCandlesQueryMock.mockReturnValue({ data: undefined, isPending: true })
    const { rerender } = render(<MarketChartCardInner category={category} />)
    createChartMock.mockClear()

    useCandlesQueryMock.mockReturnValue({ data })
    rerender(<MarketChartCardInner category={category} />)

    expect(screen.getByRole('figure')).toBeInTheDocument()
    expect(createChartMock).toHaveBeenCalledTimes(1)
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

  it('queries 600 candles (up to 400 visible + MA200 lead) and selects 50 by default', () => {
    useCandlesQueryMock.mockClear()
    render(<MarketChartCardInner category={category} />)

    expect(useCandlesQueryMock).toHaveBeenCalledWith('SPY', 600)
    expect(screen.getByRole('button', { name: '50' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('MA200')).toBeInTheDocument()
  })

  it('shows only the latest 50 candles by default and widens the range when another count is picked', async () => {
    const data = Array.from({ length: 600 }, (_, i) => ({ date: `d${i}`, open: 1, high: 2, low: 1, close: 2, volume: 0 }))
    useCandlesQueryMock.mockReturnValue({ data })
    setVisibleLogicalRangeMock.mockClear()
    render(<MarketChartCardInner category={category} />)

    expect(setVisibleLogicalRangeMock).toHaveBeenLastCalledWith({ from: 549.5, to: 599.5 })

    await userEvent.setup().click(screen.getByRole('button', { name: '400' }))
    expect(setVisibleLogicalRangeMock).toHaveBeenLastCalledWith({ from: 199.5, to: 599.5 })
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
    expect(useCandlesQueryMock).toHaveBeenLastCalledWith('SPY', 600)
  })

  it('shows the RSI series on pane 1 by default and removes it when toggled off', async () => {
    useCandlesQueryMock.mockReturnValue({
      data: [{ date: '2026-10-01', open: 1, high: 2, low: 1, close: 2, volume: 0 }],
    })
    addSeriesMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    expect(screen.getByRole('button', { name: 'RSI' })).toHaveAttribute('aria-pressed', 'true')
    expect(addSeriesMock.mock.calls.some((call) => call[2] === 1)).toBe(true)

    addSeriesMock.mockClear()
    await user.click(screen.getByRole('button', { name: 'RSI' }))

    expect(screen.getByRole('button', { name: 'RSI' })).toHaveAttribute('aria-pressed', 'false')
    expect(addSeriesMock.mock.calls.some((call) => call[2] === 1)).toBe(false)
  })

  it('attaches a zone color to every RSI point in the overbought zone', () => {
    // 종가가 계속 오르면 RSI가 100 → 과매수 구간
    const data = Array.from({ length: 20 }, (_, i) => ({ date: `d${String(i).padStart(2, '0')}`, open: 1, high: 2, low: 1, close: 1 + i, volume: 0 }))
    useCandlesQueryMock.mockReturnValue({ data })
    addSeriesMock.mockClear()
    render(<MarketChartCardInner category={category} />)

    const rsiCall = addSeriesMock.mock.calls.findIndex((call) => call[2] === 1)
    const rsiSeries = addSeriesMock.mock.results[rsiCall].value
    const points = rsiSeries.setData.mock.calls[0][0] as { value: number; color: string }[]
    expect(points.length).toBeGreaterThan(0)
    expect(points.every((p) => p.value >= 70 && p.color)).toBe(true)
  })

  it('switches the queried symbol when a different option is selected', async () => {
    useCandlesQueryMock.mockClear()
    const user = userEvent.setup()
    render(<MarketChartCardInner category={category} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'QQQ · 나스닥 100' }))

    expect(useCandlesQueryMock).toHaveBeenLastCalledWith('QQQ', 600)
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
