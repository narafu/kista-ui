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
  const kstDate = new Date(user.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
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
