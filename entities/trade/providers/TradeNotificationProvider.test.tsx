import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TradeNotificationProvider } from './TradeNotificationProvider'
import type { TradeEvent } from '@entities/trade'
import { TradeToast } from './TradeToast'

const { refreshMock, toastCustomMock } = vi.hoisted(() => ({ refreshMock: vi.fn(), toastCustomMock: vi.fn() }))

// 체결 시 서버 렌더 재요청(router.refresh)을 하지 않는다는 회귀 방지용
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: { custom: toastCustomMock },
}))

// vitest.setup.ts의 MockEventSource 참조
declare const EventSource: {
  instances: Array<{
    url: string
    close: () => void
    emit: (type: string, data: string) => void
  }>
}

describe('TradeNotificationProvider', () => {
  beforeEach(() => {
    refreshMock.mockClear()
    toastCustomMock.mockClear()
    EventSource.instances = []
  })

  it('마운트 시 /api/trades/stream을 구독한다', () => {
    render(<TradeNotificationProvider />)

    expect(EventSource.instances).toHaveLength(1)
    expect(EventSource.instances[0].url).toBe('/api/trades/stream')
  })

  it('trade 이벤트 수신 시 toast를 표시하고 라우트는 refresh하지 않는다', () => {
    render(<TradeNotificationProvider />)
    const source = EventSource.instances[0]
    const event: TradeEvent = { kind: 'BUY', ticker: 'TQQQ', time: '2026-01-01T00:00:00Z', accountNickname: '계좌1' }

    source.emit('trade', JSON.stringify(event))

    expect(toastCustomMock).toHaveBeenCalledTimes(1)
    expect(toastCustomMock).toHaveBeenCalledWith(expect.any(Function), { duration: 6000 })
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('trade 이벤트 수신 시 주입된 onTrade에 이벤트를 넘긴다', () => {
    const onTrade = vi.fn()
    render(<TradeNotificationProvider onTrade={onTrade} />)
    const event: TradeEvent = { kind: 'SELL', ticker: 'SOXL', time: '2026-01-01T00:00:00Z', accountNickname: '계좌1' }

    EventSource.instances[0].emit('trade', JSON.stringify(event))

    expect(onTrade).toHaveBeenCalledWith(event)
  })

  it('onTrade가 바뀌어도 SSE를 재연결하지 않는다', () => {
    const { rerender } = render(<TradeNotificationProvider onTrade={vi.fn()} />)
    rerender(<TradeNotificationProvider onTrade={vi.fn()} />)

    expect(EventSource.instances).toHaveLength(1)
  })

  it('trade 이벤트 payload가 JSON parse 불가면 무시하고 예외를 던지지 않는다', () => {
    render(<TradeNotificationProvider />)
    const source = EventSource.instances[0]

    expect(() => source.emit('trade', '{not-json')).not.toThrow()
    expect(toastCustomMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })

  it('auth-error 수신 시 연결을 닫는다 (재연결 중단)', () => {
    render(<TradeNotificationProvider />)
    const source = EventSource.instances[0]
    const closeSpy = vi.spyOn(source, 'close')

    source.emit('auth-error', '')

    expect(closeSpy).toHaveBeenCalled()
  })

  it('언마운트 시 EventSource 연결을 닫는다', () => {
    const { unmount } = render(<TradeNotificationProvider />)
    const source = EventSource.instances[0]
    const closeSpy = vi.spyOn(source, 'close')

    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })
})

describe('TradeToast 가격 통화', () => {
  const base: TradeEvent = { kind: 'BUY', ticker: 'BTC', quantity: 1, price: 1500000, time: '2026-10-24T00:00:00Z', accountNickname: '내 계좌' }
  it('currency가 없으면 달러로 표시한다', () => {
    render(<TradeToast event={{ ...base, price: 87.4 }} />)
    expect(screen.getByText(/@ \$87\.40/)).toBeInTheDocument()
  })
  it('업비트 KRW는 원으로 표시한다(달러 기호 결함 회귀)', () => {
    render(<TradeToast event={{ ...base, currency: 'KRW' }} />)
    expect(screen.getByText(/@ 1,500,000원/)).toBeInTheDocument()
  })
  it('바이낸스 USDT는 USDT로 표시한다', () => {
    render(<TradeToast event={{ ...base, price: 65000.5, currency: 'USDT' }} />)
    expect(screen.getByText(/@ 65,000\.50 USDT/)).toBeInTheDocument()
  })
  it('코인 수량은 주 단위 없이 소수로, 주식은 주 단위로 표시한다', () => {
    const { unmount } = render(<TradeToast event={{ ...base, quantity: 0.00012, price: 65000.5, currency: 'USDT' }} />)
    expect(screen.getByText(/^BTC 0\.00012 @/)).toBeInTheDocument()
    unmount()
    render(<TradeToast event={{ ...base, ticker: 'SOXL', quantity: 3, price: 20 }} />)
    expect(screen.getByText(/^SOXL 3주 @/)).toBeInTheDocument()
  })
})
