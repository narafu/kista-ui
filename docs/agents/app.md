# app/ — Next.js · proxy · 쿠키 · SSE · PWA

UI 캐시 소유권, hydration, mutation 동기화, `router.refresh()` 예외는 `docs/agents/cache-policy.md`를 SSOT로 따른다.

## proxy.ts (Edge runtime)

- **admin role 가드**: `ROLE_COOKIE='kista-user-role'` + `ADMIN_PREFIXES=['/admin']` — 비ADMIN → `/dashboard`. role은 `/api/auth/me` 응답에서 캐시. admin 화면 추가 시 별도 설정 불필요
- **캐시 취약점**: `kista-user-status`/`kista-user-role` 캐시 쿠키가 살아있으면 JWT 만료에도 통과. maxAge 3600초 — 초과 시 `/me` 재호출로 재검증
- **리다이렉트 루프**: slow path 실패 시 무조건 `redirect('/')`하면 셀프 루프 → `ERR_TOO_MANY_REDIRECTS`. 비보호 경로(`/`, `/auth/*`)에선 실패해도 `response` 반환 필요
- **/me 실패 처리**: JWT 만료/무효 → `STATUS_COOKIE`, `ROLE_COOKIE` 강제 삭제 필수. 미삭제 시 캐시 히트로 재호출 안됨
- **PENDING 쿠키 캐싱 금지**: `kista-user-status`에 PENDING 저장 시 승인 후에도 PENDING 화면 유지 버그. `status !== 'PENDING'`일 때만 저장
- **리다이렉트 origin 구성**: `request.url`/`request.nextUrl.origin` 사용 금지 (컨테이너 hostname 반환). `request.nextUrl.clone()` + `url.pathname = '/...'` 패턴 사용
- **Next.js 16 파일 컨벤션**: `middleware.ts` → `proxy.ts`, export `middleware` → `proxy`. 마이그레이션: `npx @next/codemod@canary middleware-to-proxy .`

## 쿠키

- **카카오 `redirect_uri`는 kista-ui 자신의 현재 도메인에서 동적 생성**(`app/(auth)/login/page.tsx`: `${window.location.origin}/auth/callback`) — 카카오 개발자 콘솔에 등록되는 값은 kista-api 도메인이 아니라 **kista-ui 도메인**이다. 따라서 kista-api 백엔드 도메인이 바뀌어도 카카오 콘솔 설정은 무관하고, **kista-ui 자신의 배포 도메인이 바뀔 때만** 카카오 콘솔 redirect URI를 갱신하면 된다
- **ResponseCookies.set() + raw headers.append() 혼용 금지**: `response.cookies.set()`은 호출할 때마다 set-cookie 헤더 전체를 재직렬화하면서 이전에 `response.headers.append('Set-Cookie', ...)` 한 값을 덮어쓴다. kista-api RT 쿠키처럼 raw relay가 필요하면 `cookies.set()` 호출을 모두 끝낸 후 마지막에 `headers.append()` 해야 생존한다 (`app/auth/callback/route.ts` 참고)
- **Safari `Secure` 쿠키 + HTTP 차단**: Safari는 HTTP 연결의 `Secure` 쿠키 무시. `secure` 플래그는 `NODE_ENV`가 아닌 `x-forwarded-proto === 'https'`로 결정 (`app/auth/callback/route.ts` 참고)
- **HTTP-only 쿠키 삭제**: Client JS 불가 → Route Handler에서 `response.cookies.set(name, '', { maxAge: 0 })`
- **쿠키 수정 후 검증**: 재빌드만으로 기존 세션 미적용 — 브라우저 쿠키 삭제 후 카카오 재로그인. kista-api 로그에 `/api/auth/me` 없으면 `kista-token` 없다는 증거
- **kista-api JWT 없는 요청 → 401**: `JwtAuthFilter`는 헤더 없으면 조용히 통과 → Spring Security 401. 로그에 WARN 없는 401 = 헤더 자체가 없는 것
- **Spring Security `/error` forward**: 예외 발생 → `/error` forward → anonymous 401. `SecurityConfig`에 `.requestMatchers("/error").permitAll()` 필수. 미설정 시 500이 401로 둔갑 → clientFetch 자동 로그아웃 유발
- **KIS API 토큰 1분 제한 (EGW00133)**: 연결 테스트 직후 `kisTokenPort.testToken()` 재호출 → 403 → `/error` → 401. 계좌 등록/수정 시 UI가 이미 검증한 키를 서버에서 재검증 금지

