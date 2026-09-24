import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTableSort } from './use-table-sort'

type Key = 'a' | 'b'

describe('useTableSort', () => {
  it('초기 키·desc 방향으로 시작한다', () => {
    const { result } = renderHook(() => useTableSort<Key>('a'))
    expect(result.current.sortKey).toBe('a')
    expect(result.current.sortDirection).toBe('desc')
  })

  it('같은 컬럼을 다시 클릭하면 방향만 토글한다', () => {
    const { result } = renderHook(() => useTableSort<Key>('a'))
    act(() => result.current.handleSort('a'))
    expect(result.current.sortKey).toBe('a')
    expect(result.current.sortDirection).toBe('asc')
    act(() => result.current.handleSort('a'))
    expect(result.current.sortDirection).toBe('desc')
  })

  it('다른 컬럼을 클릭하면 키를 바꾸고 desc로 초기화한다', () => {
    const { result } = renderHook(() => useTableSort<Key>('a'))
    act(() => result.current.handleSort('a')) // asc
    act(() => result.current.handleSort('b'))
    expect(result.current.sortKey).toBe('b')
    expect(result.current.sortDirection).toBe('desc')
  })
})
