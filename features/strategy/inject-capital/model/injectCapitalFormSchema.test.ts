import { describe, expect, it } from 'vitest'
import { injectCapitalFormSchema } from './injectCapitalFormSchema'

const issueMessages = (v: unknown) => {
  const r = injectCapitalFormSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('injectCapitalFormSchema', () => {
  it('예수금을 입력하면 성공', () => {
    expect(injectCapitalFormSchema.safeParse({ depositAmount: 500 }).success).toBe(true)
  })

  it('비면 입력 요청 오류', () => {
    expect(issueMessages({ depositAmount: null })).toEqual(['추가할 예수금을 입력하세요.'])
  })

  it('0 이하 값은 실패', () => {
    expect(issueMessages({ depositAmount: 0 })).toEqual(['0보다 크게 입력하세요.'])
    expect(issueMessages({ depositAmount: -1 })).toEqual(['0보다 크게 입력하세요.'])
  })
})
