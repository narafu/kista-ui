import { describe, expect, it } from 'vitest'
import { injectCapitalFormSchema } from './injectCapitalFormSchema'

const issuePaths = (v: unknown) => {
  const r = injectCapitalFormSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => i.path[0])
}

describe('injectCapitalFormSchema', () => {
  it('예수금만, 주식만(수량+단가), 둘 다 입력하면 성공', () => {
    expect(injectCapitalFormSchema.safeParse({ depositAmount: 500 }).success).toBe(true)
    expect(injectCapitalFormSchema.safeParse({ shares: 10, sharePrice: 62.5 }).success).toBe(true)
    expect(injectCapitalFormSchema.safeParse({ depositAmount: 500, shares: 10, sharePrice: 62.5 }).success).toBe(true)
  })

  it('셋 다 비면 예수금 칸에 오류', () => {
    expect(issuePaths({})).toEqual(['depositAmount'])
    expect(issuePaths({ depositAmount: null, shares: null, sharePrice: null })).toEqual(['depositAmount'])
  })

  it('수량만 있으면 매수단가 칸에, 단가만 있으면 수량 칸에 오류', () => {
    expect(issuePaths({ shares: 10 })).toEqual(['sharePrice'])
    expect(issuePaths({ sharePrice: 62.5 })).toEqual(['shares'])
  })

  it('0 이하 값과 소수 수량은 실패', () => {
    expect(issuePaths({ depositAmount: 0 })).toContain('depositAmount')
    expect(issuePaths({ depositAmount: -1 })).toContain('depositAmount')
    expect(issuePaths({ shares: 0, sharePrice: 10 })).toContain('shares')
    expect(issuePaths({ shares: 1.5, sharePrice: 10 })).toContain('shares')
    expect(issuePaths({ shares: 1, sharePrice: 0 })).toContain('sharePrice')
  })
})
