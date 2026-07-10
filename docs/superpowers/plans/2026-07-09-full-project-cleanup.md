# KISTA UI 전체 프로젝트 정리 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 동작을 보존하면서 발견된 버그 3건을 수정하고, 중복·데드코드를 제거해 코드를 축소하며, 문서를 코드와 일치시킨다.

**Architecture:** 전수 코드 리뷰(4렌즈: 과잉구축/취약/누락/구조충돌)에서 나온 결과를 임팩트 순으로 실행한다. 버그 수정 → 취약점(KST 날짜 처리) → 중복 통합(shared/lib/date-range.ts 신설) → 데드코드 제거 → 구조 정리 → 문서 현행화 순. 각 태스크는 독립적으로 커밋 가능하며, 매 태스크 후 `npm run typecheck && npm run test:run`으로 회귀를 확인한다.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · React Query · Vitest · Tailwind CSS

**절대 규칙 (이 저장소의 CLAUDE.md에서 발췌 — 반드시 준수):**
- 포맷: 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백 (`{ useState }`)
- 새 코드는 FSD alias(`@shared/*`, `@entities/*`, `@features/*`, `@widgets/*`)만 사용
- `git push` 금지 (커밋만). 괄호 경로는 `git add "app/(main)/..."` 큰따옴표 필수
- 커밋 author: `narafu <narafu@kakao.com>` (`git config user.name`으로 확인)
- 기능 작업 중 무관한 파일의 포맷 일괄 변경 금지

---

## 열린 질문 (사용자 확인 필요 — 실행자는 이 항목들을 건드리지 말 것)

1. **로그아웃 리다이렉트 정책 불일치**: `features/auth/logout/LogoutButton.tsx`는 로그아웃 후 `/dashboard`(공개 대시보드)로, `shared/lib/api-client`의 `doLogout()`은 `/login`으로 보낸다. 어느 쪽이 의도인가? → 답을 받기 전까지 수정하지 않는다.
2. **FCM 토큰 해제 기능**: `app/api/fcm/tokens/[token]/route.ts`에 DELETE 핸들러가 있으나 클라이언트에서 호출하는 코드가 없다(`unregisterTokenFromServer` 미구현 — docs에는 있다고 기재). 알림 채널을 NONE/TELEGRAM으로 바꿔도 서버에 FCM 토큰이 남는다. (a) 해제 기능을 구현할지, (b) DELETE 라우트를 삭제할지 결정 필요. → 이 계획에서는 양쪽 다 보류하고 문서만 수정한다.
3. **`app/(admin)/admin/logs/page.tsx` 356줄**: 서버 페이지 안에 프레젠테이션 서브컴포넌트 3개가 인라인돼 있어 "app은 라우팅·데이터 조합만" 규칙과 충돌한다. widgets로 이동할지? → churn 대비 이득이 작아 이 계획에서 제외. 원하면 별도 작업으로.
4. **`entities/user`에 admin 도메인 집중**: `AdminTrade`, `AdminAccount`, `AdminReorder*` 등 admin 전용 타입·API가 모두 user 슬라이스에 있다. `entities/admin` 분리 여부는 규모가 커서 이 계획에서 제외. 원하면 별도 작업으로.
5. **proxy.ts status/role 캐시 쿠키의 재검증 간격(1시간)**: JWT가 무효화돼도 최대 1시간 캐시로 통과하는 알려진 트레이드오프(문서에 기재됨). 강화 여부는 정책 결정 사항이라 건드리지 않는다.

---

## 사전 준비 (Task 0): 검증 기준선 확보

**배경:** `npm run typecheck`가 현재 실패하는데, 원인은 코드가 아니라 삭제된 라우트(`app/api/portfolio/**`, `app/api/privacy-trades/**`, `app/api/strategies/**`, `app/api/settings/*` 개별 라우트)를 참조하는 스테일 산출물 `.next/dev/types/validator.ts` 때문이다.

- [ ] **Step 1: dev 서버가 떠 있으면 종료한다** (포트 3000/3001 점유 프로세스 확인)

- [ ] **Step 2: 스테일 산출물 삭제**

PowerShell 기준:
```powershell
Remove-Item -Recurse -Force .next -Confirm:$false
```

- [ ] **Step 3: typecheck 기준선 확인**

Run: `npm run typecheck`
Expected: 오류 0건으로 통과 (실패하면 실제 코드 오류이므로 진행 전 사용자에게 보고)

- [ ] **Step 4: 테스트 기준선 확인**

Run: `npm run test:run`
Expected: `Test Files 27 passed / Tests 117 passed` (2026-07-09 기준선)

커밋 없음 (변경 파일 없음).

---

## Task 1: [버그] 전략 수정 후 주문 미리보기 무효화 키 불일치 수정

**증상:** `useUpdateStrategyMutation`이 `['nextOrderPreview']` 키를 무효화하지만, 실제 주문 미리보기 쿼리 키는 `['order-preview', 'strategy', strategyId]`다(`entities/order/hooks/useOrderQueries.ts:10`). 전략 수정 직후 전략 상세의 "다음 주문" 카드가 갱신되지 않는다.

**Files:**
- Modify: `entities/strategy/hooks/useStrategyQueries.ts:86`
- Test: `entities/strategy/hooks/useStrategyQueries.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

`entities/strategy/hooks/useStrategyQueries.test.tsx`에 아래를 추가한다. 파일 상단 import에 `useMutation`, `useQueryClient`, `useUpdateStrategyMutation`을 추가해야 한다:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAllStrategiesQuery, useStrategiesQuery, useUpdateStrategyMutation } from './useStrategyQueries'
```

파일 끝에 테스트 블록 추가:

