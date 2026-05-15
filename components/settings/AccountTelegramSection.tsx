'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAuthTokenClient } from '@/lib/auth/token'
import { updateAccount } from '@/lib/api/accounts'
import { ApiError } from '@/lib/api/client'
import type { Account } from '@/types/account'

interface AccountRowProps {
  account: Account
}

function AccountTelegramRow({ account }: AccountRowProps) {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSave() {
    setIsLoading(true)
    try {
      const token = getAuthTokenClient()
      if (!token) { toast.error('로그인이 필요합니다'); return }

      await updateAccount(account.id, {
        nickname: account.nickname,
        telegramBotToken: botToken.trim() || undefined,
        telegramChatId: chatId.trim() || undefined,
      }, token)

      toast.success(`${account.nickname} 텔레그램 설정이 저장되었습니다`)
      setBotToken('')
      setChatId('')
    } catch (err) {
      toast.error(err instanceof ApiError ? '저장에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{account.nickname}</span>
        <span className="text-xs text-muted-foreground">{account.accountNoMasked}</span>
      </div>
      <div className="space-y-2">
        <Input
          placeholder="Bot Token (선택)"
          className="h-10 text-sm"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          disabled={isLoading}
        />
        <Input
          placeholder="Chat ID (선택)"
          className="h-10 text-sm"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button size="sm" variant="outline" className="h-9" onClick={handleSave} disabled={isLoading}>
        {isLoading ? '저장 중...' : '저장'}
      </Button>
    </div>
  )
}

interface Props {
  accounts: Account[]
}

export function AccountTelegramSection({ accounts }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">계좌별 알림 설정</CardTitle>
        <CardDescription>계좌마다 별도 텔레그램 봇을 설정할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">등록된 계좌가 없습니다.</p>
        ) : (
          accounts.map((account) => (
            <AccountTelegramRow key={account.id} account={account} />
          ))
        )}
      </CardContent>
    </Card>
  )
}
