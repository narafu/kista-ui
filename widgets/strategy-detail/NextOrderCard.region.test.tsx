import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MetaProvider } from '@entities/meta'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'
import { computeOrderReadiness } from '@entities/order'
import type { Strategy } from '@entities/strategy'
import { NextOrderCard } from './NextOrderCard'

const XL = '(min-width: 1280px)'

// xl 쿼리만 matches를 바꾼다 — 전역 스텁(matches:false)을 덮어쓰고 afterEach에서 복원
function stubXl(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches && query === XL,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

// jsdom은 레이아웃이 없어 스크롤 치수를 프로토타입에서 흉내 낸다
const metrics = { scrollTop: 0, clientHeight: 100, scrollHeight: 300 }
const protoSpies = (['scrollTop', 'clientHeight', 'scrollHeight'] as const).map((k) =>
  ({ k, orig: Object.getOwnPropertyDescriptor(Element.prototype, k) }),
)
function stubMetrics() {
  for (const { k } of protoSpies) Object.defineProperty(Element.prototype, k, { configurable: true, get: () => metrics[k] })
}

afterEach(() => {
  vi.unstubAllGlobals()
  for (const { k, orig } of protoSpies) if (orig) Object.defineProperty(Element.prototype, k, orig)
  metrics.scrollTop = 0
})

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MetaProvider meta={testMeta}>
        <NextOrderCard
          strategy={{ id: 's1' } as Strategy}
          preview={undefined}
          isLoadingPreview={false}
          isPreviewError={false}
          previewError={null}
          readiness={computeOrderReadiness(undefined)}
          mode="preview"
          canExecute
          bannerText={null}
          marketStatusMessage={null}
          isConfirmedHoliday={false}
          execute={() => {}}
          isExecuting={false}
        />
      </MetaProvider>
    </QueryClientProvider>,
  )
}

describe('NextOrderCard xl 전용 스크롤 영역', () => {
  it('xl이면 키보드 스크롤 region으로 노출한다', () => {
    stubXl(true)
    renderCard()
    const region = screen.getByRole('region', { name: '다음 주문 목록' })
    expect(region).toHaveAttribute('tabindex', '0')
  })

  it('xl이 아니면 region이 없다', () => {
    stubXl(false)
    renderCard()
    expect(screen.queryByRole('region', { name: '다음 주문 목록' })).toBeNull()
  })

  it('xl에서 넘치면 하단 페이드를 그리고 끝까지 스크롤하면 걷는다', () => {
    stubXl(true)
    stubMetrics()
    const { container } = renderCard()
    const fade = () => container.querySelector('.bg-gradient-to-t')
    expect(fade()).not.toBeNull()
    metrics.scrollTop = 200
    screen.getByRole('region', { name: '다음 주문 목록' }).dispatchEvent(new Event('scroll'))
    return vi.waitFor(() => expect(fade()).toBeNull())
  })

  it('xl이 아니면 넘쳐도 페이드를 그리지 않는다', () => {
    stubXl(false)
    stubMetrics()
    const { container } = renderCard()
    expect(container.querySelector('.bg-gradient-to-t')).toBeNull()
  })
})