## Route Handler

- **Docker standalone**: Route Handler(Node.js runtime)에서 origin → `request.headers.get('host')` + `request.headers.get('x-forwarded-proto')` 직접 구성. `request.url` 사용 금지
- **API URL**: 모든 Route Handler·서버 fetch는 `getApiBaseUrl()`(`@shared/lib/env`) 사용 — `API_BASE_URL` 우선, 없으면 `NEXT_PUBLIC_API_BASE_URL` 폴백, 둘 다 없으면 throw. 실패 허용 경로(예: `proxy.ts` 토큰 갱신)는 `getApiBaseUrlOrNull()`. `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 패턴을 직접 쓰지 말 것 (SSOT). 근거: `NEXT_PUBLIC_*` 단독 → Docker에서 ECONNREFUSED
- **프록시 라우트 인증 게이트**: `createProxyRoute`(`@shared/lib/proxy/createProxyRoute`)의 `requireAuth` 옵션은 **기본값 `true`**(토큰 없으면 kista-api 호출 전에 401) — 실제로 공개(비인증) 엔드포인트를 프록시하려면 반드시 `requireAuth: false`를 명시해야 한다. 현재 `requireAuth: false`로 선언된 라우트: `app/api/client-errors`, `app/api/runtime-config`, `app/api/market/[[...path]]`. 신규 프록시 라우트 추가 시 kista-api 쪽 엔드포인트가 공개인지 반드시 확인하고 이 플래그를 맞출 것 — 안 맞추면 공개 엔드포인트인데도 401이 나거나, 반대로 인증 필요한 엔드포인트를 실수로 열어둘 위험이 있다
- **SSE 인증**: 브라우저 `EventSource`는 커스텀 헤더 미지원 → Route Handler가 Bearer 토큰 포함 후 kista-api로 중계 (`app/api/auth/status-stream/route.ts` 참고)
- **SSE 인증 실패 → 401 응답 금지**: `EventSource`는 4xx를 `onerror`로만 받아 상태 코드를 알 수 없음 → 클라이언트가 무한 재연결 루프에 빠짐. 토큰 없을 때 200 SSE 스트림으로 `event: auth-error` 보내고 클라이언트가 이를 받아 재연결 중단 (`app/api/trades/stream/route.ts` 참고)
- **SSE `request.signal` 필수**: 미전달 시 클라이언트가 EventSource 닫아도 스트림 파이핑 계속 → `UND_ERR_SOCKET` 에러. `GET(request: NextRequest)` + `fetch(url, { signal: request.signal })`
- **SSE `UND_ERR_BODY_TIMEOUT`**: undici 기본 timeout(300s)으로 5분마다 500. `import { Agent } from 'undici'` + `new Agent({ bodyTimeout: 0, headersTimeout: 0 })` + fetch에 `// @ts-ignore` + `dispatcher: sseAgent`. `undici`는 별도 설치 필요

## Next.js quirk

