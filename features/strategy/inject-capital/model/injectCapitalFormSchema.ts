import { z } from 'zod'

// 서버 계약: 셋 중 최소 하나, shares·sharePrice는 함께. 에러는 해당 입력칸 path에 붙여 칸 아래에 표시한다
export const injectCapitalFormSchema = z
  .object({
    depositAmount: z.number().positive('0보다 크게 입력하세요.').nullable().optional(),
    shares: z.number().int('정수로 입력하세요.').positive('0보다 크게 입력하세요.').nullable().optional(),
    sharePrice: z.number().positive('0보다 크게 입력하세요.').nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const { depositAmount, shares, sharePrice } = data
    if (depositAmount == null && shares == null && sharePrice == null) {
      ctx.addIssue({ code: 'custom', path: ['depositAmount'], message: '추가할 예수금이나 편입할 주식을 입력하세요.' })
    }
    if (shares != null && sharePrice == null) {
      ctx.addIssue({ code: 'custom', path: ['sharePrice'], message: '주식을 편입하려면 매수단가를 입력하세요.' })
    }
    if (sharePrice != null && shares == null) {
      ctx.addIssue({ code: 'custom', path: ['shares'], message: '매수단가를 입력했다면 편입 수량도 입력하세요.' })
    }
  })

export type InjectCapitalFormValues = z.infer<typeof injectCapitalFormSchema>
