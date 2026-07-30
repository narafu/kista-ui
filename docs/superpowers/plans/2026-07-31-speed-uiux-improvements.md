# Speed & UI/UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026-07-31 분석에서 확인된 속도·UI/UX 개선 8건을 구현한다 — 누락 skeleton, KST 날짜 통일, 레이아웃 TTFB 왕복 제거, meta Data Cache 통일, PTR 실동기화, FCM 자동 권한 팝업 제거, `/stats` hydration 이관, `/benchmark` 서버 prefetch.

**Architecture:** 기존 캐시 아키텍처(요청별 `createQueryClient()` + `prefetchQuery` + `HydrationBoundary`, React Query가 가변 데이터 SSOT)를 그대로 따르며, `/stats`의 구식 `initialData` prop 패턴을 hydration으로 이관해 아키텍처 드리프트를 제거한다. 레이아웃은 proxy가 이미 캐시한 role 쿠키를 재사용해 SSR API 왕복을 줄인다.

**Tech Stack:** Next.js 16.2, React 19.2, TanStack React Query 5.101, TypeScript 5, Vitest 4, Testing Library, Tailwind CSS 4.

## 모델 배정 (오케스트레이션 · 서브에이전트)

**오케스트레이션: Fable 5 (현 세션)** — 태스크 분배, 그룹 간 순서 제어, 태스크별 커밋 전 검수 게이트, 최종 통합 검증을 담당한다.

| Task | 내용 | 구현 서브에이전트 모델 | 근거 |
|---|---|---|---|
| 1 | `/stats`·`/benchmark` loading.tsx | **haiku** | 기존 패턴 복제 순수 마크업, 로직 없음 |
| 2 | KST 날짜 유틸 통일 | **sonnet** | 타임존 경계 테스트 필요, 여러 페이지 수정 |
| 3 | 레이아웃 getMe 제거 + FcmBridge | **sonnet** | 인증 흐름·FSD 경계를 건드리는 변경 |
| 4 | getMetaBundle Data Cache 통일 | **haiku** | 분기 제거 + 호출부 정리, 코드가 플랜에 완결 명시됨 |
| 5 | PTR 실제 동기화 (useTransition) | **sonnet** | 비동기 transition + 이벤트 테스트 |
| 6 | FCM 자동 권한 팝업 제거 | **haiku** | 조건 1줄 변경 + 소형 테스트 |
| 7 | `/stats` hydration 이관 | **sonnet** | 엔티티/위젯/페이지 3계층 시그니처 변경 |
| 8 | `/benchmark` 서버 prefetch | **sonnet** | hydration 패턴 적용, Task 7과 대칭 |

**검수**: 각 태스크 커밋 직전에 오케스트레이터가 `code-review` 계열 skill 또는 별도 리뷰어 서브에이전트(opus 권장)로 검수한다 — CLAUDE.md 검수 의무는 서브에이전트 위임 여부와 무관하게 적용.

## 실행 그룹 (파일 비중첩 병렬)

- **Group A (병렬)**: Task 1, Task 2, Task 5, Task 6 — 서로 파일 겹침 없음
- **Group B (병렬, A 완료 후)**: Task 3, Task 7, Task 8 — Task 7은 Task 2가 수정한 `app/(main)/stats/page.tsx`를 이어받음
- **Group C (B 완료 후)**: Task 4 — Task 3이 수정한 `app/(main)/layout.tsx`를 이어받음

## Global Constraints

- 구현 서브에이전트는 **직접 `git commit` 금지** — 각 태스크의 커밋 스텝은 오케스트레이터가 검수 통과 후 실행한다.
- 포맷: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지. 기존 파일 포맷 일괄 변경 금지.
- `any` 금지. FSD 단방향 의존성(`app -> widgets -> features -> entities -> shared`) 준수, entities 간 cross-import 금지.
- 캐시 규범은 `docs/agents/cache-policy.md`가 SSOT — `initialDataUpdatedAt: 0` 금지, Server prop을 canonical `initialData`로 사용 금지.
- 기본 검증은 `npm run typecheck` (lint는 신뢰 불가). 각 태스크는 focused test + typecheck 통과 후 커밋.
- 커밋 메시지 한글, author `narafu <narafu@kakao.com>`, 괄호 경로는 `git add "app/(main)/..."` 큰따옴표. `git push`는 사용자 명시 요청 시에만.
- `.next/dev/types` 스테일 참조로 typecheck 실패 시 `.next` 삭제 후 재실행 (코드 오류 아님).

---

### Task 1: `/stats`·`/benchmark` 라우트 skeleton

