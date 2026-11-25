'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'
import { blockTriggerWhile } from '@shared/ui/blockTriggerWhile'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { useDeleteAdminUserMutation } from '@entities/admin'

interface Props {
  userId: string
  nickname: string
  isSelf?: boolean
}

export function WithdrawUserButton({ userId, nickname, isSelf = false }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteAdminUserMutation()

  return (
    <>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            // 본인 행은 영구 비활성(disabled), 처리 중에는 포커스 유실을 막기 위해 aria-disabled로 연다
            disabled={isSelf}
            aria-disabled={mutation.isPending}
            aria-describedby={isSelf ? `self-withdraw-${userId}` : undefined}
            onClick={blockTriggerWhile(mutation.isPending)}
            className={cn(buttonVariants({ variant: 'destructive', size: 'xs' }), 'aria-disabled:opacity-50')}
          >
            탈퇴
          </button>
        }
        open={open}
        onOpenChange={setOpen}
        size="default"
        title={<span className="text-status-error">회원을 탈퇴 처리하시겠습니까?</span>}
        description={
          <>
            <strong className="font-semibold text-foreground">{nickname}</strong> 회원을 탈퇴 처리합니다.{' '}
            계좌·전략·거래 데이터가 즉시 삭제되며 복구할 수 없습니다.
          </>
        }
        confirmLabel="탈퇴 처리"
        pendingLabel="처리 중..."
        mutation={mutation}
        variables={userId}
        onSuccess={() => toast.success(`${nickname} 님을 탈퇴 처리했습니다`)}
      />
      {isSelf && (
        <span id={`self-withdraw-${userId}`} className="sr-only">본인 계정은 탈퇴 처리할 수 없습니다</span>
      )}
    </>
  )
}
