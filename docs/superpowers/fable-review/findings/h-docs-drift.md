# h. 문서 드리프트·중복·끝난 작업 측정 (kista-ui)

측정일 2026-11-11, 읽기 전용. 판단 없음. 수치는 wc/grep 명령 결과. 선행: f-retained-decisions.md(결정 목록)는 재조사하지 않음.
참고: 사용자 지시는 '디렉토리별 CLAUDE.md 22개'였고 find 결과는 루트 포함 23개(루트 1 + 중첩 22)다.

## 1. 문서 지도

### 1-1. 로드 방식 요약
- 매 세션 자동: 루트 CLAUDE.md + @import 3개(commands, architecture, constraints) + (루트 밖) 전역 ~/.claude/CLAUDE.md 51줄/16,577B + 메모리 MEMORY.md 10줄/1,532B
- 디렉토리 진입 시 자동: 각 CLAUDE.md와 그 @import (그 디렉토리 파일을 Read/Edit할 때). 상위 디렉토리 CLAUDE.md는 계속 로드됨(루트 포함).
- 수동 Read(자동 아님): strategy.md, finance-widgets.md, deployment.md, README.md, docs/superpowers/*, .claude/*, scripts/*/README.md
- 메모리: MEMORY.md만 인덱스로 자동, 개별 메모리 파일 8개는 필요 시 Read.

### 1-2. 파일별 줄/바이트/로드

| 파일 | 줄 | 바이트 | 로드 방식 |
|---|---|---|---|
| CLAUDE.md |       37 |     3440 | 매 세션 자동 |
| docs/agents/commands.md |       30 |     2832 | 매 세션 자동 (루트 @import) |
| docs/agents/architecture.md |       35 |     2839 | 매 세션 자동 (루트 @import) |
| docs/agents/constraints.md |       30 |     1832 | 매 세션 자동 (루트 @import) |
| docs/agents/app.md |       60 |    13426 | app/ 진입 시 (app/CLAUDE.md @import) |
| docs/agents/entities.md |       72 |    10083 | entities/ 진입 시 (@import) |
| docs/agents/features.md |       33 |     3785 | features/ 진입 시 (@import) |
| docs/agents/widgets.md |       64 |     7277 | widgets/ 진입 시 (@import) |
| docs/agents/shared.md |      112 |    16708 | shared/ 진입 시 (@import) |
| docs/agents/copy.md |       16 |     6870 | app·entities·features·widgets 진입 시 (@import 4곳) |
| docs/agents/a11y.md |       13 |     3214 | features·widgets·shared 진입 시 (@import 3곳) |
| docs/agents/react-query.md |        6 |     3535 | entities·features·widgets 진입 시 (@import 3곳) |
| docs/agents/finance.md |       20 |    10783 | entities/finance, features/finance, features/asset CLAUDE.md @import 3곳 |
| docs/agents/finance-group-share.md |        3 |     3750 | finance 하위 슬라이스 5곳 @import |
| docs/agents/strategy.md |       42 |    19169 | 수동 Read (루트 CLAUDE.md에서 안내) |
| docs/agents/finance-widgets.md |       10 |     6676 | 수동 Read |
| docs/agents/deployment.md |       34 |     3354 | 수동 Read (특정 파일 변경 시 필수 Read 지시) |
| README.md |      111 |     5108 | 수동 (git 호스팅 첫 화면용) |
| app/CLAUDE.md |        6 |      173 | 해당 디렉토리 진입 시 자동 |
| entities/CLAUDE.md |        7 |      228 | 해당 디렉토리 진입 시 자동 |
| entities/finance/CLAUDE.md |        3 |       74 | 해당 디렉토리 진입 시 자동 |
| features/CLAUDE.md |        8 |      225 | 해당 디렉토리 진입 시 자동 |
| features/asset/CLAUDE.md |        3 |       63 | 해당 디렉토리 진입 시 자동 |
| features/asset/save-asset/CLAUDE.md |        5 |     2133 | 해당 디렉토리 진입 시 자동 |
| features/finance/CLAUDE.md |        3 |       82 | 해당 디렉토리 진입 시 자동 |
| features/finance/manage-accounts/CLAUDE.md |        5 |     1429 | 해당 디렉토리 진입 시 자동 |
| features/finance/manage-budgets/CLAUDE.md |        5 |     1411 | 해당 디렉토리 진입 시 자동 |
| features/finance/manage-categories/CLAUDE.md |        6 |     2036 | 해당 디렉토리 진입 시 자동 |
| features/finance/manage-group/CLAUDE.md |        3 |     2022 | 해당 디렉토리 진입 시 자동 |
| features/finance/manage-strategy-suggestions/CLAUDE.md |        3 |      791 | 해당 디렉토리 진입 시 자동 |
| features/finance/save-transaction/CLAUDE.md |        5 |     1485 | 해당 디렉토리 진입 시 자동 |
| shared/CLAUDE.md |        6 |      172 | 해당 디렉토리 진입 시 자동 |
| widgets/CLAUDE.md |        8 |      223 | 해당 디렉토리 진입 시 자동 |
| widgets/accounts-grid/CLAUDE.md |        3 |      516 | 해당 디렉토리 진입 시 자동 |
| widgets/all-strategies/CLAUDE.md |        3 |      666 | 해당 디렉토리 진입 시 자동 |
| widgets/benchmark-comparison/CLAUDE.md |        5 |     1869 | 해당 디렉토리 진입 시 자동 |
| widgets/cycle-history/CLAUDE.md |        3 |      174 | 해당 디렉토리 진입 시 자동 |
| widgets/dashboard/CLAUDE.md |        3 |     2260 | 해당 디렉토리 진입 시 자동 |
| widgets/housing-quintile-trend/CLAUDE.md |        3 |      667 | 해당 디렉토리 진입 시 자동 |
| widgets/stats-overview/CLAUDE.md |        4 |     1505 | 해당 디렉토리 진입 시 자동 |

