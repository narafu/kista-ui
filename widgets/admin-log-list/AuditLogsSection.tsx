import { Suspense } from 'react'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtDateTime } from '@shared/lib/format'
import type { AdminAuditLog } from '@entities/user'

export function AuditLogsSection({
  logs, total, page, totalPages, size, range, from, to,
}: {
  logs: AdminAuditLog[]
  total: number
  page: number
  totalPages: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}) {
  return (
    <section>
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          관리자 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
        </h2>
        <div className="flex items-center gap-2 lg:flex-1">
          <Suspense fallback={null}>
            <RangeFilterBar current={range} from={from} to={to} paramPrefix="aud" pageParamKeys={['ap']} />
          </Suspense>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <PageSizeSelector value={String(size)} pageParamKeys={['ap']} sizeParamKey="audSize" />
            </Suspense>
          </div>
        </div>
      </div>
      {logs.length === 0 ? (
        <EmptyState message="관리자 로그가 없습니다" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                      {log.action}
                    </span>
                    {log.targetType && (
                      <span className="text-sm text-muted-foreground">
                        {log.targetType}
                        {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    admin: {log.adminId.slice(0, 8)}…
                  </p>
                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <pre className="mt-1 text-sm text-muted-foreground bg-muted/40 rounded p-1 overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
                <time className="text-sm text-muted-foreground shrink-0">
                  {fmtDateTime(log.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ap" />
    </section>
  )
}
