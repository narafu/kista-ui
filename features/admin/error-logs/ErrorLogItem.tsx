'use client'

import { useState } from 'react'
import type { AppErrorLog } from '@entities/user'

export function ErrorLogItem({ log }: { log: AppErrorLog }) {
  const [open, setOpen] = useState(false)
  const hasContext = Object.keys(log.context).length > 0

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* errorType 뱃지 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
              {log.errorType}
            </span>
          </div>

          {/* message */}
          <p className="text-sm mt-1 font-medium truncate" title={log.message}>{log.message}</p>

          {/* context */}
          {hasContext && (
            <p className="mt-1 text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 font-mono truncate" title={JSON.stringify(log.context)}>
              {JSON.stringify(log.context)}
            </p>
          )}

          {/* stackTrace 접기/펼치기 */}
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
        </div>

        {/* 발생 시각 */}
        <time className="text-sm text-muted-foreground shrink-0">
          {new Date(log.createdAt).toLocaleString('ko-KR')}
        </time>
      </div>
    </div>
  )
}
