import type { StrategyStatus } from '@/types/account'

interface Props {
  status: StrategyStatus
}

export function TradingStatusIndicator({ status }: Props) {
  const config = status === 'ACTIVE'
    ? { fg: 'var(--status-ok)', label: '운영중', pulse: true }
    : { fg: 'var(--warn)', label: '일시중지', pulse: false }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: config.fg }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        background: config.fg,
        boxShadow: config.pulse ? `0 0 0 3px ${status === 'ACTIVE' ? 'rgba(47,138,87,.18)' : 'transparent'}` : 'none',
      }} />
      {config.label}
    </span>
  )
}
