import { describe, expect, it } from 'vitest'
import { statsKeys } from './queryKeys'
import { equityCurveQueryOptions, statsSummaryQueryOptions } from './queryOptions'

describe('stats queryOptions', () => {
  it('summary는 canonical key와 60초 staleTime을 사용한다', () => {
    const options = statsSummaryQueryOptions('server-token')
    expect(options.queryKey).toEqual(statsKeys.summary())
    expect(options.staleTime).toBe(60_000)
  })

  it('equity curve는 파라미터를 canonical key로 직렬화한다', () => {
    const options = equityCurveQueryOptions({ from: '2026-05-02', to: '2026-07-31' })
    expect(options.queryKey).toEqual(statsKeys.equityCurve('2026-05-02', '2026-07-31', 'ALL'))
  })
})
