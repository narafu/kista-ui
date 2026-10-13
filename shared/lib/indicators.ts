// 차트 보조지표 계산 — 입력과 같은 길이의 배열을 돌려주고, 계산에 필요한 선행 구간이 모자란 앞쪽은 null로 채운다.

// 단순 이동평균
export function sma(values: number[], period: number): (number | null)[] {
  let windowSum = 0
  return values.map((value, index) => {
    windowSum += value
    if (index >= period) windowSum -= values[index - period]
    return index >= period - 1 ? windowSum / period : null
  })
}

// RSI (Wilder 평활) — 첫 값은 period개 변화량의 단순평균, 이후 (이전 평균 × (period-1) + 현재) / period
export function rsi(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = values.map(() => null)
  if (values.length <= period) return result

  let avgGain = 0
  let avgLoss = 0
  for (let index = 1; index <= period; index++) {
    const change = values[index] - values[index - 1]
    avgGain += Math.max(change, 0)
    avgLoss += Math.max(-change, 0)
  }
  avgGain /= period
  avgLoss /= period

  const toRsi = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  result[period] = toRsi()
  for (let index = period + 1; index < values.length; index++) {
    const change = values[index] - values[index - 1]
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period
    result[index] = toRsi()
  }
  return result
}
