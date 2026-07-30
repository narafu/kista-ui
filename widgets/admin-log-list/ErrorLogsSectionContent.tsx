'use client'

import { Suspense } from 'react'

import { useAdminErrorLogsQuery } from '@entities/admin'
import { ErrorLogsSectionClient } from '@features/admin/error-logs'
import { EmptyState } from '@shared/ui/EmptyState'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { Surface } from '@shared/ui/Surface'
import { UrlRangeFilterBar, type RangePreset } from '@shared/ui/UrlRangeFilterBar'

interface Props {
  page: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}

export function ErrorLogsSectionContent({ page, size, range, from, to }: Props) {
  const { data: allLogs = [] } = useAdminErrorLogsQuery({ limit: 500, from, to })
  const totalPages = Math.max(1, Math.ceil(allLogs.length / size))
  const currentPage = Math.min(page, totalPages)
  const logs = allLogs.slice((currentPage - 1) * size, currentPage * size)

  return (
    <Surface as="section" className="p-4 lg:p-5">
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          오류 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {allLogs.length}건</span>
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
      {logs.length === 0 ? <EmptyState message="기록된 오류가 없습니다" /> : <ErrorLogsSectionClient logs={logs} />}
      <PaginationBar page={currentPage} totalPages={totalPages} pageParam="ep" />
    </Surface>
  )
}
