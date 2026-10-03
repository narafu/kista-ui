# 예산 관리 인터셉팅 라우트 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예산 목록 Dialog 위에 폼 Dialog가 겹치는 구조를, 목록·추가·수정 각각의 인터셉팅 라우트(PC 모달 하나 / 모바일 풀페이지)로 바꾸고 목록 필터는 URL에 보존한다.

**Architecture:** `/finance/budgets/[type]`(목록), `/new`(추가·복제·카테고리 프리필), `/[id]/edit`(수정)를 일반 페이지 + `@modal/(.)` 쌍으로 만들고, 둘이 `app/` 레이어의 서버 Body 하나를 공유한다(`NewAssetFormBody` 패턴). 목록 → 폼은 슬롯 교체라 모달이 중첩되지 않는다. `BudgetManager`의 필터·페이지는 searchParams에서 파생하고 `window.history.replaceState`로 쓴다.

**Tech Stack:** Next.js 16 App Router(parallel + intercepting routes), React Query(HydrationBoundary), Vitest + Testing Library, Playwright(실측).

**Spec:** `docs/superpowers/specs/2026-10-03-budget-route-modal-design.md`

## Global Constraints

- 포맷: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백. 기존 파일 포맷 일괄 변경 금지.
- FSD 단방향(`app -> widgets -> features -> entities -> shared`), 동일 계층 cross-import 금지. `@app/*` cross-import는 인터셉팅 라우트 쌍(`@modal` → 일반 라우트 Body) 전용.
- 인라인 `style` 금지, 동적 클래스는 `cn()`. `any` 금지.
- 서버 상태를 `useState`에 복사 금지 — 폼 draft 초기값(seed)만 예외(기존 `BudgetFormDialog`와 동일).
- 카피: 섹션 부제·`PageHeader` description은 명사구, 마침표 없음(예: "기준일·카테고리·금액 등 자산 기록 입력"). 완전한 문장(경고)은 "~습니다." 합니다체. features 인라인 토스트 한 문장은 마침표 없음.
- 아이콘/모호 라벨 링크·버튼은 `aria-label`. 모달 body에는 `PageHeader`(h1) 필수.
- type 슬러그: `income | expense | saving` ↔ `INCOME | EXPENSE | SAVING`.
- 검증: `npm run typecheck`, `npm run lint`(0 errors), 관련 테스트는 파일 단위(`npx vitest run <path>`), 전체 스위트는 마지막 Task에서 1회.
- **각 Task에서 커밋하지 않는다.** 리뷰 후 마지막 Task에서 한 번에 커밋(전역 규칙: 하위 항목이 이어지는 작업은 끝에서 리뷰·커밋 일괄). 서브에이전트는 절대 `git commit` 하지 말 것.
- 커밋 author `narafu <narafu@kakao.com>`, 메시지 한글, push 금지.

## Review Focus

1. **목록 ↔ 폼 왕복 후 필터 복원** — 목록 모달에서 상태 필터 '종료'·2페이지로 바꾼 뒤 수정 진입 → 취소하면 같은 필터·페이지가 보여야 한다 (Task 3 URL 파생 테스트 + Task 6 실측).
2. **URL에 쓰레기 값** — `?status=FOO&page=-3&size=7&category=없는id`로 들어오면 기본값(진행중, 1페이지, 10개, 전체 카테고리)으로 폴백해야 한다 (Task 3 테스트).
3. **필터를 좁혀 현재 페이지가 범위를 벗어남** — 3페이지에서 결과가 1페이지 분량으로 줄면 빈 화면이 아니라 마지막 페이지가 보여야 한다 (Task 3 클램프 테스트).
4. **다른 type의 id로 수정 URL 직접 진입** — `/finance/budgets/income/<소비예산id>/edit`는 404여야 하고, 잘못된 `duplicateFrom`/`categoryId`는 무시하고 빈 추가 폼이어야 한다 (Task 4 Body 로직, Task 6 실측).
5. **모달 위 삭제 확인창에서 ESC** — 확인창만 닫히고 라우트 모달은 유지돼야 한다 (Task 5 테스트 + Task 6 실측).

---

## File Structure

| 파일 | 책임 |
|---|---|
| Create `entities/finance/lib/budgetRoutes.ts` (+ `.test.ts`) | type↔슬러그·라벨 매핑, 예산 라우트 href 빌더 |
| Modify `entities/finance/index.ts` | 위 export |
| Create `features/finance/manage-budgets/BudgetForm.tsx` (+ `.test.tsx`) | 페이지형 예산 폼(구 `BudgetFormDialog`), `dismiss` 분기 |
| Modify `features/finance/manage-budgets/BudgetManager.tsx` (+ test) | URL 파생 필터·페이지, 추가/수정/복제는 라우트 이동 |
| Delete `BudgetFormDialog.tsx`, `BudgetManagerDialog.tsx`, `BudgetManagerDialog.test.tsx` | |
| Modify `features/finance/manage-budgets/index.ts` | export 정리 |
| Create `app/(main)/finance/budgets/[type]/{page.tsx,BudgetListBody.tsx}` | 목록 페이지 + 공유 Body |
| Create `app/(main)/finance/budgets/[type]/new/{page.tsx,NewBudgetFormBody.tsx}` | 추가/복제 |
| Create `app/(main)/finance/budgets/[type]/[id]/edit/{page.tsx,EditBudgetFormBody.tsx}` | 수정 |
| Create `app/(main)/@modal/(.)finance/budgets/[type]/{page.tsx,loading.tsx}`, `new/{page.tsx,loading.tsx}`, `[id]/edit/{page.tsx,loading.tsx}` | 인터셉트 버전 |
| Modify `app/(main)/finance/(dashboard)/FinanceHeader.tsx` (+ test) | "예산 관리" → `Link` |
| Modify `widgets/finance-budget-progress/FinanceBudgetProgress.tsx` (+ test) | "예산 등록" → `Link` |
| Modify `shared/ui/RouteModal.tsx` (+ test) | 포털 하위 팝업 ESC 가드 |
| Modify `docs/agents/app.md`, `docs/agents/features.md`, `widgets/asset-settings/AssetSettingsPanel.tsx`(주석) | 문서 |

---

### Task 1: type 슬러그·예산 라우트 href 헬퍼

**Files:**
- Create: `entities/finance/lib/budgetRoutes.ts`
- Create: `entities/finance/lib/budgetRoutes.test.ts`
- Modify: `entities/finance/index.ts` (lib export 블록에 추가)

