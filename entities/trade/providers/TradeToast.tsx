import { TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import type { TradeEvent } from '@entities/trade'

interface Props {
  event: TradeEvent
}

const KIND_CONFIG = {
  BUY:  { icon: TrendingUp,   color: 'text-pos',                    bg: 'bg-pos/10',   label: '매수 체결' },
  SELL: { icon: TrendingDown, color: 'text-neg',                    bg: 'bg-neg/10',   label: '매도 체결' },
  INFO: { icon: Info,         color: 'text-[var(--brand-fg-soft)]', bg: 'bg-rose-50',  label: '알림'     },
  FAIL: { icon: AlertCircle,  color: 'text-warn',                   bg: 'bg-warn-bg',  label: '실패'     },
} as const

export function TradeToast({ event }: Props) {
  const cfg = KIND_CONFIG[event.kind] ?? KIND_CONFIG.INFO
  const Icon = cfg.icon

  return (
    <div className="flex items-start gap-3 p-1 min-w-[240px]">
      <div className={`size-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`size-4 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
          <span className="text-xs text-muted-foreground truncate">{event.accountNickname}</span>
        </div>
        <p className="text-sm font-semibold text-foreground mt-0.5">
          {event.ticker}
          {event.quantity != null && ` ${event.quantity}주`}
          {event.price != null && ` @ $${fmtUsd(event.price)}`}
        </p>
        {event.message && (
          <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
        )}
      </div>
    </div>
  )
}
