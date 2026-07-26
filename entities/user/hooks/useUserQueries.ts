'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteMe, updateNotificationChannel, updateTelegram, deleteTelegram, updateBalanceCheckEnabled, updateNickname, updateNotificationPref } from '../api'
import { apiMsg } from '@shared/lib/api-client'
import { userKeys } from '../model/queryKeys'
import { meQueryOptions } from '../model/queryOptions'

export function useMeQuery() {
  return useQuery(meQueryOptions())
}

async function invalidateMe(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: userKeys.me(), refetchType: 'active' })
}

export function useUpdateNotificationPrefMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      updateNotificationPref(type, enabled),
    onSuccess: async () => {
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '알림 설정 변경에 실패했습니다.')),
  })
}

export function useUpdateBalanceCheckEnabledMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => updateBalanceCheckEnabled(enabled),
    onSuccess: async () => {
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '잔고 검증 설정 변경에 실패했습니다.')),
  })
}

export function useUpdateNicknameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nickname: string) => updateNickname(nickname),
    onSuccess: async () => {
      toast.success('닉네임이 변경됐습니다.')
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '닉네임 변경에 실패했습니다.')),
  })
}

export function useDeleteMeMutation() {
  return useMutation({ // eslint-disable-line react-doctor/query-mutation-missing-invalidation
    mutationFn: deleteMe,
    onError: (err) => toast.error(apiMsg(err, '탈퇴 처리 중 오류가 발생했습니다.')),
  })
}

export function useUpdateNotificationChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: string) => updateNotificationChannel(channel),
    onSuccess: async () => {
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '알림 채널 변경에 실패했습니다.')),
  })
}

export function useUpdateTelegramMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { botToken: string; chatId: string }) => updateTelegram(data),
    onSuccess: async () => {
      toast.success('텔레그램이 연결됐습니다.')
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '텔레그램 연결에 실패했습니다.')),
  })
}

export function useDeleteTelegramMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTelegram,
    onSuccess: async () => {
      toast.success('텔레그램 연결이 해제됐습니다.')
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '텔레그램 해제에 실패했습니다.')),
  })
}
