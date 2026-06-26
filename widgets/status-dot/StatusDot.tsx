'use client'

import { cn } from '@shared/lib/utils'

type Status = 'ACTIVE' | 'PAUSED' | 'PENDING' | 'UNKNOWN'

const STATUS_STYLE: Record<Status, { dot: string; text: string }> = {
  ACTIVE:  { dot: 'bg-status-ok',        text: 'text-status-ok' },
  PAUSED:  { dot: 'bg-warn',             text: 'text-warn' },
  PENDING: { dot: 'bg-rose-400',         text: 'text-rose-400' },
  UNKNOWN: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}

interface Props {
  status: Status
  className?: string
  hideLabel?: boolean
  labelClassName?: string
}

export function StatusDot({ status, className, hideLabel, labelClassName }: Props) {
  const cfg = STATUS_STYLE[status] ?? STATUS_STYLE.UNKNOWN
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      {...(hideLabel ? { role: 'img', 'aria-label': status } : {})}
    >
      <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} title={hideLabel ? status : undefined} />
      {!hideLabel && <span className={cn('text-xs font-medium', cfg.text, labelClassName)}>{status}</span>}
    </span>
  )
}
