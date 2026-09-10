# 폼 다이얼로그 제출 오케스트레이션 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/finance/*FormDialog.tsx` 5개가 복제하고 있는 "mode별 mutation 선택 + toast + onSuccess + shareToGroup 병합" 블록을 `shared/lib/form/submitFormDialog.ts`의 순수 함수 하나로 통합한다.

**Architecture:** React 훅이 아니라 상태 없는 일반 함수(`submitFormDialog`)를 `shared/lib/form/`에 추가한다. 각 다이얼로그는 필드 상태·`canSubmit` 검증·payload 조립은 그대로 유지하고, 기존 `if (mode==='edit'){...} createMutation.mutate(...)` 블록만 이 함수 호출로 교체한다.

**Tech Stack:** Next.js 16, TypeScript, React Query(`@tanstack/react-query`), `sonner`(toast), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-form-dialog-submit-design.md`

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지 (프로젝트 포맷 규칙)
- `any` 금지
- `shared/`는 `entities/`·`features/`·`widgets/` import 금지 (FSD 단방향 의존)
- 필드 `useState`·`canSubmit` 검증 로직은 건드리지 않는다 — 대상은 mutate 호출부뿐
- `onError` 토스트는 entities 레벨에서 이미 처리됨 — `submitFormDialog`는 손대지 않는다
- 각 파일 리팩토링 후 더 이상 쓰이지 않는 `import { toast } from 'sonner'`는 제거한다(고아 import 금지)
- 로직 변경이므로 커밋 직전 리뷰어 검수 필수(전역 CLAUDE.md 규칙) — subagent-driven-development 선택 시 태스크별 게이트가 이를 충족

---

### Task 1: `submitFormDialog` 함수 작성

**Files:**
- Create: `shared/lib/form/submitFormDialog.ts`
- Test: `shared/lib/form/submitFormDialog.test.ts`

**Interfaces:**
- Produces: `submitFormDialog<TPayload extends object, TCreatePayload extends TPayload = TPayload>(opts: SubmitFormDialogOptions<TPayload, TCreatePayload>): void`
  - `SubmitFormDialogOptions`: `{ mode: 'create' | 'edit', payload: TPayload, createMutation: { mutate: (variables: TCreatePayload, options: { onSuccess: () => void }) => void }, updateMutation: { mutate: (variables: TPayload, options: { onSuccess: () => void }) => void }, createExtra?: Partial<TCreatePayload>, messages: { create: string; edit: string }, onSuccess: () => void }`
- 이후 Task 2~6이 이 함수를 `@shared/lib/form/submitFormDialog`에서 import한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/lib/form/submitFormDialog.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { submitFormDialog } from './submitFormDialog'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe('submitFormDialog', () => {
  it('create 모드는 createExtra를 병합해 createMutation을 호출하고 onSuccess를 부른다', () => {
    const createMutation = { mutate: vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()) }
    const updateMutation = { mutate: vi.fn() }
    const onSuccess = vi.fn()

    submitFormDialog({
      mode: 'create',
      payload: { name: 'foo' },
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: true },
      messages: { create: '등록됨', edit: '수정됨' },
      onSuccess,
    })

    expect(createMutation.mutate).toHaveBeenCalledWith(
      { name: 'foo', shareToGroup: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(updateMutation.mutate).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('edit 모드는 createExtra 없이 updateMutation을 호출하고 onSuccess를 부른다', () => {
    const createMutation = { mutate: vi.fn() }
    const updateMutation = { mutate: vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()) }
    const onSuccess = vi.fn()

    submitFormDialog({
      mode: 'edit',
      payload: { name: 'foo' },
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: true },
      messages: { create: '등록됨', edit: '수정됨' },
      onSuccess,
    })

    expect(updateMutation.mutate).toHaveBeenCalledWith(
      { name: 'foo' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(createMutation.mutate).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('mode에 맞는 메시지로 toast.success를 부른다', async () => {
    const { toast } = await import('sonner')
    const createMutation = { mutate: vi.fn((_vars: unknown, opts: { onSuccess: () => void }) => opts.onSuccess()) }
    const updateMutation = { mutate: vi.fn() }

    submitFormDialog({
      mode: 'create',
      payload: {},
      createMutation,
      updateMutation,
      messages: { create: '등록됨', edit: '수정됨' },
      onSuccess: vi.fn(),
    })

    expect(toast.success).toHaveBeenCalledWith('등록됨')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run shared/lib/form/submitFormDialog.test.ts`
