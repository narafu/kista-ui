import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/user'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies, AdminAnomalyAccount } from '@entities/user'
import { ErrorLogItem } from '@features/admin/error-logs'
import { LogsFilterChips } from '@features/admin/logs'

type LogType = 'all' | 'audit' | 'error' | 'anomaly'

const EMPTY_ANOMALIES: AdminAnomalies = { pausedAccounts: [], inactiveAccounts: [] }

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type = 'all' } = await searchParams
  const logType = type as LogType
  const token = await getAuthToken()

  const showAudit   = logType === 'all' || logType === 'audit'
  const showError   = logType === 'all' || logType === 'error'
  const showAnomaly = logType === 'all' || logType === 'anomaly'

  const [auditLogs, errorLogs, anomalies] = await Promise.all([
    showAudit && token
      ? listAdminAuditLogs(token).catch(() => [] as AdminAuditLog[])
      : ([] as AdminAuditLog[]),
    showError && token
      ? listAdminErrorLogs(token).catch(() => [] as AppErrorLog[])
      : ([] as AppErrorLog[]),
    showAnomaly && token
      ? getAdminAnomalies(token).catch(() => EMPTY_ANOMALIES)
      : EMPTY_ANOMALIES,
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">감사 · 오류 · 이상 징후 통합 뷰</p>
      </div>

      <LogsFilterChips />

      <div className="mt-6 space-y-8">
        {showAnomaly && <AnomaliesSection anomalies={anomalies} />}
        {showError   && <ErrorLogsSection logs={errorLogs} />}
        {showAudit   && <AuditLogsSection logs={auditLogs} />}
      </div>
    </div>
  )
}

// ── 이상 징후 섹션 ──────────────────────────────────────────────────────────
function AnomaliesSection({ anomalies }: { anomalies: AdminAnomalies }) {
  const total = anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length
  return (
    <section>
      <h2 className="text-base font-bold mb-3">
        이상 징후
        {total > 0 && (
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {total}
          </span>
        )}
      </h2>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
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
function ErrorLogsSection({ logs }: { logs: AppErrorLog[] }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-3">
        오류 로그
        <span className="ml-2 text-xs font-normal text-muted-foreground">최근 {logs.length}건</span>
      </h2>
      {logs.length === 0 ? (
        <EmptyState text="기록된 오류가 없습니다" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <ErrorLogItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── 감사 로그 섹션 ──────────────────────────────────────────────────────────
function AuditLogsSection({ logs }: { logs: AdminAuditLog[] }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-3">
        감사 로그
        <span className="ml-2 text-xs font-normal text-muted-foreground">최근 {logs.length}건</span>
      </h2>
      {logs.length === 0 ? (
        <EmptyState text="감사 로그가 없습니다" />
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
                      <span className="text-xs text-muted-foreground">
                        {log.targetType}
                        {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    admin: {log.adminId.slice(0, 8)}…
                  </p>
                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <pre className="mt-1 text-xs text-muted-foreground bg-muted/40 rounded p-1 overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
                <time className="text-xs text-muted-foreground shrink-0">
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
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
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.accountNoMasked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
