'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  buildCategoryIndex,
  displayWindow,
  listAvailableMonths,
  monthEndDate,
  previousYearRange,
  useAssetSnapshotsQuery,
  useFinanceBudgetsQuery,
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
  yearsRange,
} from '@entities/finance'
import type { FinanceCategoryType, Period } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { NewAssetButton } from '@features/asset/save-asset'
import { NewTransactionButton } from '@features/finance/save-transaction'
import { BudgetManagerDialog } from '@features/finance/manage-budgets'
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
  { value: 'investment', label: '자산' },
  { value: 'income', label: '수입' },
  { value: 'expense', label: '소비' },
  { value: 'saving', label: '저축' },
  { value: 'settings', label: '설정' },
]

// 수입/소비/저축 탭 -> FinanceCategoryType 매핑. 'ASSET'을 포함하지 않는 좁은 타입으로 선언해
// categoryTreeByType(INCOME/EXPENSE/SAVING만 있는 Record) 인덱싱에서 타입 오류가 나지 않게 한다.
const FLOW_TYPE: Record<'income' | 'expense' | 'saving', 'INCOME' | 'EXPENSE' | 'SAVING'> = {
  income: 'INCOME',
  expense: 'EXPENSE',
  saving: 'SAVING',
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-9 w-full items-center justify-center rounded px-2 py-1 text-sm font-medium transition-colors',
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
// PageHeader의 actions도 page.tsx가 아니라 여기서 렌더한다 — 자산 탭은 NewAssetButton,
// 수입/소비/저축 탭은 NewTransactionButton으로 서로 다르고, 탭 상태가 이 컴포넌트의 client
// state라 Server Component인 page.tsx는 탭에 따라 버튼을 조건부로 고를 수 없다.
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
  const today = todayKst()
  const flowWindow = useMemo(() => displayWindow(period, today), [period, today])
  // 등록 다이얼로그의 날짜 제약은 "지금 조회 중인 기간"(flowWindow)이 아니라 "오늘 기준" 독립 창이다 —
  // 조회 윈도우에 묶으면 과거 달을 보는 중엔 오늘 날짜조차 등록할 수 없어진다(리뷰에서 지적된 실사용
  // 시나리오). 수정 다이얼로그(FinanceRecordList)는 반대로 조회 윈도우 그대로 쓴다 — 편집 대상 거래
  // 자체가 그 창 안에서만 존재할 수 있어 여기서 분리할 이유가 없다.
  // 하한(from)은 없다 — 과거 연도 기록도 자유롭게 등록할 수 있어야 한다(12개월 슬라이딩 윈도우는
  // 조회 전용 제약이었을 뿐 등록까지 막을 이유는 없었다). 상한(to)은 이번 달 말일까지만 허용해
  // 미래 날짜 등록은 그대로 막는다.
  const registerWindow = useMemo(() => ({ from: undefined, to: monthEndDate(todayKst().slice(0, 7)) }), [])
  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
  } = useFinanceTransactionsQuery(flowWindow.from, flowWindow.to)
  const isFlowTab = tab === 'income' || tab === 'expense' || tab === 'saving'
  // 자산탭(최근 기록월 기본값)과의 일관성 — 오늘 달에 아직 등록된 거래가 없으면 조회된 12개월
  // 윈도우 안에서 가장 최근 기록이 있는 달로 최초 1회만 이동한다. 이후 사용자가 직접 고른 달은
  // 건드리지 않는다(monthAutoAdjusted 플래그로 최초 1회만 실행).
  const [monthAutoAdjusted, setMonthAutoAdjusted] = useState(false)
  useEffect(() => {
    if (monthAutoAdjusted || isTransactionsLoading) return
    setMonthAutoAdjusted(true)
    if (period.mode !== 'monthly') return
    if (transactions.some((transaction) => transaction.transactionDate.startsWith(period.month))) return
    const latestMonth = transactions.map((transaction) => transaction.transactionDate.slice(0, 7)).sort().at(-1)
    if (latestMonth && latestMonth !== period.month) setPeriod((prev) => ({ ...prev, month: latestMonth }))
  }, [monthAutoAdjusted, isTransactionsLoading, transactions, period.mode, period.month])
  // 전년대비 전용 — 연간 모드일 때만 조회한다. 기존 12개월 윈도우(flowWindow)로는 전년 동기간이
  // 커버되지 않아(예: 2026-08 YTD 대비 2025-01~08은 완전히 다른 범위) 별도 쿼리가 필요하다.
  const previousYearWindow = useMemo(() => previousYearRange(period, today), [period, today])
  const { data: previousYearTransactions = [], isLoading: isPreviousYearLoading } = useFinanceTransactionsQuery(
    previousYearWindow.from,
    previousYearWindow.to,
    { enabled: isFlowTab && period.mode === 'yearly' },
  )
  // 최근추이(연간 모드 "최근 6개년") 전용 — flowWindow(12개월)로는 커버되지 않는 6년치 범위라
  // previousYearTransactions와 동일한 이유로 별도 쿼리한다.
  const yearlyTrendWindow = useMemo(() => yearsRange(period.month, 6, today), [period.month, today])
  const { data: yearlyTrendTransactions = [], isLoading: isYearlyTrendLoading } = useFinanceTransactionsQuery(
    yearlyTrendWindow.from,
    yearlyTrendWindow.to,
    { enabled: isFlowTab && period.mode === 'yearly' },
  )
  const { data: incomeCategories = [], isLoading: isIncomeCategoriesLoading } = useFinanceCategoriesQuery('INCOME')
  const { data: expenseCategories = [], isLoading: isExpenseCategoriesLoading } = useFinanceCategoriesQuery('EXPENSE')
  const { data: savingCategories = [], isLoading: isSavingCategoriesLoading } = useFinanceCategoriesQuery('SAVING')
  const { data: budgets = [] } = useFinanceBudgetsQuery()
  // 거래내역 쿼리만 보고 로딩 종료를 판단하면, 세 카테고리 쿼리가 아직 안 끝난 사이에 거래내역만
  // 먼저 도착했을 때 categoryIndex가 빈 Map인 채로 한 프레임 렌더된다 — filterByType이 전부
  // "분류할 수 없는 내역"으로 오분류하고 예산 대비도 "예산 없음"으로 잘못 표시한다.
  // 연간 모드도 같은 이유로 전년대비·최근추이 쿼리를 기다린다 — 안 기다리면 previousYearTransactions가
  // 기본값 []인 채로 "전년 대비" 카드가 실제 전년 데이터 대신 0(=YTD 총액 그대로)을 잠깐 보여준다.
  const isFlowLoading =
    isTransactionsLoading ||
    isIncomeCategoriesLoading ||
    isExpenseCategoriesLoading ||
    isSavingCategoriesLoading ||
    (period.mode === 'yearly' && (isPreviousYearLoading || isYearlyTrendLoading))
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
            <div className="flex items-center gap-2">
              <BudgetManagerDialog type={flowType} />
              <NewTransactionButton type={flowType} windowFrom={registerWindow.from} windowTo={registerWindow.to} />
            </div>
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
              previousYearTransactions={previousYearTransactions}
              today={today}
            />
            <FinanceBudgetProgress
              type={flowType}
              budgets={budgets}
              transactions={transactions}
              categoryTree={categoryTreeByType[flowType]}
              index={categoryIndex}
              period={period}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
              today={today}
            />
            <FinanceTrend
              type={flowType}
              transactions={transactions}
              yearlyTransactions={yearlyTrendTransactions}
              categoryTree={categoryTreeByType[flowType]}
              index={categoryIndex}
              period={period}
              isLoading={isFlowLoading}
              isError={isTransactionsError}
              today={today}
            />
            <FinanceRecordList
              key={flowType}
              type={flowType}
              transactions={transactions}
              categoryTree={categoryTreeByType[flowType]}
              index={categoryIndex}
              period={period}
              isLoading={isFlowLoading}
              today={today}
              isError={isTransactionsError}
              registerWindowFrom={registerWindow.from}
              registerWindowTo={registerWindow.to}
            />
          </>
        )}
      </div>
    </>
  )
}