**Files:**
- Create: `app/(main)/stats/loading.tsx`
- Create: `app/(main)/benchmark/loading.tsx`

**Interfaces:**
- Consumes: `Skeleton`(`@/components/ui/skeleton`), `CardSkeleton`(`@shared/ui/CardSkeleton`) — 기존 컴포넌트
- Produces: 없음 (Next.js 라우트 컨벤션 파일)

참고: 기존 `app/(main)/dashboard/loading.tsx`가 패턴 원본. 라우트 skeleton은 테스트를 두지 않는 것이 기존 관례다.

- [ ] **Step 1: `/stats` skeleton 작성**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function StatsLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-20" />
        ))}
      </div>
      <CardSkeleton className="h-72 mb-4" />
      <CardSkeleton className="h-48" />
    </div>
  )
}
```

- [ ] **Step 2: `/benchmark` skeleton 작성**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function BenchmarkLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28" />
        ))}
      </div>
      <CardSkeleton className="h-72 mb-4" />
      <CardSkeleton className="h-32" />
    </div>
  )
}
```

- [ ] **Step 3: 타입 검사**

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 4: Commit**

```bash
git add "app/(main)/stats/loading.tsx" "app/(main)/benchmark/loading.tsx"
git commit -m "feat(ux): stats·benchmark 라우트 로딩 스켈레톤 추가"
```

---

### Task 2: 서버 날짜 계산 KST 통일

**Files:**
- Modify: `shared/lib/date-range.ts`
- Create: `shared/lib/date-range.test.ts`
- Modify: `app/(main)/stats/page.tsx`
- Modify: `app/(main)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `todayKst()`(`@shared/lib/format`), `kstDateMinusDays(days)`(기존 `shared/lib/date-range.ts`)
- Produces: `kstWeekStartDate(): string` — KST 오늘이 속한 주의 일요일(YYYY-MM-DD). Task 7이 수정된 `app/(main)/stats/page.tsx`를 이어받는다.

배경: Vercel 서버는 UTC라 `toISOString()`/`getDay()` 기반 날짜가 KST 오전(00~09시)에 하루 어긋난다. 저장소의 기존 해법인 `todayKst()` 기반 계산으로 통일한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/lib/date-range.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { kstDateMinusDays, kstWeekStartDate } from './date-range'

describe('kstWeekStartDate', () => {
  afterEach(() => vi.useRealTimers())

  it('KST 일요일 새벽(UTC 토요일)에는 그 일요일을 반환한다', () => {
    vi.useFakeTimers()
    // UTC 2026-07-25(토) 16:00 = KST 2026-07-26(일) 01:00
    vi.setSystemTime(new Date('2026-07-25T16:00:00Z'))
    expect(kstWeekStartDate()).toBe('2026-07-26')
  })

  it('KST 토요일 밤에는 지난 일요일을 반환한다', () => {
    vi.useFakeTimers()
    // UTC 2026-07-25(토) 14:00 = KST 2026-07-25(토) 23:00
    vi.setSystemTime(new Date('2026-07-25T14:00:00Z'))
    expect(kstWeekStartDate()).toBe('2026-07-19')
  })
})

describe('kstDateMinusDays', () => {
  afterEach(() => vi.useRealTimers())

  it('KST 자정 직후에도 KST 기준 날짜에서 차감한다', () => {
    vi.useFakeTimers()
    // UTC 2026-07-30(목) 20:00 = KST 2026-07-31(금) 05:00
    vi.setSystemTime(new Date('2026-07-30T20:00:00Z'))
    expect(kstDateMinusDays(90)).toBe('2026-05-02')
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- shared/lib/date-range.test.ts`
Expected: FAIL — `kstWeekStartDate`가 export되어 있지 않음

- [ ] **Step 3: `kstWeekStartDate` 구현**

`shared/lib/date-range.ts`의 `kstDateMinusDays` 아래에 추가:

```ts
/** KST 오늘이 속한 주의 시작일(일요일, YYYY-MM-DD) */
export function kstWeekStartDate(): string {
  const [y, m, d] = todayKst().split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay())
  return dt.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:run -- shared/lib/date-range.test.ts`
Expected: PASS

- [ ] **Step 5: `/stats` 페이지의 UTC 날짜 계산 교체**

`app/(main)/stats/page.tsx`에서 `isoDate` 함수와 `new Date()` 기반 계산을 제거하고 교체:

```tsx
import { todayKst } from '@shared/lib/format'
import { kstDateMinusDays } from '@shared/lib/date-range'

// (기존 isoDate 함수 삭제, DEFAULT_RANGE_DAYS 상수와 주석은 유지)

export default async function StatsPage() {
  const token = await getAuthToken()

  const defaultTo = todayKst()
  const defaultFrom = kstDateMinusDays(DEFAULT_RANGE_DAYS)
  // ... 이하 기존 로직에서 isoDate(to)/isoDate(from)를 defaultTo/defaultFrom으로 대체
```

- [ ] **Step 6: `/dashboard` 페이지의 UTC 날짜 계산 교체**

`app/(main)/dashboard/page.tsx`에서 `pad`/`getWeekStartDate` 함수를 삭제하고 교체:

```tsx
import { todayKst } from '@shared/lib/format'
import { kstWeekStartDate } from '@shared/lib/date-range'

export default async function DashboardPage() {
  const token = await getAuthToken()

  const [calendarYear, calendarMonth] = todayKst().split('-').map(Number)
  const initialWeekStartDate = kstWeekStartDate()
  // ... 이하 동일
```

- [ ] **Step 7: 기존 테스트 회귀 확인 + 타입 검사**

Run: `npm run test:run -- "app/(main)/dashboard" shared/lib/date-range.test.ts`
Expected: PASS — `page.test.tsx`가 주 시작일을 단언하면 KST 기준으로 기대값을 갱신한다

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 8: Commit**

```bash
git add shared/lib/date-range.ts shared/lib/date-range.test.ts "app/(main)/stats/page.tsx" "app/(main)/dashboard/page.tsx"
git commit -m "fix(date): 서버 날짜 계산을 KST 기준으로 통일"
```

---

### Task 3: 레이아웃 getMe 제거 + FcmBridge

**Files:**
- Create: `widgets/layout/FcmBridge.tsx`
- Create: `widgets/layout/FcmBridge.test.tsx`
- Modify: `app/(main)/layout.tsx`

**Interfaces:**
- Consumes: `useMeQuery()`(`@entities/user`), `FcmAutoRegister`/`FcmForegroundListener`(`@entities/fcm`) — 기존 시그니처 유지
- Produces: `<FcmBridge />` — prop 없는 Client Component. `(main)/layout.tsx`가 인증 시 마운트.

배경: 레이아웃이 매 SSR마다 `getMe`를 호출하지만 용도는 `isAdmin`·`notificationChannel` 뿐이다. role은 proxy가 `kista-user-role` 쿠키(1시간)에 이미 캐시하므로 쿠키를 우선 읽고, 로그인 직후처럼 쿠키가 아직 없는 요청만 `getMe`로 폴백한다. notificationChannel은 FSD 준수를 위해 widgets 계층의 `FcmBridge`가 `useMeQuery()`로 직접 소비한다 (entities/fcm → entities/user cross-import 금지).

- [ ] **Step 1: FcmBridge 실패 테스트 작성**

`widgets/layout/FcmBridge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { userKeys } from '@entities/user'
import { FcmBridge } from './FcmBridge'

vi.mock('@entities/fcm', () => ({
  FcmAutoRegister: () => <div data-testid="fcm-auto-register" />,
  FcmForegroundListener: () => <div data-testid="fcm-foreground-listener" />,
}))

function renderWithChannel(notificationChannel: string) {
  const client = new QueryClient()
  client.setQueryData(userKeys.me(), {
    id: 'u1', nickname: 'n', status: 'ACTIVE', hasTelegram: false,
    role: 'USER', notificationChannel,
  })
  return render(
    <QueryClientProvider client={client}>
      <FcmBridge />
    </QueryClientProvider>,
  )
}

describe('FcmBridge', () => {
  it('FCM 채널이면 FCM provider들을 마운트한다', () => {
    renderWithChannel('FCM')
    expect(screen.getByTestId('fcm-auto-register')).toBeInTheDocument()
    expect(screen.getByTestId('fcm-foreground-listener')).toBeInTheDocument()
  })

  it('TELEGRAM 채널이면 아무것도 렌더링하지 않는다', () => {
    renderWithChannel('TELEGRAM')
    expect(screen.queryByTestId('fcm-auto-register')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- widgets/layout/FcmBridge.test.tsx`
Expected: FAIL — `FcmBridge` 미존재

- [ ] **Step 3: FcmBridge 구현**

`widgets/layout/FcmBridge.tsx`:

```tsx
'use client'

import { useMeQuery } from '@entities/user'
import { FcmAutoRegister, FcmForegroundListener } from '@entities/fcm'

// notificationChannel을 레이아웃 SSR getMe 대신 canonical me query에서 소비한다.
export function FcmBridge() {
  const { data: me } = useMeQuery()
  const channel = me?.notificationChannel
  if (channel !== 'FCM' && channel !== 'ALL') return null
  return (
    <>
      <FcmAutoRegister notificationChannel={channel} />
      <FcmForegroundListener enabled />
    </>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:run -- widgets/layout/FcmBridge.test.tsx`