### 1-3. @import 그래프 (CLAUDE.md -> docs/agents)

```
루트 CLAUDE.md -> commands, architecture, constraints
app/CLAUDE.md -> app, copy
entities/CLAUDE.md -> entities, copy, react-query
entities/finance/CLAUDE.md -> finance
features/CLAUDE.md -> features, copy, a11y, react-query
features/asset/CLAUDE.md -> finance
features/asset/save-asset/CLAUDE.md -> finance-group-share (+ 본문 4줄)
features/finance/CLAUDE.md -> finance
features/finance/{manage-accounts,manage-budgets,manage-categories,save-transaction}/CLAUDE.md -> finance-group-share (+ 본문)
features/finance/{manage-group,manage-strategy-suggestions}/CLAUDE.md -> import 없음 (본문만)
shared/CLAUDE.md -> shared, a11y
widgets/CLAUDE.md -> widgets, copy, a11y, react-query
widgets/{accounts-grid,all-strategies,benchmark-comparison,cycle-history,dashboard,housing-quintile-trend,stats-overview}/CLAUDE.md -> import 없음 (본문만)
```
docs/agents 내부끼리 @import 없음(grep 확인 필요 시 아래 7절). 루트에서 strategy/finance-widgets/deployment는 `@` 없이 "필요시 Read"로 서술.

### 1-4. 시나리오별 실제 로드량 (루트 베이스 132줄/10,943B 포함, 전역 CLAUDE.md·MEMORY.md 제외)

Claude Code가 같은 파일을 여러 CLAUDE.md에서 import할 때 중복 제거하는지는 확인 못 함. 아래 시나리오는 파일이 겹치지 않아 중복 포함/제거 수치가 같다. 전략 파일 수정 시 strategy.md(42줄/19,169B)는 수동 Read라 불포함이며, 포함하면 +42줄/+19,169B.

| 시나리오 | 로드 파일 | 줄 | 바이트 |
|---|---|---|---|
| S0 아무 파일도 안 건드림 | 루트+commands+architecture+constraints | 132 | 10,943 |
| S1 widgets 일반 파일 수정 | S0 + widgets/CLAUDE + widgets.md + copy + a11y + react-query | 239 | 32,062 |
| S1b widgets/dashboard 파일 | S1 + dashboard/CLAUDE.md | 242 | 34,322 |
| S2 features/finance/save-transaction | S0 + features(CLAUDE,features,copy,a11y,react-query) + features/finance/CLAUDE + finance.md + save-transaction/CLAUDE + finance-group-share | 239 | 44,672 |
| S3 app 라우트 추가 | S0 + app/CLAUDE + app.md + copy | 214 | 31,412 |
| S4 entities/finance 수정 | S0 + entities(CLAUDE,entities,copy,react-query) + entities/finance/CLAUDE + finance.md | 256 | 42,516 |
| S5 shared 수정 | S0 + shared/CLAUDE + shared.md + a11y | 263 | 31,037 |

관찰: 바이트가 줄 수보다 크게 부푸는 파일은 긴 단락 파일(strategy.md 19,169B/42줄, shared.md 16,708B/112줄, app.md 13,426B/60줄, finance.md 10,783B/20줄). 한글 3바이트/자 기준 대략 S1 약 1만 자, S2 약 1.5만 자(토큰 환산은 측정하지 않음).

## 2. 코드와 어긋난 내용

### 2-1. 대조 방법과 수치

- 대상 문서: 루트·중첩 CLAUDE.md 23개, docs/agents/*.md 16개, README.md, scripts/*/README.md 2개. 백틱 토큰 2,125개를 추출해 분류했다.
- 자동 대조 1,184개: 식별자(함수·컴포넌트·타입) 664 / 경로·라우트 465 / 환경변수·상수 41 / npm 스크립트 14. 식별자는 소스 트리(docs 제외)에서 `\b이름\b` 존재를 확인, 경로는 파일시스템 glob + 라우트는 app 디렉토리 세그먼트 대조, npm 스크립트는 package.json scripts 대조.
- 자동 미존재 판정 170개(식별자 20 + 경로 147 + 환경 3 중 일부)를 수작업 분류한 결과: 진짜 어긋남은 1건(`fmtSignedPct`). 나머지는 오탐이다 — 슬라이스 상대 경로(`finance/manage-accounts` 등), 라우트 슬러그, kista-api/kista-infra 레포 내 존재 항목(`JwtAuthFilter`·`SecurityConfig`·`TtlResultCache`·`TradingPreviewService`·`secrets/kista-api.env.gpg`·`scripts/dev-seed/seed.sh` — 모두 형제 레포에서 확인), 플레이스홀더(`useXxxQuery`), 라이브러리 식별자(`shouldDehydrateQuery`·`isLoadingError` — node_modules에서 확인), "제거됐다"고 서술한 항목(`showIndicator`·`amountUsd`), 부정 예시(`ModeButton`·`asChild`·`finance/delete-transaction`).
- 동작 설명 수작업 대조: 약 45건(proxy.ts 상수, staleTime 표 24행, FSD 위젯 간 import 28건, deployment 환경변수·Dockerfile·workflow, 레이어 CLAUDE.md 본문 등). 아래 표가 그 결과다.
- 어긋난 항목 총 10건(코드 대비 문서 7 + 도구 설정 문서 3). 이름 불일치 1, 위치 불일치 1, 동작 서술 불일치 5, 구조/템플릿 불일치 3. 대조하지 못한 것: strategy.md 42줄·finance.md 의 긴 단락(수백 자짜리 한 줄) 내부의 세부 동작 서술 전부는 일부만 표본 확인했고 전수 확인하지 못했다.

