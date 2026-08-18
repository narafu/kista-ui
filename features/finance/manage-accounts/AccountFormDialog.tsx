'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { useMeta } from '@entities/meta'
import { useCreateFinanceAccountMutation, useUpdateFinanceAccountMutation } from '@entities/finance'
import type { FinanceAccount, FinanceAccountRequest, FinanceAccountType } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: FinanceAccount // undefined = 생성 모드
}

export function AccountFormDialog({ open, onOpenChange, account }: Props) {
  const { meta } = useMeta()
  const [accountType, setAccountType] = useState<FinanceAccountType>(
    account?.accountType ?? (meta.financeAccountTypes[0]?.code as FinanceAccountType) ?? 'BANK'
  )
  const [name, setName] = useState(account?.name ?? '')
  const [accountNo, setAccountNo] = useState(account?.accountNo ?? '')
  const [memo, setMemo] = useState(account?.memo ?? '')

  const createMutation = useCreateFinanceAccountMutation()
  const updateMutation = useUpdateFinanceAccountMutation(account?.id ?? '')
  const isPending = account ? updateMutation.isPending : createMutation.isPending
  const canSubmit = name.trim() !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceAccountRequest = {
      accountType,
      name: name.trim(),
      accountNo: accountNo.trim() || undefined,
      memo: memo.trim() || undefined,
    }

    if (account) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('계좌가 수정되었습니다')
          onOpenChange(false)
        },
      })
      return
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('계좌가 등록되었습니다')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{account ? '계좌 수정' : '계좌 추가'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="accountType">계좌 유형</Label>
              <Select
                items={meta.financeAccountTypes.map((t) => ({ value: t.code, label: t.label }))}
                value={accountType}
                onValueChange={(value) => { if (value) setAccountType(value as FinanceAccountType) }}
              >
                <SelectTrigger id="accountType" className="w-full h-11" disabled={isPending}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meta.financeAccountTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">계좌 이름</Label>
              <Input
                id="accountName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                maxLength={50}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNo">계좌번호 (선택)</Label>
              <Input
                id="accountNo"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                disabled={isPending}
                maxLength={50}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountMemo">메모 (선택)</Label>
              <Input
                id="accountMemo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={isPending}
                maxLength={100}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="gap-2" disabled={isPending || !canSubmit}>
              {isPending ? (
                <>
                  <Spinner size={14} />
                  저장 중...
                </>
              ) : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
