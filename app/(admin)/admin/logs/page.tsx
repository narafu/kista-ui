import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminErrorLogsQueryOptions, listAdminAuditLogs, getAdminAnomalies } from '@entities/admin'
import type { AdminAuditLog } from '@entities/admin'
import { LogsFilterChips } from '@features/admin/logs'
import { AnomaliesSection, ErrorLogsSectionContent, AuditLogsSection } from '@widgets/admin-log-list'
import { PageHeader } from '@widgets/page-header'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

const LOG_TYPES = ['all', 'audit', 'error', 'anomaly'] as const
type LogType = (typeof LOG_TYPES)[number]

function parseLogType(value?: string): LogType {
  return LOG_TYPES.find((type) => type === value) ?? 'all'
}

export const metadata: Metadata = {
  title: '운영 로그',
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    anoRange?: string; anoFrom?: string; anoTo?: string
    errRange?: string; errFrom?: string; errTo?: string; errSize?: string
    audRange?: string; audFrom?: string; audTo?: string; audSize?: string
    ap?: string; ep?: string
  }>
}) {
  const params = await searchParams
  const logType = parseLogType(params.type)

  const anoRange = parseRangePreset(params.anoRange, '7d')
  const errRange = parseRangePreset(params.errRange, '7d')
  const audRange = parseRangePreset(params.audRange, '7d')
  const errSize  = parseSize(params.errSize)
  const audSize  = parseSize(params.audSize)
  const token = await getAuthToken()

  const showAudit   = logType === 'all' || logType === 'audit'
  const showError   = logType === 'all' || logType === 'error'
  const showAnomaly = logType === 'all' || logType === 'anomaly'

  const { from: anoFrom, to: anoTo } = resolveRange(anoRange, params.anoFrom, params.anoTo)
  const { from: errFrom, to: errTo } = resolveRange(errRange, params.errFrom, params.errTo)
  const { from: audFrom, to: audTo } = resolveRange(audRange, params.audFrom, params.audTo)

  const queryClient = createQueryClient()
  if (showError && token) {
    await queryClient.prefetchQuery(adminErrorLogsQueryOptions({ limit: 500, from: errFrom, to: errTo }, token))
  }

  const [allAuditLogs, anomalies] = await Promise.all([
    showAudit && token
      ? listAdminAuditLogs(token, audFrom, audTo).catch(() => null)
      : ([] as AdminAuditLog[]),
    showAnomaly && token
      ? getAdminAnomalies(token, 7, anoFrom, anoTo).catch(() => null)
      : null,
  ])

  // 조회 실패(null)는 섹션이 SectionError로 표시한다 — 빈 목록과 구분
  const auditAll = allAuditLogs ?? []
  const auditTotalPages = Math.max(1, Math.ceil(auditAll.length / audSize))
  const auditPage = Math.min(parsePage(params.ap), auditTotalPages)

  const auditLogs = allAuditLogs && auditAll.slice((auditPage - 1) * audSize, auditPage * audSize)

  return (
    <div>
      <PageHeader title="운영 로그" description="관리자 · 오류 · 이상 징후 통합 뷰" className="mb-6" />

      <div className="mb-6">
        <Suspense fallback={null}><LogsFilterChips /></Suspense>
      </div>

      <div className="space-y-8 reveal-stagger">
        {showAnomaly && (
          <AnomaliesSection
            anomalies={anomalies}
            range={anoRange}
            from={params.anoFrom}
            to={params.anoTo}
          />
        )}
        {showError && (
          <HydrationBoundary state={dehydrate(queryClient)}>
            <ErrorLogsSectionContent page={parsePage(params.ep)} size={errSize} range={errRange} from={errFrom} to={errTo} />
          </HydrationBoundary>
        )}
        {showAudit && (
          <AuditLogsSection
            logs={auditLogs}
            total={auditAll.length}
            page={auditPage}
            totalPages={auditTotalPages}
            size={audSize}
            range={audRange}
            from={params.audFrom}
            to={params.audTo}
          />
        )}
      </div>
    </div>
  )
}
