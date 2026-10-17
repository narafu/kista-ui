import { describe, expect, it } from 'vitest'
import type { RuntimeConfig } from '@entities/runtime-config'
import type { Strategy } from '@entities/strategy'
import { deriveRuntimeFields } from './strategyFormHelpers'

const runtime = (defaultValue: string) => ({
  fields: { ticker: { allowedValues: ['UPRO', 'QLD'], defaultValue, customizable: true } },
}) as unknown as RuntimeConfig['strategies']['DCA']

describe('deriveRuntimeFields defaultTicker', () => {
  it('설정 기본값이 허용 목록에 있으면 그 값', () => {
    expect(deriveRuntimeFields(undefined, runtime('QLD'), () => true).defaultTicker).toBe('QLD')
  })

  it('설정 기본값이 허용 목록 밖이면 첫 허용값', () => {
    expect(deriveRuntimeFields(undefined, runtime('SOXL'), () => true).defaultTicker).toBe('UPRO')
  })

  it('수정 모드는 기존 전략 티커', () => {
    expect(deriveRuntimeFields({ ticker: 'QLD' } as Strategy, runtime('UPRO'), () => true).defaultTicker).toBe('QLD')
  })
})

describe('deriveRuntimeFields 시장 필터', () => {
  it('허용되지 않은 티커는 목록과 기본값에서 뺀다', () => {
    const r = deriveRuntimeFields(undefined, runtime('UPRO'), (code) => code !== 'UPRO')
    expect(r.availableTickers).toEqual(['QLD'])
    expect(r.defaultTicker).toBe('QLD')
  })

  it('수정 모드는 필터와 무관하게 기존 티커', () => {
    expect(deriveRuntimeFields({ ticker: 'BTC' } as Strategy, runtime('UPRO'), () => false).availableTickers).toEqual(['BTC'])
  })
})
