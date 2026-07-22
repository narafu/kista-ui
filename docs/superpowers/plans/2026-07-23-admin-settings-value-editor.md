# Admin Settings Value Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace comma-separated admin runtime setting inputs with structured value editors that prevent empty, duplicate, malformed, and default-mismatch errors before save.

**Architecture:** Keep the API shape unchanged and update only the admin settings client form plus its focused tests. Add small local editor components inside `features/admin/settings/ui/AdminSettingsForm.tsx` so the feature slice stays self-contained and current FSD imports remain valid.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, lucide-react, existing shadcn `Button`, `Input`, `Switch`, and semantic Tailwind tokens.

## Global Constraints

- API requests and responses keep the existing `allowedValues`, `defaultValue`, and `customizable` structure.
- 가입 승인, 증권사 등록, 전략 생성 토글 keep their current structure.
- ETF benchmark settings remain because housing benchmark comparison consumes them.
- `ValueListEditor<T>` owns list rows, default radio, add input, add button, delete button, and immediate input errors.
- `RecurringModeEditor` exposes `DEPOSIT`, `HOLD`, and `WITHDRAW` as fixed candidates with checkboxes and default radios.
- Fixed fields remain read-only and do not show a customizable switch or editing controls.
- Dark mode must use semantic tokens only; no hard-coded light-only text or border colors.
- Tests must cover add, duplicate/empty/invalid rejection, default switching, deletion guard, customizable collapse, recurring-mode behavior, reset, and save payload.

---

## File Structure

- Modify `features/admin/settings/ui/AdminSettingsForm.tsx`
  - Replace comma parsers with `ValueListEditor<T>`, `RecurringModeEditor`, and a narrower `FieldEditor<T>`.
  - Keep `AdminSettingsForm` data flow, mutation, reset, dirty detection, and validation call intact.
  - Add `useMeta()` only for INFINITE ticker suggestions.
- Modify `features/admin/settings/ui/AdminSettingsForm.test.tsx`
  - Replace comma-input tests with structured editor interaction tests.
  - Mock `@entities/meta` because the form will consume ticker metadata.
- No API, OpenAPI, entity type, route, or backend changes.

---

### Task 1: Structured Editor Tests

**Files:**
- Modify: `features/admin/settings/ui/AdminSettingsForm.test.tsx`

**Interfaces:**
- Consumes: Current `AdminSettingsForm` public component signature, `RuntimeConfig`.
- Produces: Failing tests that specify accessible names and save payloads for the new editors.

- [ ] **Step 1: Mock metadata for ticker suggestions**

Add this mock below the existing admin-settings mock:

```ts
vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      tickers: [
        { code: 'SOXL', name: 'Direxion Daily Semiconductor Bull 3X Shares' },
        { code: 'TQQQ', name: 'ProShares UltraPro QQQ' },
        { code: 'QLD', name: 'ProShares Ultra QQQ' },
        { code: 'IBIT', name: 'iShares Bitcoin Trust' },
      ],
    },
  }),
}))
```

- [ ] **Step 2: Replace comma input tests with list editor tests**

Remove tests that select `#infinite-ticker-values`, `#infinite-division-values`, `#benchmark-etf-values`, and `#benchmark-etf-default`. Add tests that interact through these accessible controls:

