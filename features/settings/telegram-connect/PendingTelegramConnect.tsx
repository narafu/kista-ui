'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeleteTelegramMutation } from '@entities/user'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import type { NotificationChannel } from '@entities/user'
import { useTelegramConnectForm } from './useTelegramConnectForm'

interface Props {
  hasTelegram: boolean
  currentChannel: NotificationChannel
}

export function PendingTelegramConnect({ hasTelegram, currentChannel }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)

  const form = useTelegramConnectForm(currentChannel, () => setShowForm(false))
  const deleteMutation = useDeleteTelegramMutation()
  const isDeleteLoading = deleteMutation.isPending

  if (hasTelegram) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-status-ok font-medium">✓ 텔레그램 봇이 연결되었습니다</p>
        <Button
          variant="destructive"
          size="form"
          className="w-full"
          onClick={() => setIsDisconnectOpen(true)}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading ? '해제 중...' : '연결 해제'}
        </Button>
        <ConfirmDeleteDialog
          open={isDisconnectOpen}
          onOpenChange={setIsDisconnectOpen}
          title="텔레그램 연결을 해제하시겠습니까?"
          description="해제하면 텔레그램으로 알림을 받을 수 없습니다."
          onConfirm={() => deleteMutation.mutate(undefined, { onSuccess: () => setIsDisconnectOpen(false) })}
          isPending={isDeleteLoading}
          confirmLabel="연결 해제"
          pendingLabel="해제 중..."
        />
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
            value={form.botToken}
            onChange={(e) => form.setBotToken(e.target.value)}
            disabled={form.isLoading}
            maxLength={512}
            aria-invalid={!!form.botTokenError}
            aria-describedby={form.botTokenError ? 'pending-bot-token-error' : undefined}
          />
          {form.botTokenError && <p id="pending-bot-token-error" className="text-xs text-[var(--status-error)]">{form.botTokenError}</p>}
        </div>
        <div className="space-y-2 text-left">
          <Label htmlFor="pending-chatId">Chat ID</Label>
          <Input
            id="pending-chatId"
            placeholder="-100123456789"
            className="h-12"
            value={form.chatId}
            onChange={(e) => form.setChatId(e.target.value)}
            disabled={form.isLoading}
            maxLength={50}
            aria-invalid={!!form.chatIdError}
            aria-describedby={form.chatIdError ? 'pending-chat-id-error' : undefined}
          />
          {form.chatIdError && <p id="pending-chat-id-error" className="text-xs text-[var(--status-error)]">{form.chatIdError}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="form" className="flex-1" onClick={form.save} disabled={form.isLoading}>
            {form.isLoading ? '저장 중...' : '저장'}
          </Button>
          <Button variant="outline" size="form" onClick={() => { setShowForm(false); form.reset() }} disabled={form.isLoading}>
            취소
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="form" className="w-full" onClick={() => setShowForm(true)}>
        텔레그램 봇 연결하기
      </Button>
      <p className="text-sm text-muted-foreground">
        텔레그램 봇을 연결하면 승인 결과를 알림으로 받을 수 있습니다.
      </p>
    </div>
  )
}
