import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers, getMe } from '@entities/user'
import { AdminUsersTable } from '@widgets/admin-user-list'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === 'custom') return raw
  return 'all'
}

function resolveFromTo(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'custom') return { from, to }
  return {}
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
        filterBar={<RangeFilterBar current={range} from={from} to={to} presets={['all', 'custom']} />}
      />
    </div>
  )
}
