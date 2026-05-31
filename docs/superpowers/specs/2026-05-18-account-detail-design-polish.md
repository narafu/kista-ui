# 계좌 상세화면 디자인 정밀화

**날짜:** 2026-05-18
**범위:** kista-ui 프론트엔드 전용 (kista-api 변경 없음)
**수정 파일:** 3개

---

## 목표

`screens.jsx` Claude Design과 현재 구현 사이의 시각적 차이를 해소한다.
로직·API 계층은 건드리지 않고 마크업·스타일만 변경한다.

---

## 수정 1: `components/common/ProfitStatsCard.tsx`

### 기간 피커 스타일 변경
- Before: shadcn `Button` (variant default/outline)
- After: bg-muted 컨테이너 + white active pill (탭형)

```tsx
<div className="flex gap-0.5 rounded-lg bg-muted p-1">
  {([7, 30, 90] as Period[]).map(p => (
    <button key={p} onClick={() => setPeriod(p)}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
        period === p
          ? 'bg-background text-rose-600 shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}>{p}일</button>
  ))}
</div>
```

### 서브타이틀 추가
CardTitle 아래에 `<p className="text-xs text-muted-foreground mt-0.5">최근 {period}일 포트폴리오 추이</p>` 추가

### KPI 3열로 확장
- Before: `grid-cols-2` — 기간 손익 / 수익률
- After: `grid-cols-3` — 기간 손익 / 수익률 / 실현·평가
- 실현(realized): `profit.totalRealizedProfit ?? 0`
- 평가(unrealized): 기존 `snapshots` 배열 최신값에서 `(latestSnapshot?.marketValueUsd ?? 0) - (latestSnapshot?.avgPrice ?? 0) * (latestSnapshot?.qty ?? 0)` 계산. snapshots 빈 배열이면 0 표시
- 표시 형식: `$642 / $986` — 실현은 pos/neg 색상, 평가는 pos/neg 색상

---

## 수정 2: `components/common/AccountDetailTabs.tsx`

### SummaryTab

| 항목 | Before | After |
|---|---|---|
| CardTitle 텍스트 | `account.nickname` | `"계좌 요약"` |
| StrategyBadge 위치 | CardHeader 하위 별도 줄 | CardTitle 우측 인라인 (`flex justify-between`) |
| 행 구분선 | 없음 | 마지막 행 제외 각 행 `border-b border-border pb-2.5` |
| 종목 행 | 없음 | `account.ticker` (계좌번호 아래) |
| 평가금액 행 | 없음 | `$portfolio.marketValueUsd.toFixed(2)` (현재가 아래) |
| 계좌 삭제 버튼 | `variant="outline"` | `variant="ghost" className="... text-destructive hover:text-destructive"` |

행 순서 (최종):
1. 계좌번호
2. 종목 ← 신규
3. 보유 수량
4. 평단가
5. 현재가
6. 평가금액 ← 신규
7. 평가손익

### TradesTab

**카드 헤더 추가:**
```tsx
<div className="px-5 py-4 flex items-start justify-between border-b">
  <div>
    <p className="text-[13.5px] font-semibold">거래 내역</p>
    <p className="text-xs text-muted-foreground mt-0.5">최근 30일 · 총 {trades.length}건</p>
  </div>
  {/* 필터 버튼 */}
</div>
```

**필터 버튼:**
- 상태: `useState<'ALL' | 'BUY' | 'SELL'>('ALL')`
- active 스타일: `bg-rose-50 text-rose-600 border border-rose-100`
- inactive 스타일: `text-muted-foreground border border-transparent`

**테이블 컬럼:** 전략 컬럼 제외 (구분, 종목, 수량, 단가, 금액, 체결일 유지)

**Card 래퍼:** TradesTab 전체를 `<div className="rounded-xl border overflow-hidden">` 으로 감싸기

---

## 수정 3: `components/common/MarginCard.tsx`

### 박스 스타일
- Before: `className="rounded-md border p-3 space-y-2"`
- After: `className="rounded-lg border p-3.5 bg-muted mb-3 last:mb-0"`

### 통화 레이블
- Before: `<p className="text-sm font-semibold">{item.currency}</p>`
- After: `<span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 tracking-wide">{item.currency}</span>`

---

## 제약사항

- **전략 컬럼 없음**: `Execution` 타입에 `strategy` 필드 없음 → 제외 결정
- **kista-api 변경 없음**: 모든 데이터는 기존 API 응답 범위 내에서 처리
- **인라인 style 금지**: CLAUDE.md quirk — display/gridTemplateColumns 인라인 style 절대 금지, 반드시 className 또는 globals.css @media 사용

---

## 완료 기준

- `npm run typecheck` → 0 errors
- `npm run build` → 성공
- 계좌 상세화면에서 4개 수정 사항 시각적으로 확인
