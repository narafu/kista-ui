import { Badge } from '@/components/ui/badge'
import type { Strategy } from '@/types/account'

interface Props {
  strategy: Strategy
}

const STRATEGY_CONFIG: Record<Strategy, { label: string; className: string }> = {
  INFINITE: {
    label: 'Infinite',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  PRIVACY: {
    label: 'Privacy',
    className: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  },
}

export function StrategyBadge({ strategy }: Props) {
  const config = STRATEGY_CONFIG[strategy]
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}
