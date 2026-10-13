import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { orderKeys } from './queryKeys'
import { orderPreviewQueryOptions, seedOrderPreviews } from './queryOptions'
import type { NextOrderPreview } from './types'

describe('order queryOptions', () => {
  it('preview는 canonical key와 60초 staleTime, retry 비활성을 사용한다', () => {
    const options = orderPreviewQueryOptions('strategy-1', 'server-token')

    expect(options.queryKey).toEqual(orderKeys.preview('strategy-1'))
    expect(options.staleTime).toBe(60_000)
    expect(options.retry).toBe(false)
  })
})

describe('seedOrderPreviews', () => {
  it('서버에서 다시 받은 preview가 hydrate로 기존 클라이언트 캐시를 덮어쓴다', async () => {
    const client = new QueryClient()
    client.setQueryData(orderKeys.preview('s1'), { marker: 'old' } as unknown as NextOrderPreview)
    await new Promise((resolve) => setTimeout(resolve, 5))

    const server = new QueryClient()
    seedOrderPreviews(server, { s1: { marker: 'new' } as unknown as NextOrderPreview })
    hydrate(client, dehydrate(server))

    expect(client.getQueryData(orderKeys.preview('s1'))).toEqual({ marker: 'new' })
  })
})
