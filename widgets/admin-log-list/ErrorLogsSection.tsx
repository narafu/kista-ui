import { Suspense } from 'react'
import { UrlRangeFilterBar, type RangePreset } from '@shared/ui/UrlRangeFilterBar'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { ErrorLogsSectionClient } from '@features/admin/error-logs'
import type { AppErrorLog } from '@entities/admin'

export function ErrorLogsSection({
  logs, total, page, totalPages, size, range, from, to,
}: {
  logs: AppErrorLog[]
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
          오류 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
        </h2>
        <div className="flex items-center gap-2 lg:flex-1">
          <Suspense fallback={null}>
            <UrlRangeFilterBar current={range} from={from} to={to} paramPrefix="err" pageParamKeys={['ep']} />
          </Suspense>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <PageSizeSelector value={String(size)} pageParamKeys={['ep']} sizeParamKey="errSize" />
            </Suspense>
          </div>
        </div>
      </div>
      {logs.length === 0 ? (
        <EmptyState message="기록된 오류가 없습니다" />
      ) : (
        <ErrorLogsSectionClient logs={logs} />
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ep" />
    </section>
  )
}
