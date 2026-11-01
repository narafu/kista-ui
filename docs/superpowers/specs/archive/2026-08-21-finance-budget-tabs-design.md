# 가계부 개편 설계 (2026-08-21)

## 배경

설정 화면에 있던 예산(소비/저축) 관리를 각 탭으로 이동, 탭 레이아웃/순서 조정, 내역 복제, 연간 날짜선택, 카테고리 정렬순서 하한 등을 개편한다. 그룹명 설정은 kista-api에 변경 API가 없어 이번 범위에서 제외(별도 백엔드 작업 필요, 요청사항은 세션 대화로 전달).

## 1. 예산 등록 위치 이동 (설정 → 탭)

- `widgets/asset-settings/AssetSettingsPanel`에서 `features/finance/manage-budgets/BudgetManager` 제거
- 수입/소비/저축탭: `FinanceDashboard.tsx`에서 `NewTransactionButton` 왼쪽에 "예산등록" 버튼 신설 → 기존 `BudgetFormDialog`(features/finance/manage-budgets)를 탭의 flowType에 맞는 카테고리 타입으로 열도록 재사용
- `FinanceDashboard.tsx`의 `BUDGET_TABS`(현재 `['expense', 'saving']`)에 `'income'` 추가 → 수입탭도 `FinanceBudgetProgress` 렌더. 서버(`FinanceBudgetService.verifyBudgetCommand`)는 ASSET만 차단하고 INCOME은 이미 허용하므로 백엔드 변경 불필요

## 2. 탭 순서

- `TAB_OPTIONS`(`FinanceDashboard.tsx:30-38`)에서 `investment`(자산) 항목을 배열 맨 앞으로 이동. 초기 활성 탭(`useState` 기본값)도 `investment` 유지

## 3. 탭 내부 구성 (수입/소비/저축 공통)

### 3.1 렌더 순서 변경
현재: 요약 → 최근6개월추이 → (소비/저축만) 예산대비 → 내역
변경: 요약 → 예산대비 → 최근6개월추이 → 내역

### 3.2 요약 — 전년대비
- `widgets/finance-summary/FinanceSummary.tsx`: 연간 모드(`mode === 'yearly'`)일 때 기존 "전월대비" 대신 "전년대비" 지표 표시
- 계산: 같은 연간 기간(1월~선택월) 전년 합계 대비 증감률. 기존 전월대비 계산 로직과 동일 패턴(퍼센트/증감액), 비교 대상만 전년 동기간 합계로 교체

### 3.3 연간 모드 날짜 선택
- `Period`(`entities/finance/lib/period.ts`)가 `mode: 'yearly'`일 때 `FinanceSummary`의 `<input type="month">`를 `<input type="number">`(연도, 예: 2020~현재연도 range) 로 교체
- `periodRange()`는 연간 모드에서 이미 연 단위로 환산하므로, year만 넘겨도 되도록 호출부 조정(월간 모드는 기존 `<input type="month">` 유지)

### 3.4 내역 복제
- `widgets/finance-record-list/FinanceRecordList.tsx`의 데스크톱 액션 셀(198-204행)·모바일 액션 영역(231-234행)에 "복제" 버튼 추가(수정/삭제 옆)
- 클릭 시 `TransactionFormDialog`를 새 등록 모드로 열되 금액/카테고리/메모 등 기존 거래값을 프리필, 날짜는 오늘로 초기화. 사용자가 확인 후 저장해야 실제 등록됨(자동 저장 아님)

## 4. 설정

### 4.1 그룹명 설정 — 이번 범위 제외
백엔드(kista-api)에 `FinanceGroup.name` 변경 API가 없어 스킵. 필요한 API 스펙은 대화로 별도 전달.

### 4.2 카테고리 정렬순서 하한
- `features/finance/manage-categories/CategoryFormDialog.tsx`(132-141행)와 `SystemCategoryFormDialog.tsx`(133-142행) 두 곳의 `sortOrder` `<Input type="number">`에 `min={1}` 추가
- 저장 시 `Number(sortOrder) || 0` 폴백도 최소값 1로 조정해 0/음수가 통과되지 않도록 함

## 영향 파일 요약

- `app/(main)/finance/FinanceDashboard.tsx` — TAB_OPTIONS 순서, BUDGET_TABS, 예산등록 버튼 배치, 섹션 순서
- `widgets/asset-settings/AssetSettingsPanel.tsx` — BudgetManager 제거
- `widgets/finance-summary/FinanceSummary.tsx` — 전년대비, 연도 입력
- `widgets/finance-record-list/FinanceRecordList.tsx` — 복제 버튼
- `features/finance/manage-categories/CategoryFormDialog.tsx`, `SystemCategoryFormDialog.tsx` — sortOrder min
- (신규 재사용) `features/finance/manage-budgets/BudgetFormDialog.tsx` — 탭에서 직접 오픈하도록 진입점 추가
