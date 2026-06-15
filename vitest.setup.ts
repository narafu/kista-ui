import '@testing-library/jest-dom'

// EventSource polyfill — SSE 훅 테스트용 mock
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  onopen: ((e: Event) => void) | null = null
  readyState = 0
  CONNECTING = 0
  OPEN = 1
  CLOSED = 2
  private listeners: Record<string, ((e: MessageEvent) => void)[]> = {}

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = []
    this.listeners[type].push(handler)
  }

  removeEventListener(type: string, handler: (e: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(h => h !== handler)
    }
  }

  // 테스트에서 이벤트를 수동으로 발생시킬 때 사용
  emit(type: string, data: string) {
    const event = new MessageEvent(type, { data })
    this.listeners[type]?.forEach(h => h(event))
    if (type === 'message' && this.onmessage) this.onmessage(event)
  }

  close() {
    this.readyState = this.CLOSED
  }
}

globalThis.EventSource = MockEventSource as unknown as typeof EventSource
