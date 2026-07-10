# 전체 정리 계획 후속 작업 디자인

`docs/superpowers/plans/2026-07-09-full-project-cleanup.md`의 "열린 질문" 5건 중 사용자가 진행하기로 결정한 4건을 다룬다. 서로 독립적인 4개 하위 작업으로 구성되며, 각각 별도로 구현·검증·커밋 가능하다.

## 배경 — 사용자 결정 사항

1. 로그아웃 리다이렉트: 전부 `/dashboard`로 통일
2. FCM 토큰 해제: 기능 구현
3. `admin/logs` 위젯 분리: 진행
4. `entities/admin` 분리: 진행

(proxy.ts 캐시 쿠키 재검증 간격은 정책 결정 사항으로 이번에도 보류)

---

## 1. 로그아웃 리다이렉트 통일

### 목표

명시적 로그아웃(`LogoutButton`)과 세션 만료/토큰 무효로 인한 자동 로그아웃(`doLogout()`)이 모두 `/dashboard`로 이동하되, 자동 로그아웃의 사유는 toast로 안내한다.

### 범위

- 대상: `shared/lib/api-client/index.ts`의 `doLogout()`, `app/(main)/dashboard/page.tsx`
- 비대상: `app/auth/callback/route.ts`의 `/login?error=...` 리다이렉트 (OAuth 콜백 실패는 별개 흐름 — 로그인 자체가 안 된 상태이므로 `/login`에 남아야 함)

### 요구사항

1. `doLogout(reason?)`의 리다이렉트 대상을 `/login?error=${reason}` (또는 `/login`) → `/dashboard?error=${reason}` (또는 `/dashboard`)로 변경한다.
2. `/dashboard` 진입 시 `?error=` 쿼리가 있으면 toast로 사유를 안내하고, 표시 후 URL에서 쿼리를 제거해 새로고침 시 재표시되지 않게 한다.
3. 에러 사유 매핑은 `doLogout()`이 실제로 전달하는 값(`token_blacklisted`, 그리고 사유 없는 경우)만 다룬다 — `/login` 페이지의 `ERROR_MESSAGES`(OAuth 콜백 전용: `no_code`, `auth_failed`, `registration_failed`, `server_error`)와는 별개 매핑으로 둔다 (두 맥락이 다르므로 공유 시 오히려 혼란).

### 접근 방식

- `features/auth/logout/DashboardLogoutErrorToast.tsx` (Client Component) 신설:
  - `useSearchParams()`로 `error` 쿼리 읽기
  - 마운트 시 1회 `toast.error(message)` 표시 (`useEffect`)
  - `router.replace('/dashboard')`로 쿼리 제거
  - `useSearchParams()`는 Suspense 경계가 필요하므로 `<Suspense>`로 감싼 내부 컴포넌트 패턴 사용 (`/login` 페이지의 기존 패턴과 동일)
- `features/auth/logout/index.ts`에 export 추가
- `app/(main)/dashboard/page.tsx`에서 렌더 (Server Component이므로 import 후 JSX에 배치만 하면 됨 — 상태 없음)

### 테스트

- `features/auth/logout/DashboardLogoutErrorToast.test.tsx`: `error=token_blacklisted` 쿼리 시 올바른 메시지로 `toast.error` 호출 확인, 호출 후 `router.replace('/dashboard')` 호출 확인. `error` 쿼리 없으면 아무 것도 호출하지 않음을 확인.

---

## 2. FCM 토큰 해제 기능

### 목표

알림 채널을 FCM/ALL에서 NONE/TELEGRAM으로 바꿀 때, 서버에 등록된 FCM 토큰을 함께 해제한다.

### 범위

- 대상: `entities/fcm/api/index.ts`, `entities/fcm/hooks/useFcmToken.ts`, `entities/fcm/index.ts`, `features/settings/notification-channel/NotificationSettings.tsx`
- 비대상: `app/api/fcm/tokens/[token]/route.ts` (이미 구현돼 있음, 변경 없음)

### 요구사항

