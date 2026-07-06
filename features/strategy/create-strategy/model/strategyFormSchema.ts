import { z } from 'zod'

export const divisionCountSchema = z.union([z.literal(20), z.literal(30), z.literal(40)])
export type DivisionCount = z.infer<typeof divisionCountSchema>

export const strategyFormSchema = z.object({
  type: z.string().min(1, '전략 타입을 선택하세요'),
  ticker: z.string().min(1, '종목을 선택하세요'),
  autoStart: z.boolean(),
  seedMode: z.enum(['KEEP', 'MAX']),
  divisionCount: divisionCountSchema,
  initialValue: z.number().min(0).nullable().optional(),
  intervalWeeks: z.number().int().min(1).nullable().optional(),
  bandWidth: z.number().positive().nullable().optional(),
  recurringAmount: z.number().int().nullable().optional(),
})

export type StrategyFormValues = z.infer<typeof strategyFormSchema>
