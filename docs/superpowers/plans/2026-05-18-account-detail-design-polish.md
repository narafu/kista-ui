# 계좌 상세화면 디자인 정밀화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** screens.jsx Claude Design과 현재 구현의 시각적 차이를 3개 파일 수정으로 해소한다.

**Architecture:** kista-api 변경 없음. 기존 API 응답 데이터 범위 안에서 마크업·스타일만 변경. 인라인 `style={{ display/gridTemplateColumns }}` 절대 금지 — Tailwind 반응형 클래스 무효화(CLAUDE.md quirk).

**Tech Stack:** Next.js 16, Tailwind v4, shadcn v4 (@base-ui/react, asChild 없음), TypeScript

---

## 파일 구조 맵

| 파일 | 변경 내용 |
|---|---|
| `components/common/ProfitStatsCard.tsx` | 기간 피커 탭형 + 서브타이틀 + 3번째 KPI |
| `components/common/AccountDetailTabs.tsx` | SummaryTab 항목 보강 + TradesTab 카드 헤더/필터 |
| `components/common/MarginCard.tsx` | 박스 bg-muted + rose 통화 배지 |

---

## Task 1: ProfitStatsCard — 피리어드 탭·서브타이틀·실현/평가 KPI

**Files:**
- Modify: `components/common/ProfitStatsCard.tsx`

- [ ] **Step 1: 현재 파일 읽기**

```bash
cat components/common/ProfitStatsCard.tsx
```

- [ ] **Step 2: Button import 제거 + 전체 파일 교체**

`Button` 컴포넌트 사용 제거, 탭형 피리어드 피커로 변경.

`components/common/ProfitStatsCard.tsx` 전체를 아래로 교체:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PortfolioChart } from './PortfolioChart'
import { getAccountProfit, getPortfolioSnapshots } from '@/lib/api/trades'
import type { ProfitSummary, PortfolioSnapshot } from '@/types/trade'

type Period = 7 | 30 | 90

interface Props {
  accountId: string
}

function getDateRange(days: Period): { from: string; to: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  }
}

