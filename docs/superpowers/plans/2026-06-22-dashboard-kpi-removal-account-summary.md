# 대시보드 KPI 제거 + 계좌 상세 요약 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드에서 총자산·예수금·평가금 KPI 섹션을 제거하고, 계좌 상세 요약 카드에서 평가손익을 제거하고 예수금(실계좌기준)·평가금(실계좌기준)을 추가한다.

**Architecture:** kista-api 변경 없음 — `GET /api/accounts/{id}/portfolio` 응답의 `summary.usdDeposit`·`summary.posEvalUsd` 필드가 이미 존재한다. 대시보드는 포트폴리오 fetch를 완전히 제거해 불필요한 KIS API 호출을 줄인다.

**Tech Stack:** Next.js 16 App Router · TypeScript · React Query · Tailwind CSS / shadcn/ui

## Global Constraints

- FSD 의존성 단방향: `app → widgets → features → entities → shared`
- `style={{ display: ... }}` 금지, Tailwind className만 사용
- 포맷: 싱글쿼트·세미콜론 없음·import 중괄호 공백
- `toNum()` from `@shared/lib/utils` — BigDecimal 문자열을 숫자로 변환하는 기존 유틸

---

## 변경 파일 맵

| 파일 | 변경 종류 | 이유 |
|------|-----------|------|
| `widgets/dashboard/DashboardOverview.tsx` | 수정 | DashboardKpiSection 제거, props 축소, 레이아웃 단순화 |
| `widgets/dashboard/DashboardKpiSection.tsx` | **삭제** | 더 이상 사용되지 않음 |
| `widgets/dashboard/aggregatePortfolios.ts` | **삭제** | 대시보드에서만 사용, KpiSection 제거로 불필요 |
| `app/(main)/dashboard/page.tsx` | 수정 | portfolio fetch 제거, 불필요 props 제거 |
| `widgets/account-detail/AccountSummaryCard.tsx` | 수정 | 평가손익 제거, 실계좌기준 항목 추가 |
| `widgets/account-detail/AccountDetailTabs.tsx` | 수정 | props 인터페이스 변경 |
| `app/(main)/accounts/[id]/page.tsx` | 수정 | margin API 제거, summary 필드 직접 추출 |

---

## Task 1: 대시보드 KPI 섹션 제거

**Files:**
- Modify: `widgets/dashboard/DashboardOverview.tsx`
- Modify: `app/(main)/dashboard/page.tsx`
- Delete: `widgets/dashboard/DashboardKpiSection.tsx`
- Delete: `widgets/dashboard/aggregatePortfolios.ts`

**Interfaces:**
- Produces: `DashboardOverview`의 props가 `{ holidays, calendarYear, calendarMonth }`만 받도록 단순화

- [ ] **Step 1: `DashboardOverview.tsx` 수정**

`widgets/dashboard/DashboardOverview.tsx`를 다음으로 교체:

```tsx
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@widgets/page-header'
import { MarketHolidayCalendar } from '@widgets/market-holiday-calendar'
import { MarketChartCard } from '@widgets/dashboard/MarketChartCard'
import { MARKET_CHART_CATEGORIES } from '@widgets/dashboard/marketChartCategories'
import { FearGreedSection } from '@widgets/fear-greed-card'

interface Props {
  holidays: string[]
  calendarYear: number
  calendarMonth: number
}

export function DashboardOverview({
  holidays,
  calendarYear,
  calendarMonth,
}: Props) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <PageHeader
          eyebrow="Dashboard"
          title="대시보드"
          actions={
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              <Plus className="size-4" />
              계좌 등록
            </Link>
          }
        />
        <div className="mb-6">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <FearGreedSection />
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="mb-4">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
        <div className="flex flex-col gap-4 mb-4">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
        <div className="flex flex-col gap-4 mb-4">
          <FearGreedSection />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: `app/(main)/dashboard/page.tsx` 수정**

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { getMonthlyHolidays } from '@entities/market'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import type { Account } from '@entities/account'

export default async function DashboardPage() {
  const token = await getAuthToken()

  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth() + 1

  let accounts: Account[] = []
  let holidays: string[] = []

  if (token) {
    try { accounts = await getCachedAccounts(token) } catch {}
    try { holidays = await getMonthlyHolidays(calendarYear, calendarMonth, token) } catch {}
  }

  if (accounts.length === 0) {
    return <DashboardEmpty holidays={holidays} calendarYear={calendarYear} calendarMonth={calendarMonth} />
  }

  return (
    <DashboardOverview
      holidays={holidays}
      calendarYear={calendarYear}
      calendarMonth={calendarMonth}
    />
  )
}
```

