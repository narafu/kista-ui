# 전체 정리 계획 후속 작업 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/superpowers/plans/2026-07-09-full-project-cleanup.md`의 열린 질문 중 진행 결정된 4건(로그아웃 리다이렉트 통일, FCM 토큰 해제, admin/logs 위젯 분리, entities/admin 분리)을 구현한다.

**Architecture:** 4개 독립 하위 작업을 순서대로 실행한다. 앞의 2건(로그아웃, FCM)은 기능 추가이고 뒤의 2건(위젯 분리, entities/admin 분리)은 순수 구조 리팩토링이다. `entities/admin` 분리는 반드시 `admin/logs 위젯 분리` 이후에 실행해야 한다 — 위젯 분리로 새로 생긴 파일들도 entities/admin import 전환 대상이기 때문이다.

**Tech Stack:** Next.js 16 (App Router) · TypeScript · React Query · Vitest · Tailwind CSS

**디자인 스펙:** `docs/superpowers/specs/2026-07-10-post-cleanup-followups-design.md`

## Global Constraints

- 포맷: 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백 (`{ useState }`)
- 새 코드는 FSD alias(`@shared/*`, `@entities/*`, `@features/*`, `@widgets/*`)만 사용
- `git push` 금지 (커밋만). 괄호 경로는 `git add "app/(main)/..."` 큰따옴표 필수
- 커밋 author: `narafu <narafu@kakao.com>` (`git config user.name`으로 확인)
- 기능 작업 중 무관한 파일의 포맷 일괄 변경 금지
- entities 슬라이스 간 cross-import 금지 (`entities/admin`은 `shared/`만 import 가능)
- 각 태스크 후 `npm run typecheck && npm run test:run`으로 회귀 확인

---

## Task 1: 로그아웃 리다이렉트 통일 — doLogout()

**Files:**
- Modify: `shared/lib/api-client/index.ts:25-30`

**Interfaces:**
- Produces: `doLogout(reason?: string)`가 이제 `/dashboard` (또는 `/dashboard?error=${reason}`)로 리다이렉트 — Task 2가 이 쿼리를 소비한다.

- [ ] **Step 1: 수정**

`shared/lib/api-client/index.ts` 25-30행:

```ts
// 변경 전
async function doLogout(reason?: string): Promise<never> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.href = reason ? `/login?error=${reason}` : '/login'
  await new Promise(() => {}) // 리다이렉트 완료 전까지 중단
  throw new Error('unreachable')
}

// 변경 후
async function doLogout(reason?: string): Promise<never> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  window.location.href = reason ? `/dashboard?error=${reason}` : '/dashboard'
  await new Promise(() => {}) // 리다이렉트 완료 전까지 중단
  throw new Error('unreachable')
}
```

(`app/auth/callback/route.ts`의 `/login?error=...`는 OAuth 콜백 실패 전용이므로 건드리지 않는다 — 로그인 자체가 안 된 상태라 `/login`에 남아야 한다)

- [ ] **Step 2: 검증**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add shared/lib/api-client/index.ts
git commit -m "fix(auth): 자동 로그아웃 리다이렉트를 /login에서 /dashboard로 통일"
```

---

## Task 2: DashboardLogoutErrorToast 컴포넌트 + 대시보드 마운트

**Files:**
- Create: `features/auth/logout/DashboardLogoutErrorToast.tsx`
- Test: `features/auth/logout/DashboardLogoutErrorToast.test.tsx`
- Modify: `features/auth/logout/index.ts`
- Modify: `app/(main)/dashboard/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `doLogout()`이 `/dashboard?error=token_blacklisted` 형태로 리다이렉트
- Produces: `DashboardLogoutErrorToast` 컴포넌트 (props 없음, `@features/auth/logout`에서 export)

- [ ] **Step 1: 실패하는 테스트 작성** — `features/auth/logout/DashboardLogoutErrorToast.test.tsx` 생성:

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DashboardLogoutErrorToast } from './DashboardLogoutErrorToast'

const { replaceMock, toastErrorMock, useSearchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  toastErrorMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock },
}))

describe('DashboardLogoutErrorToast', () => {
  beforeEach(() => {
    replaceMock.mockClear()
    toastErrorMock.mockClear()
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
  })

  it('error=token_blacklisted면 해당 메시지로 toast.error 호출 후 /dashboard로 쿼리를 정리한다', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('error=token_blacklisted'))
    render(<DashboardLogoutErrorToast />)

    expect(toastErrorMock).toHaveBeenCalledWith('로그아웃된 토큰입니다. 다시 로그인해 주세요.')
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })

  it('알 수 없는 error 값이면 일반 세션 만료 메시지로 toast.error 호출한다', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('error=weird_reason'))
    render(<DashboardLogoutErrorToast />)

    expect(toastErrorMock).toHaveBeenCalledWith('세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.')
  })

  it('error 쿼리가 없으면 toast나 라우팅을 호출하지 않는다', () => {
    render(<DashboardLogoutErrorToast />)

    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run features/auth/logout/DashboardLogoutErrorToast.test.tsx`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현** — `features/auth/logout/DashboardLogoutErrorToast.tsx` 생성:

```tsx
'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

const ERROR_MESSAGES: Record<string, string> = {
  token_blacklisted: '로그아웃된 토큰입니다. 다시 로그인해 주세요.',
}

function DashboardLogoutErrorToastContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (!error) return
    toast.error(ERROR_MESSAGES[error] ?? '세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.')
    router.replace('/dashboard')
  }, [error, router])

  return null
}

