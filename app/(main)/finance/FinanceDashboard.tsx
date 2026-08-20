'use client'

import { useMemo, useState } from 'react'
import {
  buildCategoryIndex,
  listAvailableMonths,
  useAssetSnapshotsQuery,
  useFinanceBudgetsQuery,
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
  windowRange,
} from '@entities/finance'
import type { FinanceCategoryType, Period } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { NewAssetButton } from '@features/asset/save-asset'
import { NewTransactionButton } from '@features/finance/save-transaction'
import { AssetOverview } from '@widgets/asset-overview'
import { AssetTrend } from '@widgets/asset-trend'
import { AssetComposition } from '@widgets/asset-composition'
import { AssetRecordCheck } from '@widgets/asset-record-check'
import { AssetRecordList } from '@widgets/asset-record-list'
import { AssetSettingsPanel } from '@widgets/asset-settings/AssetSettingsPanel'
import { FinanceSummary } from '@widgets/finance-summary'
import { FinanceTrend } from '@widgets/finance-trend'
import { FinanceBudgetProgress } from '@widgets/finance-budget-progress'
import { FinanceRecordList } from '@widgets/finance-record-list'
import { PageHeader } from '@widgets/page-header'
import { cn } from '@shared/lib/utils'

type AssetTab = 'income' | 'expense' | 'saving' | 'investment' | 'settings'

const TAB_OPTIONS: { value: AssetTab; label: string }[] = [
  { value: 'income', label: '수입' },
  { value: 'expense', label: '소비' },
  { value: 'saving', label: '저축' },
  { value: 'investment', label: '자산' },
  { value: 'settings', label: '설정' },
]

// 수입/소비/저축 탭 -> FinanceCategoryType 매핑. 'ASSET'을 포함하지 않는 좁은 타입으로 선언해
// categoryTreeByType(INCOME/EXPENSE/SAVING만 있는 Record) 인덱싱에서 타입 오류가 나지 않게 한다.
const FLOW_TYPE: Record<'income' | 'expense' | 'saving', 'INCOME' | 'EXPENSE' | 'SAVING'> = {
  income: 'INCOME',
  expense: 'EXPENSE',
  saving: 'SAVING',
}
const BUDGET_TABS = ['expense', 'saving'] as const

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 w-full rounded px-2 py-1 text-sm font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

