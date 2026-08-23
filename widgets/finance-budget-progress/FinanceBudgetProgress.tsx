'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionError } from '@shared/ui/SectionError'
import { fmtKrw } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { calcBudgetProgress, filterByType, flowCategoryColor, sortCategoryTree } from '@entities/finance'
import type { CategoryIndex, FinanceBudget, FinanceCategory, FinanceTransaction, Period } from '@entities/finance'

interface Props {
  type: 'INCOME' | 'EXPENSE' | 'SAVING'
  budgets: FinanceBudget[]
  transactions: FinanceTransaction[]
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  // FinanceDashboard가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
}

interface BreakdownBarProps {
  label: string
  actual: number
  allocated: number
  remaining: number
  percent: number
  color: string
}

// widgets/asset-overview/AssetOverview.tsx의 로컬 BreakdownBar를 정본으로 복제하되
// 시맨틱을 예산 대비용(우측: 실적/할당, 잔여·초과)으로 바꿨다 — widget 간 import 금지 규칙에 따라
// 각 위젯이 각자 복제한다.
function BreakdownBar({ label, actual, allocated, remaining, percent, color }: BreakdownBarProps) {
  const isOver = remaining < 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex w-auto min-w-[9rem] shrink-0 flex-col items-end">
        <span className="text-sm font-medium tabular-nums">{`${fmtKrw(actual)} / ${fmtKrw(allocated)}`}</span>
        <span className={cn('text-xs tabular-nums', isOver ? 'text-destructive' : 'text-muted-foreground')}>
          {isOver ? `초과 ${fmtKrw(Math.abs(remaining))}` : `잔여 ${fmtKrw(remaining)}`}
        </span>
      </div>
    </div>
  )
}

export function FinanceBudgetProgress({ type, budgets, transactions, categoryTree, index, period, isLoading, isError, today }: Props) {
  const { labelOf } = useMeta()

  const typedBudgets = budgets.filter((b) => index.get(b.categoryId)?.type === type)
  const typedTransactions = filterByType(transactions, index, type)
  // 트리 재귀 정렬은 렌더마다 반복하기엔 비용이 있어 한 번만 계산해 calcBudgetProgress(표시 순번)와
  // orderedRootIds(색상 매핑) 양쪽에 재사용한다.
  const sortedCategoryTree = useMemo(() => sortCategoryTree(categoryTree), [categoryTree])
  const progress = calcBudgetProgress(typedBudgets, typedTransactions, sortedCategoryTree, index, period, today)
  const orderedRootIds = sortedCategoryTree.map((c) => c.id)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">{`${labelOf('financeCategoryTypes', type)} 예산 대비`}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">불러오는 중…</div>
        ) : isError ? (
          <SectionError message="예산 대비 실적을 불러오지 못했습니다" />
        ) : progress.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">설정한 예산이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {progress.map((entry) => (
              <BreakdownBar
                key={entry.budgetId}
                label={entry.categoryName}
                actual={entry.actual}
                allocated={entry.allocated}
                remaining={entry.remaining}
                percent={Math.min(entry.usageRatio * 100, 100)}
                color={entry.usageRatio > 1 ? 'var(--status-error)' : flowCategoryColor(orderedRootIds, index.get(entry.categoryId)?.rootId ?? '')}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
