import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSubviewEntry, pushSubviewEntry, SUBVIEW_HISTORY_KEY, useSubviewHistory } from './subviewHistory'

afterEach(() => {
  window.history.replaceState(null, '')
  vi.restoreAllMocks()
})

describe('subviewHistory', () => {
  it('pushSubviewEntry는 기존 state 키를 보존하며 표식을 남긴다', () => {
    window.history.replaceState({ __NA: true }, '')
    expect(isSubviewEntry()).toBe(false)
    const id = pushSubviewEntry()
    expect(isSubviewEntry()).toBe(true)
    expect(window.history.state).toEqual({ __NA: true, [SUBVIEW_HISTORY_KEY]: id })
    expect(pushSubviewEntry()).not.toBe(id)
  })

  it('isSubviewEntry는 객체가 아닌 state를 거른다', () => {
    expect(isSubviewEntry(null)).toBe(false)
    expect(isSubviewEntry('x')).toBe(false)
  })

  it('open이 true가 되면 한 칸 쌓고, leave → 표식 없는 popstate에서 onPop 1회', () => {
    const push = vi.spyOn(window.history, 'pushState')
    vi.spyOn(window.history, 'back').mockImplementation(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
    const onPop = vi.fn()
    const { result, rerender } = renderHook(({ open }) => useSubviewHistory(open, onPop), { initialProps: { open: false } })
    expect(push).not.toHaveBeenCalled()
    rerender({ open: true })
    expect(push).toHaveBeenCalledTimes(1)
    act(() => result.current.leave())
    expect(onPop).toHaveBeenCalledTimes(1)
  })

  it('StrictMode 이펙트 재실행에도 한 칸만 쌓는다', () => {
    const push = vi.spyOn(window.history, 'pushState')
    renderHook(() => useSubviewHistory(true, () => {}), { wrapper: StrictMode })
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('아래 칸에 이전 진입의 표식이 남아 있어도 leave하면 onPop', () => {
    window.history.replaceState({ [SUBVIEW_HISTORY_KEY]: 'stale' }, '')
    vi.spyOn(window.history, 'back').mockImplementation(() => window.dispatchEvent(new PopStateEvent('popstate', { state: { [SUBVIEW_HISTORY_KEY]: 'stale' } })))
    const onPop = vi.fn()
    const { result } = renderHook(() => useSubviewHistory(true, onPop))
    act(() => result.current.leave())
    expect(onPop).toHaveBeenCalledTimes(1)
  })

  it('이번 진입 표식 state로 온 popstate는 무시하고, 닫힌 뒤엔 듣지 않는다', () => {
    const onPop = vi.fn()
    const { rerender } = renderHook(({ open }) => useSubviewHistory(open, onPop), { initialProps: { open: true } })
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
    expect(onPop).not.toHaveBeenCalled()
    rerender({ open: false })
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    expect(onPop).not.toHaveBeenCalled()
  })
})
