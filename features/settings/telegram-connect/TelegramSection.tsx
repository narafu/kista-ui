'use client'

import { useState } from 'react'
import { Send, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@shared/ui/Badge'
import { ConfirmDeleteDialog } from '@shared/ui/ConfirmDeleteDialog'
import { useDeleteTelegramMutation } from '@entities/user'
import type { NotificationChannel } from '@entities/user'
import { useTelegramConnectForm } from './useTelegramConnectForm'

interface Props {
  hasTelegram: boolean
  telegramBotUsername?: string | null
  currentChannel: NotificationChannel
}

export function TelegramSection({ hasTelegram, telegramBotUsername, currentChannel }: Props) {
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const form = useTelegramConnectForm(currentChannel)
  const deleteMutation = useDeleteTelegramMutation()
  const isDeleteLoading = deleteMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 행: 아이콘 + 타이틀/서브타이틀 + 연결됨 배지 */}
      <div className="flex items-center gap-3">
        <div className="size-[26px] rounded-[6px] bg-[#229ED9] grid place-items-center shrink-0">
          <Send size={14} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">텔레그램 알림</div>
          <div className="text-sm text-muted-foreground mt-0.5">매매 체결 및 시스템 이벤트 실시간 알림</div>
        </div>
        {hasTelegram && (
          <Badge tone="ok" size="sm" className="gap-1 shrink-0">
            <Check size={10} />
            <span>연결됨</span>
          </Badge>
        )}
      </div>

      {/* 연결됨 — muted 패널 */}
      {hasTelegram && (
        <div className="bg-muted rounded-[10px] px-[14px] py-[12px]">
          <div className="text-sm text-muted-foreground mb-1">연결된 채팅</div>
          <div className="flex items-center justify-between gap-3 min-w-0">
            {/* telegramBotUsername은 nullable 컬럼이라 레거시 연결은 값이 없을 수 있다 — 로딩 상태가 아니다 */}
            <div className="text-sm font-bold font-mono truncate min-w-0">
              {telegramBotUsername ? `@${telegramBotUsername}` : '-'}
            </div>
            {/* 확인 다이얼로그를 여는 트리거라 native disabled 대신 focusableWhenDisabled(aria-disabled) — 포커스가 body로 빠지지 않게 */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDisconnectOpen(true)}
              disabled={isDeleteLoading}
              focusableWhenDisabled
              className="shrink-0 aria-disabled:opacity-50"
            >
              {isDeleteLoading ? '해제 중...' : '연결 해제'}
            </Button>
          </div>
          <ConfirmDeleteDialog
            open={isDisconnectOpen}
            onOpenChange={setIsDisconnectOpen}
            title="텔레그램 연결을 해제하시겠습니까?"
            description="해제하면 텔레그램으로 매매 체결·시스템 알림을 받을 수 없습니다."
            onConfirm={() => deleteMutation.mutate(undefined, { onSuccess: () => setIsDisconnectOpen(false) })}
            isPending={isDeleteLoading}
            confirmLabel="연결 해제"
            pendingLabel="해제 중..."
          />
        </div>
      )}

      {/* 미연결 — 입력 폼 */}
      {!hasTelegram && (
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="bot-token" className="mb-1 text-sm font-normal text-muted-foreground">Bot Token</Label>
            <Input
              id="bot-token"
              placeholder="123456:ABC-DEF..."
              className="h-10 text-sm"
              value={form.botToken}
              onChange={(e) => form.setBotToken(e.target.value)}
              disabled={form.isLoading}
              maxLength={512}
              aria-invalid={!!form.botTokenError}
              aria-describedby={form.botTokenError ? 'bot-token-error' : undefined}
            />
            {form.botTokenError && <p id="bot-token-error" className="mt-1 text-xs text-[var(--status-error)]">{form.botTokenError}</p>}
          </div>
          <div>
            <Label htmlFor="chat-id" className="mb-1 text-sm font-normal text-muted-foreground">Chat ID</Label>
            <Input
              id="chat-id"
              placeholder="-100123456789"
              className="h-10 text-sm"
              value={form.chatId}
              onChange={(e) => form.setChatId(e.target.value)}
              disabled={form.isLoading}
              maxLength={50}
              aria-invalid={!!form.chatIdError}
              aria-describedby={form.chatIdError ? 'chat-id-error' : undefined}
            />
            {form.chatIdError && <p id="chat-id-error" className="mt-1 text-xs text-[var(--status-error)]">{form.chatIdError}</p>}
          </div>
          <Button size="form" className="w-fit px-5" onClick={form.save} disabled={form.isLoading}>
            {form.isLoading ? '연결 중...' : '연결하기'}
          </Button>
        </div>
      )}
    </div>
  )
}
