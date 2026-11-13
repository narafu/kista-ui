'use client'

import { z } from 'zod'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm, type AppForm } from '@shared/ui/form/useAppForm'
import { Input } from '@/components/ui/input'
import { useMeta } from '@entities/meta'
import { cn } from '@shared/lib/utils'
import { isEstimatedExpiry, kstToday, useUpdateCredentialsMutation, BROKER_CREDENTIAL, brokerErrorMessage } from '@entities/account'
import type { Account, CredentialBroker } from '@entities/account'

interface Props {
  account: Account
}

export const CARD_CLASS = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

const schema = z.object({
  appKey: z.string().trim().min(1),
  secretKey: z.string().trim().min(1),
  apiKeyExpiresOn: z.string(),
})

export function CredentialsCard({ account }: Props) {
  const showExpiry = isEstimatedExpiry(useMeta().findBroker(account.broker)?.apiKeyExpirySource)
  const mutation = useUpdateCredentialsMutation(account.id)
  const { keyLabel, secretLabel, invalidMessage } = BROKER_CREDENTIAL[account.broker as CredentialBroker]
  const form: AppForm<z.infer<typeof schema>> = useAppForm({
    schema,
    defaultValues: { appKey: '', secretKey: '', apiKeyExpiresOn: '' },
    mutation,
    toPayload: ({ appKey, secretKey, apiKeyExpiresOn }) => ({ appKey, secretKey, ...(showExpiry && apiKeyExpiresOn ? { apiKeyExpiresOn } : {}) }),
    successMessage: 'API 키가 재등록되었습니다',
    onDone: () => form.reset(),
  })
  const canSubmit = !!form.watch('appKey').trim() && !!form.watch('secretKey').trim()

  return (
    <form onSubmit={form.submit} className={cn(CARD_CLASS, 'space-y-4')}>
      <div>
        <h2 className="text-sm font-semibold mb-1">API 키 재등록</h2>
        <p className="text-sm text-muted-foreground">새 키로 연결 테스트를 통과하면 교체합니다.</p>
      </div>
      <FormField control={form.control} name="appKey" id="credential-key" label={keyLabel} required>
        {(f) => <Input {...f} className="h-12" onChange={(e) => { f.onChange(e); mutation.reset() }} disabled={form.isPending} maxLength={256} autoComplete="off" />}
      </FormField>
      <FormField control={form.control} name="secretKey" id="credential-secret" label={secretLabel} required>
        {(f) => <Input {...f} type="password" className="h-12" onChange={(e) => { f.onChange(e); mutation.reset() }} disabled={form.isPending} maxLength={512} autoComplete="off" />}
      </FormField>
      {showExpiry && (
        <FormField control={form.control} name="apiKeyExpiresOn" id="credential-expires-on" label="API 키 만료일" hint="증권사에서 확인한 실제 만료일을 입력하세요. 비우면 키를 바꾼 경우 오늘부터 1년으로 계산하고, 같은 키면 기존 만료일을 유지합니다">
          {(f) => <Input {...f} type="date" min={kstToday()} className="h-12" disabled={form.isPending} />}
        </FormField>
      )}
      {mutation.isError && (
        <p className="text-sm text-[var(--status-error)]">{brokerErrorMessage(mutation.error, invalidMessage, 'API 키 재등록에 실패했습니다.')}</p>
      )}
      <FormActions form={form} canSubmit={canSubmit} label="API 키 재등록" pendingLabel="연결 확인 중…" />
    </form>
  )
}