export function DashboardLogoutErrorToast() {
  return (
    <Suspense fallback={null}>
      <DashboardLogoutErrorToastContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run features/auth/logout/DashboardLogoutErrorToast.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: index.ts export 추가**

`features/auth/logout/index.ts`:

```ts
// 변경 전
export { LogoutButton } from './LogoutButton'

// 변경 후
export { LogoutButton } from './LogoutButton'
export { DashboardLogoutErrorToast } from './DashboardLogoutErrorToast'
```

- [ ] **Step 6: 대시보드 페이지에 마운트**

`app/(main)/dashboard/page.tsx` 전체를 아래로 교체:

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { getMonthlyHolidays, getMonthlyHolidaysPublic } from '@entities/market'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import { DashboardLogoutErrorToast } from '@features/auth/logout'
import type { Account } from '@entities/account'

function pad(n: number) { return String(n).padStart(2, '0') }

function getWeekStartDate(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - now.getDay())
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default async function DashboardPage() {
  const token = await getAuthToken()

  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth() + 1
  const initialWeekStartDate = getWeekStartDate()

  let accounts: Account[] = []
  // 비인증: 체결내역 없는 달력만 표시 (휴장일은 public 엔드포인트로 로드)
  const holidays: string[] = token
    ? await getMonthlyHolidays(calendarYear, calendarMonth, token).catch(() => [])
    : await getMonthlyHolidaysPublic(calendarYear, calendarMonth)

  if (token) {
    try { accounts = await getCachedAccounts(token) } catch {}
  }

  if (accounts.length === 0) {
    return (
      <>
        <DashboardLogoutErrorToast />
        <DashboardEmpty
          holidays={holidays}
          initialWeekStartDate={initialWeekStartDate}
        />
      </>
    )
  }

  return (
    <>
      <DashboardLogoutErrorToast />
      <DashboardOverview
        holidays={holidays}
        initialWeekStartDate={initialWeekStartDate}
        accountIds={accounts.map(a => a.id)}
      />
    </>
  )
}
```

- [ ] **Step 7: 전체 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add "app/(main)/dashboard/page.tsx" features/auth/logout/DashboardLogoutErrorToast.tsx features/auth/logout/DashboardLogoutErrorToast.test.tsx features/auth/logout/index.ts
git commit -m "feat(auth): 자동 로그아웃 사유를 대시보드에서 toast로 안내"
```

---

## Task 3: FCM 토큰 해제 유틸 추가

**Files:**
- Modify: `entities/fcm/api/index.ts`
- Modify: `entities/fcm/hooks/useFcmToken.ts`
- Modify: `entities/fcm/index.ts`
- Test: `entities/fcm/api/index.test.ts` (신규)
- Test: `entities/fcm/hooks/useFcmToken.test.ts` (신규)

**Interfaces:**
- Produces: `unregisterTokenFromServer(token: string): Promise<void>` (`@entities/fcm`에서 export), `useFcmToken()`이 반환하는 객체에 `getCachedToken(): string | null` 추가 — Task 4가 둘 다 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성** — `entities/fcm/api/index.test.ts` 생성:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { unregisterTokenFromServer } from './index'

const { clientFetchMock } = vi.hoisted(() => ({
  clientFetchMock: vi.fn(),
}))

vi.mock('@shared/lib/api-client', () => ({
  clientFetch: clientFetchMock,
  jsonBody: (method: string, body: unknown) => ({ method, body: JSON.stringify(body) }),
}))

describe('unregisterTokenFromServer', () => {
  beforeEach(() => {
    clientFetchMock.mockReset()
  })

  it('URL 인코딩된 토큰 경로로 DELETE 요청을 보낸다', async () => {
    clientFetchMock.mockResolvedValue(undefined)

    await unregisterTokenFromServer('token/with special+chars')

    expect(clientFetchMock).toHaveBeenCalledWith(
      '/api/fcm/tokens/token%2Fwith%20special%2Bchars',
      { method: 'DELETE' },
    )
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run entities/fcm/api/index.test.ts`
Expected: FAIL — `unregisterTokenFromServer`가 export되지 않음

- [ ] **Step 3: 구현** — `entities/fcm/api/index.ts` 끝에 추가:

```ts
// 변경 전 (파일 끝)
export async function registerTokenToServer(token: string): Promise<void> {
  await clientFetch<void>('/api/fcm/tokens', jsonBody('POST', { token, platform: 'WEB' }))
}

// 변경 후
export async function registerTokenToServer(token: string): Promise<void> {
  await clientFetch<void>('/api/fcm/tokens', jsonBody('POST', { token, platform: 'WEB' }))
}

export async function unregisterTokenFromServer(token: string): Promise<void> {
  await clientFetch<void>(`/api/fcm/tokens/${encodeURIComponent(token)}`, { method: 'DELETE' })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run entities/fcm/api/index.test.ts`
Expected: PASS

- [ ] **Step 5: getCachedToken 실패하는 테스트 작성** — `entities/fcm/hooks/useFcmToken.test.ts` 생성:

```ts
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useFcmToken } from './useFcmToken'

const { requestFcmTokenMock } = vi.hoisted(() => ({
  requestFcmTokenMock: vi.fn(),
}))

vi.mock('../api', () => ({
  requestFcmToken: requestFcmTokenMock,
  registerTokenToServer: vi.fn(),
}))

describe('useFcmToken.getCachedToken', () => {
  beforeEach(() => {
    requestFcmTokenMock.mockReset()
  })

  it('아직 토큰을 취득하지 않았으면 null을 반환하고 새로 요청하지 않는다', () => {
    const { result } = renderHook(() => useFcmToken())

    expect(result.current.getCachedToken()).toBeNull()
    expect(requestFcmTokenMock).not.toHaveBeenCalled()
  })

  it('acquireToken으로 이미 취득한 토큰이 있으면 그 값을 반환한다', async () => {
    requestFcmTokenMock.mockResolvedValue('cached-token')
    const { result } = renderHook(() => useFcmToken())

    await act(async () => {
      await result.current.acquireToken()
    })

    expect(result.current.getCachedToken()).toBe('cached-token')
  })
})
```

- [ ] **Step 6: 테스트가 실패하는지 확인**

Run: `npx vitest run entities/fcm/hooks/useFcmToken.test.ts`
Expected: FAIL — `getCachedToken`이 반환 객체에 없음

- [ ] **Step 7: 구현** — `entities/fcm/hooks/useFcmToken.ts`:

```ts
// 변경 전 (파일 끝부분)
  const requestAndRegister = useCallback(async (): Promise<boolean> => {
    const token = await acquireToken()
    if (!token) return false
    try {
      await registerTokenToServer(token)
      setStatus('registered')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [acquireToken])

  return { status, prewarm, acquireToken, requestAndRegister }
}

// 변경 후
  const requestAndRegister = useCallback(async (): Promise<boolean> => {
    const token = await acquireToken()
    if (!token) return false
    try {
      await registerTokenToServer(token)
      setStatus('registered')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [acquireToken])

  // 이미 취득된 토큰만 반환 — 권한 요청/새 토큰 발급 없음 (알림 끄기 등 부수효과 없는 조회용)
  const getCachedToken = useCallback((): string | null => tokenRef.current, [])

  return { status, prewarm, acquireToken, requestAndRegister, getCachedToken }
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run entities/fcm/hooks/useFcmToken.test.ts`
Expected: PASS (2/2)

- [ ] **Step 9: index.ts export 추가**

`entities/fcm/index.ts`:

```ts
// 변경 전
export { requestFcmToken, registerTokenToServer } from './api'
export { useFcmToken } from './hooks/useFcmToken'
export { FcmAutoRegister } from './providers/FcmAutoRegister'

// 변경 후
export { requestFcmToken, registerTokenToServer, unregisterTokenFromServer } from './api'
export { useFcmToken } from './hooks/useFcmToken'
export { FcmAutoRegister } from './providers/FcmAutoRegister'
```

- [ ] **Step 10: 전체 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 11: 커밋**

```bash
git add entities/fcm
git commit -m "feat(fcm): 토큰 해제 API·getCachedToken 추가 (알림 채널 해제 기능 기반)"
```

---

## Task 4: NotificationSettings 해제 로직 연결

**Files:**
- Modify: `features/settings/notification-channel/NotificationSettings.tsx`
- Test: `features/settings/notification-channel/NotificationSettings.test.tsx` (신규)

**Interfaces:**
- Consumes: Task 3의 `unregisterTokenFromServer(token)`, `useFcmToken().getCachedToken()`

- [ ] **Step 1: 실패하는 테스트 작성** — `features/settings/notification-channel/NotificationSettings.test.tsx` 생성:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NotificationSettings } from './NotificationSettings'

const {
  refreshMock,
  mutateAsyncMock,
  getCachedTokenMock,
  acquireTokenMock,
  unregisterTokenFromServerMock,
  registerTokenToServerMock,
} = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  getCachedTokenMock: vi.fn(),
  acquireTokenMock: vi.fn(),
  unregisterTokenFromServerMock: vi.fn(),
  registerTokenToServerMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@entities/user', () => ({
  useUpdateNotificationChannelMutation: () => ({ mutateAsync: mutateAsyncMock }),
}))

vi.mock('@entities/fcm', () => ({
  useFcmToken: () => ({
    status: 'idle',
    prewarm: vi.fn(),
    acquireToken: acquireTokenMock,
    getCachedToken: getCachedTokenMock,
  }),
  registerTokenToServer: registerTokenToServerMock,
  unregisterTokenFromServer: unregisterTokenFromServerMock,
}))

describe('NotificationSettings — FCM 해제', () => {
  beforeEach(() => {
    refreshMock.mockClear()
    mutateAsyncMock.mockClear().mockResolvedValue(undefined)
    getCachedTokenMock.mockClear().mockReturnValue(null)
    acquireTokenMock.mockClear()
    unregisterTokenFromServerMock.mockClear().mockResolvedValue(undefined)
    registerTokenToServerMock.mockClear()
  })

  it('FCM에서 NONE으로 전환하고 캐시된 토큰이 있으면 서버에서 해제한다', async () => {
    getCachedTokenMock.mockReturnValue('cached-token')
    const user = userEvent.setup()
    render(<NotificationSettings currentChannel="FCM" hasTelegram={false} />)

    await user.click(screen.getByRole('button', { name: /끄기/ }))

    expect(mutateAsyncMock).toHaveBeenCalledWith('NONE')
    expect(unregisterTokenFromServerMock).toHaveBeenCalledWith('cached-token')
    expect(acquireTokenMock).not.toHaveBeenCalled()
  })

  it('ALL에서 TELEGRAM으로 전환하고 캐시된 토큰이 없으면 해제를 호출하지 않는다', async () => {
    getCachedTokenMock.mockReturnValue(null)
    const user = userEvent.setup()
    render(<NotificationSettings currentChannel="ALL" hasTelegram={true} />)

    await user.click(screen.getByRole('button', { name: /텔레그램/ }))

    expect(mutateAsyncMock).toHaveBeenCalledWith('TELEGRAM')
    expect(unregisterTokenFromServerMock).not.toHaveBeenCalled()
  })

  it('TELEGRAM에서 FCM으로 전환(등록)할 때는 해제를 호출하지 않는다', async () => {
    acquireTokenMock.mockResolvedValue('new-token')
    registerTokenToServerMock.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<NotificationSettings currentChannel="TELEGRAM" hasTelegram={true} />)

    await user.click(screen.getByRole('button', { name: /푸시 알림/ }))

    expect(registerTokenToServerMock).toHaveBeenCalledWith('new-token')
    expect(unregisterTokenFromServerMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run features/settings/notification-channel/NotificationSettings.test.tsx`
Expected: FAIL — `unregisterTokenFromServer` 미사용, 첫 번째 테스트 실패

- [ ] **Step 3: 구현** — `features/settings/notification-channel/NotificationSettings.tsx`:

```tsx
// 변경 전 (상단 import)
import { useFcmToken, registerTokenToServer } from '@entities/fcm'

// 변경 후
import { useFcmToken, registerTokenToServer, unregisterTokenFromServer } from '@entities/fcm'
```

```tsx
// 변경 전
export function NotificationSettings({ currentChannel, hasTelegram }: Props) {
  const router = useRouter()
  const { status: fcmStatus, prewarm, acquireToken } = useFcmToken()
  const mutation = useUpdateNotificationChannelMutation()
  const [pendingChannel, setPendingChannel] = useState<NotificationChannel | null>(null)

  // permission 이미 granted인 경우 설정 페이지 진입 시 토큰 사전 취득
  useEffect(() => {
    prewarm()
  }, [prewarm])

  async function handleChannelSelect(next: NotificationChannel) {
    if (next === currentChannel || pendingChannel !== null) return
    if ((next === 'TELEGRAM' || next === 'ALL') && !hasTelegram) {
      toast.error('텔레그램 봇을 먼저 연결해주세요')
      return
    }

    setPendingChannel(next)

    try {
      if ((next === 'FCM' || next === 'ALL') && fcmStatus !== 'registered') {

// 변경 후
export function NotificationSettings({ currentChannel, hasTelegram }: Props) {
  const router = useRouter()
  const { status: fcmStatus, prewarm, acquireToken, getCachedToken } = useFcmToken()
  const mutation = useUpdateNotificationChannelMutation()
  const [pendingChannel, setPendingChannel] = useState<NotificationChannel | null>(null)

  // permission 이미 granted인 경우 설정 페이지 진입 시 토큰 사전 취득
  useEffect(() => {
    prewarm()
  }, [prewarm])

  async function handleChannelSelect(next: NotificationChannel) {
    if (next === currentChannel || pendingChannel !== null) return
    if ((next === 'TELEGRAM' || next === 'ALL') && !hasTelegram) {
      toast.error('텔레그램 봇을 먼저 연결해주세요')
      return
    }

    setPendingChannel(next)

    try {
      const wasFcm = currentChannel === 'FCM' || currentChannel === 'ALL'
      const willBeFcm = next === 'FCM' || next === 'ALL'

      if (wasFcm && !willBeFcm) {
        // 알림 끄는 상황에서 새 권한 요청을 하면 안 되므로 캐시된 토큰만 사용 (best-effort)
        const cachedToken = getCachedToken()
        await mutation.mutateAsync(next)
        if (cachedToken) unregisterTokenFromServer(cachedToken).catch(() => {})
        router.refresh()
        return
      }

      if ((next === 'FCM' || next === 'ALL') && fcmStatus !== 'registered') {
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run features/settings/notification-channel/NotificationSettings.test.tsx`
Expected: PASS (3/3)

- [ ] **Step 5: 전체 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add features/settings/notification-channel
git commit -m "feat(settings): 알림 채널을 FCM에서 전환 시 서버 FCM 토큰 해제"
```

---

## Task 5: admin/logs 위젯 분리

**Files:**
- Create: `widgets/admin-log-list/AnomaliesSection.tsx`
- Create: `widgets/admin-log-list/ErrorLogsSection.tsx`
- Create: `widgets/admin-log-list/AuditLogsSection.tsx`
- Create: `widgets/admin-log-list/AccountTable.tsx`
- Create: `widgets/admin-log-list/index.ts`
- Modify: `app/(admin)/admin/logs/page.tsx`

**Interfaces:**
- Produces: `AnomaliesSection`, `ErrorLogsSection`, `AuditLogsSection` (widgets/admin-log-list의 index.ts에서 export — `AccountTable`은 `AnomaliesSection` 내부 전용이라 미노출)

- [ ] **Step 1: `AccountTable.tsx` 생성**

```tsx
import { RevealableValue } from '@widgets/revealable-value'
import type { AdminAnomalyAccount } from '@entities/user'

export function AccountTable({ accounts }: { accounts: AdminAnomalyAccount[] }) {
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="min-w-[320px] w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">소유자</th>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">계좌번호</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((a) => (
            <tr key={a.id} className="hover:bg-muted/20">
              <td className="px-4 py-2.5 font-medium">{a.ownerNickname}</td>
              <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">
                <RevealableValue
                  value={a.accountNoMasked ?? ''}
                  hiddenDisplay={a.accountNoMasked ?? ''}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: `AnomaliesSection.tsx` 생성** (로컬 `EmptyState`는 `@shared/ui/EmptyState`로 대체 — `text` prop → `message` prop)

```tsx
import { Suspense } from 'react'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import { EmptyState } from '@shared/ui/EmptyState'
import type { AdminAnomalies } from '@entities/user'
import { AccountTable } from './AccountTable'

export function AnomaliesSection({
  anomalies, range, from, to,
}: {
  anomalies: AdminAnomalies
  range: RangePreset
  from?: string
  to?: string
}) {
  const total = anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length
  return (
    <section>
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          이상징후(7일)
          {total > 0 && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-warn-bg text-warn">
              {total}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <RangeFilterBar current={range} from={from} to={to} paramPrefix="ano" pageParamKeys={[]} />
          </Suspense>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            일시정지 계좌
            {anomalies.pausedAccounts.length > 0 && (
              <span className="ml-2 normal-case font-medium text-warn">
                {anomalies.pausedAccounts.length}
              </span>
            )}
          </p>
          {anomalies.pausedAccounts.length === 0 ? (
            <EmptyState message="일시정지된 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.pausedAccounts} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            비활성 계좌{' '}
            <span className="normal-case font-normal">(7일 거래 없음)</span>
            {anomalies.inactiveAccounts.length > 0 && (
              <span className="ml-2 font-medium text-slate-600">
                {anomalies.inactiveAccounts.length}
              </span>
            )}
          </p>
          {anomalies.inactiveAccounts.length === 0 ? (
            <EmptyState message="비활성 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.inactiveAccounts} />
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: `ErrorLogsSection.tsx` 생성**

```tsx
import { Suspense } from 'react'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { ErrorLogsSectionClient } from '@features/admin/error-logs'
import type { AppErrorLog } from '@entities/user'

export function ErrorLogsSection({
  logs, total, page, totalPages, size, range, from, to,
}: {
  logs: AppErrorLog[]
  total: number
  page: number
  totalPages: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}) {
  return (
    <section>
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          오류 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
        </h2>
        <div className="flex items-center gap-2 lg:flex-1">
          <Suspense fallback={null}>
            <RangeFilterBar current={range} from={from} to={to} paramPrefix="err" pageParamKeys={['ep']} />
          </Suspense>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <PageSizeSelector value={String(size)} pageParamKeys={['ep']} sizeParamKey="errSize" />
            </Suspense>
          </div>
        </div>
      </div>
      {logs.length === 0 ? (
        <EmptyState message="기록된 오류가 없습니다" />
      ) : (
        <ErrorLogsSectionClient logs={logs} />
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ep" />
    </section>
  )
}
```

- [ ] **Step 4: `AuditLogsSection.tsx` 생성**

```tsx
import { Suspense } from 'react'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { EmptyState } from '@shared/ui/EmptyState'
import { fmtDateTime } from '@shared/lib/format'
import type { AdminAuditLog } from '@entities/user'

export function AuditLogsSection({
  logs, total, page, totalPages, size, range, from, to,
}: {
  logs: AdminAuditLog[]
  total: number
  page: number
  totalPages: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}) {
  return (
    <section>
      <div className="mb-4 lg:flex lg:items-center lg:gap-3">
        <h2 className="text-base font-bold shrink-0 mb-2 lg:mb-0">
          관리자 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
        </h2>
        <div className="flex items-center gap-2 lg:flex-1">
          <Suspense fallback={null}>
            <RangeFilterBar current={range} from={from} to={to} paramPrefix="aud" pageParamKeys={['ap']} />
          </Suspense>
          <div className="ml-auto">
            <Suspense fallback={null}>
              <PageSizeSelector value={String(size)} pageParamKeys={['ap']} sizeParamKey="audSize" />
            </Suspense>
          </div>
        </div>
      </div>
      {logs.length === 0 ? (
        <EmptyState message="관리자 로그가 없습니다" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                      {log.action}
                    </span>
                    {log.targetType && (
                      <span className="text-sm text-muted-foreground">
                        {log.targetType}
                        {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    admin: {log.adminId.slice(0, 8)}…
                  </p>
                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <pre className="mt-1 text-sm text-muted-foreground bg-muted/40 rounded p-1 overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
                <time className="text-sm text-muted-foreground shrink-0">
                  {fmtDateTime(log.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ap" />
    </section>
  )
}
```

- [ ] **Step 5: `index.ts` 생성**

```ts
export { AnomaliesSection } from './AnomaliesSection'
export { ErrorLogsSection } from './ErrorLogsSection'
export { AuditLogsSection } from './AuditLogsSection'
```

- [ ] **Step 6: `app/(admin)/admin/logs/page.tsx`에서 인라인 서브컴포넌트 5개 삭제 + import 추가**

```tsx
// 변경 전 (상단 import)
import { Suspense } from 'react'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/user'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies, AdminAnomalyAccount } from '@entities/user'
import { ErrorLogsSectionClient } from '@features/admin/error-logs'
import { LogsFilterChips } from '@features/admin/logs'
import { RevealableValue } from '@widgets/revealable-value'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
import { fmtDateTime } from '@shared/lib/format'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'

// 변경 후
import { Suspense } from 'react'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/user'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies } from '@entities/user'
import { LogsFilterChips } from '@features/admin/logs'
import { AnomaliesSection, ErrorLogsSection, AuditLogsSection } from '@widgets/admin-log-list'
import { parsePage, parseRangePreset, parseSize, resolveRange } from '@shared/lib/date-range'
```

파일 끝의 `AnomaliesSection`, `ErrorLogsSection`, `AuditLogsSection`, `EmptyState`, `AccountTable` 함수 정의(117~328행) 전부 삭제 — `export default async function AdminLogsPage` 함수 본문(JSX에서 각 Section을 호출하는 부분)은 그대로 둔다.

- [ ] **Step 7: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add "app/(admin)/admin/logs/page.tsx" widgets/admin-log-list
git commit -m "refactor(admin): admin/logs 페이지의 인라인 서브컴포넌트를 widgets/admin-log-list로 분리"
```

---

## Task 6: entities/admin 슬라이스 신설

**Files:**
- Create: `entities/admin/model/types.ts`
- Create: `entities/admin/api/index.ts`
- Create: `entities/admin/api/index.test.ts` (entities/user/api/index.test.ts의 admin 테스트 이동)
- Create: `entities/admin/hooks/useAdminQueries.ts`
- Create: `entities/admin/hooks/useAdminQueries.test.tsx` (entities/user/hooks/useUserQueries.test.tsx의 admin 테스트 이동)
- Create: `entities/admin/index.ts`

**Interfaces:**
- Produces: `@entities/admin`에서 `AdminUser`, `AdminStats`, `AdminAccount`, `AdminAccountStrategy`, `AdminTrade`, `AdminStrategy`, `AdminStrategyOrder`, `AdminReorderRequest`, `AdminReorderResponse`, `AdminReorderTimingAvailability`, `AdminAuditLog`, `AdminAnomalyAccount`, `AdminAnomalies`, `AppErrorLog` 타입과 `listAdminUsers`, `approveAdminUser`, `rejectAdminUser`, `changeAdminUserRole`, `deleteAdminUser`, `getAdminStats`, `listAdminAccounts`, `listAdminStrategies`, `listAdminStrategyOrders`, `updateAdminStrategyStatus`, `listAdminTrades`, `reorderAdminOrder`, `getReorderTimingAvailability`, `listAdminAuditLogs`, `getAdminAnomalies`, `listAdminErrorLogs`, `softDeleteAdminErrorLog` 함수, `useAdminUsersQuery`, `useApproveUserMutation`, `useRejectUserMutation`, `useChangeUserRoleMutation`, `useDeleteAdminUserMutation` 훅을 export

이 태스크에서는 **entities/user는 아직 수정하지 않는다** — 새 슬라이스만 만든다 (양쪽에 동일 export가 잠시 존재해도 무방, 아직 아무도 `@entities/admin`을 import하지 않으므로 빌드는 안 깨진다). entities/user 정리는 Task 8에서 한다.

- [ ] **Step 1: `entities/admin/model/types.ts` 생성**

```ts
import type { OrderDirection, OrderStatus, OrderType, UserRole, UserStatus } from '@shared/lib/api-schema'

export interface AdminUser {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  pendingCount: number
  activeCount: number
  rejectedCount: number
  totalAccounts: number
}

export interface AdminAccountStrategy {
  id: string
  type: string
  status: string
  ticker: string
}

export interface AdminAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string
  broker: string
  strategies: AdminAccountStrategy[]
}

export interface AdminTrade {
  id: string
  userId: string
  accountId: string
  strategyId: string | null
  ownerNickname: string
  strategyType?: string
  tradeDate: string
  ticker: string
  direction: OrderDirection
  orderType: OrderType
  quantity: number
  price: number
  status: 'PLACED' | 'FILLED' | 'FAILED'
}

export interface AdminStrategy {
  id: string
  type: string
  status: 'ACTIVE' | 'PAUSED'
  ticker: string
  cycleSeedType: string
}

export interface AdminStrategyOrder {
  id: string
  userId: string
  ownerNickname: string
  strategyType?: string | null
  tradeDate: string
  ticker: string
  direction: OrderDirection
  orderType: OrderType
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  quantity: number
  price: number
  status: OrderStatus
  externalOrderId?: string | null
  filledQuantity?: number | null
  filledPrice?: number | null
}

export interface AdminReorderTimingAvailability {
  atOpen: boolean
  atClose: boolean
  immediate: boolean
}

export interface AdminReorderRequest {
  userId: string
  accountId: string
  strategyId: string
  orderId: string
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  tradeDateKst: string
  direction?: OrderDirection
  quantity?: number
  price?: number
  memo?: string
}

export interface AdminReorderResponse {
  userId: string
  accountId: string
  strategyId: string
  sourceOrderId: string
  originalStatus: OrderStatus
  resultingStatus: OrderStatus
  newOrderExternalId?: string | null
}

export interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  targetType: string | null
  targetId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export interface AdminAnomalyAccount {
  id: string
  userId: string
  ownerNickname: string
  accountNoMasked: string
}

export interface AdminAnomalies {
  pausedAccounts: AdminAnomalyAccount[]
  inactiveAccounts: AdminAnomalyAccount[]
}

export interface AppErrorLog {
  id: string
  errorType: string
  message: string
  stackTrace: string
  context: Record<string, string>
  createdAt: string
}
```

- [ ] **Step 2: `entities/admin/api/index.ts` 생성**

```ts
import { apiFetch, clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import type {
  AdminUser,
  AdminStats,
  AdminAccount,
  AdminTrade,
  AdminAuditLog,
  AdminAnomalies,
  AppErrorLog,
  AdminStrategy,
  AdminStrategyOrder,
  AdminReorderRequest,
  AdminReorderResponse,
  AdminReorderTimingAvailability,
} from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'

export async function listAdminUsers(
  token?: string,
  status?: UserStatus,
  from?: string,
  to?: string,
): Promise<AdminUser[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return fetchEither<AdminUser[]>(`/api/admin/users${query}`, { method: 'GET' }, token)
}

export async function approveAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/status`, jsonBody('PATCH', { status: 'ACTIVE' }))
}

export async function rejectAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/status`, jsonBody('PATCH', { status: 'REJECTED' }))
}

export async function changeAdminUserRole(userId: string, role: UserRole): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}/role`, jsonBody('PATCH', { role }))
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await clientFetch<void>(`/api/admin/users/${userId}`, { method: 'DELETE' })
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/dashboard/stats', { method: 'GET' }, token)
}

export async function listAdminAccounts(token?: string, from?: string, to?: string): Promise<AdminAccount[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return fetchEither<AdminAccount[]>(`/api/admin/accounts${query}`, { method: 'GET' }, token)
}

export async function listAdminStrategies(accountId: string, token?: string): Promise<AdminStrategy[]> {
  return fetchEither<AdminStrategy[]>(`/api/admin/accounts/${accountId}/strategies`, { method: 'GET' }, token)
}

export async function listAdminStrategyOrders(
  accountId: string,
  strategyId: string,
  tradeDate: string,
  token?: string,
): Promise<AdminStrategyOrder[]> {
  const params = new URLSearchParams({ tradeDate })
  return fetchEither<AdminStrategyOrder[]>(
    `/api/admin/accounts/${accountId}/strategies/${strategyId}/orders?${params.toString()}`,
    { method: 'GET' },
    token,
  )
}

export async function updateAdminStrategyStatus(accountId: string, strategyId: string, status: AdminStrategy['status']): Promise<void> {
  await clientFetch<void>(
    `/api/admin/accounts/${accountId}/strategies/${strategyId}/status`,
    jsonBody('PATCH', { status }),
  )
}

export async function listAdminTrades(token: string, from?: string, to?: string): Promise<AdminTrade[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminTrade[]>(`/api/admin/trades${query}`, { method: 'GET' }, token)
}

export async function reorderAdminOrder(request: AdminReorderRequest): Promise<AdminReorderResponse> {
  return clientFetch<AdminReorderResponse>('/api/admin/trades/reorders', jsonBody('POST', request))
}

export async function getReorderTimingAvailability(): Promise<AdminReorderTimingAvailability> {
  return clientFetch<AdminReorderTimingAvailability>('/api/admin/trades/reorder-timing', { method: 'GET' })
}

export async function listAdminAuditLogs(token: string, from?: string, to?: string): Promise<AdminAuditLog[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminAuditLog[]>(`/api/admin/logs/audit${query}`, { method: 'GET' }, token)
}

export async function getAdminAnomalies(token: string, inactiveDays?: number, from?: string, to?: string): Promise<AdminAnomalies> {
  const params = new URLSearchParams()
  if (inactiveDays != null) params.set('inactiveDays', String(inactiveDays))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminAnomalies>(`/api/admin/logs/anomalies${query}`, { method: 'GET' }, token)
}

export async function listAdminErrorLogs(token: string, limit = 100, from?: string, to?: string): Promise<AppErrorLog[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return apiFetch<AppErrorLog[]>(`/api/admin/logs/errors?${params}`, { method: 'GET' }, token)
}

export async function softDeleteAdminErrorLog(id: string): Promise<void> {
  await clientFetch<void>(`/api/admin/logs/errors/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 3: `entities/admin/api/index.test.ts` 생성** — `entities/user/api/index.test.ts`의 전체 내용을 그대로 복사한다 (상대 경로 `./index`, `../model/types`가 새 위치에서도 그대로 유효하므로 내용 변경 없음). 원본 파일은 이 태스크에서 아직 지우지 않는다(Task 8에서 삭제).

- [ ] **Step 4: 테스트 실행 확인**

Run: `npx vitest run entities/admin/api/index.test.ts`
Expected: PASS (7/7 — 원본과 동일한 테스트 수)

- [ ] **Step 5: `entities/admin/hooks/useAdminQueries.ts` 생성**

```ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { listAdminUsers, approveAdminUser, rejectAdminUser, changeAdminUserRole, deleteAdminUser } from '../api'
import type { AdminUser } from '../model/types'
import type { UserRole, UserStatus } from '@shared/lib/api-schema'

export function useAdminUsersQuery(filter?: UserStatus, initialData?: AdminUser[]) {
  return useQuery<AdminUser[]>({
    queryKey: ['adminUsers', filter],
    queryFn: () => listAdminUsers(undefined, filter),
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 30_000,
  })
}

export function useApproveUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => approveAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('승인 처리에 실패했습니다.'),
  })
}

export function useRejectUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => rejectAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('거절 처리에 실패했습니다.'),
  })
}

export function useChangeUserRoleMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      changeAdminUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('역할 변경에 실패했습니다.'),
  })
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
      router.refresh()
    },
    onError: () => toast.error('사용자 삭제에 실패했습니다.'),
  })
}
```

- [ ] **Step 6: `entities/admin/hooks/useAdminQueries.test.tsx` 생성**

```tsx
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminUser } from '../model/types'
import { useAdminUsersQuery } from './useAdminQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('../api', () => ({
  listAdminUsers: vi.fn(),
  approveAdminUser: vi.fn(),
  rejectAdminUser: vi.fn(),
  changeAdminUserRole: vi.fn(),
  deleteAdminUser: vi.fn(),
}))

const baseAdminUser: AdminUser = {
  id: 'admin-user-1',
  nickname: 'pending user',
  status: 'PENDING',
  role: 'USER',
  createdAt: '2026-07-01T00:00:00Z',
}

describe('useAdminUsersQuery', () => {
  it('marks initial admin user data stale so admin lists refetch immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: [baseAdminUser] })

    renderHook(() => useAdminUsersQuery('PENDING', [baseAdminUser]))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['adminUsers', 'PENDING'],
      initialData: [baseAdminUser],
      initialDataUpdatedAt: 0,
    }))
  })
})
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run entities/admin/hooks/useAdminQueries.test.tsx`
Expected: PASS (1/1)

- [ ] **Step 8: `entities/admin/index.ts` 생성**

```ts
export type {
  AdminUser,
  AdminStats,
  AdminAccount,
  AdminAccountStrategy,
  AdminTrade,
  AdminStrategy,
  AdminStrategyOrder,
  AdminReorderRequest,
  AdminReorderResponse,
  AdminReorderTimingAvailability,
  AdminAuditLog,
  AdminAnomalyAccount,
  AdminAnomalies,
  AppErrorLog,
} from './model/types'
export {
  listAdminUsers,
  approveAdminUser,
  rejectAdminUser,
  changeAdminUserRole,
  deleteAdminUser,
  getAdminStats,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
  listAdminTrades,
  reorderAdminOrder,
  getReorderTimingAvailability,
  listAdminAuditLogs,
  getAdminAnomalies,
  listAdminErrorLogs,
  softDeleteAdminErrorLog,
} from './api'
export {
  useAdminUsersQuery,
  useApproveUserMutation,
  useRejectUserMutation,
  useChangeUserRoleMutation,
  useDeleteAdminUserMutation,
} from './hooks/useAdminQueries'
```

- [ ] **Step 9: 전체 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS (아직 아무도 `@entities/admin`을 소비하지 않으므로 기존 테스트 수 그대로 + 신규 2개 파일 추가)

- [ ] **Step 10: 커밋**

```bash
git add entities/admin
git commit -m "feat(entities): entities/admin 슬라이스 신설 (entities/user에서 admin 타입·API·훅 복제, 소비처 전환은 후속 태스크)"
```

---

## Task 7: app/ + widgets/ 소비 파일을 @entities/admin으로 전환

**Files:**
- Modify: `app/(admin)/admin/page.tsx`
- Modify: `app/(admin)/admin/trades/page.tsx`
- Modify: `app/(admin)/admin/accounts/page.tsx`
- Modify: `app/(admin)/admin/users/page.tsx`
- Modify: `app/(admin)/admin/pending/page.tsx`
- Modify: `app/(admin)/admin/logs/page.tsx`
- Modify: `widgets/admin-log-list/AnomaliesSection.tsx`
- Modify: `widgets/admin-log-list/ErrorLogsSection.tsx`
- Modify: `widgets/admin-log-list/AuditLogsSection.tsx`
- Modify: `widgets/admin-log-list/AccountTable.tsx`
- Modify: `widgets/admin-user-list/AdminUsersTable.tsx`
- Modify: `widgets/admin-user-list/AdminPendingList.tsx`

**공통 규칙:** 각 파일에서 admin 전용 심볼(타입·함수·훅)의 import만 `@entities/user` → `@entities/admin`으로 바꾼다. `UserStatus`/`UserRole`/`NotificationChannel`/`User`/`getMe` 등 일반 심볼은 `@entities/user`에 그대로 둔다.

- [ ] **Step 1: `app/(admin)/admin/page.tsx`**

```ts
// 변경 전
import { getAdminStats, listAdminUsers } from '@entities/user'
// 변경 후
import { getAdminStats, listAdminUsers } from '@entities/admin'
```

- [ ] **Step 2: `app/(admin)/admin/trades/page.tsx`**

```ts
// 변경 전
import { listAdminTrades } from '@entities/user'
import type { AdminTrade } from '@entities/user'
// 변경 후
import { listAdminTrades } from '@entities/admin'
import type { AdminTrade } from '@entities/admin'
```

- [ ] **Step 3: `app/(admin)/admin/accounts/page.tsx`**

```ts
// 변경 전
import { listAdminAccounts } from '@entities/user'
import type { AdminAccount, AdminAccountStrategy } from '@entities/user'
// 변경 후
import { listAdminAccounts } from '@entities/admin'
import type { AdminAccount, AdminAccountStrategy } from '@entities/admin'
```

- [ ] **Step 4: `app/(admin)/admin/users/page.tsx`** (`getMe`는 일반 심볼이므로 `@entities/user`에 유지)

```ts
// 변경 전
import { listAdminUsers, getMe } from '@entities/user'
// 변경 후
import { listAdminUsers } from '@entities/admin'
import { getMe } from '@entities/user'
```

- [ ] **Step 5: `app/(admin)/admin/pending/page.tsx`**

```ts
// 변경 전
import { listAdminUsers } from '@entities/user'
// 변경 후
import { listAdminUsers } from '@entities/admin'
```

- [ ] **Step 6: `app/(admin)/admin/logs/page.tsx`** (Task 5 이후 상태 기준)

```ts
// 변경 전
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/user'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies } from '@entities/user'
// 변경 후
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/admin'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies } from '@entities/admin'
```

- [ ] **Step 7: `widgets/admin-log-list/AnomaliesSection.tsx`**

```ts
// 변경 전
import type { AdminAnomalies } from '@entities/user'
// 변경 후
import type { AdminAnomalies } from '@entities/admin'
```

- [ ] **Step 8: `widgets/admin-log-list/ErrorLogsSection.tsx`**

```ts
// 변경 전
import type { AppErrorLog } from '@entities/user'
// 변경 후
import type { AppErrorLog } from '@entities/admin'
```

- [ ] **Step 9: `widgets/admin-log-list/AuditLogsSection.tsx`**

```ts
// 변경 전
import type { AdminAuditLog } from '@entities/user'
// 변경 후
import type { AdminAuditLog } from '@entities/admin'
```

- [ ] **Step 10: `widgets/admin-log-list/AccountTable.tsx`**

```ts
// 변경 전
import type { AdminAnomalyAccount } from '@entities/user'
// 변경 후
import type { AdminAnomalyAccount } from '@entities/admin'
```

- [ ] **Step 11: `widgets/admin-user-list/AdminUsersTable.tsx`** (`UserStatus`는 일반 심볼이므로 유지)

```ts
// 변경 전
import { useAdminUsersQuery } from '@entities/user'
...
import type { AdminUser, UserStatus } from '@entities/user'
// 변경 후
import { useAdminUsersQuery } from '@entities/admin'
...
import type { AdminUser } from '@entities/admin'
import type { UserStatus } from '@entities/user'
```

- [ ] **Step 12: `widgets/admin-user-list/AdminPendingList.tsx`**

```ts
// 변경 전
import { useAdminUsersQuery } from '@entities/user'
...
import type { AdminUser } from '@entities/user'
// 변경 후
import { useAdminUsersQuery } from '@entities/admin'
...
import type { AdminUser } from '@entities/admin'
```

- [ ] **Step 13: 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS

- [ ] **Step 14: 커밋**

```bash
git add "app/(admin)" widgets/admin-log-list widgets/admin-user-list
git commit -m "refactor(admin): app·admin-log-list·admin-user-list의 admin 타입/API/훅 import를 entities/admin으로 전환"
```

---

## Task 8: widgets/admin-trade-list + features/admin 전환 · entities/user 정리 · 최종 검증

**Files:**
- Modify: `widgets/admin-trade-list/AdminTradesTable.tsx`
- Modify: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
- Modify: `widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx`
- Modify: `widgets/admin-trade-list/AdminBatchOrderCorrectionForm.tsx`
- Modify: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`
- Modify: `widgets/admin-trade-list/adminTradesReducer.ts`
- Modify: `features/admin/error-logs/ErrorLogsSectionClient.tsx`
- Modify: `features/admin/error-logs/ErrorLogsSectionClient.test.tsx`
- Modify: `features/admin/error-logs/ErrorLogItem.tsx`
- Modify: `features/admin/withdraw-user/WithdrawUserButton.tsx`
- Modify: `features/admin/withdraw-user/WithdrawUserButton.test.tsx`
- Modify: `features/admin/approve-reject/ApproveRejectButtons.tsx`
- Modify: `features/admin/change-role/ChangeRoleButton.tsx`
- Modify: `entities/user/model/types.ts`
- Modify: `entities/user/api/index.ts`
- Delete: `entities/user/api/index.test.ts`
- Modify: `entities/user/hooks/useUserQueries.ts`
- Modify: `entities/user/hooks/useUserQueries.test.tsx`
- Modify: `entities/user/index.ts`