- **dynamic route params**: `Promise` → `const { id } = await params` (v15+)
- **Route Handler cookies()**: async → `const cookieStore = await cookies()` (v15+)
- **Next.js 16 dev 자동 수정**: 첫 `npm run dev` 시 `tsconfig.json`의 `jsx` → `"react-jsx"`, `include`에 `.next/dev/types/**/*.ts` 자동 추가 — 의도적 변경, 커밋 포함
- **에러 페이지**: `app/error.tsx`(전체화면) + `app/(main)/error.tsx`(사이드바 유지) 모두 `'use client'` + `{ error, reset }` props. `app/global-error.tsx`는 `<html><body>` 직접 포함
- **`new Date()` hydration 불일치**: `useState('')` + `useEffect(() => { setState(new Date()...) }, [])` 패턴
- **next-themes hydration**: `useTheme()`의 `resolvedTheme`은 SSR에서 `undefined`. `const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])` → `mounted && resolvedTheme === 'dark'`
- **Next.js Image + Tailwind preflight**: `img { height: auto }` preflight + 비정사각형 이미지를 정사각형으로 지정 시 경고. 해결: `<Image>` 컴포넌트 `style` prop에 `height: N, width: N` 직접 명시
- **`loading.tsx`**: `app/(main)/dashboard|accounts|strategies|settings/loading.tsx` — `animate-pulse` + 실제 레이아웃을 모방한 skeleton
- **인증 레이아웃의 동적 렌더링 명시 필요**: `(main)/layout.tsx`는 proxy가 `/me` 응답으로 캐싱한 `ROLE_COOKIE`를 직접 읽어 `getMe()` SSR 왕복을 건너뛴다(쿠키 없을 때만 폴백 호출). 이처럼 레이아웃에서 `cookies()`/`getAuthToken()` 등 동적 API 호출을 모두 제거하면 Next.js가 정적 프리렌더 대상으로 오인해 빌드 타임에 인증 없는 fetch가 실행되며 빌드가 깨질 수 있다(`(admin)/layout.tsx` 회귀 사례) — 사용자별 인증 콘텐츠를 다루는 레이아웃은 `export const dynamic = 'force-dynamic'`을 명시한다
- **인터셉팅 라우트 모달**: `app/(main)/@modal`(parallel route) + `default.tsx`(`null` 반환)로 `(main)/layout.tsx`가 `modal` prop을 받아 렌더링한다. `(.)accounts/[id]/strategies/new`처럼 `@modal` 기준 상대 경로로 실제 라우트를 인터셉트 — 앱 내부 클라이언트 네비게이션(Link/router.push)에서만 가로채지고, 새로고침·직접 진입은 일반 `page.tsx`가 렌더링된다. `shared/ui/RouteModal.tsx`가 PC(`sm:`)는 배경 위 모달, 모바일은 일반 페이지와 동일한 전체화면으로 반응형 렌더링하며 모바일 스크롤 컨테이너에는 `touch-pan-y`를 유지한다. 닫기(X·배경 클릭)는 `router.back()`을 쓴다 — 일반 `page.tsx`와 인터셉트된 `@modal` 버전 양쪽에 동일 콘텐츠를 유지해야 하므로 폼 컴포넌트에 `dismiss`류 prop으로 종료 방식(`push`/`back`)을 분기한다. `strategy/create-strategy` 참고

## 캐싱 (Server Component)

- **가변 인증 데이터**: `accounts`·`strategies`·`me`는 Next.js persistent cache를 사용하지 않는다. 요청별 `createQueryClient()` + `prefetchQuery()` + `<HydrationBoundary>`로 넘기고 Client Content가 목록/빈 상태를 결정한다
- **서버용 query options**: Server Component가 호출하는 factory는 `'use client'` hook 파일이 아니라 `entities/*/model/queryOptions.ts`에 둔다
- **Next.js persistent cache**: 현재는 비인증 public meta fallback에만 1시간 TTL을 적용한다. market holidays의 visible state는 React Query 소유이며 persistent cache directive가 없다. 세부 기준과 `router.refresh()` 예외는 `docs/agents/cache-policy.md` 참고

## Toaster · UI 전역

- **Toaster 스코프**: `<Toaster richColors position="top-right" />`는 루트 `app/layout.tsx`에 단 하나만 — 하위 레이아웃에 추가 금지. 중복 시 `toast()` 호출 하나에 두 개 동시 표시

## PWA · FCM

- **iOS 푸시 알림**: iOS는 WebKit → `PushManager` 미지원. iOS 16.4+ Safari + 홈화면 추가 PWA만 가능. `'PushManager' in window` 사전 체크 필수
- **PWA 구성**: `app/manifest.ts` + `app/layout.tsx` metadata에 `manifest`/`icons.apple`/`appleWebApp`. 아이콘: `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- **`firebase-messaging-sw.js` git 추적 필수**: git에 없으면 Vercel 배포 후 404 → FCM 토큰 발급 불가. 로컬 크롬 캐시로 눈에 안 띔
- **FCM 마운트**: `widgets/layout/FcmBridge.tsx`(Client Component)가 `useMeQuery()`로 `notificationChannel`을 소비해 `entities/fcm/providers/FcmAutoRegister.tsx`/`FcmForegroundListener.tsx`를 렌더링하고, `(main)/layout.tsx`가 `FcmBridge`를 마운트한다. FCM/ALL + 권한 granted 기기에서 `getToken()` 자동 등록(멱등), FCM/ALL이면 `onMessage()` 구독 후 granted 시 서비스 워커 `showNotification()`으로 표시
- **PENDING 사용자 API 접근**: kista-api SettingsController는 UserStatus 미검증 → PENDING 상태도 `/api/settings/telegram` 호출 가능
