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
import { brokerKindLabel, isMockBroker } from '@shared/lib/api-schema'
import { cn } from '@shared/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticker: string
  // 생략하면 '증권사' — DCA 외 전략(StrategyDetail)은 주식 전용이라 넘기지 않는다. 크립토가 가능한 화면은 반드시 넘긴다
  broker?: string
  onConfirm: () => void
  disabled: boolean
  isDeleting: boolean
  // 보관된 전략이면 "보관하세요" 안내를 뺀다
  isArchived?: boolean
  // 버튼 아래 한 줄 설명 — 있으면 버튼과 함께 세로 열로 묶는다(부모는 열 배치)
  caption?: string
  // 목록 안에서 여러 개가 보일 때 트리거 이름에 종목을 붙인다
  triggerAriaLabel?: string
}

export function DeleteStrategyDialog({ open, onOpenChange, ticker, broker, onConfirm, disabled, isDeleting, isArchived, triggerAriaLabel, caption }: Props) {
  const captionId = useId()
  const dialog = (
    // 처리 중 열기만 막는다 — 삭제 진행 중 닫기 동작은 기존과 동일
    <AlertDialog open={open} onOpenChange={(next) => { if (!(next && disabled)) onOpenChange(next) }}>
      {/* disabled로 바꾸면 포커스가 body로 빠져 모달을 닫은 뒤 이 버튼으로 복귀하지 못한다 */}
      <AlertDialogTrigger className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), caption ? 'w-full aria-disabled:opacity-50' : 'flex-1 aria-disabled:opacity-50')} aria-disabled={disabled} aria-label={triggerAriaLabel} aria-describedby={caption ? captionId : undefined}>
        삭제
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>전략을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>{ticker} 전략을 삭제하시겠습니까? {isMockBroker(broker) ? '' : `${brokerKindLabel(broker)}에 접수된 `}미체결 주문을 먼저 취소하고, 전략과 사이클 기록을 더 이상 볼 수 없습니다. 통계에서도 이 전략의 성과가 사라집니다.{isArchived ? '' : ' 통계를 남기려면 보관하세요.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={disabled}>
            {isDeleting ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  if (!caption) return dialog
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {dialog}
      <p id={captionId} className="text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}
