import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminErrorLogs } from '@entities/user'
import type { AppErrorLog } from '@entities/user'
import { ErrorLogItem } from '@features/admin/error-logs'

export default async function AdminErrorLogsPage() {
  const token = await getAuthToken()
  const logs: AppErrorLog[] = token
    ? await listAdminErrorLogs(token).catch(() => [])
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">오류 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">
          최근 {logs.length}건
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          기록된 오류가 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <ErrorLogItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
