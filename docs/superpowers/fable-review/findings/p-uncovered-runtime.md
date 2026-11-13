# P. 지침서 01~09 미덮임 영역 — 런타임 측정

측정 기준: `git ls-files` (2026-11-13, HEAD 1487ea9f 시점 워킹트리). `shared/lib/api-types.ts`(생성 파일)와 `package-lock.json`·바이너리·`openapi.json` 제외. 줄 수는 `wc -l`. "테스트"는 `*.test.*`·`e2e/`·`tests/`·`testing/`.
판단은 쓰지 않는다. 숫자와 file:line만.

## 1. 지형표

범례: 번호=덮는 지침서(01 타입 02 데이터층 03 계층 04 폼 05 책임분담 06 UX프리미티브 07 테스트 08 문서 09 불필요파일·배포). **미덮임**=어느 지침서도 구조를 다루지 않음. 차트·스타일·scripts·e2e·빌드 설정은 다른 담당(깊이 측정 안 함).

| 경로 | 파일 | 줄(비테스트) | 테스트 파일/줄 | 덮는 지침서 / 비고 |
|---|---|---|---|---|
| (root) 설정·문서 | 18 | 866 | 1/267 (proxy.test.ts) | 아래 루트 단독 파일 행 참조 |
| `proxy.ts` | 1 | 214 | proxy.test.ts 267 | **미덮임** (인증 라우팅, a절) |
| `next.config.ts` | 1 | 12 | - | 09 일부(NEXT_PUBLIC·배포). 구조는 미덮임 (빌드 설정=타 담당) |
| `instrumentation*` / `middleware*` | 0 | 0 | - | 없음 (proxy.ts가 middleware 역할) |
| `vitest.config.ts`·`vitest.setup.ts`·`playwright.config.ts` | 3 | 159 | - | 07 |
| `eslint.config.mjs`·`knip.json`·`doctor.config.json`·`.prettierrc` | 4 | 121 | - | 09(knip·prettierrc), 03(lint 경계). doctor.config.json 미덮임(도구 설정) |
| `package.json`·`tsconfig.json`·`components.json`·`postcss.config.mjs` | 4 | 145 | - | 09(scripts), 03(alias). components.json·postcss 미덮임(빌드 설정) |
| `Dockerfile`·`docker-compose.yml`·`.env*`·`.dockerignore` | 6 | 120 | - | 09 |
| `.claude/*` | 17 | 2640 | - | 08 |
| `.github/*` | 4 | 224 | - | 09 |
| `deploy/server` | 5 | 131 | - | 09 |
| `docs/agents` | 16 | 582 | - | 08 |
| `docs/superpowers` | 22 | 5995 | - | 08 |
| `scripts/*` | 12 | 1350 | - | 02(fetch-spec)·09(스크립트). 나머지 타 담당 |
| `e2e`·`tests/e2e`·`tests`·`testing` | - | - | 11/748 | 07 / 타 담당 |
| `public/` | 5 png | - | - | 이미지, 해당 없음 |
| `app/` 루트 (`layout.tsx` 50, `manifest.ts` 26, `error.tsx` 16, `global-error.tsx` 74, `not-found.tsx` 5, `globals.css` 588, `favicon.ico`) | 7 | 765 | 0 | 03(app 계층 이동)만. 셸·오류·manifest **미덮임**. globals.css는 타 담당 |
| `app/firebase-messaging-sw.js/route.ts` | 1 | 27 | 0 | **미덮임** (c절) |
| `app/(admin)/**` | 19 | 662 | 1/35 | 04(폼)·06(목록) 부분. 화면 구조·layout 가드 **미덮임** (f절) |
| `app/(auth)/**` | 4 | 167 | 2/95 | 부분(04 로그인 폼 여부 미확인). **미덮임** (a절) |
| `app/(main)/**` | 50 | 1573 | 6/419 | 03(app 계층), 02(prefetch). 레이아웃·error.tsx **미덮임** (e·d절) |
| `app/api/**` | 22 | 377 | 4/208 | 02(프록시 13개, createProxyRoute). 비프록시(auth 5·fcm 2·stream 2·health·client-errors·runtime-config·meta류) **미덮임** (a·b·c·d절) |
| `app/auth/callback` | 1 | 103 | 1/93 | **미덮임** (a절) |
| `app/pending`·`app/rejected` | 7 | 175 | 1/62 | **미덮임** (a절) |
| `components/ui`, `lib/utils.ts` | 16 | 1051 | 0 | shadcn 생성. 03(alias)만 |
| `entities/account` | 12 | 368 | 9/527 | 01·02 |
| `entities/admin` | 8 | 502 | 4/416 | 01·02. 모델·변환 로직 **미덮임** (f절) |
| `entities/admin-settings` | 5 | 91 | 2/91 | 01·02 (f절) |
| `entities/backtest` | 4 | 82 | 1/76 | 01·02 (g절) |
| `entities/error-log` | 4 | 43 | 2/70 | 01·02. 리포터 **미덮임** (d절) |
| `entities/fcm` | 5 | 161 | 4/187 | 01·02. 푸시 등록 흐름 **미덮임** (c절) |
| `entities/finance` | 18 | 2436 | 13/1510 | 01·02·05 |
| `entities/market` | 7 | 174 | 3/264 | 01·02. 어댑터 **미덮임** (g절) |
| `entities/meta` | 6 | 270 | 3/103 | 01·02. `/api/meta` 소비 **미덮임** (d절) |
| `entities/order` | 9 | 395 | 5/531 | 01·02·05 |
| `entities/privacy` | 9 | 246 | 1/71 | 01·02 (f절 관리자용) |
| `entities/runtime-config` | 4 | 68 | 2/33 | 05 |
| `entities/stats` | 9 | 605 | 6/500 | 01·02·05(CAGR 등). 나머지 **미덮임** (g절) |
| `entities/strategy` | 16 | 1281 | 5/948 | 01·02·05 |
| `entities/trade` | 10 | 503 | 6/508 | 01·02·05 |
| `entities/user` | 8 | 271 | 2/294 | 01·02·05(상태판정). 인증 소비 **미덮임** (a절) |
| `features/account` | 12 | 1165 | 6/702 | 04 |
| `features/admin` | 20 | 1235 | 9/1029 | 04·06. 관리자 mutation 흐름 **미덮임** (f절) |
| `features/asset` | 11 | 536 | 2/396 | 04 |
| `features/auth` | 6 | 195 | 3/181 | **미덮임** (a절) (04가 폼만) |
| `features/backtest` | 3 | 464 | 2/385 | 04 |
| `features/finance` | 37 | 2162 | 11/1398 | 04·05 |
| `features/settings` | 14 | 615 | 6/427 | 04 (텔레그램·FCM 연결 부분 **미덮임**, c절) |
| `features/strategy` | 48 | 3925 | 33/5165 | 04 |
| `shared/lib` 직속 | 10 | 408 | 8/395 | 개별 행 아래 |
| `shared/lib/api-schema.ts` 114, `normalize.ts` 15 | 2 | 129 | - | 01 |
| `shared/lib/date-range.ts` 92 | 1 | 92 | 1 | 05(날짜 계산) |
| `shared/lib/indicators.ts` 37 | 1 | 37 | 1 | 05 |
| `shared/lib/env.ts` 19, `firebase.ts` 24, `metadata.ts` 4, `query-string.ts` 10, `subviewHistory.ts` 57, `utils.ts` 36 | 6 | 150 | 4 | **미덮임** (h절). query-string은 06 URL 상태와 인접 |
| `shared/lib/api-client` | 1 | 140 | 1/228 | 02 |
| `shared/lib/auth` | 5 | 108 | 4/221 | **미덮임** (a절) |
| `shared/lib/chart` | 2 | 11 | 0 | 타 담당(차트) |
| `shared/lib/format` | 2 | 206 | 1/263 | 06(포매터) |
| `shared/lib/hooks` | 10 | 328 | 8/365 | 06(use-search-param·range-filter·table-sort·client-pagination·confirm-dialog 일부). amount-hidden·decimal-amount-text·media-query·reload-on-chunk-error·scrolled-to-end **미덮임** (h절) |
| `shared/lib/proxy` | 2 | 120 | 2/256 | 02 |
| `shared/lib/query` | 4 | 78 | 1/19 | 02 |
| `shared/model` | 1 | 25 | 1/61 | 01(타입 위치) 부분. 규칙 **미덮임** (h절) |
| `shared/providers` | 2 | 25 | 0 | **미덮임** (e절) |
| `shared/ui` 직속 | 38 | 1702 | 9/646 | 06 대부분(Badge·EmptyState·SectionError·PaginationBar·Surface 등), 04(FormDialog 등). SegmentedTabs/Toggle·SectionTabBar·MobileSortControl 등 일부 **06 소관 불명**(미확인) |
| `shared/ui/{form,range-filter,selection-card,stepper}` | 7 | 261 | 3/216 | 04·06 |
| `widgets/account-card·account-detail·accounts-grid` | 11 | 659 | 7/886 | 06(목록·카드) |
| `widgets/admin-account-list·admin-log-list·admin-trade-list·admin-user-list` | 18 | 1108 | 6/630 | 06 부분. 관리자 평행 구조 **미덮임** (f절) |
| `widgets/admin-privacy-trade-list` (+model 176) | 11 | 1593 | 2/478 | 06 부분 (f절) |
| `widgets/all-strategies·strategy-card·strategy-detail·strategy-list·cycle-history·timeline` | 29 | 2740 | 15/2991 | 06 |
| `widgets/asset-*·finance-*` (composition, overview, record-check, record-list, settings, trend, budget-progress, bulk-register, record-list, summary, trend) | 29 | 2538 | 9/1740 | 05·06 |
| `widgets/backtest` | 4 | 130 | 0 | 06 부분 (g절) |
| `widgets/benchmark-comparison` (+model 299) | 18 | 1508 | 6/1085 | 05(CAGR) 부분. 어댑터·훅 **미덮임** (g절) |
| `widgets/crypto-market-indicators` | 5 | 673 | 2/466 | 05(지표) 부분 (g절) |
| `widgets/dashboard` | 9 | 580 | 2/292 | 02(initial props)·05 부분 (g절) |
| `widgets/stats-overview` (+lib 22) | 12 | 823 | 3/533 | 05 부분 (g절) |
| `widgets/fear-greed-card·housing-quintile-trend·market-holiday-calendar` | 15 | 1073 | 8/704 | 05 부분 (g절) |
| `widgets/layout` | 9 | 404 | 2/105 | 06(내비 항목 배열 단일화)만. Provider·셸 **미덮임** (e절) |
| `widgets/error-display` | 2 | 130 | 0 | **미덮임** (d절) |
| `widgets/pull-to-refresh` | 2 | 103 | 1/71 | **미덮임** (c절) |
| `widgets/revealable-value` | 2 | 32 | 1/51 | **미덮임** (e절) |
| `widgets/theme-toggle` | 2 | 41 | 0 | **미덮임** (e절) |
| `widgets/glass-card·kpi-card·page-header` | 7 | 134 | 0 | 06(Card/Surface·섹션제목) |
| `widgets/settings` | 1 | 76 | 1/24 | 04/미확인 |

