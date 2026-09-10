# 폼 다이얼로그 제출 오케스트레이션 통합 설계

배경: `docs/superpowers/specs/2026-09-10-ui-refactor-audit.md` 우선순위 중간 "폼 보일러플레이트" 항목. `features/finance/*FormDialog.tsx` 5개(Account/Budget/Category/SystemCategory/Transaction)가 mode(생성/수정)별 mutation 선택 + toast + onSuccess + shareToGroup 병합을 각자 복제하고 있다.

## 범위

- 대상: 위 5개 파일의 `handleSubmit` 마지막 블록(mutate 호출부)만.
- 비대상: 필드 `useState` 선언, `canSubmit` 검증 규칙. 감사에서 "필드/검증 훅"으로 제안됐지만 실제 조사 결과 다이얼로그마다 검증 규칙이 다 달라(계좌: name trim, 예산: category+startDate+amount, 거래내역: date window+월마감 체크, 카테고리: name trim) 공통화 대상이 아니다. 복제된 부분은 mutation 선택+toast+shareToGroup 병합 쪽이었다.

## 설계

`shared/lib/form/submitFormDialog.ts`에 순수 함수로 추가한다(React 훅 아님 — 내부 상태·훅 호출이 없어 훅으로 감쌀 이유가 없다). `SaveButton`/`ShareToGroupSwitch`와 동일하게 `shared/`에 두는 이유는 여러 `features/finance/*` 슬라이스가 동시에 재사용하기 때문 — 슬라이스 간 cross-import는 금지지만 `shared/`를 통한 공유는 기존 전례와 동일하다.

```ts
interface SubmitFormDialogOptions<TPayload extends object, TCreatePayload extends TPayload = TPayload> {
  mode: 'create' | 'edit'
  payload: TPayload
  createMutation: { mutate: (payload: TCreatePayload, opts: { onSuccess: () => void }) => void }
  updateMutation: { mutate: (payload: TPayload, opts: { onSuccess: () => void }) => void }
  createExtra?: Partial<TCreatePayload>   // 예: { shareToGroup }
  messages: { create: string; edit: string }
  onSuccess: () => void
}

export function submitFormDialog<TPayload extends object, TCreatePayload extends TPayload = TPayload>(
  opts: SubmitFormDialogOptions<TPayload, TCreatePayload>,
): void
```

동작: `mode === 'edit'`이면 `updateMutation.mutate(payload, { onSuccess: () => { toast.success(messages.edit); onSuccess() } })`. 아니면 `createMutation.mutate({ ...payload, ...createExtra } as TCreatePayload, { onSuccess: () => { toast.success(messages.create); onSuccess() } })`.

## 적용 대상 5개 파일

각 파일의 필드 상태·`canSubmit`·payload 조립부는 그대로 두고, 기존 `if (mode === 'edit') { updateMutation.mutate(...) return } createMutation.mutate(...)` 블록만 `submitFormDialog(...)` 호출 한 줄로 교체한다.

- `features/finance/manage-accounts/AccountFormDialog.tsx` — `createExtra: { shareToGroup: canShareToGroup && shareToGroup }`, `onSuccess`는 현재 `onOpenChange(false)`를 인라인 호출하므로 이를 `submitFormDialog`의 `onSuccess` 콜백으로 넘긴다.
- `features/finance/manage-budgets/BudgetFormDialog.tsx` — `createExtra: { shareToGroup: canShareToGroup && shareToGroup }`, `onSuccess` prop 그대로 전달.
- `features/finance/save-transaction/TransactionFormDialog.tsx` — 동일, `createExtra: { shareToGroup: canShareToGroup && shareToGroup }`.
- `features/finance/manage-categories/CategoryFormDialog.tsx` — `createExtra: { shareToGroup: shareToGroupAllowed && shareToGroup }`.
- `features/finance/manage-categories/SystemCategoryFormDialog.tsx` — `shareToGroup` 개념 없음 → `createExtra` 생략.

## 에러 처리

변경 없음. `onError` 토스트는 이미 entities 레벨(`useInvalidateFinanceMutation` 등, `entities/finance/hooks/useFinanceMutations.ts`)에서 처리되고 있어 `submitFormDialog`는 손대지 않는다.

## 테스트

- `shared/lib/form/submitFormDialog.test.ts` 신규: create 분기(→ createMutation.mutate 호출, createExtra 병합 확인), edit 분기(→ updateMutation.mutate 호출, createExtra 미병합 확인), 각 분기 `onSuccess`(성공 시 toast + 콜백) 동작 확인.
- 기존 5개 다이얼로그 관련 테스트(`AccountManager.test.tsx` 등)는 동작 변경이 없으므로 그대로 통과해야 한다 — 리팩토링 후 회귀 확인용으로 재실행.

## 커밋 전 검토

로직 변경이므로 커밋 직전 리뷰어 서브에이전트 검수 필수(전역 CLAUDE.md 규칙). diff 규모가 작아(신규 1파일 + 5개 파일 소폭 수정) 가벼운 리뷰 1개로 충분.
