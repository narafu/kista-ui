'use client'

import { useId } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticker: string
  // 보유 수량이 남아 있으면 보관할 수 없다(최종 판정은 서버) — 트리거를 막고 사유를 화면에 보여 준다
  hasHoldings: boolean
  onConfirm: () => void
  disabled: boolean
  isArchiving: boolean
}

// 보관 버튼 + 확인 다이얼로그. 사유 문구는 flex 행에서 줄바꿈되도록 basis-full — 부모는 flex-wrap이어야 한다
export function ArchiveStrategyDialog({ open, onOpenChange, ticker, hasHoldings, onConfirm, disabled, isArchiving }: Props) {
  const blockedId = useId()
  const blocked = disabled || hasHoldings
  return (
    <>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!(next && blocked)) onOpenChange(next)
        }}
      >
        {/* disabled 대신 aria-disabled — DeleteStrategyDialog와 같은 이유(포커스 복귀) */}
        <AlertDialogTrigger
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 aria-disabled:opacity-50')}
          aria-disabled={blocked}
          aria-describedby={hasHoldings ? blockedId : undefined}
        >
          보관
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>전략을 보관하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>{ticker} 전략을 보관하시겠습니까? 매매가 멈추고 목록에서 사라지지만 성과는 통계에 남습니다. 보관은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} disabled={disabled}>
              {isArchiving ? '보관 중...' : '보관'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {hasHoldings && (
        <p id={blockedId} className="basis-full text-xs text-muted-foreground">
          보유 수량이 남아 있으면 보관할 수 없습니다.
        </p>
      )}
    </>
  )
}
