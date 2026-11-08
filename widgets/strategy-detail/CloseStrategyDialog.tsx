'use client'

import { useId, useState } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { brokerKindLabel, isMockBroker } from '@shared/lib/api-schema'
import { cn } from '@shared/lib/utils'

type CloseChoice = 'ARCHIVE' | 'DELETE'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticker: string
  // 크립토가 가능한 화면은 반드시 넘긴다 — 생략하면 '증권사'
  broker?: string
  // 보유 수량이 남아 있으면 보관할 수 없다(최종 판정은 서버) — 보관 선택지를 막고 사유를 보여 준다
  hasHoldings: boolean
  onArchive: () => void
  onDelete: () => void
  disabled: boolean
  isArchiving: boolean
  isDeleting: boolean
}

// 전략 종료 버튼 + "보관/삭제" 선택 다이얼로그. 버튼 아래 한 줄 설명이 있어 부모는 items-start 열 배치여야 한다
export function CloseStrategyDialog({ open, onOpenChange, ticker, broker, hasHoldings, onArchive, onDelete, disabled, isArchiving, isDeleting }: Props) {
  const captionId = useId()
  const [picked, setPicked] = useState<CloseChoice | null>(null)
  // 보관이 막히면 삭제만 가능 — 사용자가 직접 고른 값만 저장하고(기본은 보관) 나머지는 파생한다
  const choice: CloseChoice = hasHoldings ? 'DELETE' : (picked ?? 'ARCHIVE')
  const isDelete = choice === 'DELETE'

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {/* 처리 중 열기만 막는다 — 모달 트리거에 disabled를 걸면 닫은 뒤 포커스가 돌아오지 못한다 */}
      <AlertDialog open={open} onOpenChange={(next) => { if (!(next && disabled)) onOpenChange(next) }}>
        <AlertDialogTrigger
          className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'w-full aria-disabled:opacity-50')}
          aria-disabled={disabled}
          aria-describedby={captionId}
        >
          전략 종료
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>전략을 종료하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {ticker} 전략을 보관할지 삭제할지 선택하세요.
              <br />
              둘 다 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <RadioGroup value={choice} onValueChange={(v) => setPicked(v as CloseChoice)} aria-label="종료 방식" disabled={disabled}>
            <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-border p-3 has-data-checked:border-primary has-data-disabled:opacity-60">
              <RadioGroupItem value="ARCHIVE" disabled={disabled || hasHoldings} className="mt-0.5" />
              <span className="min-w-0 space-y-0.5 text-sm">
                <span className="block font-medium">보관</span>
                <span className="block text-xs text-muted-foreground">
                  {hasHoldings ? '보유 수량이 남아 있으면 보관할 수 없습니다.' : '매매가 멈추고 목록에서 사라지지만 성과는 통계에 남습니다.'}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-border p-3 has-data-checked:border-destructive has-data-disabled:opacity-60">
              <RadioGroupItem value="DELETE" disabled={disabled} className="mt-0.5" />
              <span className="min-w-0 space-y-0.5 text-sm">
                <span className="block font-medium">삭제</span>
                <span className="block text-xs text-muted-foreground">
                  {isMockBroker(broker) ? '' : `${brokerKindLabel(broker)}에 접수된 `}미체결 주문을 먼저 취소하고, 전략과 사이클 기록을 더 이상 볼 수 없습니다. 통계에서도 성과가 사라집니다.
                </span>
              </span>
            </label>
          </RadioGroup>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
            <AlertDialogAction variant={isDelete ? 'destructive' : 'default'} onClick={isDelete ? onDelete : onArchive} disabled={disabled}>
              {isDelete ? (isDeleting ? '삭제 중...' : '삭제') : isArchiving ? '보관 중...' : '보관'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p id={captionId} className="text-xs text-muted-foreground">보관 또는 삭제</p>
    </div>
  )
}
