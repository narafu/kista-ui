interface PoolLimitRampSetters {
  setPStepWeeks: (value: number | null) => void
  setPoolLimitFloor: (value: number | null) => void
  setPGraceWeeks: (value: number | null) => void
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