- [ ] **Step 1: `widgets/admin-trade-list/AdminTradesTable.tsx`**

```ts
// 변경 전
import type { AdminTrade } from '@entities/user'
// 변경 후
import type { AdminTrade } from '@entities/admin'
```

- [ ] **Step 2: `widgets/admin-trade-list/AdminTradesWorkbench.tsx`**

```ts
// 변경 전
import {
  reorderAdminOrder,
  getReorderTimingAvailability,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
} from '@entities/user'
import type {
  AdminAccount,
  AdminStrategy,
  AdminStrategyOrder,
  AdminTrade,
} from '@entities/user'
// 변경 후
import {
  reorderAdminOrder,
  getReorderTimingAvailability,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
} from '@entities/admin'
import type {
  AdminAccount,
  AdminStrategy,
  AdminStrategyOrder,
  AdminTrade,
} from '@entities/admin'
```

- [ ] **Step 3: `widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx`**

```ts
// 변경 전
import type { AdminAccount, AdminReorderTimingAvailability, AdminStrategy, AdminStrategyOrder } from '@entities/user'
// 변경 후
import type { AdminAccount, AdminReorderTimingAvailability, AdminStrategy, AdminStrategyOrder } from '@entities/admin'
```

- [ ] **Step 4: `widgets/admin-trade-list/AdminBatchOrderCorrectionForm.tsx`**