(루트 파일은 `proxy.ts` 214, `next.config.ts` 12 등. 개별 행 위 참조.)

미덮임 런타임 영역(2절 대상): a 인증·토큰, b SSE, c 알림·PWA, d 오류·관측, e 앱 셸·Provider·테마·프라이버시·전역상태, f 관리자, g 시장·대시보드 어댑터, h shared/lib 잡동사니.

## 2a. 인증·토큰 흐름

### 파일·줄 수 (테스트 제외 / 테스트)
| 파일 | 줄 | 테스트 줄 |
|---|---|---|
| `proxy.ts` | 214 | `proxy.test.ts` 267 |
| `app/auth/callback/route.ts` | 103 | 93 |
| `app/api/auth/{logout 35, me 44, reapply-done 31, refresh 33, status-stream 36}/route.ts` | 179 | (api 전체 테스트 4파일 208 중 일부, 개별 미확인) |
| `shared/lib/auth/{cookies 5, jwt 18, redirectPath 21, refresh 46, token 18}.ts` | 108 | 221 (cookies 24, jwt 44, redirectPath 50, refresh 103) |
| `features/auth/logout/*` (LogoutButton 36, DashboardLogoutErrorToast 32) | 70 | 48 |
| `features/auth/reapply/*` (ReapplyButton 53, RejectedReapplyButton 70) | 125 | 133 |
| `app/(auth)/{layout 7, page 6, login/page.tsx 128, login/ApprovalNotice.tsx 26}` | 167 | 95 |
| `app/pending/*` (page 65, PendingStatusWatcher 29, layout 3, loading 13) / `app/rejected/*` (page 41, layout 11, loading 13) | 175 | 62 |
| `shared/lib/api-client/index.ts` 중 401·refresh·logout 부분 (:43-106) | 약 64 | (02 소관 파일) |
합계(위 중 api-client 제외, wc 실측): 1,384줄(login 포함, loading·layout 포함) / 테스트 919줄.

### 흐름 한 장
```
[로그인] login/page.tsx:44 -> kauth.kakao.com(state=next) -> app/auth/callback/route.ts:42 POST kista-api /api/auth/kakao/callback
         -> Set-Cookie: kista-token(7d), kista-user-status(7d, PENDING 제외), RT(raw relay) -> redirect getRedirectPath(status,next)(:96)
[매 요청] proxy.ts:67
   /api/* 통과(:71)
   token 없음 -> 보호경로면 /login?next=(:173) / 아니면 통과
   prefetch 헤더 -> 통과(:106)
   isJwtExpired(token)(:112) -> RT 있으면 shared/lib/auth/refresh.ts refreshAccessToken -> kista-api /api/auth/refresh
        성공: 요청 cookie 헤더 치환(:124-130) + buildAtSetCookie(:133) + RT relay(:135) / 실패: 캐시쿠키 삭제 + failDest
   resolveStatusRole(:35): status/role 쿠키 캐시 히트(fast) / 아니면 kista-api /api/auth/me(:52) -> 쿠키 1h 캐시(:155-159, PENDING 제외)
   routeByStatusAndRole(:183): /admin* ADMIN만, PENDING->/pending, REJECTED->/rejected, ACTIVE이면 / /login /pending /rejected -> /dashboard
[Server Component] getAuthToken()(token.ts:5, 쿠키 읽기) 30개 파일 / requirePageToken 8개 파일 / hasValidToken(jwt.ts:16) 2개 파일(layout:37, dashboard/page:23)
[Client] clientFetch(api-client:93) 401 -> readErrorCode -> tryRefreshToken(POST /api/auth/refresh, in-flight 공유) -> 재시도 -> 또 401이면 doLogout(:60)
         doLogout: POST /api/auth/logout(in-flight 공유) -> location.href=/dashboard(?error=token_blacklisted)
[pending] PendingStatusWatcher.tsx:10 EventSource('/api/auth/status-stream') -> 'ACTIVE'->/dashboard, 'REJECTED'->/rejected
```

### 쿠키 설정 위치 전수 (비테스트)
쿠키 이름 상수는 `shared/lib/auth/cookies.ts:1-4` 한 곳, 소비 8개 파일(proxy, callback, logout, me, reapply-done, refresh route, refresh.ts, (main)/layout, token.ts). 쿠키 이름 리터럴 직접 사용은 주석 외 없음(스크립트 3개는 리터럴 사용: a11y-check/run.mjs:76, visual-diff/run.mjs:164, shoot.mjs:15, scenarios.mjs:49).
쿠키 옵션이 적힌 곳(같은 `httpOnly, sameSite:lax, path:/` 조합):
1. `proxy.ts:15-21` `cacheCookieOptions` — status/role 캐시, maxAge 3600, secure=x-forwarded-proto
2. `app/auth/callback/route.ts:12-18` `TOKEN_COOKIE_OPTIONS` — AT maxAge 604800 **그리고 같은 옵션을 status 쿠키에도 적용(:73-76, maxAge 7일)**. proxy의 status 캐시는 1h(:19). 같은 이름 쿠키의 수명이 두 곳에서 다름(7d vs 1h). role 쿠키는 callback에서 설정하지 않음
3. `shared/lib/auth/refresh.ts:45` `buildAtSetCookie` — AT를 문자열로 직렬화 (Max-Age=604800 리터럴). 사용처 2: proxy.ts:133, refresh/route.ts:23
4. `app/api/auth/refresh/route.ts:29` — status/role 삭제를 raw 문자열 `Path=/; Max-Age=0; HttpOnly; SameSite=Lax`로 직접 적음
5. `shared/lib/auth/cookies.ts:5` `CLEAR_COOKIE = {maxAge:0, path:'/'}` — 사용처 3: logout(:30-33), me DELETE(:40-42), reapply-done(:26). me DELETE는 `{...CLEAR_COOKIE, httpOnly:true}`(:41-42), logout은 그냥 CLEAR_COOKIE로 httpOnly 옵션 표기가 라우트마다 다름
6. `proxy.ts:93-94` `dest.cookies.delete(STATUS/ROLE)` — 삭제 방식이 `cookies.delete`(proxy), `cookies.set(.., '', CLEAR_COOKIE)`(3 route), raw Set-Cookie 문자열(refresh route) 3종
`maxAge 604800`(7일) 리터럴: callback:16, refresh.ts:45 두 곳 (주석 "JWT TTL과 동일", 값의 SSOT 없음). 쿠키 직렬화 방식 3종(ResponseCookies API 3곳, raw 문자열 builder 1곳+raw 직접 1곳).
`x-forwarded-proto` 판정: proxy.ts:17, proxy.ts:132, refresh/route.ts:18, callback/route.ts:11 — 4곳(proxy 내부에서도 2곳 중복).

### JWT 디코드·만료 판정
디코드(`atob`) 위치 1곳: `jwt.ts:8`. 소비: proxy.ts:112(`isJwtExpired`), `(main)/layout.tsx:37`·`dashboard/page.tsx:23`(`hasValidToken`). 서명 검증 없음(주석 jwt.ts:1). 클라이언트 쪽 JWT 디코드 없음.

### 상태(PENDING/REJECTED/ACTIVE)·역할 분기가 적힌 위치
- `proxy.ts:12` VALID_STATUSES 집합, `:155` PENDING 캐시 제외, `:183-210` routeByStatusAndRole(정본)
- `app/auth/callback/route.ts:72` PENDING 캐시 제외 중복, `:96-103` getRedirectPath — 같은 status→경로 표를 proxy와 별도로 보유(주석 :94-95가 "proxy가 어차피 이동시킨다"고 명시)
- `app/pending/PendingStatusWatcher.tsx:14-16` ACTIVE→/dashboard, REJECTED→/rejected (3번째 사본)
- role=ADMIN 판정: `proxy.ts:192`, `(main)/layout.tsx:34`(쿠키 role 우선, 없으면 getMe 폴백), `(admin)/admin/users/page.tsx:24` getMe — 3곳
- `app/(admin)/layout.tsx`에는 가드 없음(proxy가 /admin 가드, layout:27줄은 레이아웃만)
- 보호 경로 prefix 목록: `proxy.ts:25-26` 1곳(docs/agents/architecture.md는 문서 사본)
- `/api/auth/me` 호출 3곳: proxy.ts:52(fetch 직접, 5초 timeout), `app/api/auth/me/route.ts:16`(프록시 handler 직접 fetch, createProxyRoute 미사용), `entities/user/api/index.ts:5` `getMe`(fetchEither). `auth/me` 라우트·`auth/reapply-done`·`auth/logout`·`auth/refresh`는 createProxyRoute를 쓰지 않는 개별 구현(5개)

### 401 처리 경로 수
1. `proxy.ts:112-139` AT 만료 선제 갱신
2. `proxy.ts:57` `/me` !ok → 캐시 삭제 (`:63` 예외는 보존: 비대칭)
3. `api-client/index.ts:95-103` clientFetch 401 → refresh 1회 → 재시도 → doLogout (2단계 401 처리)
4. Route Handler 측 401 생성: `unauthorizedJson` 사용처 — createProxyRoute:31 + me×2, reapply-done, fcm/tokens×2 (5곳 직접), `refresh/route.ts:10,16`·`status-stream/route.ts:15`는 각자 `NextResponse.json/Response('Unauthorized')` 직접 작성(응답 본문 형태가 3종: `{error:'Unauthorized'}`, `{error:'No refresh token'}`, 평문 'Unauthorized')
5. `trades/stream/route.ts:32-33`, `TradeNotificationProvider.tsx:44` SSE 쪽 인증 실패 처리 (b절)
6. `entities/market/api/index.ts:7`, `model/queryOptions.ts:10`, createProxyRoute:12-13: 공개 엔드포인트에 토큰을 붙이지 않는 규칙 3곳 주석(만료 AT가 permitAll 경로에서도 401)

