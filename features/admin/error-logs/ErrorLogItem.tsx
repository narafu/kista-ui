'use client'

import { useState } from 'react'
import type { AppErrorLog } from '@entities/admin'
import { fmtDateTime } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'

interface Props {
  log: AppErrorLog
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

export function ErrorLogItem({ log, checked = false, onCheckedChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const hasContext = Object.keys(log.context).length > 0

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        <label className="mt-0.5 -m-1 inline-flex shrink-0 p-1">
          <input
            type="checkbox"
            aria-label={`오류 로그 선택 ${log.errorType} ${fmtDateTime(log.createdAt)}`}
            checked={checked}
            disabled={disabled}
            onChange={(event) => onCheckedChange?.(event.target.checked)}
            className="size-4 rounded border-border accent-primary"
          />
        </label>
        <div className="flex-1 min-w-0">
          {/* errorType 뱃지 — 관리자 디버깅용으로 원본 코드를 그대로 표시한다. 발생 시각은 같은 줄에 두고 좁은 화면에선 줄바꿈 */}
          <div className="flex items-center justify-between gap-x-2 gap-y-1 flex-wrap">
            <Badge tone="brand" size="sm">{log.errorType}</Badge>
            <time dateTime={log.createdAt} className="text-sm text-muted-foreground">
              {fmtDateTime(log.createdAt)}
            </time>
          </div>

          {/* message */}
          <p className="text-sm mt-1 font-medium break-words">{log.message}</p>

          {/* context */}
          {hasContext && (
            <pre className="mt-1 text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          )}

          {/* stackTrace 접기/펼치기 — 스택 없이 저장된 로그(클라이언트 보고 등)는 버튼 대신 안내 */}
          {log.stackTrace?.trim() ? (
            <>
              <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="mt-1.5 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {open ? '스택트레이스 접기' : '스택트레이스 보기'}
              </button>
              {open && (
                <pre className="mt-1 text-sm bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {log.stackTrace}
                </pre>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">스택트레이스 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}