- [ ] **Step 3: `DashboardKpiSection.tsx` 삭제**

```bash
rm /mnt/c/Users/USER/workspace/kista/kista-ui/widgets/dashboard/DashboardKpiSection.tsx
```

- [ ] **Step 4: `aggregatePortfolios.ts` 삭제**

```bash
rm /mnt/c/Users/USER/workspace/kista/kista-ui/widgets/dashboard/aggregatePortfolios.ts
```

- [ ] **Step 5: 타입 검사**

```bash
cd /mnt/c/Users/USER/workspace/kista/kista-ui && npm run typecheck 2>&1 | head -40
```

Expected: 오류 없음 또는 이 태스크와 무관한 기존 오류만

- [ ] **Step 6: 커밋**

```bash
cd /mnt/c/Users/USER/workspace/kista/kista-ui && git add widgets/dashboard/DashboardOverview.tsx widgets/dashboard/DashboardKpiSection.tsx widgets/dashboard/aggregatePortfolios.ts app/(main)/dashboard/page.tsx && git commit -m "$(cat <<'EOF'
feat(dashboard): 총자산·예수금·평가금 KPI 섹션 제거

대시보드에서 불필요한 포트폴리오 집계 및 KPI 카드 제거.
KIS API 호출 횟수 감소로 대시보드 로딩 성능 개선.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: AccountSummaryCard 개편

**Files:**
- Modify: `widgets/account-detail/AccountSummaryCard.tsx`
- Modify: `widgets/account-detail/AccountDetailTabs.tsx`
- Modify: `app/(main)/accounts/[id]/page.tsx`

**Interfaces:**
- `AccountSummaryCard` props: `{ account: Account, kisUsdDeposit: number, kisPosEvalUsd: number }`
- `AccountDetailTabs` props: 기존 `portfolio: PortfolioSnapshot | null`, `usdDeposit: number` 제거 → `kisUsdDeposit: number`, `kisPosEvalUsd: number` 추가

- [ ] **Step 1: `AccountSummaryCard.tsx` 수정**

평가손익 제거, 예수금(실계좌기준)·평가금(실계좌기준) 추가:

```tsx
'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'

interface Props {
  account: Account
  kisUsdDeposit: number
  kisPosEvalUsd: number
}

