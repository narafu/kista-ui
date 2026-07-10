# Weekly Market Calendar — 설계 문서

**날짜:** 2026-06-22  
**범위:** 대시보드 월 달력 → 주 달력 교체

---

## 목적

대시보드의 `MarketHolidayCalendar`(월 기준)를 `WeeklyMarketCalendar`(주 기준)로 교체한다.  
기존 휴장일 표시 기능을 유지하면서, 이번 주 각 날짜에 전체 계좌 합산 거래 요약(체결 수, 순거래 금액)을 함께 표시한다.

---

## UI 레이아웃

```
[ 미국 휴장일 · 주간 거래 ]          ‹  2026년 6월 4주  ›

일   월   화   수   목   금   토
──  ──  ──  ──  ──  ──  ──
15  16  17  18  19  20  21      ← 이전 주 (날짜만, 희미)

22  23  24  25  26  27  28      ← 이번 주 (거래 정보 포함)
휴  +$18 -$6 대기중 휴장  —   휴
    3체결 2체결 오늘

29  30   1   2   3   4   5       ← 다음 주 (날짜만, 희미)

● 미국 휴장  □ 수익  □ 손실
```

### 셀별 표시 규칙

| 날짜 조건 | 날짜 색상 | 뱃지 | 하위 텍스트 |
|---|---|---|---|
| 오늘 | rose-700, rose-50 배경 | `대기중` (orange) | `오늘` |
| 미국 휴장일 | red, red-50 배경 | `휴장` (red) | — |
| 일/토 | 일=green, 토=red | `휴` (muted) | — |
| 평일 + 체결 있음 | default | `+$N` / `-$N` (pos/neg) | `N체결` |
| 평일 + 체결 없음 | default | `—` (muted) | — |
| 미래 날짜 | default | `—` (muted) | — |
| 이전/다음 주 | 희미(muted) | 없음 | — |

---

## 컴포넌트 구조

### 신규 파일

```
widgets/market-holiday-calendar/
  WeeklyMarketCalendar.tsx        # 주 달력 Client Component (기존 슬라이스에 추가)

entities/trade/hooks/
  useWeeklyTradeSummaryQuery.ts   # 계좌별 병렬 조회 → 날짜별 집계 훅
```

### 수정 파일

```
widgets/market-holiday-calendar/index.ts   # WeeklyMarketCalendar re-export 추가
widgets/dashboard/DashboardOverview.tsx    # MarketHolidayCalendar → WeeklyMarketCalendar
widgets/dashboard/DashboardEmpty.tsx       # 동일
app/(main)/dashboard/page.tsx              # accounts prop 추가 전달
entities/trade/index.ts                    # useWeeklyTradeSummaryQuery re-export 추가
```

---

## 데이터 흐름

### SSR (기존 유지)
`DashboardPage` → `getMonthlyHolidays(year, month, token)` → `holidays: string[]` prop으로 전달  
주 달력은 이 holidays에서 현재 주 날짜를 필터링해 휴장 여부를 판단한다.

### 거래 요약 (Client, React Query)
`useWeeklyTradeSummaryQuery(accountIds, weekStart)`:
- `weekStart`(이번 주 일요일)를 기준으로 from=일요일, to=토요일 설정
- 각 계좌에 대해 `getDailyTransactions(accountId, {from, to})` 병렬 호출 (`Promise.allSettled`)
- 날짜별로 `items`를 집계:
  - `tradeCount`: 해당 날짜 체결 건수
  - `netAmountUsd`: SELL `tradeAmountUsd` 합산 − BUY `tradeAmountUsd` 합산
- 반환 타입: `Map<string, { tradeCount: number; netAmountUsd: number }>`
- queryKey: `['weeklyTrades', accountIds.join(','), weekStart]`
- staleTime: 5분

> **손익 표시 근사치 주의:** `tradeAmountUsd`는 체결 금액이지 실현 손익이 아니다.  
> SELL−BUY 순거래 금액을 표시하며, 실현 손익과 다를 수 있다.  
> 추후 실현 손익 API가 추가되면 교체한다.

---

## Props 변경

### DashboardPage
```ts
// 추가
<DashboardOverview
  holidays={holidays}
  calendarYear={calendarYear}
  calendarMonth={calendarMonth}
  accounts={accounts}   // ← 추가 (기존에 이미 보유)
/>
```

### WeeklyMarketCalendar
```ts
interface Props {
  holidays: string[]       // SSR initialData
  year: number
  month: number
  accountIds: string[]     // 거래 조회용
}
```

---

## 주 네비게이션

- 이전/다음 주 버튼으로 `displayWeekStart`(useState) 이동
- 이동 시 `useWeeklyTradeSummaryQuery` 재조회 (React Query 자동)
- 이전/다음 달에 걸친 주도 정상 표시 (1일, 31일 등)
- 달 경계에서 휴장일이 없는 경우 `useMonthlyHolidaysQuery`로 해당 달 추가 조회

---

## 범위 외 (이번 구현 제외)

- 전략별 달력 뷰
- 날짜 클릭 시 상세 거래 내역 드릴다운
- 실현 손익 기반 정확한 PnL 표시
