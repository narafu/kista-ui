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
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { digitsOnly } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useCanShareToGroup, useCreateFinanceAccountMutation, useUpdateFinanceAccountMutation } from '@entities/finance'
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
  // 기존 DB의 accountNo는 마이그레이션되지 않아 비숫자를 포함할 수 있다(서버는 신규/수정 요청만
  // 숫자 전용으로 강제) — 초기값부터 digitsOnly로 정규화해야 필드를 건드리지 않고 다른 값만
  // 고쳐 제출해도 400을 맞지 않는다.
  const [accountNo, setAccountNo] = useState(digitsOnly(account?.accountNo ?? ''))
  const [memo, setMemo] = useState(account?.memo ?? '')

  // 생성 모드에서만 노출, 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) —
  // 수정 모드는 groupId가 이미 고정돼 있어 대상 아님(BudgetFormDialog와 동일 패턴).
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

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

    createMutation.mutate({ ...payload, shareToGroup: canShareToGroup && shareToGroup }, {
      onSuccess: (saved, variables) => {
        if (variables.shareToGroup && !saved.groupId) {
          toast.warning('계좌는 저장됐지만 그룹 공유에 실패했습니다 — 목록에서 공유 버튼으로 다시 시도하세요')
        } else {
          toast.success('계좌가 등록되었습니다')
        }
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
                inputMode="numeric"
                value={accountNo}
                onChange={(e) => setAccountNo(digitsOnly(e.target.value))}
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

            {!account && canShareToGroup && (
              <ShareToGroupSwitch id="accountShareToGroup" checked={shareToGroup} onCheckedChange={setShareToGroup} disabled={isPending} />
            )}
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
