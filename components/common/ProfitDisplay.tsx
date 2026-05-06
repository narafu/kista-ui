interface Props {
  amount: number
  rate?: number
  className?: string
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toFixed(0)
}

function formatFull(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ProfitDisplay({ amount, rate, className }: Props) {
  const isPositive = amount >= 0
  const colorClass = isPositive ? 'text-green-600' : 'text-red-500'
  const sign = isPositive ? '+' : ''

  return (
    <span className={`font-semibold ${colorClass} ${className ?? ''}`}>
      {/* 모바일: 축약형 */}
      <span className="lg:hidden">
        {sign}{formatAmount(amount)}
        {rate !== undefined && <span className="text-xs ml-1">({sign}{rate.toFixed(2)}%)</span>}
      </span>
      {/* 데스크탑: 전체 금액 */}
      <span className="hidden lg:inline">
        {sign}{formatFull(amount)}
        {rate !== undefined && <span className="text-xs ml-1">({sign}{rate.toFixed(2)}%)</span>}
      </span>
    </span>
  )
}
