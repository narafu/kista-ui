import { describe, expect, it } from 'vitest'
import { createWithdrawCapitalFormSchema } from './withdrawCapitalFormSchema'

const messages = (schema: ReturnType<typeof createWithdrawCapitalFormSchema>, v: unknown) => {
  const r = schema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('createWithdrawCapitalFormSchema', () => {
  it('양수면 성공, 한도를 모르면 상한 검증을 건너뛴다', () => {
    expect(createWithdrawCapitalFormSchema(1000).safeParse({ amount: 100 }).success).toBe(true)
    expect(createWithdrawCapitalFormSchema(1000).safeParse({ amount: 1000 }).success).toBe(true)
    expect(createWithdrawCapitalFormSchema().safeParse({ amount: 999999 }).success).toBe(true)
  })

  it('비었거나 0 이하면 실패', () => {
    const schema = createWithdrawCapitalFormSchema(1000)
    expect(messages(schema, { amount: null })).toEqual(['인출할 예수금을 입력하세요.'])
    expect(messages(schema, {})).toEqual(['인출할 예수금을 입력하세요.'])
    expect(messages(schema, { amount: 0 })).toEqual(['0보다 크게 입력하세요.'])
    expect(messages(schema, { amount: -1 })).toEqual(['0보다 크게 입력하세요.'])
  })

  it('장부 예수금을 넘으면 한도 안내 문구로 실패', () => {
    expect(messages(createWithdrawCapitalFormSchema(1234.5), { amount: 1234.51 })).toEqual(['장부 예수금 $1,234.50 이하로 입력하세요.'])
  })

  it('장부 예수금은 센트 미만을 절사해 한도로 쓴다', () => {
    const schema = createWithdrawCapitalFormSchema(1000.005)
    expect(schema.safeParse({ amount: 1000 }).success).toBe(true)
    expect(messages(schema, { amount: 1000.01 })).toEqual(['장부 예수금 $1,000.00 이하로 입력하세요.'])
  })
})
