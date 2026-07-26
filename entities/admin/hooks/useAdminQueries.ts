'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { approveAdminUser, rejectAdminUser, changeAdminUserRole, deleteAdminUser } from '../api'
import type { AdminUser } from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'
import { apiMsg } from '@shared/lib/api-client'
import { adminKeys } from '../model/queryKeys'
import { adminUsersQueryOptions } from '../model/queryOptions'

export function useAdminUsersQuery(filter?: UserStatus) {
  return useQuery(adminUsersQueryOptions(filter))
}

function updateCachedAdminUser(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  update: Partial<Pick<AdminUser, 'role' | 'status'>>,
) {
  queryClient.setQueriesData<AdminUser[]>({ queryKey: adminKeys.usersRoot() }, (users) =>
    users?.map((user) => user.id === userId ? { ...user, ...update } : user),
  )
}

function removeCachedAdminUser(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.setQueriesData<AdminUser[]>({ queryKey: adminKeys.usersRoot() }, (users) =>
    users?.filter((user) => user.id !== userId),
  )
}

export function useApproveUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => approveAdminUser(userId),
    onSuccess: (_result, userId) => {
      updateCachedAdminUser(queryClient, userId, { status: 'ACTIVE' })
    },
    onError: (err) => toast.error(apiMsg(err, '승인 처리에 실패했습니다.')),
  })
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => rejectAdminUser(userId),
    onSuccess: (_result, userId) => {
      updateCachedAdminUser(queryClient, userId, { status: 'REJECTED' })
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
      updateCachedAdminUser(queryClient, userId, { role })
    },
    onError: (err) => toast.error(apiMsg(err, '역할 변경에 실패했습니다.')),
  })
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: (_result, userId) => {
      removeCachedAdminUser(queryClient, userId)
    },
    onError: (err) => toast.error(apiMsg(err, '사용자 삭제에 실패했습니다.')),
  })
}
