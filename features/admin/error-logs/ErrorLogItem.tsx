'use client'

import { Checkbox } from '@/components/ui/checkbox'
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
  const hasContext = Object.keys(log.context).length > 0

  return (
    <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={`오류 로그 선택 ${log.errorType} ${fmtDateTime(log.createdAt)}`}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          className="mt-1.5"
        />
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

          {/* context — 값이 전부 문자열(API 계약)이라 "key: value" 한 줄씩 표시한다 */}
          {hasContext && (
            <pre className="mt-1 text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 font-mono whitespace-pre-wrap break-words">
              {Object.entries(log.context).map(([key, value]) => `${key}: ${value}`).join('\n')}
            </pre>
          )}

          {/* stackTrace 접기/펼치기 — 앱 공통 디스클로저(VrSettingsSection "고급 설정")와 같은 네이티브 details.
              스택 없이 저장된 로그(클라이언트 보고 등)는 대신 안내 */}
          {log.stackTrace?.trim() ? (
            <details className="group mt-1.5">
              <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5 hover:text-foreground">
                <span aria-hidden className="transition-transform group-open:rotate-90">▸</span>
                스택트레이스
              </summary>
              <pre className="mt-1 text-sm bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {log.stackTrace}
              </pre>
            </details>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">스택트레이스 없음</p>
          )}
        </div>
      </div>
    </div>
  )
}
