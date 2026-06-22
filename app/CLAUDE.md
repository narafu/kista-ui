# app/ — Next.js · proxy · 쿠키 · SSE · PWA

## proxy.ts (Edge runtime)

- **admin role 가드**: `ROLE_COOKIE='kista-user-role'` + `ADMIN_PREFIXES=['/admin']` — 비ADMIN → `/dashboard`. role은 `/api/auth/me` 응답에서 캐시. admin 화면 추가 시 별도 설정 불필요
- **캐시 취약점**: `kista-user-status`/`kista-user-role` 캐시 쿠키가 살아있으면 JWT 만료에도 통과. maxAge 3600초 — 초과 시 `/me` 재호출로 재검증
- **리다이렉트 루프**: slow path 실패 시 무조건 `redirect('/')`하면 셀프 루프 → `ERR_TOO_MANY_REDIRECTS`. 비보호 경로(`/`, `/auth/*`)에선 실패해도 `response` 반환 필요
- **/me 실패 처리**: JWT 만료/무효 → `STATUS_COOKIE`, `ROLE_COOKIE` 강제 삭제 필수. 미삭제 시 캐시 히트로 재호출 안됨
- **PENDING 쿠키 캐싱 금지**: `kista-user-status`에 PENDING 저장 시 승인 후에도 PENDING 화면 유지 버그. `status !== 'PENDING'`일 때만 저장
- **리다이렉트 origin 구성**: `request.url`/`request.nextUrl.origin` 사용 금지 (컨테이너 hostname 반환). `request.nextUrl.clone()` + `url.pathname = '/...'` 패턴 사용
- **Next.js 16 파일 컨벤션**: `middleware.ts` → `proxy.ts`, export `middleware` → `proxy`. 마이그레이션: `npx @next/codemod@canary middleware-to-proxy .`

## 쿠키

- **ResponseCookies.set() + raw headers.append() 혼용 금지**: `response.cookies.set()`은 호출할 때마다 set-cookie 헤더 전체를 재직렬화하면서 이전에 `response.headers.append('Set-Cookie', ...)` 한 값을 덮어쓴다. kista-api RT 쿠키처럼 raw relay가 필요하면 `cookies.set()` 호출을 모두 끝낸 후 마지막에 `headers.append()` 해야 생존한다 (`app/auth/callback/route.ts` 참고)
- **Safari `Secure` 쿠키 + HTTP 차단**: Safari는 HTTP 연결의 `Secure` 쿠키 무시. `secure` 플래그는 `NODE_ENV`가 아닌 `x-forwarded-proto === 'https'`로 결정 (`app/auth/callback/route.ts` 참고)
- **HTTP-only 쿠키 삭제**: Client JS 불가 → Route Handler에서 `response.cookies.set(name, '', { maxAge: 0 })`
- **쿠키 수정 후 검증**: 재빌드만으로 기존 세션 미적용 — 브라우저 쿠키 삭제 후 카카오 재로그인. kista-api 로그에 `/api/auth/me` 없으면 `kista-token` 없다는 증거
- **kista-api JWT 없는 요청 → 401**: `JwtAuthFilter`는 헤더 없으면 조용히 통과 → Spring Security 401. 로그에 WARN 없는 401 = 헤더 자체가 없는 것
- **Spring Security `/error` forward**: 예외 발생 → `/error` forward → anonymous 401. `SecurityConfig`에 `.requestMatchers("/error").permitAll()` 필수. 미설정 시 500이 401로 둔갑 → clientFetch 자동 로그아웃 유발
- **KIS API 토큰 1분 제한 (EGW00133)**: 연결 테스트 직후 `kisTokenPort.testToken()` 재호출 → 403 → `/error` → 401. 계좌 등록/수정 시 UI가 이미 검증한 키를 서버에서 재검증 금지

## Route Handler

- **Docker standalone**: Route Handler(Node.js runtime)에서 origin → `request.headers.get('host')` + `request.headers.get('x-forwarded-proto')` 직접 구성. `request.url` 사용 금지
- **API URL**: 모든 Route Handler에서 `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 패턴 필수 (`NEXT_PUBLIC_*` 단독 → Docker에서 ECONNREFUSED)
- **SSE 인증**: 브라우저 `EventSource`는 커스텀 헤더 미지원 → Route Handler가 Bearer 토큰 포함 후 kista-api로 중계 (`app/api/auth/status-stream/route.ts` 참고)
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
- **`loading.tsx`**: `app/(main)/dashboard|accounts|statistics|settings/loading.tsx` — `animate-pulse` + 실제 레이아웃을 모방한 skeleton

## 캐싱 (Server Component)

- **`unstable_cache` + `revalidateTag`**: `shared/lib/cache/`. 5분 TTL. 대상: listAccounts·listStrategies·getMe. 제외: KIS 실시간(portfolio·trades). 에러 핸들링·`revalidateTag` 사용법은 `shared/CLAUDE.md` 참고

## Toaster · UI 전역

- **Toaster 스코프**: `<Toaster richColors position="top-right" />`는 루트 `app/layout.tsx`에 단 하나만 — 하위 레이아웃에 추가 금지. 중복 시 `toast()` 호출 하나에 두 개 동시 표시

## PWA · FCM

- **iOS 푸시 알림**: iOS는 WebKit → `PushManager` 미지원. iOS 16.4+ Safari + 홈화면 추가 PWA만 가능. `'PushManager' in window` 사전 체크 필수
- **PWA 구성**: `app/manifest.ts` + `app/layout.tsx` metadata에 `manifest`/`icons.apple`/`appleWebApp`. 아이콘: `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- **`firebase-messaging-sw.js` git 추적 필수**: git에 없으면 Vercel 배포 후 404 → FCM 토큰 발급 불가. 로컬 크롬 캐시로 눈에 안 띔
- **FCM 자동 토큰 등록**: `entities/fcm/providers/FcmAutoRegister.tsx` — `(main)/layout.tsx`에 마운트. 알림 채널이 FCM/ALL + 권한 granted인 기기에서 자동 등록. `getToken()` 멱등
- **PENDING 사용자 API 접근**: kista-api SettingsController는 UserStatus 미검증 → PENDING 상태도 `/api/settings/telegram` 호출 가능
