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
  scheduledStartDate: z.string().nullable().optional(),
  // VR 램프 파라미터 — 전부 optional, 생략 시 백엔드 기본값 적용
  initialGradient: z.number().int().positive().nullable().optional(),
  gGraceWeeks: z.number().int().nonnegative().nullable().optional(),
  gStepWeeks: z.number().int().positive().nullable().optional(),
  gMax: z.number().int().positive().nullable().optional(),
  initialPoolLimitRate: z.number().positive().max(1).nullable().optional(),
  pGraceWeeks: z.number().int().nonnegative().nullable().optional(),
  pStepWeeks: z.number().int().positive().nullable().optional(),
  poolLimitFloor: z.number().positive().max(1).nullable().optional(),
})

export type StrategyFormValues = z.infer<typeof strategyFormSchema>