### 로그아웃 경로 수
1. `LogoutButton.tsx:19-20` — clientFetch('/api/auth/logout') → location.href='/dashboard'. 사용처 5곳(MainLayout:61, pending/page:37, rejected/page:9, AdminSidebar:43, DesktopSidebar:137)
2. `api-client/index.ts:60-67` doLogout — fetch('/api/auth/logout') → location.href=/dashboard(+?error)
3. `DeleteAccountButton.tsx:23` 탈퇴 → location.href='/' (쿠키는 me DELETE route가 삭제, `me/route.ts:38-43`)
4. `proxy.ts:138` 갱신 실패 시 캐시쿠키 삭제 + 로그인 리다이렉트 (kista-token 자체는 안 지움: layout:35-36 주석이 이를 보완하려고 `hasValidToken` 추가했다고 설명)
`/api/auth/logout`을 호출하는 클라이언트 코드: LogoutButton, doLogout 2곳 (진행 중 요청 공유 `logoutInFlight`는 doLogout에만 적용).

### 재신청 버튼 (05 소관의 쿨다운 제외 구조만)
`ReapplyButton.tsx`(53, pending용, 쿨다운 1h, localStorage 키 'reapply_last_requested_at') / `RejectedReapplyButton.tsx`(70, 24h, 키 'reapply_rejected_last_at'): 쿨다운 초기화 블록이 같은 형태 — Reapply:14-20 vs Rejected:25-31. `formatCooldown`은 Rejected에만. 둘 다 `reapply()` 호출. `app/api/auth/reapply-done/route.ts`가 서버쪽(경로명 reapply-done인데 upstream은 /api/auth/approval-requests, `:14`).

### pending/rejected 화면
- `app/pending/page.tsx` 65줄 + `PendingStatusWatcher` 29줄(EventSource 1곳), `app/rejected/page.tsx` 41줄. 두 page가 같은 `GlassCard topBar={<BrandWordmark/><LogoutButton/>}` + 로고 Image + 상태 pill 헤더 구조(pending:39-52 / rejected:11-21) — 두 화면 평행(인라인 style 사용 각 4~5곳, pending:40·42·45·46, rejected:12·13·14·15·26·28)
- `app/pending/layout.tsx`(3줄, `<main>`만) / `app/(auth)/layout.tsx`(7줄) / `app/rejected/layout.tsx`(11줄) — `<main>{children}</main>` 래퍼 3개. rejected만 metadata, pending은 page에 metadata
- `PendingStatusWatcher.test.tsx` 62줄

### 소비처 수 (비테스트 파일 기준)
`@shared/lib/auth/cookies` 8 / `jwt` 3 / `refresh` 4 / `token` 34(getAuthToken 30 + requirePageToken 8 겹침) / `redirectPath` 2 / `safeRedirectPath` 3.

### 주석이 묶어 둔 사본·낡은 참조
- `refresh.ts:4` "proxy.ts(tryRefresh)와 ... 공통부" — proxy.ts에 `tryRefresh` 함수는 없음(현재 이름 `refreshAccessToken` 호출). 낡은 이름
- `refresh.ts:41` "proxy.ts와 refresh/route.ts가 동일 값을 쓰도록 통일", `proxy.ts:131` "app/api/auth/refresh/route.ts와 동일 값"
- `callback/route.ts:16` "7일 — JWT TTL과 동일" (상수 아님)
- `proxy.ts:14`, `refresh.ts:43` "secure는 NODE_ENV가 아닌 실제 프로토콜 기준" — 같은 설명이 2곳 + 판정 코드 4곳
- `proxy.ts:62` "app.md가 요구하는 ..." 문서 참조
- 사본 주석 건수(이 절): 5건

## 2b. SSE

### Route Handler 2개 (업스트림 프록시)
| 파일 | 줄 | 업스트림 | 인증 실패 응답 |
|---|---|---|---|
| `app/api/trades/stream/route.ts` | 46 | kista-api `/api/trades/stream` (:21) | 토큰 없음·업스트림 401/403 → `sseAuthErrorResponse()`(200 SSE + `event: auth-error`) (:14-18, :31-35) |
| `app/api/auth/status-stream/route.ts` | 36 | kista-api `/api/auth/status-stream` (:19) | 토큰 없음 → `new Response('Unauthorized', {status:401})` (:14-16), 업스트림 !ok → `Upstream error`+status (:25-27) |
공통 구조 평행: `import { Agent, fetch as undiciFetch } from 'undici'` + `new Agent({ bodyTimeout:0, headersTimeout:0 })` + `export const dynamic='force-dynamic'` + `getAuthToken()` + `undiciFetch(..., { dispatcher: sseAgent, signal: request.signal })` + 본문 `new Response(upstream.body, { Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive })` — 위 3줄 블록·`sseAgent` 선언·주석("SSE는 장기 연결이므로 undici 기본 bodyTimeout(300s) 비활성화", "undici fetch 사용 — dispatcher 옵션이 전역 fetch에서 지원되지 않아 TypeError 발생")이 두 파일에 **글자 그대로 중복**: trades/stream:9-10,20,39-45 ↔ status-stream:8-9,18,29-35. 인증 실패 처리는 두 파일이 다름(auth-error 이벤트 vs 401). `createProxyRoute`(02 소관)는 스트림을 처리하지 않음. `undici`를 import하는 파일은 이 2개뿐.
SSE 응답 헬퍼: `shared/lib/proxy/routeHelpers.ts:43-53 sseAuthErrorResponse` — 사용처 1파일(trades/stream, 2곳 호출).

### 클라이언트 구독 코드 (`EventSource` 사용처 전수, 비테스트)
1. `entities/trade/providers/TradeNotificationProvider.tsx:27` (65줄) — `/api/trades/stream` 구독, `trade` 이벤트→`toast.custom(TradeToast)`(:33)+`onTrade` 콜백, `auth-error`→close+stopped(:45-48), `onerror`→close 후 5000ms 고정 재시도(:50-53, `RECONNECT_DELAY_MS` :8)
2. `app/pending/PendingStatusWatcher.tsx:10` (29줄) — `/api/auth/status-stream` 구독, `status` 이벤트 ACTIVE/REJECTED→`router.push`. **onerror 핸들러 없음**, 브라우저 자동 재연결에 맡김(:20 주석)
→ 구독 구현 2개, 재연결 방식 2종(수동 5s 고정 재시도 vs 브라우저 기본 자동 재연결). 백오프(지수) 구현 0, 가시성(`visibilitychange`·`online`·`focus`) 처리 코드 0건(grep: `visibilitychange|visibilityState|addEventListener('online|offline|focus|pageshow')` 0건). 공용 `useEventSource` 류 훅 없음.
소비 구조: `TradeNotificationProvider`는 `entities/trade/index.ts:17`가 export, 사용처 1곳(`widgets/layout/TradeNotificationBridge.tsx:33`). 그 Bridge의 사용처 1곳(`app/(main)/layout.tsx:83`, `isAuthenticated`일 때만). Provider는 `return null`(이름은 Provider이나 context 제공 없음, 렌더 기여는 `toast.custom`뿐).

### TradeNotificationBridge (무효화 표 제외)
34줄 중 SSE 수신 관련은 `<TradeNotificationProvider onTrade=.../>`(:33) 한 줄. 나머지 :9-29가 TRADE_DEPENDENT_KEYS 표(02 소관). Provider 주석(:11)이 "entities 간 cross-import를 피하려고 상위 계층(widgets)이 주입" — 슬롯(콜백) 주입 구조(03 소관).

### 테스트 줄 수
TradeNotificationProvider.test 121, TradeNotificationBridge.test 69, PendingStatusWatcher.test 62, `vitest.setup.ts:35-76` MockEventSource 42줄(07 소관 파일). 합계 SSE 직접 테스트 252줄(+mock 42) vs 소스 SSE 코드 65+29+46+36+11(helper) = 187줄.

### 단일 사용 추상화
- `TradeNotificationProvider`(Provider 이름, 사용처 1) → `TradeNotificationBridge`(사용처 1) → `app/(main)/layout.tsx`: 호출 체인 3단, 각 단 사용처 1
- `sseAuthErrorResponse` 사용처 1파일
- 사본 주석(동일 문구) 건수: 2 (undici 관련 주석 2쌍)

## 2c. 알림·PWA

### 파일·줄 수
| 영역 | 파일 | 줄 | 테스트 줄 |
|---|---|---|---|
| FCM entity | `entities/fcm/{api/index.ts 34, hooks/useFcmToken.ts 59, providers/FcmAutoRegister.tsx 25, providers/FcmForegroundListener.tsx 39, index.ts 4}` | 161 | 187 (api 4 파일 합) |
| FCM 초기화 | `shared/lib/firebase.ts` | 24 | 0 |
| FCM 서비스 워커 | `app/firebase-messaging-sw.js/route.ts` (public/ 아래 sw 파일 없음, Route Handler가 JS 문자열 생성) | 27 | 0 |
| FCM Route Handler | `app/api/fcm/tokens/route.ts` 23 + `tokens/[token]/route.ts` 22 | 45 | (app/api 테스트 4파일 중 개별 미확인) |
| FCM 연결 | `widgets/layout/FcmBridge.tsx` | 17 | 36 |
| 설정 UI | `features/settings/notification-channel/NotificationSettings.tsx` 148, `notification-prefs/TradingAlertToggle.tsx` 42 | 190 | (두 폴더 test 합 미집계) |
| 텔레그램 | `features/settings/telegram-connect/{PendingTelegramConnect 77, TelegramSection 94, useTelegramConnectForm 34, index 2}` | 207 | TelegramSection.test 1파일 |
| manifest | `app/manifest.ts` | 26 | 0 |
| PTR | `widgets/pull-to-refresh/PullToRefresh.tsx` | 102 | 71 |
| 앱 셸 viewport | `app/layout.tsx:31-33`(viewportFit:cover), `appleWebApp`(:24-28) | - | - |
설치 프롬프트(`beforeinstallprompt`)·오프라인 처리(`navigator.onLine`, `offline`)·`serviceWorker` 캐싱 코드: **없음**(grep 0건, SW는 FCM 전용). iOS 대응은 주석·CSS 수준(아래).

### 흐름 한 장
```
(main)/layout.tsx:81  isAuthenticated -> <FcmBridge/> -> useMeQuery()(entities/user) -> channel FCM|ALL 일 때만
    <FcmAutoRegister>  : Notification.permission==='granted' -> requestFcmToken() -> registerTokenToServer() -> POST /api/fcm/tokens -> kista-api
    <FcmForegroundListener enabled> : onMessage -> navigator.serviceWorker.ready.showNotification
requestFcmToken(entities/fcm/api:7): getFirebaseMessaging(shared/lib/firebase) + navigator.serviceWorker.register('/firebase-messaging-sw.js') + Notification.requestPermission + getToken(VAPID)
  /firebase-messaging-sw.js -> app/firebase-messaging-sw.js/route.ts (gstatic firebase 12.13.0 compat importScripts + initializeApp(config) + firebase.messaging())
설정 화면: NotificationSettings.tsx:24 useFcmToken() { prewarm, acquireToken, getCachedToken } + registerTokenToServer/unregisterTokenFromServer 직접 호출(:50, :73)
텔레그램: features/settings/telegram-connect (TelegramSection 설정 화면용, PendingTelegramConnect pending 화면용) -> entities/user api(telegram 4곳)
```

