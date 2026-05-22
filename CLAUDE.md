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
- `app/(admin)/` — ADMIN role 전용. `AdminSidebar`(lg 이상) + `AdminTopBar`(lg 미만) 반응형. proxy.ts가 비ADMIN 사용자를 `/dashboard`로 리다이렉트

### API 계층
- API 레이어: `lib/api/{auth,accounts,trades,settings}.ts` — `apiFetch(path, options, accessToken)` 공통 래퍼 사용
- 모든 API 호출은 `lib/api/` 함수 경유 (컴포넌트 직접 fetch 금지)
- Server Component token 취득: `import { getAuthToken } from '@/lib/auth/token'` → `await getAuthToken()` (next/headers 쿠키 읽기)
- **Client Component API 호출 금지 패턴**: `getAuthTokenClient()` 사용 금지 (Docker HTTP에서 쿠키 읽기 무음 실패) — 클라이언트 컴포넌트는 token 없이 lib/api 함수 호출 → Route Handler 자동 경유
- 로그아웃: `POST /api/auth/logout` Route Handler — kista-token + kista-user-status 쿠키 삭제

### 컴포넌트 폴더
- `components/common/` — 공통 UI (AccountCard, ProfitDisplay, PortfolioChart, ProfitStatsCard 등)
- `components/accounts/` — 계좌 관련 폼 (AccountEditForm, NewAccountStepper — 3-Step: API키/계좌정보/확인)
- `components/strategies/` — 전략 컴포넌트 (StrategyCard, StrategyList, StrategyForm, StrategyFormDialog)
- `components/providers/` — 컨텍스트 제공자 (MetaProvider — `useMeta()` 훅)
- `components/settings/` — 설정 섹션 (TelegramSection)
- `components/layout/` — 레이아웃 (DesktopSidebar, MobileBottomNav)
- `components/admin/` — 관리자 전용 (AdminSidebar, AdminTopBar, ApproveRejectButtons, ChangeRoleButton)
- `components/ui/` — shadcn/ui 자동 생성 (직접 수정 금지)

### 구현 현황
- **완료**: Phase 1-4 (UI, Auth, API 연동, 통계 차트) + Phase 2A-D (admin 권한/API/화면 12종, 회원탈퇴, test-connection)

## 기술 스택 quirk

