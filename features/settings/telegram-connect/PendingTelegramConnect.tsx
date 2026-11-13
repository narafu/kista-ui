'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDeleteTelegramMutation } from '@entities/user'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
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
      <form onSubmit={form.submit} className="flex flex-col gap-3">
        <FormField control={form.control} name="botToken" id="pending-botToken" label="Bot Token" className="space-y-2 text-left">
          {(f) => <Input {...f} placeholder="123456:ABC-DEF..." className="h-12" disabled={form.isPending} maxLength={512} />}
        </FormField>
        <FormField control={form.control} name="chatId" id="pending-chatId" label="Chat ID" className="space-y-2 text-left">
          {(f) => <Input {...f} placeholder="-100123456789" className="h-12" disabled={form.isPending} maxLength={50} />}
        </FormField>
        <FormActions form={form} label="저장" onCancel={() => { setShowForm(false); form.reset() }} />
      </form>
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
