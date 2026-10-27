import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrolledToEnd } from './use-scrolled-to-end'

let resizeCb: () => void

describe('useScrolledToEnd', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: () => void) { resizeCb = cb }
      observe() {}
      disconnect() {}
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  function setup(m: { scrollTop: number; clientHeight: number; scrollHeight: number }) {
    const el = document.createElement('div')
    for (const k of ['scrollTop', 'clientHeight', 'scrollHeight'] as const) {
      Object.defineProperty(el, k, { configurable: true, get: () => m[k] })
    }
    return { el, ref: { current: el }, m }
  }

  it('넘치지 않으면 true', () => {
    const { ref } = setup({ scrollTop: 0, clientHeight: 100, scrollHeight: 100 })
    expect(renderHook(() => useScrolledToEnd(ref)).result.current).toBe(true)
  })

  it('넘치고 위쪽이면 false, 끝까지 내리면(1px 오차 포함) true', () => {
    const { el, ref, m } = setup({ scrollTop: 0, clientHeight: 100, scrollHeight: 300 })
    const { result } = renderHook(() => useScrolledToEnd(ref))
    expect(result.current).toBe(false)
    m.scrollTop = 199
    act(() => { el.dispatchEvent(new Event('scroll')) })
    expect(result.current).toBe(true)
  })

  it('크기가 바뀌면 다시 측정한다', () => {
    const { ref, m } = setup({ scrollTop: 0, clientHeight: 100, scrollHeight: 100 })
    const { result } = renderHook(() => useScrolledToEnd(ref))
    m.scrollHeight = 300
    act(() => resizeCb())
    expect(result.current).toBe(false)
  })
})
