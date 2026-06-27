import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers, getMe } from '@entities/user'
import { AdminUsersTable } from '@widgets/admin-user-list'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '7d' || raw === '30d' || raw === 'custom') return raw
  return 'all'
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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, from, to } = await searchParams
  const range = parseRangePreset(rawRange)
  const { from: resolvedFrom, to: resolvedTo } = resolveFromTo(range, from, to)

  const token = await getAuthToken()
  const [users, me] = token
    ? await Promise.all([
        listAdminUsers(token, undefined, resolvedFrom, resolvedTo).catch(() => []),
        getMe(token).catch(() => null),
      ])
    : [[], null]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">사용자 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
      </div>
      <AdminUsersTable
        initialUsers={users}
        currentUserId={me?.id ?? null}
        // eslint-disable-next-line react-doctor/jsx-no-jsx-as-prop
        filterBar={<RangeFilterBar current={range} from={from} to={to} />}
      />
    </div>
  )
}