Expected: PASS

- [ ] **Step 5: 레이아웃에서 getMe를 쿠키 폴백으로 교체**

`app/(main)/layout.tsx` — `FcmAutoRegister`/`FcmForegroundListener` import를 `FcmBridge`로 교체하고 데이터 로딩부를 다음으로 대체:

```tsx
import { cookies } from 'next/headers'
import { FcmBridge } from '@widgets/layout/FcmBridge'
// FcmAutoRegister, FcmForegroundListener import 제거 — getMe import는 폴백용으로 유지

export default async function MainLayout({ children, modal }: Props) {
  const token = await getAuthToken()
  const cookieStore = await cookies()
  // proxy가 /me 응답으로 1시간 캐시하는 role 쿠키 — 로그인 직후 첫 요청만 미존재
  const cachedRole = cookieStore.get('kista-user-role')?.value
  const [meta, fallbackUser] = await Promise.all([
    getMetaBundle(token),
    token && !cachedRole ? getMe(token).catch(() => null) : null,
  ])

  const isAdmin = cachedRole ? cachedRole === 'ADMIN' : fallbackUser?.role === 'ADMIN'
  const isAuthenticated = !!token
```

JSX에서는 기존 두 provider 마운트를 다음으로 교체:

```tsx
        {isAuthenticated && <FcmBridge />}
```

- [ ] **Step 6: 전체 검증**

Run: `npm run test:run -- widgets/layout`
Expected: PASS

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add widgets/layout/FcmBridge.tsx widgets/layout/FcmBridge.test.tsx "app/(main)/layout.tsx"
git commit -m "perf(layout): role 쿠키 재사용으로 SSR getMe 왕복 제거"
```

---

### Task 4: getMetaBundle Data Cache 통일

**Files:**
- Modify: `entities/meta/api/index.ts`
- Modify: `app/(main)/layout.tsx` (호출부 — Task 3 이후)

**Interfaces:**
- Produces: `getMetaBundle(): Promise<MetaBundle>` — token 파라미터 제거
- Consumes: 없음 (apiFetch 의존 제거)

배경: kista-api `MetaController`는 사용자 무관 정적 메타를 permitAll + `Cache-Control: max-age=3600`으로 반환한다. 인증 시에만 no-store `apiFetch`를 타는 분기는 매 SSR마다 불필요한 왕복을 만든다. 참조 데이터는 Next.js Data Cache 허용 대상(`docs/agents/cache-policy.md`).

- [ ] **Step 1: 호출부 전수 확인**

Run: `rg -n "getMetaBundle" app widgets features entities --glob '!*.test.*'`
Expected: `entities/meta/api/index.ts`(정의)와 `app/(main)/layout.tsx`(호출)만. 다른 호출부가 있으면 Step 3에서 함께 수정.

- [ ] **Step 2: 인증 분기 제거**

`entities/meta/api/index.ts` 전체를 다음으로 교체:

```ts
import { ApiError } from '@shared/lib/api-client'
import type { MetaBundle } from '../model/types'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

