import { z } from 'zod'

export const divisionCountSchema = z.number().int().positive()
export type DivisionCount = z.infer<typeof divisionCountSchema>

export const strategyFormSchema = z.object({
  type: z.string().min(1, '전략 타입을 선택하세요'),
  ticker: z.string().min(1, '종목을 선택하세요'),
  autoStart: z.boolean(),
  seedMode: z.enum(['KEEP', 'MAX']),
  divisionCount: divisionCountSchema,
  avgPrice: z.number().min(0).nullable().optional(),
  quantity: z.number().int().min(0).nullable().optional(),
  intervalWeeks: z.number().int().min(1).nullable().optional(),
  bandWidth: z.number().positive().nullable().optional(),
  recurringAmount: z.number().int().nonnegative().nullable().optional(),
  recurringMode: z.enum(['DEPOSIT', 'HOLD', 'WITHDRAW']),
  initialValue: z.number().nonnegative().nullable().optional(),
  scheduledStartDate: z.string().nullable().optional(),
  // VR 램프 파라미터 — 전부 optional, 생략 시 백엔드 기본값 적용
  initialGradient: z.number().int().positive().nullable().optional(),
  gGraceWeeks: z.number().int().nonnegative().nullable().optional(),
  // gStepWeeks=0은 gradient 램프 비활성화(상한/유예 무관)
  gStepWeeks: z.number().int().nonnegative().nullable().optional(),
  gMax: z.number().int().nonnegative().nullable().optional(),
  initialPoolLimitRate: z.number().positive().max(1).nullable().optional(),
  pGraceWeeks: z.number().int().nonnegative().nullable().optional(),
  // pStepWeeks=0은 poolLimitRate 램프 비활성화(하한/유예 무관) — nonnegative로 0 허용, "0이 아니면 하한>0 필수" 규칙은 isInvalidVr에서 처리
  pStepWeeks: z.number().int().nonnegative().nullable().optional(),
  poolLimitFloor: z.number().nonnegative().max(1).nullable().optional(),
}).superRefine((values, ctx) => {
  const effectiveInitialGradient = values.initialGradient ?? (values.recurringMode === 'WITHDRAW' ? 20 : 10)
  if (values.gStepWeeks !== 0 && values.gMax !== null && values.gMax !== undefined && values.gMax < effectiveInitialGradient) {
    ctx.addIssue({
      code: 'custom',
      path: ['gMax'],
      message: 'gradient 상한은 초기값 이상이어야 합니다.',
    })
  }
})

export type StrategyFormValues = z.infer<typeof strategyFormSchema>
