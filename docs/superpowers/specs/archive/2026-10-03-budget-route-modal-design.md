# 예산 관리 중첩 모달 → 인터셉팅 라우트 전환 설계

- 날짜: 2026-10-03
- 범위: kista-ui 단독 (kista-api 변경 없음)
- 선행 커밋: 3e6daae7, a819de32, 21a76c26 (예산 관리 모달 UI/UX 점검)

## 배경

가계부 수입/소비/저축 탭의 "예산 관리"는 `BudgetManagerDialog`(목록 Dialog) 위에 `BudgetFormDialog`(추가/수정/복제 Dialog)가 다시 뜨는 중첩 모달 구조다. 모바일에서 답답하고, 앱의 다른 등록·수정 폼(자산 `/finance/new`, 전략 `/accounts/[id]/strategies/new`)은 이미 인터셉팅 라우트(`RouteModal` + `@modal`) 패턴으로 통일돼 있다.

## 목표 / 성공 기준

- PC(`sm:` 이상)에서는 항상 모달 하나만, 모바일에서는 풀페이지 하나만 보인다 (목록 ↔ 폼은 교체, 중첩 아님).
- 자산·전략 폼과 동일한 라우트 패턴(페이지 + `@modal/(.)` 쌍, 공유 서버 Body, `dismiss` 분기).
- 목록 → 폼 → 목록 왕복 시 목록의 필터(카테고리·상태)·페이지·페이지 크기가 유지된다.
- 새로고침/직접 진입 시에도 수정·복제 폼이 올바른 값으로 채워진다.
- 진입점 2곳 유지: `FinanceHeader` "예산 관리", `FinanceBudgetProgress` "예산 미설정 → 예산 등록"(카테고리 프리필로 폼 직행).

## 비목표

- 그룹 공유 배지 (별도 후속 작업, 이 작업 커밋 후 진행).
- 예산 단건 조회 API 추가 (kista-api 변경 없음).

## 1. 라우트

type 슬러그는 탭 href와 동일한 `income | expense | saving` (→ `INCOME | EXPENSE | SAVING`). 예산 응답(`FinanceBudget`)에 type 필드가 없어 경로에 type이 필요하다.

| 경로 | 용도 |
|---|---|
| `/finance/budgets/[type]` | 예산 목록 |
| `/finance/budgets/[type]/new` | 추가. `?duplicateFrom=<budgetId>` 복제, `?categoryId=<id>` 카테고리 프리필 |
| `/finance/budgets/[type]/[id]/edit` | 수정 |

파일 배치 (기존 `NewAssetFormBody` 패턴):

```
app/(main)/finance/budgets/[type]/
  page.tsx, BudgetListBody.tsx
  new/page.tsx, NewBudgetFormBody.tsx
  [id]/edit/page.tsx, EditBudgetFormBody.tsx
app/(main)/@modal/(.)finance/budgets/[type]/
  page.tsx, new/page.tsx, [id]/edit/page.tsx  (+ 기존 패턴대로 loading.tsx)
```

- 일반 `page.tsx`는 `<div className="max-w-lg mx-auto">`로, `@modal` 버전은 `<RouteModal>`로 같은 Body를 감싼다. `dismiss`만 다르다(`push` / `back`).
- `budgets`는 정적 세그먼트라 기존 `finance/[id]/edit`보다 우선 매칭된다 — 구현 시 dev 서버에서 실측 확인.
- `[...catchAll]`이 `null`을 반환하므로 모달 안에서 이동하는 모든 경로(목록·추가·수정)에 `(.)` 인터셉트 페이지가 있어야 한다.

### 서버 Body 책임

- `[type]` 슬러그가 유효하지 않으면 `notFound()`. 토큰 없으면 `notFound()` (기존 패턴).
- 목록 Body: 해당 type 카테고리 트리 + 예산 목록을 `prefetchQuery` 후 `HydrationBoundary`로 주입, `PageHeader`(h1: `{수입|소비|저축} 예산 관리`) + `BudgetManager`.
- 폼 Body: 카테고리 트리·예산 목록을 서버에서 조회. 예산 단건 API가 없어 목록에서 id로 찾는다.
  - 수정: 대상이 없거나 카테고리가 해당 type 트리에 없으면 `notFound()`.
  - 복제: 대상이 없으면 빈 추가 폼으로 그레이스풀 폴백 (자산 복제와 동일).
  - `categoryId`: 해당 type 트리에 없으면 무시.
  - 찾은 값은 폼에 prop(`initial` / `duplicateFrom` / `defaultCategoryId`)으로 직접 넘긴다 — 폼의 `useState` 초기값이 첫 렌더에 확정돼 새로고침에도 빈 값으로 고정되지 않는다.
  - `PageHeader` h1: `예산 추가` / `예산 수정` / `예산 복제`, 설명은 기존 다이얼로그 문구 유지(복제는 기간 겹침 안내).

