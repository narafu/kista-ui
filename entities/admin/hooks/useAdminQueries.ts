'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { approveAdminUser, rejectAdminUser, changeAdminUserRole, deleteAdminUser } from '../api'
import type { AdminStats, AdminUser } from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'
import { apiMsg } from '@shared/lib/api-client'
import type { AdminUsersQueryParams } from '../model/queryKeys'
import { adminKeys } from '../model/queryKeys'
import { adminStatsQueryOptions, adminUsersQueryOptions } from '../model/queryOptions'

export function useAdminUsersQuery(filter?: UserStatus, params?: AdminUsersQueryParams) {
  return useQuery(adminUsersQueryOptions(filter, params))
}

export function useAdminStatsQuery() {
  return useQuery(adminStatsQueryOptions())
}

function transitionCachedAdminUser(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  status: UserStatus,
) {
  let previousStatus: UserStatus | undefined
  for (const [queryKey, users] of queryClient.getQueriesData<AdminUser[]>({ queryKey: adminKeys.usersRoot() })) {
    if (!users) continue
    const filter = queryKey[2] as UserStatus | 'ALL'
    const nextUsers = users
      .map((user) => {
        if (user.id !== userId) return user
        previousStatus ??= user.status
        return { ...user, status }
      })
      .filter((user) => filter === 'ALL' || user.status === filter)
    queryClient.setQueryData(queryKey, nextUsers)
  }
  return previousStatus
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

export function useApproveUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => approveAdminUser(userId),
    onSuccess: (_result, userId) => {
      const previousStatus = transitionCachedAdminUser(queryClient, userId, 'ACTIVE')
      updateCachedAdminStats(queryClient, previousStatus, 'ACTIVE')
    },
    onError: (err) => toast.error(apiMsg(err, '승인 처리에 실패했습니다.')),
  })
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => rejectAdminUser(userId),
    onSuccess: (_result, userId) => {
      const previousStatus = transitionCachedAdminUser(queryClient, userId, 'REJECTED')
      updateCachedAdminStats(queryClient, previousStatus, 'REJECTED')
    },
    onError: (err) => toast.error(apiMsg(err, '거절 처리에 실패했습니다.')),
  })
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
    onError: (err) => toast.error(apiMsg(err, '사용자 삭제에 실패했습니다.')),
  })
}