```ts
// 변경 전
import type { AdminReorderTimingAvailability, AdminStrategyOrder } from '@entities/user'
// 변경 후
import type { AdminReorderTimingAvailability, AdminStrategyOrder } from '@entities/admin'
```

- [ ] **Step 5: `widgets/admin-trade-list/adminTradesReducer.ts`**

```ts
// 변경 전
import type {
  AdminAccount,
  AdminReorderTimingAvailability,
  AdminStrategy,
  AdminStrategyOrder,
} from '@entities/user'
// 변경 후
import type {
  AdminAccount,
  AdminReorderTimingAvailability,
  AdminStrategy,
  AdminStrategyOrder,
} from '@entities/admin'
```

- [ ] **Step 6: `widgets/admin-trade-list/AdminTradesWorkbench.test.tsx`**

```ts
// 변경 전
import { reorderAdminOrder, getReorderTimingAvailability } from '@entities/user'
import type { AdminAccount, AdminStrategy, AdminStrategyOrder, AdminTrade } from '@entities/user'
// 변경 후
import { reorderAdminOrder, getReorderTimingAvailability } from '@entities/admin'
import type { AdminAccount, AdminStrategy, AdminStrategyOrder, AdminTrade } from '@entities/admin'
```

```ts
// 변경 전
vi.mock('@entities/user', async () => {
  const actual = await vi.importActual<typeof import('@entities/user')>('@entities/user')

  return {
    ...actual,
    reorderAdminOrder: vi.fn(),
    getReorderTimingAvailability: vi.fn().mockResolvedValue({
      atOpen: false,
      atClose: true,
      immediate: false,
    }),
  }
})
// 변경 후
vi.mock('@entities/admin', async () => {
  const actual = await vi.importActual<typeof import('@entities/admin')>('@entities/admin')

  return {
    ...actual,
    reorderAdminOrder: vi.fn(),
    getReorderTimingAvailability: vi.fn().mockResolvedValue({
      atOpen: false,
      atClose: true,
      immediate: false,
    }),
  }
})
```