// /api/meta는 permitAll + 사용자 무관 정적 메타 — 인증 여부와 관계없이 1시간 Data Cache 공유
export async function getMetaBundle(): Promise<MetaBundle> {
  const res = await fetch(`${API_BASE_URL}/api/meta`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json() as Promise<MetaBundle>
}
```

- [ ] **Step 3: 호출부 수정**

`app/(main)/layout.tsx`의 `getMetaBundle(token)`을 `getMetaBundle()`로 변경. Step 1에서 추가 호출부가 나왔다면 동일하게 인자 제거.

- [ ] **Step 4: 검증**

Run: `npm run test:run -- entities/meta`
Expected: PASS (meta 테스트가 token 인자를 전달하면 시그니처에 맞춰 갱신)

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add entities/meta "app/(main)/layout.tsx"
git commit -m "perf(meta): 메타 번들 조회를 1시간 Data Cache로 통일"
```

---

### Task 5: Pull-to-Refresh 실제 동기화

**Files:**
- Modify: `widgets/pull-to-refresh/PullToRefresh.tsx`
- Create: `widgets/pull-to-refresh/PullToRefresh.test.tsx`

**Interfaces:**
- Consumes: `useQueryClient()`(`@tanstack/react-query`), `useTransition`(React 19 async transition)
- Produces: 없음 (컴포넌트 내부 변경)

배경: 현재 PTR은 `router.refresh()` 후 고정 1200ms 타이머로 스피너를 끈다. ① 스피너가 실제 갱신과 무관하고 ② `router.refresh()`는 서버 prefetch된 쿼리만 갱신해 클라이언트 전용 쿼리(증거금·포트폴리오·stats)는 그대로다. "화면 전체 재동기화"라는 목적(`docs/agents/cache-policy.md` 허용 rationale)에 맞게 `invalidateQueries()`를 병행하고 `useTransition`으로 완료를 추적한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`widgets/pull-to-refresh/PullToRefresh.test.tsx`:

```tsx
import { render, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { PullToRefresh } from './PullToRefresh'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

// document 리스너의 e.target?.closest 호출을 위해 body에서 dispatch (Document에는 closest가 없음)
function fireTouch(type: string, clientY: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: [{ clientY }] })
  act(() => { document.body.dispatchEvent(event) })
}

describe('PullToRefresh', () => {
  it('임계값 이상 당기면 router.refresh와 전체 쿼리 무효화를 함께 실행한다', async () => {
    const client = new QueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    )
    fireTouch('touchstart', 100)
    fireTouch('touchmove', 260) // delta 160 * 0.5 = 80 > THRESHOLD(70)
    fireTouch('touchend', 260)
    await vi.waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
    expect(refresh).toHaveBeenCalled()
  })

  it('임계값 미만이면 아무것도 실행하지 않는다', () => {
    const client = new QueryClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    render(
      <QueryClientProvider client={client}>
        <PullToRefresh />
      </QueryClientProvider>,
    )
    fireTouch('touchstart', 100)
    fireTouch('touchmove', 140) // delta 40 * 0.5 = 20 < THRESHOLD
    fireTouch('touchend', 140)
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- widgets/pull-to-refresh`
Expected: FAIL — 현재 구현에 `invalidateQueries` 호출 없음 (`QueryClientProvider` 부재 오류도 실패로 간주)

- [ ] **Step 3: useTransition + invalidateQueries 구현**

`widgets/pull-to-refresh/PullToRefresh.tsx` 수정 — `refreshing` state와 `setTimeout` 제거:

```tsx
import { useEffect, useRef, useState, useCallback, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
// useRouter, RefreshCw, cn, Spinner import 유지

export function PullToRefresh() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, startTransition] = useTransition()
  // startYRef, isPullingRef, handleTouchStart, handleTouchMove 기존 유지

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return
    isPullingRef.current = false
    setPullDistance((dist) => {
      if (dist >= THRESHOLD) {
        // 서버 렌더 갱신 + 클라이언트 전용 쿼리까지 전체 재동기화, 완료 시점까지 스피너 유지
        startTransition(async () => {
          router.refresh()
          await queryClient.invalidateQueries()
        })
      }
      return 0
    })
  }, [router, queryClient])
```

렌더링부의 `refreshing`을 모두 `isRefreshing`으로 교체 (`visible`, `paddingTop`, 스피너 분기).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:run -- widgets/pull-to-refresh`
Expected: PASS

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add widgets/pull-to-refresh
git commit -m "fix(ptr): pull-to-refresh가 클라이언트 쿼리까지 실제 재동기화하도록 변경"
```

---

### Task 6: FCM 자동 권한 팝업 제거

**Files:**
- Modify: `entities/fcm/providers/FcmAutoRegister.tsx`
- Create: `entities/fcm/providers/FcmAutoRegister.test.tsx`

**Interfaces:**
- Produces: `FcmAutoRegister` props 불변 (`{ notificationChannel: NotificationChannel }`)

배경: 현재는 권한 미결정(`default`) 기기에서도 마운트 즉시 `requestFcmToken()` → `Notification.requestPermission()` 팝업이 뜬다. 사용자 제스처 없는 권한 요청은 브라우저가 차단하기도 하고 거부율이 높다. 자동 등록은 이미 허용(`granted`)된 기기로 한정한다 — 미결정 기기는 설정 화면의 채널 변경 흐름(`useFcmToken`, 사용자 제스처)이 담당한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`entities/fcm/providers/FcmAutoRegister.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FcmAutoRegister } from './FcmAutoRegister'

const requestFcmToken = vi.fn().mockResolvedValue('tok')
const registerTokenToServer = vi.fn().mockResolvedValue(undefined)
vi.mock('@entities/fcm', () => ({
  requestFcmToken: (...args: unknown[]) => requestFcmToken(...args),
  registerTokenToServer: (...args: unknown[]) => registerTokenToServer(...args),
}))

describe('FcmAutoRegister', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('권한이 granted인 기기에서만 자동 등록한다', async () => {
    vi.stubGlobal('Notification', { permission: 'granted' })
    render(<FcmAutoRegister notificationChannel="FCM" />)
    await vi.waitFor(() => expect(requestFcmToken).toHaveBeenCalled())
  })

  it('권한 미결정(default) 기기에서는 권한 팝업을 유발하지 않는다', () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    render(<FcmAutoRegister notificationChannel="FCM" />)
    expect(requestFcmToken).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- entities/fcm/providers/FcmAutoRegister.test.tsx`
Expected: FAIL — `default` 케이스에서 `requestFcmToken` 호출됨

- [ ] **Step 3: granted 한정 게이팅 구현**

`entities/fcm/providers/FcmAutoRegister.tsx`의 effect 가드를 교체:

```tsx
// 푸시 알림 채널 사용자: 이미 허용된 기기에서만 FCM 토큰을 자동 등록한다.
// 미결정(default) 기기는 설정 화면의 채널 변경(사용자 제스처)에서 권한을 요청한다 — 진입 즉시 권한 팝업 금지.
export function FcmAutoRegister({ notificationChannel }: Props) {
  useEffect(() => {
    if (notificationChannel !== 'FCM' && notificationChannel !== 'ALL') return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    requestFcmToken()
      .then((token) => { if (token) return registerTokenToServer(token) })
      .catch(() => {})
  }, [notificationChannel])

  return null
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test:run -- entities/fcm`
Expected: PASS

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 5: Commit**

```bash
git add entities/fcm/providers
git commit -m "fix(fcm): 진입 즉시 알림 권한 팝업 제거 — granted 기기만 자동 등록"
```

---

### Task 7: `/stats` hydration 이관

**Files:**
- Create: `entities/stats/model/queryOptions.ts`
- Create: `entities/stats/model/queryOptions.test.ts`
- Modify: `entities/stats/hooks/useStatsQueries.ts`
- Modify: `entities/stats/index.ts`
- Modify: `app/(main)/stats/page.tsx` (Task 2 이후 상태 기준)
- Modify: `widgets/stats-overview/StatsOverview.tsx`
- Modify: `widgets/stats-overview/StatsOverview.test.tsx` (존재 시 — 시그니처 갱신)

**Interfaces:**
- Produces: `statsSummaryQueryOptions(token?: string)`, `equityCurveQueryOptions(params: { from?: string; to?: string; type?: string }, token?: string)` — server-safe, `entities/stats` index에서 export
- Produces: `useStatsSummaryQuery(): UseQueryResult<StatsSummary>` (인자 제거), `useEquityCurveQuery(params: EquityCurveParams): UseQueryResult<EquityCurve>` (initialData 인자 제거)
- Produces: `StatsOverview` props가 `{ defaultFrom: string; defaultTo: string }`로 축소

배경: `/stats`는 Server prop → `useQuery`의 `initialData` 패턴을 유지하는 마지막 페이지다. `docs/agents/entities.md`의 "Server Component prop을 canonical initialData로 사용하지 않는다" 규칙에 맞춰 prefetch + `HydrationBoundary`로 이관하고 `isInitialParams` 분기를 제거한다.

- [ ] **Step 1: queryOptions 실패 테스트 작성**

`entities/stats/model/queryOptions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { statsKeys } from './queryKeys'
import { equityCurveQueryOptions, statsSummaryQueryOptions } from './queryOptions'

describe('stats queryOptions', () => {
  it('summary는 canonical key와 60초 staleTime을 사용한다', () => {
    const options = statsSummaryQueryOptions('server-token')
    expect(options.queryKey).toEqual(statsKeys.summary())
    expect(options.staleTime).toBe(60_000)
  })

  it('equity curve는 파라미터를 canonical key로 직렬화한다', () => {
    const options = equityCurveQueryOptions({ from: '2026-05-02', to: '2026-07-31' })
    expect(options.queryKey).toEqual(statsKeys.equityCurve('2026-05-02', '2026-07-31', 'ALL'))
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- entities/stats/model/queryOptions.test.ts`
Expected: FAIL — `queryOptions.ts` 미존재

- [ ] **Step 3: queryOptions 구현**

`entities/stats/model/queryOptions.ts`:

```ts
import { queryOptions } from '@tanstack/react-query'
import { getEquityCurve, getStatsSummary } from '../api'
import { statsKeys } from './queryKeys'
import type { EquityCurve, StatsSummary } from './types'

export function statsSummaryQueryOptions(token?: string) {
  return queryOptions<StatsSummary>({
    queryKey: statsKeys.summary(),
    queryFn: () => getStatsSummary(token),
    staleTime: 60_000,
  })
}

export function equityCurveQueryOptions(
  params: { from?: string; to?: string; type?: string },
  token?: string,
) {
  return queryOptions<EquityCurve>({
    queryKey: statsKeys.equityCurve(params.from, params.to, params.type ?? 'ALL'),
    queryFn: () => getEquityCurve(params, token),
    staleTime: 60_000,
  })
}
```

`entities/stats/index.ts`에 `export { statsSummaryQueryOptions, equityCurveQueryOptions } from './model/queryOptions'` 추가.

- [ ] **Step 4: 훅에서 initialData 인자 제거**

`entities/stats/hooks/useStatsQueries.ts`:

```ts
import { equityCurveQueryOptions, statsSummaryQueryOptions } from '../model/queryOptions'

export function useStatsSummaryQuery() {
  return useQuery(statsSummaryQueryOptions())
}

export interface EquityCurveParams {
  from?: string
  to?: string
  type?: string
}

export function useEquityCurveQuery(params: EquityCurveParams) {
  return useQuery({
    ...equityCurveQueryOptions(params),
    placeholderData: (prev) => prev,
  })
}
```

- [ ] **Step 5: 페이지를 prefetch + HydrationBoundary로 전환**

`app/(main)/stats/page.tsx` (Task 2 적용 후 기준):

```tsx
import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { equityCurveQueryOptions, statsSummaryQueryOptions } from '@entities/stats'
import { StatsOverview } from '@widgets/stats-overview'
import { PageHeader } from '@widgets/page-header'
import { createQueryClient } from '@shared/lib/query'
import { todayKst } from '@shared/lib/format'
import { kstDateMinusDays } from '@shared/lib/date-range'

export const metadata: Metadata = {
  title: '통계 | KISTA',
}

// StatsOverview 기본 range='3M'과 동일한 산식(90일 차감)이어야
// 위젯 초기 상태의 query key가 서버 prefetch key와 일치한다.
const DEFAULT_RANGE_DAYS = 90

export default async function StatsPage() {
  const token = await getAuthToken()

  const defaultTo = todayKst()
  const defaultFrom = kstDateMinusDays(DEFAULT_RANGE_DAYS)

  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(statsSummaryQueryOptions(token)),
      queryClient.prefetchQuery(
        equityCurveQueryOptions({ from: defaultFrom, to: defaultTo }, token),
      ),
    ])
  }

  return (
    <>
      <PageHeader eyebrow="Stats" title="통계" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <StatsOverview defaultFrom={defaultFrom} defaultTo={defaultTo} />
      </HydrationBoundary>
    </>
  )
}
```

- [ ] **Step 6: StatsOverview에서 initial prop 분기 제거**

`widgets/stats-overview/StatsOverview.tsx`:

```tsx
interface Props {
  defaultFrom: string
  defaultTo: string
}

export function StatsOverview({ defaultFrom, defaultTo }: Props) {
  const [range, setRange] = useState<RangeKey>('3M')
  const [strategyTypeFilter, setStrategyTypeFilter] = useState<string | undefined>(undefined)

  const summaryQuery = useStatsSummaryQuery()

  // range=3M 초기 상태는 서버 prefetch key(defaultFrom/defaultTo)와 일치해야 hydration이 적중한다.
  const from = range === '3M' ? defaultFrom : rangeToFrom(range, defaultTo)
  const curveQuery = useEquityCurveQuery({ from, to: defaultTo, type: strategyTypeFilter })
```

prefetch 실패(서버 오류) 시 클라이언트 재조회 동안 EmptyState가 오인 표시되지 않도록, `isEmpty` 계산 앞에 pending 가드 추가:

```tsx
  if (summaryQuery.isPending || curveQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <CardSkeleton className="h-24" />
        <CardSkeleton className="h-72" />
      </div>
    )
  }
```

(`import { CardSkeleton } from '@shared/ui/CardSkeleton'` 추가)

- [ ] **Step 7: 기존 테스트 시그니처 갱신**

Run: `rg -ln "useStatsSummaryQuery\(|useEquityCurveQuery\(|initialSummary|initialCurve" --glob '*.test.*' entities widgets`

나온 테스트에서 ① 훅 호출의 initialData 인자 삭제, ② `StatsOverview`에 `initialSummary`/`initialCurve` prop 전달 삭제, ③ 초기 데이터가 필요한 테스트는 `client.setQueryData(statsKeys.summary(), fixture)` 방식으로 시드.

- [ ] **Step 8: 전체 검증**

Run: `npm run test:run -- entities/stats widgets/stats-overview "app/(main)/dashboard"`
Expected: PASS

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 9: Commit**

```bash
git add entities/stats widgets/stats-overview "app/(main)/stats/page.tsx"
git commit -m "refactor(stats): initialData prop 패턴을 prefetch+hydration으로 이관"
```

---

### Task 8: `/benchmark` 서버 prefetch

**Files:**
- Modify: `app/(main)/benchmark/page.tsx`

**Interfaces:**
- Consumes: `accountListQueryOptions(token?)`(`@entities/account`), `strategyListAllQueryOptions(token?)`(`@entities/strategy`), `createQueryClient()`(`@shared/lib/query`), `todayKst()`(`@shared/lib/format`)
- Produces: 없음 (`HousingBenchmarkComparison` props 불변)

배경: `/benchmark`는 서버 prefetch가 전혀 없어 첫 페인트 후 accounts·strategies 클라이언트 조회가 이어진다. 두 목록을 hydrate해 초기 워터폴을 줄인다. `runtime-config`는 `staleTime: 0` + no-store 정책이라 prefetch 대상이 아니다. 벤치마크 비교 쿼리 자체는 사용자 선택 파라미터에 의존하므로 클라이언트 소유로 유지한다. `isoDate(new Date())`의 UTC 문제도 이 태스크에서 `todayKst()`로 함께 교체한다.

- [ ] **Step 1: 페이지 전환**

`app/(main)/benchmark/page.tsx` 전체를 다음으로 교체:

```tsx
import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { HousingBenchmarkComparison } from '@widgets/benchmark-comparison'
import { PageHeader } from '@widgets/page-header'
import { getAuthToken } from '@shared/lib/auth/token'
import { accountListQueryOptions } from '@entities/account'
import { strategyListAllQueryOptions } from '@entities/strategy'
import { createQueryClient } from '@shared/lib/query'
import { todayKst } from '@shared/lib/format'

export const metadata: Metadata = {
  title: '벤치마크 | KISTA',
}

export default async function BenchmarkPage() {
  const token = await getAuthToken()

  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(accountListQueryOptions(token)),
      queryClient.prefetchQuery(strategyListAllQueryOptions(token)),
    ])
  }

  return (
    <>
      <PageHeader eyebrow="Benchmark" title="벤치마크" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HousingBenchmarkComparison enabled defaultTo={todayKst()} />
      </HydrationBoundary>
    </>
  )
}
```

- [ ] **Step 2: 검증**

Run: `npm run test:run -- widgets/benchmark-comparison`
Expected: PASS (위젯 시그니처 불변이므로 기존 테스트 그대로 통과)

Run: `npm run typecheck`
Expected: exit code 0

- [ ] **Step 3: Commit**

```bash
git add "app/(main)/benchmark/page.tsx"
git commit -m "perf(benchmark): 계좌·전략 목록 서버 prefetch로 초기 워터폴 제거"
```

---

## 최종 통합 검증 (오케스트레이터 수행)

- [ ] `npm run test:run` — 전체 PASS
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run build` — 프로덕션 빌드 성공
- [ ] 시각 검증 (로컬 kista-api가 떠 있는 경우에만 — 임의 기동 금지):
  `npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:3000/stats /tmp/stats.png` 등으로 `/dashboard`, `/stats`, `/benchmark` 렌더링 확인. dev 서버 실제 포트는 `cat /tmp/kista_dev.log | grep "Local:"`
- [ ] 문서 드리프트 확인: `docs/agents/app.md`의 `loading.tsx` 목록에 stats·benchmark 반영, `docs/agents/entities.md`의 stats 훅 시그니처 서술이 실제와 다르면 갱신

## Migration Safety Notes

- Task 3의 role 쿠키는 proxy가 1시간 캐시한다 — role 변경 반영 지연은 proxy의 `/admin` 가드와 동일한 기존 트레이드오프이며 새 취약점이 아니다. 쿠키 미존재 시 `getMe` 폴백으로 로그인 직후 첫 요청의 정확성을 보장한다.
- Task 7에서 `useStatsCyclesQuery`(무한 스크롤)는 이미 클라이언트 소유라 건드리지 않는다.
- Task 5의 `invalidateQueries()` 전체 무효화는 PTR의 "명시적 전체 재동기화" 목적에 한정한다 — mutation 경로에 복사 금지 (`docs/agents/cache-policy.md`).
- 각 태스크는 독립 커밋으로 개별 revert 가능하다. Task 4는 Task 3 이후에만, Task 7은 Task 2 이후에만 진행한다.
