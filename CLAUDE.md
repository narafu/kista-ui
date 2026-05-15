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
사용자 상태(`UserStatus`)에 따라 `proxy.ts`(루트)가 강제 분기:
- 비인증 → `/` | PENDING → `/pending` | REJECTED → `/rejected` | ACTIVE → `/dashboard`

`proxy.ts`: `kista-token` 쿠키 + `kista-user-status` HTTP-only 쿠키 캐싱 기반 라우팅 (Supabase 완전 제거됨).
kista-token은 httpOnly=false — proxy에서 `request.cookies.get('kista-token')`으로 직접 읽음.

### 레이아웃 그룹
- `app/(auth)/` — 비인증 전용 (`/` 로그인 페이지)
- `app/pending/`, `app/rejected/` — (main) 밖 최상위 경로 — Sidebar/Toaster 등 (main) 레이아웃 미적용
- `app/(main)/` — ACTIVE 전용, `DesktopSidebar`(lg 이상) + `MobileBottomNav`(lg 미만) 반응형

### API 계층
- API 레이어: `lib/api/{auth,accounts,trades,settings}.ts` — `apiFetch(path, options, accessToken)` 공통 래퍼 사용
- 모든 API 호출은 `lib/api/` 함수 경유 (컴포넌트 직접 fetch 금지)
- Server Component token 취득: `import { getAuthToken } from '@/lib/auth/token'` → `await getAuthToken()` (next/headers 쿠키 읽기)
- Client Component token 취득: `import { getAuthTokenClient } from '@/lib/auth/token'` → `getAuthTokenClient()` (동기, document.cookie 파싱)
- 로그아웃: `POST /api/auth/logout` Route Handler — kista-token + kista-user-status 쿠키 삭제

### 컴포넌트 폴더
- `components/common/` — 공통 UI (AccountCard, ProfitDisplay, PortfolioChart, ProfitStatsCard 등)
- `components/accounts/` — 계좌 관련 폼 (AccountEditForm)
- `components/settings/` — 설정 섹션 (TelegramSection, AccountTelegramSection)
- `components/layout/` — 레이아웃 (DesktopSidebar, MobileBottomNav)
- `components/ui/` — shadcn/ui 자동 생성 (직접 수정 금지)

### 구현 현황
- **완료**: Phase 1-4 (UI, Auth, API 연동, 통계 차트)

## 기술 스택 quirk

