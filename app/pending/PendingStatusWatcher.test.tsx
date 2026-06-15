import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { PendingStatusWatcher } from './PendingStatusWatcher'

// next/navigation mock — useRouter는 push 함수를 반환
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// vitest.setup.ts의 MockEventSource 참조
declare const EventSource: { instances: Array<{ emit: (type: string, data: string) => void }> }

describe('PendingStatusWatcher', () => {
  beforeEach(() => {
    mockPush.mockClear()
    // @ts-ignore — setup.ts에서 정의한 MockEventSource 초기화
    EventSource.instances = []
  })

  it('렌더링 시 null 반환 (DOM 요소 없음)', () => {
    const { container } = render(<PendingStatusWatcher />)
    expect(container.firstChild).toBeNull()
  })

  it('status 이벤트에서 ACTIVE 수신 시 /dashboard로 이동', () => {
    render(<PendingStatusWatcher />)

    // @ts-ignore
    const source = EventSource.instances[0]
    source.emit('status', 'ACTIVE')

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('status 이벤트에서 REJECTED 수신 시 /rejected로 이동', () => {
    render(<PendingStatusWatcher />)

    // @ts-ignore
    const source = EventSource.instances[0]
    source.emit('status', 'REJECTED')

    expect(mockPush).toHaveBeenCalledWith('/rejected')
  })

  it('PENDING 이벤트에는 navigate 미호출', () => {
    render(<PendingStatusWatcher />)

    // @ts-ignore
    const source = EventSource.instances[0]
    source.emit('status', 'PENDING')

    expect(mockPush).not.toHaveBeenCalled()
  })
})
