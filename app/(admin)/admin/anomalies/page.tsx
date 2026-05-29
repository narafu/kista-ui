import { getAuthToken } from '@/lib/auth/token'
import { getAdminAnomalies } from '@/lib/api/admin'
import type { AdminAnomalies, AdminAnomalyAccount, AdminAnomalyTrade } from '@/types/admin'

const EMPTY_ANOMALIES: AdminAnomalies = {
  failedTrades: [],
  pausedAccounts: [],
  inactiveAccounts: [],
}

export default async function AdminAnomaliesPage() {
  const token = await getAuthToken()
  const anomalies: AdminAnomalies = token
    ? await getAdminAnomalies(token).catch(() => EMPTY_ANOMALIES)
    : EMPTY_ANOMALIES

  const totalCount =
    anomalies.failedTrades.length +
    anomalies.pausedAccounts.length +
    anomalies.inactiveAccounts.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">이상 징후</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalCount > 0
            ? `총 ${totalCount}건의 이상 징후가 감지됐습니다`
            : '감지된 이상 징후가 없습니다'}
        </p>
      </div>

      <div className="space-y-8">
        {/* 실패 거래 */}
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            실패한 거래
            <Badge count={anomalies.failedTrades.length} color="red" />
          </h2>
          {anomalies.failedTrades.length === 0 ? (
            <EmptyState text="최근 30일간 실패한 거래가 없습니다" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">날짜</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">소유자</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">종목</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">방향</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {anomalies.failedTrades.map((t: AdminAnomalyTrade) => (
                    <tr key={t.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.tradeDate}</td>
                      <td className="px-4 py-2.5 font-medium">{t.ownerNickname}</td>
                      <td className="px-4 py-2.5">{t.ticker}</td>
                      <td className={`px-4 py-2.5 font-semibold ${t.direction === 'BUY' ? 'text-blue-600' : 'text-red-500'}`}>
                        {t.direction === 'BUY' ? '매수' : '매도'}
                      </td>
                      <td className="px-4 py-2.5 text-right">{t.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 일시정지 계좌 */}
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            일시정지 계좌
            <Badge count={anomalies.pausedAccounts.length} color="amber" />
          </h2>
          {anomalies.pausedAccounts.length === 0 ? (
            <EmptyState text="일시정지된 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.pausedAccounts} />
          )}
        </section>

        {/* 7일 이상 거래 없는 ACTIVE 계좌 */}
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            비활성 계좌 <span className="text-xs font-normal text-muted-foreground">(7일 거래 없음)</span>
            <Badge count={anomalies.inactiveAccounts.length} color="slate" />
          </h2>
          {anomalies.inactiveAccounts.length === 0 ? (
            <EmptyState text="비활성 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.inactiveAccounts} />
          )}
        </section>
      </div>
    </div>
  )
}

function Badge({ count, color }: { count: number; color: 'red' | 'amber' | 'slate' }) {
  if (count === 0) return null
  const cls =
    color === 'red' ? 'bg-red-100 text-red-700' :
    color === 'amber' ? 'bg-amber-100 text-amber-700' :
    'bg-muted text-muted-foreground'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {count}
    </span>
  )
}

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
          {accounts.map((a: AdminAnomalyAccount) => (
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