### 2-2. 어긋난 항목 표

| # | 문서 file:line | 문서 주장 | 실제 상태 |
|---|---|---|---|
| D1 | docs/agents/copy.md:14 | `fmtSignedPct`류 포맷터 | 이름 변경됨. 실제는 `fmtSignedPercent` (shared/lib/format/index.ts:35). `fmtSignedPct`는 소스 전체에 0건 |
| D2 | docs/agents/widgets.md:61 | `admin-user-list`: 이상감지 카드는 `AdminAnomalies {...}` | 위치 불일치. `AnomaliesSection`·`AdminAnomalies` 사용처는 `widgets/admin-log-list`, `app/(admin)/admin/logs/page.tsx`. admin-user-list에는 없음 |
| D3 | docs/agents/app.md:39 | (main)·(admin) 레이아웃 모두 `export const dynamic = 'force-dynamic'` 명시(레이어 서술) | `(admin)/layout.tsx:8`만 있다. `(main)/layout.tsx`에는 `dynamic` export 없음(`cookies()`를 직접 호출해 동적 렌더). 문서 문장은 "회귀 사례는 admin"이라 모호하지만 f 목록 A-27은 둘 다로 정리 |
| D4 | docs/agents/app.md:32 | SSE: `new Agent(...)` + fetch에 `// @ts-ignore` + `dispatcher: sseAgent` | app/api/trades/stream/route.ts:20-27는 `undiciFetch`(undici의 fetch)로 호출하고 `@ts-ignore` 없음. 주석에 "전역 fetch는 dispatcher 미지원 TypeError"라 적힘 |
| D5 | widgets/dashboard/CLAUDE.md:3 | `isAuthenticated = !!token && !isJwtExpired(token)` | app/(main)/dashboard/page.tsx:23은 `hasValidToken(token)` (`isJwtExpired`는 shared/lib/auth/jwt 내부 함수) |
| D6 | docs/agents/entities.md:17-26 | 슬라이스 내부 구조 = api/index.ts, model/types.ts, hooks/, providers/, index.ts | 실제 entities/account 등은 `model/queryKeys.ts`·`queryOptions.ts`·`invalidate.ts`·`ui/`도 갖고 있고, 같은 문서 :34·:39가 그 파일들을 SSOT로 언급. 구조 블록이 일부만 담음 |
| D7 | README.md:(로컬 개발 표) "lint 0 errors 유지" | lint 0 errors | package.json:9 `eslint --max-warnings 0`이라 warning도 실패. commands.md는 정확히 적음. README만 불완전 |
| D8 | .claude/agents/fsd-boundary-checker.md (검사 1) | `grep "from '@features/" widgets/`를 "widgets에서 features import (상향 금지)"로 위반 판정 | FSD는 widgets -> features가 허용 방향(architecture.md:20). widgets 18개 파일이 정상적으로 @features를 import하므로 이 에이전트는 정상 코드를 전부 위반으로 보고함 |
| D9 | .claude/skills/dto-sync-check/SKILL.md (strategy 특이사항) | `lib/CLAUDE.md` 기준, TradingCycleResponse 필드 `id, accountId, type, status, ticker, cycleSeedType, initialDeposit`, `multiple` 제거(커밋 e63cdfb2) | `lib/CLAUDE.md` 없음(lib/에는 utils.ts만). 필드 목록은 divisionCount·vr·rules 등이 빠진 구버전. user-invocable: false |
| D10 | .claude/skills/fsd-scaffold/SKILL.md (entities 템플릿) | `['{slice}s']` 리터럴 queryKey, `hooks/index.ts`에 query 훅, `apiFetch('/..', {}, token)` | 규범은 `model/queryKeys.ts` factory SSOT + `model/queryOptions.ts`(entities.md:34,39). 템플릿대로 생성하면 문서 규범 위반 구조가 나옴 |

### 2-3. 메모리·외부 참조 어긋남

| # | 위치 | 주장 | 실제 |
|---|---|---|---|
| M1 | memory/project_done_do_not_redo.md (가계부 탭 항목) | 가계부 탭 내용은 `docs/agents/entities.md`·`widgets.md` | 가계부 서술은 현재 finance.md·finance-widgets.md로 분리돼 있음 (entities.md는 위임 링크만) |
| M2 | docs/agents/deployment.md:14 | SSOT는 kista-infra `secrets/kista-api.env.gpg` | 형제 레포에서 파일 존재 확인(../kista-infra/secrets/kista-api.env.gpg). 어긋남 아님, 참고로 기록 |

### 2-4. 어긋나지 않음을 확인한 대표 항목(표본)

