import type { OrderDirection } from '@entities/trade'

interface Props {
  direction: OrderDirection
}

export function TradeDirectionBadge({ direction }: Props) {
  return direction === 'BUY' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--pos-bg)', color: 'var(--pos)' }}>
      매수
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--neg-bg)', color: 'var(--neg)' }}>
      매도
    </span>
  )
}
