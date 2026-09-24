'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  approveAdminUser,
  rejectAdminUser,
  changeAdminUserRole,
  deleteAdminUser,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
  reorderAdminOrder,
  getReorderTimingAvailability,
} from '../api'
import type { AdminReorderRequest, AdminStats, AdminStrategy, AdminUser } from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'
import { apiMsg } from '@shared/lib/api-client'
import { toKstDateString } from '@shared/lib/format'
import type { AdminUsersQueryParams } from '../model/queryKeys'
import { adminKeys } from '../model/queryKeys'
import { adminStatsQueryOptions, adminUsersQueryOptions } from '../model/queryOptions'

export function useAdminUsersQuery(filter?: UserStatus, params?: AdminUsersQueryParams) {
  return useQuery(adminUsersQueryOptions(filter, params))
}

export function useAdminStatsQuery() {
  return useQuery(adminStatsQueryOptions())
}

// 거래일 재주문 워크벤치(admin-trade-list) 전용 — 사용자 선택 → 계좌 → 전략 → 오늘 주문 순으로
// 이어지는 dependent query 체인. `enabled`로 선행 선택이 비었을 때 조회 자체를 막는다.
// 계좌 전체 목록을 userId 무관 공용 키 하나로 캐싱하고 select로 필터링한다 — userId별로 키를
// 나누면 사용자를 바꿀 때마다 동일한 전체 목록을 중복 조회·중복 캐싱하게 된다.
export function useAdminAccountsByUserQuery(userId: string) {
  return useQuery({
    queryKey: adminKeys.accounts(),
    queryFn: () => listAdminAccounts(),
    select: (accounts) => accounts.filter((account) => account.userId === userId),
    enabled: !!userId,
  })
}

export function useAdminStrategiesByAccountQuery(accountId: string) {
  return useQuery({
    queryKey: adminKeys.strategiesByAccount(accountId),
    queryFn: () => listAdminStrategies(accountId),
    enabled: !!accountId,
  })
}

export function useAdminStrategyOrdersQuery(accountId: string, strategyId: string, tradeDate: string) {
  return useQuery({
    queryKey: adminKeys.strategyOrders(accountId, strategyId, tradeDate),
    queryFn: () => listAdminStrategyOrders(accountId, strategyId, tradeDate),
    enabled: !!accountId && !!strategyId && !!tradeDate,
  })
}

export function useAdminReorderTimingQuery() {
  return useQuery({
    queryKey: adminKeys.reorderTiming(),
    queryFn: getReorderTimingAvailability,
  })
}

export function useUpdateAdminStrategyStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, strategyId, status }: { accountId: string; strategyId: string; status: AdminStrategy['status'] }) =>
      updateAdminStrategyStatus(accountId, strategyId, status),
    onSuccess: (_result, { accountId }) =>
      queryClient.invalidateQueries({ queryKey: adminKeys.strategiesByAccount(accountId) }),
    onError: (err) => toast.error(apiMsg(err, '전략 상태 변경에 실패했습니다.')),
  })
}

// onError에 toast를 두지 않는다 — 호출부(AdminTradesWorkbench)가 배치의 여러 주문을 순차
// mutateAsync로 호출한 뒤 실패 건수를 하나의 인라인 배너로 합쳐 보여준다. 여기서 toast까지 붙이면
// 재주문 10건 중 3건 실패 시 토스트 3개가 동시에 쌓이는 스팸이 된다 — 집계된 배너 하나가 맞다.
export function useReorderAdminOrderMutation() {
  return useMutation({
    mutationFn: (request: AdminReorderRequest) => reorderAdminOrder(request),
  })
}

function transitionCachedAdminUser(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  status: UserStatus,
) {
  const cachedUserLists = queryClient.getQueriesData<AdminUser[]>({ queryKey: adminKeys.usersRoot() })
  const previousUser = cachedUserLists
    .flatMap(([, users]) => users ?? [])
    .find((user) => user.id === userId)
  if (!previousUser) return undefined

  const nextUser = { ...previousUser, status }
  for (const [queryKey, users] of cachedUserLists) {
    if (!users) continue
    const filter = queryKey[2] as UserStatus | 'ALL'
    const from = queryKey[3] as string
    const to = queryKey[4] as string
    const admitsUser = (filter === 'ALL' || filter === nextUser.status) && isInUserDateRange(nextUser, from, to)
    const existingIndex = users.findIndex((user) => user.id === userId)
    const usersWithoutTarget = users.filter((user) => user.id !== userId)

    if (!admitsUser) {
      queryClient.setQueryData(queryKey, usersWithoutTarget)
      continue
    }

    if (existingIndex >= 0) {
      usersWithoutTarget.splice(existingIndex, 0, nextUser)
      queryClient.setQueryData(queryKey, usersWithoutTarget)
      continue
    }

    queryClient.setQueryData(queryKey, insertByCreatedAtDesc(usersWithoutTarget, nextUser))
  }
  return previousUser.status
}