```tsx
describe('useUpdateStrategyMutation', () => {
  it('수정 성공 시 실제 주문 미리보기 쿼리 키(order-preview)를 무효화한다', () => {
    const invalidateQueries = vi.fn()
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never)
    vi.mocked(useMutation).mockReturnValue({} as never)

    renderHook(() => useUpdateStrategyMutation('strategy-1'))

    const options = vi.mocked(useMutation).mock.calls.at(-1)?.[0] as unknown as { onSuccess: () => void }
    options.onSuccess()

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['order-preview'] })
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run entities/strategy/hooks/useStrategyQueries.test.tsx`
Expected: FAIL — `['order-preview']`로 호출되지 않음 (`['nextOrderPreview']`로 호출됨)

- [ ] **Step 3: 수정**

`entities/strategy/hooks/useStrategyQueries.ts` 86행:

```ts
// 변경 전
      queryClient.invalidateQueries({ queryKey: ['nextOrderPreview'] })
// 변경 후
      queryClient.invalidateQueries({ queryKey: ['order-preview'] })
```

(prefix 매칭이므로 `['order-preview']`가 `['order-preview', 'strategy', id]`를 모두 무효화한다)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run entities/strategy/hooks/useStrategyQueries.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add entities/strategy/hooks/useStrategyQueries.ts entities/strategy/hooks/useStrategyQueries.test.tsx
git commit -m "fix(strategy): 전략 수정 후 주문 미리보기 무효화 키 불일치 수정"
```

---

## Task 2: [버그] Admin Overview 승인 대기 목록 5명 제한 복원

**증상:** `app/(admin)/admin/page.tsx`가 `recentPending = pendingUsers.slice(0, 5)`를 `AdminPendingList`의 `initialData`로 넘기지만, 이 initialData는 `initialDataUpdatedAt: 0`으로 즉시 stale 처리되어 마운트 직후 전체 PENDING 목록으로 리페치된다. "최대 5명만 표시" 의도가 첫 페인트에서만 유지된다. `AdminPendingList`에 이미 `max` prop이 있는데 아무도 사용하지 않는다.

**Files:**
- Modify: `app/(admin)/admin/page.tsx:47`

- [ ] **Step 1: 수정**

```tsx
// 변경 전
        <AdminPendingList initialUsers={recentPending} />
// 변경 후
        <AdminPendingList initialUsers={recentPending} max={5} />
```

- [ ] **Step 2: 검증**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add "app/(admin)/admin/page.tsx"
git commit -m "fix(admin): Overview 승인 대기 목록 5명 제한이 리페치 후에도 유지되도록 max 전달"
```

---

## Task 3: [버그] admin 레이아웃 중복 Toaster 제거

**증상:** `docs/agents/app.md` 규칙 — "Toaster는 루트 `app/layout.tsx`에 단 하나만, 하위 레이아웃 추가 금지. 중복 시 toast 하나가 두 개 표시". 그런데 `app/(admin)/layout.tsx:17`에 두 번째 `<Toaster>`가 있다 (루트 레이아웃이 admin 그룹도 감싼다).

**Files:**
- Modify: `app/(admin)/layout.tsx`
- Modify: `app/(admin)/layout.test.tsx`

- [ ] **Step 1: 레이아웃에서 Toaster 제거**

`app/(admin)/layout.tsx`에서 `import { Toaster } from 'sonner'` 라인과 `<Toaster richColors position="top-right" />` 라인을 삭제한다. 결과:

```tsx
import { AdminSidebar } from '@widgets/layout/AdminSidebar'
import { AdminTopBar } from '@widgets/layout/AdminTopBar'
import { PullToRefresh } from '@widgets/pull-to-refresh'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <AdminTopBar />
        <PullToRefresh />
        <main className="flex-1 p-4 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 테스트의 불필요한 sonner mock 제거**

`app/(admin)/layout.test.tsx`에서 아래 블록을 삭제한다:

```tsx
vi.mock('sonner', () => ({
  Toaster: () => <div data-testid='toaster' />,
}))
```

- [ ] **Step 3: 검증**

Run: `npx vitest run "app/(admin)/layout.test.tsx"` 후 `npm run typecheck`
Expected: 둘 다 PASS

- [ ] **Step 4: 커밋**

```bash
git add "app/(admin)/layout.tsx" "app/(admin)/layout.test.tsx"
git commit -m "fix(admin): 루트 레이아웃과 중복되는 admin Toaster 제거"
```

---

## Task 4: [취약] proxy.ts 쿠키 secure 플래그를 요청 프로토콜 기반으로 통일

**배경:** `docs/agents/app.md` 규칙 — "secure 플래그는 `NODE_ENV`가 아닌 `x-forwarded-proto === 'https'`로 결정" (Safari가 HTTP 연결의 Secure 쿠키를 무시하기 때문). `app/auth/callback/route.ts`, `app/api/auth/refresh/route.ts`, proxy.ts의 AT 갱신 쿠키(107행)는 모두 이 규칙을 따르는데, proxy.ts의 status/role 캐시 쿠키만 `NODE_ENV === 'production'`(12행)을 쓴다. 로컬 Docker production 빌드(http)에서 캐시 쿠키가 저장되지 않아 매 요청 `/me`를 호출하게 된다.

**Files:**
- Modify: `proxy.ts:9-16, 173-176`

- [ ] **Step 1: COOKIE_OPTIONS 상수를 요청 기반 함수로 변경**

`proxy.ts` 9-16행:

```ts
// 변경 전
// status/role 캐시: 1시간마다 만료 → /me 재호출로 JWT 유효성 재검증
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 3600,
  path: '/',
}

// 변경 후
// status/role 캐시: 1시간마다 만료 → /me 재호출로 JWT 유효성 재검증
// secure는 NODE_ENV가 아닌 실제 프로토콜 기준 (docs/agents/app.md — Safari HTTP Secure 쿠키 무시)
const cacheCookieOptions = (request: NextRequest) => ({
  httpOnly: true,
  secure: request.headers.get('x-forwarded-proto') === 'https',
  sameSite: 'lax' as const,
  maxAge: 3600,
  path: '/',
})
```

- [ ] **Step 2: 사용처 변경**

`proxy.ts` 173-176행:

```ts
// 변경 전
  if (needsCacheUpdate && status !== 'PENDING') {
    response.cookies.set(STATUS_COOKIE, status, COOKIE_OPTIONS)
    response.cookies.set(ROLE_COOKIE, role, COOKIE_OPTIONS)
  }