1. `entities/fcm`에 `unregisterTokenFromServer(token: string): Promise<void>`를 추가한다 (기존 DELETE 라우트 호출).
2. FCM/ALL → NONE/TELEGRAM 전환 시, 이미 취득된 토큰이 있으면 best-effort로 해제를 호출한다. 실패해도 채널 전환 자체는 막지 않는다 (알림을 못 받는 것보다 계속 받는 게 더 나쁘므로).
3. 이 과정에서 새로 알림 권한을 요청하지 않는다 — 사용자가 알림을 끄는 상황에서 브라우저 권한 팝업이 뜨는 것은 UX상 부적절하다.

### 접근 방식

- `useFcmToken`에 `getCachedToken(): string | null` 추가 — 내부 `tokenRef.current`를 그대로 반환, 부수효과 없음. 기존 `prewarm()`이 마운트 시 이미 권한이 `granted`인 경우 조용히 토큰을 채워두므로, 설정 페이지 진입 시점에 이미 채워져 있을 가능성이 높다.
- `NotificationSettings.tsx`의 `handleChannelSelect`에 분기 추가:
  ```
  const wasFcm = currentChannel === 'FCM' || currentChannel === 'ALL'
  const willBeFcm = next === 'FCM' || next === 'ALL'
  if (wasFcm && !willBeFcm) {
    const token = getCachedToken()
    await mutation.mutateAsync(next)
    if (token) unregisterTokenFromServer(token).catch(() => {})
    router.refresh()
    return
  }
  ```
  (기존 등록 분기·일반 분기는 그대로 유지)

### 테스트

- `entities/fcm/api/index.test.ts` (또는 기존 테스트 파일에 추가): `unregisterTokenFromServer`가 올바른 경로로 DELETE 호출하는지
- `NotificationSettings.test.tsx`: FCM→NONE 전환 시 `getCachedToken`이 값을 반환하면 `unregisterTokenFromServer` 호출, `null`이면 호출하지 않음을 확인. FCM→NONE 전환이 새 권한 요청(`acquireToken`/`requestFcmToken`)을 트리거하지 않음을 확인.

---

## 3. `admin/logs/page.tsx` 위젯 분리

### 목표

FSD 규칙("app은 라우팅·데이터 조합만") 위반을 해소한다 — 328줄 서버 페이지에 인라인된 프레젠테이션 서브컴포넌트 5개를 기존 컨벤션(`widgets/admin-trade-list`, `widgets/admin-user-list` 패턴)에 맞춰 위젯으로 이동한다.

### 범위

- 대상: `app/(admin)/admin/logs/page.tsx`의 `AnomaliesSection`, `ErrorLogsSection`, `AuditLogsSection`, `EmptyState`, `AccountTable` (117~328행)
- 신설: `widgets/admin-log-list/`
- 비대상: 데이터 페칭 로직(`listAdminAuditLogs` 등 호출)과 `searchParams` 파싱은 페이지에 그대로 둔다 — 이는 app 레이어의 정당한 책임이다.

### 요구사항

1. 5개 서브컴포넌트를 `widgets/admin-log-list/`로 옮기되, 페이지는 데이터를 props로 내려주는 형태를 유지한다 (컴포넌트 내부에서 API 재호출 금지).
2. `widgets/admin-log-list/index.ts`로 외부에 필요한 컴포넌트만 export한다 (`EmptyState`/`AccountTable`처럼 내부 전용은 미노출).
3. 페이지 파일은 데이터 조합 + JSX 배치만 남긴다.

### 접근 방식

- 각 서브컴포넌트를 파일명 그대로 개별 `.tsx` 파일로 분리 (`AnomaliesSection.tsx`, `ErrorLogsSection.tsx`, `AuditLogsSection.tsx`, `AccountTable.tsx`).
- 로컬 `EmptyState({ text })`는 별도 파일로 옮기지 않고 삭제한다 — `@shared/ui/EmptyState`(`message` prop, `variant='box'` 기본값)가 동일한 박스형 빈 상태를 이미 제공하므로 그걸로 대체한다(`text` prop만 `message`로 이름 변경). 패딩 값(`p-6` → `p-10`)은 육안상 허용 가능한 차이로 보고 그대로 둔다.
- 기존 `admin-trade-list`처럼 위젯 슬라이스 내부에서 서로 import하는 것은 허용(동일 슬라이스 내부이므로 cross-import 규칙에 저촉되지 않음).
- import 경로만 바뀌므로 로직 변경 없음 — 순수 이동.

