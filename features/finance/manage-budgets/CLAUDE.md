# features/finance/manage-budgets

@../../../docs/agents/finance-group-share.md

- **`finance/manage-budgets`**: 예산 CRUD. 목록은 일반 페이지 `/finance/budgets/[type]`(진입: `FinanceHeader` "예산 관리" 링크)이고, 추가·복제·수정은 그 목록 안의 `FormDialog`다(라우트 없음). `BudgetManager`가 "예산 추가" 버튼과 행의 `onEdit`/`onDuplicate`로 `FormTarget` 상태를 열고, 목록이 이미 클라이언트 캐시에 있어 행 데이터를 `BudgetForm`의 `initial`/`duplicateFrom`으로 바로 넘긴다(예산 단건 GET 없음). `FinanceBudgetProgress`의 "예산 미설정 → 예산 추가" 버튼도 같은 `FormDialog` + `BudgetForm defaultCategoryId`로 연다. `BudgetForm`은 제목·설명을 렌더하지 않고(호출부 `FormDialog`가 맡는다) 취소·제출 성공 때 `onDone`(= `FormDialog`의 `close`)만 부른다 — 닫기는 반드시 이 `close`로. `BudgetManager`는 `type: FlowType` prop을 받고 필터·페이지를 `history.replaceState`로 URL에 보존한다(새로고침·뒤로가기에도 유지). 예산은 EXPENSE·SAVING뿐 아니라 INCOME 카테고리에도 걸 수 있다(ASSET만 kista-api가 400). 카테고리 기간 중첩(`finance_budgets_no_overlap`) 위반은 409로 오고 `useCreateFinanceBudgetMutation`/`useUpdateFinanceBudgetMutation`이 서버 메시지를 그대로 toast로 노출한다(별도 문구 분기 불필요)
