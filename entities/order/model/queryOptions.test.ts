import { describe, expect, it } from 'vitest'
import { orderKeys } from './queryKeys'
import { orderPreviewQueryOptions } from './queryOptions'

describe('order queryOptions', () => {
  it('preview는 canonical key와 60초 staleTime, retry 비활성을 사용한다', () => {
    const options = orderPreviewQueryOptions('strategy-1', 'server-token')

    expect(options.queryKey).toEqual(orderKeys.preview('strategy-1'))
    expect(options.staleTime).toBe(60_000)
    expect(options.retry).toBe(false)
  })
})
