'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { listAdminUsers, approveAdminUser, rejectAdminUser, changeAdminUserRole, deleteAdminUser } from '../api'
import type { AdminUser } from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'
import { apiMsg } from '@shared/lib/api-client'
import { adminKeys } from '../model/queryKeys'

export function useAdminUsersQuery(filter?: UserStatus, initialData?: AdminUser[]) {
  return useQuery<AdminUser[]>({
    queryKey: adminKeys.users(filter),
    queryFn: () => listAdminUsers(undefined, filter),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 30_000,
  })
}

export function useApproveUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => approveAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      router.refresh()
    },
    onError: (err) => toast.error(apiMsg(err, '승인 처리에 실패했습니다.')),
  })
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => rejectAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      router.refresh()
    },
    onError: (err) => toast.error(apiMsg(err, '거절 처리에 실패했습니다.')),
  })
}

export function useChangeUserRoleMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      changeAdminUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      router.refresh()
    },
    onError: (err) => toast.error(apiMsg(err, '역할 변경에 실패했습니다.')),
  })
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
      router.refresh()
    },
    onError: (err) => toast.error(apiMsg(err, '사용자 삭제에 실패했습니다.')),
  })
}
