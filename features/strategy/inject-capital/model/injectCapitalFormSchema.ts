import { z } from 'zod'

// 투자금 추가는 예수금만 받는다(주식 편입은 받지 않음). 서버 계약: depositAmount > 0(계좌 통화)
export const injectCapitalFormSchema = z.object({
  depositAmount: z
    .number('추가할 예수금을 입력하세요.')
    .nullable()
    .superRefine((v, ctx) => {
      if (v == null) ctx.addIssue({ code: 'custom', message: '추가할 예수금을 입력하세요.' })
      else if (v <= 0) ctx.addIssue({ code: 'custom', message: '0보다 크게 입력하세요.' })
    }),
})

export type InjectCapitalFormValues = { depositAmount: number | null }