### 테스트

- 기존 페이지에 스냅샷/렌더 테스트가 없다면 새로 만들지 않는다(계획 범위 밖). `npm run typecheck && npm run test:run`으로 회귀만 확인한다.

---

## 4. `entities/admin` 분리

### 목표

`entities/user`에 뒤섞여 있는 admin 전용 타입·API·훅(`AdminUser`, `AdminAccount`, `AdminTrade` 등 13개 타입 + `listAdminUsers` 등 15개 함수 + `useAdminUsersQuery` 등 6개 훅)을 `entities/admin`으로 분리한다. `entities/user`에는 일반 사용자 도메인(User, UserStatus, getMe, reapply, 알림/텔레그램 설정 등)만 남긴다.

### 범위

- 이동 대상 (entities/user → entities/admin):
  - 타입: `AdminUser`, `AdminStats`, `AdminAccount`, `AdminAccountStrategy`, `AdminTrade`, `AdminStrategy`, `AdminStrategyOrder`, `AdminReorderRequest`, `AdminReorderResponse`, `AdminReorderTimingAvailability`, `AdminAuditLog`, `AdminAnomalyAccount`, `AdminAnomalies`, `AppErrorLog`
  - API 함수: `listAdminUsers`, `approveAdminUser`, `rejectAdminUser`, `changeAdminUserRole`, `deleteAdminUser`, `getAdminStats`, `listAdminAccounts`, `listAdminStrategies`, `listAdminStrategyOrders`, `updateAdminStrategyStatus`, `listAdminTrades`, `reorderAdminOrder`, `getReorderTimingAvailability`, `listAdminAuditLogs`, `getAdminAnomalies`, `listAdminErrorLogs`, `softDeleteAdminErrorLog`
  - 훅: `useAdminUsersQuery`, `useApproveUserMutation`, `useRejectUserMutation`, `useChangeUserRoleMutation`, `useDeleteAdminUserMutation`
- 소비 파일(사전 확인 완료, import 경로만 전환): `app/(admin)/admin/{page,trades,logs,accounts,users,pending}/page.tsx`, `widgets/admin-user-list/*`, `widgets/admin-trade-list/*`(Task 3 결과물 포함), `widgets/admin-log-list/*`(Task 3 결과물), `features/admin/error-logs/*`, `features/admin/withdraw-user/*`
- 비대상: `entities/user`의 일반 사용자 exports는 그대로 유지 — 소비처(설정/재신청/텔레그램 등)는 이번 변경의 영향을 받지 않는다(사전 grep으로 확인 완료, admin 타입을 import하지 않음).

### 요구사항

1. `entities/admin/{api,model,hooks}/` 구조를 `entities/user`와 동일한 슬라이스 패턴으로 신설하고 `index.ts`를 public API로 둔다.
2. 위 목록의 타입·함수·훅을 그대로(로직 변경 없이) 이동한다.
3. `entities/user`에서 위 export들을 제거한다.
4. 모든 소비 파일의 `@entities/user` import에서 admin 관련 심볼을 `@entities/admin`으로 분리해 import한다 (같은 파일이 양쪽에서 import해야 하는 경우 두 줄로 분리).
5. `entities/admin`은 `shared/`만 import 가능 (entities 슬라이스 간 cross-import 금지 — 기존 FSD 규칙과 동일).

### 접근 방식

- 순수 이동 + import 경로 전환. API 함수 본문, 훅 로직, 타입 정의는 한 글자도 바꾸지 않는다.
- 이동 순서: 새 슬라이스 생성 → export 이전 → 소비 파일 import 전환 → `entities/user`에서 제거 (중간에 typecheck가 깨지지 않도록 파일 그룹 단위로 진행).

### 테스트

- 새 테스트 추가 없음(순수 리팩토링). `npm run typecheck && npm run test:run`으로 전체 회귀 확인 — 기존 admin 관련 테스트(`AdminTradesWorkbench.test.tsx`, `ErrorLogsSectionClient.test.tsx` 등)가 import 경로 변경 후에도 통과해야 한다.

---

## 공통 검증

각 하위 작업 완료 후 `npm run typecheck && npm run test:run`. 4개 전체 완료 후 `npm run build`로 최종 확인.
