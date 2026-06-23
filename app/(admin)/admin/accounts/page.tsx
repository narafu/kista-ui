import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAccounts } from '@entities/user'
import type { AdminAccount } from '@entities/user'
import { RevealableValue } from '@widgets/revealable-value'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'

const VALID_SIZES = ['10', '30', '50', '100'] as const

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string; page?: string }>
}) {
  const { size: rawSize, page: rawPage } = await searchParams
  const size = parseSize(rawSize)
  const token = await getAuthToken()
  const all: AdminAccount[] = token ? await listAdminAccounts(token).catch(() => []) : []

  const totalPages = Math.max(1, Math.ceil(all.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)
  const accounts = all.slice((page - 1) * size, page * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">계좌 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 사용자 계좌 목록 (총 {all.length}개)</p>
      </div>

      <div className="flex justify-end mb-4">
        <PageSizeSelector value={String(size)} />
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{acc.ownerNickname}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    <RevealableValue
                      value={acc.accountNoMasked ?? ''}
                      hiddenDisplay={acc.accountNoMasked ?? ''}
                    />
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