export function ProfitStatsCard({ accountId }: Props) {
  const [period, setPeriod] = useState<Period>(30)
  const [profit, setProfit] = useState<ProfitSummary | null>(null)
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const dateRange = getDateRange(period)
        const [profitData, snapshotData] = await Promise.all([
          getAccountProfit(accountId, dateRange).catch(() => null),
          getPortfolioSnapshots({ startDate: dateRange.from, endDate: dateRange.to }).catch((): PortfolioSnapshot[] => []),
        ])

        if (!cancelled) {
          setProfit(profitData)
          setSnapshots(snapshotData)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accountId, period])

  return (
    <Card className="min-h-[240px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">수익/손실 통계</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">최근 {period}일 포트폴리오 추이</p>
          </div>
          <div className="flex gap-0.5 rounded-lg bg-muted p-1">
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  period === p
                    ? 'bg-background text-rose-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}일
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
            로딩 중...
          </div>
        ) : (
          <>
            {profit && (() => {
              const totalPL = profit.totalProfitLoss ?? profit.totalRealizedProfit ?? 0
              const totalRate = profit.totalProfitLossRate ?? profit.totalReturnRate ?? 0
              const latestSnapshot = snapshots[snapshots.length - 1]
              const realized = profit.totalRealizedProfit ?? profit.totalProfitLoss ?? 0
              const unrealized = latestSnapshot
                ? (latestSnapshot.marketValueUsd ?? 0) - (latestSnapshot.avgPrice ?? 0) * (latestSnapshot.qty ?? 0)
                : 0
              return (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">기간 손익</p>
                    <p className={`text-lg font-bold ${totalPL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">수익률</p>
                    <p className={`text-lg font-bold ${totalRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalRate >= 0 ? '+' : ''}{totalRate.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">실현 / 평가</p>
                    <p className="text-base font-bold leading-tight mt-0.5">
                      <span className={realized >= 0 ? 'text-green-600' : 'text-red-500'}>
                        ${realized.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground font-normal text-sm"> / </span>
                      <span className={unrealized >= 0 ? 'text-green-600' : 'text-red-500'}>
                        ${unrealized.toFixed(0)}
                      </span>
                    </p>
                  </div>
                </div>
              )
            })()}
            <PortfolioChart snapshots={snapshots} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/ProfitStatsCard.tsx
git commit -m "feat: ProfitStatsCard — tab period picker, subtitle, 3-col KPI with realized/unrealized"
```

---

## Task 2: AccountDetailTabs — SummaryTab 보강

**Files:**
- Modify: `components/common/AccountDetailTabs.tsx`

- [ ] **Step 1: SummaryTab의 return 블록 교체**

`AccountDetailTabs.tsx` 안의 `function SummaryTab` 전체 return 블록을 아래로 교체.  
`handleStrategyToggle`, `handleDelete` 함수는 그대로 유지.

```tsx
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">계좌 요약</CardTitle>
            <div className="flex items-center gap-2">
              <StatusDot status={account.strategyStatus} />
              <StrategyBadge strategy={account.strategyType} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-0 px-6">
          {([
            ['계좌번호', <span key="acct" className="font-medium text-sm">{account.accountNoMasked}</span>],
            ['종목',     <span key="ticker" className="font-bold text-sm">{account.ticker}</span>],
            ['보유 수량', <span key="qty" className="font-medium text-sm">{portfolio.qty}주</span>],
            ['평균 단가', <span key="avg" className="font-medium text-sm">${(portfolio.avgPrice ?? 0).toFixed(2)}</span>],
            ['현재가',   <span key="cur" className="font-medium text-sm">${(portfolio.currentPrice ?? 0).toFixed(2)}</span>],
            ['평가금액', <span key="mval" className="font-medium text-sm">${(portfolio.marketValueUsd ?? 0).toFixed(2)}</span>],
            ['평가 손익', <ProfitDisplay key="pl" amount={0} rate={0} />],
          ] as [string, ReactNode][]).map(([label, value], i, arr) => (
            <div
              key={label}
              className={`flex justify-between items-center text-sm py-2.5 ${
                i < arr.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-muted-foreground">{label}</span>
              {value}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10"
          onClick={handleStrategyToggle}
          disabled={isStrategyLoading}
        >
          {isStrategyLoading
            ? '처리 중...'
            : account.strategyStatus === 'ACTIVE' ? '전략 중지' : '전략 재개'}
        </Button>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-10 px-4 text-destructive hover:text-destructive')}>
            계좌 삭제
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>계좌 삭제</DialogTitle>
              <DialogDescription>
                {account.nickname} 계좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading}>
                {isDeleteLoading ? '삭제 중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
```

- [ ] **Step 2: `ReactNode` import 확인**

`AccountDetailTabs.tsx` 상단 react import를 아래로 수정 (`ReactNode` 추가):

```tsx
import { useState, type ReactNode } from 'react'
```

- [ ] **Step 3: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/AccountDetailTabs.tsx
git commit -m "feat: SummaryTab — 계좌 요약 타이틀, 종목/평가금액 행, border-b 구분선, ghost 삭제 버튼"
```

---

## Task 3: AccountDetailTabs — TradesTab 카드 헤더 + 필터

**Files:**
- Modify: `components/common/AccountDetailTabs.tsx`

- [ ] **Step 1: TradesTab 함수 전체 교체**

`function TradesTab` 전체를 아래로 교체:

```tsx
function TradesTab({ trades }: { trades: Execution[] }) {
  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')
  const filtered = filter === 'ALL' ? trades : trades.filter(t => t.direction === filter)

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 flex items-start justify-between border-b bg-background">
        <div>
          <p className="text-[13.5px] font-semibold">거래 내역</p>
          <p className="text-xs text-muted-foreground mt-0.5">최근 30일 · 총 {trades.length}건</p>
        </div>
        <div className="flex gap-1.5">
          {(['ALL', 'BUY', 'SELL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                filter === f
                  ? 'bg-rose-50 text-rose-600 border-rose-100'
                  : 'text-muted-foreground border-transparent hover:border-border'
              }`}
            >
              {f === 'ALL' ? '전체' : f === 'BUY' ? '매수' : '매도'}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">거래 내역이 없습니다.</p>
      ) : (
        <>
          {/* 모바일: 카드 리스트 */}
          <div className="space-y-2 p-4 lg:hidden">
            {filtered.map((trade) => (
              <Card key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.symbol}`} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'}>
                      {trade.direction === 'BUY' ? '매수' : '매도'}
                    </Badge>
                    <span className="font-medium text-sm">{trade.symbol}</span>
                  </div>
                  <span className="text-sm font-semibold">${(trade.amountUsd ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{trade.qty}주 × ${(trade.price ?? 0).toFixed(2)}</span>
                  <span>{new Date(trade.tradeDate).toLocaleDateString('ko-KR')}</span>
                </div>
              </Card>
            ))}
          </div>
          {/* 데스크탑: 테이블 */}
          <div className="hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['구분', '종목', '수량', '단가', '금액', '체결일'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <tr key={`${trade.kisOrderId ?? ''}-${trade.tradeDate}-${trade.symbol}`} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                        {trade.direction === 'BUY' ? '매수' : '매도'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                    <td className="px-4 py-3">{trade.qty}주</td>
                    <td className="px-4 py-3">${(trade.price ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium">${(trade.amountUsd ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(trade.tradeDate).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/AccountDetailTabs.tsx
git commit -m "feat: TradesTab — 카드 헤더(거래내역+건수), 전체/매수/매도 필터 버튼"
```

---

## Task 4: MarginCard — bg-muted 박스 + rose 통화 배지

**Files:**
- Modify: `components/common/MarginCard.tsx`

- [ ] **Step 1: items 렌더링 블록 교체**

`MarginCard.tsx`의 아래 블록:

```tsx
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.currency} className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-semibold">{item.currency}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">주문가능금액</p>
                    <p className="font-medium">{item.integratedOrderableAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">외화잔고</p>
                    <p className="font-medium">{item.foreignBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
```

아래로 교체:

```tsx
          <div>
            {items.map((item) => (
              <div key={item.currency} className="rounded-lg border p-3.5 bg-muted mb-3 last:mb-0">
                <div className="mb-2.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 tracking-wide">
                    {item.currency}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">주문가능금액</p>
                    <p className="font-medium">{item.integratedOrderableAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">외화잔고</p>
                    <p className="font-medium">{item.foreignBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add components/common/MarginCard.tsx
git commit -m "feat: MarginCard — bg-muted 박스, rose 통화 배지"
```

---

## Task 5: 최종 빌드 검증

- [ ] **Step 1: 전체 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors

- [ ] **Step 2: 프로덕션 빌드**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: 개발 서버 실행 후 스크린샷**

```bash
# 개발 서버 백그라운드 실행
npm run dev > /tmp/kista_dev.log 2>&1 &
sleep 5
# 실제 포트 확인
grep "Local:" /tmp/kista_dev.log
```

포트 확인 후 계좌 상세화면 스크린샷:

```bash
npx playwright screenshot --browser chromium --full-page --viewport-size "1440,900" http://localhost:<PORT>/accounts/<id> /tmp/account-detail-after.png
```

Expected: 수익/손실 탭형 피커, 3열 KPI, 계좌 요약 타이틀, 거래내역 필터 버튼, 증거금 rose 배지 확인
