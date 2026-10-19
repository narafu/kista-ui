import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CryptoMarketIndicators, CryptoTickerIndicators } from '@entities/market'
import { CryptoMarketSection } from './CryptoMarketSection'

const refetchMock = vi.fn()
const useQueryMock = vi.fn((): { data?: CryptoMarketIndicators; isError?: boolean; isFetching?: boolean; refetch?: () => void } => ({}))

vi.mock('@entities/market', () => ({
  useCryptoMarketIndicatorsQuery: () => useQueryMock(),
}))

// 차트는 next/dynamic(ssr:false)로 비동기 로드된다 — 이 스위트는 상태 분기만 보므로 동기 스텁으로 대체한다
vi.mock('next/dynamic', () => ({
  default: () => ({ title, series, data }: { title: string; series: { name: string }[]; data: readonly unknown[] }) => (
    <div data-points={data.length}>{title}: {series.map((s) => s.name).join(', ')}</div>
  ),
}))

function ticker(name: string, overrides: Partial<CryptoTickerIndicators> = {}): CryptoTickerIndicators {
  return {
    ticker: name,
    kimchiPremium: {
      current: { official: 3.2, tether: 1.1 },
      history: [{ date: '2026-10-18', official: 3.0, tether: 1.0 }],
    },
    fundingRate: { current: 0.0001, nextFundingTime: '2026-10-19T16:00:00Z', history: [{ date: '2026-10-18', value: 0.0001 }] },
    openInterest: { history: [{ date: '2026-10-18', valueUsd: 8_200_000_000 }] },
    valuation: {
      current: { date: '2026-10-18', close: 105_000, wma200: 52_500, wma200Multiple: 2.0, mayerMultiple: 1.234, athDrawdownPercent: -12.5 },
      history: [{ date: '2026-10-18', close: 105_000, wma200: 52_500, wma200Multiple: 2.0, mayerMultiple: 1.234, athDrawdownPercent: -12.5 }],
    },
    longShortRatio: { longAccount: 0.6234, longShortRatio: 1.654, history: [{ date: '2026-10-18', longAccount: 0.6234, longShortRatio: 1.654 }] },
    coinbasePremium: { current: -0.0098, history: [{ date: '2026-10-17', value: -0.0125 }, { date: '2026-10-18', value: -0.0079 }] },
    ...overrides,
  }
}

function indicators(overrides: Partial<CryptoMarketIndicators> = {}): CryptoMarketIndicators {
  return {
    asOf: '2026-10-19T05:00:00Z',
    usdtPremium: { current: 2.1, history: [{ date: '2026-10-18', value: 2.0 }] },
    tickers: [ticker('BTC'), ticker('ETH')],
    halving: { currentHeight: 972_175, nextHalvingHeight: 1_050_000, blocksRemaining: 77_825, estimatedAt: '2028-04-12T04:10:00Z' },
    ...overrides,
  }
}

const EMPTY_TICKER = { kimchiPremium: null, fundingRate: null, openInterest: null, valuation: null, longShortRatio: null, coinbasePremium: null }