- **proxy.ts admin role 가드**: `ROLE_COOKIE = 'kista-user-role'`(httpOnly 캐시) + `ADMIN_PREFIXES = ['/admin']` — 비ADMIN 사용자가 `/admin/**` 접근 시 `/dashboard`로 자동 리다이렉트. role은 `/api/auth/me` 응답의 `role` 필드에서 읽어 쿠키에 캐시. admin 화면 추가 시 별도 라우팅 설정 불필요 (catch-all)
- **인라인 style vs Tailwind 반응형 충돌**: `style={{ display: 'flex' }}`는 인라인 명시도로 `lg:hidden`/`lg:flex` 등 Tailwind 반응형 클래스를 무효화 — display 관련 속성은 반드시 className으로만 제어. 반응형 grid도 동일: `style={{ gridTemplateColumns: '...' }}`는 CSS 클래스 미디어 쿼리를 override → 인라인에서 제거하고 `globals.css`에 `@media` 규칙으로 정의. **버그 발견 시 유사 패턴 탐지**: `grep -rn "style={{ display:" app components --include="*.tsx"` 실행 후 `lg:hidden`/`lg:flex` 등 반응형 className과 함께 쓰이는 항목 확인
- **AuthLayout의 flex 자식 너비 수축**: `flex items-center justify-center` 컨테이너 내 자식 div가 인라인 배경(gradient 등)을 갖는 경우, 자식이 flex item으로 콘텐츠 너비만큼 수축 → 배경이 전체 화면을 덮지 못함. 페이지가 자체 min-height + 중앙 정렬을 갖는다면 AuthLayout은 `<>{children}</>` 프래그먼트로 둠
- **커스텀 반응형 그리드**: Tailwind에 없는 `gridTemplateColumns`(예: `1fr 1fr 1.4fr`) — `globals.css` 끝에 `.sm\:kpi-grid { display:grid; }` 형태로 추가, 인라인 `gridTemplateColumns` 제거 필수 (명시도 충돌). 기존 정의: `sm\:kpi-grid`, `sm\:portfolio-grid`, `md\:profit-grid`, `lg\:form-grid`, `lg\:settings-grid`
- **개발 서버 포트 충돌**: Docker가 포트 3000 점유 시 `npm run dev`는 3003으로 fallback — 스크린샷/curl 시 반드시 실제 포트 확인 (`cat /tmp/kista_dev.log | grep "Local:"`)
- **UI 검증 (Playwright)**: `npx playwright screenshot --browser chromium --full-page --viewport-size "1440,900" http://localhost:PORT/path /tmp/출력.png` — 첫 실행 시 `npx playwright install chromium` 필요
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
- **Account/Strategy 분리 (V35 이후)**: `Account` 타입은 `id/nickname/accountNoMasked/broker` 4개 필드만 — strategyType/strategyStatus/ticker/hasTelegram 없음. 전략은 별도 `Strategy` 타입(`types/strategy.ts`)으로 분리, 모두 `string` (union 리터럴 아님)
- **MetaProvider + useMeta()**: `(main)/layout.tsx`에서 `GET /api/meta` prefetch → `<MetaProvider meta={meta}>` 공급. Client Component에서 `useMeta()` 훅으로 `findStrategyType(code)`, `findTicker(code)`, `labelOf(category, code)` 접근. `'INFINITE'` 같은 enum 리터럴 UI 분기 금지 — `meta.strategyTypes.find(t => t.code === strategy.type)?.label` 패턴 사용
- **전략 API**: `lib/api/strategies.ts` — `listStrategies(accountId)`, `createStrategy`, `updateStrategy`, `deleteStrategy`, `pauseStrategy(strategyId)`, `resumeStrategy(strategyId)`. Route Handler: `/api/strategies/[[...path]]`. **전략 pause/resume은 strategyId 기준** (구 accountId 아님)
- **메타 API**: `lib/api/meta.ts` — `getMetaBundle()`. Route Handler: `/api/meta/[[...path]]`. `StrategyTypeMeta`에 `availableTickers`, `defaultTicker`, `defaultMultiple` 포함
- **kista-api DTO**: `UserResponse`는 `{ id, nickname, status, hasTelegram, role, telegramBotUsername }`, `AccountResponse`는 `{ id, nickname, accountNoMasked, broker }`, `StrategyResponse`는 `{ id, accountId, type, status, ticker, multiple }` — `types/` 참고
- **클로드 디자인 원본**: `/private/tmp/kista_design/design-system/project/screens.jsx` (데스크탑), `screens-mobile.jsx` (모바일) — 화면 디자인 매칭 시 직접 참조
- **mock-data.ts 동기화**: `lib/mock-data.ts`는 `Account` mock 객체를 하드코딩 — `types/account.ts`의 `Account` 인터페이스에 필수 필드 추가 시 반드시 동기화 필요 (`npm run typecheck`로 확인)
- **proxy 리다이렉트 루프**: slow path(API 호출)에서 실패 시 무조건 `redirect('/')`하면 `/`에서 셀프 루프 → `ERR_TOO_MANY_REDIRECTS`. 비보호 경로(`/`, `/auth/*`)에선 실패해도 `response` 반환 필요
- **SSE 인증 패턴**: 브라우저 `EventSource`는 커스텀 헤더 미지원 → JWT 인증이 필요한 SSE는 Next.js Route Handler가 Bearer 토큰 포함 후 kista-api로 중계 (`app/api/auth/status-stream/route.ts` 참고)
- **PENDING 상태 쿠키 캐싱 금지**: `kista-user-status` 쿠키에 PENDING을 저장하면 승인 후 새로고침 시 API 미호출 → PENDING 화면 유지 버그. `status !== 'PENDING'`일 때만 쿠키 저장
- **Safari `Secure` 쿠키 + HTTP 차단**: Chrome은 `localhost`에서 HTTP+`Secure` 쿠키 허용(예외)이지만, Safari는 HTTP 연결의 `Secure` 쿠키를 무조건 무시함 → `document.cookie`에서 읽을 수 없어 클라이언트 인증 실패. 쿠키의 `secure` 플래그는 `NODE_ENV`가 아닌 `x-forwarded-proto === 'https'`(실제 요청 프로토콜)로 결정할 것 (`app/auth/callback/route.ts` 참고)
- **로컬 Docker `NEXT_PUBLIC_API_BASE_URL`**: `.env`에서 `http://localhost:8080` 유지 필수 — Render URL로 설정하면 브라우저가 Render에 로컬 JWT 전송 → 401. Vercel 배포는 Vercel 대시보드 env var 사용하므로 `.env` 값과 무관
- **`apiFetch` baseUrl 패턴**: `client.ts`는 `API_BASE_URL ?? NEXT_PUBLIC_API_BASE_URL` 순서 — 서버사이드(Docker)는 `API_BASE_URL=http://host.docker.internal:8080` 우선, 브라우저는 `undefined ??` 폴백으로 `NEXT_PUBLIC_API_BASE_URL` 사용
- **204 반환 엔드포인트 no-token 수동 fetch**: `res.json()` 호출 금지 → `SyntaxError: Unexpected end of JSON input`. `apiFetch`는 204 자동 처리(content-length=0 감지), no-token 경로는 `if (!res.ok) throw new ApiError(...); return;` 패턴 사용 (pauseStrategy/resumeStrategy 사례)
- **쿠키 관련 수정 후 검증**: 쿠키 옵션 변경 후 재빌드만으로는 기존 세션에 미적용 — 브라우저 쿠키 직접 삭제 후 카카오 재로그인 필요. kista-api 로그에 `/api/auth/me` 호출이 없으면 브라우저에 `kista-token`이 없다는 증거
- **ProfitStatsCard**: self-fetching client component — `accountId` prop만 넘기면 내부 useEffect에서 직접 API 호출 (Server Component에서 token 전달 불필요)
- **TradesTab**: `AccountDetailTabs.tsx` 내부 로컬 함수 (export 없음) — 재사용 필요 시 인라인 구현
- **API 날짜 파라미터**: `getAccountTrades`/`getAccountProfit`/`getAccountReservationOrders`/`getAccountDailyTrades` 모두 `{ from, to }` (ISO date string, 필수) — `buildDateQuery`의 `startDate`/`endDate` 키와 혼동 주의
- **승인 재요청 Route Handler**: `ReapplyButton`은 `/api/auth/reapply-done` Route Handler 경유 — `apiFetch`로 kista-api 직접 호출 금지 (인증·CORS는 Route Handler에서 처리)
- **텔레그램 설정 Route Handler**: `updateTelegram`/`deleteTelegram`은 `/api/settings/telegram` Route Handler 경유 — `getAuthTokenClient()` 브라우저 쿠키 읽기 방식 금지 (Docker HTTP 환경에서 쿠키 읽기 실패 사례 있음)
- **lib/api 클라이언트 호출 패턴**: `listAccounts(token?)`, `createAccount(data)`, `deleteAccount(id)`, `updateAccount(id, data)`, `pauseStrategy(id)`, `getAccountMargin(id)` 등 — token 파라미터 생략 시 자동으로 Route Handler(`/api/...`) 경유. token 전달은 서버 컴포넌트 전용. 함수명 주의: `getAccounts` 아님, `listAccounts`
- **클라이언트 → kista-api 직접 호출 전면 금지**: 모든 클라이언트 API 호출은 Route Handler 경유 의무. 기존 Route Handler: `/api/auth/*`, `/api/settings/telegram`, `/api/accounts/[[...path]]`(전체 계좌 API), `/api/portfolio/[[...path]]`(포트폴리오). 진단: kista-api 로그에 요청 없음 = 브라우저에서 실패한 것
- **재신청 쿨다운 localStorage 키**: pending 페이지(`ReapplyButton`) → `reapply_last_requested_at`(1시간), rejected 페이지 → `reapply_rejected_last_at`(24시간)
- **계좌번호 형식**: `74420614-01` (숫자 8자리 + `-` + 숫자 2자리) — 분할 Input UI 사용
- **AccountRequest 필드명**: 요청 DTO는 `kisAppKey`(≠apiKey), `kisSecretKey`(≠apiSecret), `strategyType`, `ticker`, `accountNo`(8자리만), `kisAccountType`("01") — update 시 `strategyType` 변경 지원(null이면 기존값 유지), PRIVACY 전환 시 ticker 서버에서 SOXL 강제, register에만 `@NotNull @Valid` 적용
- **TradeHistory enum 실제 값**: `OrderType` = `LOC | MOC | LIMIT` (MARKET 없음), `OrderStatus` = `PLACED | FILLED | FAILED` (SUBMITTED/CANCELLED 없음) — `types/trade.ts` 참고
- **SSE 프록시 Route Handler에 `request.signal` 필수**: `upstream.body`를 `new Response()`로 바로 반환하는 SSE 프록시 라우트에서 `request.signal` 미전달 시, 클라이언트(브라우저)가 EventSource를 닫을 때 Next.js가 백엔드 스트림을 계속 파이핑하려다 `Error: failed to pipe response / UND_ERR_SOCKET: other side closed` 에러 발생. 패턴: `GET(request: NextRequest)` + `fetch(url, { ..., signal: request.signal })` (현재 적용: `app/api/trades/stream/route.ts`, `app/api/auth/status-stream/route.ts`)
- **UserService.reapply() 제약**: PENDING(1시간 쿨다운) / REJECTED(24시간 쿨다운) 모두 reapply 가능. 그 외 상태(ACTIVE 등) 클릭 시 400
- **Docker standalone 리다이렉트**: `request.url`/`request.nextUrl.origin` 모두 `os.hostname()`(컨테이너 ID) 기반 → 사용 금지. proxy(Edge runtime)는 `request.nextUrl.clone()` + `url.pathname = '/...'`, Route Handler(Node.js runtime)는 `request.headers.get('host')` + `request.headers.get('x-forwarded-proto')`로 origin 직접 구성
- **Docker 서버사이드 API URL**: `NEXT_PUBLIC_API_BASE_URL`은 빌드타임 인라인 → 컨테이너 내 `localhost` 불가. `docker-compose.yml`에 `API_BASE_URL=http://host.docker.internal:8080` + `extra_hosts: [host.docker.internal:host-gateway]` 설정. **모든 Route Handler**의 API URL은 반드시 `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 패턴 사용 (`NEXT_PUBLIC_*` 단독 사용 → Docker에서 ECONNREFUSED)
- **Next.js 16 proxy 파일 컨벤션**: `middleware.ts` deprecated → `proxy.ts`로 rename, export 함수명도 `middleware` → `proxy`. `config` export 및 동작은 동일. 마이그레이션: `npx @next/codemod@canary middleware-to-proxy .`
- **Next.js 16 dev 자동 수정**: 첫 `npm run dev` 실행 시 `tsconfig.json`의 `jsx`를 `"preserve"` → `"react-jsx"`로, `include`에 `.next/dev/types/**/*.ts` 자동 추가 — 의도적 변경이므로 커밋 포함
- **WSL2 CRLF 오염**: Windows에서 `npm install` 등 실행 시 일부 파일에 CRLF 유입 → `.gitattributes`에 `* text=auto eol=lf` 설정 권장
- **이벤트 핸들러 컴포넌트 `'use client'` 필수**: `onMouseEnter`/`onMouseLeave` 등 DOM 이벤트 핸들러를 사용하는 컴포넌트는 반드시 `'use client'` 선언 필요 — 미선언 시 Server Component에서 임포트할 때 `Error: Event handlers cannot be passed to Client Component props` 발생 (예: `AccountCard.tsx`)
- **Next.js App Router 에러 페이지**: `app/error.tsx`(런타임 에러, 전체화면) + `app/(main)/error.tsx`(사이드바 유지, 콘텐츠 영역만) 모두 `'use client'` + `{ error: Error, reset: () => void }` props 필수. `app/not-found.tsx`는 Server Component 가능. `app/global-error.tsx`는 `'use client'` + `<html><body>` 직접 포함 필수
- **`new Date()` SSR 수화 불일치**: Client Component에서 `new Date()` 직접 렌더링 시 서버/클라이언트 시간 차로 hydration warning 발생 → `useState('')` + `useEffect(() => { setState(new Date()...) }, [])` 패턴 사용
- **다크 모드 gradient 텍스트 오버라이드**: `--rose-300~700` 팔레트는 `.dark`에서 재정의 없음 → dark 배경에서 rose-700(#6E3A2A) 끝색이 묻힘. `globals.css`에 `.dark .class-name { background: gradient(lighter values); -webkit-background-clip: text; ... }` 별도 오버라이드 필요
- **로즈골드 CSS 토큰 vs Tailwind 하드코딩**: `bg-rose-50`, `text-green-600`, `text-red-500` 등 Tailwind 내장 색상은 `.dark` 미대응 → 인라인 style + CSS 토큰 사용 필수. 손익: `style={{ color: v >= 0 ? 'var(--pos)' : 'var(--neg)' }}`. 배지 active: `style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}`. BUY/SELL 배지: `<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--pos-bg)', color: 'var(--pos)' }}>매수</span>`
- **거래내역 테이블 헤더 표준**: `className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500"` — `font-medium text-muted-foreground` 아님
- **KpiCard 사용 원칙**: 포트폴리오/KPI 데이터는 shadcn Card row-list 대신 `<KpiCard label="..." value="..." />` + `grid grid-cols-2 gap-3`. `variant="accent"` 사용 시 value에 인라인 color 금지 (rose 그라디언트 대비 낮음) — 손익 표시는 `variant="default"` 사용
- **StrategyBadge 사용 필수**: `account.strategyType` 표시 시 항상 `<StrategyBadge strategy={account.strategyType} />` (인라인 span + rose 스타일 직접 작성 금지). INFINITE→인피니트, PRIVACY→프라이버시 레이블 매핑 내장
- **JSX 내 IIFE 금지**: `{(() => { const x = ...; return <div/> })()}` 패턴 사용 금지 — 계산 변수는 컴포넌트 함수 본문 상단으로 호이스팅
- **StatisticsController 응답 형식 (주의: kista-ui 타입과 불일치)**: KIS live API를 직접 호출하는 엔드포인트는 도메인 모델/전용 DTO를 그대로 반환 → kista-ui 소비 시 반드시 응답 형식을 대조하고 normalizer 또는 정확한 타입 적용 필요.
  - `GET /api/accounts/{id}/portfolio` → `PortfolioSummaryResponse { positions[{symbol,qty,avgPrice,currentPrice,evalAmountUsd,profitLossUsd,profitRate,exchangeCode}], summary{totalAssetUsd,totalEvalProfit,totalReturnRate} }`. kista-ui: `normalizePortfolio()`가 `r.positions[0]` + `r.summary.totalAssetUsd` 읽어 `PortfolioSnapshot`으로 변환 (`app/(main)/accounts/[id]/page.tsx`). BigDecimal → `toNum()` 헬퍼로 null/string 안전 변환. **통화 주의**: KIS `CTRP6504R` API에서 `positions[].evalAmountUsd`(=`frcr_evlu_amt2`)는 USD이지만, `summary.totalAssetUsd`(=`tot_asst_amt`)와 `summary.totalEvalProfit`(=`tot_evlu_pfls_amt`)는 **원화(KRW)** — 필드명에 Usd가 붙어있어도 KRW임. 대시보드에서 ₩ 표시 필요, 두 통화를 혼합 계산(KRW - USD) 금지.
  - `GET /api/accounts/{id}/trades` → `Execution[] { tradeDate,symbol,direction,qty,price,amountUsd,kisOrderId }`. kista-ui: `types/trade.ts`의 `Execution` 타입 사용 (`TradeHistory` 아님 — `id`/`strategy`/`orderType`/`status`/`createdAt` 필드 없음). `AccountDetailTabs` key는 `${kisOrderId}-${tradeDate}-${symbol}` 합성키, 날짜는 `tradeDate`.
  - `GET /api/accounts/{id}/profit` → `PeriodProfitResult { totalRealizedProfit, totalReturnRate }`. kista-ui `ProfitSummary` 타입의 `accountId`/`startDate`/`endDate`/`dailyProfits` 필드는 서버가 보내지 않음 — `ProfitStatsCard`가 `?? 0`로 가드 중.
  - 신규 KIS live 엔드포인트 추가 시 kista-api DTO ↔ kista-ui 타입 필드명 반드시 대조 (drift 발생 시 `undefined.toFixed()` 패턴으로 500 에러 유발)
- **ProfitDisplay currency prop**: `currency='USD'`(기본) 또는 `currency='KRW'` — KRW 시 `₩` 기호 + 소수점 없는 한국식 포맷, USD 시 `$` + 소수점 2자리. KIS portfolio summary 값(totalEvalProfit 등)은 KRW이므로 반드시 `currency="KRW"` 전달.
- **Server Component + 인터랙션 패턴**: 데이터 fetching Server Component에 버튼/다이얼로그 추가 시 → `*Button.tsx`/`*Trigger.tsx` 별도 Client Component(`'use client'` + `useState`)로 분리 후 Server Component에서 import (예: `AccountEditDeleteButton.tsx`). 페이지 전체 `'use client'` 전환 금지
- **Server Component 데이터 갱신 패턴**: Client Component에서 API 호출(PUT/POST/DELETE) 성공 후 부모 Server Component의 데이터를 최신화하려면 `router.refresh()` (`next/navigation`) 호출 — useState로 로컬 상태만 업데이트하면 서버에서 계산된 값(예: telegramBotUsername)이 반영 안 됨

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
