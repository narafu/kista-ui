import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetaProvider, useMeta } from './MetaProvider'
import type { MetaBundle } from '../model/types'

describe('MetaProvider labelOf', () => {
  it('label이 없는 strategyTypes는 description으로, 메타에 없는 코드는 코드 그대로 표시한다', () => {
    const meta = {
      strategyTypes: [{ code: 'INFINITE', description: '무한매수법' }],
      strategyStatuses: [{ code: 'ACTIVE', label: '운영중' }],
    } as unknown as MetaBundle
    const { result } = renderHook(() => useMeta(), {
      wrapper: ({ children }) => <MetaProvider meta={meta}>{children}</MetaProvider>,
    })

    expect(result.current.labelOf('strategyTypes', 'INFINITE')).toBe('무한매수법')
    expect(result.current.labelOf('strategyTypes', 'VR')).toBe('VR')
    expect(result.current.labelOf('strategyStatuses', 'ACTIVE')).toBe('운영중')
  })
})
