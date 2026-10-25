import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSearchParam } from './use-search-param'

let searchParamsValue = ''

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}))

describe('useSearchParam', () => {
  afterEach(() => vi.restoreAllMocks())

  it('다른 파라미터를 유지한 채 값을 바꾸고, null이면 지운다', () => {
    searchParamsValue = 'page=2&broker=KIS'
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() => useSearchParam('broker'))

    expect(result.current[0]).toBe('KIS')
    act(() => result.current[1]('UPBIT'))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '?page=2&broker=UPBIT')
    act(() => result.current[1](null))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '?page=2')
  })

  it('마지막 파라미터를 지우면 경로만 남긴다', () => {
    searchParamsValue = 'broker=KIS'
    const replaceState = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() => useSearchParam('broker'))

    act(() => result.current[1](null))
    expect(replaceState).toHaveBeenLastCalledWith(null, '', window.location.pathname)
  })
})
