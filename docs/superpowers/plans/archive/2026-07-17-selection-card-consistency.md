# Selection Card Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전략 폼, 알림 수단, 테마의 선택형 컨트롤을 PC·모바일과 라이트·다크 모드에서 동일하고 명확한 선택 상태로 통일한다.

**Architecture:** `shared/ui/selection-card`에 도메인 지식 없는 선택 버튼을 만들고 모든 대상 feature가 이를 조합한다. 전역 CSS에는 선택 상태 시맨틱 토큰만 추가하며, 도메인 상태와 이벤트 흐름은 기존 feature에 남긴다.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library, Playwright CLI

## Global Constraints

- 선택됨은 2px 테마 대응 브랜드 외곽선, 옅은 틴트, 강한 텍스트, 얕은 외곽 링을 사용한다.
- 설명형 큰 카드는 우측 하단 체크를 표시하고 작은 세그먼트는 체크를 표시하지 않는다.
- 모든 선택 버튼은 `aria-pressed`와 별도의 `focus-visible` 링을 제공한다.
- 모바일 터치 높이는 최소 44px이며 가로 스크롤을 만들지 않는다.
- 폼 데이터, 유효성 검사, API payload 및 알림·테마 변경 동작은 바꾸지 않는다.
- 다크 모드에서 고정 라이트 로즈 팔레트 토큰을 직접 사용하지 않는다.

---

### Task 1: 공통 SelectionCard 상태 계약

