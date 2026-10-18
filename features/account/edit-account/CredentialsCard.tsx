'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@shared/ui/Spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@shared/lib/utils'
import { useUpdateCredentialsMutation, BROKER_CREDENTIAL, brokerErrorMessage } from '@entities/account'
import type { Account, CredentialBroker } from '@entities/account'

interface Props {
  account: Account
}

export const CARD_CLASS = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

export function CredentialsCard({ account }: Props) {
  const [appKey, setAppKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const mutation = useUpdateCredentialsMutation(account.id)
  const { keyLabel, secretLabel, invalidMessage } = BROKER_CREDENTIAL[account.broker as CredentialBroker]
  const canSubmit = appKey.trim().length > 0 && secretKey.trim().length > 0 && !mutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    mutation.mutate({ appKey: appKey.trim(), secretKey: secretKey.trim() }, {
      onSuccess: () => {
        setAppKey('')
        setSecretKey('')
        toast.success('API 키가 재등록되었습니다')
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cn(CARD_CLASS, 'space-y-4')}>
      <div>
        <h2 className="text-sm font-semibold mb-1">API 키 재등록</h2>
        <p className="text-sm text-muted-foreground">새 키로 연결 테스트를 통과하면 교체합니다.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="credential-key">{keyLabel}</Label>
        <Input id="credential-key" className="h-12" value={appKey} onChange={(e) => { setAppKey(e.target.value); mutation.reset() }} disabled={mutation.isPending} maxLength={256} autoComplete="off" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="credential-secret">{secretLabel}</Label>
        <Input id="credential-secret" type="password" className="h-12" value={secretKey} onChange={(e) => { setSecretKey(e.target.value); mutation.reset() }} disabled={mutation.isPending} maxLength={512} autoComplete="off" />
      </div>
      {mutation.isError && (
        <p className="text-sm text-[var(--status-error)]">{brokerErrorMessage(mutation.error, invalidMessage, 'API 키 재등록에 실패했습니다.')}</p>
      )}
      <Button type="submit" size="form" className="w-full" disabled={!canSubmit}>
        {mutation.isPending ? <><Spinner size={16} /> 연결 확인 중...</> : 'API 키 재등록'}
      </Button>
    </form>
  )
}