proxy.ts의 `PROTECTED_PREFIXES`·`ADMIN_PREFIXES`·maxAge 3600, staleTime 표 전 행(accounts 30s·me/order/stats 60s·이력 5분·holiday 24h·housing regions 1h·prices 0), createQueryClient 기본값, NEXT_PUBLIC_* 9개(.env.example·.env.production.public 둘 다 9), Dockerfile node:22, `getMetaBundle` revalidate 3600, `deploymentId`, `useReloadOnChunkError`, `firebase-messaging-sw.js` route, `unstable_retry ?? reset`, Toaster 루트 1개, `app/api/auth/status-stream`, FCM 파일 3개, widgets 화이트리스트 12개 슬라이스 실재 및 실제 cross-widget import가 전부 화이트리스트 안(28건 중 비화이트리스트 대상은 `dashboard -> dashboard` 자기 자신 4건뿐), 3개 npm 스크립트 이름 14/14, `showIndicator` 0건(제거 서술과 일치), eslint `no-noninteractive-tabindex` region 허용.

## 3. 중복 (같은 규칙·사실이 둘 이상에 적힌 것)

바이트는 해당 줄만 `wc -c`로 측정(한글 3바이트/자). "중복 줄"은 한쪽을 정본으로 봤을 때 나머지 쪽이 차지하는 줄 수다(판단 아님, 측정만).

| # | 묶음 | 위치 (file:line) | 중복 줄 / 바이트 | 비고 |
|---|---|---|---|---|
| R1 | FSD 단방향·동일 계층 cross-import 금지 | architecture.md:20, README.md:69, entities.md:3·15, features.md:14, widgets.md:14, shared.md:3, fsd-boundary-checker.md:7, fsd-scaffold SKILL:85, ui-audit SKILL:29 | 8줄 | 각 레이어 문서는 자기 레이어 규칙이라 일부는 레이어별 변형. 에이전트·스킬 사본(D8 오류 포함)은 문서와 독립적으로 유지됨 |
| R2 | "필수 Read" 포인터 블록(finance.md·strategy.md 안내 + 관련 키워드 나열) | entities.md:6-7(750B), features.md:5-6(714B), widgets.md:5-6(574B), CLAUDE.md:28-33(루트 "필요시 Read" 절) | 6줄 + 루트 6줄 / 약 2,040B + 루트 | 3개 파일의 두 줄씩이 같은 형식. finance.md는 루트에선 "자동 로드 아님"인데 entities/finance·features/finance·features/asset CLAUDE.md가 @import로 자동 로드함(7절 SSOT 불명확 참조) |
| R3 | mutation 훅 onError toast, 호출부 덮어쓰기 금지 | entities.md:35-36(504B), copy.md:15(577B), f-retained D-15 | 3줄 / 약 1,080B | entities.md:35와 :36은 같은 문서 안에서도 mutate onSuccess 패턴을 두 번 서술 |
| R4 | 비회원 `/dashboard`·isAuthenticated 게이팅·401 로그아웃 루프 | architecture.md:15(593B), widgets/dashboard/CLAUDE.md:3(2,239B), app.md:28(935B, requireAuth 401 루프), shared.md:8(clientFetch 401) | 약 3줄 / 3,700B | 같은 위험(401 -> 로그아웃 -> 리로드 루프)을 4곳이 각자 서술 |
| R5 | 선택 카드 체크 배지(showIndicator) 제거 | shared.md:93, shared.md:106 (같은 파일 안) | 1줄 / 약 360B | 같은 문장이 같은 파일 93·106에 두 번(106은 "prop 자체가 없음"까지 추가). 코드에는 `showIndicator` 0건 |
| R6 | `ICON_LINK_GHOST_CLASS`·IconButton 44px | shared.md:89(428B), widgets.md:54(235B) | 1줄 / 235B | widgets.md가 shared.md 링크를 걸고도 본문 재서술 |
| R7 | 인라인 style 금지·예외 | constraints.md:21-23, widgets.md:63 | 1줄 | glass-card·pull-to-refresh 예외를 widgets.md가 한 번 더 |
| R8 | kista-api CLAUDE.md 같이 보라 | constraints.md:5(240B), deployment.md:15(90B) | 1줄 | 짧음 |
| R9 | README와 docs/agents 사본: 보호 prefix 5개(README:99 근처 "비인증 사용자는...", architecture.md:9), Client->Route Handler(README:58, architecture.md:33), 상태 캐시 1시간·PENDING 비캐시(README 시퀀스 다이어그램, app.md:8·11), SSE bodyTimeout·request.signal(README SSE 절, app.md:30-32), OCI 배포 요약(README 배포 절, deployment.md OCI 절) | README.md 약 25줄 | README가 CLAUDE/docs 내용을 요약 사본으로 갖고 있음. README는 자동 로드 아님(사람용) |
| R10 | stats 서버 TTL 캐시 | entities.md:61(536B), shared.md:59(308B) | 1줄 | shared.md가 entities.md 참조를 달고도 요약 반복 |
| R11 | router.refresh() 정책 | shared.md:40-49(1,257B), app.md:3, entities.md:4, app.md:36(unstable_retry 설명) | 약 2줄 | 정본은 shared.md, app.md:36이 같은 사실을 한 번 더 길게 |
| R12 | 값 라벨 SSOT `labelOf`·누락 메타 가드 | strategy.md:14, entities.md:54 | 1줄 | |
| R13 | 문서 vs 전역 ~/.claude/CLAUDE.md(읽기만) | 루트 CLAUDE.md:11(공통 작업 방식 요약), constraints.md:3(기회적 리팩토링 후보는 즉시 수정 말고 제안) vs 전역 "범위 밖 개선은 제안만, 보일러플레이트는 즉시 수정", react-query.md:3("발견 즉시 사용자에게 리팩토링 제안") vs 전역 "의심 사항 즉시 제보", copy.md:12("일괄 치환은 사용자 확인") vs 전역 "범위 밖 변경 승인", constraints.md:12-14(Git author·한글 커밋) vs /kista/CLAUDE.md의 Git 규칙 SSOT 포인터 | 5줄 | constraints.md:3은 전역과 부분 상충 가능(보일러플레이트 예외 유무). 판단은 안 함 |
| R14 | 문서 vs memory | feedback_consistency_first(앱 전역 grep 후 추천) vs copy.md:10(새 카피 전 grep), feedback_alignment_reference_match vs widgets.md:40·shared.md:91(표 정렬 가운데), verify_local_api_constraint vs commands.md:28(test:e2e 로컬 API 전제)·scripts/visual-diff/README(모킹 프록시), feedback_orchestrate_subagents vs 전역 서브에이전트 절(memory가 "나머지는 전역"이라 명시), project_done_do_not_redo의 완료 목록 vs docs/superpowers/plans·specs/archive 파일 | 약 10줄(memory 쪽) | memory는 읽기 시점 MEMORY.md 인덱스만 자동 로드 |
| R15 | 검증 명령 규범 | README.md:23-27 표, commands.md:24-25, memory(verify_local_api) | 4줄 | README는 "lint 0 errors"로 불완전(D7) |

