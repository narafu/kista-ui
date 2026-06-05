'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog'
import { cn } from '@shared/lib/utils'
import { useUpdateAccountMutation, useDeleteAccountMutation } from '@entities/account'
import type { Account } from '@entities/account'

interface Props {
  account: Account
}

export function EditAccountForm({ account }: Props) {
  const [nickname, setNickname] = useState(account.nickname)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const updateMutation = useUpdateAccountMutation(account.id)
  const deleteMutation = useDeleteAccountMutation(account.id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    updateMutation.mutate({ nickname: nickname.trim() })
  }

  function handleDelete() {
    if (deleteConfirm !== account.nickname) return
    deleteMutation.mutate()
  }

  const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-xl space-y-4">
        <div className={cn(cardClass, 'space-y-4')}>
          <h2 className="text-sm font-semibold mb-1">계좌 정보 수정</h2>

          <div className="space-y-2">
            <Label htmlFor="nickname">계좌 별칭</Label>
            <Input
              id="nickname"
              className="h-12"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNo">계좌번호</Label>
            <Input
              id="accountNo"
              defaultValue={account.accountNoMasked}
              className="h-12"
              disabled
            />
            <p className="text-xs text-muted-foreground">계좌번호는 변경할 수 없습니다</p>
          </div>

          <p className="text-xs text-muted-foreground">
            전략은 계좌 상세 화면에서 등록·수정할 수 있습니다.
          </p>

          <div className="hidden sm:flex gap-3 pt-2">
            <Link href={`/accounts/${account.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-12')}>
              취소
            </Link>
            <Button type="submit" className="flex-1 h-12" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        <div className={cn(cardClass, 'border-[var(--status-error-border)] bg-[var(--status-error-bg)]')}>
          <div className="flex items-center gap-2.5 mb-3">
            <AlertTriangle className="size-4 text-[var(--status-error)]" />
            <h2 className="text-sm font-semibold text-[var(--status-error)]">위험 구역</h2>
          </div>
          <p className="text-[13px] text-muted-foreground mb-4">
            계좌를 삭제하면 모든 거래 기록과 설정이 영구적으로 제거됩니다.
          </p>

          <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setDeleteConfirm('') }}>
            <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), 'w-full text-destructive hover:text-destructive border-destructive/40')}>
              계좌 삭제
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>계좌 삭제 확인</DialogTitle>
                <DialogDescription>
                  이 작업은 되돌릴 수 없습니다. 계속하려면 계좌 별칭{' '}
                  <strong className="text-foreground">{account.nickname}</strong>을(를) 정확히 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Input
                  placeholder={account.nickname}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  disabled={deleteMutation.isPending}
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
                >
                  {deleteMutation.isPending ? '삭제 중...' : '영구 삭제'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
        <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}
