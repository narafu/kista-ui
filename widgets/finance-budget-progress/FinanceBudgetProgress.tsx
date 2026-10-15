'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { fmtKrw } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { buildBudgetProgressTree, calcBudgetProgress, calcUnbudgetedCategories, filterByType, flowCategoryColor, newBudgetHref, sortCategoryTree } from '@entities/finance'
import type { BudgetTreeNode, CategoryIndex, FinanceBudget, FinanceCategory, FinanceTransaction, FlowType, Period } from '@entities/finance'

interface Props {
  type: FlowType
  budgets: FinanceBudget[]
  transactions: FinanceTransaction[]
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  isLoading: boolean
  isError: boolean
  // useFinanceFlowData.ts가 한 번만 계산해 내려주는 "오늘" — 위젯마다 todayKst()를 각자 호출하지 않는다.
  today: string
  // 카테고리 행 클릭 — 아래 거래내역 목록을 그 카테고리(하위 포함)로 필터한다. 상태는 FlowPageView(app)가 소유.
  onCategorySelect: (categoryId: string) => void
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
  const { maskIfHidden } = useAmountHiddenPreference()
  const isOver = remaining < 0
  // 모바일: 1행 라벨·금액, 2행 전체 폭 막대 — 한 줄에 두면 금액 열이 폭을 다 써서 막대가 거의 사라진다.
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
      <span className={cn('min-w-0 flex-1 truncate text-sm sm:w-24 sm:flex-none sm:shrink-0', isGroup ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</span>
      <span className="order-last block h-2 basis-full overflow-hidden rounded-full bg-muted sm:order-none sm:flex-1">
        <span
          className={cn('block h-full rounded-full transition-[width] duration-500 ease-out', isGroup && 'bg-muted-foreground/40')}
          style={isGroup ? { width: `${percent}%` } : { width: `${percent}%`, backgroundColor: color }}
        />
      </span>
      <span className="flex w-auto min-w-[9rem] shrink-0 flex-col items-end">
        <span className="text-sm font-medium tabular-nums">{`${isGroup ? 'Σ ' : ''}${maskIfHidden(fmtKrw(actual))} / ${maskIfHidden(fmtKrw(allocated))}`}</span>
        <span className={cn('text-xs tabular-nums', isOver ? 'text-destructive' : 'text-muted-foreground')}>
          {isOver ? `초과 ${maskIfHidden(fmtKrw(Math.abs(remaining)))}` : `잔여 ${maskIfHidden(fmtKrw(remaining))}`}
        </span>
      </span>
    </span>
  )
}

// depth별 들여쓰기 — 트리가 깊어져도 3단계 이상은 동일 들여쓰기로 묶는다.
const INDENT_BY_DEPTH = ['', 'pl-4', 'pl-8', 'pl-10'] as const

const ROW_BUTTON_CLASS = 'block w-full rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface BudgetTreeRowProps {
  node: BudgetTreeNode
  orderedRootIds: string[]
  index: CategoryIndex
  onSelect: (categoryId: string) => void
}

function BudgetTreeRow({ node, orderedRootIds, index, onSelect }: BudgetTreeRowProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(node.categoryId)}
        className={cn(ROW_BUTTON_CLASS, INDENT_BY_DEPTH[Math.min(node.depth, INDENT_BY_DEPTH.length - 1)])}
      >
        <BreakdownBar
          label={node.categoryName}
          actual={node.actual}
          allocated={node.allocated}
          remaining={node.remaining}
          percent={Math.min(node.usageRatio * 100, 100)}
          color={flowCategoryColor(orderedRootIds, index.get(node.categoryId)?.rootId ?? '')}
          isGroup={node.isGroup}
        />
        <span className="sr-only">내역 보기</span>
      </button>
      {node.children.map((child) => (
        <BudgetTreeRow key={child.categoryId} node={child} orderedRootIds={orderedRootIds} index={index} onSelect={onSelect} />
      ))}
    </>
  )
}

export function FinanceBudgetProgress({ type, budgets, transactions, categoryTree, index, period, isLoading, isError, today, onCategorySelect }: Props) {
  const { labelOf } = useMeta()
  const { maskIfHidden } = useAmountHiddenPreference()

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
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">{`${labelOf('financeCategoryTypes', type)} 예산 대비`}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRow />
        ) : isError ? (
          <SectionError message="예산 대비 실적을 불러오지 못했습니다." />
        ) : (
          <div className="space-y-4">
            {budgetTree.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">설정한 예산이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {budgetTree.map((node) => (
                  <BudgetTreeRow key={node.categoryId} node={node} orderedRootIds={orderedRootIds} index={index} onSelect={onCategorySelect} />
                ))}
              </div>
            )}

            {unbudgeted.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">예산 미설정</p>
                <ul className="m-0 list-none space-y-1.5 p-0">
                  {unbudgeted.map((entry) => (
                    <li key={entry.categoryId} className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onCategorySelect(entry.categoryId)}
                        aria-label={`${entry.categoryName} 내역 보기`}
                        className={cn(ROW_BUTTON_CLASS, 'min-w-0 flex-1 truncate text-sm')}
                      >
                        {entry.categoryName}
                      </button>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{maskIfHidden(fmtKrw(entry.amount))}</span>
                      {/* 예산 없이 실적만 있는 카테고리 즉석 등록 — 카테고리만 프리필, 날짜·금액은 사용자가 입력 */}
                      <Link
                        href={newBudgetHref(type, { categoryId: entry.categoryId })}
                        aria-label={`${entry.categoryName} 예산 등록`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
                      >
                        예산 등록
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
