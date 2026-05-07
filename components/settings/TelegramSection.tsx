'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
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

  async function getToken() {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function handleSave() {
    if (!botToken.trim()) { toast.error('Bot Token을 입력해주세요'); return }
    if (!chatId.trim()) { toast.error('Chat ID를 입력해주세요'); return }

    setIsLoading(true)
    try {
      const token = await getToken()
      if (!token) { toast.error('로그인이 필요합니다'); return }

      await updateTelegram({ botToken: botToken.trim(), chatId: chatId.trim() }, token)
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
      const token = await getToken()
      if (!token) { toast.error('로그인이 필요합니다'); return }

      await deleteTelegram(token)
      toast.success('텔레그램 봇이 해제되었습니다')
      setCurrentHasTelegram(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? '해제에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsDeleteLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">텔레그램 알림</CardTitle>
        <CardDescription>
          전체 계좌 알림을 받을 텔레그램 봇을 등록하세요.
          {currentHasTelegram && (
            <span className="ml-2 text-green-600 font-medium">✓ 등록됨</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="botToken">Bot Token</Label>
          <Input
            id="botToken"
            placeholder="123456:ABC-DEF..."
            className="h-12"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chatId">Chat ID</Label>
          <Input
            id="chatId"
            placeholder="-100123456789"
            className="h-12"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 h-11" onClick={handleSave} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
          {currentHasTelegram && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleteLoading}
              className={cn(buttonVariants({ variant: 'outline' }), 'h-11 text-destructive hover:text-destructive')}
            >
              {isDeleteLoading ? '해제 중...' : '해제'}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