// 변경 후
  if (needsCacheUpdate && status !== 'PENDING') {
    const opts = cacheCookieOptions(request)
    response.cookies.set(STATUS_COOKIE, status, opts)
    response.cookies.set(ROLE_COOKIE, role, opts)
  }
```

- [ ] **Step 3: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add proxy.ts
git commit -m "fix(proxy): status/role 캐시 쿠키 secure 플래그를 x-forwarded-proto 기준으로 통일"
```

---

## Task 5: [신규 유틸] shared/lib/date-range.ts 신설 (KST 기준 날짜 범위 + 파서 통합)

**배경:** 동일한 날짜 범위 계산·searchParams 파싱 로직이 7곳에 중복돼 있다:
- `app/(admin)/admin/{logs,accounts,trades,users,privacy-trades}/page.tsx` — `parseRangePreset`/`parseSize`/`parsePage`/`resolveFromTo`/`VALID_SIZES`
- `widgets/cycle-history/lib/buildParams.ts` — `RangeType`/`RANGE_LABELS`/`buildParams`
- `widgets/strategy-detail/StrategyOrderHistory.tsx` — 위와 동일 로직 재정의

또한 전부 `new Date().toISOString()`(**UTC**)을 쓴다. 한국 시간 오전 0~9시에는 UTC 날짜가 전날이라 `to`가 어제로 잡혀 당일 데이터가 누락된다. 기존 `todayKst()`(`shared/lib/format`)를 기준으로 통일한다.

**Files:**
- Create: `shared/lib/date-range.ts`
- Test: `shared/lib/date-range.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성** — `shared/lib/date-range.test.ts` 생성:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  kstDateMinusDays,
  parsePage,
  parseRangePreset,
  parseSize,
  resolveRange,
  resolveRangeStrict,
} from './date-range'

afterEach(() => {
  vi.useRealTimers()
})

// UTC 2026-07-08 20:00 = KST 2026-07-09 05:00 — UTC 날짜와 KST 날짜가 갈리는 시각
function freezeAtKstMorning() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-08T20:00:00Z'))
}

describe('kstDateMinusDays', () => {
  it('KST 오늘 기준으로 N일 전 날짜를 반환한다 (UTC 날짜가 아님)', () => {
    freezeAtKstMorning()
    expect(kstDateMinusDays(0)).toBe('2026-07-09')
    expect(kstDateMinusDays(7)).toBe('2026-07-02')
  })
})

describe('resolveRange', () => {
  it('7d는 KST 오늘 기준 7일 전 ~ 오늘', () => {
    freezeAtKstMorning()
    expect(resolveRange('7d')).toEqual({ from: '2026-07-02', to: '2026-07-09' })
  })
  it('30d는 KST 오늘 기준 30일 전 ~ 오늘', () => {
    freezeAtKstMorning()
    expect(resolveRange('30d')).toEqual({ from: '2026-06-09', to: '2026-07-09' })
  })
  it('all은 빈 객체(전체 기간)', () => {
    expect(resolveRange('all')).toEqual({})
  })
  it('custom은 입력을 그대로 통과시킨다 (미완성이어도)', () => {
    expect(resolveRange('custom', '2026-01-01', '2026-01-31')).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    expect(resolveRange('custom')).toEqual({ from: undefined, to: undefined })
  })
})

describe('resolveRangeStrict', () => {
  it('custom인데 from/to가 미완성이면 null (조회 보류)', () => {
    expect(resolveRangeStrict('custom', '', '')).toBeNull()
    expect(resolveRangeStrict('custom', '2026-01-01', '')).toBeNull()
  })
  it('완성된 custom과 프리셋은 resolveRange와 동일', () => {
    expect(resolveRangeStrict('custom', '2026-01-01', '2026-01-31')).toEqual({ from: '2026-01-01', to: '2026-01-31' })
    expect(resolveRangeStrict('all', '', '')).toEqual({})
  })
})

describe('parseRangePreset', () => {
  it('유효한 값은 그대로, 그 외는 fallback', () => {
    expect(parseRangePreset('30d', '7d')).toBe('30d')
    expect(parseRangePreset('bogus', '7d')).toBe('7d')
    expect(parseRangePreset(undefined, 'all')).toBe('all')
  })
})

describe('parseSize', () => {
  it('허용 목록(10/30/50/100)만 통과, 그 외 10', () => {
    expect(parseSize('50')).toBe(50)
    expect(parseSize('999')).toBe(10)
    expect(parseSize(undefined)).toBe(10)
  })
})

describe('parsePage', () => {
  it('1 이상 정수만 통과, 그 외 1', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage('0')).toBe(1)
    expect(parsePage('abc')).toBe(1)
    expect(parsePage(undefined)).toBe(1)
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run shared/lib/date-range.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현** — `shared/lib/date-range.ts` 생성:

```ts
// KST(Asia/Seoul) 기준 날짜 범위 계산 + searchParams 파서.
// 서버(UTC)·브라우저 어디서 실행돼도 같은 결과를 내도록 todayKst()를 기준으로 한다.
import { todayKst } from '@shared/lib/format'

export type RangePreset = '7d' | '30d' | 'all' | 'custom'

export const RANGE_LABELS: Record<RangePreset, string> = {
  '7d': '7일',
  '30d': '30일',
  all: '전체',
  custom: '직접입력',
}

/** KST 오늘로부터 days일 전 날짜 (YYYY-MM-DD) */
export function kstDateMinusDays(days: number): string {
  const [y, m, d] = todayKst().split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - days)
  return dt.toISOString().slice(0, 10)
}

/**
 * 프리셋 → { from, to } 변환.
 * - all: {} (전체 기간)
 * - custom: 입력 그대로 통과 (서버 페이지는 미완성 custom을 전체 조회로 처리)
 * - 7d/30d: KST 오늘 기준 N일 전 ~ 오늘
 */
