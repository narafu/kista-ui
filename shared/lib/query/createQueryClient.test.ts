import { describe, expect, it } from 'vitest'

import {
  createQueryClient,
  QUERY_DEFAULT_GC_TIME,
  QUERY_DEFAULT_STALE_TIME,
} from './createQueryClient'

describe('createQueryClient', () => {
  it('applies the shared mutable-data defaults', () => {
    const client = createQueryClient()
    const options = client.getDefaultOptions().queries

    expect(options?.staleTime).toBe(QUERY_DEFAULT_STALE_TIME)
    expect(options?.gcTime).toBe(QUERY_DEFAULT_GC_TIME)
    expect(options?.retry).toBe(0)
    expect(options?.refetchOnWindowFocus).toBe(false)
  })
})
