import { z } from 'zod'
import { fmtUsd } from '@shared/lib/format'
import { floorToCents } from '@entities/strategy'

// 서버 계약: amount > 0(USD). ledgerUsdDeposit은 인출 가능액의 상한일 뿐(미체결 매수 주문분은 서버가 추가 차감)이라 알 때만 걸러 준다
export const createWithdrawCapitalFormSchema = (ledgerUsdDeposit?: number) => {
  const limit = ledgerUsdDeposit == null ? undefined : floorToCents(ledgerUsdDeposit)
  return z.object({
    amount: z
      .number('인출할 예수금을 입력하세요.')
      .nullable()
      .superRefine((v, ctx) => {
        if (v == null) ctx.addIssue({ code: 'custom', message: '인출할 예수금을 입력하세요.' })
        else if (v <= 0) ctx.addIssue({ code: 'custom', message: '0보다 크게 입력하세요.' })
        else if (limit != null && v > limit) {
          ctx.addIssue({ code: 'custom', message: `장부 예수금 $${fmtUsd(limit)} 이하로 입력하세요.` })
        }
      }),
  })
}

export type WithdrawCapitalFormValues = { amount: number | null }
