'use client'

import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'

type Status = 'ACTIVE' | 'PAUSED' | 'PENDING' | 'UNKNOWN'

// 색상만 UI에서 관리 — 라벨은 meta.strategyStatuses에서 수신 (PENDING/UNKNOWN은 API 미제공이므로 fallback 유지)
const STATUS_STYLE: Record<Status, { dot: string; text: string; fallbackLabel: string }> = {
  ACTIVE:  { dot: 'bg-status-ok',        text: 'text-status-ok',        fallbackLabel: '운영중' },
  PAUSED:  { dot: 'bg-warn',             text: 'text-warn',             fallbackLabel: '일시중지' },
  PENDING: { dot: 'bg-rose-400',         text: 'text-rose-400',         fallbackLabel: '대기중' },
  UNKNOWN: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', fallbackLabel: '알 수 없음' },
}

interface Props {
  status: Status
  className?: string
  hideLabel?: boolean
}

export function StatusDot({ status, className, hideLabel }: Props) {
  const { meta } = useMeta()
  const cfg = STATUS_STYLE[status] ?? STATUS_STYLE.UNKNOWN
  const label = meta.strategyStatuses.find(s => s.code === status)?.label ?? cfg.fallbackLabel
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      {...(hideLabel ? { role: 'img', 'aria-label': label } : {})}
    >
      <span className={cn('size-2 rounded-full shrink-0', cfg.dot)} title={hideLabel ? label : undefined} />
      {!hideLabel && <span className={cn('text-xs font-medium', cfg.text)}>{label}</span>}
    </span>
  )
}
