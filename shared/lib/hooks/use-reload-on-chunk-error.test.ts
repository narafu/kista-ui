import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReloadOnChunkError } from './use-reload-on-chunk-error'

const reload = vi.fn()

function chunkError() {
  const e = new Error('Failed to load chunk')
  e.name = 'ChunkLoadError'
  return e
}

describe('useReloadOnChunkError', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    reload.mockClear()
    vi.stubGlobal('location', { ...window.location, reload })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('ChunkLoadError면 새로고침한다', () => {
    renderHook(() => useReloadOnChunkError(chunkError()))
    expect(reload).not.toHaveBeenCalled() // 리포트가 나갈 시간을 준다
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('동적 import 실패 메시지도 새로고침한다', () => {
    renderHook(() => useReloadOnChunkError(new TypeError('Failed to fetch dynamically imported module: /x.js')))
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('sessionStorage를 읽을 수 없으면 루프 방어가 불가능해 새로고침하지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    renderHook(() => useReloadOnChunkError(chunkError()))
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).not.toHaveBeenCalled()
  })

  it('다른 오류는 새로고침하지 않는다', () => {
    renderHook(() => useReloadOnChunkError(new Error('boom')))
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).not.toHaveBeenCalled()
  })

  it('30초 안에 다시 나면 새로고침 루프를 막는다', () => {
    const error = chunkError()
    const { rerender } = renderHook(() => useReloadOnChunkError(error))
    rerender()
    renderHook(() => useReloadOnChunkError(chunkError()))
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('30초가 지나면 다시 새로고침한다', () => {
    sessionStorage.setItem('kista:chunk-reload-at', String(Date.now() - 31_000))
    renderHook(() => useReloadOnChunkError(chunkError()))
    act(() => { vi.advanceTimersByTime(500) })
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
