# 전략 관리 뮤테이션 액션 피드백 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/strategy/manage-strategy/useManageStrategyMutations.ts`의 `pause`/`resume`/`remove` 3개 함수가 반복하는 `mutate(x, {onSuccess: async () => {toast.success(msg); await invalidateDependents()}, onError: (e) => toast.error(apiMsg(e, fallback))})` 블록을 로컬 헬퍼 `withActionFeedback`으로 통합한다.

**Architecture:** 파일 내부(비export) 헬퍼 함수 하나를 훅 본문에 추가하고, `pause`/`resume`/`remove`를 각각 한 줄 호출로 축소한다. 다른 파일로 옮기지 않는다(재사용처가 이 파일 하나뿐).

**Tech Stack:** TypeScript, React Query(`@tanstack/react-query`), `sonner`(toast), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-strategy-mutation-feedback-design.md`

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지
- `any` 금지
- `EditAccountForm.tsx`·`useStrategyForm.ts`는 스코프 밖 — 건드리지 않는다
- `execute`(`useExecuteStrategyMutation` 기반)는 이미 다른 형태(생성자-시점 콜백)라 스코프 밖 — 건드리지 않는다
- `toast.success`가 `onSuccess` 콜백 시작 시 동기적으로 먼저 실행되고, `after?.()`(예: `onDeleted`)는 `await invalidateDependents()` 완료 **이후에만** 실행되어야 한다 — 기존 테스트가 이 순서를 검증함
- `invalidateDependents`는 파라미터로 넘기지 않고 클로저로 그대로 참조한다
- 순수 리팩터(동작 무변경) — 기존 `useManageStrategyMutations.test.tsx`를 그대로 통과해야 한다

---

### Task 1: `withActionFeedback` 헬퍼로 pause/resume/remove 통합

**Files:**
- Modify: `features/strategy/manage-strategy/useManageStrategyMutations.ts`
- Test: `features/strategy/manage-strategy/useManageStrategyMutations.test.tsx` (기존 파일, 수정 없이 그대로 재실행해 회귀 확인)

**Interfaces:**
- Produces: 훅 본문 내부의 비export 함수 `withActionFeedback<TVariables>(mutation: { mutate: (variables: TVariables, opts: { onSuccess: () => void; onError: (error: unknown) => void }) => void }, variables: TVariables, successMessage: string, errorFallback: string, after?: () => void): void` — 이 태스크 하나로 끝나므로 다른 태스크가 소비하지 않는다.

- [ ] **Step 1: 현재 파일 상태 확인**

`features/strategy/manage-strategy/useManageStrategyMutations.ts`는 현재 다음 내용이다(전체):

```ts
'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useDeleteStrategyMutation, useExecuteStrategyMutation, usePauseStrategyMutation, useResumeStrategyMutation } from '@entities/strategy'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import { apiMsg } from '@shared/lib/api-client'
import type { Strategy } from '@entities/strategy'

interface Options {
  onDeleted?: () => void
  strategyId?: string
}

export function useManageStrategyMutations({ onDeleted, strategyId }: Options = {}) {
  const queryClient = useQueryClient()
  const pauseMutation = usePauseStrategyMutation()
  const resumeMutation = useResumeStrategyMutation()
  const deleteMutation = useDeleteStrategyMutation()

  async function invalidateDependents() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
    ])
  }

  const executeMutation = useExecuteStrategyMutation(strategyId, invalidateDependents)

  function pause(strategy: Strategy) {
    pauseMutation.mutate(strategy, {
      onSuccess: async () => {
        toast.success('전략을 일시정지했습니다')
        await invalidateDependents()
      },
      onError: (error) => toast.error(apiMsg(error, '일시정지에 실패했습니다')),
    })
  }

  function resume(strategy: Strategy) {
    resumeMutation.mutate(strategy, {
      onSuccess: async () => {
        toast.success('전략을 재개했습니다')
        await invalidateDependents()
      },
      onError: (error) => toast.error(apiMsg(error, '재개에 실패했습니다')),
    })
  }

  function remove(strategy: Strategy) {
    deleteMutation.mutate(strategy, {
      onSuccess: async () => {
        toast.success('전략이 삭제되었습니다')
        await invalidateDependents()
        onDeleted?.()
      },
      onError: (error) => toast.error(apiMsg(error, '삭제에 실패했습니다')),
    })
  }

  function execute() {
    executeMutation.mutate()
  }

  return {
    pause,
    resume,
    remove,
    execute,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isExecuting: executeMutation.isPending,
  }
}
```

- [ ] **Step 2: `withActionFeedback` 추가 및 `pause`/`resume`/`remove` 교체**

`invalidateDependents` 함수 정의 바로 다음, `const executeMutation = ...` 줄 앞에 헬퍼를 추가하고, `pause`/`resume`/`remove`/함수 정의부 전체를 아래로 교체한다:

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

  const executeMutation = useExecuteStrategyMutation(strategyId, invalidateDependents)

  function pause(strategy: Strategy) {
    withActionFeedback(pauseMutation, strategy, '전략을 일시정지했습니다', '일시정지에 실패했습니다')
  }

  function resume(strategy: Strategy) {
    withActionFeedback(resumeMutation, strategy, '전략을 재개했습니다', '재개에 실패했습니다')
  }

  function remove(strategy: Strategy) {
    withActionFeedback(deleteMutation, strategy, '전략이 삭제되었습니다', '삭제에 실패했습니다', onDeleted)
  }

  function execute() {
    executeMutation.mutate()
  }
```

파일의 나머지(상단 import, `Options` interface, 훅 시그니처, `queryClient`/`pauseMutation`/`resumeMutation`/`deleteMutation`/`invalidateDependents`/`return` 블록)는 그대로 둔다. import 추가/삭제 없음(`toast`, `apiMsg`는 이미 쓰이고 있음).

- [ ] **Step 3: 기존 테스트로 회귀 확인**

Run: `npx vitest run features/strategy/manage-strategy/useManageStrategyMutations.test.tsx`
Expected: PASS — 기존 5개 테스트 전부 통과(순서·토스트 메시지·`onDeleted` 타이밍 포함). 실패하면 `withActionFeedback`의 `after?.()` 위치가 `await invalidateDependents()` 뒤에 있는지 확인한다(순서가 어긋나면 "navigates only after delete invalidates..." 테스트가 깨진다).

- [ ] **Step 4: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add "features/strategy/manage-strategy/useManageStrategyMutations.ts"
git commit -m "refactor(strategy): pause/resume/remove 뮤테이션 피드백을 withActionFeedback으로 통합"
```
