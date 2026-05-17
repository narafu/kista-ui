import { getAuthToken } from '@/lib/auth/token'
import { listAdminAccounts } from '@/lib/api/admin'
import type { AdminAccount } from '@/types/admin'

export default async function AdminAccountsPage() {
  const token = await getAuthToken()
  const accounts: AdminAccount[] = token
    ? await listAdminAccounts(token).catch(() => [])
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">계좌 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 사용자 계좌 목록 ({accounts.length}개)</p>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          등록된 계좌가 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">소유자</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">계좌번호</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">종목</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">전략</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{acc.ownerNickname}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{acc.accountNoMasked}</td>
                  <td className="px-4 py-3">{acc.ticker ?? '-'}</td>
                  <td className="px-4 py-3">{acc.strategyType ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      acc.strategyStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {acc.strategyStatus ?? '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