export function AccountSummaryCard({ account, kisUsdDeposit, kisPosEvalUsd }: Props) {
  const [revealed, setRevealed] = useState(false)
  const { labelOf } = useMeta()
  const brokerLabel = labelOf('brokers', account.broker)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">계좌 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="계좌번호"
            labelAction={
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label={revealed ? '숨기기' : '보기'}
              >
                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            value={
              <span className="font-mono tracking-wider">
                {revealed ? (account.accountNo ?? account.accountNoMasked) : account.accountNoMasked}
              </span>
            }
          />
          <KpiCard label="증권사" value={<span className="text-base font-semibold leading-snug">{brokerLabel}</span>} />
          <KpiCard label="예수금(실계좌기준)" value={`$${fmtUsd(kisUsdDeposit)}`} />
          <KpiCard label="평가금(실계좌기준)" value={`$${fmtUsd(kisPosEvalUsd)}`} />
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: `AccountDetailTabs.tsx` props 인터페이스 변경**

```tsx
'use client'

import { useState } from 'react'
import { StrategyList } from '@widgets/strategy-list'
import { useStrategiesQuery } from '@entities/strategy'
import { AccountSummaryCard } from './AccountSummaryCard'
import { TradesTab } from './TradesTab'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

type Tab = 'summary' | 'strategy'

const TAB_LABELS: Record<Tab, string> = {
  summary: '계좌',
  strategy: '전략',
}

interface Props {
  account: Account
  strategies: Strategy[]
  kisUsdDeposit: number
  kisPosEvalUsd: number
}

export function AccountDetailTabs({ account, strategies: initialStrategies, kisUsdDeposit, kisPosEvalUsd }: Props) {
  const { data: strategies = initialStrategies } = useStrategiesQuery(account.id, initialStrategies)
  const [activeTab, setActiveTab] = useState<Tab>('summary')

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b overflow-x-auto">
        {(['summary', 'strategy'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <AccountSummaryCard account={account} kisUsdDeposit={kisUsdDeposit} kisPosEvalUsd={kisPosEvalUsd} />
            <TradesTab accountId={account.id} />
          </div>
        )}
        {activeTab === 'strategy' && (
          <StrategyList accountId={account.id} strategies={strategies} />
        )}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <AccountSummaryCard account={account} kisUsdDeposit={kisUsdDeposit} kisPosEvalUsd={kisPosEvalUsd} />
          <TradesTab accountId={account.id} />
        </div>
        <StrategyList accountId={account.id} strategies={strategies} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `app/(main)/accounts/[id]/page.tsx` 수정**

margin API 호출 제거, portfolioRaw summary에서 직접 추출:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
import { AccountDetailTabs } from '@widgets/account-detail'
import { PageHeader } from '@widgets/page-header'
import { cn, toNum } from '@shared/lib/utils'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAccounts } from '@entities/account'
import { getAccountPortfolio } from '@entities/trade'
import { listStrategies } from '@entities/strategy'
import type { PortfolioSummary } from '@entities/trade'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '계좌 상세 | KISTA',
  description: '계좌 포트폴리오 및 거래 내역',
}

export default async function AccountDetailPage({ params }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const [accounts, portfolioRaw, strategies] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    getAccountPortfolio(id, token).catch((): PortfolioSummary | null => null),
    listStrategies(id, token).catch((e): Strategy[] => {
      console.error('[AccountDetailPage] listStrategies 실패:', e)
      return []
    }),
  ])

  const kisUsdDeposit = toNum(portfolioRaw?.summary?.usdDeposit)
  const kisPosEvalUsd = toNum(portfolioRaw?.summary?.posEvalUsd)

  const account = accounts.find((a) => a.id === id)
  if (!account) {
    return notFound()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="계좌 관리"
        title={account.nickname}
        actions={
          <Link href={`/accounts/${id}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
            <Pencil className="size-4" />
          </Link>
        }
      />

      <AccountDetailTabs
        account={account}
        strategies={strategies}
        kisUsdDeposit={kisUsdDeposit}
        kisPosEvalUsd={kisPosEvalUsd}
      />
    </div>
  )
}
```

- [ ] **Step 4: 타입 검사**

```bash
cd /mnt/c/Users/USER/workspace/kista/kista-ui && npm run typecheck 2>&1 | head -40
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
cd /mnt/c/Users/USER/workspace/kista/kista-ui && git add "app/(main)/accounts/[id]/page.tsx" widgets/account-detail/AccountSummaryCard.tsx widgets/account-detail/AccountDetailTabs.tsx && git commit -m "$(cat <<'EOF'
feat(account-detail): 계좌 요약 카드 개편 — 실계좌기준 예수금·평가금 표시

평가손익 제거(주관적/계산 부정확), KIS 실계좌 기준 예수금·평가금 추가.
margin API 호출 제거로 페이지 초기 로딩 병렬 호출 1개 감소.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- [x] 대시보드 총자산 제거 → DashboardKpiSection 전체 제거
- [x] 대시보드 예수금 제거 → DashboardKpiSection 전체 제거
- [x] 대시보드 평가금 제거 → DashboardKpiSection 전체 제거
- [x] 계좌 상세 평가손익 제거 → AccountSummaryCard에서 삭제
- [x] 계좌 상세 예수금(실계좌기준) 추가 → `portfolioRaw.summary.usdDeposit`
- [x] 계좌 상세 평가금(실계좌기준) 추가 → `portfolioRaw.summary.posEvalUsd`
- [x] kista-api 연계 여부 확인 → 불필요, 데이터 이미 존재

**Placeholder scan:** 없음, 모든 코드 블록 완성됨

**Type consistency:**
- `kisUsdDeposit`·`kisPosEvalUsd` — page → AccountDetailTabs → AccountSummaryCard 일관적으로 사용
- `toNum()` — `@shared/lib/utils`에서 import, BigDecimal 문자열 → number 변환 처리됨