```ts
it('adds string and numeric allowed values through structured rows', async () => {
  const user = userEvent.setup()
  render(<AdminSettingsForm initialSettings={settings} />)

  await user.type(screen.getByRole('textbox', { name: '종목 추가' }), 'qld')
  await user.click(screen.getByRole('button', { name: '종목 추가 확정' }))
  await user.type(screen.getByRole('spinbutton', { name: '분할 수 추가' }), '40')
  await user.click(screen.getByRole('button', { name: '분할 수 추가 확정' }))
  await user.click(screen.getByRole('button', { name: /변경 저장/ }))

  expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
    strategies: expect.objectContaining({
      INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          ticker: expect.objectContaining({ allowedValues: ['SOXL', 'TQQQ', 'QLD'] }),
          divisionCount: expect.objectContaining({ allowedValues: [20, 30, 40] }),
        }),
      }),
    }),
  }), expect.any(Object))
})

it('rejects empty duplicate and malformed added values before save', async () => {
  const user = userEvent.setup()
  render(<AdminSettingsForm initialSettings={settings} />)

  await user.click(screen.getByRole('button', { name: '종목 추가 확정' }))
  expect(screen.getByRole('alert')).toHaveTextContent('값을 입력하세요.')
  await user.type(screen.getByRole('textbox', { name: '종목 추가' }), 'soxl')
  await user.click(screen.getByRole('button', { name: '종목 추가 확정' }))
  expect(screen.getByRole('alert')).toHaveTextContent('이미 추가된 값입니다.')

  await user.type(screen.getByRole('spinbutton', { name: '분할 수 추가' }), 'abc')
  await user.click(screen.getByRole('button', { name: '분할 수 추가 확정' }))
  expect(screen.getByRole('alert')).toHaveTextContent('올바른 숫자를 입력하세요.')

  await user.click(screen.getByRole('button', { name: /변경 저장/ }))
  expect(mutateMock).not.toHaveBeenCalled()
})

it('changes the default through row radios and blocks deleting the default row', async () => {
  const user = userEvent.setup()
  render(<AdminSettingsForm initialSettings={settings} />)

  await user.click(screen.getByRole('radio', { name: 'TQQQ 기본값' }))
  await user.click(screen.getByRole('button', { name: 'TQQQ 삭제' }))
  expect(screen.getByRole('alert')).toHaveTextContent('기본값은 삭제할 수 없습니다.')

  await user.click(screen.getByRole('button', { name: 'SOXL 삭제' }))
  await user.click(screen.getByRole('button', { name: /변경 저장/ }))
  expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
    strategies: expect.objectContaining({
      INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          ticker: expect.objectContaining({ allowedValues: ['TQQQ'], defaultValue: 'TQQQ' }),
        }),
      }),
    }),
  }), expect.any(Object))
})

it('collapses customizable values to the current default when user changes are disabled', async () => {
  const user = userEvent.setup()
  render(<AdminSettingsForm initialSettings={settings} />)

  await user.click(screen.getByRole('switch', { name: '분할 수 사용자 변경 허용' }))
  await user.click(screen.getByRole('button', { name: /변경 저장/ }))

  expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
    strategies: expect.objectContaining({
      INFINITE: expect.objectContaining({
        fields: expect.objectContaining({
          divisionCount: { customizable: false, allowedValues: [20], defaultValue: 20 },
        }),
      }),
    }),
  }), expect.any(Object))
})

it('edits recurring mode using fixed candidates and forces HOLD when fixed', async () => {
  const user = userEvent.setup()
  render(<AdminSettingsForm initialSettings={settings} />)

  await user.click(screen.getByRole('radio', { name: 'DEPOSIT 기본값' }))
  await user.click(screen.getByRole('checkbox', { name: 'WITHDRAW 허용' }))
  await user.click(screen.getByRole('switch', { name: '정기 입출금 방식 사용자 변경 허용' }))
  await user.click(screen.getByRole('button', { name: /변경 저장/ }))

  expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
    strategies: expect.objectContaining({
      VR: expect.objectContaining({
        fields: expect.objectContaining({
          recurringMode: { customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' },
        }),
      }),
    }),
  }), expect.any(Object))
})

it('submits benchmark ETF rows and default radio', async () => {
  const user = userEvent.setup()
  render(<AdminSettingsForm initialSettings={settings} />)

  await user.type(screen.getByRole('textbox', { name: 'ETF 벤치마크 자산 추가' }), 'qld')
  await user.click(screen.getByRole('button', { name: 'ETF 벤치마크 자산 추가 확정' }))
  await user.click(screen.getByRole('radio', { name: 'QLD 기본값' }))
  await user.click(screen.getByRole('button', { name: /변경 저장/ }))

  expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({
    benchmarks: {
      etf: { allowedValues: ['SPY', 'QQQ', 'QLD'], defaultValue: 'QLD' },
    },
  }), expect.any(Object))
})
```