### 종료 흐름

- 모달(`dismiss='back'`): 저장·취소 모두 `router.back()`. 목록 모달에서 왔으면 목록 모달로, `FinanceBudgetProgress`에서 왔으면 대시보드로 돌아간다.
- 직접 진입(`dismiss='push'`): 폼 저장·취소 → `/finance/budgets/[type]`. 목록 페이지는 `PageHeader` eyebrow 링크로 `/finance/{type}` 복귀.

## 2. 컴포넌트 (`features/finance/manage-budgets`)

- `BudgetFormDialog` → `BudgetForm`: Dialog 래퍼 제거, `dismiss?: DismissMode` prop 추가, 제목·설명은 Body의 `PageHeader`로 이동. 폼 필드·검증·제출(`submitFormDialog`) 로직은 그대로.
- `BudgetManager`:
  - `formTarget` state와 내부 `BudgetFormDialog` 렌더 제거. 추가 버튼·수정·복제 액션은 해당 라우트로 이동(`Link` 또는 `router.push`).
  - 필터 4종을 URL searchParams에서 파생: `category`(선택 경로의 마지막 categoryId, 경로는 트리로 복원), `status`(`ALL|UPCOMING|ACTIVE|ENDED`, 기본 `ACTIVE`는 생략), `page`, `size`.
  - 쓰기는 `window.history.replaceState`(히스토리 누적 없음, 서버 왕복 없음, `useSearchParams`와 동기화) — 인터셉트 라우트를 재평가하지 않아 모달이 풀릴 위험이 없다.
  - 잘못된 값은 기본값 폴백. 페이지는 `1..totalPages`로 클램프. 필터 변경 시 page를 1로 리셋(현행 동작 유지).
  - 삭제 확인 `ConfirmDeleteDialog`는 목록 위 확인창으로 유지.
  - `type` prop 유지.
- `BudgetManagerDialog` 삭제. `FinanceHeader`는 동일 스타일(`brand-soft`, `Plus` 아이콘, "예산 관리")의 `Link`로 교체.
- `widgets/finance-budget-progress/FinanceBudgetProgress.tsx`: `BudgetFormDialog`·`quickCreateCategoryId` state 제거, "예산 등록"을 `Link href="/finance/budgets/{type}/new?categoryId=..."`로 교체.
- type ↔ 슬러그 매핑은 한 곳에 둔다(`entities/finance` lib), `FinanceHeader`의 `FLOW_TYPE_BY_HREF`와 중복되지 않게 재사용.

## 3. 접근성·quirk

- `RouteModal`은 자식의 첫 `h1`로 `aria-labelledby`를 연결 — 목록·폼 Body 모두 `PageHeader` 필수.
- ESC: `RouteModal`은 document keydown으로 ESC 시 `router.back()`. 목록 안 `ConfirmDeleteDialog`나 Select 팝업이 열린 상태의 ESC가 라우트 모달까지 닫는지 실측하고, 닫힌다면 `RouteModal` 핸들러에 가드(이미 처리된 이벤트·열린 하위 팝업이면 무시)를 추가한다.

## 4. 테스트·검증

- 단위:
  - `BudgetManager.test` — URL 파생 상태(초기 파싱·폴백·클램프·replaceState 기록), 추가/수정/복제 링크 href.
  - `BudgetForm` 테스트 — 기존 폼 테스트 이관 + `dismiss` 분기.
  - `FinanceHeader.test` mock 갱신, `FinanceBudgetProgress.test` 링크 href 검증.
  - `BudgetManagerDialog.test` 삭제.
- 실측(로컬 kista-api가 떠 있을 때만, 뮤테이션 금지):
  - PC: 목록 모달 → 필터 변경 → 수정 진입 → 취소 → 필터·페이지 유지, 모달 1개.
  - 모바일 폭: 풀페이지 렌더.
  - ESC 동작 (위 3절).
  - 새로고침/직접 진입(목록·수정·복제).
- `npm run typecheck`, `npm run lint`, 관련 테스트 → 최종 전체 테스트 1회.

## 5. 문서

- `docs/agents/app.md` 인터셉팅 라우트 항목: "목록 자체가 라우트 모달이면 목록 상태를 URL(`history.replaceState`)에 둬 폼 왕복 시 보존" 사례 추가.
- `docs/agents/features.md` `manage-budgets` 항목 갱신.
- `widgets/asset-settings/AssetSettingsPanel.tsx` 등 `BudgetManagerDialog`를 언급하는 주석 갱신.
