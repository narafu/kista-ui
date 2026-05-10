# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS** 프론트엔드.
상세 개발 규칙은 `shrimp-rules.md` 참고.

## 주요 명령어

```bash
npm run dev        # 개발 서버 (Turbopack)
npm run build      # 프로덕션 빌드 (Turbopack)
npm run typecheck  # TypeScript 타입 검사 (tsc --noEmit)
npm run lint       # ESLint

# shadcn 컴포넌트 추가
npx shadcn@latest add <component> --yes --defaults
```

## 아키텍처

### 인증 상태 라우팅
사용자 상태(`UserStatus`)에 따라 `middleware.ts`(루트)가 강제 분기:
- 비인증 → `/` | PENDING → `/pending` | REJECTED → `/rejected` | ACTIVE → `/dashboard`

`middleware.ts`: Supabase SSR 세션 + `kista-user-status` HTTP-only 쿠키(7일) 캐싱 기반 라우팅.
미들웨어에서는 `lib/supabase/server.ts` 불가(next/headers 사용 불가) — `@supabase/ssr` createServerClient를 `request.cookies`/`response.cookies`로 직접 구성.

### 레이아웃 그룹
- `app/(auth)/` — 비인증 전용 (`/` 로그인 페이지)
- `app/pending/`, `app/rejected/` — (main) 밖 최상위 경로 — Sidebar/Toaster 등 (main) 레이아웃 미적용
- `app/(main)/` — ACTIVE 전용, `DesktopSidebar`(lg 이상) + `MobileBottomNav`(lg 미만) 반응형

### API 계층
- API 레이어: `lib/api/{auth,accounts,trades,settings}.ts` — `apiFetch(path, options, accessToken)` 공통 래퍼 사용
- 모든 API 호출은 `lib/api/` 함수 경유 (컴포넌트 직접 fetch 금지)
- Supabase 클라이언트: 브라우저 컴포넌트 → `lib/supabase/client.ts`, 서버/미들웨어 → `lib/supabase/server.ts`
- Server Component token 취득: `(await createClient()).auth.getSession()` → `session?.access_token`
- Client Component token 취득: `createClient().auth.getSession()` (lib/supabase/client.ts)

### 컴포넌트 폴더
- `components/common/` — 공통 UI (AccountCard, ProfitDisplay, PortfolioChart, ProfitStatsCard 등)
- `components/accounts/` — 계좌 관련 폼 (AccountEditForm)
- `components/settings/` — 설정 섹션 (TelegramSection, AccountTelegramSection)
- `components/layout/` — 레이아웃 (DesktopSidebar, MobileBottomNav)
- `components/ui/` — shadcn/ui 자동 생성 (직접 수정 금지)

### 구현 현황
- **완료**: Phase 1-4 (UI, Auth, API 연동, 통계 차트)

## 기술 스택 quirk

- **Bash 괄호 경로**: `git add app/(main)/layout.tsx` 실패 → `git add "app/(main)/layout.tsx"` (큰따옴표 필수)
- **PENDING 사용자 API 접근**: kista-api SettingsController는 UserStatus 미검증 → PENDING 상태도 JWT로 `/api/settings/telegram` 호출 가능
- **kista-api 위치**: 백엔드 소스는 `../kista-api/` (상위 workspace 내 별도 프로젝트)
- **Toaster 스코프**: `<Toaster />`는 루트 `app/layout.tsx`에 배치 — `/pending`, `/rejected` 등 (main) 밖 라우트에서 toast 사용 가능
- **shadcn v4 (@base-ui/react 기반)**: `Button`, `DialogTrigger` 등 모든 컴포넌트에 `asChild` 없음 → `cn(buttonVariants({ variant, size }))` 클래스 직접 적용
- **Next.js 15 dynamic route**: `params`는 `Promise` → `const { id } = await params`
- **Next.js 15 Route Handler**: `cookies()`는 async → `const cookieStore = await cookies()`
- **Tailwind v4**: `tailwind.config.ts` 없음 — `postcss.config.mjs` + `globals.css`로 설정
- **recharts**: SSR 미지원 → `'use client'` 필수. Tooltip `formatter`의 `value` 파라미터는 `ValueType | undefined` → `Number(value)` 사용
- **HTTP-only 쿠키 삭제**: Client JS에서 불가 → Route Handler에서 `response.cookies.set(name, '', { maxAge: 0 })` 처리
- **kista-api DTO**: `UserResponse`는 `{ id, nickname, status, hasTelegram }`, `AccountResponse`는 `{ id, nickname, accountNoMasked, strategy, strategyStatus, hasTelegram }` — `types/` 참고
- **middleware 리다이렉트 루프**: slow path(API 호출)에서 실패 시 무조건 `redirect('/')`하면 `/`에서 셀프 루프 → `ERR_TOO_MANY_REDIRECTS`. 비보호 경로(`/`, `/auth/*`)에선 실패해도 `response` 반환 필요
- **SSE 인증 패턴**: 브라우저 `EventSource`는 커스텀 헤더 미지원 → JWT 인증이 필요한 SSE는 Next.js Route Handler가 Bearer 토큰 포함 후 kista-api로 중계 (`app/api/auth/status-stream/route.ts` 참고)
- **PENDING 상태 쿠키 캐싱 금지**: `kista-user-status` 쿠키에 PENDING을 저장하면 승인 후 새로고침 시 API 미호출 → PENDING 화면 유지 버그. `status !== 'PENDING'`일 때만 쿠키 저장

## 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
NEXT_PUBLIC_API_BASE_URL=       # kista-api Render URL
```

## CORS 주의사항

- Server Component / route.ts의 fetch → Vercel 서버에서 Render 호출 → CORS 무관 (정상 동작)
- `'use client'` 컴포넌트의 fetch → 브라우저에서 Render 호출 → **CORS 필수**
- kista-api에 `CORS_ALLOWED_ORIGINS=https://kista-ui.vercel.app` 환경변수 설정 확인

## Git 규칙

- **git push는 사용자가 직접 실행** — Claude는 push 금지, commit까지만

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui` (`prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi`)
- GitHub 통합 자동 배포 — `.vercel/project.json` 없음, CLI redeploy 불가
- 강제 재배포: 빈 커밋 푸시 `git commit --allow-empty -m "..." && git push origin main`
- `NEXT_PUBLIC_*` 변수는 서버 코드에서도 **빌드 시 인라인** — 값이 비면 런타임 500 (Supabase "URL required")
- 빌드 캐시는 env var 값이 실제로 바뀌어야 무효화됨 — 값 채운 후 재배포해야 반영
- Deployment Protection: Vercel 대시보드 Settings → Deployment Protection → Disabled (현재 비활성화됨)
- `live: false` (API 응답 필드)는 Deployment Protection과 무관 — 배포 라이브 여부 표시
- Vercel CLI 링크: `vercel link --scope narafus-projects --project prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi` (`--team` 옵션 deprecated)
- 환경변수 확인: `vercel env ls production` (링크 후 사용 가능)
- 런타임 로그: Vercel MCP `get_runtime_logs(projectId, teamId)` — 빌드 로그: `get_deployment_build_logs`
- MCP 로그는 메시지 잘림 → 에러 전문은 `vercel logs --scope narafus-projects --json` 사용
- 카카오 OAuth 레이트 리밋 주의: 로컬(`localhost:3000`)과 운영이 같은 Supabase/카카오 앱 공유 → 로컬 반복 테스트 시 운영 로그인 장애 유발 가능 (`oauth2: token request rate limit exceeded`)