Expected: FAIL — `Cannot find module './submitFormDialog'`

- [ ] **Step 3: 최소 구현 작성**

`shared/lib/form/submitFormDialog.ts`:

```ts
import { toast } from 'sonner'

interface MutateLike<TVariables> {
  mutate: (variables: TVariables, options: { onSuccess: () => void }) => void
}

interface SubmitFormDialogOptions<TPayload extends object, TCreatePayload extends TPayload = TPayload> {
  mode: 'create' | 'edit'
  payload: TPayload
  createMutation: MutateLike<TCreatePayload>
  updateMutation: MutateLike<TPayload>
  createExtra?: Partial<TCreatePayload>
  messages: { create: string; edit: string }
  onSuccess: () => void
}

export function submitFormDialog<TPayload extends object, TCreatePayload extends TPayload = TPayload>({
  mode,
  payload,
  createMutation,
  updateMutation,
  createExtra,
  messages,
  onSuccess,
}: SubmitFormDialogOptions<TPayload, TCreatePayload>): void {
  if (mode === 'edit') {
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(messages.edit)
        onSuccess()
      },
    })
    return
  }

  createMutation.mutate({ ...payload, ...createExtra } as TCreatePayload, {
    onSuccess: () => {
      toast.success(messages.create)
      onSuccess()
    },
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run shared/lib/form/submitFormDialog.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add "shared/lib/form/submitFormDialog.ts" "shared/lib/form/submitFormDialog.test.ts"
git commit -m "feat(shared): 폼 다이얼로그 제출 오케스트레이션 공통 함수 submitFormDialog 추가"
```

---

### Task 2: `AccountFormDialog`에 적용

**Files:**
- Modify: `features/finance/manage-accounts/AccountFormDialog.tsx`

**Interfaces:**
- Consumes: `submitFormDialog` from Task 1 (`@shared/lib/form/submitFormDialog`)

- [ ] **Step 1: import 교체 및 handleSubmit 리팩토링**

`features/finance/manage-accounts/AccountFormDialog.tsx` 상단 import에서 `import { toast } from 'sonner'`를 제거하고 아래를 추가:

```ts
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
```

`handleSubmit` 함수 전체를 다음으로 교체:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceAccountRequest = {
      accountType,
      name: name.trim(),
      accountNo: accountNo.trim() || undefined,
      memo: memo.trim() || undefined,
    }

    submitFormDialog({
      mode: account ? 'edit' : 'create',
      payload,
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: canShareToGroup && shareToGroup },
      messages: { create: '계좌가 등록되었습니다', edit: '계좌가 수정되었습니다' },
      onSuccess: () => onOpenChange(false),
    })
  }
```

- [ ] **Step 2: 관련 테스트 실행**

Run: `npx vitest run features/finance/manage-accounts/AccountManager.test.tsx`
Expected: PASS (기존 테스트 그대로 통과 — 동작 변경 없음)

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add "features/finance/manage-accounts/AccountFormDialog.tsx"
git commit -m "refactor(finance): AccountFormDialog가 submitFormDialog를 사용하도록 변경"
```

---

### Task 3: `BudgetFormDialog`에 적용

**Files:**
- Modify: `features/finance/manage-budgets/BudgetFormDialog.tsx`

**Interfaces:**
- Consumes: `submitFormDialog` from Task 1

- [ ] **Step 1: import 교체 및 handleSubmit 리팩토링**

`import { toast } from 'sonner'` 제거, 다음 추가:

```ts
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
```

`handleSubmit` 함수 전체를 다음으로 교체:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceBudgetRequest = {
      categoryId,
      applyStartDate,
      applyEndDate: applyEndDate || undefined,
      amount: Number(amountDigits),
    }

    submitFormDialog({
      mode,
      payload,
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: canShareToGroup && shareToGroup },
      messages: { create: '예산이 등록되었습니다', edit: '예산이 수정되었습니다' },
      onSuccess,
    })
  }
```

- [ ] **Step 2: 관련 테스트 실행**

Run: `npx vitest run features/finance/manage-budgets`
Expected: PASS

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add "features/finance/manage-budgets/BudgetFormDialog.tsx"
git commit -m "refactor(finance): BudgetFormDialog가 submitFormDialog를 사용하도록 변경"
```

