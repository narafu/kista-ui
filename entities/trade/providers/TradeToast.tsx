import { TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react'
import { fmtMoney, fmtQuantity } from '@shared/lib/format'
import type { TradeEvent } from '@entities/trade'

interface Props {
  event: TradeEvent
}

const KIND_CONFIG = {
  BUY:  { icon: TrendingUp,   color: 'text-pos',                    bg: 'bg-pos/10',   label: '매수 체결' },
  SELL: { icon: TrendingDown, color: 'text-neg',                    bg: 'bg-neg/10',   label: '매도 체결' },
  INFO: { icon: Info,         color: 'text-[var(--brand-fg-soft)]', bg: 'bg-[var(--brand-soft-bg)]', label: '알림' },
  FAIL: { icon: AlertCircle,  color: 'text-status-error',           bg: 'bg-status-error-bg', label: '실패' },
} as const

export function TradeToast({ event }: Props) {
  const cfg = KIND_CONFIG[event.kind] ?? KIND_CONFIG.INFO
  const Icon = cfg.icon
  // null(구버전 메시지·INFO/FAIL)은 USD. 원화·USDT 체결은 코인 거래소뿐이라 수량을 소수로 보여준다
  const currency = event.currency ?? 'USD'
  const isCrypto = currency !== 'USD'

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
          {event.quantity != null && (isCrypto ? ` ${fmtQuantity(event.quantity)}` : ` ${event.quantity}주`)}
          {event.price != null && ` @ ${fmtMoney(event.price, currency)}`}
        </p>
        {event.message && (
          <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
        )}
      </div>
    </div>
  )
}
