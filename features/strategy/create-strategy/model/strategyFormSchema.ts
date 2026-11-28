import { z } from 'zod'
import {
  RAMP_DEFAULTS_BY_MODE,
  VR_FLOOR_RATE as FLOOR_RATE, VR_G_MAX_BELOW_INITIAL, VR_INITIAL_RATE as INITIAL_RATE, VR_INTEGER as INTEGER, VR_NONNEGATIVE as NONNEGATIVE, VR_POSITIVE as POSITIVE,
} from '@entities/strategy'

export const divisionCountSchema = z.number().int().positive()
export type DivisionCount = z.infer<typeof divisionCountSchema>

const nonnegativeInt = () => z.number().int(INTEGER).nonnegative(NONNEGATIVE).nullable().optional()

export const strategyFormSchema = z.object({
  type: z.string().min(1, '전략 타입을 선택하세요'),
  ticker: z.string().min(1, '종목을 선택하세요'),
  autoStart: z.boolean(),
  seedMode: z.enum(['KEEP', 'MAX']),
  divisionCount: divisionCountSchema,
  avgPrice: z.number().min(0, NONNEGATIVE).nullable().optional(),
  quantity: z.number().int(INTEGER).min(0, NONNEGATIVE).nullable().optional(),
  intervalWeeks: z.number().int(INTEGER).min(1, POSITIVE).nullable().optional(),
  bandWidth: z.number().positive(POSITIVE).nullable().optional(),
  recurringAmount: nonnegativeInt(),
  recurringMode: z.enum(['DEPOSIT', 'HOLD', 'WITHDRAW']),
  initialValue: z.number().nonnegative(NONNEGATIVE).nullable().optional(),
  scheduledStartDate: z.string().nullable().optional(),
  // VR 램프 파라미터 — 전부 optional. initialGradient/gMax/initialPoolLimitRate/poolLimitFloor 4필드는
  // 생략해도 백엔드로 넘어가지 않는다 — buildStrategyPayload가 메타 vrRampDefaults(recurringMode별 표, 없으면 같은 값의 RAMP_DEFAULTS_BY_MODE)로
  // 채워 항상 명시값을 보낸다. 나머지 유예·단계주기 4필드만 생략 시 백엔드 기본값에 위임한다
  initialGradient: z.number().int(INTEGER).positive(POSITIVE).nullable().optional(),
  gGraceWeeks: nonnegativeInt(),
  // gStepWeeks=0은 gradient 램프 비활성화(상한/유예 무관)
  gStepWeeks: nonnegativeInt(),
  gMax: nonnegativeInt(),
  initialPoolLimitRate: z.number().positive(INITIAL_RATE).max(1, INITIAL_RATE).nullable().optional(),
  pGraceWeeks: nonnegativeInt(),
  // pStepWeeks=0은 poolLimitRate 램프 비활성화(하한/유예 무관) — nonnegative로 0 허용, "0이 아니면 하한>0 필수" 규칙은 isInvalidVr에서 처리
  pStepWeeks: nonnegativeInt(),
  poolLimitFloor: z.number().nonnegative(FLOOR_RATE).max(1, FLOOR_RATE).nullable().optional(),
}).superRefine((values, ctx) => {
  const effectiveInitialGradient = values.initialGradient ?? RAMP_DEFAULTS_BY_MODE[values.recurringMode].initialGradient
  if (values.gStepWeeks !== 0 && values.gMax !== null && values.gMax !== undefined && values.gMax < effectiveInitialGradient) {
    ctx.addIssue({
      code: 'custom',
      path: ['gMax'],
      message: VR_G_MAX_BELOW_INITIAL,
    })
  }
})

export type StrategyFormValues = z.infer<typeof strategyFormSchema>
