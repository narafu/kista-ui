// recharts 기본 눈금은 0.0035·1.05처럼 0.05 단위 배수를 고르기도 해서 1·2·2.5·5 × 10^k 간격으로 직접 계산한다
export function niceTicks(values: readonly number[], count = 4): number[] | undefined {
  if (!values.length) return undefined
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude
  // 부동소수 오차(0.3 / 0.1 = 2.9999…, 0.30000000000000004)가 눈금 한 칸을 더 붙이거나 라벨에 드러나지 않도록 유효숫자로 정리한다
  const round = (n: number) => Number(n.toPrecision(12))
  const lo = Math.floor(round(min / step))
  const hi = Math.ceil(round(max / step))
  return Array.from({ length: hi - lo + 1 }, (_, i) => round((lo + i) * step))
}
