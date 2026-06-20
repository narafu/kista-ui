'use client'

import { useState } from 'react'
import { useDeleteAdminUserMutation } from '@entities/user'

interface Props {
  userId: string
  nickname: string
}

export function WithdrawUserButton({ userId, nickname }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteAdminUserMutation()

  function handleConfirm() {
    mutation.mutate(userId, {
      onSuccess: () => setOpen(false),
      onError: () => setOpen(false),
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[var(--status-error)]/50 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50 transition-colors"
      >
        탈퇴
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-[var(--r-lg)] p-6 w-[320px] shadow-lg">
            <h3 className="text-base font-bold mb-2 text-[var(--status-error)]">
              회원 강제 탈퇴
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{nickname}</span> 회원을 탈퇴 처리합니다.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              계좌·전략·거래 데이터가 즉시 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
                className="flex-1 py-2 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className="flex-1 py-2 rounded-[var(--r-md)] bg-[var(--status-error)] text-white text-sm font-semibold disabled:opacity-60 transition-colors"
              >
                {mutation.isPending ? '처리 중...' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
