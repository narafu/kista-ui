interface Props {
  amount: number
  rate?: number
  size?: number
}

export function ProfitDisplay({ amount, rate, size = 14 }: Props) {
  const isPos = amount >= 0
  const color = isPos ? 'var(--pos)' : 'var(--neg)'
  const sign = isPos ? '+' : ''
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))

  return (
    <span className="num" style={{ color, fontWeight: 700, fontSize: size }}>
      {isPos ? '+' : '-'}{formatted}
      {rate !== undefined && (
        <span style={{ fontSize: size - 2.5, marginLeft: 5, fontWeight: 600 }}>
          ({sign}{Math.abs(rate).toFixed(2)}%)
        </span>
      )}
    </span>
  )
}
