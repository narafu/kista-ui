import { z } from 'zod'
import { fmtMoney } from '@shared/lib/format'
import { floorToCents, POOL_LIMIT_FLOOR_ZERO_MESSAGE } from '@entities/strategy'

// 서버는 빈 필드를 현재 값으로 이어받으므로 교차검증은 "입력값 ?? 현재값"(유효값)으로 계산한다
type CurrentVrRamp = {
  initialGradient: number
  gStepWeeks: number
  gMax: number
  initialPoolLimitRate: number
  pStepWeeks: number
  poolLimitFloor: number
}

// 칸 아래에 그대로 보이는 문구 — zod 기본 영문이 새지 않게 모든 검사에 붙인다. 비율은 화면 단위(%)로 적는다
const POSITIVE = '0보다 크게 입력하세요.'
const NONNEGATIVE = '0 이상으로 입력하세요.'
const INTEGER = '올바른 정수를 입력하세요.'

const positiveInt = () => z.number().int(INTEGER).positive(POSITIVE).nullable().optional()
const nonnegativeInt = () => z.number().int(INTEGER).nonnegative(NONNEGATIVE).nullable().optional()
const nonnegativeAmount = () => z.number().nonnegative(NONNEGATIVE).nullable().optional()

export function createReconfigureVrFormSchema(current?: CurrentVrRamp, ledgerDeposit?: number) {
  // 인출 한도는 현재 장부 예수금 — 서버는 같은 요청의 추가 예수금을 합치지 않는다(validateCapitalAdjustment). 모르면 서버에 맡긴다
  const limit = ledgerDeposit == null ? undefined : floorToCents(ledgerDeposit)
  return z
  .object({
    bandWidth: z.number().positive(POSITIVE).nullable().optional(),
    intervalWeeks: positiveInt(),
    recurringAmount: z.number().int(INTEGER).nullable().optional(),
    // 요청 바디에는 없는 화면 상태 — 부호만으로는 "적립을 골랐는데 금액 0"을 거치와 구분할 수 없어 함께 검증한다
    recurringMode: z.enum(['DEPOSIT', 'HOLD', 'WITHDRAW']).optional(),
    initialGradient: positiveInt(),
    gGraceWeeks: nonnegativeInt(),
    gStepWeeks: nonnegativeInt(),
    gMax: nonnegativeInt(),
    initialPoolLimitRate: z.number().positive('0 초과 100 이하로 입력하세요.').max(1, '0 초과 100 이하로 입력하세요.').nullable().optional(),
    pGraceWeeks: nonnegativeInt(),
    // pStepWeeks=0은 poolLimitRate 램프 비활성화(하한/유예 무관) — nonnegative로 0 허용, "0이 아니면 하한>0 필수"는 아래 superRefine에서 검증
    pStepWeeks: nonnegativeInt(),
    poolLimitFloor: z.number().nonnegative('0~100 사이로 입력하세요.').max(1, '0~100 사이로 입력하세요.').nullable().optional(),
    injectShares: nonnegativeInt(),
    injectSharePrice: z.number().positive(POSITIVE).nullable().optional(),
    injectDeposit: nonnegativeAmount(),
    withdrawShares: nonnegativeInt(),
    withdrawDeposit: nonnegativeAmount(),
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
    if (limit != null && data.withdrawDeposit != null && data.withdrawDeposit > limit) {
      ctx.addIssue({ code: 'custom', path: ['withdrawDeposit'], message: `장부 예수금 ${fmtMoney(limit, 'USD')} 이하로 입력하세요.` })
    }
  })
}

export type ReconfigureVrFormValues = z.infer<ReturnType<typeof createReconfigureVrFormSchema>>
