'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { blockTriggerWhile } from '@shared/ui/blockTriggerWhile'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@shared/lib/utils'
import { isMockBroker } from '@shared/lib/api-schema'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { isEstimatedExpiry, kstToday, useUpdateAccountMutation, useDeleteAccountMutation } from '@entities/account'
import { useMeta } from '@entities/meta'
import { strategyKeys } from '@entities/strategy'
import { statsKeys } from '@entities/stats'
import { orderKeys } from '@entities/order'
import { tradeKeys } from '@entities/trade'
import type { Account } from '@entities/account'
import { CARD_CLASS, CredentialsCard } from './CredentialsCard'

interface Props {
  account: Account
}

const schema = z.object({
  nickname: z.string().trim().min(1, '계좌 별칭을 입력하세요.'),
  apiKeyExpiresOn: z.string(),
})

export function EditAccountForm({ account }: Props) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  // 삭제 성공 뒤 목록으로 이동하기 전까지 다이얼로그가 열려 있어 확인이 다시 눌리지 않게 잠근다. 실패하면 켜지지 않는다
  const [leaving, setLeaving] = useState(false)
  const showExpiry = isEstimatedExpiry(useMeta().findBroker(account.broker)?.apiKeyExpirySource)
  const router = useRouter()
  const queryClient = useQueryClient()

  const updateMutation = useUpdateAccountMutation(account.id)
  const deleteMutation = useDeleteAccountMutation(account.id)
  const form = useAppForm({
    schema,
    // 저장된 추정 만료일은 미리 채우지 않는다 — 과거 날짜가 그대로 전송돼 별칭 수정까지 실패하는 걸 막는다
    defaultValues: { nickname: account.nickname, apiKeyExpiresOn: '' },
    mutation: updateMutation,
    toPayload: ({ nickname, apiKeyExpiresOn }) => ({ nickname, ...(showExpiry && apiKeyExpiresOn ? { apiKeyExpiresOn } : {}) }),
    successMessage: '계좌가 수정되었습니다',
    onDone: () => router.push(`/accounts/${account.id}`),
  })

  const deleteBlocked = deleteMutation.isPending || leaving

  function handleDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: async () => {
        setLeaving(true)
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
      <form onSubmit={form.submit} className={cn(CARD_CLASS, 'space-y-4')}>
        <h2 className="text-sm font-semibold mb-1">계좌 정보 수정</h2>

        <FormField control={form.control} name="nickname" label="계좌 별칭" required>
          {(f) => <Input {...f} className="h-12" disabled={form.isPending} maxLength={100} />}
        </FormField>

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

        {showExpiry && (
          <FormField control={form.control} name="apiKeyExpiresOn" id="edit-expires-on" label="API 키 만료일" hint="증권사에서 확인한 실제 만료일을 입력하세요">
            {(f) => <Input {...f} type="date" min={kstToday()} className="h-12" disabled={form.isPending} />}
          </FormField>
        )}

        <p className="text-sm text-muted-foreground">
          전략은 계좌 상세 화면에서 등록·수정할 수 있습니다.
        </p>

        <FormActions cancelHref={`/accounts/${account.id}`} form={form} label="저장" className="pt-2" />
      </form>

      {!isMockBroker(account.broker) && <CredentialsCard account={account} />}

      <div className={cn(CARD_CLASS, 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]')}>
        <div className="flex items-center gap-2.5 mb-3">
          <AlertTriangle className="size-4 text-[var(--status-error)]" />
          <h2 className="text-sm font-semibold text-[var(--status-error)]">위험 구역</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          계좌를 삭제하면 {isMockBroker(account.broker) ? '' : '증권사에 접수된 '}미체결 주문을 먼저 취소하고, 이 계좌의 전략과 거래 기록을 더 이상 볼 수 없습니다.
        </p>

        <ConfirmDialog
          trigger={
            <button
              type="button"
              aria-disabled={deleteBlocked}
              onClick={blockTriggerWhile(deleteBlocked)}
              className={cn(buttonVariants({ variant: 'destructive' }), 'w-full aria-disabled:opacity-50')}
            >
              계좌 삭제
            </button>
          }
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          size="default"
          title="계좌 삭제 확인"
          description={
            <>
              이 작업은 되돌릴 수 없습니다. 계속하려면 계좌 별칭{' '}
              <strong className="text-foreground">{account.nickname}</strong>을(를) 정확히 입력하세요.
            </>
          }
          typeToConfirm={account.nickname}
          confirmLabel="영구 삭제"
          pendingLabel="삭제 중..."
          onConfirm={handleDelete}
          pending={deleteBlocked}
        />
      </div>
    </div>
  )
}
