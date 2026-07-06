import { z } from 'zod'

export const strategyFormSchema = z.object({
  type: z.string().min(1, '전략 타입을 선택하세요'),
  ticker: z.string().min(1, '종목을 선택하세요'),
  autoStart: z.boolean(),
  seedMode: z.enum(['KEEP', 'MAX']),
  divisionCount: z.number().int().min(10).max(50),
  initialValue: z.number().min(0).nullable().optional(),
  intervalWeeks: z.number().int().min(1).nullable().optional(),
  bandWidth: z.number().positive().nullable().optional(),
  recurringAmount: z.number().int().nullable().optional(),
})

export type StrategyFormValues = z.infer<typeof strategyFormSchema>
