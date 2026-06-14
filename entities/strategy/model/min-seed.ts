export const MIN_SEED_DIVISIONS = 20 // 분할 매수 횟수 (기본값)
export const MIN_SEED_MULTIPLIER = 2 // 안전 배수

export function calcMinSeed(
  basePrice: number | null,
  isInfinite: boolean,
  divisionCount: number = MIN_SEED_DIVISIONS,
): number | null {
  if (basePrice === null) return null
  return isInfinite
    ? basePrice * divisionCount * MIN_SEED_MULTIPLIER
    : basePrice / MIN_SEED_MULTIPLIER
}
