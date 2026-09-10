'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { fmtKrw } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { buildBudgetProgressTree, calcBudgetProgress, calcUnbudgetedCategories, filterByType, flowCategoryColor, sortCategoryTree } from '@entities/finance'
import type { BudgetTreeNode, CategoryIndex, FinanceBudget, FinanceCategory, FinanceTransaction, Period } from '@entities/finance'
import { BudgetFormDialog } from '@features/finance/manage-budgets'

interface Props {
  type: 'INCOME' | 'EXPENSE' | 'SAVING'
  budgets: FinanceBudget[]
  transactions: FinanceTransaction[]
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  // useFinanceFlowData.ts가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
}

interface BreakdownBarProps {
  label: string
  actual: number
  allocated: number
  remaining: number
  percent: number
  color: string
  // 자체 예산이 없는 그룹(중간 카테고리) 행 — 하위 예산 합만 보여준다. 라벨은 굵게, 막대는 무채색, 숫자에 Σ.
  isGroup?: boolean
}

// widgets/asset-overview/AssetOverview.tsx의 로컬 BreakdownBar를 정본으로 복제하되
// 시맨틱을 예산 대비용(우측: 실적/할당, 잔여·초과)으로 바꿨다 — widget 간 import 금지 규칙에 따라
// 각 위젯이 각자 복제한다.
function BreakdownBar({ label, actual, allocated, remaining, percent, color, isGroup = false }: BreakdownBarProps) {
  const isOver = remaining < 0
  return (
    <div className="flex items-center gap-3">
      <span className={cn('w-24 shrink-0 truncate text-sm', isGroup ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', isGroup && 'bg-muted-foreground/40')}
          style={isGroup ? { width: `${percent}%` } : { width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex w-auto min-w-[9rem] shrink-0 flex-col items-end">
        <span className="text-sm font-medium tabular-nums">{`${isGroup ? 'Σ ' : ''}${fmtKrw(actual)} / ${fmtKrw(allocated)}`}</span>
        <span className={cn('text-xs tabular-nums', isOver ? 'text-destructive' : 'text-muted-foreground')}>
          {isOver ? `초과 ${fmtKrw(Math.abs(remaining))}` : `잔여 ${fmtKrw(remaining)}`}
        </span>
      </div>
    </div>
  )
}

// depth별 들여쓰기 — 트리가 깊어져도 3단계 이상은 동일 들여쓰기로 묶는다.
const INDENT_BY_DEPTH = ['', 'pl-4', 'pl-8', 'pl-10'] as const

function BudgetTreeRow({ node, orderedRootIds, index }: { node: BudgetTreeNode; orderedRootIds: string[]; index: CategoryIndex }) {
  return (
    <>
      <div className={INDENT_BY_DEPTH[Math.min(node.depth, INDENT_BY_DEPTH.length - 1)]}>
        <BreakdownBar
          label={node.categoryName}
          actual={node.actual}
          allocated={node.allocated}
          remaining={node.remaining}
          percent={Math.min(node.usageRatio * 100, 100)}
          color={flowCategoryColor(orderedRootIds, index.get(node.categoryId)?.rootId ?? '')}
          isGroup={node.isGroup}
        />
      </div>
      {node.children.map((child) => (
        <BudgetTreeRow key={child.categoryId} node={child} orderedRootIds={orderedRootIds} index={index} />
      ))}
    </>
  )
}

export function FinanceBudgetProgress({ type, budgets, transactions, categoryTree, index, period, isLoading, isError, today }: Props) {
  const { labelOf } = useMeta()
  // 예산 없이 실적만 있는 카테고리를 위한 즉석 예산등록 다이얼로그 대상 — 카테고리만 프리필하고
  // 날짜·금액은 비워서 사용자가 직접 입력하게 한다(BudgetFormDialog의 duplicateFrom 재사용).
  const [quickCreateCategoryId, setQuickCreateCategoryId] = useState<string | null>(null)

  const typedBudgets = budgets.filter((b) => index.get(b.categoryId)?.type === type)
  const typedTransactions = filterByType(transactions, index, type)
  // 트리 재귀 정렬은 렌더마다 반복하기엔 비용이 있어 한 번만 계산해 calcBudgetProgress(표시 순번)와
  // orderedRootIds(색상 매핑) 양쪽에 재사용한다.
  const sortedCategoryTree = useMemo(() => sortCategoryTree(categoryTree), [categoryTree])
  const progress = calcBudgetProgress(typedBudgets, typedTransactions, sortedCategoryTree, index, period, today)
  const budgetTree = buildBudgetProgressTree(progress, sortedCategoryTree)
  const unbudgeted = calcUnbudgetedCategories(typedBudgets, typedTransactions, sortedCategoryTree, index, period, today)
  const orderedRootIds = sortedCategoryTree.map((c) => c.id)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg">{`${labelOf('financeCategoryTypes', type)} 예산 대비`}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <SectionError message="예산 대비 실적을 불러오지 못했습니다" />
        ) : (
          <div className="space-y-4">
            {budgetTree.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">설정한 예산이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {budgetTree.map((node) => (
                  <BudgetTreeRow key={node.categoryId} node={node} orderedRootIds={orderedRootIds} index={index} />
                ))}
              </div>
            )}

            {unbudgeted.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">예산 미설정</p>
                <ul className="m-0 list-none space-y-1.5 p-0">
                  {unbudgeted.map((entry) => (
                    <li key={entry.categoryId} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{entry.categoryName}</span>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{fmtKrw(entry.amount)}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setQuickCreateCategoryId(entry.categoryId)}
                      >
                        예산 등록
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {quickCreateCategoryId && (
        <BudgetFormDialog
          open
          onOpenChange={(next) => { if (!next) setQuickCreateCategoryId(null) }}
          categoryTree={categoryTree}
          duplicateFrom={{ categoryId: quickCreateCategoryId, amount: 0, applyStartDate: '', applyEndDate: undefined }}
          onSuccess={() => setQuickCreateCategoryId(null)}
        />
      )}
    </Card>
  )
}
