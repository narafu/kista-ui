# 계좌번호 공개 토글 전체 적용 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계좌번호가 표시되는 모든 위치에 RevealableValue 토글(눈 아이콘)을 적용한다.

**Architecture:** 이미 존재하는 `widgets/revealable-value/RevealableValue.tsx`를 미적용 7개 위치에 교체 적용. `StrategyCard`의 `accountLabel` prop 타입을 `string | ReactNode`로 확장하여 `AllStrategiesList`에서 RevealableValue 노드를 전달하도록 변경.

**Tech Stack:** Next.js 16 App Router, TypeScript, React, RevealableValue (기존 컴포넌트)

## Global Constraints

- `'use client'` 없는 Server Component 파일에 RevealableValue 직접 삽입 가능 — RevealableValue 자체가 Client Component이며 Server Component 내부에 임포트 허용
- `e.stopPropagation()` — RevealableValue 내부에 이미 구현됨. Link 컴포넌트 내부 사용 시 추가 처리 불필요
- 공통 패턴: `value={account.accountNo ?? account.accountNoMasked}` / `hiddenDisplay={account.accountNoMasked}`
- 포맷 무단 변경 금지: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지
- 타입 체크: `npm run typecheck` (lint 불가, typecheck만 사용)
- 인라인 `style={{ display: ... }}` 금지 — display는 className으로만

---

### Task 1: StrategyCard accountLabel prop 타입 확장

**Files:**
- Modify: `widgets/strategy-card/StrategyCard.tsx`

**Interfaces:**
- Produces: `accountLabel?: string | ReactNode` — AllStrategiesList에서 ReactNode를 전달할 수 있게 됨

- [ ] **Step 1: StrategyCard.tsx 수정**

`widgets/strategy-card/StrategyCard.tsx` 상단 import에 `ReactNode` 추가 후 Props 타입 변경:

```tsx
import type { ReactNode } from 'react'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string | ReactNode
}
```

모바일 렌더링(line 53)과 PC 렌더링(line 96)의 `accountLabel` 표시 부분은 기존 그대로 유지 — `ReactNode`를 직접 렌더링하므로 추가 변경 없음.

- [ ] **Step 2: 타입 체크**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add "widgets/strategy-card/StrategyCard.tsx"
git commit -m "feat(strategy-card): accountLabel prop을 string | ReactNode로 확장"
```

---

### Task 2: AllStrategiesList — accountLabel에 RevealableValue 전달

**Files:**
- Modify: `widgets/all-strategies/AllStrategiesList.tsx`

**Interfaces:**
- Consumes: `RevealableValue` from `@widgets/revealable-value`, Task 1의 확장된 `accountLabel` prop
- Consumes: `Account.accountNo?: string`, `Account.accountNoMasked: string`

- [ ] **Step 1: AllStrategiesList.tsx 수정**

전략 목록 렌더링 섹션(`accountMap` 정의부)을 아래와 같이 교체:

```tsx
import { RevealableValue } from '@widgets/revealable-value'

// 기존 (line 75):
// const accountMap = new Map(accounts.map((a) => [a.id, a.accountNoMasked]))

// 변경 후:
const accountMap = new Map(
  accounts.map((a) => [
    a.id,
    <RevealableValue
      key={a.id}
      value={a.accountNo ?? a.accountNoMasked}
      hiddenDisplay={a.accountNoMasked}
    />,
  ])
)
```

EmptyState 내 계좌 링크(line 41)도 교체:

```tsx
// 기존:
// {account.accountNoMasked}

// 변경 후:
<RevealableValue
  value={account.accountNo ?? account.accountNoMasked}
  hiddenDisplay={account.accountNoMasked}
/>
```

- [ ] **Step 2: 타입 체크**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add "widgets/all-strategies/AllStrategiesList.tsx"
git commit -m "feat(all-strategies): 계좌번호 RevealableValue 토글 적용"
```

---

### Task 3: AccountCard — 모바일·PC 계좌번호 토글 적용

**Files:**
- Modify: `widgets/account-card/AccountCard.tsx`

**Interfaces:**
- Consumes: `RevealableValue` from `@widgets/revealable-value`
- Consumes: `Account.accountNo?: string`, `Account.accountNoMasked: string`

- [ ] **Step 1: AccountCard.tsx 수정**

`RevealableValue` import 추가 및 두 곳(모바일 line 57, PC line 107) 교체:

```tsx
import { RevealableValue } from '@widgets/revealable-value'
```

모바일 계좌번호 (기존 line 56-58):
```tsx
// 기존:
// <span className="ml-auto text-xs font-mono font-semibold text-foreground/60 tracking-wider shrink-0">
//   {account.accountNoMasked}
// </span>

// 변경 후:
<span className="ml-auto text-xs font-mono font-semibold text-foreground/60 tracking-wider shrink-0">
  <RevealableValue
    value={account.accountNo ?? account.accountNoMasked}
    hiddenDisplay={account.accountNoMasked}
  />
</span>
```