function isInUserDateRange(user: AdminUser, from: string, to: string) {
  if (!from && !to) return true
  const kstDate = toKstDateString(user.createdAt)
  return (!from || kstDate >= from) && (!to || kstDate <= to)
}

function insertByCreatedAtDesc(users: AdminUser[], user: AdminUser) {
  const userCreatedAt = Date.parse(user.createdAt)
  if (Number.isNaN(userCreatedAt)) return [...users, user]
  const insertAt = users.findIndex((current) => Date.parse(current.createdAt) < userCreatedAt)
  if (insertAt < 0) return [...users, user]
  return [...users.slice(0, insertAt), user, ...users.slice(insertAt)]
}

function removeCachedAdminUser(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  let previousStatus: UserStatus | undefined
  queryClient.setQueriesData<AdminUser[]>({ queryKey: adminKeys.usersRoot() }, (users) => {
    const deletedUser = users?.find((user) => user.id === userId)
    previousStatus ??= deletedUser?.status
    return users?.filter((user) => user.id !== userId)
  })
  return previousStatus
}

const statsCountKey: Record<UserStatus, keyof Pick<AdminStats, 'pendingCount' | 'activeCount' | 'rejectedCount'>> = {
  PENDING: 'pendingCount',
  ACTIVE: 'activeCount',
  REJECTED: 'rejectedCount',
}

function updateCachedAdminStats(
  queryClient: ReturnType<typeof useQueryClient>,
  previousStatus: UserStatus | undefined,
  nextStatus: UserStatus,
) {
  if (!previousStatus || previousStatus === nextStatus) return
  queryClient.setQueriesData<AdminStats>({ queryKey: adminKeys.stats() }, (stats) => {
    if (!stats) return stats
    return {
      ...stats,
      [statsCountKey[previousStatus]]: Math.max(0, stats[statsCountKey[previousStatus]] - 1),
      [statsCountKey[nextStatus]]: stats[statsCountKey[nextStatus]] + 1,
    }
  })
}

function removeFromCachedAdminStats(
  queryClient: ReturnType<typeof useQueryClient>,
  previousStatus: UserStatus | undefined,
) {
  if (!previousStatus) return
  queryClient.setQueriesData<AdminStats>({ queryKey: adminKeys.stats() }, (stats) => {
    if (!stats) return stats
    return {
      ...stats,
      totalUsers: Math.max(0, stats.totalUsers - 1),
      [statsCountKey[previousStatus]]: Math.max(0, stats[statsCountKey[previousStatus]] - 1),
    }
  })
}

function useUserStatusTransitionMutation(
  mutationFn: (userId: string) => Promise<void>,
  nextStatus: UserStatus,
  errorFallback: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_result, userId: string) => {
      const previousStatus = transitionCachedAdminUser(queryClient, userId, nextStatus)
      updateCachedAdminStats(queryClient, previousStatus, nextStatus)
    },
    onError: (err) => toast.error(apiMsg(err, errorFallback)),
  })
}

export function useApproveUserMutation() {
  return useUserStatusTransitionMutation(approveAdminUser, 'ACTIVE', '승인 처리에 실패했습니다.')
}

export function useRejectUserMutation() {
  return useUserStatusTransitionMutation(rejectAdminUser, 'REJECTED', '거절 처리에 실패했습니다.')
}

export function useChangeUserRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      changeAdminUserRole(userId, role),
    onSuccess: (_result, { userId, role }) => {
      queryClient.setQueriesData<AdminUser[]>({ queryKey: adminKeys.usersRoot() }, (users) =>
        users?.map((user) => user.id === userId ? { ...user, role } : user),
      )
    },
    onError: (err) => toast.error(apiMsg(err, '역할 변경에 실패했습니다.')),
  })
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: (_result, userId) => {
      const previousStatus = removeCachedAdminUser(queryClient, userId)
      removeFromCachedAdminStats(queryClient, previousStatus)
    },
    onError: (err) => toast.error(apiMsg(err, '회원 탈퇴에 실패했습니다.')),
  })
}
