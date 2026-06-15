'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUpdateBalanceCheckEnabledMutation } from '@entities/user'

interface Props {
  initialEnabled: boolean
}

export function BalanceCheckSetting({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pendingNext, setPendingNext] = useState<boolean | null>(null)
  const mutation = useUpdateBalanceCheckEnabledMutation()

  function handleToggle() {
    setPendingNext(!enabled)
  }

  function confirmToggle() {
    if (pendingNext === null) return
    setEnabled(pendingNext)
    mutation.mutate(pendingNext)
    setPendingNext(null)
  }

  const turningOn = pendingNext === true
  const turningOff = pendingNext === false

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[13px] font-bold">잔고 검증</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">
            끄면 예수금이 부족해도 전략을 생성·재등록합니다.
            미리보기로 주문금액을 확인 후 필요한 금액만 이체해 운용할 수 있습니다.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={mutation.isPending}
          onClick={handleToggle}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            enabled ? 'bg-[var(--rose-600,theme(colors.rose.600))]' : 'bg-input',
          ].join(' ')}
        >
          <span
            className={[
              'pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      <AlertDialog open={pendingNext !== null} onOpenChange={(open) => { if (!open) setPendingNext(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {turningOn ? '잔고 검증 켜기' : '잔고 검증 끄기'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {turningOn
                ? '잔고검증 OFF로 등록한 전략의 시드가 실잔고보다 크면 다음 회전에서 자동 일시정지될 수 있습니다. 전략 수정에서 시드 금액을 실잔고 이내로 조정하거나, 미리 입금해두세요.'
                : '실잔고보다 큰 시드로 사이클이 시작될 경우 KIS에서 주문이 거부(APBK0988)될 수 있습니다. 전략 미리보기로 주문금액을 확인 후 필요한 금액을 이체해두세요.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {turningOn ? '켜기' : '끄기'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
