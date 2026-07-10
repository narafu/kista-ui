import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers, getMe } from '@entities/user'
import { AdminUsersTable } from '@widgets/admin-user-list'
import { RangeFilterBar } from '@shared/ui/RangeFilterBar'
import { parseRangePreset, resolveRange } from '@shared/lib/date-range'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, from, to } = await searchParams
  const range = parseRangePreset(rawRange, 'all')
  const { from: resolvedFrom, to: resolvedTo } = resolveRange(range, from, to)

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
