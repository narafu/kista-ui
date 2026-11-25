import { roundDecimal } from '@shared/lib/format'

// 센트 미만 절사 — 장부 예수금이 인출 한도·표시 모두에서 같은 값을 쓰게 한다(roundDecimal은 x*100의 부동소수 오차 제거용)
export const floorToCents = (n: number) => Math.floor(roundDecimal(n * 100, 6)) / 100
