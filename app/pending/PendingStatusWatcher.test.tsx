import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { PendingStatusWatcher } from './PendingStatusWatcher'

// next/navigation mock — useRouter는 push 함수를 반환
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// vitest.setup.ts의 MockEventSource 참조
declare const EventSource: {
  instances: Array<{ emit: (type: string, data: string) => void; onerror: ((e: Event) => void) | null; readyState: number }>
}

describe('PendingStatusWatcher', () => {
  beforeEach(() => {
    mockPush.mockClear()
    EventSource.instances = []
  })

  it('렌더링 시 null 반환 (DOM 요소 없음)', () => {
    const { container } = render(<PendingStatusWatcher />)
    expect(container.firstChild).toBeNull()
  })

  it('status 이벤트에서 ACTIVE 수신 시 /dashboard로 이동', () => {
    render(<PendingStatusWatcher />)

    const source = EventSource.instances[0]
    source.emit('status', 'ACTIVE')

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('status 이벤트에서 REJECTED 수신 시 /rejected로 이동', () => {
    render(<PendingStatusWatcher />)

    const source = EventSource.instances[0]
    source.emit('status', 'REJECTED')

    expect(mockPush).toHaveBeenCalledWith('/rejected')
  })

  it('PENDING 이벤트에는 navigate 미호출', () => {
    render(<PendingStatusWatcher />)

    const source = EventSource.instances[0]
    source.emit('status', 'PENDING')

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('연결 오류에도 닫지 않음 — 브라우저 자동 재연결(kista-api 교체로 스트림이 끊겨도 이어짐)', () => {
    render(<PendingStatusWatcher />)

    const source = EventSource.instances[0]
    source.onerror?.(new Event('error'))

    expect(source.readyState).not.toBe(2)
  })
})