- [ ] **Step 7: `features/admin/error-logs/ErrorLogsSectionClient.tsx`**

```ts
// 변경 전
import { softDeleteAdminErrorLog, type AppErrorLog } from '@entities/user'
// 변경 후
import { softDeleteAdminErrorLog, type AppErrorLog } from '@entities/admin'
```

- [ ] **Step 8: `features/admin/error-logs/ErrorLogsSectionClient.test.tsx`**

```ts
// 변경 전
import type { AppErrorLog } from '@entities/user'
// 변경 후
import type { AppErrorLog } from '@entities/admin'
```

```ts
// 변경 전
vi.mock('@entities/user', () => ({
  softDeleteAdminErrorLog: softDeleteAdminErrorLogMock,
}))
// 변경 후
vi.mock('@entities/admin', () => ({
  softDeleteAdminErrorLog: softDeleteAdminErrorLogMock,
}))
```

- [ ] **Step 9: `features/admin/error-logs/ErrorLogItem.tsx`**

```ts
// 변경 전
import type { AppErrorLog } from '@entities/user'
// 변경 후
import type { AppErrorLog } from '@entities/admin'
```

- [ ] **Step 10: `features/admin/withdraw-user/WithdrawUserButton.tsx`**

```ts
// 변경 전
import { useDeleteAdminUserMutation } from '@entities/user'
// 변경 후
import { useDeleteAdminUserMutation } from '@entities/admin'
```