**Interfaces:**
- Produces:
  - `type FlowType = 'INCOME' | 'EXPENSE' | 'SAVING'`
  - `FLOW_TYPE_LABEL: Record<FlowType, string>` (`수입`/`소비`/`저축`)
  - `flowTypeFromSlug(slug: string): FlowType | null`
  - `flowTypeSlug(type: FlowType): string`
  - `budgetListHref(type: FlowType): string` → `/finance/budgets/expense`
  - `newBudgetHref(type: FlowType, opts?: { duplicateFrom?: string; categoryId?: string }): string`
  - `editBudgetHref(type: FlowType, id: string): string`

- [ ] **Step 1: 실패 테스트 작성** — `entities/finance/lib/budgetRoutes.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { budgetListHref, editBudgetHref, flowTypeFromSlug, flowTypeSlug, newBudgetHref } from './budgetRoutes'

describe('budgetRoutes', () => {
  it('슬러그와 type을 양방향으로 변환한다', () => {
    expect(flowTypeFromSlug('income')).toBe('INCOME')
    expect(flowTypeFromSlug('expense')).toBe('EXPENSE')
    expect(flowTypeFromSlug('saving')).toBe('SAVING')
    expect(flowTypeSlug('SAVING')).toBe('saving')
  })

  it('알 수 없는 슬러그(대문자·asset 포함)는 null', () => {
    expect(flowTypeFromSlug('EXPENSE')).toBeNull()
    expect(flowTypeFromSlug('asset')).toBeNull()
    expect(flowTypeFromSlug('edit')).toBeNull()
  })

  it('라우트 href를 만든다', () => {
    expect(budgetListHref('EXPENSE')).toBe('/finance/budgets/expense')
    expect(newBudgetHref('INCOME')).toBe('/finance/budgets/income/new')
    expect(newBudgetHref('EXPENSE', { categoryId: 'c 1' })).toBe('/finance/budgets/expense/new?categoryId=c+1')
    expect(newBudgetHref('EXPENSE', { duplicateFrom: 'b1' })).toBe('/finance/budgets/expense/new?duplicateFrom=b1')
    expect(editBudgetHref('SAVING', 'b9')).toBe('/finance/budgets/saving/b9/edit')
  })
})
```

- [ ] **Step 2: 실패 확인** — `npx vitest run entities/finance/lib/budgetRoutes.test.ts` → 모듈 없음으로 FAIL

- [ ] **Step 3: 구현** — `entities/finance/lib/budgetRoutes.ts`

```ts
// 예산 관리 라우트(/finance/budgets/[type]/...) 전용 — 예산 응답(FinanceBudget)에 type이 없어 경로에 싣는다.
// 슬러그는 가계부 탭 href(/finance/income 등)와 같은 소문자를 쓴다.
export type FlowType = 'INCOME' | 'EXPENSE' | 'SAVING'

const SLUG_BY_TYPE: Record<FlowType, string> = { INCOME: 'income', EXPENSE: 'expense', SAVING: 'saving' }

// 서버 Body의 PageHeader 제목용 — useMeta(labelOf)는 클라이언트 훅이라 서버에서 쓸 수 없다.
export const FLOW_TYPE_LABEL: Record<FlowType, string> = { INCOME: '수입', EXPENSE: '소비', SAVING: '저축' }

export function flowTypeSlug(type: FlowType): string {
  return SLUG_BY_TYPE[type]
}

export function flowTypeFromSlug(slug: string): FlowType | null {
  const entry = Object.entries(SLUG_BY_TYPE).find(([, s]) => s === slug)
  return entry ? (entry[0] as FlowType) : null
}

export function budgetListHref(type: FlowType): string {
  return `/finance/budgets/${flowTypeSlug(type)}`
}

export function newBudgetHref(type: FlowType, opts: { duplicateFrom?: string; categoryId?: string } = {}): string {
  const params = new URLSearchParams()
  if (opts.duplicateFrom) params.set('duplicateFrom', opts.duplicateFrom)
  if (opts.categoryId) params.set('categoryId', opts.categoryId)
  const qs = params.toString()
  return `${budgetListHref(type)}/new${qs ? `?${qs}` : ''}`
}

export function editBudgetHref(type: FlowType, id: string): string {
  return `${budgetListHref(type)}/${encodeURIComponent(id)}/edit`
}
```

- [ ] **Step 4: export 추가** — `entities/finance/index.ts`의 lib export들 근처에:

```ts
export type { FlowType } from './lib/budgetRoutes'
export { FLOW_TYPE_LABEL, budgetListHref, editBudgetHref, flowTypeFromSlug, flowTypeSlug, newBudgetHref } from './lib/budgetRoutes'
```

- [ ] **Step 5: 통과 확인** — `npx vitest run entities/finance/lib/budgetRoutes.test.ts` → PASS

---

### Task 2: `BudgetForm` (페이지형 폼)

**Files:**
- Create: `features/finance/manage-budgets/BudgetForm.tsx`
- Create: `features/finance/manage-budgets/BudgetForm.test.tsx`
- Modify: `features/finance/manage-budgets/index.ts` (`BudgetForm` export 추가 — `BudgetFormDialog` 삭제는 Task 4)

**Interfaces:**
- Consumes: `FlowType`, `budgetListHref` (Task 1); `DismissMode` (`@shared/lib/dismiss`); `FormActions` (`@shared/ui/FormActions`)
- Produces: `BudgetForm(props: { type: FlowType; initial?: FinanceBudget; duplicateFrom?: Pick<FinanceBudget, 'categoryId' | 'amount' | 'applyStartDate' | 'applyEndDate'>; defaultCategoryId?: string; dismiss?: DismissMode })`
  - 카테고리 트리는 `useFinanceCategoriesQuery(type)`로 직접 구독(서버 Body가 하이드레이션).
  - 저장 성공·취소 모두 `dismiss === 'back'` ? `router.back()` : `router.push(budgetListHref(type))`.
  - 제목·설명은 렌더하지 않는다(Body의 `PageHeader` 담당).

- [ ] **Step 1: 실패 테스트 작성** — `features/finance/manage-budgets/BudgetForm.test.tsx` (기존 `BudgetManager.test`의 폼 케이스 5개 이관 + dismiss/수정 케이스)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetForm } from './BudgetForm'
import type { FinanceBudget, FinanceCategory } from '@entities/finance'

const { pushMock, backMock, createMutateMock, updateMutateMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backMock: vi.fn(),
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
}))

