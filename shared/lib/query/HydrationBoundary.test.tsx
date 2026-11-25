import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider, dehydrate, useQuery } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { HydrationBoundary } from './HydrationBoundary'

function renderFirstValues(client: QueryClient, serverData: string) {
  const server = new QueryClient()
  server.setQueryData(['me'], serverData)
  const seen: (string | undefined)[] = []
  function Probe() {
    const { data } = useQuery<string>({ queryKey: ['me'], queryFn: () => new Promise(() => {}), enabled: false })
    seen.push(data)
    return null
  }
  render(
    <QueryClientProvider client={client}>
      <HydrationBoundary state={dehydrate(server)}>
        <Probe />
      </HydrationBoundary>
    </QueryClientProvider>,
  )
  return seen
}

describe('HydrationBoundary', () => {
  it('이미 있지만 데이터가 없는 쿼리는 첫 렌더부터 서버 데이터를 쓴다', () => {
    const client = new QueryClient()
    // 레이아웃(FcmBridge)이 먼저 만든 pending 쿼리
    client.getQueryCache().build(client, { queryKey: ['me'] })
    expect(renderFirstValues(client, 'server')[0]).toBe('server')
  })

  it('이미 데이터가 있는 쿼리는 첫 렌더에서 기존 데이터를 유지한다', () => {
    const client = new QueryClient()
    client.setQueryData(['me'], 'client')
    expect(renderFirstValues(client, 'server')[0]).toBe('client')
  })
})