- **git author**: 커밋 전 `git config user.name` 확인 필수 — 올바른 값: `narafu <narafu@kakao.com>`
- **Bash 괄호 경로**: `git add app/(main)/layout.tsx` 실패 → `git add "app/(main)/layout.tsx"` (큰따옴표 필수)
- **PENDING 사용자 API 접근**: kista-api SettingsController는 UserStatus 미검증 → PENDING 상태도 JWT로 `/api/settings/telegram` 호출 가능
- **kista-api 위치**: 백엔드 소스는 `../kista-api/` (상위 workspace 내 별도 프로젝트)
- **Toaster 스코프**: `<Toaster />`는 루트 `app/layout.tsx`에 배치 — `/pending`, `/rejected` 등 (main) 밖 라우트에서 toast 사용 가능
- **shadcn v4 (@base-ui/react 기반)**: `Button`, `DialogTrigger` 등 모든 컴포넌트에 `asChild` 없음 → `cn(buttonVariants({ variant, size }))` 클래스 직접 적용
- **Next.js dynamic route**: `params`는 `Promise` → `const { id } = await params` (v15+)
- **Next.js Route Handler**: `cookies()`는 async → `const cookieStore = await cookies()` (v15+)
- **Tailwind v4**: `tailwind.config.ts` 없음 — `postcss.config.mjs` + `globals.css`로 설정
- **recharts**: SSR 미지원 → `'use client'` 필수. Tooltip `formatter`의 `value` 파라미터는 `ValueType | undefined` → `Number(value)` 사용
- **HTTP-only 쿠키 삭제**: Client JS에서 불가 → Route Handler에서 `response.cookies.set(name, '', { maxAge: 0 })` 처리
- **kista-api DTO**: `UserResponse`는 `{ id, nickname, status, hasTelegram }`, `AccountResponse`는 `{ id, nickname, accountNoMasked, strategy, strategyStatus, hasTelegram }` — `types/` 참고
- **proxy 리다이렉트 루프**: slow path(API 호출)에서 실패 시 무조건 `redirect('/')`하면 `/`에서 셀프 루프 → `ERR_TOO_MANY_REDIRECTS`. 비보호 경로(`/`, `/auth/*`)에선 실패해도 `response` 반환 필요
- **SSE 인증 패턴**: 브라우저 `EventSource`는 커스텀 헤더 미지원 → JWT 인증이 필요한 SSE는 Next.js Route Handler가 Bearer 토큰 포함 후 kista-api로 중계 (`app/api/auth/status-stream/route.ts` 참고)
- **PENDING 상태 쿠키 캐싱 금지**: `kista-user-status` 쿠키에 PENDING을 저장하면 승인 후 새로고침 시 API 미호출 → PENDING 화면 유지 버그. `status !== 'PENDING'`일 때만 쿠키 저장
- **ProfitStatsCard**: self-fetching client component — `accountId` prop만 넘기면 내부 useEffect에서 직접 API 호출 (Server Component에서 token 전달 불필요)
- **TradesTab**: `AccountDetailTabs.tsx` 내부 로컬 함수 (export 없음) — 재사용 필요 시 인라인 구현
- **API 날짜 파라미터**: `getAccountTrades`/`getAccountProfit`/`getAccountReservationOrders`/`getAccountDailyTrades` 모두 `{ from, to }` (ISO date string, 필수) — `buildDateQuery`의 `startDate`/`endDate` 키와 혼동 주의
- **승인 재요청 Route Handler**: `ReapplyButton`은 `/api/auth/reapply-done` Route Handler 경유 — `apiFetch`로 kista-api 직접 호출 금지 (인증·CORS는 Route Handler에서 처리)
- **재신청 쿨다운 localStorage 키**: pending 페이지(`ReapplyButton`) → `reapply_last_requested_at`(1시간), rejected 페이지 → `reapply_rejected_last_at`(24시간)
- **계좌번호 형식**: `74420614-01` (숫자 8자리 + `-` + 숫자 2자리) — 분할 Input UI 사용
- **UserService.reapply() 제약**: PENDING(1시간 쿨다운) / REJECTED(24시간 쿨다운) 모두 reapply 가능. 그 외 상태(ACTIVE 등) 클릭 시 400
- **Docker standalone 리다이렉트**: `request.url`/`request.nextUrl.origin` 모두 `os.hostname()`(컨테이너 ID) 기반 → 사용 금지. proxy(Edge runtime)는 `request.nextUrl.clone()` + `url.pathname = '/...'`, Route Handler(Node.js runtime)는 `request.headers.get('host')` + `request.headers.get('x-forwarded-proto')`로 origin 직접 구성
- **Docker 서버사이드 API URL**: `NEXT_PUBLIC_API_BASE_URL`은 빌드타임 인라인 → 컨테이너 내 `localhost` 불가. `docker-compose.yml`에 `API_BASE_URL=http://host.docker.internal:8080` + `extra_hosts: [host.docker.internal:host-gateway]` 설정. **모든 Route Handler**의 API URL은 반드시 `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 패턴 사용 (`NEXT_PUBLIC_*` 단독 사용 → Docker에서 ECONNREFUSED)
- **Next.js 16 proxy 파일 컨벤션**: `middleware.ts` deprecated → `proxy.ts`로 rename, export 함수명도 `middleware` → `proxy`. `config` export 및 동작은 동일. 마이그레이션: `npx @next/codemod@canary middleware-to-proxy .`
- **Next.js 16 dev 자동 수정**: 첫 `npm run dev` 실행 시 `tsconfig.json`의 `jsx`를 `"preserve"` → `"react-jsx"`로, `include`에 `.next/dev/types/**/*.ts` 자동 추가 — 의도적 변경이므로 커밋 포함
- **WSL2 CRLF 오염**: Windows에서 `npm install` 등 실행 시 일부 파일에 CRLF 유입 → `.gitattributes`에 `* text=auto eol=lf` 설정 권장
- **Supabase PKCE 오류 (`code verifier not found`)**: `kista-api/supabase/config.toml`의 `site_url`과 `additional_redirect_urls` 확인 — `site_url = "http://localhost:3000"` (IP 아닌 hostname 필수) + `/auth/callback` 경로가 `additional_redirect_urls`에 포함되어야 함. `localhost`와 `127.0.0.1`은 쿠키 도메인이 달라 code_verifier 공유 불가

## 환경변수

```
NEXT_PUBLIC_KAKAO_CLIENT_ID=    # 카카오 앱 REST API 키
NEXT_PUBLIC_API_BASE_URL=       # kista-api Render URL
```

## CORS 주의사항

- Server Component / route.ts의 fetch → Vercel 서버에서 Render 호출 → **CORS 영향 받음** (Node.js fetch가 Origin 헤더 포함 시 Spring CORS 필터 적용)
- `'use client'` 컴포넌트의 fetch → 브라우저에서 Render 호출 → **CORS 필수**
- kista-api `CORS_ALLOWED_ORIGINS` 올바른 값: `https://kista-ui.vercel.app,https://kista-ui-narafus-projects.vercel.app`
- Route Handler 403 진단: Render 앱 로그에 기록 없는 403 → CORS 필터 차단 → `CORS_ALLOWED_ORIGINS` Render 환경변수 확인
- Route Handler 디버깅: kista-api 응답 body를 `console.error`로 로깅하면 Vercel 런타임 로그에서 원인 확인 가능