---

### Task 4: `TransactionFormDialog`에 적용

**Files:**
- Modify: `features/finance/save-transaction/TransactionFormDialog.tsx`

**Interfaces:**
- Consumes: `submitFormDialog` from Task 1

- [ ] **Step 1: import 교체 및 handleSubmit 리팩토링**

`import { toast } from 'sonner'` 제거, 다음 추가:

```ts
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
```

`handleSubmit` 함수 전체를 다음으로 교체:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceTransactionRequest = {
      categoryId,
      transactionDate,
      amount: Number(amountDigits),
      memo: memo.trim() || undefined,
    }

    submitFormDialog({
      mode,
      payload,
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: canShareToGroup && shareToGroup },
      messages: { create: '거래내역이 등록되었습니다', edit: '거래내역이 수정되었습니다' },
      onSuccess,
    })
  }
```

- [ ] **Step 2: 관련 테스트 실행**

Run: `npx vitest run features/finance/save-transaction`
Expected: PASS

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add "features/finance/save-transaction/TransactionFormDialog.tsx"
git commit -m "refactor(finance): TransactionFormDialog가 submitFormDialog를 사용하도록 변경"
```

---

### Task 5: `CategoryFormDialog`에 적용

**Files:**
- Modify: `features/finance/manage-categories/CategoryFormDialog.tsx`

**Interfaces:**
- Consumes: `submitFormDialog` from Task 1

- [ ] **Step 1: import 교체 및 handleSubmit 리팩토링**

`import { toast } from 'sonner'` 제거, 다음 추가:

```ts
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
```

`handleSubmit` 함수 전체를 다음으로 교체:

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    // PUT은 parentId/type을 서버가 무시하지만 요청 스키마상 필수라 기존 값을 그대로 실어 보낸다.
    const payload = {
      parentId: mode === 'edit' ? category?.parentId : (parentId === NO_PARENT_VALUE ? undefined : parentId),
      type,
      name: name.trim(),
      sortOrder: Math.max(1, Math.trunc(Number(sortOrder)) || 1),
    }

    submitFormDialog({
      mode,
      payload,
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: shareToGroupAllowed && shareToGroup },
      messages: { create: '카테고리가 추가되었습니다', edit: '카테고리가 수정되었습니다' },
      onSuccess,
    })
  }
```

- [ ] **Step 2: 관련 테스트 실행**

Run: `npx vitest run features/finance/manage-categories`
Expected: PASS

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add "features/finance/manage-categories/CategoryFormDialog.tsx"
git commit -m "refactor(finance): CategoryFormDialog가 submitFormDialog를 사용하도록 변경"
```

---

### Task 6: `SystemCategoryFormDialog`에 적용 및 최종 검증

**Files:**
- Modify: `features/finance/manage-categories/SystemCategoryFormDialog.tsx`

**Interfaces:**
- Consumes: `submitFormDialog` from Task 1

- [ ] **Step 1: import 교체 및 handleSubmit 리팩토링**

`import { toast } from 'sonner'` 제거, 다음 추가:

```ts
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
```

`handleSubmit` 함수 전체를 다음으로 교체(이 다이얼로그는 `shareToGroup` 개념이 없어 `createExtra`를 생략한다):

```ts
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    // PUT은 parentId/type을 서버가 무시하지만 요청 스키마상 필수라 기존 값을 그대로 실어 보낸다.
    const payload = {
      parentId: mode === 'edit' ? category?.parentId : (parentId === NO_PARENT_VALUE ? undefined : parentId),
      type,
      name: name.trim(),
      sortOrder: Math.max(0, Math.trunc(Number(sortOrder)) || 0),
    }

    submitFormDialog({
      mode,
      payload,
      createMutation,
      updateMutation,
      messages: { create: '카테고리가 추가되었습니다', edit: '카테고리가 수정되었습니다' },
      onSuccess,
    })
  }
```

- [ ] **Step 2: 전체 회귀 테스트 (최종 1회)**

Run: `npm run test:run`
Expected: PASS — 신규 3개 테스트 포함 전체 통과, 기존 다이얼로그 테스트 회귀 없음

- [ ] **Step 3: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 4: Commit**

```bash
git add "features/finance/manage-categories/SystemCategoryFormDialog.tsx"
git commit -m "refactor(finance): SystemCategoryFormDialog가 submitFormDialog를 사용하도록 변경"
```
