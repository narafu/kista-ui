interface PoolLimitRampSetters {
  setPStepWeeks: (value: number | null) => void
  setPoolLimitFloor: (value: number | null) => void
  setPGraceWeeks: (value: number | null) => void
}

interface GradientRampSetters {
  setGStepWeeks: (value: number | null) => void
  setGMax: (value: number | null) => void
  setGGraceWeeks: (value: number | null) => void
}

/**
 * gradient 단계주기(gStepWeeks)=0은 램프 비활성화를 의미한다.
 * 0으로 바뀌면 상한/유예를 0으로 강제하고, 0에서 벗어나면 값을 비워 재입력을 받는다.
 */
export function applyGStepWeeksChange(value: number | null, wasZero: boolean, setters: GradientRampSetters) {
  setters.setGStepWeeks(value)
  if (value === 0) {
    setters.setGMax(0)
    setters.setGGraceWeeks(0)
  } else if (wasZero) {
    setters.setGMax(null)
    setters.setGGraceWeeks(null)
  }
}

/**
 * poolLimitRate 단계주기(pStepWeeks)=0은 램프 비활성화를 의미한다.
 * 0으로 바뀌면 하한/유예를 0으로 강제하고, 0에서 벗어나면 값을 비워 재입력을 받는다.
 */
export function applyPStepWeeksChange(value: number | null, wasZero: boolean, setters: PoolLimitRampSetters) {
  setters.setPStepWeeks(value)
  if (value === 0) {
    setters.setPoolLimitFloor(0)
    setters.setPGraceWeeks(0)
  } else if (wasZero) {
    setters.setPoolLimitFloor(null)
    setters.setPGraceWeeks(null)
  }
}

// 단계주기가 0이 아니면 하한은 0보다 커야 함 — 단계주기=0일 때만 하한 0이 허용(자동 강제)
export const POOL_LIMIT_FLOOR_ZERO_MESSAGE =
  'poolLimitRate 하한은 0보다 커야 합니다. (단계주기를 0으로 설정하면 하한도 자동으로 0이 됩니다.)'

// 램프 상·하한 검증 — 전략 등록과 백테스트가 공유한다(서버 validateVrCommand와 같은 규칙). initial*은 미입력 시 기본값을 적용한 실효값
export function vrRampInvalidReason(input: {
  gStepWeeks: number | null
  gMax: number | null
  pStepWeeks: number | null
  poolLimitFloor: number | null
  initialGradient: number
  initialPoolLimitRate: number
}): string | null {
  const { gStepWeeks, gMax, pStepWeeks, poolLimitFloor, initialGradient, initialPoolLimitRate } = input
  if (gStepWeeks !== 0 && gMax !== null && gMax < initialGradient) return 'gradient 상한은 초기값 이상이어야 합니다.'
  if (poolLimitFloor !== null && poolLimitFloor > initialPoolLimitRate) return 'poolLimitRate 하한은 초기값 이하여야 합니다.'
  if (poolLimitFloor === 0 && pStepWeeks !== 0) return POOL_LIMIT_FLOOR_ZERO_MESSAGE
  return null
}