### 평행·중복
- **firebase config 6키 객체가 2곳**: `shared/lib/firebase.ts:4-11`(런타임 번들, undefined 허용) vs `app/firebase-messaging-sw.js/route.ts:2-9`(`?? ''` 기본값). 동일 `process.env.NEXT_PUBLIC_FIREBASE_*` 6개를 각각 적음. `VAPID_KEY` env는 `entities/fcm/api/index.ts:5` 1곳
- FCM 토큰 등록 호출 경로 3개: FcmAutoRegister:19-20, useFcmToken.requestAndRegister:42-53, NotificationSettings.tsx:73. `requestFcmToken()` 호출처 3곳(AutoRegister:19, useFcmToken:18,30)
- `Notification.permission === 'granted'` 가드 위치 4곳: useFcmToken:15, FcmAutoRegister:17, FcmForegroundListener:20, NotificationSettings.tsx:63(denied 분기)
- `app/api/fcm/tokens/route.ts`, `tokens/[token]/route.ts`는 `getAuthToken + fetch + relayUpstreamError + noContent` 구조로 `createProxyRoute`(02 소관)와 같은 일을 하나 사용하지 않음(2개). 같은 방식으로 auth 5개(a절, status-stream 포함), trades/stream 1개(b절), fcm 2개 개별 구현 → `app/api` 비테스트 21 route 파일 중 createProxyRoute 사용 12개(grep 실측), 미사용 9개(auth 5, fcm 2, trades/stream 1, health 1)
- `PullToRefresh`: 사용처 2곳(`(main)/layout.tsx:76`, `(admin)/layout.tsx:19`). 한 구현, 평행 없음. `router.refresh()` + `queryClient.invalidateQueries()`(전체 무효화, :57)

### 구현 하나뿐인 추상화 / 사용처 1곳
- `FcmAutoRegister`·`FcmForegroundListener` 사용처 각 1곳(`FcmBridge.tsx:13-14`), `FcmBridge` 사용처 1곳(`(main)/layout.tsx:81`). `FcmForegroundListener`의 `enabled` prop은 사용처에서 항상 `true`(FcmBridge:14, 값을 바꾸는 호출 없음 — 이미 channel 분기 뒤)
- `useFcmToken` 사용처 1곳(NotificationSettings.tsx:24). `getCachedToken` 반환값 사용처 1곳(:50 부근)
- `getFirebaseMessaging` 사용처 2(entities/fcm/api, FcmForegroundListener)

### viewport·app shell·safe-area·dvh 위치 전수 (비테스트, 스크립트 제외)
- `app/(main)/layout.tsx:41-43` `max-lg:h-dvh max-lg:overflow-hidden` 앱 셸 + `:78 data-scroll-root` + 주석(iOS standalone PWA, visualViewport, app_error_logs `MOBILE_NAV_VIEWPORT_*`)
- `shared/ui/FormDialog.tsx:41` `h-dvh` + `pb-[max(1rem,env(safe-area-inset-bottom))]`
- `widgets/layout/MobileBottomNav.tsx:23` `pb-[env(safe-area-inset-bottom)]`, `overscroll-x-contain`
- `app/globals.css:322` `overscroll-behavior-y: none`
- `app/layout.tsx:31-33` `viewportFit:'cover'`
- `min-h-screen`(100vh 계열) 사용: `(admin)/layout.tsx:15`, pending/loading:5, rejected/loading:5, ErrorDisplay.tsx:117, GlassCard.tsx:16, (main)/layout:43(`lg:min-h-screen`), `global-error.tsx:33`(minHeight:'100vh' 인라인) — 6곳
- `visualViewport`·`innerHeight` JS 사용: 0건. 스크립트 `scripts/visual-diff/shoot.mjs:36`이 `.max-lg:h-dvh`·`[data-scroll-root]` 클래스 문자열에 의존
- PullToRefresh.tsx:26-27 `[data-scroll-root]` 셀렉터 의존 (layout:78과 쌍), :25 `[data-slot="drawer-content"], [data-slot="dialog-content"]` 의존

