'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Surface } from '@shared/ui/Surface'
import { digitsOnly, formatAmountDisplay, fmtKrw, todayKst } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import {
  buildBulkRegisterItems,
  buildCategoryIndex,
  monthEndDate,
  monthStartDate,
  shiftMonth,
  useAssetSnapshotsQuery,
  useBulkRegisterFinanceMutation,
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
} from '@entities/finance'
import type { BulkRegisterGroup, BulkRegisterItem } from '@entities/finance'
import { YearMonthSelect } from './YearMonthSelect'

// todayKst() 사용 — new Date()의 getFullYear/getMonth는 브라우저 로컬 타임존이라
// KST가 아닌 기기·자정 근처(UTC 기준 전날)에서 소스/타겟월 기본값이 하루 어긋날 수 있다.
function thisMonth(): string {
  return todayKst().slice(0, 7)
}

interface RowState {
  included: boolean
  amount: number
}

interface Props {
  defaultSourceMonth?: string
  defaultTargetMonth?: string
}

export function BulkRegisterForm({ defaultSourceMonth, defaultTargetMonth }: Props) {
  const router = useRouter()
  const { labelOf } = useMeta()
  const [sourceMonth, setSourceMonth] = useState(defaultSourceMonth ?? shiftMonth(thisMonth(), -1))
  const [targetMonth, setTargetMonth] = useState(defaultTargetMonth ?? thisMonth())

  const { data: transactions = [] } = useFinanceTransactionsQuery(monthStartDate(sourceMonth), monthEndDate(sourceMonth))
  const { data: assetSnapshots = [] } = useAssetSnapshotsQuery()
  const { data: incomeCategories = [] } = useFinanceCategoriesQuery('INCOME')
  const { data: expenseCategories = [] } = useFinanceCategoriesQuery('EXPENSE')
  const { data: savingCategories = [] } = useFinanceCategoriesQuery('SAVING')

  // AssetSnapshot 조회 API엔 기간 파라미터가 없어(전체 목록) 소스월 접두사로 클라이언트 필터링한다.
  const filteredSnapshots = useMemo(
    () => assetSnapshots.filter((s) => s.entryDate.startsWith(sourceMonth)),
    [assetSnapshots, sourceMonth],
  )
  const index = useMemo(
    () => buildCategoryIndex({ INCOME: incomeCategories, EXPENSE: expenseCategories, SAVING: savingCategories }),
    [incomeCategories, expenseCategories, savingCategories],
  )
  const items = useMemo(
    () => buildBulkRegisterItems({ transactions, assetSnapshots: filteredSnapshots, index }),
    [transactions, filteredSnapshots, index],
  )

  // 소스월에 실제로 등록된 데이터만 매번 다시 조회해 만드는 목록이라, 제외 토글을 끈 항목은
  // 다음 달 미리보기에도 자동으로 다시 나타나지 않는다 — 별도로 "제외 이력"을 저장하지 않는다.
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({})

  function rowState(item: BulkRegisterItem): RowState {
    return rowStates[item.id] ?? { included: item.included, amount: item.amount }
  }
  function updateRow(item: BulkRegisterItem, patch: Partial<RowState>) {
    setRowStates((prev) => ({ ...prev, [item.id]: { ...rowState(item), ...patch } }))
  }

  const mutation = useBulkRegisterFinanceMutation()

  const allItems = useMemo(
    () => [...items.asset, ...items.income, ...items.expense, ...items.saving].flatMap((g) => g.items),
    [items],
  )
  const includedCount = allItems.filter((item) => rowState(item).included).length

  function handleSubmit() {
    const targetDate = monthStartDate(targetMonth)

    const assets = items.asset
      .flatMap((g) => g.items)
      .filter((item) => rowState(item).included)
      .map((item) => ({
        categoryId: item.categoryId,
        accountId: item.accountId,
        entryDate: targetDate,
        assetClass: item.assetClass!,
        market: item.market!,
        strategy: item.strategy,
        memo: item.memo,
        amount: rowState(item).amount,
      }))

    const transactionsPayload = [...items.income, ...items.expense, ...items.saving]
      .flatMap((g) => g.items)
      .filter((item) => rowState(item).included)
      .map((item) => ({
        categoryId: item.categoryId,
        transactionDate: targetDate,
        amount: rowState(item).amount,
        memo: item.memo,
      }))

    mutation.mutate(
      { assets, transactions: transactionsPayload },
      {
        onSuccess: (result) => {
          const succeeded = result.assetSuccessCount + result.transactionSuccessCount
          if (result.failures.length > 0) {
            toast.warning(`${succeeded}건 등록, ${result.failures.length}건 실패 — ${result.failures[0]}`)
          } else {
            toast.success(`${succeeded}건 등록했어요`)
          }
          router.push('/finance')
        },
      },
    )
  }

  function renderRow(item: BulkRegisterItem, showAssetColumns: boolean) {
    const state = rowState(item)
    // 같은 카테고리+메모 조합이 두 행 이상일 수 있어(예: 같은 가맹점 메모의 카드 결제 2건) 원본
    // 금액까지 이어 붙여 접근성 이름을 행마다 고유하게 만든다 — categoryName+memo만으로는 충돌한다.
    const rowLabel = `${item.categoryName}${item.memo ? ' ' + item.memo : ''} ${fmtKrw(item.amount)}`
    return (
      <div key={item.id} className="flex items-center gap-3 py-3 border-t border-border first:border-t-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.categoryName}</div>
          {showAssetColumns && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {labelOf('assetClasses', item.assetClass ?? '')} · {item.strategy || '—'}
            </div>
          )}
          {item.memo && <div className="text-xs text-muted-foreground mt-0.5 truncate">{item.memo}</div>}
        </div>
        <Input
          inputMode="numeric"
          value={formatAmountDisplay(String(state.amount))}
          onChange={(e) => updateRow(item, { amount: Number(digitsOnly(e.target.value)) })}
          disabled={!state.included}
          className="h-9 w-32 text-right tabular-nums shrink-0"
          aria-label={`${rowLabel} 금액`}
        />
        <Switch
          checked={state.included}
          onCheckedChange={(next) => updateRow(item, { included: next })}
          aria-label={`${rowLabel} 포함`}
        />
      </div>
    )
  }

  function renderSection(title: string, groups: BulkRegisterGroup[], showAssetColumns = false) {
    return (
      <Surface as="section" className="p-6">
        <div className="text-sm font-bold mb-3">{title}</div>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">이 달 등록된 기록이 없어요.</p>
        ) : (
          groups.map((group) => (
            <div key={group.rootId} className="mb-4 last:mb-0">
              <div className="text-xs font-semibold text-muted-foreground mb-1">{group.rootLabel}</div>
              {group.items.map((item) => renderRow(item, showAssetColumns))}
            </div>
          ))
        )}
      </Surface>
    )
  }

  return (
    <div className="space-y-[18px] pb-24">
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
        <YearMonthSelect value={sourceMonth} onChange={setSourceMonth} yearLabel="소스 연도" monthLabel="소스 월" />
        <span>기록으로</span>
        <YearMonthSelect value={targetMonth} onChange={setTargetMonth} yearLabel="대상 연도" monthLabel="대상 월" />
        <span>모두 등록</span>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <div>{renderSection('자산', items.asset, true)}</div>
        <div className="space-y-[18px]">
          {renderSection('수입', items.income)}
          {renderSection('소비', items.expense)}
          {renderSection('저축', items.saving)}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 border-t border-border bg-background/95 backdrop-blur px-4 py-4 sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <span className="text-sm text-muted-foreground">{includedCount}건 등록 예정</span>
        <Button onClick={handleSubmit} disabled={mutation.isPending || includedCount === 0}>
          이대로 확정하기
        </Button>
      </div>
    </div>
  )
}
