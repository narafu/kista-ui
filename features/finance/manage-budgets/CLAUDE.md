# features/finance/manage-budgets

@../../../docs/agents/finance-group-share.md

- **`finance/manage-budgets`**: 예산 CRUD. Dialog가 아니라 인터셉팅 라우트다 — 목록 `/finance/budgets/[type]`(진입: `FinanceHeader` "예산 관리" 링크), 추가 `/new`(`?duplicateFrom=` 복제, `?categoryId=` 카테고리 프리필 — `FinanceBudgetProgress` "예산 미설정 → 예산 추가" 링크가 이걸로 폼 직행), 수정 `/[id]/edit`. 일반 페이지와 `@modal` 버전이 `app/(main)/finance/budgets/[type]/**/XxxBody.tsx`를 공유하고, Body가 카테고리·예산 목록을 서버에서 조회해 하이드레이션하며 수정·복제 원본을 prop으로 넘긴다(예산 단건 GET 없음 — 목록에서 찾음, 다른 type 예산 id면 404). `BudgetForm`은 `dismiss`(`push`→목록 이동 / `back`→`router.back()`)로 종료를 분기하고 제목은 Body의 `PageHeader`가 맡는다. `BudgetManager`는 `type: FlowType` prop을 받고 필터·페이지를 URL에 보존한다(`docs/agents/app.md` 인터셉팅 라우트 항목). 예산은 EXPENSE·SAVING뿐 아니라 INCOME 카테고리에도 걸 수 있다(ASSET만 kista-api가 400). 카테고리 기간 중첩(`finance_budgets_no_overlap`) 위반은 409로 오고 `useCreateFinanceBudgetMutation`/`useUpdateFinanceBudgetMutation`이 서버 메시지를 그대로 toast로 노출한다(별도 문구 분기 불필요)
