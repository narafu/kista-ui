import type { StrategyStatus } from '@/types/account'

interface Props {
  status: StrategyStatus
}

export function TradingStatusIndicator({ status }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={
          status === 'ACTIVE'
            ? 'inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse'
            : 'inline-block h-2 w-2 rounded-full bg-gray-400'
        }
      />
      <span className="text-xs text-muted-foreground">
        {status === 'ACTIVE' ? '운용중' : '중지'}
      </span>
    </div>
  )
}
