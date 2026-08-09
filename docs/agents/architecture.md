## 인증 상태 라우팅

`proxy.ts`가 토큰이 있는(인증된) 사용자의 `UserStatus`에 따라 강제 분기한다.

- `PENDING`: `/pending`
- `REJECTED`: `/rejected`
- `ACTIVE`: `/`·`/login`·`/pending`·`/rejected` 방문 시 `/dashboard`로

`PROTECTED_PREFIXES`(`/accounts`·`/strategies`·`/stats`·`/settings`·`/benchmark`·`/assets`)는 비인증 시 `/login`으로 강제 리다이렉트한다. `/dashboard`는 이 목록에 없다 — 비회원도 접근 가능한 비보호 경로다. `/`는 `app/(auth)/page.tsx`가 인증 여부와 무관하게 항상 `/dashboard`로 리다이렉트한다.

## 레이아웃 그룹

- `app/(auth)/`: 비인증 전용
- `app/pending/`, `app/rejected/`: `(main)` 밖, Sidebar 미적용
- `app/(main)/`: `DesktopSidebar` + `MobileBottomNav`. `/dashboard`만 비회원도 접근 가능(비보호 경로) — 그 외 경로는 ACTIVE 전용. 비회원 접근을 다루는 Client Component는 서버에서 계산한 `isAuthenticated` prop을 받아 계좌 등 인증 전용 쿼리를 `enabled: isAuthenticated`로 게이팅한다(`widgets/dashboard/DashboardContent`, `widgets/market-holiday-calendar/WeeklyMarketCalendar` 참고 — 게이팅 없이 게스트가 401을 맞으면 `clientFetch`의 전역 401 처리가 로그아웃 후 리로드를 반복하는 루프에 빠진다)
- `app/(admin)/`: ADMIN role 전용

## FSD 계층 구조

```text
app/           -> Next.js 라우팅만 (Server Component 데이터 프리페치/하이드레이션 + 레이아웃)
widgets/       -> 페이지 합성 단위
features/      -> 사용자 시나리오
entities/      -> 도메인 모델 + API 함수 + React Query 훅
shared/        -> 도메인 무관 공용
```

의존성은 `app -> widgets -> features -> entities -> shared` 단방향이다. 동일 계층 cross-import는 금지한다.

## tsconfig 경로 alias

```text
@app/*         -> ./app/*
@widgets/*     -> ./widgets/*
@features/*    -> ./features/*
@entities/*    -> ./entities/*
@shared/*      -> ./shared/*
@/lib/*        -> ./lib/*        # shadcn ui 호환용
@/components/* -> ./components/* # shadcn ui 호환용
```

새 코드는 FSD alias를 우선 사용한다. `@/lib/*`, `@/components/*`는 shadcn 자동생성 파일 호환용으로만 유지한다.

## API 계층

- `shared/lib/api-client/`: `apiFetch` (Server Component 전용, token 필요) / `clientFetch` (Client Component, Route Handler 경유) / `ApiError`
- `entities/{domain}/api/`: 도메인별 API 함수
- **Server Component**: `getAuthToken()` → token 취득 후 `apiFetch` 호출
- **Server Component → Client Component 캐시 이관**: 목록성 서버 상태는 `createQueryClient()` + `prefetchQuery()` + `<HydrationBoundary>`로 주입하고, 이후 빈 상태/목록 전환은 Client Component가 React Query 캐시를 SSOT로 소비한다
- **Client Component**: token 없이 `entities/{domain}/api` 함수 → Route Handler 자동 경유
- **Client Component에서 직접 kista-api 호출 전면 금지** (CORS + 쿠키 문제)

레이어별 세부 quirk는 각 FSD 디렉토리의 `CLAUDE.md` 참고 (CLAUDE.md 진입점에 목록).
