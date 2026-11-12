import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'

// 전역 대역 — next/navigation·next/link·sonner. 파일별 vi.mock이 있으면 그쪽이 이긴다.
// 단언은 대역을 직접 꺼내 쓴다: `useRouter().push`, `toast.success`(vi.mocked). 매 테스트 뒤 호출 기록과 구현을 초기화한다.
const router = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(),
}))
const toast = vi.hoisted(() => Object.assign(vi.fn(), {
  success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), message: vi.fn(), loading: vi.fn(), promise: vi.fn(), dismiss: vi.fn(),
}))

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
  useParams: () => ({}),
}))
vi.mock('next/link', async () => {
  const { createElement } = await vi.importActual<typeof import('react')>('react')
  return {
    default: ({ href, prefetch: _prefetch, ...props }: Omit<React.ComponentProps<'a'>, 'href'> & { href: string | { pathname?: string }; prefetch?: unknown }) =>
      createElement('a', { href: typeof href === 'string' ? href : href.pathname, ...props }),
  }
})
vi.mock('sonner', () => ({ toast, Toaster: () => null }))

afterEach(() => {
  for (const fn of [...Object.values(router), toast, ...Object.values(toast)]) {
    if (vi.isMockFunction(fn)) fn.mockReset()
  }
})

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

// jsdom에 없는 브라우저 API 기본 스텁 — 개별 테스트가 필요하면 vi.stubGlobal로 덮어쓴다
if (typeof window !== 'undefined') {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