**Files:**
- Create: `shared/ui/selection-card/SelectionCard.tsx`
- Create: `shared/ui/selection-card/SelectionCard.test.tsx`
- Create: `shared/ui/selection-card/index.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `SelectionCard({ selected, showIndicator?, className?, children, ...buttonProps })`
- Consumes: React button props and `cn`

- [ ] **Step 1: 선택·비선택·체크·disabled·클릭 계약을 검증하는 실패 테스트 작성**

```tsx
render(<SelectionCard selected showIndicator>푸시 알림</SelectionCard>)
expect(screen.getByRole('button', { name: /푸시 알림/ })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByTestId('selection-indicator')).toBeInTheDocument()
```

- [ ] **Step 2: 테스트가 모듈 부재로 실패하는지 확인**

Run: `npx vitest run shared/ui/selection-card/SelectionCard.test.tsx`
Expected: FAIL because `SelectionCard` does not exist.

- [ ] **Step 3: 시맨틱 토큰과 최소 공통 버튼 구현**

```tsx
export function SelectionCard({ selected, showIndicator = false, className, children, ...props }: Props) {
  return (
    <button aria-pressed={selected} className={cn(BASE, selected ? SELECTED : UNSELECTED, className)} {...props}>
      {children}
      {selected && showIndicator && <span data-testid="selection-indicator" aria-hidden="true">✓</span>}
    </button>
  )
}
```

Light/dark `--selection-*` tokens define border, background, foreground, and halo.

- [ ] **Step 4: 공통 컴포넌트 테스트 통과 확인**

Run: `npx vitest run shared/ui/selection-card/SelectionCard.test.tsx`
Expected: PASS.

### Task 2: 전략 폼 선택 컨트롤 통합

**Files:**
- Modify: `features/strategy/create-strategy/sections/StrategyTypeSection.tsx`
- Modify: `features/strategy/create-strategy/sections/DivisionCountSection.tsx`
- Modify: `features/strategy/create-strategy/sections/StrategyTickerSection.tsx`
- Modify: `features/strategy/create-strategy/sections/CycleSeedSection.tsx`
- Modify: `features/strategy/create-strategy/sections/VrSettingsSection.tsx`
- Modify: relevant section tests

**Interfaces:**
- Consumes: `SelectionCard`
- Produces: unchanged section props and events

- [ ] **Step 1: 대표 전략 섹션 테스트에 선택 indicator 유무와 공통 상태 계약 기대값 추가**

```tsx
expect(screen.getByRole('button', { name: 'VR' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByRole('button', { name: '20분할' })).toHaveAttribute('aria-pressed', 'true')
```

- [ ] **Step 2: 기존 구현이 새 공통 계약을 충족하지 않아 실패하는지 확인**

Run: `npx vitest run features/strategy/create-strategy/sections`
Expected: FAIL on new common selection expectations.

- [ ] **Step 3: 모든 선택 버튼을 SelectionCard로 교체**

전략 유형과 시드 모드는 `showIndicator`, 분할 수·종목·VR 수치 옵션은 indicator 없이 사용한다. 기존 `onClick`, disabled 계산, `aria-pressed` 의미는 유지한다.

- [ ] **Step 4: 전략 섹션 테스트 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/sections`
Expected: PASS.

### Task 3: 설정 선택 카드 통합

**Files:**
- Modify: `features/settings/notification-channel/NotificationSettings.tsx`
- Modify: `features/settings/notification-channel/NotificationSettings.test.tsx`
- Modify: `features/settings/theme-select/ThemeCards.tsx`
- Modify: `features/settings/theme-select/ThemeCards.test.tsx`

**Interfaces:**
- Consumes: `SelectionCard`
- Produces: unchanged notification mutation and theme selection behavior

- [ ] **Step 1: 알림 수단과 테마의 공통 체크 indicator 및 접근성 테스트 작성**

```tsx
expect(screen.getByRole('button', { name: /푸시 알림/ })).toHaveAttribute('aria-pressed', 'true')
expect(within(selectedCard).getByTestId('selection-indicator')).toBeInTheDocument()
```

- [ ] **Step 2: 현재 독립 구현에서 테스트 실패 확인**

Run: `npx vitest run features/settings/notification-channel features/settings/theme-select`
Expected: FAIL on shared indicator/accessibility expectations.

- [ ] **Step 3: 알림 2열/PC 4열과 테마 공통 카드 구현**

알림 수단 컨테이너는 `grid grid-cols-2 lg:grid-cols-4`; 두 feature 모두 `SelectionCard selected={...} showIndicator`를 사용하고 기존 인라인 선택 테두리·색상·체크 구현을 제거한다.

- [ ] **Step 4: 설정 feature 테스트 통과 확인**

Run: `npx vitest run features/settings/notification-channel features/settings/theme-select`
Expected: PASS.

### Task 4: 문서·정적 검증·반응형 시각 검증

**Files:**
- Modify: `docs/agents/features.md`
- Modify: `docs/agents/shared.md`

**Interfaces:**
- Consumes: completed implementation
- Produces: current architecture documentation

- [ ] **Step 1: 실제 공통 UI 경로와 적용 feature를 공유 문서에 기록**

`features.md`에는 전략/알림/테마가 공통 선택 UI를 소비함을, `shared.md`에는 `SelectionCard`의 상태 계약을 기록한다.

- [ ] **Step 2: 관련 테스트와 타입 검사 실행**

Run: `npx vitest run shared/ui/selection-card features/strategy/create-strategy/sections features/settings/notification-channel features/settings/theme-select && npm run typecheck`
Expected: all tests PASS and typecheck exits 0.

- [ ] **Step 3: React Doctor 회귀 검사**

Run: `npx react-doctor@latest --verbose --diff`
Expected: no new errors and score does not regress.

- [ ] **Step 4: Playwright로 PC·모바일, 라이트·다크 등록/수정/설정 화면 확인**

PC 1440×1000 및 모바일 390×844에서 선택 외곽선·체크·focus-visible·disabled·가로 오버플로를 확인하고 스크린샷을 비교한다.

- [ ] **Step 5: diff 및 문서 동기화 검토 후 커밋**

Run: `git diff --check && git status --short`
Expected: whitespace errors 없음, 작업 범위 파일만 변경됨.
