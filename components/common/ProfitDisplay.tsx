import { cn } from '@/lib/utils'

interface Props {
  amount?: number
  rate?: number
  size?: 'sm' | 'md' | 'lg'
  full?: boolean  // true이면 금액+수익률 함께 표시
  className?: string
}

export function ProfitDisplay({ amount, rate, size = 'md', full, className }: Props) {
  const isPos = (rate ?? amount ?? 0) >= 0
  const color = isPos ? 'text-pos' : 'text-neg'
  const sizeMap = { sm: 'text-sm', md: 'text-base', lg: 'text-xl font-bold' }
  const sign = isPos ? '+' : ''

  return (
    <span className={cn('inline-flex items-baseline gap-1.5 flex-wrap', sizeMap[size], color, className)}>
      {full && amount !== undefined && (
        <span>
          {sign}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )}
      {rate !== undefined && (
        <span className={full ? 'text-[0.85em] opacity-80' : ''}>
          {sign}{Math.abs(rate).toFixed(2)}%
        </span>
      )}
      {!full && amount !== undefined && rate === undefined && (
        <span>{sign}{amount.toLocaleString()}</span>
      )}
    </span>
  )
}
