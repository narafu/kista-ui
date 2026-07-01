import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAccounts } from '@entities/user'
import type { AdminAccount, AdminAccountStrategy } from '@entities/user'
import { RevealableValue } from '@widgets/revealable-value'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

const VALID_SIZES = ['10', '30', '50', '100'] as const

const BROKER_LABEL: Record<string, string> = {
  KIS: '한국투자증권',
  TOSS: '토스증권',
}

const STRATEGY_STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'var(--status-ok)',
  PAUSED: 'var(--warn)',
}

function strategyTypeShort(type: string): string {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}

function StrategyBadge({ strategy }: { strategy: AdminAccountStrategy }) {
  const color = STRATEGY_STATUS_COLOR[strategy.status] ?? 'var(--muted-foreground)'
  return (
    <span
      className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-bold border bg-muted/40 whitespace-nowrap"
      style={{ borderColor: color, color }}
    >
      {strategyTypeShort(strategy.type)}-{strategy.ticker}
    </span>
  )
}

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '7d' || raw === '30d' || raw === 'custom') return raw
  return 'all'
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

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, size: rawSize, page: rawPage, from, to } = await searchParams
  const range = parseRangePreset(rawRange)
  const size = parseSize(rawSize)
  const { from: resolvedFrom, to: resolvedTo } = resolveFromTo(range, from, to)

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
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          등록된 계좌가 없습니다
        </div>
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
                    {acc.broker ? (BROKER_LABEL[acc.broker] ?? acc.broker) : '-'}
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
