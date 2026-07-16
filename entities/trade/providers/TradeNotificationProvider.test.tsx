import { render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { TradeNotificationProvider } from './TradeNotificationProvider'
import type { TradeEvent } from '@entities/trade'

const { refreshMock, toastCustomMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastCustomMock: vi.fn(),
}))

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

  it('trade 이벤트 수신 시 toast를 표시하고 라우트를 refresh한다', () => {
    render(<TradeNotificationProvider />)
    const source = EventSource.instances[0]
    const event: TradeEvent = { kind: 'BUY', ticker: 'TQQQ', time: '2026-01-01T00:00:00Z', accountNickname: '계좌1' }

    source.emit('trade', JSON.stringify(event))

    expect(toastCustomMock).toHaveBeenCalledTimes(1)
    expect(toastCustomMock).toHaveBeenCalledWith(expect.any(Function), { duration: 6000 })
    expect(refreshMock).toHaveBeenCalledTimes(1)
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
