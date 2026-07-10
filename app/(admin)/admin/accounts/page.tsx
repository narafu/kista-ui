import { getAuthToken } from '@shared/lib/auth/token'
import { formatBrokerLabel } from '@shared/lib/api-schema'
import { listAdminAccounts } from '@entities/user'
import type { AdminAccount, AdminAccountStrategy } from '@entities/user'
import { strategyTypeShort } from '@entities/strategy'
import { RevealableValue } from '@widgets/revealable-value'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar } from '@shared/ui/RangeFilterBar'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'

const STRATEGY_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'var(--status-ok)',
  PAUSED: 'var(--warn)',
}

function StrategyBadge({ strategy }: { strategy: AdminAccountStrategy }) {
  const color = STRATEGY_STATUS_COLOR[strategy.status] ?? 'var(--muted-foreground)'
  return (
    <Badge tone='none' size='sm' className="border bg-muted/40 font-bold" style={{ borderColor: color, color }}>
      {strategyTypeShort(strategy.type)}-{strategy.ticker}
    </Badge>
  )
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange, 'all')
  const size = parseSize(rawSize)
  const { from: resolvedFrom, to: resolvedTo } = resolveRange(range, from, to)

  const token = await getAuthToken()
  const all: AdminAccount[] = token ? await listAdminAccounts(token, resolvedFrom, resolvedTo).catch(() => []) : []

  const totalPages = Math.max(1, Math.ceil(all.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)
  const accounts = all.slice((page - 1) * size, page * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">계좌 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 사용자 계좌 목록 (총 {all.length}개)</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <RangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={String(size)} />
      </div>

      {accounts.length === 0 ? (
        <EmptyState message="등록된 계좌가 없습니다." />
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">소유자</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">증권사</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">계좌번호</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">전략</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{acc.ownerNickname}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {acc.broker ? formatBrokerLabel(acc.broker) : '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    <RevealableValue
                      value={acc.accountNoMasked ?? ''}
                      hiddenDisplay={acc.accountNoMasked ?? ''}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {acc.strategies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {acc.strategies.map((s) => (
                          <StrategyBadge key={s.id} strategy={s} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} />
    </div>
  )
}