### manifest·메타
`app/manifest.ts`(26줄): name/short_name 'KISTA', theme_color '#B66951', background '#FCEFE8' 리터럴. `app/layout.tsx:20`이 `manifest:'/manifest.webmanifest'` 지정, `appleWebApp` 설정. icon-512만 `purpose:'maskable'`.
색 리터럴(#B66951, #FCEFE8)과 globals.css 토큰의 대응은 미확인(스타일=타 담당).

### 테스트
FCM 계열 테스트 줄: entities/fcm 187 + FcmBridge 36 = 223 / 소스 161+24+27+45+17 = 274. PTR 71/102. 텔레그램 테스트 TelegramSection.test 1파일(줄 수 미집계).
사본 주석 건수(이 절): 1 (firebase config 양쪽 주석 연계는 없음 → 구조 사본으로 위 평행에 기록)

## 2d. 오류 수집·관측

### 파일·줄 수
| 파일 | 줄 | 테스트 |
|---|---|---|
| `entities/error-log/{api/index.ts 12, hooks/useReportClientError.ts 24, model/types.ts 6, index.ts 1}` | 43 | 70 (2파일) |
| `shared/lib/hooks/use-reload-on-chunk-error.ts` | 31 | use-* 테스트 8파일 365줄 중 |
| `widgets/error-display/{ErrorDisplay.tsx 129, index.ts}` | 130 | 0 |
| `app/error.tsx` 16 / `app/(main)/error.tsx` 16 / `app/(admin)/admin/error.tsx` 16 / `app/not-found.tsx` 5 / `app/global-error.tsx` 74 | 127 | 0 |
| `app/api/client-errors/route.ts` 6, `app/api/health/route.ts` 5, `app/api/runtime-config/route.ts` 13 | 24 | - |
| `entities/meta/api/index.ts` (`/api/meta` fetch) | 10 | 13파일 중 api 테스트 |
`instrumentation*.ts`: 없음. `window.onerror`·`unhandledrejection`·Sentry류: 0건 (오류 수집은 React 오류 바운더리 경로 하나뿐). 로깅 유틸 없음 — `console.error/warn/log` 비테스트·비스크립트 호출 8건 (`app/auth/callback/route.ts` 4, `routeHelpers.ts` 1, `entities/fcm/api` 1, `reapply-done` 1, 그 외 1 = 위 31건 중 scripts 제외 합).

### 흐름 한 장
```
렌더 오류 -> app/error.tsx(root, standalone) | (main)/error.tsx | (admin)/admin/error.tsx  [동일 시그니처 16줄 x3]
          -> ErrorDisplay(code=500, error, retry=unstable_retry ?? reset, standalone)
             -> useReportClientError(error, pathname) -> reportClientError -> clientFetch POST /api/client-errors(keepalive)
                -> app/api/client-errors/route.ts createProxyRoute(requireAuth:false) -> kista-api
             -> useReloadOnChunkError(error): ChunkLoadError류면 500ms 후 location.reload (sessionStorage 'kista:chunk-reload-at', 30s 1회)
root layout 오류 -> app/global-error.tsx (ErrorDisplay를 쓰지 않고 500 화면을 직접 렌더, useReportClientError+useReloadOnChunkError 직접 호출)
404 -> app/not-found.tsx -> ErrorDisplay(code=404, standalone) (오류 보고 없음: error 인자 없음)
```

### error.tsx·global-error·not-found 전수와 차이
| 파일 | 줄 | ErrorDisplay 사용 | standalone | 기타 |
|---|---|---|---|---|
| `app/error.tsx` | 16 | O | true | |
| `app/(main)/error.tsx` | 16 | O | false | 함수명만 `MainError` |
| `app/(admin)/admin/error.tsx` | 16 | O | false | 함수명만 `AdminError`, `(main)/error.tsx`와 라인 단위로 동일(함수명 제외) |
| `app/global-error.tsx` | 74 | X(직접 마크업) | - | `<html className="dark">` 고정, 인라인 style 11곳(:26-34, :35, :42-47, :54), `500`·'CIRCUIT BREAKER'·'서버 장애 감지'·'예상치 못한 내부 오류가 발생했습니다.' 문구를 ErrorDisplay.tsx:26-32 CFGS[500]과 중복 |
| `app/not-found.tsx` | 5 | O | true | |
- error.tsx 3개의 `{ error, reset, unstable_retry }` prop 타입 선언과 "Next 16.2 실험 prop" 주석(3곳 거의 동일, :12 / :12 / :12·global-error :16)이 4번 반복.
- (auth)·pending·rejected 세그먼트에는 error.tsx 없음(루트 error.tsx로 올라감). `app/(main)/finance/**`, `stats/**` 등 하위 세그먼트 error.tsx 없음(find 결과 5개가 전부).
- `ErrorDisplay`의 404 cfg는 'SYMBOL NOT FOUND / 종목을 찾을 수 없음 / 상장 폐지된 종목이거나 존재하지 않는 경로입니다.' — 호출부 `ErrorCode = 404 | 500`만(:15-16 주석이 "호출부 4곳"이라고 적음; 현재 error.tsx 3 + not-found 1 = 4로 일치).
- 소비처: `ErrorDisplay` import 4파일(error×3, not-found), `useReportClientError` 2파일(ErrorDisplay, global-error), `useReloadOnChunkError` 2파일(동일).

### /api/health, /api/meta, /api/runtime-config
- `/api/health`: 5줄 Route Handler, 소비는 Docker/Caddy(deploy/server/docker-compose.yml:29, deploy/server/caddy/kista-ui.caddy:4-8), 앱 코드 소비 0
- `/api/meta`: **Route Handler 없음** — `entities/meta/api/index.ts:7`이 서버에서 kista-api `/api/meta`를 직접 fetch(`revalidate:3600`)해 `MetaProvider`(`(main)/layout.tsx`·`(admin)/layout.tsx`)로 주입. 문서·주석에서 말하는 "`/api/meta` 계약"은 kista-api 쪽. `useMeta()` 소비 60파일(전역 컨텍스트, 아래 e절)
- `/api/runtime-config`: createProxyRoute + `Cache-Control: no-store` 덧씌우는 래퍼 13줄(05 소관 runtime-config와 연결)

### 단일 사용·사본
- `useReportClientError` 안의 `truncate` 헬퍼 사용처 1파일(내부 5회 호출), 한도 상수 255/2000/8000/500이 주석(:16)에서 "kista-api @Size 한도"로 묶인 서버 사본
- `useReloadOnChunkError` 사용처 2(둘 다 error UI)
- 사본 주석 건수: 2 ("Next 16.2 실험 prop" 주석 4복사본은 1건으로 계산, kista-api @Size 한도 사본 1건)
- 테스트 줄: 오류 관측 영역 테스트 70(error-log) + 0(ErrorDisplay·error.tsx·global-error)

## 2e. 앱 셸·레이아웃·Provider·테마·프라이버시·전역 상태

### 파일·줄 수
| 영역 | 파일 | 줄 | 테스트 |
|---|---|---|---|
| 루트 레이아웃 `app/layout.tsx` | 1 | 50 | 0 |
| `(main)/layout.tsx` | 1 | 87 | 0 (layout 테스트 없음; `(admin)/layout.test.tsx` 35만 존재) |
| `(admin)/layout.tsx` | 1 | 27 | 35 |
| `widgets/layout/*` (DesktopSidebar 147, AdminSidebar 49, AdminTopBar 48, MobileBottomNav 41, MobileHeader 28, SidebarNavItem 27, TradeNotificationBridge 34, FcmBridge 17, nav-utils 13) | 9(+nav-utils=10) | 404 | 105 (FcmBridge 36, TradeNotificationBridge 69) |
| `shared/providers/{Providers 14, QueryProvider 11}` | 2 | 25 | 0 |
| `entities/meta/providers/MetaProvider.tsx` | 1 | 38 | 테스트 있음(MetaProvider.test.tsx) |
| 테마: `widgets/theme-toggle/ThemeToggle.tsx` 40 + `features/settings/theme-select/ThemeCards.tsx` 66 + `components/ui/sonner.tsx`(useTheme) | 3 | 106+ | ThemeCards.test 1 |
| 프라이버시 가림: `shared/lib/hooks/use-amount-hidden.ts` 87, `widgets/revealable-value/RevealableValue.tsx` 31(+index), `features/finance/hide-amounts/HideAmountsToggle.tsx`, `shared/lib/format` `maskAmount` | 4+ | 약 150 | RevealableValue.test 51 + use-amount-hidden 테스트(개별 미집계) |
| 가계부 기간 컨텍스트 `app/(main)/finance/(dashboard)/FinancePeriodProvider.tsx` | 1 | 59 | - |
| `shared/lib/subviewHistory.ts` | 1 | 57 | 있음 |

### Provider 겹 수와 소비처
렌더 트리(루트에서 말단까지):
```
<html> (app/layout.tsx:41) <body>
  Providers(shared/providers/Providers.tsx:6)
    QueryProvider(QueryClientProvider, createQueryClient)        — 소비: useQuery 계열 전체(02 소관)
      ThemeProvider(next-themes, attribute=class, system)        — 소비 4파일: ThemeToggle, ThemeCards, components/ui/sonner.tsx, Providers
        {children}
        <Toaster/> (:45)                                         — 소비: sonner toast() 호출 전체
  (main)/layout.tsx:40 MetaProvider(meta)                        — useMeta() 60파일
  (admin)/layout.tsx:14 MetaProvider(meta)                       — 같은 Provider를 두 layout이 각자 감쌈
  finance/(dashboard)/layout.tsx FinancePeriodProvider           — 소비 4파일(useFinanceFlowData, layout, page, Provider)
  모듈 스토어(Provider 아님): use-amount-hidden                  — 소비 12파일
```
- 컨텍스트 Provider 3종(QueryClient, next-themes, Meta) + 가계부 기간 1종 = 4겹 컨텍스트. `MetaProvider` 값에서 `findStrategyType/findTicker/findBroker/findStrategyStatus/labelOf` 5개 헬퍼 제공(`MetaProvider.tsx:18-30`); `useMeta` 소비 60파일 중 헬퍼 개별 소비처 수는 미집계
- `(main)/layout.tsx`와 `(admin)/layout.tsx`는 `getMetaBundle()` + `MetaProvider` + `PullToRefresh` + Sidebar 조합이 평행(main 87줄/admin 27줄). 차이: main은 `getAuthToken`·`getMe` fallback·`hasValidToken`·FcmBridge·TradeNotificationBridge·MobileHeader·BottomNav 포함, admin은 AdminSidebar·AdminTopBar만. 레이아웃 래퍼 클래스가 다름(`max-lg:h-dvh` 앱 셸 vs `min-h-screen`; main `lg:p-9` vs admin `lg:p-8 max-w-[1600px]`)
- `(main)/layout.tsx:44,48` eslint-disable 주석 2건, 인라인 JSX prop `trailing`에 로그인/로그아웃 UI 20여 줄(:49-74) 직접 작성 — 레이아웃 파일이 인증 분기(isAuthenticated)·role 분기(isAdmin)·UI 조립을 겸함

### widgets/layout 구조 사실
- `NAV_ITEMS`(6개 항목)이 `DesktopSidebar.tsx:14-21`과 `MobileBottomNav.tsx:9-16`에 **동일 배열 복사**(href/label/icon 동일 6행). 관리자 NAV_ITEMS(7개)도 `AdminSidebar.tsx:10-18` / `AdminTopBar.tsx:8-16`에 복사(href·icon 동일, label만 '사용자 목록' vs '사용자' 등 축약). (06 소관 "내비 항목 배열 단일화" — 사실만 기록)
- active 판정: `isNavItemActive`(nav-utils.ts, Desktop·MobileBottomNav 2사용) vs admin 쪽 인라인 `exact ? pathname===href : pathname.startsWith(href)` 2곳(`AdminSidebar.tsx:36`, `AdminTopBar.tsx:37`) — 판정 로직 2종
- `DesktopSidebar.tsx`에 서브메뉴 배열 `STATS_SUB_ITEMS`(:23-27), `FINANCE_SUB_ITEMS`(:29-35), `SUB_NAV`(:37-40), `FINANCE_FLOW_HREFS`(:44) — 경로 문자열 목록이 `proxy.ts:25`(PROTECTED_PREFIXES), 이 파일, MobileBottomNav, `app/(main)/**` 라우트 폴더, docs 5곳에 분산
- `SidebarNavItem`(27줄): 사용처 2(Desktop, Admin), 추가 prop `ariaCurrent`·`hoverClassName` 기본값 존재
- `MobileHeader`(28줄) 사용처 1(`(main)/layout.tsx:47`). `FcmBridge` 1. `TradeNotificationBridge` 1.

### 테마(다크모드) 구현
- next-themes(`Providers.tsx:9`) 1곳에서 설정, class 전략. 토글 UI 2종: `ThemeToggle`(사이드바용 스위치, 사용처 1파일 `DesktopSidebar.tsx`) + `ThemeCards`(설정 화면 카드 3종, 사용처 SettingsPageContent로 추정/미확인)
- `useSyncExternalStore(() => () => {}, () => true, () => false)` 마운트 가드 동일 1줄이 `ThemeToggle.tsx:10`, `ThemeCards.tsx:36` 2곳(그 외 `ErrorDisplay.tsx:47`·`WeeklyMarketCalendar.tsx:196`은 다른 용도 변형)
- 테마 색 리터럴(#FBF6F1, #131416, #A35A43 등)이 `ThemeCards.tsx:7-32`에 하드코딩(CSS 토큰은 globals.css, 스타일 담당)
- `global-error.tsx:25` `<html className="dark">` 고정(테마 무시), `Providers` 밖이라 next-themes 미적용
- 다크모드 판정 JS 사용처: ThemeToggle 1곳만 (`resolvedTheme==='dark'`)

### 프라이버시 가림(금액 숨김)
- 구현 2종:
  (1) `shared/lib/hooks/use-amount-hidden.ts`(87줄) — 모듈 스토어 + `useSyncExternalStore` + localStorage 'kista-amount-hidden' + `storage` 이벤트 리스너 + 세션 한정 `revealed`. 소비 12파일(가계부 영역: FinanceHeader, HideAmountsToggle, asset-composition/overview/overview-parts/record-list/trend, finance-budget-progress/record-list/summary/trend). `maskAmount`·`maskIfHidden` 호출 파일 11
  (2) `widgets/revealable-value/RevealableValue.tsx`(31줄) — 로컬 `useState` 토글 눈 아이콘(전역 설정 미연동). 소비 4파일(AccountSummaryCard, admin-log-list/AccountTable, AssetOverview, FinanceSummary). `AssetOverview.tsx`, `FinanceSummary.tsx`는 **두 구현을 모두 사용**
- 두 구현이 서로 다른 "가림 표현": `maskAmount(display)`(format/index.ts) vs `hiddenDisplay='••••••••'` 기본값(RevealableValue.tsx:13). 가림 대상 범위는 가계부(1)와 계좌·관리자(2)로 나뉨
- 가림이 적용되지 않는 화면(대시보드·전략·통계의 금액)은 미확인(소비 파일 목록에 없음)

### 전역 상태 전수 (zustand/context/localStorage/sessionStorage)
- zustand: 0건(의존성 없음, grep 0)
- React Context: `MetaContext`(MetaProvider.tsx:15), `FinancePeriodContext`(FinancePeriodProvider.tsx:21), next-themes 내부, `QueryClientContext` 읽기 1곳(`shared/ui/SectionError.tsx:56` — `useContext(QueryClientContext)`)
- 모듈 스토어 + useSyncExternalStore: `use-amount-hidden`(소비 12), `PrivacyBaseChartInner.tsx:216` 로컬 store(1)
- localStorage 키 3개: `kista-amount-hidden`(use-amount-hidden:6), `reapply_last_requested_at`(ReapplyButton:9), `reapply_rejected_last_at`(RejectedReapplyButton:9). next-themes가 자체 키(`theme`) 사용(코드에 이름 없음)
- sessionStorage 키 1개: `kista:chunk-reload-at`(use-reload-on-chunk-error:5)
- history.state 키 1개: `__kistaSubview`(`shared/lib/subviewHistory.ts:9`), 사용처 2파일(`DcaStrategyForm.tsx`, `FormDialog.tsx`)
- 키 이름 규칙 3종: `kista-amount-hidden`(하이픈), `kista:chunk-reload-at`(콜론), `reapply_*`(스네이크). 접두사 통일 상수 파일 없음
- `useMediaQuery` 소비 2파일(`privacyChartParts.tsx:99`, `NextOrderCard.tsx:164`; 06 소관 분기점 상수와 연결)

### 테스트
앱 셸 영역 테스트 줄: layout 계열 105 + (admin)/layout.test 35 + RevealableValue 51 + ThemeCards(미집계) / 소스 약 700줄. `(main)/layout.tsx`(87줄, 인증·role 분기 포함)는 직접 테스트 0줄.
사본 주석 건수(이 절): 2 (`NAV_ITEMS` 4복사본은 주석 없이 배열 복사, `SidebarNavItem.tsx:13` "DesktopSidebar/AdminSidebar가 공유" 1건; `MetaProvider.tsx:25` strategyTypes label/description 폴백 1건)

## 2f. 관리자 화면

### 전체 줄 수 (비테스트 / 테스트)
| 영역 | 파일 | 줄 | 테스트 줄 |
|---|---|---|---|
| `app/(admin)/**` (layout 27 + 페이지·loading·error·FilterBar) | 19(테스트 제외 18) | 627 | 35 |
| `widgets/admin-*` 5개 (account-list 63, log-list 280, trade-list 469, user-list 296, privacy-trade-list 1593[model 176 포함]) | 40 | 2701 | 1108 |
| `features/admin/**` (settings 733, error-logs 186, approve-reject 104, change-role 83, withdraw-user 70, logs 54 …) | 20 | 1235 | 1029 |
| `entities/admin` 502 + `admin-settings` 91 + `privacy` 246 (+ `error-log` 43는 d절) | 22 | 839 | 578 (416+91+71) |
| `shared/ui/AdminTableSkeleton.tsx`(관리자 전용 프리미티브) | 1 | 20 | 0 |
| 합계 | 약 102 | 약 5,420 | 약 2,750 |
(app·entities·features·widgets·shared·components 비테스트 합 40,470줄(css 포함), 테스트 29,530줄 — 관리자 비테스트 약 5,420줄은 13.4%, 관리자 테스트 약 2,750줄은 9.3%)

### 화면(라우트)별 줄 수 (app + widgets + features + entities 합, 비테스트)
| 화면 | 구성 | 줄 |
|---|---|---|
| `/admin` 개요 | app page 30+loading 20, `AdminOverviewContent` 53 | 103 |
| `/admin/users` | page 34, `AdminUsersContent` 31, `AdminUsersTable` 121, `ChangeRoleButton` 83, `WithdrawUserButton` 70 | 339 |
| `/admin/pending` | page 22+loading 14, `AdminPendingList` 67, `AdminPendingPageContent` 21, `ApproveRejectButtons` 104 | 228 |
| `/admin/accounts` | page 78, `AdminAccountsFilterBar` 91, `AdminAccountsTable` 62, `admin-log-list/AccountTable` 55(이름은 log-list 폴더) | 286 |
| `/admin/trades` | page 51, `AdminTradesWorkbench` 172, `AdminTradeFilterPanel` 168, `AdminTradesTable` 113, `AdminTradesFeedback` 15 | 519 |
| `/admin/privacy-trades` | page 60+loading 26, widgets 1593, `entities/privacy` 246 | 1925 |
| `/admin/logs` | page 111+loading 28, `AuditLogsSection` 83, `AnomaliesSection` 72, `ErrorLogsSectionContent` 67, features `logs` 54 + `error-logs` 186 | 601 |
| `/admin/settings` | page 33+loading 18, features/admin/settings 733, entities/admin-settings 91 | 875 |
- `app/(admin)/admin/{accounts,trades,users}/loading.tsx` 3개는 1줄(`AdminTableSkeleton` 위임). `privacy-trades`·`logs`·`settings`·`pending`·`/admin` loading은 14~28줄 개별 구현(5개)
- `privacy-trades`(P 매매표)는 단일 화면에 1925줄로 관리자 영역의 약 36%. `AdminPrivacyBaseTable.tsx` 474줄, `PrivacyBaseChartInner.tsx` 405줄(차트=타 담당)

### 사용자 화면과 평행한 구조
관리자 전용으로 다시 만든 것과 사용자 쪽 대응(재사용 정도는 "같은 공용 프리미티브 사용 파일 수 admin/other"로 측정):
| 프리미티브 | 관리자 사용 파일 | 그 외 사용 파일 |
|---|---|---|
| `PaginationBar` | 7 | 6 |
| `PageSizeSelector` | 7 | 4 |
| `SortableHeadCell` | 4 | 5 |
| `TableHeadCell` / `TableDataCell` | 3 / 5 | 8 / 10 |
| `useTableSort` | 4(+AccountTable 포함) | 5 |
| `useClientPagination` | 3 | 2 |
| `SectionError` / `EmptyState` / `LoadingRow` | 9 / 9 / 6 | 28 / 22 / 19 |
| `UrlRangeFilterBar` | 7(app 3 + widgets 4) | 0 (다른 소비처 없음 — 관리자 전용 사용) |
| `AdminTableSkeleton` | 3(loading.tsx) | 0 |
| `useRangeFilterState` / `useSearchParam` | 0 | 3 / 2 |
| `FormDialog` / `useAppForm` | 2 / 2 | 7 / 12 |
→ 관리자 표는 공용 표 프리미티브를 이미 사용. 평행이 남은 곳:
1. **정렬 로직 블록**: `useTableSort<SortKey>('default')` + 'default는 헤더에 없는 키' 주석 + `localeCompare(…,'ko')` + null 맨 아래 처리가 관리자 표 4곳(`AdminUsersTable.tsx:37-47`, `AdminTradesTable.tsx:27-47 useTradeSort`, `AdminPrivacyBaseTable.tsx:101`, `admin-log-list/AccountTable.tsx:13-14`)과 사용자 표 3곳(`CryptoHoldingsCard.tsx:53-54`, `StrategyTypeComparison.tsx:32-33`, `OrderRows.tsx:55-56`)에 각자 `sorted = useMemo(... [...x].sort ...)`로 반복. `'default는 헤더에 없는 키'` 주석 문구 6곳 동일(+Trades 1) — 사본 주석 7건. (06 소관 "목록 표" 영역과 겹치므로 사실만 기록)
2. **페이지 슬라이스 훅 호출**: `useClientPagination` 5곳(관리자 3: `AdminTradesWorkbench:87`, `AdminPendingList:26`, `AdminUsersTable:48`; 사용자 2). 훅 주석(use-client-pagination.ts:5-7)이 "AssetRecordList/FinanceRecordList/BudgetManager/AdminUsersTable/AdminPendingList/AdminTradesWorkbench에서 동일하게 반복되던" 이라고 사본 목록을 나열 — `BudgetManager`(features/finance/manage-budgets/BudgetManager.tsx 존재)는 현재 이 훅을 호출하지 않음(grep 0건) — 주석이 낡음
3. **상태 pill/라벨 표**: `ADMIN_USER_STATUS_LABEL`, `USER_ROLE_LABEL`, `USER_STATUS_TONE`(entities/user) — 05 소관(코드값 라벨)
4. **관리자 필터**: `AdminAccountsFilterBar.tsx`(91), `AdminTradeFilterPanel.tsx`(168), `LogsFilterChips.tsx`(54) 3종이 각자 필터 UI. 사용자 쪽 `BenchmarkFilterFields`(benchmark-comparison)·`UrlRangeFilterBar`와 구조 유사 여부는 필드 단위 비교 미확인
5. **관리자 확정 다이얼로그**: `ApproveRejectButtons`(104)·`ChangeRoleButton`(83)·`WithdrawUserButton`(70) 3개가 각자 확인 다이얼로그 + mutation. `ConfirmDeleteDialog` 사용 1(관리자 쪽) vs 사용자 6, `useConfirmDialog` 관리자 0 vs 사용자 7 — 관리자 3개 컴포넌트는 두 공용 프리미티브 중 하나만 1곳 사용(06 소관 "확인 다이얼로그")
6. **레이아웃**: `AdminSidebar`/`AdminTopBar` ↔ `DesktopSidebar`/`MobileBottomNav`(e절): NAV 배열 복사, SidebarNavItem만 공유

### 관리자 전용 프리미티브
- `shared/ui/AdminTableSkeleton.tsx`(20줄): 사용처 3(loading.tsx)
- `shared/ui/Badge` tone="admin"(AdminSidebar, AdminTopBar, MainLayout:58 `bg-admin-bg text-admin-fg`)
- `shared/ui/UrlRangeFilterBar.tsx`(98줄): 사실상 관리자 전용(소비 app 3 + widgets 4 = 7파일, 비관리자 0). 위치는 `shared/ui`이나 쓰는 곳은 관리자만
- `entities/admin/hooks/useAdminErrorLogs.ts`·`features/admin/error-logs`(186줄)와 `entities/error-log`(43줄)·`widgets/admin-log-list/ErrorLogsSectionContent`(67줄): "오류 로그"가 3개 엔티티·위젯·피처에 분산(error-log는 클라이언트 오류 전송용, admin은 조회용)

### 구조 사실(단일 사용 등)
- `entities/admin/index.ts` 36줄 barrel, `useAdminQueries.ts` 208줄에 hook 12개(query 4 + mutation 8: `useUpdateAdminStrategyStatusMutation:51`, `useApproveUserMutation:176`, `useRejectUserMutation:180`(`useUserStatusTransitionMutation` 공통 헬퍼 경유 :166), `useChangeUserRoleMutation:184`, `useDeleteAdminUserMutation:198` …). 이 파일은 02 소관(entities/*/hooks)이라 줄 수만 표기
- `widgets/admin-account-list`(AdminAccountsTable 62줄 1개)·`admin-log-list/AccountTable`(55줄)가 계좌 목록 표를 각자 보유. 두 표가 같은 관리자 계좌 데이터를 다른 폴더에서 렌더(비교 미확인)
- 권한 가드: `/admin/**` 접근 제어는 `proxy.ts:191-193`뿐, `(admin)/layout.tsx`·페이지 단위 role 확인 코드 0(`admin/users/page.tsx:24`는 currentUserId 용도로 `getMe` 호출)
- 테스트 비율: 관리자 widgets 테스트 1108 / 소스 2701(0.41), features 1029/1235(0.83), entities 578/839(0.69)

## 2g. 시장·대시보드·통계 도메인 로직 (차트 그리기 제외)

### 파일·줄 수 (비테스트 / 테스트)
| 영역 | 파일 | 줄 | 테스트 |
|---|---|---|---|
| `entities/market` (api 42, hooks 60, model 70) | 7 | 174 | 264 |
| `entities/stats` (lib/housingBenchmarkChartFormatters 151, model/types 116, hooks 107+21, api 102, index 46, …) | 9 | 605 | 500 |
| `entities/backtest` | 4 | 82 | 76 |
| `widgets/dashboard` (MarketChartCardInner 279[차트], DashboardEmpty 82, marketChartCategories 64, Content 44, Overview 29, Markets 29, Card 26, Skeleton 24) | 8(+CLAUDE.md) | 577 | 292 |
| `widgets/crypto-market-indicators` (CryptoIndicatorCards 472, CryptoMarketSection 105, IndicatorLineChart 57, niceTicks 38) | 5 | 673 | 466 |
| `widgets/benchmark-comparison` (+model 299) | 18 | 1508 | 1085 |
| `widgets/stats-overview` (+lib 22) | 12 | 823 | 533 |
| `widgets/fear-greed-card` | 7 | 360 | 242 |
| `widgets/housing-quintile-trend` | 6 | 399 | 299 |
| `widgets/market-holiday-calendar` (WeeklyMarketCalendar 313) | 2 | 314 | 163 |
| `widgets/backtest` | 4 | 130 | 0 |
| 합계 | 82 | 약 5,640 | 약 3,920 |

### 위젯 소비처 (이 영역 위젯은 모두 단일 페이지에서만 사용)
- `@widgets/dashboard` ← `app/(main)/dashboard/{page,loading}.tsx` (페이지 1개)
- `crypto-market-indicators`, `fear-greed-card`, `market-holiday-calendar` ← `app/(main)/dashboard/page.tsx` 각 1파일
- `benchmark-comparison`, `housing-quintile-trend` ← `app/(main)/stats/benchmark/BenchmarkPageContent.tsx` 각 1파일
- `stats-overview` ← `app/(main)/stats/page.tsx` 1파일, `backtest` ← `app/(main)/stats/backtest/page.tsx` 1파일
- `entities/market` 소비 12파일, `entities/stats` 32파일, `entities/backtest` 3파일(자기 폴더 제외)

### 흐름 한 장 (비차트 부분)
```
dashboard/page.tsx(SSR) -> prefetch(monthlyHolidays 등, entities/market queryOptions) + HydrationBoundary
   -> DashboardContent(isAuthenticated 게이팅, 44줄) -> DashboardOverview 29 / DashboardMarkets 29 -> MarketChartCard 26 -> MarketChartCardInner 279(차트)
   -> FearGreedSection(useFearGreedQuery(days), sliceDays 로컬) / CryptoMarketSection(useCryptoMarketIndicatorsQuery) / WeeklyMarketCalendar(useMonthlyHolidaysQuery+useDailyTradesRangeQuery+useMarketSessionQuery)
stats/page.tsx -> StatsOverview(RangeKey state 1M/3M/6M/1Y/ALL, rangeToFrom 로컬) -> useStatsSummaryQuery/useEquityCurveQuery -> normalizeEquityCurve(lib 22줄)
stats/benchmark -> useBenchmarkFilters(139줄, 훅) + benchmarkPeriods(59) + benchmarkView(42) + useBenchmarkStrategyOptions(38) + useEtfBenchmarkOptions(21)
                   -> entities/stats(housingBenchmarkChartFormatters 151줄: 날짜·CAGR·툴팁 포매터)
```

### 평행 구현 (file:line 쌍)
1. **기간 프리셋 체계 3종**: `shared/lib/date-range.ts:5 RangePreset('ytd'|'7d'|'30d'|'90d'|'180d'|'all'|'custom', URL 파라미터, 관리자 화면)` / `widgets/benchmark-comparison/model/benchmarkPeriods.ts:1 Period('3M'|'1Y'|'5Y'|'ALL'|'CUSTOM', 개월 단위)` / `widgets/stats-overview/StatsOverview.tsx:18 RangeKey('1M'|'3M'|'6M'|'1Y'|'ALL', RANGE_DAYS 일수 30/90/180/365)` + `EquityCurveChart.tsx:25` 옵션 라벨 목록. 각자 레이블·변환 함수(`PRESET_DAYS` date-range:~43, `BENCHMARK_PERIODS` :4, `RANGE_DAYS` :20)를 보유. 상태 보관 방식도 3종(URL `useRangeFilterState`, `useState`, `useBenchmarkFilters` 내부 state)
2. **날짜 산술 3종**: `shared/lib/date-range.ts:26-37`(KST UTC 연산 kstDateMinusDays/kstWeekStartDate), `widgets/benchmark-comparison/model/benchmarkPeriods.ts:28-41 subtractMonths`(윤년 수동 계산), `widgets/stats-overview/StatsOverview.tsx:28-34 rangeToFrom`(UTC 연산), `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:22-33 pad/toDateStr/addDays`(로컬 Date 연산), `entities/trade/hooks/useDailyTradesRangeQuery.ts:25-27 pad/toDateStr`(위와 동일 본문), `widgets/admin-privacy-trade-list/model/privacyChartSeries.ts:46`(UTC 날짜 더하기), `entities/strategy/model/vr-rollover.ts:8`. → `pad`+`toDateStr` 동일 본문이 2파일(`WeeklyMarketCalendar.tsx:22-26` = `useDailyTradesRangeQuery.ts:25-29`), 날짜 연산이 로컬 Date·UTC 두 방식 혼재(05 소관 "날짜 계산"과 겹침 — 사실만 기록)
3. **`DAYS_OPTIONS = [365,180,90,30] as const` + `type Days` 동일 선언 2곳**: `CryptoIndicatorCards.tsx:21-22`, `FearGreedSection.tsx:9-10`(+`MAX_DAYS` :11)
4. **로컬 포매터**: `CryptoIndicatorCards.tsx:26-35,169,319,387`에 `signedPct/fmtPct/fmtFunding/fmtMultiple/fmtUtcDate/fmtKstDate/fmtKstTime/fmtCoinbasePct/fmtPlainPct/fmtHashrate` 10종 모듈 상수. `shared/lib/format/index.ts`(200줄, 06 소관)와 별개(이 중 `fmtSignedPercent`·`fmtKoDate`는 shared에서 import해 감싸는 형태)
5. **공개 엔드포인트 fetch 오류 처리 복제**: `entities/market/api/index.ts:9-14` `getMonthlyHolidaysPublic`의 `!ok → try json → throw ApiError`가 `shared/lib/api-client/index.ts:81-89 parseApiResponse` 본문과 동일(02 소관 파일이나 사본 위치 기록)
6. **퀸타일/벤치마크 설명 콘텐츠**: `widgets/benchmark-comparison/housingBenchmarkContent.ts`(67), `widgets/housing-quintile-trend/housingQuintileContent.ts`(138) — 한국어 해설 텍스트 데이터 파일. 소비처: 각 위젯 1~2파일

### 파생 계산·어댑터 (차트 외 로직) 중 05 소관 표시
- `entities/stats/lib/housingBenchmarkChartFormatters.ts` 151줄: `calculateQuintileCagr:76`, `calculateSeriesCagr:100`, `formatCagr:124` → **05 소관**(CAGR). 나머지 포매터 8개(`formatHousingBenchmarkMonth/AxisMonth/Date/AxisDate/AxisWeek:39-63`, `formatHousingIndexValue:131`, `…TooltipValue:140`, `…SeriesLabel:14`, `…ChartNotice:8`)는 소비 파일 1~3개씩(`HousingBenchmarkChart`, `HousingPriceIndexChart`, `EtfPriceChart`, `HousingBenchmarkQuintileTrendChart`): 위치는 entities지만 사용은 위젯 2개 폴더(`benchmark-comparison`, `housing-quintile-trend`)뿐. `housingBenchmarkChartNotice`가 "서버 계산값입니다"를 문구로만 안내(:9-11)
- `widgets/stats-overview/lib/normalizeEquityCurve.ts`(22): 자산·원금을 첫 양수 자산=100으로 정규화 — 파생 계산, 소비 1파일(EquityCurveChart 추정, 미확인) → 05 후보와 겹침(집계 로직이므로 05 소관 가능성, 미확인)
- `widgets/fear-greed-card/fearGreedZones.ts`(19): 0~100 → 구간 라벨 — 서버 판정 사본 여부 미확인. `FearGreedSection.tsx:15 sliceDays`(로컬 슬라이스, 서버가 days를 받는 API(`getFearGreedClient(days)`)에 `MAX_DAYS`로 요청 후 클라이언트 슬라이스)
- `widgets/crypto-market-indicators/niceTicks.ts`(38): 축 눈금 계산(차트 보조), 소비 1~2파일
- `entities/stats/hooks/useStatsCurrency.ts`(21): 통화 선택 훅 + `resolveStatsCurrency` — 소비처: stats·benchmark 2화면
- 구현이 하나뿐인 추상화: `useEtfBenchmarkOptions`(21줄)·`useBenchmarkStrategyOptions`(38줄)·`resolveBenchmarkLabel`/`buildFallbackBenchmark`/`resolveInvestmentLabel`(benchmarkView.ts 42줄)은 각 호출처 1파일(`useBenchmarkFilters`·`BenchmarkResult` 등; 정확한 호출처 수 미집계)
- 사본 주석: `entities/stats/lib/housingRegionDefaults.ts:1` "서버 기본값(…regionCode 기본값)과 동일" 1건(파일 자체 3줄, 상수 `DEFAULT_HOUSING_REGION_CODE`), `entities/market/hooks/useMarketQueries.ts:49,59` "서버 max-age(10분)와 같은 값", "kista-trading 서버 캐시 TTL과 같다" 2건(staleTime 사본, 02 소관과 겹침), `widgets/stats-overview/StatsOverview.tsx:48` "서버 prefetch key와 일치해야" 1건(+ `app/(main)/stats/page.tsx:15` 짝) → 이 절 사본 주석 4건(+짝 1)
- 테스트 비율: 영역 테스트 3,920줄 / 소스 5,640줄(0.70). `widgets/backtest`(130줄), `widgets/dashboard/DashboardContent` 외 일부는 테스트 0

## 2h. shared 잡동사니 (미덮임 `shared/lib/*`·`shared/model`·`shared/providers`·소비처 적은 `shared/ui`)

소비처 = 그 파일/심볼을 import하는 다른 비테스트 파일 수(`grep -rl`, 자기 파일 제외). 테스트 줄은 같은 이름의 `.test.*`.

### shared/lib 직속·폴더
| 파일 | 줄 | 소비처 | 테스트 | 비고 |
|---|---|---|---|---|
| `shared/lib/env.ts` | 19 | 14 (+`getApiBaseUrlOrNull` 5파일) | env.test | `getApiBaseUrl`·`getApiBaseUrlOrNull`·`getTradingApiBaseUrl` 3함수, proxy·api-client·route 등 |
| `shared/lib/firebase.ts` | 24 | **2** (`entities/fcm/api/index.ts`, `FcmForegroundListener.tsx`) | 0 | config 6키는 SW route와 이중 정의(2c절) |
| `shared/lib/metadata.ts` | 4 | 3 (app/layout, rejected/layout, finance/(dashboard)/layout) | 0 | 상수 `TITLE_TEMPLATE` 1개 |
| `shared/lib/query-string.ts` | 10 | 7 (entities api 6 + queryOptions 1) | query-string.test | `buildQueryString` 1함수 |
| `shared/lib/subviewHistory.ts` | 57 | **2** (`DcaStrategyForm.tsx`, `shared/ui/FormDialog.tsx`) | 있음 | `ponytail:` 주석 :8 |
| `shared/lib/utils.ts` | 36 | `cn` 96, `toSelectValue` **3**, `toNum` 8, `groupConsecutiveBy` **3**, `isSectionTabActive` 4 | utils.test | 5함수 잡동사니: `cn` 외 4함수는 소비처 3~8 |
| `shared/model/placed-order.ts` | 25 | **3** (entities/order api·types, entities/strategy api) | 61줄 | `normalizePlacedOrderBase` + `PlacedOrder` 타입. 주석(:11-13)이 "entities 간 cross-import 금지라 shared/model에 둔다" |
| `shared/providers/{Providers 14, QueryProvider 11}` | 25 | Providers 1(app/layout), QueryProvider 1(Providers) | 0 | 체인 2단, 각 사용처 1 |
| `shared/lib/chart/{axisTick 2, tooltip 9}` | 11 | 11파일(차트 담당 영역) | 0 | (타 담당) |
| `shared/lib/format/pnl.ts` | 6 | index.ts re-export 1줄(:200) | (format 테스트에 포함) | `pnlTextClass` 1함수, 파일 분리 이유 미확인 |

### shared/lib/hooks (06 소관 제외, 소비처 적은 것)
| 파일 | 줄 | 소비처 | 비고 |
|---|---|---|---|
| `use-decimal-amount-text.ts` | 50 | **1** (`features/strategy/create-strategy/sections/SeedAmountInput.tsx`) | shared지만 단일 소비(04 전략 폼과 인접) |
| `use-scrolled-to-end.ts` | 33 | **1** (`widgets/strategy-detail/NextOrderCard.tsx`) | ResizeObserver+MutationObserver 포함 33줄 |
| `use-media-query.ts` | 18 | 2 (`privacyChartParts.tsx:99`, `NextOrderCard.tsx:164`) | 분기점 값 2개 리터럴(1023px, 1280px) 각 호출부 |
| `use-reload-on-chunk-error.ts` | 31 | 2 (d절) | |
| `use-amount-hidden.ts` | 87 | 11 (e절) | |
| `use-search-param.ts` | 19 | 2 (`AccountsGrid`, `AllStrategiesList`) | 06 URL 상태 hook 소관 가능(미확정) |
| `use-range-filter-state.ts` | 25 | 3 | 06 |
| `use-client-pagination.ts` 24, `use-confirm-dialog.ts` 18 (소비 8), `use-table-sort.ts` 23 (소비 11) | | | 06 |

### shared/ui 중 소비처 1~3곳 (06이 프리미티브로 분류했을 수 있으나 소비처 수 기록)
| 파일 | 줄 | 소비처 |
|---|---|---|
| `SuggestionListEditor.tsx` | 110 | **1** (`features/finance/manage-strategy-suggestions/StrategySuggestionManager.tsx`) |
| `YearSelect.tsx` | 66 | **1** (`widgets/finance-summary/FinanceSummaryParts.tsx`) |
| `CurrencyToggle.tsx` | 24 | 2 (benchmark, stats-overview) |
| `EquityLineChart.tsx` | 101 | 2 (backtest, stats-overview) — 차트(타 담당) |
| `stepper/Stepper.tsx` | 46 | **1** (`CreateAccountStepper.tsx`; 폴더 `stepper` 2파일 47줄) |
| `AdminTableSkeleton.tsx` | 20 | 3 (관리자 loading.tsx, 2f절) |
| `MonthClosedNotice.tsx` | 21 | 3 |
| `dateGroup.ts` (2줄), `iconButtonStyles.ts` (14), `range-filter/RangeFilterControls.tsx` (68) | | 3 |
| `selection-card/*`, `form/*`, `UrlRangeFilterBar.tsx`(관리자 전용 사용, 2f절) | | |

### 소비처 0~1곳 정리
- 0곳: 이 절에서 조사한 파일 중 없음(knip은 직접 실행하지 않음)
- 1곳: `shared/lib/firebase.ts`는 2곳. 1곳: `use-decimal-amount-text`, `use-scrolled-to-end`, `SuggestionListEditor`, `YearSelect`, `Stepper`, `Providers`/`QueryProvider`(각각 1), `pnl.ts`(re-export 경유 1), `sseAuthErrorResponse`(1파일), `PullToRefresh` 2, `useReloadOnChunkError` 2
- 2~3곳: `subviewHistory`(2), `placed-order`(3), `metadata`(3), `toSelectValue`(3), `groupConsecutiveBy`(3), `use-media-query`(2), `use-search-param`(2)
- 위치 불일치(shared 소속이나 도메인 한정): `use-decimal-amount-text`(전략 폼), `use-scrolled-to-end`(전략 상세 1카드), `subviewHistory`(전략 폼+FormDialog), `placed-order`(order·strategy 엔티티 2개 공유용), `groupConsecutiveBy`(전략/사이클 이력 3곳)
- `ponytail:` 마커(의도적 단순화 주석): 전 레포 5건 — `subviewHistory.ts:8`, `useAppForm.ts:9`, `PrivacyBaseChart.tsx:54`, `PrivacyBaseChartInner.tsx:255`, `DcaExecutionHistory.tsx:55`


## 3. 종합 (미덮임 영역별, 숫자만)

줄 수는 비테스트 소스, 테스트는 별도. "평행"은 2~절의 평행 구현·복제 블록 건수, "단일 사용"은 호출처 1곳(또는 체인 각 단 1곳) 추상화 건수, "사본 주석"은 "~와 동일/동기화/서버 값과 같다"류 주석 건수(해당 절에서 센 값).

| 영역 | 줄 | 파일 | 테스트 줄 | 평행 구조 | 단일 사용 추상화 | 사본 주석 | 비고 |
|---|---|---|---|---|---|---|---|
| a 인증·토큰 | 1,384 | 약 41 | 919 | 6 (쿠키 옵션 6곳·직렬화 3종, status→경로 표 3곳, `/api/auth/me` 호출 3곳, Reapply 2종, pending/rejected 화면 쌍, 401 본문 3종) | 2 (`safeRedirectPath` 소비 2파일, `hasValidToken` 2파일) | 5 | 쿠키 이름은 상수 1곳, JWT 디코드 1곳. 수명 상수 604800 리터럴 2곳, status 쿠키 수명 7d(callback) vs 1h(proxy) |
| b SSE | 187 | 5 | 252(+mock 42) | 2 (Route 2개 undici 블록 복제, 구독 2종·재연결 방식 2종) | 3 (Provider→Bridge→layout 체인) | 2 | 가시성·백오프 코드 0 |
| c 알림·PWA | 약 800 | 약 19 | 약 300(미집계 포함) | 3 (firebase config 2곳, 토큰 등록 경로 3곳, 권한 가드 4곳) | 5 (AutoRegister·Listener·Bridge·useFcmToken·`enabled` prop) | 1 | 설치 프롬프트·오프라인 처리 0건, SW는 FCM 전용 27줄 |
| d 오류·관측 | 365 | 약 14 | 70 | 2 (error.tsx 3벌 동일, global-error vs ErrorDisplay 500 문구·마크업) | 1 (`truncate`) | 2 | instrumentation 없음, window.onerror 없음, 로깅 유틸 없음 |
| e 앱 셸·Provider·테마·프라이버시·전역상태 | 약 900 | 약 22 | 약 250 | 5 (NAV_ITEMS 2쌍, main/admin layout 조립, 프라이버시 2종 구현, active 판정 2종) | 4 (MobileHeader, Providers→QueryProvider, FcmBridge 체인, ThemeToggle 1파일) | 2 | zustand 0, localStorage 키 3, sessionStorage 키 1, Context 2종+, `(main)/layout.tsx` 테스트 0 |
| f 관리자 | 약 5,420 | 약 102 | 약 2,750 | 6 (정렬 블록 4+3, 페이지 슬라이스, 필터 3종, 확인 다이얼로그 3종, 계좌 표 2벌, 레이아웃 NAV) | 2 (`UrlRangeFilterBar` 관리자만 사용, `admin-account-list` 파일 1개) | 8 | 공용 프리미티브는 이미 사용 중(PaginationBar 7 등). 최대 덩어리는 P 매매표 1,925줄 |
| g 시장·대시보드·통계 | 약 5,640 | 82 | 약 3,920 | 6 (기간 프리셋 3체계, 날짜 산술 다수, `DAYS_OPTIONS` 2곳, 로컬 포매터 10종, fetch 오류 복제, 해설 데이터 2파일) | 약 11 (위젯 8개 모두 단일 페이지 소비, 훅 3) | 4 | CAGR·정규화 등은 05 소관. 차트 제외 로직 분리 불가분(차트 파일 내 로직)은 미집계 |
| h shared 잡동사니 | 약 690(조사 파일 합) | 약 22 | 약 450 | 0 (다만 `NAV`·`useSyncExternalStore` mounted 패턴은 e절) | 8 (소비처 1: use-decimal-amount-text, use-scrolled-to-end, SuggestionListEditor, YearSelect, Stepper, Providers, QueryProvider, pnl.ts) | 0 | 소비처 2~3: subviewHistory 2, placed-order 3, metadata 3, toSelectValue 3, groupConsecutiveBy 3, firebase 2 |

특이점 없음으로 적을 영역:
- h `shared/lib/env.ts`, `query-string.ts`, `chart/*`(소비처 14·7·11, 평행 없음)
- c `PullToRefresh`(한 구현 102줄, 평행 없음, 사용처 2)
- e `ThemeProvider` 설정(1곳, 14줄)
- d `/api/health`(5줄, 소비는 Docker/Caddy)

이 보고서가 다루지 못한 것(미확인 목록):
- 관리자 필터 3종과 사용자 필터(`BenchmarkFilterFields`)의 필드 단위 동일성
- `useMeta` 헬퍼 5종의 개별 소비처 수, `useMeta` 60파일 중 `labelOf` 소비 비중(05 코드값 라벨과 겹침)
- 설정 화면 FCM·텔레그램 UI 테스트 줄 수(폴더별 합 미집계)
- 인증 라우트(`app/api/**` 테스트 4파일 208줄)의 개별 줄 수
- `widgets/dashboard`·`widgets/crypto-market-indicators` 내부 차트 vs 비차트 줄 분리(차트 담당과 경계 불명)
- `shared/ui` 중 06이 어디까지 덮는지(SegmentedTabs·SectionTabBar·MobileSortControl 등)
