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

// 눈금 간격을 구분하는 데 필요한 소수 자릿수(0.05 → 2, 2.5 → 1, 50 → 0) — 축 라벨이 반올림으로 같은 값을 두 번 찍지 않게 한다
export function stepDecimals(step: number): number {
  // log10는 1e-7 같은 10의 거듭제곱을 한 자리 낮게 내릴 수 있어 지수 표기에서 가수·지수를 읽는다
  const [mantissa, exponent] = Number(step.toPrecision(12)).toExponential().split('e').map(Number)
  return Math.max(0, -exponent + (Number.isInteger(mantissa) ? 0 : 1))
}

// 달러 축약 축 라벨 — 값이 놓인 단위(K·M·B·T)에서 눈금 간격을 구분할 만큼만 소수 자릿수를 둔다
export function fmtCompactUsdTick(value: number, step: number): string {
  const unit = [1e12, 1e9, 1e6, 1e3].find((u) => Math.abs(value) >= u) ?? 1
  const digits = stepDecimals(step / unit)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}
