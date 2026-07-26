import { Suspense } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminErrorLogsQueryOptions, listAdminAuditLogs, getAdminAnomalies } from '@entities/admin'
import type { AdminAuditLog, AdminAnomalies } from '@entities/admin'
import { LogsFilterChips } from '@features/admin/logs'
import { AnomaliesSection, ErrorLogsSection, AuditLogsSection } from '@widgets/admin-log-list'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

type LogType = 'all' | 'audit' | 'error' | 'anomaly'

const EMPTY_ANOMALIES: AdminAnomalies = { pausedAccounts: [], inactiveAccounts: [] }

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
  const logType = (params.type ?? 'all') as LogType

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
      ? listAdminAuditLogs(token, audFrom, audTo).catch(() => [] as AdminAuditLog[])
      : ([] as AdminAuditLog[]),
    showAnomaly && token
      ? getAdminAnomalies(token, 7, anoFrom, anoTo).catch(() => EMPTY_ANOMALIES)
      : EMPTY_ANOMALIES,
  ])

  const auditTotalPages = Math.max(1, Math.ceil(allAuditLogs.length / audSize))
  const auditPage = Math.min(parsePage(params.ap), auditTotalPages)

  const auditLogs = allAuditLogs.slice((auditPage - 1) * audSize, auditPage * audSize)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">관리자 · 오류 · 이상 징후 통합 뷰</p>
      </div>

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
            <ErrorLogsSection page={parsePage(params.ep)} size={errSize} range={errRange} from={errFrom} to={errTo} />
          </HydrationBoundary>
        )}
        {showAudit && (
          <AuditLogsSection
            logs={auditLogs}
            total={allAuditLogs.length}
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
