'use client'

import { z } from 'zod'
import { useAppForm, type AppForm } from '@shared/ui/form/useAppForm'
import { useUpdateTelegramMutation, useUpdateNotificationChannelMutation } from '@entities/user'
import type { NotificationChannel } from '@entities/user'

const schema = z.object({
  botToken: z.string().trim().min(1, 'Bot Token을 입력하세요'),
  chatId: z.string().trim().min(1, 'Chat ID를 입력하세요'),
})

/** 텔레그램 Bot Token/Chat ID 입력·검증·저장 — 연결 성공 시 알림 수단에 텔레그램을 자동 추가한다. */
export function useTelegramConnectForm(currentChannel: NotificationChannel, onConnected?: () => void) {
  // 실패·성공 토스트는 useUpdateTelegramMutation이 띄운다 — 여기서 또 띄우면 중복된다
  const updateMutation = useUpdateTelegramMutation()
  const updateChannelMutation = useUpdateNotificationChannelMutation()

  const form: AppForm<z.infer<typeof schema>> = useAppForm({
    schema,
    defaultValues: { botToken: '', chatId: '' },
    mutation: updateMutation,
    onDone: () => {
      form.reset()
      onConnected?.()
      const nextChannel: NotificationChannel | null =
        currentChannel === 'NONE' ? 'TELEGRAM'
        : currentChannel === 'FCM' ? 'ALL'
        : null
      if (nextChannel) updateChannelMutation.mutate(nextChannel)
    },
  })
  return form
}