- [ ] **Step 3: Run tests and confirm the old UI fails**

Run: `npm run test:run -- features/admin/settings/ui/AdminSettingsForm.test.tsx`

Expected: FAIL because controls such as `종목 추가` and `TQQQ 기본값` do not exist yet.

---

### Task 2: ValueListEditor

**Files:**
- Modify: `features/admin/settings/ui/AdminSettingsForm.tsx`

**Interfaces:**
- Consumes: `RuntimeFieldSettings<T>` and `RuntimeBenchmarkFieldSettings<string>`.
- Produces:
  - `ValueListEditor<T extends string | number>`
  - Props: `{ id, label, field, onChange, error, normalize?, inputType?, suggestions? }`
  - Behavior: add, duplicate guard, invalid-number guard, default radio, delete guard.

- [ ] **Step 1: Add imports**

Update the top imports:

```ts
import { Check, Plus, Trash2 } from 'lucide-react'
import { useMeta } from '@entities/meta'
```

Keep existing `AlertTriangle`, `RotateCcw`, and `Save`; combine lucide imports in one statement.

- [ ] **Step 2: Add helpers and `ValueListEditor` above `FieldEditor`**

Implement these helpers in `AdminSettingsForm.tsx`:

```ts
function normalizeSymbol(value: string) {
  return value.trim().toUpperCase()
}

function normalizeText(value: string) {
  return value.trim()
}

function normalizeNumber(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
```

Then add `ValueListEditor<T>` that renders:

- a `role="radiogroup"` wrapper named `${label} 기본값`
- one row per `field.allowedValues`
- radio input with `aria-label={`${String(value)} 기본값`}`
- delete `Button` with `variant="ghost"`, `size="icon"`, `aria-label={`${String(value)} 삭제`}`, and `Trash2`
- add `Input` with `aria-label={`${label} 추가`}`, `list={`${id}-suggestions`}` when suggestions exist, `type="number"` for numeric fields
- add `Button` with `aria-label={`${label} 추가 확정`}` and `Plus`
- `datalist` options for suggestions
- local `inputError` displayed with `role="alert"`
- external `error` displayed with `role="alert"` after no local error

State transitions:

```ts
onChange({ ...field, allowedValues: [...field.allowedValues, parsed], defaultValue: field.defaultValue })
onChange({ ...field, defaultValue: value })
onChange({ ...field, allowedValues: field.allowedValues.filter((item) => item !== value) })
```

Use local messages:

- empty: `값을 입력하세요.`
- duplicate: `이미 추가된 값입니다.`
- invalid number: `올바른 숫자를 입력하세요.`
- deleting default: `기본값은 삭제할 수 없습니다.`
- deleting last value: `허용값은 하나 이상 필요합니다.`

- [ ] **Step 3: Keep row styling token-based**

Use semantic classes only:

```tsx
className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-2"
className="min-w-0 flex-1 truncate font-mono text-sm"
className="text-xs text-muted-foreground"
className="text-xs text-destructive"
```

- [ ] **Step 4: Run tests**

Run: `npm run test:run -- features/admin/settings/ui/AdminSettingsForm.test.tsx`

Expected: Tests still fail until `FieldEditor` consumes `ValueListEditor`.

---

### Task 3: FieldEditor and RecurringModeEditor

**Files:**
- Modify: `features/admin/settings/ui/AdminSettingsForm.tsx`

**Interfaces:**
- Consumes: `ValueListEditor<T>`.
- Produces:
  - `FieldEditor<T>` without comma raw state.
  - `RecurringModeEditor` for VR recurring mode.

- [ ] **Step 1: Replace `FieldEditor` raw parser props**

Remove `onRawError` from `FieldEditor` props and implementation. Add optional props:

```ts
suggestions?: string[]
normalize?: (value: string) => T | null
inputType?: 'text' | 'number'
fixedValueLabel?: string
```

