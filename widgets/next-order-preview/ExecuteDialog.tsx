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
} from '@components/ui/alert-dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isRunning: boolean
  onConfirm: () => void
}

export function ExecuteDialog({ open, onOpenChange, isRunning, onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>지금 매매를 실행하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            오늘 날짜의 LOC 주문을 즉시 접수합니다. 장 마감 시 체결됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRunning}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isRunning}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isRunning ? '실행 중...' : '실행'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
