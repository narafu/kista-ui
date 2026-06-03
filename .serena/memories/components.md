# 컴포넌트 패턴 · shadcn · 스타일링

## shadcn v4 패턴
- `asChild` prop 없음 → `cn(buttonVariants({ variant, size }))` 클래스 직접 적용
- `AlertDialog`: `open`/`onOpenChange` state 직접 관리 필수 (AlertDialogAction 자동 close 안됨)
- `AlertDialogTrigger`에 `disabled` 없음 → `className`으로 `opacity-40 pointer-events-none`
- disabled 버튼 툴팁: wrapper `div`에 `group` + `opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`
- `vaul Drawer`: `direction="bottom"`, 내부 폼 스크롤은 `overflow-y-auto` 래퍼 필요

## 공통 컴포넌트 사용 규칙
- `KpiCard`: KPI 표시. `variant="accent"` + 손익은 `variant="default"`
- `StrategyBadge`: 전략 표시. 인라인 span + rose 스타일 직접 작성 금지
- `RevealableValue`: 마스킹 표시 (`****0614`). `KpiCard value={<RevealableValue ... />}` 패턴
- `ProfitDisplay`: KIS portfolio summary는 `currency="KRW"` 필수 (필드명에 Usd 있어도 KRW)

## CSS 토큰 (globals.css 정의)
- `--warn`/`--warn-bg` → `.text-warn`, `.bg-warn-bg`
- `--status-error`/`--status-error-bg`/`--status-error-border` — `.rejected-reason-card` 유틸
- `--pos`/`--neg` — 손익 색상 (`style={{ color: v >= 0 ? 'var(--pos)' : 'var(--neg)' }}`)
- `--rose-50~900` 팔레트 — 배지: `style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}`
- 커스텀 반응형 그리드: `sm:kpi-grid`, `sm:portfolio-grid`, `md:profit-grid`, `lg:form-grid`, `lg:settings-grid`

## 계좌 상세 구조 (AccountDetailTabs)
- 데스크탑 3행: 1행=계좌요약+TradesTab, 2행=StrategyList+StrategyTradesTab, 3행=NextOrderPreviewCard
- 모바일: 요약/계좌거래/전략/다음주문 탭 4개
- `TradesTab`·`StrategyTradesTab`은 내부 로컬 함수 (export 없음)

## Dashboard
- `AccountCard`: `strategies={strategiesByAccount[i]}` 전달 필수 (미전달 시 "전략 미등록" 표시)
- 계좌번호 Input: 8자리 + `-` + 2자리 분할 UI
- `AccountRequest` 필드명: `kisAppKey`(≠apiKey), `kisSecretKey`(≠apiSecret), `accountNo`(8자리만), `kisAccountType`("01")

## Toaster
- `<Toaster richColors position="top-right" />` 루트 `app/layout.tsx`에 단 하나만 (중복 시 toast 2개 표시)
