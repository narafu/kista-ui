'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { useUpdateTelegramMutation, useDeleteTelegramMutation, useUpdateNotificationChannelMutation } from '@entities/user'
import { ApiError } from '@shared/lib/api-client'
import { cn } from '@shared/lib/utils'
import type { NotificationChannel } from '@entities/user'

interface Props {
  hasTelegram: boolean
  telegramBotUsername?: string | null
  currentChannel: NotificationChannel
}

export function TelegramSection({ hasTelegram, telegramBotUsername, currentChannel }: Props) {
  const router = useRouter()
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')

  const updateChannelMutation = useUpdateNotificationChannelMutation()
  const updateMutation = useUpdateTelegramMutation()
  const deleteMutation = useDeleteTelegramMutation()

  function handleSave() {
    if (!botToken.trim()) { toast.error('Bot Token을 입력해주세요'); return }
    if (!chatId.trim()) { toast.error('Chat ID를 입력해주세요'); return }

    updateMutation.mutate(
      { botToken: botToken.trim(), chatId: chatId.trim() },
      {
        onSuccess: () => {
          setBotToken('')
          setChatId('')
          const nextChannel: NotificationChannel | null =
            currentChannel === 'NONE' ? 'TELEGRAM'
            : currentChannel === 'FCM' ? 'ALL'
            : null
          if (nextChannel) {
            updateChannelMutation.mutate(nextChannel, { onSuccess: () => router.refresh() })
          } else {
            router.refresh()
          }
        },
        onError: (err) => {
          toast.error(err instanceof ApiError && err.status === 400 ? '유효하지 않은 Bot Token입니다' : '연결에 실패했습니다')
        },
      }
    )
  }

  const isLoading = updateMutation.isPending
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
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--status-ok-bg,#dcfce7)] text-[var(--status-ok,#16a34a)] text-xs font-semibold shrink-0">
            <Check size={10} />
            <span>연결됨</span>
          </div>
        )}
      </div>

      {/* 연결됨 — muted 패널 */}
      {hasTelegram && (
        <div className="bg-muted rounded-[10px] px-[14px] py-[12px]">
          <div className="text-sm text-muted-foreground mb-1">연결된 채팅</div>
          <div className="flex items-center justify-between gap-3 min-w-0">
            <div className="text-sm font-bold font-mono truncate min-w-0">
              {telegramBotUsername ? `@${telegramBotUsername}` : '불러오는 중...'}
            </div>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(undefined, { onSuccess: () => router.refresh() })}
              disabled={isDeleteLoading}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-destructive hover:text-destructive shrink-0')}
            >
              {isDeleteLoading ? '해제 중...' : '연결 해제'}
            </button>
          </div>
        </div>
      )}

      {/* 미연결 — 입력 폼 */}
      {!hasTelegram && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Bot Token</div>
            <Input
              placeholder="123456:ABC-DEF..."
              className="h-10 text-sm"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Chat ID</div>
            <Input
              placeholder="-100123456789"
              className="h-10 text-sm"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button className="h-10 px-5 w-fit" onClick={handleSave} disabled={isLoading}>
            {isLoading ? '연결 중...' : '연결하기'}
          </Button>
        </div>
      )}
    </div>
  )
}
