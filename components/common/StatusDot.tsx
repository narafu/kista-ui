// components/common/StatusDot.tsx
import { cn } from '@lib/utils'

type Status = 'ACTIVE' | 'PAUSED' | 'PENDING' | 'UNKNOWN'

const STATUS_CONFIG: Record<Status, { dot: string; label: string; text: string }> = {
  ACTIVE:  { dot: 'bg-status-ok',        label: '운영중',   text: 'text-status-ok' },
  PAUSED:  { dot: 'bg-warn',             label: '일시중지', text: 'text-warn' },
  PENDING: { dot: 'bg-rose-400',         label: '대기중',   text: 'text-rose-400' },
  UNKNOWN: { dot: 'bg-muted-foreground', label: '알 수 없음', text: 'text-muted-foreground' },
}

interface Props {
  status: Status
  className?: string
  hideLabel?: boolean
}

export function StatusDot({ status, className, hideLabel }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} />
      {!hideLabel && <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>}
    </span>
  )
}