const categoryTree: FinanceCategory[] = [
  { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
  { id: 'cat-transit', type: 'EXPENSE', name: '교통', sortOrder: 1, system: false, children: [] },
]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceCategoriesQuery: () => ({ data: categoryTree }),
    useCanShareToGroup: () => false,
    useCreateFinanceBudgetMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateFinanceBudgetMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  }
})
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, back: backMock }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))

const source: FinanceBudget = { id: 'b1', categoryId: 'cat-food', applyStartDate: '2026-01-01', amount: 100_000 }

describe('BudgetForm', () => {
  beforeEach(() => {
    pushMock.mockClear()
    backMock.mockClear()
    createMutateMock.mockReset()
    updateMutateMock.mockReset()
  })

  it('복제 원본의 카테고리·금액·시작일이 그대로 채워진다', () => {
    render(<BudgetForm type="EXPENSE" duplicateFrom={source} />)

    expect(screen.getByRole('combobox', { name: '카테고리' })).toHaveTextContent('식비')
    expect(screen.getByLabelText('월 예산 (원)')).toHaveValue('100,000')
    expect(screen.getByLabelText('적용 시작일')).toHaveValue('2026-01-01')
  })

  it('복제 제출(날짜 변경) 시 create mutation이 호출된다(update 아님)', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" duplicateFrom={source} />)

    await user.clear(screen.getByLabelText('적용 시작일'))
    await user.type(screen.getByLabelText('적용 시작일'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(createMutateMock).toHaveBeenCalledTimes(1)
    expect(createMutateMock.mock.calls[0][0]).toMatchObject({ categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-09-01' })
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('수정 제출 시 update mutation이 호출된다', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" initial={source} />)

    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMutateMock).toHaveBeenCalledTimes(1)
    expect(createMutateMock).not.toHaveBeenCalled()
  })

  it('defaultCategoryId로 카테고리만 프리필된다', () => {
    render(<BudgetForm type="EXPENSE" defaultCategoryId="cat-transit" />)

    expect(screen.getByRole('combobox', { name: '카테고리' })).toHaveTextContent('교통')
    expect(screen.getByLabelText('월 예산 (원)')).toHaveValue('')
  })

  it('월 예산이 0원이면 저장 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" duplicateFrom={source} />)

    await user.clear(screen.getByLabelText('월 예산 (원)'))
    await user.type(screen.getByLabelText('월 예산 (원)'), '0')

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('추가 폼은 이번 달 1일을 시작일 기본값으로 채운다', () => {
    render(<BudgetForm type="EXPENSE" />)

    expect((screen.getByLabelText('적용 시작일') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('종료일이 시작일보다 앞서면 안내가 뜨고 저장 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" duplicateFrom={{ ...source, applyStartDate: '2026-05-01' }} />)

    await user.type(screen.getByLabelText('적용 종료일 (선택)'), '2026-04-30')

    expect(screen.getByText('종료일은 시작일 이후여야 합니다.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('dismiss=back이면 취소 시 router.back()', async () => {
    const user = userEvent.setup()
    render(<BudgetForm type="EXPENSE" dismiss="back" />)

    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(backMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('dismiss 기본값(push)이면 저장 성공 후 목록 라우트로 이동한다', async () => {
    const user = userEvent.setup()
    updateMutateMock.mockImplementation((_payload, opts: { onSuccess: () => void }) => opts.onSuccess())
    render(<BudgetForm type="EXPENSE" initial={source} />)

    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(pushMock).toHaveBeenCalledWith('/finance/budgets/expense')
  })
})
```

> 카테고리 `combobox` 이름이 `카테고리`로 잡히지 않으면(`Label htmlFor="budgetCategory"` ↔ `CascadingCategorySelect id`) `screen.getByLabelText('카테고리')`로 바꿔 동일 단언. 첫 케이스 텍스트 단언 방식은 실제 `CascadingCategorySelect` 렌더에 맞춰 조정하되, "식비가 선택됨"을 검증한다는 의도는 유지.

- [ ] **Step 2: 실패 확인** — `npx vitest run features/finance/manage-budgets/BudgetForm.test.tsx` → 모듈 없음 FAIL

- [ ] **Step 3: 구현** — `features/finance/manage-budgets/BudgetForm.tsx`. `BudgetFormDialog.tsx`의 상태·검증·제출 로직을 그대로 옮기고 Dialog 래퍼만 걷어낸다.

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormActions } from '@shared/ui/FormActions'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
import type { DismissMode } from '@shared/lib/dismiss'
import {
  budgetListHref,
  monthStartDate,
  useCanShareToGroup,
  useCategoryPathState,
  useCreateFinanceBudgetMutation,
  useFinanceCategoriesQuery,
  useUpdateFinanceBudgetMutation,
} from '@entities/finance'
import type { FinanceBudget, FinanceBudgetRequest, FlowType } from '@entities/finance'

interface Props {
  type: FlowType
  initial?: FinanceBudget
  // (기존 BudgetFormDialog의 duplicateFrom 주석 그대로 옮긴다)
  duplicateFrom?: Pick<FinanceBudget, 'categoryId' | 'amount' | 'applyStartDate' | 'applyEndDate'>
  // 예산 미설정 카테고리 빠른 등록 — 카테고리만 프리필하는 일반 추가(복제 아님).
  defaultCategoryId?: string
  // 'push'(기본): 일반 페이지 라우트 — 예산 목록으로 이동. 'back': 인터셉팅 라우트(모달) — 이전 화면으로 복귀
  dismiss?: DismissMode
}

const MIN_APPLY_DATE = '1900-01-01'
const MAX_APPLY_DATE = '2999-12-31'

export function BudgetForm({ type, initial, duplicateFrom, defaultCategoryId, dismiss = 'push' }: Props) {
  const router = useRouter()
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(budgetListHref(type))
  const { data: categoryTree = [] } = useFinanceCategoriesQuery(type)

  const mode = initial ? 'edit' : 'create'
  const seed = initial ?? duplicateFrom
  // ... BudgetFormDialog.tsx 59~101행(useCategoryPathState ~ handleSubmit)을 그대로 옮기되
  //     submitFormDialog의 onSuccess만 handleDone으로 바꾼다.

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* BudgetFormDialog.tsx의 <div className="space-y-4 py-2"> 안 필드 블록(카테고리·시작일·종료일·금액·그룹 스위치)을 그대로 옮긴다 */}
      <FormActions onCancel={handleDone} isPending={isPending} canSubmit={canSubmit} label="저장" className="pt-2" />
    </form>
  )
}
```

`isDuplicate`는 제목·설명용이라 폼에서 더는 필요 없다 — 남기지 않는다.

- [ ] **Step 4: export** — `features/finance/manage-budgets/index.ts`에 `export { BudgetForm } from './BudgetForm'` 추가.

- [ ] **Step 5: 통과 확인** — `npx vitest run features/finance/manage-budgets/BudgetForm.test.tsx` → PASS

---

### Task 3: `BudgetManager` — URL 파생 필터 + 라우트 이동

**Files:**
- Modify: `features/finance/manage-budgets/BudgetManager.tsx`
- Modify: `features/finance/manage-budgets/BudgetManager.test.tsx`

**Interfaces:**
- Consumes: `budgetListHref` 불필요; `newBudgetHref`, `editBudgetHref`, `FlowType` (Task 1)
- Produces: `BudgetManager({ type }: { type: FlowType })` — 시그니처 유지. searchParams 키: `category`, `status`(`ALL|UPCOMING|ACTIVE|ENDED`, 기본 `ACTIVE`는 생략), `page`(기본 1 생략), `size`(`10|30|50|100`, 기본 10 생략).

- [ ] **Step 1: 테스트 하네스 교체** — `BudgetManager.test.tsx` 상단 `next/navigation` mock을 실제 URL을 따라가는 버전으로 바꾼다. `useSyncExternalStore`로 `window.location.search`를 구독하고 `history.replaceState`를 감싸 알림을 보낸다.

```tsx
const { pushMock, urlListeners } = vi.hoisted(() => {
  const urlListeners = new Set<() => void>()
  const original = window.history.replaceState.bind(window.history)
  window.history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    original(...args)
    urlListeners.forEach((l) => l())
  }) as History['replaceState']
  return { pushMock: vi.fn(), urlListeners }
})

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await vi.importActual<typeof import('react')>('react')
  return {
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (cb) => { urlListeners.add(cb); return () => { urlListeners.delete(cb) } },
        () => window.location.search,
      )
      return new URLSearchParams(search)
    },
  }
})
```

`beforeEach`에 `window.history.replaceState(null, '', '/finance/budgets/expense')`와 `pushMock.mockClear()` 추가. 기존 `createMutateMock`/`updateMutateMock`/`openDuplicateForm` 및 폼 케이스 5개(복제 프리필, 복제 제출, 0원, 시작일 기본값, 종료일<시작일)는 삭제(Task 2로 이관됨). 나머지 필터·배지·페이지네이션 케이스는 그대로 둔다 — URL 파생으로 바뀌어도 동일하게 통과해야 한다.

- [ ] **Step 2: 신규 실패 테스트 추가**

```tsx
  it('URL의 필터·페이지를 초기 상태로 읽는다', () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?status=ENDED&category=cat-transit')
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'a', categoryId: 'cat-food', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
        budget({ id: 'b', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
        budget({ id: 'c', categoryId: 'cat-transit' }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    const items = within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('교통')).toBeInTheDocument()
    expect(within(items[0]).getByText('종료')).toBeInTheDocument()
  })

  it('잘못된 URL 값은 기본값(진행중·전체 카테고리·1페이지·10개)으로 폴백한다', () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?status=FOO&category=nope&page=-3&size=7')
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'active', categoryId: 'cat-food' }),
        budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()
  })

  it('필터 변경은 URL에 기록되고 page는 지워진다(기본값은 생략)', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/finance/budgets/expense?page=2')
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({})] })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))
    expect(window.location.search).toBe('?status=ENDED')

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))
    expect(window.location.search).toBe('')
  })

  it('범위를 벗어난 page는 마지막 페이지로 클램프한다', () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?page=9')
    const budgets = Array.from({ length: 11 }, (_, i) =>
      budget({ id: `b${i}`, categoryId: 'cat-food', applyStartDate: `2026-01-${String(i + 1).padStart(2, '0')}` })
    )
    useFinanceBudgetsQueryMock.mockReturnValue({ data: budgets })
    render(<BudgetManager type="EXPENSE" />)

    expect(within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('예산 추가는 추가 라우트 링크, 복제·수정은 해당 라우트로 이동한다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({ id: 'b1' })] })
    render(<BudgetManager type="EXPENSE" />)

    expect(screen.getByRole('link', { name: '예산 추가' })).toHaveAttribute('href', '/finance/budgets/expense/new')

    await user.click(screen.getByRole('button', { name: '복제' }))
    expect(pushMock).toHaveBeenLastCalledWith('/finance/budgets/expense/new?duplicateFrom=b1')

    await user.click(screen.getByRole('button', { name: '수정' }))
    expect(pushMock).toHaveBeenLastCalledWith('/finance/budgets/expense/b1/edit')
  })
```

- [ ] **Step 3: 실패 확인** — `npx vitest run features/finance/manage-budgets/BudgetManager.test.tsx` → 신규 5건 FAIL

- [ ] **Step 4: 구현** — `BudgetManager.tsx`

1. import: `useState`·`useEffect` 중 `useEffect` 제거(필터 리셋 effect 삭제). `useClientPagination` import 제거. `BudgetFormDialog` import 제거. 추가: `Link from 'next/link'`, `useRouter, useSearchParams from 'next/navigation'`, `buttonVariants from '@/components/ui/button-variants'`, `cn from '@shared/lib/utils'`, `editBudgetHref, newBudgetHref`, `type FlowType`. `Button` import는 더 안 쓰면 제거.
2. `Props.type`을 `FlowType`으로. `FormTarget` 타입·`formTarget` state·하단 `{formTarget && <BudgetFormDialog …/>}` 블록 삭제.
3. 필터 상태를 URL에서 파생:

```tsx
const STATUS_VALUES: StatusFilter[] = ['ALL', 'UPCOMING', 'ACTIVE', 'ENDED']
const PAGE_SIZES = [10, 30, 50, 100]
const DEFAULT_SIZE = 10

function positiveInt(raw: string | null): number | null {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}
```

컴포넌트 안:

```tsx
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status') as StatusFilter | null
  const statusFilter: StatusFilter = statusParam && STATUS_VALUES.includes(statusParam) ? statusParam : 'ACTIVE'
  const categoryParam = searchParams.get('category')
  // 경로는 URL에 마지막 id 하나만 두고 트리에서 복원한다 — 트리에 없는 id면 빈 경로(전체)로 폴백
  const categoryPath = useMemo(
    () => (categoryParam ? getCategoryPath(categories, categoryParam).map((c) => c.id) : []),
    [categories, categoryParam],
  )
  const sizeParam = positiveInt(searchParams.get('size'))
  const size = sizeParam && PAGE_SIZES.includes(sizeParam) ? sizeParam : DEFAULT_SIZE
  const pageParam = positiveInt(searchParams.get('page')) ?? 1

  // 목록 모달이 폼 라우트로 교체됐다가 돌아와도 필터가 남도록 URL에 둔다. replaceState는 서버 왕복·
  // 인터셉트 재평가 없이 useSearchParams와 동기화된다(Next.js 네이티브 history 지원). 기본값은 생략한다.
  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }

  function setCategoryPath(path: string[]) {
    updateParams({ category: path.at(-1) ?? null, page: null })
  }
  function setStatusFilter(value: StatusFilter) {
    updateParams({ status: value === 'ACTIVE' ? null : value, page: null })
  }
  function setPage(next: number) {
    updateParams({ page: next === 1 ? null : String(next) })
  }
  function handlePageSizeChange(next: string) {
    updateParams({ size: next === String(DEFAULT_SIZE) ? null : next, page: null })
  }
```

기존 `const [categoryPath, setCategoryPath] = useState…`, `const [statusFilter, setStatusFilter] = useState…`, `useClientPagination(...)` 호출, 페이지 리셋 `useEffect`를 삭제하고 `filtered` 계산 뒤에 페이지네이션을 파생:

```tsx
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const currentPage = Math.min(pageParam, totalPages)
  const paged = filtered.slice((currentPage - 1) * size, currentPage * size)
```

4. "예산 추가" `Button`을 `Link`로:

```tsx
        <Link href={newBudgetHref(type)} className={cn(buttonVariants({ variant: 'brand-soft', size: 'sm' }), 'ml-auto gap-1.5')}>
          <Plus className="size-4" />
          예산 추가
        </Link>
```

5. `ShareableRowActions`: `onEdit={() => router.push(editBudgetHref(type, budget.id))}`, `onDuplicate={() => router.push(newBudgetHref(type, { duplicateFrom: budget.id }))}`.
6. `PaginationBar page={currentPage} … onPageChange={setPage}` 유지, `PageSizeSelector value={String(size)} onChange={handlePageSizeChange}` 유지.
7. 컴포넌트 상단 주석 "호출부(BudgetManagerDialog)가" → "호출 라우트(`/finance/budgets/[type]`)가"로 갱신.

- [ ] **Step 5: 통과 확인** — `npx vitest run features/finance/manage-budgets/BudgetManager.test.tsx` → 전부 PASS

---

### Task 4: 라우트·진입점 연결 + 구 Dialog 삭제

**Files:**
- Create: `app/(main)/finance/budgets/[type]/page.tsx`, `BudgetListBody.tsx`
- Create: `app/(main)/finance/budgets/[type]/new/page.tsx`, `NewBudgetFormBody.tsx`
- Create: `app/(main)/finance/budgets/[type]/[id]/edit/page.tsx`, `EditBudgetFormBody.tsx`
- Create: `app/(main)/@modal/(.)finance/budgets/[type]/page.tsx`, `loading.tsx`, `new/page.tsx`, `new/loading.tsx`, `[id]/edit/page.tsx`, `[id]/edit/loading.tsx`
- Modify: `app/(main)/finance/(dashboard)/FinanceHeader.tsx`, `FinanceHeader.test.tsx`
- Modify: `widgets/finance-budget-progress/FinanceBudgetProgress.tsx`, `FinanceBudgetProgress.test.tsx`
- Delete: `features/finance/manage-budgets/BudgetFormDialog.tsx`, `BudgetManagerDialog.tsx`, `BudgetManagerDialog.test.tsx`
- Modify: `features/finance/manage-budgets/index.ts`

**Interfaces:**
- Consumes: Task 1 헬퍼, `BudgetForm`(Task 2), `BudgetManager`(Task 3), `requirePageToken`(`@shared/lib/auth/token`), `createQueryClient`(`@shared/lib/query`), `budgetListQueryOptions`/`financeCategoryListQueryOptions`/`getCategoryPath`(`@entities/finance`), `RouteModal`, `ModalFormSkeleton`(`@shared/ui/ModalFormSkeleton`)
- Produces: `BudgetListBody({ params })`, `NewBudgetFormBody({ params, searchParams, dismiss? })`, `EditBudgetFormBody({ params, dismiss? })`

- [ ] **Step 1: 진입점 실패 테스트**

`FinanceHeader.test.tsx`: `@features/finance/manage-budgets` mock 블록 삭제. 수입 탭 케이스의 `getByRole('button', { name: '예산 관리 (INCOME)' })`를

```tsx
    expect(screen.getByRole('link', { name: '예산 관리' })).toHaveAttribute('href', '/finance/budgets/income')
```

로 바꾸고, 자산·설정 탭 케이스의 `queryByRole('button', { name: /예산 관리/ })`를 `queryByRole('link', { name: /예산 관리/ })`로 바꾼다.

`FinanceBudgetProgress.test.tsx`에 케이스 추가(파일의 `cat`/`idx`/`tx`/`renderWidget` 헬퍼 사용):

```tsx
describe('FinanceBudgetProgress 예산 미설정 빠른 등록', () => {
  it('예산 없이 실적만 있는 카테고리에 추가 라우트 링크(categoryId 프리필)를 단다', () => {
    renderWidget({
      budgets: [],
      transactions: [tx('food', 30_000)],
      categoryTree: [cat('food', '식비')],
      index: new Map([idx('food', '식비')]),
    })

    expect(screen.getByRole('link', { name: '식비 예산 등록' })).toHaveAttribute('href', '/finance/budgets/expense/new?categoryId=food')
  })
})
```

- [ ] **Step 2: 실패 확인** — `npx vitest run "app/(main)/finance/(dashboard)/FinanceHeader.test.tsx" widgets/finance-budget-progress` → FAIL

- [ ] **Step 3: FinanceHeader** — `BudgetManagerDialog` import 삭제, 추가: `Link from 'next/link'`, `Plus from 'lucide-react'`, `buttonVariants from '@/components/ui/button-variants'`, `cn from '@shared/lib/utils'`, `budgetListHref`(기존 `@entities/finance` import에 합침). `<BudgetManagerDialog type={flowType} />`를:

```tsx
              <Link href={budgetListHref(flowType)} className={cn(buttonVariants({ variant: 'brand-soft', size: 'sm' }), 'gap-1.5')}>
                <Plus className="size-3.5" />
                예산 관리
              </Link>
```

`FLOW_TYPE_BY_HREF`의 값 타입을 `FlowType`으로 바꾼다(`import type { FlowType } from '@entities/finance'`).

- [ ] **Step 4: FinanceBudgetProgress** — `useState`·`Button`·`BudgetFormDialog` import와 `quickCreateCategoryId` state·주석, 하단 `{quickCreateCategoryId && <BudgetFormDialog …/>}` 블록 삭제. `Link`, `buttonVariants`, `newBudgetHref` import 추가(`cn`은 이미 있음). `Props.type`을 `FlowType`으로. 버튼을:

```tsx
                      {/* 예산 없이 실적만 있는 카테고리 즉석 등록 — 카테고리만 프리필, 날짜·금액은 사용자가 입력 */}
                      <Link
                        href={newBudgetHref(type, { categoryId: entry.categoryId })}
                        aria-label={`${entry.categoryName} 예산 등록`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0')}
                      >
                        예산 등록
                      </Link>
```

- [ ] **Step 5: 구 Dialog 삭제·export 정리**

```bash
git rm features/finance/manage-budgets/BudgetFormDialog.tsx features/finance/manage-budgets/BudgetManagerDialog.tsx features/finance/manage-budgets/BudgetManagerDialog.test.tsx
```

`features/finance/manage-budgets/index.ts`:

```ts
export { BudgetForm } from './BudgetForm'
export { BudgetManager } from './BudgetManager'
```

- [ ] **Step 6: 목록 Body·페이지** — `app/(main)/finance/budgets/[type]/BudgetListBody.tsx`

```tsx
import { notFound } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { PageHeader } from '@widgets/page-header'
import { BudgetManager } from '@features/finance/manage-budgets'
import { FLOW_TYPE_LABEL, budgetListQueryOptions, financeCategoryListQueryOptions, flowTypeFromSlug } from '@entities/finance'
import { requirePageToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'

interface Props {
  params: Promise<{ type: string }>
}

// 일반 page.tsx와 @modal 인터셉트 버전이 공유하는 조립(NewAssetFormBody 패턴). 목록은 종료 동작이
// 없어 dismiss를 받지 않는다 — 모달 닫기는 RouteModal(X·배경·ESC)이 맡는다.
export async function BudgetListBody({ params }: Props) {
  const { params: { type: slug }, token } = await requirePageToken(params)
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  await Promise.all([
    queryClient.prefetchQuery(financeCategoryListQueryOptions(type, token)).catch(() => undefined),
    queryClient.prefetchQuery(budgetListQueryOptions(token)).catch(() => undefined),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader eyebrow="가계부" eyebrowHref={`/finance/${slug}`} title={`${FLOW_TYPE_LABEL[type]} 예산 관리`} description="카테고리별 월 예산 등록·수정·삭제" />
      <BudgetManager type={type} />
    </HydrationBoundary>
  )
}
```

`app/(main)/finance/budgets/[type]/page.tsx`

```tsx
import type { Metadata } from 'next'
import { BudgetListBody } from './BudgetListBody'

interface Props {
  params: Promise<{ type: string }>
}

export const metadata: Metadata = {
  title: '예산 관리 | KISTA',
  description: '카테고리별 월 예산을 관리합니다',
}

export default function BudgetListPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <BudgetListBody params={params} />
    </div>
  )
}
```

- [ ] **Step 7: 추가 Body·페이지** — `app/(main)/finance/budgets/[type]/new/NewBudgetFormBody.tsx`

```tsx
import { notFound } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { PageHeader } from '@widgets/page-header'
import { BudgetForm } from '@features/finance/manage-budgets'
import { FLOW_TYPE_LABEL, budgetListHref, budgetListQueryOptions, financeCategoryListQueryOptions, flowTypeFromSlug, getCategoryPath } from '@entities/finance'
import type { FinanceBudget } from '@entities/finance'
import { requirePageToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ duplicateFrom?: string; categoryId?: string }>
  // 'push'(기본): 일반 페이지 라우트. 'back': 인터셉팅 라우트(@modal) — NewAssetFormBody와 동일한 이유로 분리.
  dismiss?: DismissMode
}

export async function NewBudgetFormBody({ params, searchParams, dismiss }: Props) {
  const [{ params: { type: slug }, token }, { duplicateFrom, categoryId }] = await Promise.all([requirePageToken(params), searchParams])
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  // 폼의 useState 초기값이 첫 렌더에 확정되므로 프리필 값은 서버에서 찾아 prop으로 넘긴다.
  // 예산 단건 조회 API가 없어 목록에서 찾는다. 복제 원본 조회 실패는 빈 추가 폼으로 폴백(자산 복제와 동일).
  const [categories, budgets] = await Promise.all([
    queryClient.fetchQuery(financeCategoryListQueryOptions(type, token)),
    duplicateFrom ? queryClient.fetchQuery(budgetListQueryOptions(token)).catch((): FinanceBudget[] => []) : Promise.resolve<FinanceBudget[]>([]),
  ])
  const inType = (id?: string): id is string => !!id && getCategoryPath(categories, id).length > 0
  const source = budgets.find((b) => b.id === duplicateFrom && inType(b.categoryId))

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader
        eyebrow={`${FLOW_TYPE_LABEL[type]} 예산 관리`}
        eyebrowHref={budgetListHref(type)}
        title={source ? '예산 복제' : '예산 추가'}
        description={source ? '원본과 적용 기간이 겹치면 저장되지 않습니다. 적용 기간을 변경하세요.' : '카테고리·적용 기간·월 예산 입력'}
      />
      <BudgetForm type={type} duplicateFrom={source} defaultCategoryId={inType(categoryId) ? categoryId : undefined} dismiss={dismiss} />
    </HydrationBoundary>
  )
}
```

`new/page.tsx`

```tsx
import type { Metadata } from 'next'
import { NewBudgetFormBody } from './NewBudgetFormBody'

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ duplicateFrom?: string; categoryId?: string }>
}

export const metadata: Metadata = {
  title: '예산 추가 | KISTA',
  description: '카테고리별 월 예산을 추가합니다',
}

export default function NewBudgetPage({ params, searchParams }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <NewBudgetFormBody params={params} searchParams={searchParams} />
    </div>
  )
}
```

- [ ] **Step 8: 수정 Body·페이지** — `app/(main)/finance/budgets/[type]/[id]/edit/EditBudgetFormBody.tsx`

```tsx
import { notFound } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { PageHeader } from '@widgets/page-header'
import { BudgetForm } from '@features/finance/manage-budgets'
import { FLOW_TYPE_LABEL, budgetListHref, budgetListQueryOptions, financeCategoryListQueryOptions, flowTypeFromSlug, getCategoryPath } from '@entities/finance'
import { requirePageToken } from '@shared/lib/auth/token'
import { createQueryClient } from '@shared/lib/query'
import type { DismissMode } from '@shared/lib/dismiss'

interface Props {
  params: Promise<{ type: string; id: string }>
  dismiss?: DismissMode
}

export async function EditBudgetFormBody({ params, dismiss }: Props) {
  const { params: { type: slug, id }, token } = await requirePageToken(params)
  const type = flowTypeFromSlug(slug)
  if (!type) return notFound()

  const queryClient = createQueryClient()
  const [categories, budgets] = await Promise.all([
    queryClient.fetchQuery(financeCategoryListQueryOptions(type, token)),
    queryClient.fetchQuery(budgetListQueryOptions(token)),
  ])
  // 다른 type 카테고리의 예산 id로 들어오면 트리가 맞지 않아 폼이 깨진다 — 없는 예산과 같이 404
  const budget = budgets.find((b) => b.id === id)
  if (!budget || getCategoryPath(categories, budget.categoryId).length === 0) return notFound()

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader eyebrow={`${FLOW_TYPE_LABEL[type]} 예산 관리`} eyebrowHref={budgetListHref(type)} title="예산 수정" description="카테고리·적용 기간·월 예산 입력" />
      <BudgetForm type={type} initial={budget} dismiss={dismiss} />
    </HydrationBoundary>
  )
}
```

`[id]/edit/page.tsx`

```tsx
import type { Metadata } from 'next'
import { EditBudgetFormBody } from './EditBudgetFormBody'

interface Props {
  params: Promise<{ type: string; id: string }>
}

export const metadata: Metadata = {
  title: '예산 수정 | KISTA',
  description: '카테고리별 월 예산을 수정합니다',
}

export default function EditBudgetPage({ params }: Props) {
  return (
    <div className="max-w-lg mx-auto">
      <EditBudgetFormBody params={params} />
    </div>
  )
}
```

- [ ] **Step 9: 인터셉트 페이지 3쌍**

`app/(main)/@modal/(.)finance/budgets/[type]/page.tsx`

```tsx
import { BudgetListBody } from '@app/(main)/finance/budgets/[type]/BudgetListBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ type: string }>
}

export default function BudgetListModal({ params }: Props) {
  return (
    <RouteModal>
      <BudgetListBody params={params} />
    </RouteModal>
  )
}
```

`.../[type]/new/page.tsx`

```tsx
import { NewBudgetFormBody } from '@app/(main)/finance/budgets/[type]/new/NewBudgetFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ type: string }>
  searchParams: Promise<{ duplicateFrom?: string; categoryId?: string }>
}

export default function NewBudgetModal({ params, searchParams }: Props) {
  return (
    <RouteModal>
      <NewBudgetFormBody params={params} searchParams={searchParams} dismiss="back" />
    </RouteModal>
  )
}
```

`.../[type]/[id]/edit/page.tsx`

```tsx
import { EditBudgetFormBody } from '@app/(main)/finance/budgets/[type]/[id]/edit/EditBudgetFormBody'
import { RouteModal } from '@shared/ui/RouteModal'

interface Props {
  params: Promise<{ type: string; id: string }>
}

export default function EditBudgetModal({ params }: Props) {
  return (
    <RouteModal>
      <EditBudgetFormBody params={params} dismiss="back" />
    </RouteModal>
  )
}
```

세 디렉토리 각각 `loading.tsx`:

```tsx
export { ModalFormSkeleton as default } from '@shared/ui/ModalFormSkeleton'
```

- [ ] **Step 10: 검증**

Run: `npx vitest run "app/(main)/finance/(dashboard)/FinanceHeader.test.tsx" widgets/finance-budget-progress features/finance/manage-budgets entities/finance/lib/budgetRoutes.test.ts` → PASS
Run: `npm run typecheck` → 0 errors (스테일 `.next/dev/types`로 실패하면 `.next` 삭제 후 재실행)
Run: `npm run lint 2>&1 | grep -E "error|✖"` → 0 errors
Run: `grep -rn "BudgetFormDialog\|BudgetManagerDialog" --include='*.ts' --include='*.tsx' app widgets features entities shared` → 주석만 남았으면 갱신(Task 6), 코드 참조 0건

---

### Task 5: `RouteModal` — 포털 하위 팝업 ESC 가드

**Files:**
- Modify: `shared/ui/RouteModal.tsx` (keydown 핸들러의 Escape 분기)
- Modify: `shared/ui/RouteModal.test.tsx`

**Interfaces:**
- Produces: 동작 변경만 — 포커스가 `document.body`가 아닌 컨테이너 밖 요소(포털로 뜬 확인창·Select 팝업)에 있으면 ESC로 라우트 모달을 닫지 않는다.

- [ ] **Step 1: 실패 테스트** — `RouteModal.test.tsx`에 추가

```tsx
  it('포커스가 모달 밖 포털 요소(하위 확인창 등)에 있으면 Escape로 라우트를 닫지 않는다', () => {
    const portal = document.createElement('button')
    document.body.appendChild(portal)
    render(<RouteModal><h1>예산 관리</h1></RouteModal>)

    portal.focus()
    fireEvent.keyDown(portal, { key: 'Escape' })

    expect(mockBack).not.toHaveBeenCalled()
    portal.remove()
  })
```

기존 `'closes on Escape keydown'` 케이스(포커스가 컨테이너)는 그대로 통과해야 한다.

- [ ] **Step 2: 실패 확인** — `npx vitest run shared/ui/RouteModal.test.tsx` → 신규 1건 FAIL

- [ ] **Step 3: 구현** — `RouteModal.tsx` `handleKeyDown`의 Escape 분기:

```tsx
      if (event.key === 'Escape') {
        // 모달 위에 포털로 뜬 하위 확인창·Select 팝업이 ESC를 받으면 그쪽만 닫히게 둔다 — 라우트까지 닫히면
        // 예산 목록에서 삭제 확인을 ESC로 취소했는데 목록 모달도 사라진다
        const active = document.activeElement
        if (active && active !== document.body && !container.contains(active)) return
        event.stopPropagation()
        dismiss()
        return
      }
```

(`container`는 effect 상단에서 이미 null 체크된 지역 변수.)

- [ ] **Step 4: 통과 확인** — `npx vitest run shared/ui/RouteModal.test.tsx` → PASS

---

### Task 6: 실측·문서·최종 검증·리뷰·커밋

**Files:**
- Modify: `docs/agents/app.md` (인터셉팅 라우트 항목), `docs/agents/features.md` (`finance/manage-budgets` 항목 + `save-transaction`·그룹 공유 항목의 `BudgetFormDialog` 언급), `widgets/asset-settings/AssetSettingsPanel.tsx:18` 주석

- [ ] **Step 1: 실측 전제 확인** — 로컬 kista-api가 떠 있는지: `curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/actuator/health`. 안 떠 있으면 임의 기동하지 말고 실측을 건너뛰고 보고에 명시(메모리 `verify_local_api_constraint`). 떠 있으면 dev-token으로 인증 후 dev 서버(`npm run dev`, 포트는 `/tmp/kista_dev.log`)에서 Playwright로 확인. **뮤테이션(저장·삭제 확정) 금지.**

- [ ] **Step 2: 실측 시나리오** (1440×900, 390×844 각각 스크린샷)
  1. `/finance/expense` → "예산 관리" 클릭 → 목록 모달 1개(PC) / 풀페이지(모바일).
  2. 상태 필터 '전체 상태', (가능하면) 2페이지 → URL에 `status=ALL&page=2` → 수정 아이콘 → 폼이 목록을 **교체**(모달 1개) → 취소 → 목록 모달 복귀 + 필터·페이지 유지.
  3. 복제 아이콘 → 제목 "예산 복제" + 값 프리필 → ESC → 목록 복귀.
  4. 삭제 아이콘 → 확인창 → ESC → 확인창만 닫히고 목록 모달 유지(Task 5). 상태 Select 열고 ESC → 팝업만 닫힘. 둘 중 하나라도 라우트 모달까지 닫히면 Task 5 가드를 이벤트 타깃 기준(`!container.contains(event.target as Node)`)으로 보강하고 테스트 추가.
  5. 소비 탭 "예산 미설정 → 예산 등록" → 폼 직행(카테고리 프리필) → 취소 → 대시보드 복귀.
  6. 새로고침: `/finance/budgets/expense?status=ENDED`, `/finance/budgets/expense/<id>/edit`, `/finance/budgets/expense/new?duplicateFrom=<id>` 직접 진입 → 일반 페이지로 정상 렌더·프리필. `/finance/budgets/income/<소비예산id>/edit` → 404. `/finance/budgets/foo` → 404.
  7. 기존 `/finance/<assetId>/edit` 인터셉트가 여전히 동작(라우트 우선순위 회귀 없음).

- [ ] **Step 3: 문서**
  - `docs/agents/app.md` 인터셉팅 라우트 항목 끝에 추가: "**목록 자체가 라우트 모달인 경우**(예산 관리 `/finance/budgets/[type]`): 목록 → 폼 이동은 `@modal` 슬롯 교체라 목록이 unmount된다. 필터·페이지는 searchParams에 두고 `window.history.replaceState`로 쓴다(서버 왕복·인터셉트 재평가 없음, `useSearchParams` 동기화) — 폼에서 `router.back()`으로 돌아오면 그대로 복원된다. 예산 응답에 type이 없어 경로에 type 슬러그(`income|expense|saving`, `entities/finance/lib/budgetRoutes.ts`)를 싣는다. `RouteModal`의 ESC는 포커스가 컨테이너 밖 포털(하위 확인창·Select 팝업)에 있으면 무시한다."
  - `docs/agents/features.md` `finance/manage-budgets` 항목을 새 구조로 갱신: 진입은 `FinanceHeader`의 "예산 관리" 링크(`/finance/budgets/[type]`)와 `FinanceBudgetProgress` "예산 등록" 링크(`/new?categoryId=`), 폼은 `BudgetForm`(`dismiss` 분기), 목록 필터 URL 보존. 409 토스트 설명은 유지. 다른 항목의 `BudgetFormDialog` 언급은 `BudgetForm`으로 치환.
  - `AssetSettingsPanel.tsx:18` 주석: "수입/소비/저축 탭 상단 "예산 관리" 링크(`/finance/budgets/[type]`)로 이관됐다".
  - README 드리프트 확인: `grep -n "예산\|BudgetManager" README.md` — 해당 내용 있으면 갱신.

- [ ] **Step 4: 최종 검증 1회**
  - `npm run typecheck`
  - `npm run lint 2>&1 | grep -E "✖|error" | head`
  - `npm run test:run 2>&1 | grep -E "Test Files|Tests|FAIL"` → 전부 PASS

- [ ] **Step 5: 리뷰** — `pwd`로 cwd가 `/Users/phs/workspace/kista/kista-ui`인지 확인 후 `/code-review medium /Users/phs/workspace/kista/kista-ui`. 실제 결함은 수정 후 관련 테스트 재실행.

- [ ] **Step 6: 커밋** — `git diff --cached`로 남의 staged 변경 혼입 없는지 확인 후:

```bash
git add entities/finance features/finance/manage-budgets widgets/finance-budget-progress widgets/asset-settings shared/ui/RouteModal.tsx shared/ui/RouteModal.test.tsx docs/agents docs/superpowers/plans/2026-10-03-budget-route-modal.md
git add "app/(main)/finance/budgets" "app/(main)/@modal/(.)finance/budgets" "app/(main)/finance/(dashboard)/FinanceHeader.tsx" "app/(main)/finance/(dashboard)/FinanceHeader.test.tsx"
git commit -m "feat(finance): 예산 관리 중첩 모달을 인터셉팅 라우트로 전환

- /finance/budgets/[type] 목록, /new(복제·카테고리 프리필), /[id]/edit 수정 라우트 + @modal 인터셉트
- 목록 필터·페이지를 URL에 보존해 폼 왕복 후 복원
- RouteModal ESC가 포털 하위 팝업이 열려 있을 땐 라우트를 닫지 않도록 가드

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01M2zJeX43eK44HWiQjuMjUe"
```

push 금지.
