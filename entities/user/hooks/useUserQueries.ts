'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteMe, updateNotificationChannel, updateTelegram, deleteTelegram, updateBalanceCheckEnabled, updateNickname, updateNotificationPref, updateStrategySuggestions } from '../api'
import { apiMsg } from '@shared/lib/api-client'
import { userKeys } from '../model/queryKeys'
import { meQueryOptions } from '../model/queryOptions'
import type { User } from '../model/types'

export function useMeQuery() {
  return useQuery(meQueryOptions())
}

async function invalidateMe(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: userKeys.me(), refetchType: 'active' })
}

// 토글류(즉시 반영 피드백 필요)는 onMutate에서 me 캐시를 낙관적으로 갱신하고 실패 시 롤백한다 —
// 호출부가 서버 데이터를 useState로 복사해 직접 낙관적 UI를 흉내내지 않도록(SSOT 위반) 이 훅이
// 낙관적 업데이트까지 캡슐화한다.
// 롤백은 실패한 필드 하나만 이전 값으로 되돌리고 나머지는 "현재" 캐시를 그대로 둔다 — 같은 화면에
// 동시에 열린 다른 토글(TradingAlertToggle 3개 등)이 그 사이 성공시킨 값을 이 롤백이 통째로 스냅샷
// 복원하며 덮어쓰지 않도록.
export function useUpdateNotificationPrefMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      updateNotificationPref(type, enabled),
    onMutate: async ({ type, enabled }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.me() })
      const previous = queryClient.getQueryData<User>(userKeys.me())
      if (previous) {
        queryClient.setQueryData<User>(userKeys.me(), {
          ...previous,
          notificationPrefs: { ...previous.notificationPrefs, [type]: enabled },
        })
      }
      return { previousEnabled: previous?.notificationPrefs?.[type] }
    },
    onError: (err, { type }, context) => {
      queryClient.setQueryData<User>(userKeys.me(), (current) => {
        if (!current) return current
        const notificationPrefs = { ...current.notificationPrefs }
        if (context?.previousEnabled === undefined) delete notificationPrefs[type]
        else notificationPrefs[type] = context.previousEnabled
        return { ...current, notificationPrefs }
      })
      toast.error(apiMsg(err, '알림 설정 변경에 실패했습니다.'))
    },
    onSettled: async () => {
      await invalidateMe(queryClient)
    },
  })
}

export function useUpdateBalanceCheckEnabledMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => updateBalanceCheckEnabled(enabled),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: userKeys.me() })
      const previous = queryClient.getQueryData<User>(userKeys.me())
      if (previous) queryClient.setQueryData<User>(userKeys.me(), { ...previous, balanceCheckEnabled: enabled })
      return { previousEnabled: previous?.balanceCheckEnabled }
    },
    onError: (err, _vars, context) => {
      queryClient.setQueryData<User>(userKeys.me(), (current) =>
        current && context?.previousEnabled !== undefined ? { ...current, balanceCheckEnabled: context.previousEnabled } : current,
      )
      toast.error(apiMsg(err, '잔고 검증 설정 변경에 실패했습니다.'))
    },
    onSettled: async () => {
      await invalidateMe(queryClient)
    },
  })
}

export function useUpdateStrategySuggestionsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (suggestions: string[]) => updateStrategySuggestions(suggestions),
    onSuccess: async () => {
      toast.success('운용전략 추천 목록을 저장했습니다')
      await invalidateMe(queryClient)
    },
    onError: (err) => toast.error(apiMsg(err, '운용전략 추천 목록 저장에 실패했습니다.')),
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