PC 계좌번호 (기존 line 106-108):
```tsx
// 기존:
// <span className="text-xs font-mono font-semibold text-foreground/60 tracking-wider">
//   {account.accountNoMasked}
// </span>

// 변경 후:
<span className="text-xs font-mono font-semibold text-foreground/60 tracking-wider">
  <RevealableValue
    value={account.accountNo ?? account.accountNoMasked}
    hiddenDisplay={account.accountNoMasked}
  />
</span>
```

- [ ] **Step 2: 타입 체크**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add "widgets/account-card/AccountCard.tsx"
git commit -m "feat(account-card): 계좌번호 RevealableValue 토글 적용"
```

---

### Task 4: AccountSummaryCard — KpiCard 계좌번호 토글 적용

**Files:**
- Modify: `widgets/account-detail/AccountSummaryCard.tsx`

**Interfaces:**
- Consumes: `RevealableValue` from `@widgets/revealable-value`
- Consumes: `Account.accountNo?: string`, `Account.accountNoMasked: string`

- [ ] **Step 1: AccountSummaryCard.tsx 수정**

`RevealableValue` import 추가 및 KpiCard value 교체:

```tsx
import { RevealableValue } from '@widgets/revealable-value'
```

KpiCard 계좌번호 (기존 line 30):
```tsx
// 기존:
// <KpiCard label="계좌번호" value={<span className="font-mono tracking-wider">{account.accountNoMasked}</span>} />

// 변경 후:
<KpiCard
  label="계좌번호"
  value={
    <RevealableValue
      value={account.accountNo ?? account.accountNoMasked}
      hiddenDisplay={account.accountNoMasked}
    />
  }
/>
```

- [ ] **Step 2: 타입 체크**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add "widgets/account-detail/AccountSummaryCard.tsx"
git commit -m "feat(account-detail): 계좌번호 RevealableValue 토글 적용"
```

---

### Task 5: statistics 페이지 — 계좌번호 토글 적용

**Files:**
- Modify: `app/(main)/statistics/page.tsx`

**Interfaces:**
- Consumes: `RevealableValue` from `@widgets/revealable-value`
- Consumes: `Account.accountNo?: string`, `Account.accountNoMasked: string`

- [ ] **Step 1: statistics/page.tsx 수정**

`RevealableValue` import 추가 및 계좌번호 span 교체:

```tsx
import { RevealableValue } from '@widgets/revealable-value'
```

계좌번호 표시 (기존 line 44):
```tsx
// 기존:
// <span className="text-[11.5px] text-muted-foreground">{account.accountNoMasked}</span>

// 변경 후:
<span className="text-[11.5px] text-muted-foreground">
  <RevealableValue
    value={account.accountNo ?? account.accountNoMasked}
    hiddenDisplay={account.accountNoMasked}
  />
</span>
```

- [ ] **Step 2: 타입 체크**

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
git add "app/(main)/statistics/page.tsx"
git commit -m "feat(statistics): 계좌번호 RevealableValue 토글 적용"
```

---

### Task 6: 어드민 accounts·logs 페이지 — 계좌번호 토글 적용

**Files:**
- Modify: `app/(admin)/admin/accounts/page.tsx`
- Modify: `app/(admin)/admin/logs/page.tsx`

**Interfaces:**
- Consumes: `RevealableValue` from `@widgets/revealable-value`
- 어드민 계좌 타입 내 `accountNoMasked`, `accountNo` 필드 사용

- [ ] **Step 1: admin/accounts/page.tsx 수정**

`RevealableValue` import 추가 및 계좌번호 td 교체:

```tsx
import { RevealableValue } from '@widgets/revealable-value'
```

계좌번호 td (기존 line 35):
```tsx
// 기존:
// <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{acc.accountNoMasked}</td>

// 변경 후:
<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
  <RevealableValue
    value={acc.accountNo ?? acc.accountNoMasked}
    hiddenDisplay={acc.accountNoMasked}
  />
</td>
```

- [ ] **Step 2: admin/logs/page.tsx 수정**

`RevealableValue` import 추가 및 계좌번호 td 교체:

```tsx
import { RevealableValue } from '@widgets/revealable-value'
```

계좌번호 td (기존 line 197):
```tsx
// 기존:
// <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.accountNoMasked}</td>

// 변경 후:
<td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
  <RevealableValue
    value={a.accountNo ?? a.accountNoMasked}
    hiddenDisplay={a.accountNoMasked}
  />
</td>
```

- [ ] **Step 3: 타입 체크**

어드민 페이지에서 사용하는 타입에 `accountNo` 필드가 없을 수 있음. 오류 발생 시 `acc.accountNoMasked`만 value로 사용:

```tsx
<RevealableValue
  value={acc.accountNoMasked}
  hiddenDisplay={acc.accountNoMasked}
/>
```

```bash
npm run typecheck
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add "app/(admin)/admin/accounts/page.tsx" "app/(admin)/admin/logs/page.tsx"
git commit -m "feat(admin): 계좌번호 RevealableValue 토글 적용"
```
