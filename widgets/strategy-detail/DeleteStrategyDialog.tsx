'use client'

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
  onConfirm: () => void
  disabled: boolean
  isDeleting: boolean
}

export function DeleteStrategyDialog({ open, onOpenChange, ticker, onConfirm, disabled, isDeleting }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1 text-destructive hover:text-destructive')} disabled={disabled}>
        삭제
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>전략을 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>{ticker} 전략을 삭제하시겠습니까? 진행 중인 사이클이 종료됩니다.</AlertDialogDescription>
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
}
