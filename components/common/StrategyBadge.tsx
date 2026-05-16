import type { Strategy } from '@/types/account'

interface Props {
  strategy: Strategy
}

export function StrategyBadge({ strategy }: Props) {
  const styles = strategy === 'INFINITE'
    ? { background: 'var(--rose-50)', color: 'var(--rose-600)' }
    : { background: '#EFE7DD', color: '#7A5B33' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1,
        ...styles,
      }}
    >
      {strategy === 'INFINITE' ? 'Infinite' : 'Privacy'}
    </span>
  )
}
