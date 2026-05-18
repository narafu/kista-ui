'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateTelegram, deleteTelegram } from '@/lib/api/settings'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface Props {
  hasTelegram: boolean
}

export function TelegramSection({ hasTelegram }: Props) {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [currentHasTelegram, setCurrentHasTelegram] = useState(hasTelegram)

  async function handleSave() {
    if (!botToken.trim()) { toast.error('Bot Token을 입력해주세요'); return }
    if (!chatId.trim()) { toast.error('Chat ID를 입력해주세요'); return }

    setIsLoading(true)
    try {
      await updateTelegram({ botToken: botToken.trim(), chatId: chatId.trim() })
      toast.success('텔레그램 봇이 등록되었습니다')
      setCurrentHasTelegram(true)
      setBotToken('')
      setChatId('')
    } catch (err) {
      toast.error(err instanceof ApiError ? '등록에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    setIsDeleteLoading(true)
    try {
      await deleteTelegram()
      toast.success('텔레그램 봇이 해제되었습니다')
      setCurrentHasTelegram(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? '해제에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {currentHasTelegram && (
        <div className="text-[12.5px] font-semibold text-status-ok">● 봇 등록됨</div>
      )}
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
      </div>
      <div className="flex gap-2 pt-1">
        <Button className="h-10 px-5" onClick={handleSave} disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
        {currentHasTelegram && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleteLoading}
            className={cn(buttonVariants({ variant: 'outline' }), 'h-10 text-destructive hover:text-destructive')}
          >
            {isDeleteLoading ? '해제 중...' : '해제'}
          </button>
        )}
      </div>
    </div>
  )
}
