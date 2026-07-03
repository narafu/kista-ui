'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateTelegramMutation, useDeleteTelegramMutation, useUpdateNotificationChannelMutation } from '@entities/user'
import { ApiError } from '@shared/lib/api-client'
import type { NotificationChannel } from '@entities/user'

interface Props {
  hasTelegram: boolean
  currentChannel: NotificationChannel
}

export function PendingTelegramConnect({ hasTelegram, currentChannel }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [botTokenError, setBotTokenError] = useState('')
  const [chatIdError, setChatIdError] = useState('')

  const updateMutation = useUpdateTelegramMutation()
  const deleteMutation = useDeleteTelegramMutation()
  const updateChannelMutation = useUpdateNotificationChannelMutation()

  function handleSave() {
    const nextBotTokenError = botToken.trim() ? '' : 'Bot Token을 입력해주세요'
    const nextChatIdError = chatId.trim() ? '' : 'Chat ID를 입력해주세요'
    setBotTokenError(nextBotTokenError)
    setChatIdError(nextChatIdError)
    if (nextBotTokenError || nextChatIdError) return

    updateMutation.mutate(
      { botToken: botToken.trim(), chatId: chatId.trim() },
      {
        onSuccess: () => {
          setShowForm(false)
          setBotToken('')
          setChatId('')
          const nextChannel: NotificationChannel | null =
            currentChannel === 'NONE' ? 'TELEGRAM'
            : currentChannel === 'FCM' ? 'ALL'
            : null
          if (nextChannel) {
            updateChannelMutation.mutate(nextChannel)
          }
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? '연동에 실패했습니다' : '오류가 발생했습니다')
        },
      }
    )
  }

  const isLoading = updateMutation.isPending
  const isDeleteLoading = deleteMutation.isPending

  if (hasTelegram) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-green-600 font-medium">✓ 텔레그램 봇이 연동되었습니다</p>
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12"
          onClick={() => deleteMutation.mutate()}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading ? '해제 중...' : '연동 해제'}
        </Button>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="flex flex-col gap-3">
        <div className="space-y-2 text-left">
          <Label htmlFor="pending-botToken">Bot Token</Label>
          <Input
            id="pending-botToken"
            placeholder="123456:ABC-DEF..."
            className="h-12"
            value={botToken}
            onChange={(e) => { setBotToken(e.target.value); if (botTokenError) setBotTokenError('') }}
            disabled={isLoading}
            aria-invalid={!!botTokenError}
            aria-describedby={botTokenError ? 'pending-bot-token-error' : undefined}
          />
          {botTokenError && <p id="pending-bot-token-error" className="text-xs text-neg">{botTokenError}</p>}
        </div>
        <div className="space-y-2 text-left">
          <Label htmlFor="pending-chatId">Chat ID</Label>
          <Input
            id="pending-chatId"
            placeholder="-100123456789"
            className="h-12"
            value={chatId}
            onChange={(e) => { setChatId(e.target.value); if (chatIdError) setChatIdError('') }}
            disabled={isLoading}
            aria-invalid={!!chatIdError}
            aria-describedby={chatIdError ? 'pending-chat-id-error' : undefined}
          />
          {chatIdError && <p id="pending-chat-id-error" className="text-xs text-neg">{chatIdError}</p>}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 h-11" onClick={handleSave} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
          <Button variant="outline" className="h-11" onClick={() => { setShowForm(false); setBotToken(''); setChatId('') }} disabled={isLoading}>
            취소
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="lg" className="w-full h-12" onClick={() => setShowForm(true)}>
        텔레그램 봇 연동하기
      </Button>
      <p className="text-sm text-muted-foreground">
        텔레그램 봇을 연동하면 승인 결과를 알림으로 받을 수 있습니다.
      </p>
    </div>
  )
}