## Docker

- `docker-compose.yml` 존재 — `.env` 파일의 `NEXT_PUBLIC_*` 변수를 빌드 인자로 자동 주입
- 빌드 + 실행: `docker compose up -d --build` / 중지: `docker compose down`
- 로그 확인: `docker compose logs` (컨테이너 ID hostname, ECONNREFUSED 등 디버깅)
- `NEXT_PUBLIC_*`는 빌드 타임 인라인 → `docker run -e`로 런타임 주입 불가, Dockerfile `ARG`/`ENV` 필수 (builder 스테이지에 선언)
- 로컬 Docker + 호스트 kista-api 연동: `docker-compose.yml`의 `API_BASE_URL=http://host.docker.internal:8080` + `extra_hosts: [host.docker.internal:host-gateway]`로 해결 (자세한 내용은 "Docker 서버사이드 API URL" quirk 참고)

## Git 규칙

- **git push는 사용자가 직접 실행** — Claude는 push 금지, commit까지만

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui` (`prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi`)
- GitHub 통합 자동 배포 — `.vercel/project.json` 없음, CLI redeploy 불가
- 강제 재배포: 빈 커밋 푸시 `git commit --allow-empty -m "..." && git push origin main`
- `NEXT_PUBLIC_*` 변수는 서버 코드에서도 **빌드 시 인라인** — 값이 비면 런타임 500 (카카오 로그인 불가)
- 빌드 캐시는 env var 값이 실제로 바뀌어야 무효화됨 — 값 채운 후 재배포해야 반영
- Deployment Protection: Vercel 대시보드 Settings → Deployment Protection → Disabled (현재 비활성화됨)
- `live: false` (API 응답 필드)는 Deployment Protection과 무관 — 배포 라이브 여부 표시
- Vercel CLI 링크: `vercel link --scope narafus-projects --project prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi` (`--team` 옵션 deprecated)
- 환경변수 확인: `vercel env ls production` (링크 후 사용 가능)
- 런타임 로그: Vercel MCP `get_runtime_logs(projectId, teamId)` — 빌드 로그: `get_deployment_build_logs`
- MCP 로그는 메시지 잘림 → 에러 전문은 `vercel logs --scope narafus-projects --json` 사용
- 카카오 redirect URI: 카카오 개발자 콘솔에서 `http://localhost:3000/auth/callback`(로컬)과 운영 URL 모두 등록 필요
- 카카오 OAuth 레이트 리밋 주의: 로컬과 운영이 같은 카카오 앱 공유 → 반복 테스트 시 운영 로그인 장애 유발 가능
