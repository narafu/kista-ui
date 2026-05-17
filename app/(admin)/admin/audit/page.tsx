import { getAuthToken } from '@/lib/auth/token'
import { listAdminAuditLogs } from '@/lib/api/admin'
import type { AdminAuditLog } from '@/types/admin'

export default async function AdminAuditPage() {
  const token = await getAuthToken()
  const logs: AdminAuditLog[] = token
    ? await listAdminAuditLogs(token).catch(() => [])
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">감사 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">관리자 액션 기록 최근 100건</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          감사 로그가 없습니다
        </div>
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
    </div>
  )
}
