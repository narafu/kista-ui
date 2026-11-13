import { z } from 'zod'
import { fmtMoney } from '@shared/lib/format'
import type { Currency } from '@shared/lib/api-schema'
import { floorToCents } from '@entities/strategy'

// 서버 계약: amount > 0(계좌 통화). ledgerDeposit은 인출 가능액의 상한일 뿐(미체결 매수 주문분은 서버가 추가 차감)이라 알 때만 걸러 준다
export const createWithdrawCapitalFormSchema = (ledgerDeposit?: number, currency: Currency = 'USD') => {
  const limit = ledgerDeposit == null ? undefined : floorToCents(ledgerDeposit)
  return z.object({
    amount: z
      .number('인출할 예수금을 입력하세요.')
      .nullable()
      .superRefine((v, ctx) => {
        if (v == null) ctx.addIssue({ code: 'custom', message: '인출할 예수금을 입력하세요.' })
        else if (v <= 0) ctx.addIssue({ code: 'custom', message: '0보다 크게 입력하세요.' })
        else if (limit != null && v > limit) {
          ctx.addIssue({ code: 'custom', message: `장부 예수금 ${fmtMoney(limit, currency)} 이하로 입력하세요.` })
        }
      }),
  })
}

