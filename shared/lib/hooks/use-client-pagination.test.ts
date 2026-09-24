import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useClientPagination } from './use-client-pagination'

describe('useClientPagination', () => {
  it('첫 페이지를 initialSize만큼 슬라이싱한다', () => {
    const items = Array.from({ length: 25 }, (_, i) => i)
    const { result } = renderHook(() => useClientPagination(items, { initialSize: 10 }))

    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.paged).toEqual(items.slice(0, 10))
  })

  it('setPage로 다음 페이지를 슬라이싱한다', () => {
    const items = Array.from({ length: 25 }, (_, i) => i)
    const { result } = renderHook(() => useClientPagination(items, { initialSize: 10 }))

    act(() => result.current.setPage(3))

    expect(result.current.page).toBe(3)
    expect(result.current.paged).toEqual(items.slice(20, 25))
  })

  it('handlePageSizeChange는 크기를 바꾸고 1페이지로 복귀한다', () => {
    const items = Array.from({ length: 25 }, (_, i) => i)
    const { result } = renderHook(() => useClientPagination(items, { initialSize: 10 }))

    act(() => result.current.setPage(3))
    act(() => result.current.handlePageSizeChange('30'))

    expect(result.current.page).toBe(1)
    expect(result.current.size).toBe(30)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.paged).toEqual(items)
  })

  it('items가 줄어 page가 totalPages를 넘으면 마지막 페이지로 clamp한다', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useClientPagination(items, { initialSize: 10 }),
      { initialProps: { items: Array.from({ length: 25 }, (_, i) => i) } },
    )

    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    rerender({ items: Array.from({ length: 5 }, (_, i) => i) })

    expect(result.current.page).toBe(1)
    expect(result.current.totalPages).toBe(1)
  })
})