- [ ] **Step 11: `features/admin/withdraw-user/WithdrawUserButton.test.tsx`**

```ts
// 변경 전
vi.mock('@entities/user', () => ({
  useDeleteAdminUserMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))
// 변경 후
vi.mock('@entities/admin', () => ({
  useDeleteAdminUserMutation: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))
```

- [ ] **Step 12: `features/admin/approve-reject/ApproveRejectButtons.tsx`**

```ts
// 변경 전
import { useApproveUserMutation, useRejectUserMutation } from '@entities/user'
// 변경 후
import { useApproveUserMutation, useRejectUserMutation } from '@entities/admin'
```

- [ ] **Step 13: `features/admin/change-role/ChangeRoleButton.tsx`** (`UserRole`은 일반 심볼이므로 `@entities/user` 유지)

```ts
// 변경 전
import { useChangeUserRoleMutation } from '@entities/user'
import type { UserRole } from '@entities/user'
// 변경 후
import { useChangeUserRoleMutation } from '@entities/admin'
import type { UserRole } from '@entities/user'
```

- [ ] **Step 14: 중간 검증** (entities/user 정리 전 — 소비처 전환이 전부 끝났는지 확인)

Run: `npm run typecheck && npm run test:run`
Expected: PASS.

추가로 아래 스크립트로, `@entities/user`를 import하면서 admin 심볼도 텍스트로 포함하는 파일을 찾는다 (해당 파일을 열어 admin 심볼이 실제로는 `@entities/admin`에서 오는지 — `getMe`/`UserRole`처럼 일반 심볼과 섞여 있어 파일 자체는 정상일 수 있다 — 육안으로 최종 확인한다):