묶음 수: 15 (그중 문서 내부 중복 R3·R5 포함, 문서-전역/메모리 간 R13·R14 포함).

## 4. 끝난 작업 기록

### 4-1. docs/superpowers (수동 Read, 자동 로드 아님)

| 대상 | 파일 | 줄 | 바이트 | 완료 근거 / 상태 |
|---|---|---|---|---|
| plans/archive | 33 | 27,370 | 1,212,976 | 전부 `archive/` 폴더. 활성 plans 0개. 체크박스는 완료 근거로 못 씀: 29개 파일에 미체크 1,023개, 체크 166개. git 이력 span 2026-05-18~2026-11-01(docs/superpowers 커밋 96개). 표본 코드 존재 확인: backtest·housing-quintile-trend·finance-budget-progress·finance-bulk-register 위젯, `finance/budgets/[type]` 라우트, `DcaStrategyForm`, `dca-executions` 위젯이 실재. 33개 전수 코드 대조는 하지 않음 |
| specs/archive | 38 | 3,860 | 246,499 | 동일. 전수 대조 안 함 |
| specs/2026-07-12-reject-reason-design.md | 1 | 62 | 6,571 | 보관 안 된 활성 spec. 헤더 "상태: 설계 초안 — 사용자 리뷰 대기". 코드에서 `rejectReason`은 `shared/lib/api-types.ts`(생성물) 1곳뿐이라 UI 구현 흔적 없음. 완료 기록이 아니라 미구현 초안으로 보임(f-retained T-26·27이 이 파일을 결정 근거로 인용) |
| audit/2026-07-12-ui-audit.md | 1 | 127 | 24,795 | 감사 보고서. f-retained A-17: `/` 정책 변경으로 P1(A-01/S-01) 판정 무효. memory가 A-04를 "재제안 금지" 근거로 인용 중이라 완전 폐기 대상 여부는 별개 |
| audit/screenshots | 97 PNG | - | 약 6,024KB | `.gitignore:9`에 `docs/superpowers/audit/screenshots/` -> git 미추적(로컬 잔존물). 레포 크기엔 영향 없음 |

archive 합계: 71개 파일, 31,230줄, 약 1.46MB. 자동 로드 비용 0(어디서도 @import 안 함). 살아 있는 문서가 archive를 참조하는 곳: memory/project_done_do_not_redo.md 3건뿐(`git grep superpowers/`로 docs/agents·CLAUDE.md·코드 검색 시 0건, 단 deploy/server/README·server-deploy.yml의 kista-infra 경로 언급 제외).

### 4-2. 자동 로드 문서 안의 과거 서사·날짜 (절 단위, 정확한 줄 수 아님)

마커(날짜/예전·구/이관·제거·되돌림/사례·회귀·버그) 정규식에 걸린 줄: 51줄(대상 CLAUDE.md·docs/agents·README·scripts README). 한 줄이 긴 단락이라 해당 절만 과거 서사이고 줄 전체가 아니다. 날짜가 박힌 9줄:

| file:line | 내용 |
|---|---|
| shared.md:61 | 2026-10부터 payload에 accountId·strategyId 추가(targeted 무효화 안 하는 이유 서술) |
| shared.md:93, :106 | 체크 배지 2026-08 전량 제거 (R5로 같은 문장 2회) |
| shared.md:108 | 2026-08 "모두 등록" gradient 되돌린 사례 |
| strategy.md:26 | 주식 편입 입력 2026-11 제거 |
| strategy.md:16 | 구 필드 amountUsd 제거(날짜 없음) |
| deployment.md:16 | 2026-10-24 바이낸스 메타 캐시 사례 |
| deployment.md:27 | 2026-08-07 kista-ui-server 인스턴스 통합 완료 |
| finance.md:13 | 2026-08부터 1인 1그룹 |
| finance-widgets.md:7 | 2026-08부터 INCOME/EXPENSE/SAVING 전부 허용 |

