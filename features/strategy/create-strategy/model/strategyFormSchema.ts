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
})

export type StrategyFormValues = z.infer<typeof strategyFormSchema>
