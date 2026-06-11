export const MIN_SEED_DIVISIONS = 20 // 분할 매수 횟수
export const MIN_SEED_MULTIPLIER = 2 // 안전 배수

export function calcMinSeed(basePrice: number | null, isInfinite: boolean): number | null {
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_MIN_SEED === 'true') return null
  if (basePrice === null) return null
  return isInfinite ? basePrice * MIN_SEED_DIVISIONS * MIN_SEED_MULTIPLIER : basePrice / MIN_SEED_MULTIPLIER
}