```bash
ADMIN_SYMBOLS='AdminUser|AdminStats|AdminAccount|AdminTrade|AdminStrategy|AdminReorder|AdminAuditLog|AdminAnomal|AppErrorLog|listAdminUsers|approveAdminUser|rejectAdminUser|changeAdminUserRole|deleteAdminUser|getAdminStats|listAdminAccounts|listAdminStrategies|listAdminStrategyOrders|updateAdminStrategyStatus|listAdminTrades|reorderAdminOrder|getReorderTimingAvailability|listAdminAuditLogs|getAdminAnomalies|listAdminErrorLogs|softDeleteAdminErrorLog|useAdminUsersQuery|useApproveUserMutation|useRejectUserMutation|useChangeUserRoleMutation|useDeleteAdminUserMutation'
for f in $(grep -rl "@entities/user'" app widgets features --include='*.ts' --include='*.tsx'); do
  grep -qE "$ADMIN_SYMBOLS" "$f" && echo "확인 필요: $f"
done
```
Expected: `app/(admin)/admin/users/page.tsx`, `widgets/admin-user-list/AdminUsersTable.tsx`, `features/admin/change-role/ChangeRoleButton.tsx` 3개만 출력되면 정상 — 이 3개는 Step 4·11·13에서 이미 `@entities/admin`(admin 심볼)과 `@entities/user`(`getMe`/`UserStatus`/`UserRole`)로 의도적으로 분리해뒀다. 이 3개 외의 파일이 출력되면 아직 `@entities/user`에서 admin 심볼을 import하는 실제 누락이므로 열어서 고친다.

- [ ] **Step 15: `entities/user/model/types.ts`에서 Admin* 인터페이스 전부 삭제**

```ts
// 변경 전 (파일 전체)
export type { UserStatus, UserRole, NotificationChannel } from '@shared/lib/api-schema'
import type { UserStatus, UserRole, NotificationChannel, OrderDirection, OrderStatus, OrderType } from '@shared/lib/api-schema'

export interface User {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  hasTelegram: boolean
  telegramBotUsername?: string | null
  notificationChannel?: NotificationChannel
  balanceCheckEnabled: boolean
  notificationPrefs?: Record<string, boolean>
}

export interface AdminUser { ... }
export interface AdminStats { ... }
... (Admin* 전부, AppErrorLog까지)

// 변경 후 (파일 전체)
export type { UserStatus, UserRole, NotificationChannel } from '@shared/lib/api-schema'
import type { UserStatus, UserRole, NotificationChannel } from '@shared/lib/api-schema'

export interface User {
  id: string
  nickname: string
  status: UserStatus
  role: UserRole
  hasTelegram: boolean
  telegramBotUsername?: string | null
  notificationChannel?: NotificationChannel
  balanceCheckEnabled: boolean
  notificationPrefs?: Record<string, boolean>
}
```

(`OrderDirection`, `OrderStatus`, `OrderType` import 제거 — `User` 인터페이스는 이 타입들을 쓰지 않으므로 Admin* 삭제 후 미사용이 된다)

- [ ] **Step 16: `entities/user/api/index.ts`에서 admin 함수 전부 삭제**

```ts
// 변경 전 (파일 전체)
import { apiFetch, clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import type {
  User,
  UserRole,
  UserStatus,
  AdminUser,
  AdminStats,
  AdminAccount,
  AdminTrade,
  AdminAuditLog,
  AdminAnomalies,
  AppErrorLog,
  AdminStrategy,
  AdminStrategyOrder,
  AdminReorderRequest,
  AdminReorderResponse,
  AdminReorderTimingAvailability,
} from '../model/types'

export async function getMe(token: string): Promise<User> { ... }
export async function getMeClient(): Promise<User> { ... }
export async function updateNotificationPref(...) { ... }
export async function updateBalanceCheckEnabled(...) { ... }
export async function updateNickname(...) { ... }
export async function reapply(...) { ... }
export async function deleteMe(...) { ... }
export async function updateNotificationChannel(...) { ... }
export async function updateTelegram(...) { ... }
export async function deleteTelegram(...) { ... }
export async function listAdminUsers(...) { ... }
... (admin 함수 전부)

// 변경 후 (파일 전체)
import { apiFetch, clientFetch, jsonBody } from '@shared/lib/api-client'
import type { User } from '../model/types'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function getMeClient(): Promise<User> {
  return clientFetch<User>('/api/auth/me', { method: 'GET' })
}

export async function updateNotificationPref(type: string, enabled: boolean): Promise<void> {
  await clientFetch<void>(`/api/settings/notifications/${type}`, jsonBody('PATCH', { enabled }))
}

export async function updateBalanceCheckEnabled(enabled: boolean): Promise<void> {
  await clientFetch<void>('/api/settings/balance-check', jsonBody('PATCH', { enabled }))
}

export async function updateNickname(nickname: string): Promise<void> {
  await clientFetch<void>('/api/settings/nickname', jsonBody('PATCH', { nickname }))
}

export async function reapply(): Promise<void> {
  await clientFetch<void>('/api/auth/reapply-done', { method: 'POST' })
}

export async function deleteMe(): Promise<void> {
  await clientFetch<void>('/api/auth/me', { method: 'DELETE' })
}

export async function updateNotificationChannel(channel: string): Promise<void> {
  await clientFetch<void>('/api/settings/notification-channel', jsonBody('PATCH', { channel }))
}

export async function updateTelegram(data: { botToken: string; chatId: string }): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', jsonBody('PUT', data))
}

export async function deleteTelegram(): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', { method: 'DELETE' })
}
```

- [ ] **Step 17: `entities/user/api/index.test.ts` 삭제** (내용은 Task 6에서 `entities/admin/api/index.test.ts`로 이미 복제됨)

```bash
git rm entities/user/api/index.test.ts
```

- [ ] **Step 18: `entities/user/hooks/useUserQueries.ts`에서 admin 훅 전부 삭제**

```ts
// 변경 전 (파일 전체)
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { listAdminUsers, deleteMe, updateNotificationChannel, updateTelegram, deleteTelegram, approveAdminUser, rejectAdminUser, changeAdminUserRole, deleteAdminUser, getMeClient, updateBalanceCheckEnabled, updateNickname, updateNotificationPref } from '../api'
import type { AdminUser, User, UserRole, UserStatus } from '../model/types'

export function useMeQuery(...) { ... }
export function useUpdateNotificationPrefMutation() { ... }
export function useUpdateBalanceCheckEnabledMutation() { ... }
export function useUpdateNicknameMutation() { ... }
export function useAdminUsersQuery(...) { ... }
export function useDeleteMeMutation() { ... }
export function useUpdateNotificationChannelMutation() { ... }
export function useUpdateTelegramMutation() { ... }
export function useDeleteTelegramMutation() { ... }
export function useApproveUserMutation() { ... }
export function useRejectUserMutation() { ... }
export function useChangeUserRoleMutation() { ... }
export function useDeleteAdminUserMutation() { ... }

// 변경 후 (파일 전체)
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getMeClient, deleteMe, updateNotificationChannel, updateTelegram, deleteTelegram, updateBalanceCheckEnabled, updateNickname, updateNotificationPref } from '../api'
import type { User } from '../model/types'

export function useMeQuery(initialData?: User) {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: getMeClient,
    initialData,
    initialDataUpdatedAt: initialData ? 0 : undefined,
    staleTime: 60_000,
  })
}

export function useUpdateNotificationPrefMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      updateNotificationPref(type, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('알림 설정 변경에 실패했습니다.'),
  })
}

export function useUpdateBalanceCheckEnabledMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => updateBalanceCheckEnabled(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('잔고 검증 설정 변경에 실패했습니다.'),
  })
}

export function useUpdateNicknameMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nickname: string) => updateNickname(nickname),
    onSuccess: () => {
      toast.success('닉네임이 변경됐습니다.')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('닉네임 변경에 실패했습니다.'),
  })
}

export function useDeleteMeMutation() {
  return useMutation({ // eslint-disable-line react-doctor/query-mutation-missing-invalidation
    mutationFn: deleteMe,
    onError: () => toast.error('탈퇴 처리 중 오류가 발생했습니다.'),
  })
}

export function useUpdateNotificationChannelMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (channel: string) => updateNotificationChannel(channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('알림 채널 변경에 실패했습니다.'),
  })
}

export function useUpdateTelegramMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { botToken: string; chatId: string }) => updateTelegram(data),
    onSuccess: () => {
      toast.success('텔레그램이 연결됐습니다.')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('텔레그램 연결에 실패했습니다.'),
  })
}

export function useDeleteTelegramMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTelegram,
    onSuccess: () => {
      toast.success('텔레그램 연결이 해제됐습니다.')
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => toast.error('텔레그램 해제에 실패했습니다.'),
  })
}
```

