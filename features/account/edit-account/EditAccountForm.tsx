'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Spinner } from '@shared/ui/Spinner'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@shared/lib/utils'
import { isMockBroker } from '@shared/lib/api-schema'
import { FormActions } from '@shared/ui/FormActions'
import { useUpdateAccountMutation, useDeleteAccountMutation, useUpdateCredentialsMutation, BROKER_CREDENTIAL, brokerErrorMessage } from '@entities/account'
import { strategyKeys } from '@entities/strategy'
import { statsKeys } from '@entities/stats'
import { orderKeys } from '@entities/order'
import { tradeKeys } from '@entities/trade'
import type { Account, CredentialBroker } from '@entities/account'

interface Props {
  account: Account
}

const CARD_CLASS = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

function CredentialsCard({ account }: Props) {
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

export function EditAccountForm({ account }: Props) {
  // eslint-disable-next-line react-doctor/no-derived-useState
  const [nickname, setNickname] = useState(account.nickname)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const router = useRouter()
  const queryClient = useQueryClient()

  const updateMutation = useUpdateAccountMutation(account.id)
  const deleteMutation = useDeleteAccountMutation(account.id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    updateMutation.mutate(
      { nickname: nickname.trim() },
      {
        onSuccess: () => {
          toast.success('계좌가 수정되었습니다')
          router.push(`/accounts/${account.id}`)
        },
      },
    )
  }

  function handleDelete() {
    if (deleteConfirm !== account.nickname) return
    deleteMutation.mutate(undefined, {
      onSuccess: async () => {
        toast.success('계좌가 삭제되었습니다')
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: strategyKeys.all }).catch(() => null),
          queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
          queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
          queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
        ])
        router.push('/accounts')
      },
    })
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={handleSubmit} className={cn(CARD_CLASS, 'space-y-4')}>
        <h2 className="text-sm font-semibold mb-1">계좌 정보 수정</h2>

        <div className="space-y-2">
          <Label htmlFor="nickname">계좌 별칭</Label>
          <Input
            id="nickname"
            className="h-12"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={updateMutation.isPending}
            maxLength={100}
          />
        </div>

        {account.accountNoMasked != null && (
          <div className="space-y-2">
            <Label htmlFor="accountNo">계좌번호</Label>
            <Input
              id="accountNo"
              defaultValue={account.accountNoMasked}
              className="h-12"
              disabled
            />
            <p className="text-sm text-muted-foreground">계좌번호는 변경할 수 없습니다</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          전략은 계좌 상세 화면에서 등록·수정할 수 있습니다.
        </p>

        <FormActions cancelHref={`/accounts/${account.id}`} isPending={updateMutation.isPending} canSubmit label="저장" className="pt-2" />
      </form>

      {!isMockBroker(account.broker) && <CredentialsCard account={account} />}

      <div className={cn(CARD_CLASS, 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]')}>
        <div className="flex items-center gap-2.5 mb-3">
          <AlertTriangle className="size-4 text-[var(--status-error)]" />
          <h2 className="text-sm font-semibold text-[var(--status-error)]">위험 구역</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          계좌를 삭제하면 증권사에 접수된 미체결 주문을 먼저 취소하고, 이 계좌의 전략과 거래 기록을 더 이상 볼 수 없습니다.
        </p>

        <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setDeleteConfirm('') }}>
          <DialogTrigger className={cn(buttonVariants({ variant: 'destructive' }), 'w-full')}>
            계좌 삭제
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>계좌 삭제 확인</DialogTitle>
              <DialogDescription>
                이 작업은 되돌릴 수 없습니다. 계속하려면 계좌 별칭{' '}
                <strong className="text-foreground">{account.nickname}</strong>을(를) 정확히 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Input
                placeholder={account.nickname}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                disabled={deleteMutation.isPending}
                maxLength={100}
                className="h-11"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleteMutation.isPending}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending || deleteConfirm !== account.nickname}
                className="gap-2"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Spinner size={14} />
                    삭제 중...
                  </>
                ) : '영구 삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
