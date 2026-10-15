'use client'

import { useState } from 'react'
import { useUpdateTelegramMutation, useUpdateNotificationChannelMutation } from '@entities/user'
import type { NotificationChannel } from '@entities/user'

/** 텔레그램 Bot Token/Chat ID 입력·검증·저장 — 연결 성공 시 알림 수단에 텔레그램을 자동 추가한다. */
export function useTelegramConnectForm(currentChannel: NotificationChannel, onConnected?: () => void) {
  const [botToken, setBotTokenValue] = useState('')
  const [chatId, setChatIdValue] = useState('')
  const [botTokenError, setBotTokenError] = useState('')
  const [chatIdError, setChatIdError] = useState('')

  const updateMutation = useUpdateTelegramMutation()
  const updateChannelMutation = useUpdateNotificationChannelMutation()

  function setBotToken(value: string) {
    setBotTokenValue(value)
    setBotTokenError('')
  }

  function setChatId(value: string) {
    setChatIdValue(value)
    setChatIdError('')
  }

  function reset() {
    setBotTokenValue('')
    setChatIdValue('')
    setBotTokenError('')
    setChatIdError('')
  }

  function save() {
    const nextBotTokenError = botToken.trim() ? '' : 'Bot Token을 입력해주세요'
    const nextChatIdError = chatId.trim() ? '' : 'Chat ID를 입력해주세요'
    setBotTokenError(nextBotTokenError)
    setChatIdError(nextChatIdError)
    if (nextBotTokenError || nextChatIdError) return

    // 실패 토스트는 useUpdateTelegramMutation의 onError가 띄운다 — 여기서 또 띄우면 중복된다
    updateMutation.mutate(
      { botToken: botToken.trim(), chatId: chatId.trim() },
      {
        onSuccess: () => {
          reset()
          onConnected?.()
          const nextChannel: NotificationChannel | null =
            currentChannel === 'NONE' ? 'TELEGRAM'
            : currentChannel === 'FCM' ? 'ALL'
            : null
          if (nextChannel) updateChannelMutation.mutate(nextChannel)
        },
      }
    )
  }

  return { botToken, chatId, botTokenError, chatIdError, setBotToken, setChatId, save, reset, isLoading: updateMutation.isPending }
}