- [ ] **Step 19: `entities/user/hooks/useUserQueries.test.tsx`에서 admin 관련 테스트 삭제**

```tsx
// 변경 전 (파일 전체)
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminUser, User } from '../model/types'
import { useAdminUsersQuery, useMeQuery } from './useUserQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock('../api', () => ({
  listAdminUsers: vi.fn(),
  reapply: vi.fn(),
  deleteMe: vi.fn(),
  updateNotificationChannel: vi.fn(),
  updateTelegram: vi.fn(),
  deleteTelegram: vi.fn(),
  approveAdminUser: vi.fn(),
  rejectAdminUser: vi.fn(),
  changeAdminUserRole: vi.fn(),
  deleteAdminUser: vi.fn(),
  getMeClient: vi.fn(),
  updateBalanceCheckEnabled: vi.fn(),
  updateNickname: vi.fn(),
  updateNotificationPref: vi.fn(),
}))

const baseUser: User = {
  id: 'user-1',
  nickname: 'narafu',
  status: 'ACTIVE',
  role: 'USER',
  hasTelegram: false,
  balanceCheckEnabled: true,
  notificationPrefs: {},
}

const baseAdminUser: AdminUser = { ... }

describe('useMeQuery', () => { ... })
describe('useAdminUsersQuery', () => { ... })

// 변경 후 (파일 전체)
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '../model/types'
import { useMeQuery } from './useUserQueries'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../api', () => ({
  reapply: vi.fn(),
  deleteMe: vi.fn(),
  updateNotificationChannel: vi.fn(),
  updateTelegram: vi.fn(),
  deleteTelegram: vi.fn(),
  getMeClient: vi.fn(),
  updateBalanceCheckEnabled: vi.fn(),
  updateNickname: vi.fn(),
  updateNotificationPref: vi.fn(),
}))

const baseUser: User = {
  id: 'user-1',
  nickname: 'narafu',
  status: 'ACTIVE',
  role: 'USER',
  hasTelegram: false,
  balanceCheckEnabled: true,
  notificationPrefs: {},
}

describe('useMeQuery', () => {
  it('marks initial user data stale so settings refetch immediately on mount', () => {
    useQueryMock.mockReturnValue({ data: baseUser })

    renderHook(() => useMeQuery(baseUser))

    expect(useQueryMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      queryKey: ['me'],
      initialData: baseUser,
      initialDataUpdatedAt: 0,
    }))
  })
})
```

(`vi.mock('next/navigation', ...)` 블록 전체 삭제 — `useMeQuery`는 `useRouter`를 쓰지 않는다)

- [ ] **Step 20: `entities/user/index.ts`에서 admin export 전부 삭제**

```ts
// 변경 전 (파일 전체)
export type {
  UserStatus,
  UserRole,
  NotificationChannel,
  User,
  AdminUser,
  AdminStats,
  AdminAccount,
  AdminAccountStrategy,
  AdminTrade,
  AdminStrategy,
  AdminStrategyOrder,
  AdminReorderRequest,
  AdminReorderResponse,
  AdminReorderTimingAvailability,
  AdminAuditLog,
  AdminAnomalyAccount,
  AdminAnomalies,
  AppErrorLog,
} from './model/types'
export {
  getMe,
  getMeClient,
  reapply,
  deleteMe,
  updateNotificationChannel,
  updateNotificationPref,
  updateTelegram,
  deleteTelegram,
  updateBalanceCheckEnabled,
  updateNickname,
  listAdminUsers,
  approveAdminUser,
  rejectAdminUser,
  changeAdminUserRole,
  deleteAdminUser,
  getAdminStats,
  listAdminAccounts,
  listAdminStrategies,
  listAdminStrategyOrders,
  updateAdminStrategyStatus,
  listAdminTrades,
  reorderAdminOrder,
  getReorderTimingAvailability,
  listAdminAuditLogs,
  getAdminAnomalies,
  listAdminErrorLogs,
  softDeleteAdminErrorLog,
} from './api'
export {
  useMeQuery,
  useAdminUsersQuery,
  useDeleteMeMutation,
  useUpdateNotificationChannelMutation,
  useUpdateTelegramMutation,
  useDeleteTelegramMutation,
  useUpdateNotificationPrefMutation,
  useUpdateBalanceCheckEnabledMutation,
  useUpdateNicknameMutation,
  useApproveUserMutation,
  useRejectUserMutation,
  useChangeUserRoleMutation,
  useDeleteAdminUserMutation,
} from './hooks/useUserQueries'

// 변경 후 (파일 전체)
export type {
  UserStatus,
  UserRole,
  NotificationChannel,
  User,
} from './model/types'
export {
  getMe,
  getMeClient,
  reapply,
  deleteMe,
  updateNotificationChannel,
  updateNotificationPref,
  updateTelegram,
  deleteTelegram,
  updateBalanceCheckEnabled,
  updateNickname,
} from './api'
export {
  useMeQuery,
  useDeleteMeMutation,
  useUpdateNotificationChannelMutation,
  useUpdateTelegramMutation,
  useDeleteTelegramMutation,
  useUpdateNotificationPrefMutation,
  useUpdateBalanceCheckEnabledMutation,
  useUpdateNicknameMutation,
} from './hooks/useUserQueries'
```

- [ ] **Step 21: 최종 검증**

Run: `npm run typecheck && npm run test:run`
Expected: PASS (전체 테스트 그린, 파일 수는 `entities/user/api/index.test.ts` 삭제분만큼 감소)

Run (grep으로 잔존 확인 — Task 8 Step 14와 동일한 스크립트):
```bash
ADMIN_SYMBOLS='AdminUser|AdminStats|AdminAccount|AdminTrade|AdminStrategy|AdminReorder|AdminAuditLog|AdminAnomal|AppErrorLog|listAdminUsers|approveAdminUser|rejectAdminUser|changeAdminUserRole|deleteAdminUser|getAdminStats|listAdminAccounts|listAdminStrategies|listAdminStrategyOrders|updateAdminStrategyStatus|listAdminTrades|reorderAdminOrder|getReorderTimingAvailability|listAdminAuditLogs|getAdminAnomalies|listAdminErrorLogs|softDeleteAdminErrorLog|useAdminUsersQuery|useApproveUserMutation|useRejectUserMutation|useChangeUserRoleMutation|useDeleteAdminUserMutation'
for f in $(grep -rl "@entities/user'" app widgets features entities --include='*.ts' --include='*.tsx'); do
  grep -qE "$ADMIN_SYMBOLS" "$f" && echo "확인 필요: $f"
done
```
Expected: `app/(admin)/admin/users/page.tsx`, `widgets/admin-user-list/AdminUsersTable.tsx`, `features/admin/change-role/ChangeRoleButton.tsx` 3개만 출력되면 정상 — 이 3개는 `@entities/admin`(admin 심볼)과 `@entities/user`(`getMe`/`UserStatus`/`UserRole`) import를 의도적으로 함께 쓰는 파일이다(Step 4·11·13에서 이미 분리 처리함). 이 3개 외에 다른 파일이 출력되면 실제 누락이므로 열어서 확인한다.

Run: `npm run build`
Expected: 빌드 성공, 경고는 기존과 동일

- [ ] **Step 22: 커밋**

```bash
git add widgets/admin-trade-list features/admin entities/user entities/admin
git commit -m "refactor(admin): 나머지 admin 소비 파일 entities/admin 전환 완료, entities/user에서 admin 심볼 제거"
```

---

## 최종 검증 (Task 9)

- [ ] **Step 1: 전체 회귀 확인**

Run: `npm run typecheck && npm run test:run`
Expected: typecheck 0 오류, 테스트 전체 통과

- [ ] **Step 2: 프로덕션 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 3: 수동 시나리오 확인 (가능한 경우)**

- 알림 채널을 FCM→NONE으로 전환했을 때 새 권한 팝업이 뜨지 않는지 (코드 리뷰로 확인 가능 — `getCachedToken()`은 `Notification.requestPermission()`을 호출하지 않는다)
- `/dashboard?error=token_blacklisted`로 직접 접속 시 toast가 뜨고 URL이 `/dashboard`로 정리되는지

- [ ] **Step 4: 이 계획 파일의 체크박스를 모두 갱신하고 완료 보고**
