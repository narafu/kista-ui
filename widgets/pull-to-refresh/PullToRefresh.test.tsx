import { render, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { PullToRefresh } from './PullToRefresh'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

// document 리스너의 e.target?.closest 호출을 위해 body에서 dispatch (Document에는 closest가 없음)
function fireTouch(type: string, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: [{ clientY }] })
  act(() => { document.body.dispatchEvent(event) })
}

describe('PullToRefresh', () => {
  it('임계값 이상 당기면 router.refresh와 전체 쿼리 무효화를 함께 실행한다', async () => {
    const client = new QueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    )
    fireTouch('touchstart', 100)
    fireTouch('touchmove', 260) // delta 160 * 0.5 = 80 > THRESHOLD(70)
    fireTouch('touchend', 260)
    await vi.waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
    expect(refresh).toHaveBeenCalled()
  })

  it('임계값 미만이면 아무것도 실행하지 않는다', () => {
    const client = new QueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    )
    fireTouch('touchstart', 100)
    fireTouch('touchmove', 140) // delta 40 * 0.5 = 20 < THRESHOLD
    fireTouch('touchend', 140)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it.each([
    { scrollTop: 0, refreshes: true },
    { scrollTop: 200, refreshes: false },
  ])('모바일 스크롤 컨테이너(data-scroll-root) scrollTop $scrollTop이면 refresh=$refreshes', async ({ scrollTop, refreshes }) => {
    const client = new QueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const scrollRoot = document.createElement('main')
    scrollRoot.setAttribute('data-scroll-root', '')
    Object.defineProperty(scrollRoot, 'scrollTop', { value: scrollTop })
    document.body.appendChild(scrollRoot)
    try {
      render(
        <QueryClientProvider client={client}>
          <PullToRefresh />
        </QueryClientProvider>,
      )
      fireTouch('touchstart', 100)
      fireTouch('touchmove', 260)
      fireTouch('touchend', 260)
      if (refreshes) await vi.waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
      else expect(invalidateSpy).not.toHaveBeenCalled()
    } finally {
      scrollRoot.remove()
    }
  })
})
