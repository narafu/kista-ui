'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { listAdminUsers, reapply, deleteMe, updateNotificationChannel, updateTelegram, deleteTelegram, approveAdminUser, rejectAdminUser, changeAdminUserRole, deleteAdminUser } from '../api'
import type { AdminUser, UserRole, UserStatus } from '../model/types'

export function useAdminUsersQuery(filter?: UserStatus, initialData?: AdminUser[]) {
  return useQuery<AdminUser[]>({
    queryKey: ['adminUsers', filter],
    queryFn: () => listAdminUsers(undefined, filter),
    initialData,
    staleTime: 30_000,
  })
}

export function useReapplyMutation() {
  return useMutation({
    mutationFn: reapply,
    onError: () => toast.error('재신청 중 오류가 발생했습니다.'),
  })
}

export function useDeleteMeMutation() {
  return useMutation({
    mutationFn: deleteMe,
    onError: () => toast.error('탈퇴 처리 중 오류가 발생했습니다.'),
  })
}

export function useUpdateNotificationChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: string) => updateNotificationChannel(channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('알림 채널 변경에 실패했습니다.'),
  })
}

export function useUpdateTelegramMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { botToken: string; chatId: string }) => updateTelegram(data),
    onSuccess: () => {
      toast.success('텔레그램이 연결됐습니다.')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('텔레그램 연결에 실패했습니다.'),
  })
}

export function useDeleteTelegramMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTelegram,
    onSuccess: () => {
      toast.success('텔레그램 연결이 해제됐습니다.')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('텔레그램 해제에 실패했습니다.'),
  })
}

export function useApproveUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => approveAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('승인 처리에 실패했습니다.'),
  })
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => rejectAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('거절 처리에 실패했습니다.'),
  })
}

export function useChangeUserRoleMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      changeAdminUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('역할 변경에 실패했습니다.'),
  })
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('사용자 삭제에 실패했습니다.'),
  })
}