// '가계부' 페이지의 상태 소유자 — asset-overview·asset-record-check가 공유하는 "기준 월"과
// 탭 상태를 이 컴포넌트가 소유하고 props로 흘려보낸다. 위젯끼리 cross-import가 금지돼 있어
// (widgets.md) 두 위젯이 상태를 공유하려면 app 레이어의 공통 client 부모가 필요하다.
// PageHeader/NewAssetButton도 page.tsx가 아니라 여기서 렌더한다 — "자산 등록" 버튼은 자산
// 탭에서만 의미가 있고(수입/소비/저축은 아직 미구현 안내만 표시), 탭 상태가 이 컴포넌트의 client
// state라 Server Component인 page.tsx는 탭에 따라 버튼을 조건부로 숨길 수 없다.
// 수입/소비/저축 탭은 아직 별도 도메인이 구현되지 않아 자리만 잡아둔 안내 화면이다 — 실제 기능이
// 생기면 각각 별도 위젯으로 분리한다.
export function FinanceDashboard() {
  const [tab, setTab] = useState<AssetTab>('investment')
  const { data: snapshots = [] } = useAssetSnapshotsQuery()
  const months = useMemo(() => listAvailableMonths(snapshots), [snapshots])
  const [month, setMonth] = useState<string | null>(null)
  // 사용자가 고른 월이 더 이상 목록에 없으면(그 달의 기록을 전부 삭제한 경우 등) 최신 월로 폴백한다 —
  // AssetTrendInner의 effectiveSelector와 동일한 렌더 중 파생 계산(useEffect로 동기화하지 않는다).
  const selectedMonth = month && months.includes(month) ? month : (months[0] ?? null)

  // 수입/소비/저축 탭 전용 상태 — 자산 탭의 selectedMonth(스냅샷 데이터 기반)와는 별개다.
  // 위젯 cross-import 금지 규칙상 이 상태와 12개월 윈도우 데이터를 이 컴포넌트가 소유하고
  // FinanceSummary/FinanceTrend/FinanceBudgetProgress/FinanceRecordList에 props로 내려보낸다.
  const [period, setPeriod] = useState<Period>({ month: todayKst().slice(0, 7), mode: 'monthly' })
  const flowWindow = useMemo(() => windowRange(period.month), [period.month])
  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
  } = useFinanceTransactionsQuery(flowWindow.from, flowWindow.to)
  const { data: incomeCategories = [], isLoading: isIncomeCategoriesLoading } = useFinanceCategoriesQuery('INCOME')
  const { data: expenseCategories = [], isLoading: isExpenseCategoriesLoading } = useFinanceCategoriesQuery('EXPENSE')
  const { data: savingCategories = [], isLoading: isSavingCategoriesLoading } = useFinanceCategoriesQuery('SAVING')
  const { data: budgets = [] } = useFinanceBudgetsQuery()
  // 거래내역 쿼리만 보고 로딩 종료를 판단하면, 세 카테고리 쿼리가 아직 안 끝난 사이에 거래내역만
  // 먼저 도착했을 때 categoryIndex가 빈 Map인 채로 한 프레임 렌더된다 — filterByType이 전부
  // "분류할 수 없는 내역"으로 오분류하고 예산 대비도 "예산 없음"으로 잘못 표시한다.
  const isFlowLoading = isTransactionsLoading || isIncomeCategoriesLoading || isExpenseCategoriesLoading || isSavingCategoriesLoading
  const categoryIndex = useMemo(
    () => buildCategoryIndex({ INCOME: incomeCategories, EXPENSE: expenseCategories, SAVING: savingCategories }),
    [incomeCategories, expenseCategories, savingCategories],
  )
  const categoryTreeByType = useMemo(
    (): Record<'INCOME' | 'EXPENSE' | 'SAVING', typeof incomeCategories> => ({
      INCOME: incomeCategories,
      EXPENSE: expenseCategories,
      SAVING: savingCategories,
    }),
    [incomeCategories, expenseCategories, savingCategories],
  )

  const isFlowTab = tab === 'income' || tab === 'expense' || tab === 'saving'
  const flowType = isFlowTab ? FLOW_TYPE[tab] : null

  const TITLE: Record<AssetTab, string> = {
    investment: '내 자산',
    income: '수입',
    expense: '소비',
    saving: '저축',
    settings: '설정',
  }

  return (
    <>
      <PageHeader
        eyebrow="가계부"
        title={TITLE[tab]}
        actions={
          tab === 'investment' ? (
            <NewAssetButton />
          ) : isFlowTab && flowType ? (
            <NewTransactionButton type={flowType} windowFrom={flowWindow.from} windowTo={flowWindow.to} />
          ) : undefined
        }
      />
      <div className="space-y-6">
        <div role="group" aria-label="자산 탭" className="grid w-full grid-cols-5 rounded-md border border-border p-0.5 sm:w-[30rem]">
          {TAB_OPTIONS.map((option) => (
            <TabButton key={option.value} active={tab === option.value} onClick={() => setTab(option.value)}>
              {option.label}
            </TabButton>
          ))}
        </div>

        {tab === 'investment' && (
          <>
            <AssetOverview month={selectedMonth} months={months} onMonthChange={setMonth} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AssetTrend className="order-2 lg:order-1" />
              <AssetComposition className="order-1 lg:order-2" />
            </div>
            <AssetRecordCheck month={selectedMonth} />
            <AssetRecordList />
          </>
        )}

        {tab === 'settings' && <AssetSettingsPanel />}

        {isFlowTab && flowType && (
          <>
            <FinanceSummary
              type={flowType}
              transactions={transactions}
              index={categoryIndex}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
              period={period}
              onPeriodChange={setPeriod}
            />
            <FinanceTrend
              type={flowType}
              transactions={transactions}
              index={categoryIndex}
              month={period.month}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
            />
            {(BUDGET_TABS as readonly AssetTab[]).includes(tab) && (
              <FinanceBudgetProgress
                type={flowType as 'EXPENSE' | 'SAVING'}
                budgets={budgets}
                transactions={transactions}
                categoryTree={categoryTreeByType[flowType]}
                index={categoryIndex}
                period={period}
                isLoading={isFlowLoading}
                isError={isTransactionsError}
              />
            )}
            <FinanceRecordList
              type={flowType}
              transactions={transactions}
              categoryTree={categoryTreeByType[flowType]}
              index={categoryIndex}
              period={period}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
            />
          </>
        )}
      </div>
    </>
  )
}
