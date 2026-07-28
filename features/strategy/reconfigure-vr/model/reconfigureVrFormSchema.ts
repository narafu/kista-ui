import { z } from 'zod'

export const reconfigureVrFormSchema = z
  .object({
    bandWidth: z.number().positive().nullable().optional(),
    intervalWeeks: z.number().int().positive().nullable().optional(),
    recurringAmount: z.number().int().nullable().optional(),
    initialGradient: z.number().int().positive().nullable().optional(),
    gGraceWeeks: z.number().int().nonnegative().nullable().optional(),
    gStepWeeks: z.number().int().positive().nullable().optional(),
    gMax: z.number().int().positive().nullable().optional(),
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
    if (data.gMax != null && data.initialGradient != null && data.gMax < data.initialGradient) {
      ctx.addIssue({ code: 'custom', path: ['gMax'], message: 'gradient 상한은 초기값 이상이어야 합니다.' })
    }
    if (data.poolLimitFloor != null && data.initialPoolLimitRate != null && data.poolLimitFloor > data.initialPoolLimitRate) {
      ctx.addIssue({ code: 'custom', path: ['poolLimitFloor'], message: 'poolLimitRate 하한은 초기값 이하여야 합니다.' })
    }
    if (data.poolLimitFloor === 0 && data.pStepWeeks !== 0) {
      ctx.addIssue({ code: 'custom', path: ['poolLimitFloor'], message: 'poolLimitRate 하한은 0보다 커야 합니다. (단계주기를 0으로 설정하면 하한도 자동으로 0이 됩니다.)' })
    }
    if (data.injectShares != null && data.injectShares > 0 && (data.injectSharePrice == null || data.injectSharePrice <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['injectSharePrice'], message: '주식을 편입하려면 매수단가를 입력하세요.' })
    }
  })

export type ReconfigureVrFormValues = z.infer<typeof reconfigureVrFormSchema>
