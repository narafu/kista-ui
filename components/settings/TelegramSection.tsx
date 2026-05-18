'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send, Check } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateTelegram, deleteTelegram } from '@/lib/api/settings'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface Props {
  hasTelegram: boolean
  telegramBotUsername?: string | null
}

export function TelegramSection({ hasTelegram, telegramBotUsername }: Props) {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [currentHasTelegram, setCurrentHasTelegram] = useState(hasTelegram)
  const [currentUsername, setCurrentUsername] = useState(telegramBotUsername ?? null)

  async function handleSave() {
    if (!botToken.trim()) { toast.error('Bot Token을 입력해주세요'); return }
    if (!chatId.trim()) { toast.error('Chat ID를 입력해주세요'); return }

    setIsLoading(true)
    try {
      await updateTelegram({ botToken: botToken.trim(), chatId: chatId.trim() })
      toast.success('텔레그램 봇이 연결되었습니다')
      setCurrentHasTelegram(true)
      setBotToken('')
      setChatId('')
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        toast.error('유효하지 않은 Bot Token입니다')
      } else {
        toast.error('연결에 실패했습니다')
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    setIsDeleteLoading(true)
    try {
      await deleteTelegram()
      toast.success('텔레그램 봇이 연결 해제되었습니다')
      setCurrentHasTelegram(false)
      setCurrentUsername(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? '해제에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 행: 아이콘 + 타이틀/서브타이틀 + 연결됨 배지 */}
      <div className="flex items-center gap-3">
        <div className="size-[26px] rounded-[6px] bg-[#229ED9] grid place-items-center shrink-0">
          <Send size={14} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">텔레그램 알림</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">매매 체결 및 시스템 이벤트 실시간 알림</div>
        </div>
        {currentHasTelegram && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--status-ok-bg,#dcfce7)] text-[var(--status-ok,#16a34a)] text-[11.5px] font-semibold shrink-0">
            <Check size={10} />
            <span>연결됨</span>
          </div>
        )}
      </div>

      {/* 연결됨 — muted 패널 */}
      {currentHasTelegram && (
        <div className="flex items-center justify-between bg-muted rounded-[10px] px-[14px] py-[12px]">
          <div>
            <div className="text-[11.5px] text-muted-foreground mb-0.5">연결된 채팅</div>
            <div className="text-sm font-bold font-mono">@{currentUsername ?? 'bot'}</div>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleteLoading}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-destructive hover:text-destructive')}
          >
            {isDeleteLoading ? '해제 중...' : '연결 해제'}
          </button>
        </div>
      )}

      {/* 미연결 — 입력 폼 */}
      {!currentHasTelegram && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[11.5px] text-muted-foreground mb-1">Bot Token</div>
            <Input
              placeholder="123456:ABC-DEF..."
              className="h-10 text-[13px]"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <div className="text-[11.5px] text-muted-foreground mb-1">Chat ID</div>
            <Input
              placeholder="-100123456789"
              className="h-10 text-[13px]"
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
