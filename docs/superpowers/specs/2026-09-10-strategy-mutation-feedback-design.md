# 전략 관리 뮤테이션 액션 피드백 통합 설계

배경: `docs/superpowers/specs/2026-09-10-ui-refactor-audit.md` 우선순위 중간 "뮤테이션 훅 골격 반복" 항목. 감사는 `useManageStrategyMutations.ts`, `EditAccountForm.tsx`, `useStrategyForm.ts` 3개 파일이 동일한 `invalidateQueries + toast.success + onError:apiMsg` 4종 세트를 복제한다고 지적했다.

## 범위 재조정 (조사 결과)

실제로 3개 파일을 대조한 결과 패턴이 동일하지 않았다:

- `useManageStrategyMutations.ts`: `pause`/`resume`/`remove` 3개 함수가 `mutate(x, { onSuccess: async () => { toast.success(msg); await invalidateDependents() }, onError: (e) => toast.error(apiMsg(e, fallback)) })` 형태를 **완전 동일하게 3번 반복** — 진짜 중복.
- `EditAccountForm.tsx`: `handleDelete`가 비슷한 모양(toast+invalidate)이지만 `onError`가 없다(entities 레벨 `useDeleteAccountMutation`이 이미 처리). 이 파일 안에서는 1회성이라 자체 반복이 아니다.
- `useStrategyForm.ts`: 아예 다른 방식 — `mutate()` 호출 시 옵션을 주지 않고, entities 훅 생성자에 `onSuccess` 콜백을 미리 넘긴다(`useCreateStrategyMutation(accountId, handleMutationSuccess)`). `onError`도 entities 레벨에 이미 있다.

세 파일을 하나의 팩토리로 억지로 묶으면 서로 다른 호출 형태(옵션-시점 콜백 vs 생성자-시점 콜백, onError 유무)를 인터페이스 하나로 욱여넣게 돼 오히려 읽기 어려워진다. **범위를 `useManageStrategyMutations.ts` 내부 3개 함수로 좁힌다.** `EditAccountForm.tsx`·`useStrategyForm.ts`는 건드리지 않는다.

## 설계

`useManageStrategyMutations.ts`의 훅 본문 안에 로컬(비export) 헬퍼 함수 `withActionFeedback`을 추가한다. 이 파일에서만 쓰이므로 `shared/`로 옮기지 않는다(YAGNI — 재사용처가 하나뿐).

```ts
function withActionFeedback<TVariables>(
  mutation: { mutate: (variables: TVariables, opts: { onSuccess: () => void; onError: (error: unknown) => void }) => void },
  variables: TVariables,
  successMessage: string,
  errorFallback: string,
  after?: () => void,
) {
  mutation.mutate(variables, {
    onSuccess: async () => {
      toast.success(successMessage)
      await invalidateDependents()
      after?.()
    },
    onError: (error) => toast.error(apiMsg(error, errorFallback)),
  })
}
```

`invalidateDependents`는 기존과 동일하게 훅 본문 내 클로저로 정의된 함수를 그대로 참조한다(파라미터로 넘기지 않음 — 이미 스코프 안에 있어 넘길 이유 없음).

`pause`/`resume`/`remove`를 각각 한 줄 호출로 축소한다:

```ts
function pause(strategy: Strategy) {
  withActionFeedback(pauseMutation, strategy, '전략을 일시정지했습니다', '일시정지에 실패했습니다')
}

function resume(strategy: Strategy) {
  withActionFeedback(resumeMutation, strategy, '전략을 재개했습니다', '재개에 실패했습니다')
}

function remove(strategy: Strategy) {
  withActionFeedback(deleteMutation, strategy, '전략이 삭제되었습니다', '삭제에 실패했습니다', onDeleted)
}
```

`execute`(`useExecuteStrategyMutation`)는 생성자-시점 콜백 방식이라 이미 다른 모양이며 이번 스코프 밖 — 건드리지 않는다.

## 순서 보장

기존 테스트(`useManageStrategyMutations.test.tsx`)가 `remove`에서 `onDeleted`가 `invalidateQueries` 완료 이후에만 호출되는지 검증한다(마지막 두 케이스). `after?.()`를 `await invalidateDependents()` **뒤**에 두어 이 순서를 그대로 보존한다. `toast.success`가 `onSuccess` 콜백 시작 시 동기적으로 먼저 호출되는 것도 기존과 동일하게 유지된다.

## 테스트

순수 리팩터(동작 무변경)이므로 기존 `useManageStrategyMutations.test.tsx`가 그대로 통과해야 한다 — 회귀 확인용으로 재실행. `withActionFeedback`은 이 파일 안에서만 쓰이는 사적 헬퍼이고 이미 기존 테스트가 그 동작(성공 시 toast+invalidate+after, 순서 포함)을 간접 검증하므로 별도 유닛 테스트는 추가하지 않는다(YAGNI).

## 커밋 전 검토

로직 변경이므로 커밋 직전 리뷰어 검수 필수. diff가 한 파일, 순수 리팩터라 가벼운 리뷰 1개로 충분.
