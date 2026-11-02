import { z } from 'zod'
import { POOL_LIMIT_FLOOR_ZERO_MESSAGE } from '@entities/strategy'

// 서버는 빈 필드를 현재 값으로 이어받으므로 교차검증은 "입력값 ?? 현재값"(유효값)으로 계산한다
type CurrentVrRamp = {
  initialGradient: number
  gStepWeeks: number
  gMax: number
  initialPoolLimitRate: number
  pStepWeeks: number
  poolLimitFloor: number
}

export function createReconfigureVrFormSchema(current?: CurrentVrRamp) {
  return z
  .object({
    bandWidth: z.number().positive().nullable().optional(),
    intervalWeeks: z.number().int().positive().nullable().optional(),
    recurringAmount: z.number().int().nullable().optional(),
    // 요청 바디에는 없는 화면 상태 — 부호만으로는 "적립을 골랐는데 금액 0"을 거치와 구분할 수 없어 함께 검증한다
    recurringMode: z.enum(['DEPOSIT', 'HOLD', 'WITHDRAW']).optional(),
    initialGradient: z.number().int().positive().nullable().optional(),
    gGraceWeeks: z.number().int().nonnegative().nullable().optional(),
    gStepWeeks: z.number().int().nonnegative().nullable().optional(),
    gMax: z.number().int().nonnegative().nullable().optional(),
    initialPoolLimitRate: z.number().positive().max(1).nullable().optional(),
    pGraceWeeks: z.number().int().nonnegative().nullable().optional(),
    // pStepWeeks=0은 poolLimitRate 램프 비활성화(하한/유예 무관) — nonnegative로 0 허용, "0이 아니면 하한>0 필수"는 아래 superRefine에서 검증
    pStepWeeks: z.number().int().nonnegative().nullable().optional(),
    poolLimitFloor: z.number().nonnegative().max(1).nullable().optional(),
    injectShares: z.number().int().nonnegative().nullable().optional(),
    injectSharePrice: z.number().positive().nullable().optional(),
    injectDeposit: z.number().nonnegative().nullable().optional(),
    withdrawShares: z.number().int().nonnegative().nullable().optional(),
    withdrawDeposit: z.number().nonnegative().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const initialGradient = data.initialGradient ?? current?.initialGradient
    const gStepWeeks = data.gStepWeeks ?? current?.gStepWeeks
    const gMax = data.gMax ?? current?.gMax
    const initialPoolLimitRate = data.initialPoolLimitRate ?? current?.initialPoolLimitRate
    const pStepWeeks = data.pStepWeeks ?? current?.pStepWeeks
    const poolLimitFloor = data.poolLimitFloor ?? current?.poolLimitFloor
    if (gStepWeeks !== 0 && gMax != null && initialGradient != null && gMax < initialGradient) {
      ctx.addIssue({ code: 'custom', path: ['gMax'], message: 'gradient 상한은 초기값 이상이어야 합니다.' })
    }
    if (poolLimitFloor != null && initialPoolLimitRate != null && poolLimitFloor > initialPoolLimitRate) {
      ctx.addIssue({ code: 'custom', path: ['poolLimitFloor'], message: 'poolLimitRate 하한은 초기값 이하여야 합니다.' })
    }
    if (poolLimitFloor === 0 && pStepWeeks !== 0) {
      ctx.addIssue({ code: 'custom', path: ['poolLimitFloor'], message: POOL_LIMIT_FLOOR_ZERO_MESSAGE })
    }
    if (data.recurringMode && data.recurringMode !== 'HOLD' && !data.recurringAmount) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurringAmount'],
        message: data.recurringMode === 'DEPOSIT' ? '적립금을 0보다 크게 입력하세요.' : '인출금을 0보다 크게 입력하세요.',
      })
    }
    if (data.injectShares != null && data.injectShares > 0 && (data.injectSharePrice == null || data.injectSharePrice <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['injectSharePrice'], message: '주식을 편입하려면 매수단가를 입력하세요.' })
    }
  })
}

export const reconfigureVrFormSchema = createReconfigureVrFormSchema()

export type ReconfigureVrFormValues = z.infer<typeof reconfigureVrFormSchema>