describe('CryptoMarketSection', () => {
  beforeEach(() => {
    refetchMock.mockReset()
    useQueryMock.mockReset().mockReturnValue({})
  })

  it('shows current kimchi premium, tether decomposition, funding rate and OI for the first ticker', () => {
    useQueryMock.mockReturnValue({ data: indicators() })
    render(<CryptoMarketSection />)

    expect(screen.getByText('2026. 10. 19. 14:00 KST 기준')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'BTC', selected: true })).toBeInTheDocument()
    expect(screen.getByText('+3.20%')).toBeInTheDocument()
    expect(screen.getByText('+2.10%')).toBeInTheDocument() // 테더 프리미엄 분해
    expect(screen.getByText('+0.0100%')).toBeInTheDocument() // 펀딩비 비율 ×100
    expect(screen.getByText('01:00 KST')).toBeInTheDocument()
    expect(screen.getByText('$8.2B')).toBeInTheDocument()
  })

  it('shows the Coinbase premium as a separate card next to the kimchi premium', () => {
    useQueryMock.mockReturnValue({ data: indicators() })
    render(<CryptoMarketSection />)

    expect(screen.getByText('BTC Coinbase 프리미엄')).toBeInTheDocument()
    expect(screen.getByText('-0.0098%')).toBeInTheDocument()
    expect(screen.getByText(/^BTC Coinbase 프리미엄 추이/)).toHaveAttribute('data-points', '2')
  })

  it('keeps the section when only the Coinbase premium is available', () => {
    const coinbasePremium = { current: -0.0098, history: [{ date: '2026-10-18', value: -0.0079 }] }
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [{ ticker: 'BTC', ...EMPTY_TICKER, coinbasePremium }] }) })
    render(<CryptoMarketSection />)

    expect(screen.queryByText('코인 시장 지표를 불러오지 못했습니다.')).not.toBeInTheDocument()
    expect(screen.getByText(/^BTC Coinbase 프리미엄 추이/)).toBeInTheDocument()
  })

  it('marks only the Coinbase premium card as unavailable when that section failed', () => {
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { coinbasePremium: null })] }) })
    render(<CryptoMarketSection />)

    expect(screen.getAllByText('일시적으로 불러올 수 없습니다.')).toHaveLength(1)
    expect(screen.getByText('BTC Coinbase 프리미엄')).toBeInTheDocument()
    expect(screen.getByText(/^BTC 김치 프리미엄 추이/)).toBeInTheDocument()
  })

  it('shows long-term valuation with its daily-close date and the long/short account ratio', () => {
    useQueryMock.mockReturnValue({ data: indicators() })
    render(<CryptoMarketSection />)

    expect(screen.getByText('2.00x')).toBeInTheDocument() // 200주 배수
    expect(screen.getByText('1.23x')).toBeInTheDocument() // 메이어 멀티플
    expect(screen.getByText('-12.50%')).toBeInTheDocument() // ATH 대비
    expect(screen.getByText('2026.10.18 UTC 종가 기준')).toBeInTheDocument()
    expect(screen.getByText('62.3%')).toBeInTheDocument()
    expect(screen.getByText('1.65')).toBeInTheDocument()
    expect(screen.getByText('BTC 장기 밸류에이션 추이: 200주 배수, 메이어 멀티플')).toBeInTheDocument()
    expect(screen.getByText('BTC 롱/숏 비율 추이: 롱/숏')).toBeInTheDocument()
  })

  it('never shows a positive drawdown on an all-time-high day', () => {
    const point = { date: '2026-10-18', close: 126_000, wma200: 52_500, wma200Multiple: 2.4, mayerMultiple: 1.5, athDrawdownPercent: 0 }
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { valuation: { current: point, history: [point] } })] }) })
    render(<CryptoMarketSection />)

    expect(screen.getByText('0.00%')).toBeInTheDocument()
    expect(screen.queryByText('+0.00%')).not.toBeInTheDocument()
  })

  it('never shows a negative zero for values that round to zero', () => {
    const point = { date: '2026-10-18', close: 125_990, wma200: 52_500, wma200Multiple: 2.4, mayerMultiple: 1.5, athDrawdownPercent: -0.001 }
    useQueryMock.mockReturnValue({
      data: indicators({
        tickers: [ticker('BTC', {
          kimchiPremium: { current: { official: null, tether: -0.001 }, history: [{ date: '2026-10-18', official: null, tether: -0.001 }] },
          valuation: { current: point, history: [point] },
        })],
      }),
    })
    render(<CryptoMarketSection />)

    expect(screen.getByText('+0.00%')).toBeInTheDocument() // 테더 기준 김프
    expect(screen.getByText('0.00%')).toBeInTheDocument() // ATH 대비는 양수로 읽히지 않게 부호 없이
    expect(screen.queryByText('-0.00%')).not.toBeInTheDocument()
  })

  it('shows a dash for a valuation multiple the server could not compute', () => {
    const point = { date: '2026-10-18', close: 105_000, wma200: null, wma200Multiple: null, mayerMultiple: 1.234, athDrawdownPercent: -12.5 }
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { valuation: { current: point, history: [point] } })] }) })
    render(<CryptoMarketSection />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('1.23x')).toBeInTheDocument()
  })

  it('shows the halving countdown in the section header on every ticker tab', async () => {
    useQueryMock.mockReturnValue({ data: indicators() })
    render(<CryptoMarketSection />)
    const user = userEvent.setup()

    expect(screen.getByText('약 541일 후')).toBeInTheDocument() // asOf 2026-10-19T05:00Z → 2028-04-12T04:10Z
    expect(screen.getByRole('progressbar', { name: '이번 반감기 주기 진행률' })).toHaveAttribute('aria-valuenow', '63')
    // 남은 블록·예상 날짜는 설명 팝오버로 옮겼다
    await user.click(screen.getByRole('button', { name: 'BTC 반감기 설명' }))
    expect(await screen.findByText(/2028\. 4\. 12\. 전후/)).toBeInTheDocument()
    expect(screen.getByText(/남은 블록 77,825/)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('tab', { name: 'ETH' }))
    expect(screen.getByText('BTC 반감기')).toBeInTheDocument()
  })

  it('hides the halving countdown instead of warning when block height failed', () => {
    useQueryMock.mockReturnValue({ data: indicators({ halving: null }) })
    render(<CryptoMarketSection />)

    expect(screen.queryByText('BTC 반감기')).not.toBeInTheDocument()
    expect(screen.queryByText('일시적으로 불러올 수 없습니다.')).not.toBeInTheDocument()
  })

  it('keeps the halving countdown above the whole-area error', () => {
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [{ ticker: 'BTC', ...EMPTY_TICKER }] }) })
    render(<CryptoMarketSection />)

    expect(screen.getByText('코인 시장 지표를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.getByText('BTC 반감기')).toBeInTheDocument()
  })

  it('switches every card to the selected ticker', async () => {
    useQueryMock.mockReturnValue({ data: indicators() })
    render(<CryptoMarketSection />)

    await userEvent.setup().click(screen.getByRole('tab', { name: 'ETH' }))

    expect(screen.getByText('ETH 김치 프리미엄')).toBeInTheDocument()
    expect(screen.getByText('ETH 펀딩비')).toBeInTheDocument()
    expect(screen.queryByText('BTC 김치 프리미엄')).not.toBeInTheDocument()
  })

  it('marks only the failed section as unavailable', () => {
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { fundingRate: null })] }) })
    render(<CryptoMarketSection />)

    expect(screen.getAllByText('일시적으로 불러올 수 없습니다.')).toHaveLength(1)
    expect(screen.getByText(/^BTC 김치 프리미엄 추이/)).toBeInTheDocument()
    expect(screen.getByText(/^BTC 미결제약정 추이/)).toBeInTheDocument()
  })

  it('marks only the failed valuation and long/short cards as unavailable', () => {
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { valuation: null, longShortRatio: null })] }) })
    render(<CryptoMarketSection />)

    expect(screen.getAllByText('일시적으로 불러올 수 없습니다.')).toHaveLength(2)
    expect(screen.getByText('BTC 장기 밸류에이션')).toBeInTheDocument()
    expect(screen.getByText('BTC 롱/숏 비율')).toBeInTheDocument()
    expect(screen.getByText(/^BTC 펀딩비 일평균 추이/)).toBeInTheDocument()
  })

  it('keeps the section when only the new sections are available', () => {
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { kimchiPremium: null, fundingRate: null, openInterest: null })] }) })
    render(<CryptoMarketSection />)

    expect(screen.queryByText('코인 시장 지표를 불러오지 못했습니다.')).not.toBeInTheDocument()
    expect(screen.getByText(/^BTC 장기 밸류에이션 추이/)).toBeInTheDocument()
  })

  it('hides the official premium and its decomposition when only the exchange rate failed', () => {
    useQueryMock.mockReturnValue({
      data: indicators({
        usdtPremium: null,
        tickers: [ticker('BTC', { kimchiPremium: { current: { official: null, tether: 1.1 }, history: [{ date: '2026-10-18', official: null, tether: 1.0 }] } })],
      }),
    })
    render(<CryptoMarketSection />)

    expect(screen.queryByText('공식 환율 기준')).not.toBeInTheDocument()
    expect(screen.queryByText(/테더 프리미엄/)).not.toBeInTheDocument()
    expect(screen.getByText('+1.10%')).toBeInTheDocument()
    expect(screen.getByText('환율을 불러오지 못해 공식 환율 기준 값을 표시하지 않습니다.')).toBeInTheDocument()
    expect(screen.getByText('BTC 김치 프리미엄 추이: 테더 기준')).toBeInTheDocument()
  })

  it('shows the whole-area error when every section is null even though the response is 200', () => {
    // 테더 프리미엄만 살아 있어도 김프 카드의 분해 표시로만 쓰여 단독으로 보여줄 자리가 없다
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', EMPTY_TICKER), ticker('ETH', EMPTY_TICKER)] }) })
    render(<CryptoMarketSection />)

    expect(screen.getByText('코인 시장 지표를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('shows the whole-area error with a retry when the request itself fails', async () => {
    useQueryMock.mockReturnValue({ isError: true, refetch: refetchMock })
    render(<CryptoMarketSection />)

    expect(screen.getByText('코인 시장 지표를 불러오지 못했습니다.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '다시 시도' }))
    expect(refetchMock).toHaveBeenCalled()
  })

  it('shows progress instead of firing duplicate requests while retrying', async () => {
    useQueryMock.mockReturnValue({ isError: true, isFetching: true, refetch: refetchMock })
    render(<CryptoMarketSection />)

    await userEvent.setup().click(screen.getByRole('button', { name: '불러오는 중…' }))
    expect(refetchMock).not.toHaveBeenCalled()
  })

  it('resets the tab selection when the ticker set changes so cards never disappear', async () => {
    useQueryMock.mockReturnValue({ data: indicators() })
    const { rerender } = render(<CryptoMarketSection />)
    await userEvent.setup().click(screen.getByRole('tab', { name: 'ETH' }))

    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC')] }) })
    rerender(<CryptoMarketSection />)

    expect(screen.getByRole('tab', { name: 'BTC', selected: true })).toBeInTheDocument()
    expect(screen.getByText('BTC 김치 프리미엄')).toBeInTheDocument()
  })

  it('treats a response without any ticker as a whole-area failure', () => {
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [] }) })
    render(<CryptoMarketSection />)

    expect(screen.getByText('코인 시장 지표를 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('keeps the official history line when only today\'s exchange rate is missing', () => {
    useQueryMock.mockReturnValue({
      data: indicators({
        tickers: [ticker('BTC', { kimchiPremium: { current: { official: null, tether: 1.1 }, history: [{ date: '2026-10-18', official: 3.0, tether: 1.0 }] } })],
      }),
    })
    render(<CryptoMarketSection />)

    expect(screen.queryByText('공식 환율 기준')).not.toBeInTheDocument()
    expect(screen.getByText('BTC 김치 프리미엄 추이: 공식 환율 기준, 테더 기준')).toBeInTheDocument()
  })

  it('shows only the latest N days for the selected range of each card', async () => {
    const history = Array.from({ length: 365 }, (_, i) => ({ date: `d${i}`, official: 3.0, tether: 1.0 }))
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { kimchiPremium: { current: { official: 3.2, tether: 1.1 }, history } })] }) })
    render(<CryptoMarketSection />)

    const chart = screen.getByText(/^BTC 김치 프리미엄 추이/)
    expect(chart).toHaveAttribute('data-points', '365')
    const toggle = screen.getByRole('group', { name: 'BTC 김치 프리미엄 조회 기간(일)' })
    await userEvent.setup().click(within(toggle).getByRole('button', { name: '30' }))
    expect(chart).toHaveAttribute('data-points', '30')
  })

  it('applies the range to the funding rate chart independently of the kimchi premium chart', async () => {
    const history = Array.from({ length: 365 }, (_, i) => ({ date: `d${i}`, value: 0.0001 }))
    useQueryMock.mockReturnValue({ data: indicators({ tickers: [ticker('BTC', { fundingRate: { current: 0.0001, nextFundingTime: '2026-10-19T16:00:00Z', history } })] }) })
    render(<CryptoMarketSection />)

    const chart = screen.getByText(/^BTC 펀딩비 일평균 추이/)
    const toggle = screen.getByRole('group', { name: 'BTC 펀딩비 조회 기간(일)' })
    await userEvent.setup().click(within(toggle).getByRole('button', { name: '90' }))
    expect(chart).toHaveAttribute('data-points', '90')
    expect(within(screen.getByRole('group', { name: 'BTC 김치 프리미엄 조회 기간(일)' })).getByRole('button', { name: '365' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps showing cached data when a refetch fails', () => {
    useQueryMock.mockReturnValue({ data: indicators(), isError: true })
    render(<CryptoMarketSection />)

    expect(screen.queryByText('코인 시장 지표를 불러오지 못했습니다.')).not.toBeInTheDocument()
    expect(screen.getByText('BTC 김치 프리미엄')).toBeInTheDocument()
  })
})
