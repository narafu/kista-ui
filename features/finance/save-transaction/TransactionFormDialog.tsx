'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import {
  getCascadeLevels,
  getCategoryPath,
  useCanShareToGroup,
  useCreateFinanceTransactionMutation,
  useFinanceCategoriesQuery,
  useUpdateFinanceTransactionMutation,
} from '@entities/finance'
import type { FinanceCategoryType, FinanceTransaction, FinanceTransactionRequest } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FinanceCategoryType
  initial?: FinanceTransaction
  // 내역 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액·메모·
  // 날짜(원본 날짜, windowFrom/windowTo로 clamp)를 프리필한다.
  duplicateFrom?: Pick<FinanceTransaction, 'categoryId' | 'amount' | 'memo' | 'transactionDate'>
  onSuccess: () => void
  // 등록(NewTransactionButton)·복제 시 새로 저장될 날짜의 유효 범위('YYYY-MM-DD') — "오늘 기준"
  // 독립 창(useFinanceFlowData.ts/FinanceHeader.tsx의 registerWindow, 하한 없음·상한은 이번 달 말일).
  // 수정(FinanceRecordList)은 자산 기록 수정과 동일하게 날짜 제약이 없어 이 prop을 넘기지 않는다
  // — 과거에는 조회 중인 12개월 창으로 clamp했으나, 등록 시점을 잘못 고른 내역을 그 창 밖 날짜로
  // 옮기지 못하는 문제가 있어 수정만 무제한으로 풀었다.
  windowFrom?: string
  windowTo?: string
}

function clampDate(date: string, min?: string, max?: string): string {
  if (min && date < min) return min
  if (max && date > max) return max
  return date
}

export function TransactionFormDialog({ open, onOpenChange, type, initial, duplicateFrom, onSuccess, windowFrom, windowTo }: Props) {
  const mode = initial ? 'edit' : 'create'
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const seed = initial ?? duplicateFrom

  const [transactionDate, setTransactionDate] = useState(
    clampDate(initial?.transactionDate ?? duplicateFrom?.transactionDate ?? todayKst(), windowFrom, windowTo),
  )
  // 계단식 카테고리 Select: AssetForm과 동일 패턴 — selectedPath 마지막 값이 실제 제출용 categoryId.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    seed ? getCategoryPath(categories, seed.categoryId).map((c) => c.id) : []
  )
  // 다이얼로그가 카테고리 쿼리 로딩보다 먼저 열릴 수 있어, 데이터 도착 후 한 번 더 경로를 복원한다.
  useEffect(() => {
    if (seed && selectedPath.length === 0 && categories.length > 0) {
      setSelectedPath(getCategoryPath(categories, seed.categoryId).map((c) => c.id))
    }
  }, [seed, categories, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, selectedPath), [categories, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  const [amountDigits, setAmountDigits] = useState(seed ? String(seed.amount) : '')
  const [memo, setMemo] = useState(seed?.memo ?? '')

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

  const createMutation = useCreateFinanceTransactionMutation()
  const updateMutation = useUpdateFinanceTransactionMutation(initial?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  const dateInWindow = (!windowFrom || transactionDate >= windowFrom) && (!windowTo || transactionDate <= windowTo)
  const canSubmit = transactionDate !== '' && dateInWindow && categoryId !== '' && amountDigits !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceTransactionRequest = {
      categoryId,
      transactionDate,
      amount: Number(amountDigits),
      memo: memo.trim() || undefined,
    }

    if (mode === 'edit') {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('거래내역이 수정되었습니다')
          onSuccess()
        },
      })
      return
    }

    createMutation.mutate({ ...payload, shareToGroup: canShareToGroup && shareToGroup }, {
      onSuccess: (saved, variables) => {
        if (variables.shareToGroup && !saved.groupId) {
          toast.warning('거래내역은 저장됐지만 그룹 공유에 실패했습니다 — 목록에서 공유 버튼으로 다시 시도하세요')
        } else {
          toast.success('거래내역이 등록되었습니다')
        }
        onSuccess()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? '거래내역 수정' : '거래내역 등록'}</DialogTitle>
            <DialogDescription>날짜, 카테고리, 금액을 입력하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="transactionDate">날짜</Label>
              <Input
                id="transactionDate"
                type="date"
                min={windowFrom}
                max={windowTo}
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <div className="space-y-2">
                <CascadingCategorySelect
                  levels={cascadeLevels}
                  path={selectedPath}
                  onPathChange={setSelectedPath}
                  allowClear={false}
                  id="category"
                  className="w-full h-11"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">금액 (원)</Label>
              <Input
                id="amount"
                inputMode="numeric"
                placeholder="0"
                value={formatAmountDisplay(amountDigits)}
                onChange={(e) => setAmountDigits(digitsOnly(e.target.value))}
                disabled={isPending}
                className="h-11 text-right tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">메모 (선택)</Label>
              <Input
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={isPending}
                maxLength={255}
              />
            </div>

            {mode === 'create' && canShareToGroup && (
              <ShareToGroupSwitch id="transactionShareToGroup" checked={shareToGroup} onCheckedChange={setShareToGroup} disabled={isPending} />
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit} className="gap-2">
              {isPending ? (<><Spinner size={14} />저장 중...</>) : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
