import { Suspense } from 'react'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/user'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies, AdminAnomalyAccount } from '@entities/user'
import { ErrorLogItem } from '@features/admin/error-logs'
import { LogsFilterChips } from '@features/admin/logs'
import { RevealableValue } from '@widgets/revealable-value'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

type LogType = 'all' | 'audit' | 'error' | 'anomaly'

const VALID_SIZES = ['10', '30', '50', '100'] as const
const EMPTY_ANOMALIES: AdminAnomalies = { pausedAccounts: [], inactiveAccounts: [] }

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}


function resolveFromTo(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return { from, to }
  const days = range === '7d' ? 7 : 30
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  return {
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0],
  }
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
  const logType = (params.type ?? 'all') as LogType

  const anoRange = parseRangePreset(params.anoRange)
  const errRange = parseRangePreset(params.errRange)
  const audRange = parseRangePreset(params.audRange)
  const errSize  = parseSize(params.errSize)
  const audSize  = parseSize(params.audSize)
  const token = await getAuthToken()

  const showAudit   = logType === 'all' || logType === 'audit'
  const showError   = logType === 'all' || logType === 'error'
  const showAnomaly = logType === 'all' || logType === 'anomaly'

  const { from: anoFrom, to: anoTo } = resolveFromTo(anoRange, params.anoFrom, params.anoTo)
  const { from: errFrom, to: errTo } = resolveFromTo(errRange, params.errFrom, params.errTo)
  const { from: audFrom, to: audTo } = resolveFromTo(audRange, params.audFrom, params.audTo)

  const [allAuditLogs, allErrorLogs, anomalies] = await Promise.all([
    showAudit && token
      ? listAdminAuditLogs(token, audFrom, audTo).catch(() => [] as AdminAuditLog[])
      : ([] as AdminAuditLog[]),
    showError && token
      ? listAdminErrorLogs(token, 500, errFrom, errTo).catch(() => [] as AppErrorLog[])
      : ([] as AppErrorLog[]),
    showAnomaly && token
      ? getAdminAnomalies(token, 7, anoFrom, anoTo).catch(() => EMPTY_ANOMALIES)
      : EMPTY_ANOMALIES,
  ])

  const auditTotalPages = Math.max(1, Math.ceil(allAuditLogs.length / audSize))
  const errorTotalPages = Math.max(1, Math.ceil(allErrorLogs.length / errSize))
  const auditPage = Math.min(parsePage(params.ap), auditTotalPages)
  const errorPage = Math.min(parsePage(params.ep), errorTotalPages)

  const auditLogs = allAuditLogs.slice((auditPage - 1) * audSize, auditPage * audSize)
  const errorLogs = allErrorLogs.slice((errorPage - 1) * errSize, errorPage * errSize)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">관리자 · 오류 · 이상 징후 통합 뷰</p>
      </div>

      <div className="mb-6">
        <Suspense fallback={null}><LogsFilterChips /></Suspense>
      </div>

      <div className="space-y-8">
        {showAnomaly && (
          <AnomaliesSection
            anomalies={anomalies}
            range={anoRange}
            from={params.anoFrom}
            to={params.anoTo}
          />
        )}
        {showError && (
          <ErrorLogsSection
            logs={errorLogs}
            total={allErrorLogs.length}
            page={errorPage}
            totalPages={errorTotalPages}
            size={errSize}
            range={errRange}
            from={params.errFrom}
            to={params.errTo}
          />
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

// ── 이상 징후 섹션 ──────────────────────────────────────────────────────────
function AnomaliesSection({
  anomalies, range, from, to,
}: {
  anomalies: AdminAnomalies
  range: RangePreset
  from?: string
  to?: string
}) {
  const total = anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length
  return (
    <section>
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          이상징후(7일)
          {total > 0 && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <RangeFilterBar current={range} from={from} to={to} paramPrefix="ano" pageParamKeys={[]} />
          </Suspense>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            일시정지 계좌
            {anomalies.pausedAccounts.length > 0 && (
              <span className="ml-2 normal-case font-medium text-amber-600">
                {anomalies.pausedAccounts.length}
              </span>
            )}
          </p>
          {anomalies.pausedAccounts.length === 0 ? (
            <EmptyState text="일시정지된 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.pausedAccounts} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            비활성 계좌{' '}
            <span className="normal-case font-normal">(7일 거래 없음)</span>
            {anomalies.inactiveAccounts.length > 0 && (
              <span className="ml-2 font-medium text-slate-600">
                {anomalies.inactiveAccounts.length}
              </span>
            )}
          </p>
          {anomalies.inactiveAccounts.length === 0 ? (
            <EmptyState text="비활성 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.inactiveAccounts} />
          )}
        </div>
      </div>
    </section>
  )
}

// ── 오류 로그 섹션 ──────────────────────────────────────────────────────────
function ErrorLogsSection({
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
            <RangeFilterBar current={range} from={from} to={to} paramPrefix="err" pageParamKeys={['ep']} />
          </Suspense>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <PageSizeSelector value={String(size)} pageParamKeys={['ep']} sizeParamKey="errSize" />
            </Suspense>
          </div>
        </div>
      </div>
      {logs.length === 0 ? (
        <EmptyState text="기록된 오류가 없습니다" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <ErrorLogItem key={log.id} log={log} />
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ep" />
    </section>
  )
}

// ── 관리자 로그 섹션 ─────────────────────────────────────────────────────────
function AuditLogsSection({
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
        <EmptyState text="관리자 로그가 없습니다" />
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
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
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

// ── 공통 서브컴포넌트 ────────────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function AccountTable({ accounts }: { accounts: AdminAnomalyAccount[] }) {
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="min-w-[320px] w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">소유자</th>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">계좌번호</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((a) => (
            <tr key={a.id} className="hover:bg-muted/20">
              <td className="px-4 py-2.5 font-medium">{a.ownerNickname}</td>
              <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">
                <RevealableValue
                  value={a.accountNoMasked ?? ''}
                  hiddenDisplay={a.accountNoMasked ?? ''}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