When `fixed` is true, render only the existing read-only row.

- [ ] **Step 2: Implement customizable switch collapse**

For generic fields, switch off with:

```ts
onChange({ ...field, customizable: false, allowedValues: [field.defaultValue] })
```

Switch on with:

```ts
onChange({ ...field, customizable: true })
```

Render `ValueListEditor` only when `field.customizable` is true. When false, render a read-only single value row under the toggle.

- [ ] **Step 3: Add `RecurringModeEditor`**

Define:

```ts
const RECURRING_MODE_OPTIONS = [
  { value: 'DEPOSIT', label: '입금' },
  { value: 'HOLD', label: '거치' },
  { value: 'WITHDRAW', label: '인출' },
] as const
```

Render checkboxes named `${value} 허용`, radios named `${value} 기본값`, and labels as `${value} · ${label}`.

Switch off must call:

```ts
onChange({ customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' })
```

If a checkbox attempts to remove the default value, show `기본값은 해제할 수 없습니다.` with `role="alert"`.

- [ ] **Step 4: Wire fields in `AdminSettingsForm`**

Add:

```ts
const { meta } = useMeta()
const tickerSuggestions = useMemo(() => meta.tickers.map((ticker) => ticker.code), [meta.tickers])
```

Use:

- ETF benchmark: `ValueListEditor<string>` directly with `normalize={normalizeSymbol}`
- INFINITE ticker: `FieldEditor` with `suggestions={tickerSuggestions}` and `normalize={normalizeSymbol}`
- INFINITE division: `FieldEditor` with `inputType="number"` and `normalize={normalizeNumber}`
- VR recurring: `RecurringModeEditor`
- VR band/interval: `FieldEditor` with `inputType="number"` and `normalize={normalizeNumber}`

Remove all `rawErrors`, `onRawError`, and `BenchmarkFieldEditor` code.

- [ ] **Step 5: Run tests**

Run: `npm run test:run -- features/admin/settings/ui/AdminSettingsForm.test.tsx`

Expected: PASS after accessible names and payload behavior match the tests.

---

### Task 4: Regression Verification

**Files:**
- Modify if needed: `features/admin/settings/ui/AdminSettingsForm.tsx`
- Modify if needed: `features/admin/settings/ui/AdminSettingsForm.test.tsx`

**Interfaces:**
- Consumes: Passing targeted tests.
- Produces: Typechecked, doctor-clean, visually checked admin settings UI.

- [ ] **Step 1: Run the validation commands**

Run:

```bash
npm run test:run -- features/admin/settings/ui/AdminSettingsForm.test.tsx
npm run typecheck
npm run doctor -- --verbose --diff
```

Expected: All commands exit 0, or any failures are fixed before continuing.

- [ ] **Step 2: Run local visual check**

Start the dev server if needed:

```bash
npm run dev
```

Capture a mobile dark-mode screenshot of the admin settings page with Playwright after authenticating if the local session allows it. If authentication blocks access, document that screenshot verification could not be completed in this environment and rely on component tests plus typecheck.

- [ ] **Step 3: Commit**

Run:

```bash
git status --short
git add features/admin/settings/ui/AdminSettingsForm.tsx features/admin/settings/ui/AdminSettingsForm.test.tsx docs/superpowers/plans/2026-07-23-admin-settings-value-editor.md
git commit -m "관리자 설정 값 목록 편집기 적용"
```

Expected: Commit succeeds. If a hook asks for doc sync, run the doc-sync agent and close it.

---

## Self-Review

- Spec coverage: all scoped fields are mapped in Task 3, including ETF benchmark, INFINITE ticker/division, fixed PRIVACY/VR tickers, recurring mode, VR band width, and interval weeks.
- Placeholder scan: no `TBD`, `TODO`, or unspecified validation steps remain.
- Type consistency: `ValueListEditor<T>`, `RecurringModeEditor`, `FieldEditor<T>`, `RuntimeFieldSettings<T>`, and `RuntimeBenchmarkFieldSettings<string>` names are consistent across tasks.
