import { describe, expect, it } from 'vitest'
import type { RuntimeConfig } from '@entities/runtime-config'
import type { Strategy } from '@entities/strategy'
import { deriveRuntimeFields } from './strategyFormHelpers'

const runtime = (defaultValue: string) => ({
  fields: { ticker: { allowedValues: ['UPRO', 'QLD'], defaultValue, customizable: true } },
}) as unknown as RuntimeConfig['strategies']['DCA']

describe('deriveRuntimeFields defaultTicker', () => {
  it('설정 기본값이 허용 목록에 있으면 그 값', () => {
    expect(deriveRuntimeFields(undefined, runtime('QLD')).defaultTicker).toBe('QLD')
  })

  it('설정 기본값이 허용 목록 밖이면 첫 허용값', () => {
    expect(deriveRuntimeFields(undefined, runtime('SOXL')).defaultTicker).toBe('UPRO')
  })

  it('수정 모드는 기존 전략 티커', () => {
    expect(deriveRuntimeFields({ ticker: 'QLD' } as Strategy, runtime('UPRO')).defaultTicker).toBe('QLD')
  })
})