export function resolveRange(
  preset: RangePreset,
  from?: string,
  to?: string,
): { from?: string; to?: string } {
  if (preset === 'all') return {}
  if (preset === 'custom') return { from, to }
  const days = preset === '7d' ? 7 : 30
  return { from: kstDateMinusDays(days), to: todayKst() }
}

/** custom인데 from/to가 미완성이면 null — 클라이언트 테이블의 조회 보류용 */
export function resolveRangeStrict(
  preset: RangePreset,
  from?: string,
  to?: string,
): { from?: string; to?: string } | null {
  if (preset === 'custom' && (!from || !to)) return null
  return resolveRange(preset, from, to)
}

const VALID_SIZES = new Set(['10', '30', '50', '100'])

export function parseRangePreset(raw: string | undefined, fallback: RangePreset): RangePreset {
  return raw === '7d' || raw === '30d' || raw === 'all' || raw === 'custom' ? raw : fallback
}

export function parseSize(raw: string | undefined): number {
  return raw !== undefined && VALID_SIZES.has(raw) ? Number(raw) : 10
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run shared/lib/date-range.test.ts`
Expected: PASS (전체)

- [ ] **Step 5: 커밋**

```bash
git add shared/lib/date-range.ts shared/lib/date-range.test.ts
git commit -m "feat(shared): KST 기준 날짜 범위·searchParams 파서 유틸 date-range 신설"
```

---

## Task 6: [중복 제거] admin 5개 페이지를 date-range 유틸로 전환

**Files:**
- Modify: `app/(admin)/admin/logs/page.tsx`
- Modify: `app/(admin)/admin/accounts/page.tsx`
- Modify: `app/(admin)/admin/trades/page.tsx`
- Modify: `app/(admin)/admin/users/page.tsx`
- Modify: `app/(admin)/admin/privacy-trades/page.tsx`

**공통 규칙:** 각 페이지의 로컬 `VALID_SIZES` / `parseRangePreset` / `parseSize` / `parsePage` / `resolveFromTo` 정의를 삭제하고 아래 import로 대체한다. **페이지별 기본 프리셋이 다르다는 점에 주의** — 기존 로컬 함수의 fallback을 그대로 유지해야 한다.

```ts
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
```

- [ ] **Step 1: `admin/logs/page.tsx` 전환**

로컬 `VALID_SIZES`, `parseRangePreset`, `parseSize`, `parsePage`, `resolveFromTo` 삭제. 호출부 변경:
- `parseRangePreset(params.anoRange)` → `parseRangePreset(params.anoRange, '7d')` (err/aud도 동일하게 `'7d'`)
- `resolveFromTo(anoRange, params.anoFrom, params.anoTo)` → `resolveRange(anoRange, params.anoFrom, params.anoTo)` (err/aud 동일)
- `parseSize`/`parsePage` 호출은 시그니처 동일 — import만 바뀜

- [ ] **Step 2: `admin/accounts/page.tsx` 전환**

동일 삭제. 기존 fallback이 `'all'`이므로: `parseRangePreset(rawRange)` → `parseRangePreset(rawRange, 'all')`. `resolveFromTo(...)` → `resolveRange(...)`.

- [ ] **Step 3: `admin/trades/page.tsx` 전환**

동일 삭제. 기존 fallback `'7d'`: `parseRangePreset(rawRange, '7d')`. `resolveFromTo` → `resolveRange`.

- [ ] **Step 4: `admin/users/page.tsx` 전환**

이 페이지는 `parseRangePreset`(fallback `'all'`)과 `resolveFromTo`만 있다. 삭제 후 `parseRangePreset(rawRange, 'all')` + `resolveRange(...)`로 대체. (`parseSize`/`parsePage` import 불필요)

- [ ] **Step 5: `admin/privacy-trades/page.tsx` 전환**

로컬 파서 삭제(fallback `'7d'`). 추가로 `filterByRange`를 UTC cutoff 대신 `resolveRange` 기반으로 교체:

```ts
import { parsePage, parseRangePreset, parseSize, resolveRange, type RangePreset } from '@shared/lib/date-range'

function filterByRange(bases: AdminPrivacyBase[], range: RangePreset, from?: string, to?: string): AdminPrivacyBase[] {
  const { from: f, to: t } = resolveRange(range, from, to)
  if (!f && !t) return bases
  return bases.filter((b) => (!f || b.tradeDate >= f) && (!t || b.tradeDate <= t))
}
```

주의: 기존 코드의 `import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'`에서 타입은 어느 쪽에서 가져와도 동일하다(Task 7에서 단일화). 이 시점에는 위처럼 `@shared/lib/date-range`에서 가져온다.

- [ ] **Step 6: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS. 추가로 `grep -rn "resolveFromTo" app/` 결과가 비어야 한다.

- [ ] **Step 7: 커밋**

```bash
git add "app/(admin)/admin/logs/page.tsx" "app/(admin)/admin/accounts/page.tsx" "app/(admin)/admin/trades/page.tsx" "app/(admin)/admin/users/page.tsx" "app/(admin)/admin/privacy-trades/page.tsx"
git commit -m "refactor(admin): 5개 페이지의 날짜 범위·파서 중복을 shared/lib/date-range로 통합 (KST 기준으로 교정)"
```

---

## Task 7: [중복 제거] RangeFilterBar · cycle-history · StrategyOrderHistory를 date-range로 전환

**Files:**
- Modify: `shared/ui/RangeFilterBar.tsx`
- Delete: `widgets/cycle-history/lib/buildParams.ts`
- Modify: `widgets/cycle-history/index.ts`
- Modify: `widgets/cycle-history/CycleHistoryTable.tsx`
- Modify: `widgets/cycle-history/StrategyTradesTab.tsx`
- Modify: `widgets/account-detail/TradesTab.tsx`
- Modify: `widgets/strategy-detail/StrategyOrderHistory.tsx`

- [ ] **Step 1: RangeFilterBar가 공용 타입·라벨을 쓰도록 변경**

`shared/ui/RangeFilterBar.tsx`에서 로컬 `RangePreset` 타입과 `LABELS` 상수를 삭제하고:

```ts
import { RANGE_LABELS, type RangePreset } from '@shared/lib/date-range'

export type { RangePreset }
```

본문의 `LABELS[r]` → `RANGE_LABELS[r]`. (`export type { RangePreset }` 재수출은 기존 `@shared/ui/RangeFilterBar`에서 타입을 import하는 admin 페이지들의 호환용 — Task 6 이후에도 남아있는 곳이 있으면 유지된다)

- [ ] **Step 2: cycle-history의 buildParams 삭제 및 호출부 전환**

1. `widgets/cycle-history/lib/buildParams.ts` 파일 삭제 (lib 디렉토리가 비면 디렉토리도 삭제)
2. `widgets/cycle-history/index.ts`에서 `export { buildParams, type RangeType } from './lib/buildParams'` 라인 삭제
3. `widgets/cycle-history/CycleHistoryTable.tsx`:
   - `import { RANGE_LABELS, type RangeType } from './lib/buildParams'` → `import { RANGE_LABELS, type RangePreset } from '@shared/lib/date-range'`
   - 파일 내 `RangeType` → `RangePreset` 전부 치환
4. `widgets/cycle-history/StrategyTradesTab.tsx`:
   - `import { buildParams, type RangeType } from './lib/buildParams'` → `import { resolveRangeStrict, type RangePreset } from '@shared/lib/date-range'`
   - `RangeType` → `RangePreset` 치환
   - `const baseParams = buildParams(rangeType, customFrom, customTo)` → `const baseParams = resolveRangeStrict(rangeType, customFrom, customTo)`
5. `widgets/account-detail/TradesTab.tsx`:
   - `import { CycleHistoryTable, buildParams, type RangeType } from '@widgets/cycle-history'` → 두 줄로 분리:
     ```ts
     import { CycleHistoryTable } from '@widgets/cycle-history'
     import { resolveRangeStrict, type RangePreset } from '@shared/lib/date-range'
     ```
   - `RangeType` → `RangePreset` 치환, `buildParams(...)` → `resolveRangeStrict(...)`

- [ ] **Step 3: StrategyOrderHistory 전환**

`widgets/strategy-detail/StrategyOrderHistory.tsx`에서 로컬 `RangeType` 타입, `RANGE_LABELS` 상수, `resolveRange` 함수(15~45행)를 삭제하고:

```ts
import { RANGE_LABELS, resolveRangeStrict, type RangePreset } from '@shared/lib/date-range'
```

- 파일 내 `RangeType` → `RangePreset` 치환
- `const range = resolveRange(rangeType, customFrom, customTo)` → `const range = resolveRangeStrict(rangeType, customFrom, customTo)`

- [ ] **Step 4: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS. 추가 확인: `grep -rn "buildParams" app widgets features entities shared` 결과 없음.

- [ ] **Step 5: 커밋**

```bash
git add shared/ui/RangeFilterBar.tsx widgets/cycle-history widgets/account-detail/TradesTab.tsx widgets/strategy-detail/StrategyOrderHistory.tsx
git commit -m "refactor: 날짜 범위 로직 3중 중복 제거 — RangeFilterBar·cycle-history·StrategyOrderHistory를 date-range로 통일"
```

---

## Task 8: [취약] StrategyDetail 휴장일 판정을 KST 기준으로 교정

**증상:** `widgets/strategy-detail/StrategyDetail.tsx:84-89`가 `today.toISOString().slice(0, 10)`(UTC)과 `today.getDay()`(실행 환경 로컬)를 섞어 쓴다. KST 오전 0~9시에는 UTC 날짜가 전날이라 휴장일·요일 판정이 어긋날 수 있다.

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx:84-89`

- [ ] **Step 1: 수정**

`import { fmtUsd } from '@shared/lib/format'` → `import { fmtUsd, todayKst } from '@shared/lib/format'`

```tsx
// 변경 전
  const today = new Date()
  const { holidays } = useMonthlyHolidaysQuery(today.getFullYear(), today.getMonth() + 1)
  const todayStr = today.toISOString().slice(0, 10)
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

// 변경 후 — KST 날짜 기준으로 통일 (UTC/로컬 혼용 시 KST 새벽에 전날로 판정되는 문제 방지)
  const todayStr = todayKst()
  const [kstYear, kstMonth] = todayStr.split('-').map(Number)
  const { holidays } = useMonthlyHolidaysQuery(kstYear, kstMonth)
  const dayOfWeek = new Date(todayStr + 'T00:00:00').getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
```

- [ ] **Step 2: 검증**

Run: `npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx` 후 `npm run typecheck`
Expected: PASS (기존 테스트가 날짜를 고정한다면 실패 시 테스트의 mock 날짜를 확인해 조정)

- [ ] **Step 3: 커밋**

```bash
git add widgets/strategy-detail/StrategyDetail.tsx
git commit -m "fix(strategy-detail): 휴장일·요일 판정을 KST 날짜 기준으로 통일"
```

---

## Task 9: [데드코드] 미사용 코드 일괄 제거

**배경:** 아래 항목들은 저장소 전체 grep으로 소비처가 없음을 확인했다 (2026-07-09 기준). 각 항목 삭제 후 반드시 grep으로 재확인할 것.

**Files:**
- Modify: `entities/user/hooks/useUserQueries.ts` — 미export 함수 `useReapplyMutation`(64~69행) 삭제
- Modify: `entities/user/api/index.ts` — `listAdminStrategyTradeDates` 함수 삭제
- Modify: `entities/user/index.ts` — `listAdminStrategyTradeDates` export 삭제
- Modify: `entities/trade/model/types.ts` — `TradeHistory`, `Execution`, `PortfolioSnapshot`, `MarginItem`(account 슬라이스와 중복) 인터페이스 삭제
- Modify: `entities/trade/index.ts` — `Execution`, `PortfolioSnapshot`, `MarginItem` export 삭제
- Modify: `entities/privacy/model/types.ts` — `PrivacyCurrentBase` 인터페이스 삭제
- Delete: `entities/meta/model/strategy-capability.ts`, `entities/meta/model/strategy-capability.test.ts` — `deriveSeedSource`/`SeedSource`는 자체 테스트에서만 사용
- Modify: `entities/meta/index.ts` — `SeedSource`, `deriveSeedSource` export 2줄 삭제
- Modify: `entities/market/api/index.ts` — `getMarketSession` 함수 삭제 (+ 상단 `MarketSession` import 정리)
- Modify: `entities/market/hooks/useMarketQueries.ts` — 미export 함수 `useMarketSessionQuery`(19~25행) 삭제 + `getMarketSession` import 제거
- Modify: `entities/market/model/types.ts` — `MarketSession` 인터페이스 + `MarketSessionStatus` import 삭제
- Modify: `entities/market/index.ts` — `MarketSession` 타입 export와 `getMarketSession` export 삭제
- Modify: `shared/lib/api-schema.ts` — `MarketSessionStatus` 타입 export 삭제 (소비처가 entities/market뿐이었음)
- Delete: `public/next.svg`, `public/vercel.svg`, `public/file.svg`, `public/globe.svg`, `public/window.svg` — 템플릿 잔재, 참조 없음

- [ ] **Step 1: 위 목록대로 삭제/수정한다** (파일별로 위 명세 이외의 것은 건드리지 않는다)

- [ ] **Step 2: 잔존 참조 확인**

Run (Git Bash):
```bash
grep -rn "useReapplyMutation\|listAdminStrategyTradeDates\|TradeHistory\|PortfolioSnapshot\|PrivacyCurrentBase\|deriveSeedSource\|SeedSource\|getMarketSession\|useMarketSessionQuery\|MarketSessionStatus" app widgets features entities shared components
```
Expected: 출력 없음. (`Execution`은 일반 단어라 grep에서 제외 — typecheck가 잡는다)

- [ ] **Step 3: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS (테스트 파일 1개가 줄어 26 files)

- [ ] **Step 4: 커밋**

```bash
git add -A entities shared/lib/api-schema.ts public
git commit -m "chore: 미사용 API 함수·타입·훅·템플릿 svg 일괄 제거"
```

---

## Task 10: [데드코드] StrategyDetail 미사용 props 제거

**배경:** `StrategyDetail`의 Props에 `accountNoMasked`, `accountNo`가 선언돼 있고 페이지에서 전달까지 하지만, 컴포넌트 본문은 `accountId`, `strategy`만 구조분해해 사용한다.

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx:52-59`
- Modify: `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:58`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx` (해당 props를 넘기고 있으면 제거)

- [ ] **Step 1: Props 인터페이스에서 제거**

```tsx
// 변경 전
interface Props {
  accountId: string
  accountNoMasked: string
  accountNo?: string
  strategy: Strategy
}

// 변경 후
interface Props {
  accountId: string
  strategy: Strategy
}
```

- [ ] **Step 2: 호출부 정리**

`app/(main)/accounts/[id]/strategies/[sid]/page.tsx`:

```tsx
// 변경 전
      <StrategyDetail accountId={id} accountNoMasked={account.accountNoMasked} accountNo={account.accountNo} strategy={strategy} />
// 변경 후
      <StrategyDetail accountId={id} strategy={strategy} />
```

`widgets/strategy-detail/StrategyDetail.test.tsx`에서 `accountNoMasked`/`accountNo`를 전달하는 render 호출이 있으면 해당 props만 제거한다.

- [ ] **Step 3: 검증**

Run: `npm run typecheck && npx vitest run widgets/strategy-detail/StrategyDetail.test.tsx`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add widgets/strategy-detail/StrategyDetail.tsx widgets/strategy-detail/StrategyDetail.test.tsx "app/(main)/accounts/[id]/strategies/[sid]/page.tsx"
git commit -m "chore(strategy-detail): 미사용 props(accountNoMasked·accountNo) 제거"
```

---

## Task 11: [구조] app/pending 재수출 파일 제거 + features/auth/reapply index 추가

**배경:** `app/pending/{LogoutButton,ReapplyButton,TelegramConnect}.tsx`는 features 컴포넌트를 1줄 재수출하는 불필요한 간접층이다 (app은 features를 직접 import할 수 있다). 또한 `features/auth/reapply`는 슬라이스 규칙(각 슬라이스 최상단 index.ts가 public API)을 어기고 index.ts가 없어 딥 임포트되고 있다.

**Files:**
- Create: `features/auth/reapply/index.ts`
- Delete: `app/pending/LogoutButton.tsx`, `app/pending/ReapplyButton.tsx`, `app/pending/TelegramConnect.tsx`
- Modify: `app/pending/page.tsx`
- Modify: `app/rejected/page.tsx`

- [ ] **Step 1: index.ts 생성** — `features/auth/reapply/index.ts`:

```ts
export { ReapplyButton } from './ReapplyButton'
export { RejectedReapplyButton } from './RejectedReapplyButton'
```

- [ ] **Step 2: app/pending/page.tsx의 import 교체**

```tsx
// 변경 전
import { TelegramConnect } from './TelegramConnect'
import { ReapplyButton } from './ReapplyButton'
import { LogoutButton } from './LogoutButton'
// 변경 후
import { PendingTelegramConnect } from '@features/settings/telegram-connect'
import { ReapplyButton } from '@features/auth/reapply'
import { LogoutButton } from '@features/auth/logout'
```

JSX의 `<TelegramConnect hasTelegram={...} currentChannel={...} />` → `<PendingTelegramConnect hasTelegram={...} currentChannel={...} />`로 이름 변경. (`PendingStatusWatcher` import는 그대로 둔다 — pending 전용 로컬 컴포넌트)

- [ ] **Step 3: app/rejected/page.tsx의 딥 임포트 교체**

```tsx
// 변경 전
import { RejectedReapplyButton } from '@features/auth/reapply/RejectedReapplyButton'
// 변경 후
import { RejectedReapplyButton } from '@features/auth/reapply'
```

- [ ] **Step 4: 재수출 파일 3개 삭제**

`app/pending/LogoutButton.tsx`, `app/pending/ReapplyButton.tsx`, `app/pending/TelegramConnect.tsx` 삭제.

- [ ] **Step 5: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add -A app/pending app/rejected features/auth/reapply
git commit -m "refactor(pending): app 레이어의 1줄 재수출 제거, reapply 슬라이스 public API(index.ts) 추가"
```

---

## Task 12: [중복 제거] strategyTypeShort를 entities/strategy로 통합

**배경:** 동일한 `strategyTypeShort`(PRIVACY→P, INFINITE→I)가 `app/(admin)/admin/accounts/page.tsx:19-23`과 `widgets/account-card/AccountCard.tsx:15-19`에 중복 정의돼 있다.

**Files:**
- Create: `entities/strategy/model/type-short.ts`
- Modify: `entities/strategy/index.ts`
- Modify: `app/(admin)/admin/accounts/page.tsx`
- Modify: `widgets/account-card/AccountCard.tsx`

- [ ] **Step 1: 공용 함수 생성** — `entities/strategy/model/type-short.ts`:

```ts
/** 전략 타입 축약 표기 — 배지용 (PRIVACY→P, INFINITE→I, 그 외 원문) */
export function strategyTypeShort(type: string): string {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}
```

- [ ] **Step 2: public API에 추가** — `entities/strategy/index.ts`에 한 줄 추가:

```ts
export { strategyTypeShort } from './model/type-short'
```

- [ ] **Step 3: 두 사용처의 로컬 정의 삭제 후 import**

`app/(admin)/admin/accounts/page.tsx`와 `widgets/account-card/AccountCard.tsx` 각각에서 로컬 `strategyTypeShort` 함수를 삭제하고 기존 `@entities/strategy` import에 `strategyTypeShort`를 추가한다. (admin accounts 페이지는 `@entities/strategy` import가 없으므로 새로 추가: `import { strategyTypeShort } from '@entities/strategy'`)

- [ ] **Step 4: 검증**

Run: `npm run typecheck && npx vitest run widgets/account-card/AccountCard.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add entities/strategy "app/(admin)/admin/accounts/page.tsx" widgets/account-card/AccountCard.tsx
git commit -m "refactor(strategy): strategyTypeShort 중복 정의를 entities/strategy로 통합"
```

---

## Task 13: [문서] docs/agents 현행화 + 스테일 문서 삭제

**배경:** 문서가 삭제된 코드를 계속 참조한다. 확인된 불일치:
- `docs/agents/widgets.md` — `portfolio-summary-card`, `trade-history-list`, `profit-stats-card`, `status-dot`, `dashboard/aggregatePortfolios` 언급 (전부 존재하지 않음). 실존 위젯 `admin-trade-list`, `fear-greed-card`, `accounts-grid`, `strategy-list`는 목록에 없음
- `docs/agents/entities.md` — `getAccountProfit`, `['profit', accountId, period]`, `['nextOrderPreview', accountId]`, `['previewMargin', accountId]`, `PortfolioSnapshot`, `unregisterTokenFromServer`, privacy Route Handler(`app/api/privacy-trades/[[...path]]/route.ts`) 언급 (전부 현존하지 않음/틀림)
- `docs/agents/app.md` — `app/(main)/dashboard|accounts|statistics|settings/loading.tsx`에서 `statistics` 라우트 없음
- `shrimp-rules.md`(루트) — Supabase Auth·Next.js 15·Render 배포 등 전면 스테일
- 루트 `CLAUDE.md` — typecheck 스테일 산출물 이슈 미기재

**Files:**
- Modify: `docs/agents/widgets.md`
- Modify: `docs/agents/entities.md`
- Modify: `docs/agents/app.md`
- Modify: `CLAUDE.md`
- Delete: `shrimp-rules.md`

- [ ] **Step 1: widgets.md 대표 슬라이스 목록 교체**

"대표 슬라이스" 섹션을 실제 디렉토리 기준으로 교체:

```markdown
## 대표 슬라이스

- 페이지 위젯: `admin-user-list`, `admin-trade-list`, `admin-privacy-trade-list`, `all-strategies`, `dashboard`, `account-detail`, `accounts-grid`, `strategy-detail`, `strategy-list`, `cycle-history`, `fear-greed-card`, `market-holiday-calendar`, `error-display`
- 공용 UI 위젯: `layout`, `account-card`, `strategy-card`, `kpi-card`, `percent-gauge`, `revealable-value`, `glass-card`, `page-header`, `theme-toggle`, `stepper`, `timeline`, `pull-to-refresh`
```

"주요 슬라이스 quirk" 섹션에서 `dashboard/aggregatePortfolios`, `profit-stats-card` 항목을 삭제한다.

- [ ] **Step 2: entities.md 교정**

1. queryKey 목록을 실제 코드 기준으로 교체:

```markdown
### queryKey 목록

`['accountMargin', accountId]`, `['accountPrices', accountId, tickers]`, `['strategies', accountId]`, `['strategies', 'all']`, `['strategySeedPreview', accountId, type, ticker, divisionCount]`, `['order-preview', 'strategy', strategyId]`, `['strategy-orders', strategyId, from, to]`, `['holidays', year, month]`, `['candles', ticker, count]`, `['fearGreed', days]`, `['accountCycleHistory', accountId, params]`, `['strategyCycleHistory', strategyId, params]`, `['weeklyTrades', accountIds, weekStart]`, `['me']`, `['adminUsers', filter]`
```

2. `PortfolioSnapshot` 항목 삭제 (`snapshotDate` 관련 줄)
3. `**privacy**: Route Handler는 app/api/privacy-trades/[[...path]]/route.ts` → `**privacy**: 관리자 전용 — Server Component에서 apiFetch로 /api/admin/privacy-trade-bases 직접 호출 (Route Handler 없음)`
4. `**fcm**: registerTokenToServer/unregisterTokenFromServer는 clientFetch<void> 사용` → `**fcm**: registerTokenToServer는 clientFetch<void> 사용 (토큰 해제 API는 클라이언트 미구현 — app/api/fcm/tokens/[token] DELETE 라우트만 존재)`
5. "API 날짜 파라미터" 섹션에서 `getAccountProfit 등: { from, to }` 줄과 `GET /api/accounts/{id}/profit` 줄 삭제
6. `GET /api/accounts/{id}/trades: Execution[] ...` 줄 삭제 (Execution 타입은 Task 9에서 제거됨)

- [ ] **Step 3: app.md 교정**

`**loading.tsx**: app/(main)/dashboard|accounts|statistics|settings/loading.tsx` → `**loading.tsx**: app/(main)/dashboard|accounts|strategies|settings/loading.tsx`

- [ ] **Step 4: 루트 CLAUDE.md '개발 도구' 섹션에 typecheck 주의사항 추가**

```markdown
- `npm run typecheck`가 `.next/dev/types` 스테일 참조(삭제된 라우트)로 실패하면 `.next` 삭제 후 재실행 — 라우트 삭제·이동 뒤에 발생하는 산출물 문제이며 코드 오류가 아님
```

- [ ] **Step 5: shrimp-rules.md 삭제**

루트의 `shrimp-rules.md`는 Supabase Auth·Next.js 15·Render 등 초기 기획 시점 내용으로 전면 스테일이다. 삭제한다.

- [ ] **Step 6: 커밋**

```bash
git add docs/agents/widgets.md docs/agents/entities.md docs/agents/app.md CLAUDE.md
git rm shrimp-rules.md
git commit -m "docs: agents 문서를 실제 코드와 동기화, 스테일 문서(shrimp-rules.md) 삭제"
```

---

## Task 14: [테스트 보강] proxy.ts의 isJwtExpired 단위 테스트 추가

**배경:** 인증 코어(proxy.ts)에 테스트가 전혀 없다. 전체를 테스트하려면 NextRequest mocking이 커지므로, 순수 함수인 `isJwtExpired`만 export해 최소 안전망을 만든다.

**Files:**
- Modify: `proxy.ts:21`
- Test: `proxy.test.ts` (신규, 루트)

- [ ] **Step 1: isJwtExpired export**

`proxy.ts` 21행: `function isJwtExpired(` → `export function isJwtExpired(` (Next.js proxy 파일은 `proxy`와 `config` 외의 export를 무시하므로 안전하다)

- [ ] **Step 2: 실패하는 테스트 작성** — 루트에 `proxy.test.ts` 생성:

```ts
import { describe, expect, it } from 'vitest'
import { isJwtExpired } from './proxy'

function makeJwt(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `header.${encoded}.signature`
}

const nowSec = () => Math.floor(Date.now() / 1000)

describe('isJwtExpired', () => {
  it('만료까지 충분히 남은 토큰은 false', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSec() + 3600 }))).toBe(false)
  })
  it('이미 만료된 토큰은 true', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSec() - 10 }))).toBe(true)
  })
  it('버퍼(30초) 이내에 만료될 토큰은 true', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSec() + 10 }))).toBe(true)
  })
  it('세그먼트가 3개가 아니면 true', () => {
    expect(isJwtExpired('not-a-jwt')).toBe(true)
  })
  it('exp 클레임이 없으면 true', () => {
    expect(isJwtExpired(makeJwt({})))
      .toBe(true)
  })
  it('payload가 JSON이 아니면 true', () => {
    expect(isJwtExpired('h.%%%.s')).toBe(true)
  })
})
```

- [ ] **Step 3: 테스트 실행**

Run: `npx vitest run proxy.test.ts`
Expected: Step 1을 먼저 했다면 PASS. (`next/server` import 오류가 나면 vitest가 proxy.ts의 NextResponse import를 해석하지 못하는 것 — 이 경우 `isJwtExpired`를 `shared/lib/auth/jwt.ts`로 추출하고 proxy.ts에서 import하는 방식으로 전환한 뒤 테스트 파일도 `shared/lib/auth/jwt.test.ts`로 옮긴다. 추출 시 함수 본문은 그대로 복사한다)

- [ ] **Step 4: 전체 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add proxy.ts proxy.test.ts
git commit -m "test(proxy): isJwtExpired 단위 테스트 추가"
```

