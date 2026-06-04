# Next.js / proxy / 쿠키 / SSE quirk

## proxy.ts (Edge middleware, Next.js 16)
- 파일명: `proxy.ts`, export: `proxy` (구 `middleware.ts`/`middleware` — `npx @next/codemod@canary middleware-to-proxy .`)
- PENDING 상태 쿠키 캐싱 금지: `status !== 'PENDING'`일 때만 `kista-user-status` 저장 (캐시 시 승인 후 PENDING 화면 유지 버그)
- 리다이렉트 origin: `request.nextUrl.clone()` + `url.pathname = '/...'` 패턴 (`request.url` 금지 — 컨테이너 hostname 반환)
- 리다이렉트 루프 방지: 비보호 경로(`/`, `/auth/*`)에서 실패해도 `response` 반환 (무조건 `redirect('/')` 금지)
- `/me` JWT 만료 시 `kista-user-status`, `kista-user-role` 강제 삭제 필수

## 쿠키
- Safari Secure 쿠키: `x-forwarded-proto === 'https'`로 결정 (`NODE_ENV` 아님)
- HTTP-only 쿠키 삭제: `response.cookies.set(name, '', { maxAge: 0 })`
- Spring Security `/error` forward → anonymous 401: `SecurityConfig`에 `.requestMatchers("/error").permitAll()` 필수

## SSE
- `EventSource`는 커스텀 헤더 미지원 → Route Handler가 Bearer 포함 후 중계
- `request.signal` 전달 필수: `fetch(url, { signal: request.signal })` (미전달 시 `UND_ERR_SOCKET`)
- `UND_ERR_BODY_TIMEOUT`: `import { Agent } from 'undici'` + `new Agent({ bodyTimeout: 0, headersTimeout: 0 })` + `// @ts-ignore dispatcher: sseAgent`

## Next.js 16 quirk
- dynamic route params: `const { id } = await params` (Promise, v15+)
- Route Handler cookies: `const cookieStore = await cookies()` (async, v15+)
- `npm run dev` 첫 실행 시 `tsconfig.json` 자동 수정 (의도적, 커밋 포함)
- `next-themes` hydration: `useState(false)` + `useEffect(() => setMounted(true), [])` → `mounted && resolvedTheme === 'dark'`

## Docker Route Handler
- API URL: `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 패턴 필수
- origin 구성: `request.headers.get('host')` + `request.headers.get('x-forwarded-proto')` (`request.url` 금지)