이 밖의 구조적 서사: strategy.md:3·finance.md:3 "흩어져 있던 서술을 모은 문서다"(이력 서문), react-query.md:3 위반 사례 3건 나열(AdminPrivacyBaseTable·AdminTradesWorkbench·TradingAlertToggle), shared.md:49 "과거 refresh를 함께 호출해 제거했다", shared.md:89 "과거 손으로 이어 붙이다 드리프트", copy.md:15 실제 발견 버그 2건, a11y.md:5 사례 나열. 마커 줄 수 상위 파일: shared.md 11, finance.md 5, app.md 4, copy.md 3, strategy.md 3.

### 4-3. memory·.claude

- memory/project_done_do_not_redo.md: 16줄/2,018B 전부 완료 기록(바이낸스·업비트 DCA·가계부 탭·admin Phase 2 등 6건). 본문 항목이 곧 "완료 작업" 목록이라 가드 성격과 기록 성격이 같은 파일에 섞임.
- memory/project_ios_pwa_viewport_bugs.md: 26줄/3,178B. Bug A는 해결됨(c5726f2f)이고 "아래는 이력" 약 10줄이 과거 진단 서사. Bug B만 미해결.
- .claude/skills/dto-sync-check: `multiple` 필드 제거 커밋(e63cdfb2)을 서술한 과거 기록 1줄(D9).
- .claude/skills/playwright-cli: SKILL.md 404줄 + references 10개, 합계 2,015줄(wc). `git grep playwright-cli -- CLAUDE.md docs/agents` 0건 — 프로젝트 문서가 참조하지 않는 외부 도구 매뉴얼 성격(일반 playwright 사용법). 자동 로드는 skill 설명만.

## 5. 코드가 이미 말해주는 설명

