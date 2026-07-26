import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { accountKeys } from '../model/queryKeys'
import { useAccountsQuery } from './useAccountQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(() => ({ data: [] })),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return {
    ...actual,
    useQuery: useQueryMock,
  }
})

vi.mock('../api', () => ({
  listAccounts: vi.fn(),
}))

describe('useAccountsQuery', () => {
  it('uses the canonical list key', () => {
    renderHook(() => useAccountsQuery())

    expect(useQueryMock).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: accountKeys.list(),
    }))
  })
})