---

## 최종 검증 (Task 15)

- [ ] **Step 1: 전체 회귀 확인**

Run: `npm run typecheck && npm run test:run`
Expected: typecheck 0 오류, 테스트 전체 통과 (기준선 117개 + Task 1·5·14에서 추가된 테스트 − Task 9에서 삭제된 strategy-capability 테스트 2개)

- [ ] **Step 2: 프로덕션 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공 (경고는 기존과 동일한지 확인)

- [ ] **Step 3: 잔존 중복 확인**

Run (Git Bash):
```bash
grep -rn "parseRangePreset\|resolveFromTo\|RANGE_LABELS" app widgets --include='*.tsx' --include='*.ts' | grep -v node_modules
```
Expected: 로컬 재정의 없음 (`@shared/lib/date-range` import만 존재)

- [ ] **Step 4: 이 계획 파일의 체크박스를 모두 갱신하고 완료 보고**

---

## 이 계획에서 의도적으로 제외한 것 (참고)

- **로그아웃 리다이렉트 통일** — 열린 질문 1
- **FCM 토큰 해제 기능/라우트 정리** — 열린 질문 2
- **admin/logs 페이지 위젯 분리, entities/admin 분리** — 열린 질문 3·4 (churn 대비 이득 작음)
- **`useWeeklyTradeSummaryQuery`·`WeeklyMarketCalendar`의 로컬 날짜 사용** — 브라우저(한국 사용자)에서만 실행되므로 사실상 KST와 동일. 변경하지 않음
- **admin 페이지들의 `queryClient.invalidateQueries({ queryKey: ['accounts'] })`** — 대응하는 useQuery가 없어 no-op이지만, 향후 쿼리 추가 시를 대비한 방어로 보고 유지