| file:line | 내용 | 코드 쪽 SSOT | 줄 |
|---|---|---|---|
| entities.md:11-13, 19-26, 47-49 | 의존성 화살표, 슬라이스 디렉토리 구조 블록(D6처럼 부분적), import 예시 | `ls entities/`, tsconfig alias | 14 (코드블록 줄 수 측정) |
| features.md:10-12, 16-24 | 의존성 화살표, 슬라이스 내부 구조 블록 | `find features -maxdepth 2` | 8 + 본문 1 |
| widgets.md:10-12, :22 | 의존성 화살표, "목록은 ls widgets/" | 디렉토리 | 4 |
| architecture.md:18-24 | FSD 한 줄 정의, tsconfig alias 절(문서 자체가 "tsconfig.json 참고") | tsconfig.json | 7 |
| shared.md:24-38 | staleTime 표 15행(문서 자신이 "코드와 대조 검증된"이라 명시, 표본 24행 전부 일치) | 각 hooks/queryOptions의 staleTime 상수·주석 | 15 |
| shared.md:12, :20, :70 | date-range 함수명 나열, createQueryClient 기본값 4개, normalize 헬퍼명 | shared/lib/query/createQueryClient.ts:3-4,10-13 등 | 3 |
| README.md 기술 스택 줄·배지 3개, README.md:23-27 명령 표 | 스택 버전, npm 스크립트 | package.json | 약 9 |
| deployment.md:3-9 | NEXT_PUBLIC 9개·ARG/ENV 안내(자체가 .env.example을 SSOT라 선언) | .env.example, Dockerfile | 약 4 |
| commands.md:3 | 스크립트 목록은 package.json이 SSOT라고만 서술(올바른 포인터, 대상 아님) | - | 0 |
| widgets/*/CLAUDE.md(accounts-grid·all-strategies·cycle-history·stats-overview 등) | 컴포넌트가 무엇을 prop으로 받는지·어떤 쿼리를 쓰는지 서술(코드 읽으면 보이는 부분) vs 필터 URL 방식·`replaceState` 이유 같은 비자명 부분이 한 문단에 섞임 | 해당 위젯 소스 | 섞여 있어 분리 줄 수는 측정 못 함 |

측정 가능한 합계: 약 60줄(코드블록·표·정의 한 줄 포함). 슬라이스 CLAUDE.md의 컴포넌트 서술은 줄 단위 분리가 안 돼 제외.

## 6. 규칙의 성격 분류

방법: 문서를 끝까지 읽은 판독 기반 추정이며 기계 측정이 아니다(규칙이 bullet 하나에 여러 성격을 담은 경우가 많아 오차 있음). 표의 숫자는 비공백 내용 줄 수에 대한 대략 배분. (b)는 근거가 확인된 것만 센다: eslint.config.mjs(jsx-a11y strict, no-noninteractive-tabindex region 허용, --max-warnings 0), knip, `cacheArchitecture.test.ts`·`metadata.test.ts`·`TradeNotificationBridge.test.tsx`·`queryOptions.test.ts`가 강제하는 규칙.

| 문서 | 줄 | (a) 코드만으론 모름 | (b) 도구 강제 | (c) 과거 실수 재발방지 서사 | (d) 일반 상식 |
|---|---|---|---|---|---|
| app.md | 60 | 약 38 | 1 (cacheArchitecture) | 약 12 (PENDING 쿠키·리다이렉트 루프·쿠키 혼용·admin layout 회귀·`/error` 401) | 약 5 |
| shared.md | 112 | 약 62 | 약 6 (metadata.test·Bridge test·cacheArchitecture) | 약 18 (체크배지·gradient·아이콘 클래스·refresh 이중조회) | 약 12 (이름만으로 자명한 컴포넌트 설명) |
| entities.md | 72 | 약 45 | 약 3 | 약 10 | 약 8 (구조·훅 이름 규칙) |
| widgets.md | 64 | 약 30 | 약 3 | 약 8 | 약 15 (구조·토큰 이름·shadcn 일반 사용법) |
| features.md | 33 | 약 20 | 0 | 약 3 | 약 6 |
| finance.md | 20 | 약 14 | 0 | 약 6 (매우 긴 단락) | 0 |
| strategy.md | 42 | 약 32 | 0 | 약 6 | 약 4 |
| copy.md | 16 | 약 8 | 0 | 약 7 (사례 근거 서술) | 약 1 |
| a11y.md | 13 | 약 7 | 약 3 (lint 설정 언급) | 약 3 (사례 나열) | 0 |
| react-query.md | 6 | 약 3 | 0 | 약 3 (위반 사례 3건 나열) | 0 |
| architecture.md | 35 | 약 20 | 약 4 (alias) | 약 2 | 약 6 |
| commands.md | 30 | 약 12 | 약 10 (lint·knip·scripts 설명) | 약 2 | 약 4 |
| constraints.md | 30 | 약 6 | 약 3 (포맷) | 0 | 약 18 (git·스타일링 일반) |
| deployment.md | 34 | 약 22 | 0 | 약 4 | 약 6 |
| 루트 + 중첩 CLAUDE.md 23개 | 137 | 약 70(슬라이스 quirk 본문) | 0 | 약 10 | 약 40 (헤더·import 줄·포인터 문장) |

합계(위 행 기준, 대략): (a) 약 390, (b) 약 33, (c) 약 94, (d) 약 125 중 import·헤더 포함. 도구 강제 규칙은 매우 작은 비중이고, 가장 큰 (b) 후보는 a11y.md 상단이 이미 "lint로 잡히지 않는 것만 규칙화"라고 선언한 대로 처음부터 걸러져 있음.

## 7. 구조 관찰

### 7-1. CLAUDE.md 23개 (루트 1 + 중첩 22)

| 유형 | 파일 | 개수 | 내용 |
|---|---|---|---|
| import 전용 (제목 + @import만, 3줄) | entities/finance, features/asset, features/finance | 3 | 모두 `finance.md` 1개 import |
| 레이어 import 전용 (제목 + 고정 문장 1개 + import 2~4개, 6~8줄) | app, entities, features, widgets, shared | 5 | "필수 quirk 문서 (아래 import로 자동 로드)" 문장이 5곳에 동일 |
| import + 본문 | features/asset/save-asset, manage-accounts, manage-budgets, manage-categories, save-transaction | 5 | `finance-group-share.md` import(5곳 전부 같은 대상) + 슬라이스 quirk 본문 |
| import 없음, 본문만 | manage-group, manage-strategy-suggestions, widgets 7개(accounts-grid·all-strategies·benchmark-comparison·cycle-history·dashboard·housing-quintile-trend·stats-overview) | 9 | 슬라이스 quirk 단일 문단 |
| 루트 | CLAUDE.md | 1 | 3개 import(commands·architecture·constraints) |

한 줄(또는 import만)짜리 파일: 8개(import 전용 3 + 레이어 5, 줄 수 3~8). 합계 본문 없는 파일 비율 8/23.
import 대상별 횟수: copy.md 4, a11y.md 3, react-query.md 3, finance.md 3, finance-group-share.md 5, 나머지 각 1. docs/agents 파일끼리의 @import는 0건(grep 확인).

### 7-2. SSOT가 불명확한 주제

| 주제 | 근거 |
|---|---|
| finance.md가 자동인지 수동인지 | 루트 CLAUDE.md는 "필요시 Read (자동 로드 아님)"로 분류하나 entities/finance·features/finance·features/asset CLAUDE.md가 `@import`로 자동 로드하고, entities/features/widgets.md는 "필수 Read"로 서술. strategy.md도 루트는 "필요시", 레이어 3문서는 "필수"(둘은 의미가 다르게 읽힘) |
| 캐시·무효화·refresh | app.md:3, entities.md:4, shared.md:4가 서로 "SSOT는 저쪽"이라고 가리킴. 정본 위치가 순환(entities=캐시 소유권, shared=staleTime·refresh, app=캐싱 절) |
| 가계부 규칙 | finance.md(공통), finance-widgets.md(화면, 어디서도 자동 아님), finance-group-share.md(5슬라이스 공통), 슬라이스 CLAUDE.md 7개, entities.md·features.md·widgets.md의 finance 포인터 — 5층 |
| 슬라이스 quirk 위치 | widgets.md:58이 슬라이스 전용 quirk는 `widgets/<slice>/CLAUDE.md`라 하나 widgets.md:61-64에도 admin-user-list·market-holiday-calendar·glass-card quirk가 직접 있음. features는 features.md(create-account·edit-account·admin/settings)·strategy.md(strategy/*)·슬라이스 CLAUDE.md(finance/*)로 3분할 |
| "작업 방식" | 루트 CLAUDE.md:9-15와 constraints.md:1-6이 둘 다 작업 방식 절, 전역 ~/.claude/CLAUDE.md와도 부분 겹침(R13) |
| README vs docs | README가 아키텍처·인증·SSE·배포를 요약 사본으로 보유(R9). README 드리프트 감지 규칙이 루트 CLAUDE.md:14에 있음 |
| 로드 방식 서술 | 루트 CLAUDE.md:25-27이 로드 규칙을 직접 설명하나 import 그래프와 일부 다름(finance.md 항목 위) |

## 8. 종합

### 8-1. 삭제·정리 후보 줄 수 (근거 유형별, 판단 없음)

| 근거 유형 | 대상 | 줄 | 자동 로드 여부 |
|---|---|---|---|
| 끝난 작업 기록 | plans/archive 27,370 + specs/archive 3,860 | 31,230 | 비로드 |
| 끝난 작업 기록(감사·스크린샷) | audit md 127 (+ 미추적 PNG 97개 6MB) | 127 | 비로드 |
| 보관 안 된 미구현 초안 | specs/2026-07-12-reject-reason-design.md | 62 | 비로드, 상태 "리뷰 대기"(완료 기록 아님) |
| 끝난 작업 기록(memory) | project_done 16 + ios Bug A 이력 약 10 | 약 26 | MEMORY.md 인덱스 1~2줄만 자동 |
| 과거 서사·날짜 마커 | 자동 로드 문서 안 51줄(절 단위, 줄 전체 아님) | 51 | 자동 로드 |
| 중복 | R1~R15 중복 쪽 합계 | 약 72 (README 약 25 포함) | 이 중 자동 로드 약 24줄, 약 7.8KB (R2 2,040B + R3 1,081B + R4 3,767B + R5 362B + R6 235B + R10 308B) |
| 코드가 이미 말해줌 | 5절 | 약 60 | 대부분 자동 로드(entities·features·widgets·architecture·shared) |
| 코드와 어긋남(정정 대상) | 2절 D1~D10, M1 | 10 | D1·D3·D4·D6은 자동 로드, D5 슬라이스 로드, D2·D7~D10 비자동 |
| 도구 설정 문서 오류 | fsd-boundary-checker·dto-sync-check·fsd-scaffold | 3개 파일 | 호출 시만 |

핵심 수치: 어긋난 항목 10건(+memory 1), 중복 묶음 15개, 자동 로드 문서 안 삭제·정리 후보는 (과거 서사 51 + 중복 24 + 코드 서술 약 60) 중복 계산 가능성 있어 합산 약 100~135줄, 비자동 로드 기록물 약 31,400줄.

### 8-2. 자동 로드 줄 수를 줄일 수 있는 폭 (측정 가능한 상한만)

- 현재 시나리오별 로드: S0 132줄/10,943B, S1(widgets) 239줄/32,062B, S2(features/finance) 239줄/44,672B, S3(app) 214줄/31,412B, S4(entities/finance) 256줄/42,516B, S5(shared) 263줄/31,037B.
- 자동 로드 대상 docs 13개 합계 494줄/86,934B, 그중 800B 초과 긴 줄 18개가 27,211B(31%). 비자동 3개(strategy 42줄 19,169B, finance-widgets 10줄 6,676B, deployment 34줄 3,354B 포함) 포함 전체는 580줄/116,133B.
- 위 중복(약 7.8KB)·코드 서술(표 15행 포함)·날짜 마커 절을 모두 제거해도 줄어드는 상한은 자동 로드 총량 기준 한 자릿수~십 수 % 수준(정확 환산은 하지 않음: 마커·중복 바이트는 R 표에 있는 6개 묶음만 바이트 측정함).
- 전역 ~/.claude/CLAUDE.md는 51줄/16,577B로 이 레포 S0 위에 항상 추가됨(읽기만, 이 조사의 삭제 대상 아님).

### 8-3. 구조 개편 선택지의 사실 근거 (판단 없음)

| 선택지 | 사실 근거 |
|---|---|
| A. 현행 유지(레이어별 @import) | 장점으로 확인된 사실: 작업 디렉토리에 맞는 문서만 로드(S1 239줄~S5 263줄). 단점으로 확인된 사실: finance.md·strategy.md 로드 방식 서술 불일치, 5개 레이어 CLAUDE.md의 동일 문장·import 전용 파일 8개 |
| B. 루트 단일 import(모든 docs를 항상 로드) | 자동 로드 대상 13개 + 중첩 CLAUDE 합계 약 631줄/약 110KB(계산: 494줄/86,934B + 137줄/23,644B에서 root 중복 가산 제외 없이 상한), S0의 약 10배 |
| C. @import 제거, 루트에 포인터 표만(전부 수동 Read) | S0 132줄/10,943B만 상시. 단 도구가 강제하지 않는 (a)+(c) 규칙 약 480줄(6절 추정)이 자동 주입에서 빠짐. 규칙 누락 시 감지 수단: lint/test는 (b) 약 33줄분만 |
| D. 규칙 본문과 사례 서사 분리(규칙은 로드, 사례는 수동) | 분리 대상 후보: 6절 (c) 약 94줄 + 4-2절 51줄 마커(겹침 있음). 근거가 서사에 들어 있는 규칙이 많아(예: 4-2의 react-query.md:3 위반 사례, shared.md 체결 SSE 이유) 원문 이동 시 "이유" 소실 여부는 별도 확인 필요 |
| E. 비로드 기록물 정리(archive·audit·memory 완료 목록) | 31,400줄이 자동 로드 비용 0이므로 컨텍스트 절감이 아니라 레포 크기·검색 노이즈 문제. archive는 `git grep`·IDE 검색 대상, 살아 있는 문서 참조는 memory 3건뿐 |

### 8-4. 확인하지 못한 것

- Claude Code가 같은 파일을 여러 CLAUDE.md에서 @import할 때 중복 제거하는지 여부.
- plans/specs 71개 파일 전수의 코드 구현 완료 대조(표본 7곳만 확인).
- 긴 단락(strategy.md·finance.md·shared.md·app.md)의 모든 동작 서술 전수 대조.
- 6절 성격 분류는 판독 추정.
- 토큰 환산(바이트·줄 수만 측정).
