import { render, type RenderOptions } from '@testing-library/react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { onTestFinished } from 'vitest'
import { createQueryClient } from '@shared/lib/query/createQueryClient'
import { MetaProvider } from '@entities/meta/providers/MetaProvider'
import { testMeta } from '@entities/meta/__fixtures__/testMeta'
import type { MetaBundle } from '@entities/meta'

// 화면 테스트 공용 감싸개 — 파일별 QueryClientProvider wrapper를 대체한다.
// 라우터·next/link·sonner 대역은 vitest.setup.ts가 전역으로 건다(toast는 spy라 Toaster는 렌더하지 않는다).
interface RenderAppOptions extends Omit<RenderOptions, 'wrapper'> {
  meta?: Partial<MetaBundle>
  queryClient?: QueryClient
}

export function renderApp(ui: ReactElement, { meta, queryClient = createQueryClient(), ...options }: RenderAppOptions = {}) {
  const bundle = { ...testMeta, ...meta } as MetaBundle
  const result = render(ui, {
    ...options,
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MetaProvider meta={bundle}>{children}</MetaProvider>
      </QueryClientProvider>
    ),
  })
  // 끝난 테스트의 지연 refetch·gc 타이머가 다음 테스트의 fetch(또는 실제 fetch)로 새지 않게 비운다
  onTestFinished(() => queryClient.clear())
  return { ...result, queryClient }
}
