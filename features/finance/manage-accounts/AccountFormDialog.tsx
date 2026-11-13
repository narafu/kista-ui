'use client'

import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@shared/ui/FormDialog'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { digitsOnly } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useCanShareToGroup, useCreateFinanceAccountMutation, useUpdateFinanceAccountMutation } from '@entities/finance'
import type { FinanceAccount, FinanceAccountRequest, FinanceAccountType } from '@entities/finance'

const schema = z.object({
  accountType: z.string(),
  name: z.string().trim().min(1, '계좌 이름을 입력하세요.'),
  institution: z.string(),
  accountNo: z.string(),
  owner: z.string(),
  memo: z.string(),
  shareToGroup: z.boolean(),
})

interface Props {
  open: boolean
  onClose: () => void
  account?: FinanceAccount // undefined = 생성 모드
}

export function AccountFormDialog({ open, onClose, account }: Props) {
  return (
    <FormDialog open={open} onClose={onClose} title={account ? '계좌 수정' : '계좌 추가'} description="계좌 유형, 계좌 이름을 입력하세요.">
      {(close) => <AccountForm account={account} onDone={close} />}
    </FormDialog>
  )
}

function AccountForm({ account, onDone }: { account?: FinanceAccount; onDone: () => void }) {
  const { meta } = useMeta()
  // 생성 모드에서만 노출, 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) —
  // 수정 모드는 groupId가 이미 고정돼 있어 대상 아님(BudgetForm와 동일 패턴).
  const canShareToGroup = useCanShareToGroup()
  const createMutation = useCreateFinanceAccountMutation()
  const updateMutation = useUpdateFinanceAccountMutation(account?.id ?? '')

  const form = useAppForm({
    schema,
    defaultValues: {
      accountType: account?.accountType ?? meta.financeAccountTypes[0]?.code ?? 'BANK',
      name: account?.name ?? '',
      institution: account?.institution ?? '',
      // 기존 DB의 accountNo는 마이그레이션되지 않아 비숫자를 포함할 수 있다(서버는 신규/수정 요청만
      // 숫자 전용으로 강제) — 초기값부터 digitsOnly로 정규화해야 필드를 건드리지 않고 다른 값만
      // 고쳐 제출해도 400을 맞지 않는다.
      accountNo: digitsOnly(account?.accountNo ?? ''),
      owner: account?.owner ?? '',
      memo: account?.memo ?? '',
      shareToGroup: true,
    },
    mutation: account ? updateMutation : createMutation,
    toPayload: (v) => {
      const payload: FinanceAccountRequest = {
        accountType: v.accountType as FinanceAccountType,
        name: v.name,
        institution: v.institution.trim() || undefined,
        accountNo: v.accountNo.trim() || undefined,
        owner: v.owner.trim() || undefined,
        memo: v.memo.trim() || undefined,
      }
      return account ? payload : { ...payload, shareToGroup: canShareToGroup && v.shareToGroup }
    },
    successMessage: account ? '계좌가 수정되었습니다' : '계좌가 추가되었습니다',
    onDone,
  })

  return (
    <form onSubmit={form.submit} className="space-y-4">
      <FormField control={form.control} name="accountType" label="계좌 유형">
        {(f) => (
          <Select
            items={meta.financeAccountTypes.map((t) => ({ value: t.code, label: t.label }))}
            value={f.value}
            onValueChange={(value) => { if (value) f.onChange(value) }}
          >
            <SelectTrigger id={f.id} className="w-full h-11" disabled={form.isPending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meta.financeAccountTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField control={form.control} name="name" id="accountName" label="계좌 이름" required>
        {(f) => <Input {...f} disabled={form.isPending} maxLength={50} className="h-11" />}
      </FormField>

      <FormField control={form.control} name="institution" id="accountInstitution" label="기관">
        {(f) => <Input {...f} disabled={form.isPending} maxLength={50} className="h-11" />}
      </FormField>

      <FormField control={form.control} name="accountNo" label="계좌번호">
        {(f) => <Input {...f} onChange={(e) => f.onChange(digitsOnly(e.target.value))} inputMode="numeric" disabled={form.isPending} maxLength={50} className="h-11" />}
      </FormField>

      <FormField control={form.control} name="owner" id="accountOwner" label="소유자">
        {(f) => <Input {...f} disabled={form.isPending} maxLength={50} className="h-11" />}
      </FormField>

      <FormField control={form.control} name="memo" id="accountMemo" label="메모">
        {(f) => <Input {...f} disabled={form.isPending} maxLength={100} className="h-11" />}
      </FormField>

      {!account && canShareToGroup && (
        <ShareToGroupSwitch id="accountShareToGroup" checked={form.watch('shareToGroup')} onCheckedChange={(v) => form.setValue('shareToGroup', v)} disabled={form.isPending} />
      )}

      <FormActions form={form} onCancel={onDone} label="저장" canSubmit={!!form.watch('name').trim()} className="pt-2" />
    </form>
  )
}
