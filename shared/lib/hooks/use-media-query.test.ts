import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './use-media-query'

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('초기 일치 여부를 반환하고 change 이벤트에 따라 갱신한다', () => {
    let matches = false
    let listener: () => void = () => {}
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return matches },
      addEventListener: (_: string, cb: () => void) => { listener = cb },
      removeEventListener: vi.fn(),
    }))
    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(false)
    matches = true
    act(() => listener())
    expect(result.current).toBe(true)
  })
})
