import { StrategyBadge } from './StrategyBadge'
import { TradingStatusIndicator } from './TradingStatusIndicator'
import { ProfitDisplay } from './ProfitDisplay'
import type { Account } from '@/types/account'

interface Props {
  account: Account
  profitLoss?: number
  profitLossRate?: number
}

export function AccountCard({ account, profitLoss = 0, profitLossRate = 0 }: Props) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 14,
        boxShadow: 'var(--sh-card)',
        border: '1px solid var(--border)',
        padding: 18,
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s, border-color .15s',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = 'var(--sh-pop)'
        el.style.borderColor = 'var(--rose-200)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = 'var(--sh-card)'
        el.style.borderColor = 'var(--border)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>{account.nickname}</div>
        <TradingStatusIndicator status={account.strategyStatus} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <StrategyBadge strategy={account.strategy} />
        <span className="num" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{account.accountNoMasked}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>평가 손익</span>
        <ProfitDisplay amount={profitLoss} rate={profitLossRate} />
      </div>
    </div>
  )
}
