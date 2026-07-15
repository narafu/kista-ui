import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRuntimeConfigQuery } from './useRuntimeConfigQuery'

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn(() => ({})) }))

vi.mock('@tanstack/react-query', () => ({ useQuery: useQueryMock }))
vi.mock('../api', () => ({ getRuntimeConfig: vi.fn() }))

describe('useRuntimeConfigQuery', () => {
  it('keeps runtime settings stale and refetches on window focus', () => {
    renderHook(() => useRuntimeConfigQuery())
    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['runtime-config'],
      staleTime: 0,
      refetchOnWindowFocus: true,
    }))
  })
})
