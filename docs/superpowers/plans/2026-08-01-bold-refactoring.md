# Bold Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **승인 후 저장 위치**: `docs/superpowers/plans/2026-07-31-bold-refactoring.md`

## Context

2026-07-31 코드베이스 전수 탐색 결과, 기능 동작에는 문제가 없으나 구조적 부채가 확인됐다: ① `process.env.API_BASE_URL ?? NEXT_PUBLIC_API_BASE_URL` 패턴 14곳 산재와 인증 쿠키 이름 하드코딩 4곳, ② 개별 Route Handler 8개의 인증·에러 매핑 5줄 중복, ③ 225줄 단일 `proxy()` 함수의 RT 갱신 로직이 `api/auth/refresh`와 이중 구현, ④ 400줄+ 다책임 컴포넌트 4개(587/550/523/456줄), ⑤ queryOptions 부재 도메인의 prop-drilling 드리프트, ⑥ 포맷터·상태 맵·normalizer 중복, ⑦ FSD 위젯 cross-import 위반 7개소.

`docs/superpowers/plans/2026-07-31-speed-uiux-improvements.md`(이하 **speed 플랜**)는 **2026-08-01 기준 8개 태스크 전부 main에 머지 완료**(`d21821f`~`ddfe0cd`). 따라서 원래 "충돌 그룹(Group 3)"의 speed 플랜 대기 게이트는 **해제**됐고, speed 플랜이 수정한 파일도 이제 자유롭게 손댈 수 있다. 또한 T15의 fcm 부분(`NotificationChannel`을 `@shared/lib/api-schema`에서 직접 import)은 이미 `7b18875`로 완료 → **T15는 종료**하고 잔여분만 T1(meta)·T2(layout)로 흡수한다.

**Goal:** 인프라 SSOT화(API URL·쿠키 상수·Route Handler·proxy), 대형 컴포넌트 4개 분해, queryOptions 규약 정합, 중복 제거(포맷터·상태 맵·normalizer), FSD 위젯 계층 위반 해소.

**Architecture:** 기존 public API(배럴 export, 컴포넌트 props, 훅 시그니처)는 가능한 한 불변으로 유지해 기존 테스트가 무수정 통과하는 것을 완료 조건으로 삼는다. 순수 함수 추출은 특성화 테스트로 현재 동작을 잠근 뒤 이동한다. 위젯 조합 위반은 slot prop + app 계층 조합으로 해소한다.

**Tech Stack:** Next.js 16.2, React 19.2, TanStack React Query 5.101, TypeScript 5, Vitest 4, Testing Library.

**사용자 확정 결정:** 대형 컴포넌트 4건 모두 분해 · FSD 위반은 구조 이동으로 해소 · normalizer는 경량 헬퍼(zod 도입 안 함).

## 모델 배정 (오케스트레이션 · 서브에이전트)

**오케스트레이션: Fable 5 (현 세션)** — 태스크 분배, 그룹 간 순서 제어, 태스크별 커밋 전 검수 게이트, 최종 통합 검증.

**검수: opus 리뷰어 서브에이전트 (또는 code-review 계열 skill)** — 각 태스크 커밋 직전 의무 실행 (CLAUDE.md 규칙, 서브에이전트 위임 여부 무관). 발견 결함은 커밋 전 수정·재검증.

| Task | 내용 | 구현 모델 | 근거 |
|---|---|---|---|
| T1 | `getApiBaseUrl()` SSOT | **sonnet** | 14곳 치환 + 모듈 로드 시점→호출 시점 평가 전환의 테스트 영향 판단 |
| T2 | 인증 쿠키 상수 SSOT | **haiku** | 상수 추출 + 기계적 import 치환 |
| T3 | Route Handler 공통 헬퍼 | **sonnet** | fcm 4xx relay 동작 변경 포함, 테스트 설계 필요 |
| T4 | proxy.ts 분해 + RT refresh 통합 | **opus** | 인증 경로의 심장 — `proxy()` 시나리오 테스트 보강 선행, 회귀 시 전면 장애 |
| T5 | normalizer 헬퍼 + listAccounts 통일 | **sonnet** | 3개 도메인 매핑 치환, 동작 보존 검증 |
| T7 | `fmtSignedPercent` 포맷터 | **haiku** | 포맷터 추가 + 7개소 기계적 치환 |
| T8 | UserStatus 라벨/톤 맵 승격 | **haiku** | 기존 entities/order 패턴 복제 |
| T9 | order queryOptions + 전략상세 hydration | **sonnet** | 엔티티/위젯/페이지 3계층 시그니처 변경 |
| T10 | `StrategyDetail.tsx` 분해 (456줄) | **sonnet** | 컴포넌트 4개 + 훅 추출, 1222줄 테스트 무수정 통과 |
| T11 | `useStrategyForm.ts` 분해 (587줄) | **opus** | 이 플랜 최대 회귀 위험 — 6개 useEffect 연쇄, 1089줄 테스트 무수정 통과 필수 |
| T12 | `AdminSettingsForm.tsx` 분해 (550줄) | **haiku** | 내부 컴포넌트 4개 기계적 파일 이동, props 불변 |
| T13 | `HousingBenchmarkComparison.tsx` 분해 (523줄) | **sonnet** | 15+ useState → 필터 훅 추출, 파생 로직 재배선 |
| T14a | 위젯 화이트리스트 명문화 | **haiku** | 문서 전용 (검수 예외) |
| T15 | speed 플랜 잔여 SSOT + fcm 타입 원천 import | **haiku** | 3파일 기계적 치환 |
| T16 | market queryOptions + dashboard slot 이관 | **sonnet** | hydration 이관 + slot prop 재구성, 캐시 시맨틱 변경 |

## 실행 그룹 (파일 비중첩 병렬)

| 그룹 | 태스크 | 방식 | 전제 |
|---|---|---|---|
| **Group 1** | T1 → T2 → T3 → T4 | 단일 워커 순차 (`proxy.ts`·`app/api` 공유) | 즉시 시작 가능 |
| **Group 2** | T5, T7, T8, [T9→T10], T11, T12, T13, T14a | 병렬 (T9→T10만 같은 워커 순차) | Group 1과 파일 비중첩 — 병행 가능. SDD는 단일 워커 순차 실행이므로 실제로는 순서대로 처리 |
| **Group 3** | T16 | 단일 워커 | speed 플랜 머지 완료로 게이트 해제 — 즉시 가능. (T15는 종료: fcm 완료, meta→T1·layout→T2 흡수) |

> **SDD 실행 주의**: subagent-driven-development는 구현 서브에이전트를 **한 번에 하나씩** 순차 dispatch한다(병렬 구현 금지 — 충돌 방지). 위 "병렬" 표기는 파일 비중첩성(=순서 무관 안전)을 뜻하며, 실제 실행은 T1→T2→…→T16 순차 진행한다.

## Global Constraints

- 구현 서브에이전트는 **직접 `git commit` 금지** — 커밋은 오케스트레이터가 opus 검수 통과 후 실행.
- ~~speed 플랜 충돌 파일 수정 금지~~ — **해제됨** (speed 플랜 머지 완료). 모든 파일 수정 가능.
- 포맷: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지, 기존 파일 포맷 일괄 변경 금지. `any` 금지.
- FSD 단방향(`app → widgets → features → entities → shared`), entities 간 cross-import 금지.
- 기본 검증 `npm run typecheck` + focused `npm run test:run -- <경로>`. 그룹 완료 시 전체 `npm run test:run`.
- 커밋 메시지 한글, author `narafu <narafu@kakao.com>`, 괄호 경로 큰따옴표. `git push`는 사용자 명시 요청 시에만.
- 분해 태스크(T10~T13)는 기존 대형 테스트 파일 **무수정 통과**가 완료 조건 (import 경로 수정만 허용).

---

## Group 1 — 인프라 SSOT 체인

### Task 1: `getApiBaseUrl()` SSOT

**Files:**
- Create: `shared/lib/env.ts`, `shared/lib/env.test.ts`
- Modify (15곳): `shared/lib/api-client/index.ts:98-101`, `shared/lib/proxy/createProxyRoute.ts:5`, `proxy.ts:43,141`, `app/auth/callback/route.ts:30`, `app/api/auth/{me,refresh,logout,reapply-done,status-stream}/route.ts`, `app/api/trades/stream/route.ts:24`, `app/api/fcm/tokens/route.ts:5`, `app/api/fcm/tokens/[token]/route.ts:4`, `entities/market/api/index.ts:5`, **`entities/meta/api/index.ts:4`** (speed 플랜 머지본의 `const API_BASE_URL` — 원래 T15 이월분, 이제 T1에 포함)

**Interfaces (Produces):**

```ts
// shared/lib/env.ts
export function getApiBaseUrl(): string          // API_BASE_URL > NEXT_PUBLIC_API_BASE_URL, 미설정 시 throw
export function getApiBaseUrlOrNull(): string | null  // proxy.ts tryRefresh 등 실패 허용 경로용
```

- [ ] **Step 1**: `shared/lib/env.test.ts` 실패 테스트 — `vi.stubEnv` 기반 우선순위·throw·null 검증

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl, getApiBaseUrlOrNull } from './env'

describe('getApiBaseUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('API_BASE_URL을 우선한다', () => {
    vi.stubEnv('API_BASE_URL', 'http://internal:8080')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://public.example')
    expect(getApiBaseUrl()).toBe('http://internal:8080')
  })

  it('API_BASE_URL이 없으면 NEXT_PUBLIC으로 폴백한다', () => {
    vi.stubEnv('API_BASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://public.example')
    expect(getApiBaseUrl()).toBe('https://public.example')
  })

  it('둘 다 없으면 throw / OrNull은 null', () => {
    vi.stubEnv('API_BASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '')
    expect(() => getApiBaseUrl()).toThrow('API_BASE_URL is not configured')
    expect(getApiBaseUrlOrNull()).toBeNull()
  })
})
```

- [ ] **Step 2**: 실패 확인 → 구현 (함수형 = 호출 시점 평가. 기존 모듈 상단 `const API_BASE_URL` 고정 평가가 사라지므로 `app/api/admin/[[...path]]/route.test.ts`, `createProxyRoute.test.ts`의 env mock 방식 영향 확인)
- [ ] **Step 3**: 14곳 치환 — 각 파일 로컬 `const API_BASE_URL = process.env...` 삭제, 호출부 `getApiBaseUrl()`. `proxy.ts:43-44`는 `getApiBaseUrlOrNull()` + null이면 기존대로 `return null`
- [ ] **Step 4**: `npm run test:run -- shared/lib app/api` + `npm run typecheck`
- [ ] **Step 5**: Commit — `refactor(shared): API base URL 결정을 getApiBaseUrl()로 단일화`

### Task 2: 인증 쿠키 이름 상수 SSOT

**Files:**
- Create: `shared/lib/auth/cookies.ts`
- Modify: `proxy.ts:4-6`, `shared/lib/auth/token.ts:1`, `app/auth/callback/route.ts:4-5`, `app/api/auth/{me,refresh,logout,reapply-done}/route.ts`, **`app/(main)/layout.tsx:25`** (speed 플랜 머지본의 `cookieStore.get('kista-user-role')` → `ROLE_COOKIE`, 원래 T15 이월분)
- 주의: `app/api/auth/me/route.ts:5`는 `TOKEN_COOKIE`(다른 이름)로 하드코딩 — 파일 내 사용부까지 `KISTA_TOKEN_COOKIE`로 통일

**Interfaces (Produces):**

```ts
// shared/lib/auth/cookies.ts
export const KISTA_TOKEN_COOKIE = 'kista-token'
export const STATUS_COOKIE = 'kista-user-status'
export const ROLE_COOKIE = 'kista-user-role'
export const RT_COOKIE = 'refresh_token'
export const CLEAR_COOKIE = { maxAge: 0, path: '/' } as const  // logout/route.ts:8에서 이동
```

- [ ] **Step 1**: 상수 파일 생성 + 값 스냅샷 단위 테스트 1개 (실제 쿠키 값과 일치 검증 — 값이 바뀌면 세션 전체 로그아웃되므로 잠금)
- [ ] **Step 2**: 7개 파일 로컬 선언 삭제 + import 치환 (기존 상수명이 다르면 — 예: `TOKEN_COOKIE` — 파일 내 사용부까지 이름 통일)
- [ ] **Step 3**: `npm run test:run -- proxy.test.ts shared/lib app/api/auth` + typecheck
- [ ] **Step 4**: Commit — `refactor(auth): 인증 쿠키 이름 상수를 shared/lib/auth/cookies로 통합`

### Task 3: Route Handler 공통 헬퍼 추출

**Files:**
- Create: `shared/lib/proxy/routeHelpers.ts`, `shared/lib/proxy/routeHelpers.test.ts`
- Modify: `shared/lib/proxy/createProxyRoute.ts` (49-63 에러 매핑을 헬퍼 호출로), `app/api/auth/me/route.ts`, `app/api/auth/reapply-done/route.ts`, `app/api/fcm/tokens/route.ts`, `app/api/fcm/tokens/[token]/route.ts`, `app/api/auth/status-stream/route.ts`, `app/api/trades/stream/route.ts`

**Interfaces (Produces):**

```ts
// shared/lib/proxy/routeHelpers.ts
export function unauthorizedJson(): NextResponse          // { error: 'Unauthorized' }, 401
export async function requireAuthToken(): Promise<string | null>
export async function relayUpstreamError(res: Response, label: string): Promise<NextResponse>
//   5xx: console.error(`[${label}] ...`) + { error: 'Failed' } / 4xx: 업스트림 JSON body relay, 실패 시 { error: 'Failed' }
export function noContent(): NextResponse                 // 204
export function sseAuthErrorResponse(): Response          // 'event: auth-error' 200 스트림 (trades/stream:15-21 이동)
```

- [ ] **Step 1**: 실패 테스트 — `relayUpstreamError` 3분기(5xx/4xx JSON/4xx 비JSON), `sseAuthErrorResponse` Content-Type·본문
- [ ] **Step 2**: 구현 → `createProxyRoute.ts` 인라인 에러 매핑 교체. 기존 `createProxyRoute.test.ts` 무수정 통과 확인
- [ ] **Step 3**: 개별 핸들러 6개 치환. **의도된 동작 변경**: fcm 2개 핸들러가 4xx를 `{error:'Failed'}`로 뭉개던 것 → 4xx body relay로 통일 (소비처 `entities/fcm`는 body 미사용이라 안전 — 테스트에 명시)
- [ ] **Step 4**: `npm run test:run -- shared/lib/proxy app/api` + typecheck
- [ ] **Step 5**: Commit — `refactor(api): Route Handler 인증·에러 매핑 중복을 shared 헬퍼로 추출`

### Task 4: proxy.ts 분해 + RT refresh 로직 통합

**Files:**
- Create: `shared/lib/auth/refresh.ts`, `shared/lib/auth/refresh.test.ts`
- Modify: `proxy.ts` (내부 재구성 — export `proxy`/`config`/`isJwtExpired` 불변, 파일 위치 루트 유지), `app/api/auth/refresh/route.ts:16-48`, `proxy.test.ts` (시나리오 테스트 추가)

**Interfaces (Produces):**

```ts
// shared/lib/auth/refresh.ts — proxy.ts:38-62(tryRefresh)와 refresh/route.ts:17-46의 공통부
export interface RefreshResult { accessToken: string; setCookieHeaders: string[] }
export async function refreshAccessToken(opts: {
  rt: string
  userAgent: string
  timeoutMs?: number   // proxy는 5000, route는 미지정
}): Promise<RefreshResult | null>
export function buildAtSetCookie(token: string, isSecure: boolean): string
// proxy.ts:109-111과 refresh/route.ts:34-40의 AT Set-Cookie 값 불일치 방지가 목적
```

- [ ] **Step 1**: **`proxy()` 시나리오 테스트 먼저 보강** (`proxy.test.ts` — 현재 `isJwtExpired`만 있음): ① 비보호 경로 통과, ② 만료 AT + RT 성공 시 Set-Cookie 부착 통과, ③ status/role 캐시 히트 fast path, ④ PENDING 상태 미캐싱 리다이렉트. fetch mock 기반
- [ ] **Step 2**: `refreshAccessToken`/`buildAtSetCookie` 실패 테스트(성공·비OK·accessToken 누락·예외 4분기) → 구현
- [ ] **Step 3**: `refresh/route.ts`를 `refreshAccessToken` 소비로 교체 — `docs/agents/app.md`의 "ResponseCookies.set 완료 후 headers.append" quirk 순서 준수
- [ ] **Step 4**: `proxy.ts` 내부 분해 — ① `tryRefresh` → `refreshAccessToken` 호출, ② 5회 반복 "리다이렉트/통과 + 캐시쿠키 삭제 + extraSetCookies 적용"(115-121, 148-156, 163-167, 183) → 지역 함수 `finalize(dest, { clearCache?, extraSetCookies })`, ③ status/role 슬로우패스(126-169) → 지역 함수 `resolveStatusRole(request, token, apiUrl)`
- [ ] **Step 5**: `npm run test:run -- proxy.test.ts shared/lib/auth app/api/auth` + typecheck
- [ ] **Step 6**: Commit — `refactor(proxy): RT 갱신 로직 공유화 및 proxy 분기 헬퍼 분해`

---

## Group 2 — 병렬 실행

### Task 5: normalizer 경량 헬퍼 + `listAccounts` fetchEither 통일

**Files:**
- Create: `shared/lib/normalize.ts`, `shared/lib/normalize.test.ts`
- Modify: `shared/model/placed-order.ts` (공통 매퍼 추가), `entities/strategy/api/index.ts:7-46,85-96`, `entities/order/api/index.ts:47-156`, `entities/account/api/index.ts:14-19`

**Interfaces (Produces):**

```ts
// shared/lib/normalize.ts
export function str(v: unknown): string
export function optStr(v: unknown): string | undefined
export function num(v: unknown): number
export function optNum(v: unknown): number | undefined
export function dec(v: unknown): number            // BigDecimal string → number (기존 toNum 위임)
export function optDec(v: unknown): number | undefined

// shared/model/placed-order.ts — 주문 항목 매핑 3회 반복 통합 (entities cross-import 불가 → shared/model 위치)
export function normalizePlacedOrderBase(raw: unknown): {
  id: string; ticker: string; direction: 'BUY' | 'SELL'; orderType: string
  quantity: number; price: string; status: string
}
```

- [ ] **Step 1**: 헬퍼 + `normalizePlacedOrderBase` 실패 테스트 → 구현
- [ ] **Step 2**: 치환 이동 지도 — ① strategy `normalizePlacedOrder`(85-96) → base + `status ?? 'PLACED'` 래퍼 유지, ② order `normalizePreview` todayOrders(75-86) → base, ③ order `listStrategyOrders`(142-155) → base + `tradeDate`/`filledQuantity`/`filledPrice` 3필드 스프레드, ④ `normalizeStrategy`/`normalizeVrSummary`의 수동 `String()/Number()/!= null` → `str/num/optNum/optDec`
- [ ] **Step 3**: `entities/account/api/index.ts:14-19` `listAccounts`를 `fetchEither<Account[]>('/api/accounts', { method: 'GET' }, token)` 한 줄로 교체, 불필요해진 import 정리
- [ ] **Step 4**: `npm run test:run -- entities/strategy entities/order entities/account shared` + typecheck
- [ ] **Step 5**: Commit — `refactor(entities): 응답 정규화 헬퍼 도입 및 주문 매핑·listAccounts 중복 제거`

### Task 7: `fmtSignedPercent` 포맷터

**Files:**
- Modify: `shared/lib/format/index.ts` + 테스트, `widgets/benchmark-comparison/HousingBenchmarkSummary.tsx:13-26` (로컬 3함수 삭제), `widgets/stats-overview/StrategyTypeComparison.tsx:49,75`, `widgets/stats-overview/CyclePerformanceList.tsx:75,113`

**Interfaces (Produces):**

```ts
/** 0~1 비율을 부호 포함 %로. null/undefined는 '—' */
export function fmtSignedPercent(ratio: number | null | undefined, digits = 1): string    // 0.123 → '+12.3%'
export function fmtSignedPercentPoint(ratio: number | null | undefined, digits = 1): string // → '+12.3%p'
```

- [ ] **Step 1**: 실패 테스트(양수 `+`, 음수, 0 → `+0.0%`, null → `—`, digits=2) → 구현
- [ ] **Step 2**: 7개소 치환 — Summary의 `formatPercent`/`formatPercentagePoint`/`formatTablePercent` → `fmtSignedPercent(v)`/`fmtSignedPercentPoint(v)`/`fmtSignedPercent(v, 2)`, stats 2파일 4개소는 null 삼항 전체 대체. **`StatsOverview.tsx`(충돌 파일)는 건드리지 않음**
- [ ] **Step 3**: `npm run test:run -- shared/lib/format widgets/stats-overview widgets/benchmark-comparison` + typecheck
- [ ] **Step 4**: Commit — `refactor(format): 부호 포함 퍼센트 포맷터 도입으로 중복 7개소 흡수`

### Task 8: UserStatus 라벨/톤 맵 `entities/user` 승격

**Files:**
- Create: `entities/user/model/status.ts` + 테스트
- Modify: `entities/user/index.ts`, `widgets/settings/SettingsPageContent.tsx:15-23`, `widgets/admin-user-list/AdminUsersTable.tsx:15-25,77`

**Interfaces (Produces):** (`entities/order/model/status-badge.ts` 패턴 준용)

```ts
export const USER_STATUS_LABEL: Record<UserStatus, string>        // 사용자 본인 화면: 활성/대기/반려
export const ADMIN_USER_STATUS_LABEL: Record<UserStatus, string>  // 관리자 관점: 승인/대기/거절 — 두 위젯 라벨이 의도적으로 다름, 강제 통일 금지
export const USER_STATUS_TONE: Record<UserStatus, 'ok' | 'warn' | 'error'>
export function userStatusColorVar(status: UserStatus): string    // 'var(--status-ok)' 등
```

- [ ] **Step 1**: 맵 스냅샷 + colorVar 실패 테스트 (기대값은 두 위젯의 현재 리터럴에서 그대로 복사) → 구현·배럴 export
- [ ] **Step 2**: `SettingsPageContent`의 `STATUS_CONFIG` 삭제 → `USER_STATUS_LABEL[user.status]` + `userStatusColorVar`, `AdminUsersTable`의 `STATUS_LABEL`/`STATUS_TONE` 삭제 → `ADMIN_USER_STATUS_LABEL`/`USER_STATUS_TONE`
- [ ] **Step 3**: `npm run test:run -- entities/user widgets/settings widgets/admin-user-list` + typecheck
- [ ] **Step 4**: Commit — `refactor(user): UserStatus 라벨·톤 맵을 entities/user로 승격`

### Task 9: order queryOptions + `/strategies/[sid]` hydration 이관

> 도메인 판단 (탐색 결과): **order만 즉시 가치**. runtime-config는 `staleTime: 0` 정책이라 prefetch 무가치 — 제외. trade는 전부 infinite query/사용자 파라미터 의존 — 제외. market은 가치 있으나 충돌 파일(`dashboard/page.tsx`) 수정 필요 — **T16으로 이월**.

**Files:**
- Create: `entities/order/model/queryOptions.ts` + 테스트
- Modify: `entities/order/hooks/useOrderQueries.ts:9-25`, `entities/order/index.ts`, `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:42-53`, `widgets/strategy-detail/StrategyDetailContent.tsx` + `StrategyDetail.tsx:114-124` (`initialPreview` prop 제거), 두 위젯 테스트 (initial 데이터는 `client.setQueryData(orderKeys.preview(id), fixture)`로 시드)

**Interfaces (Produces):**

```ts
// entities/order/model/queryOptions.ts — server-safe ('use client' 없음)
export function orderPreviewQueryOptions(strategyId: string, token?: string) {
  return queryOptions<NextOrderPreview>({
    queryKey: orderKeys.preview(strategyId),
    queryFn: () => getStrategyOrdersPreview(strategyId, token),
    retry: false,
    staleTime: 60_000,
  })
}
// useStrategyOrderPreviewQuery(strategyId, initialData?)는 시그니처 유지 — initialData 경로는
// /strategies·/accounts/[id] 카드 목록의 previewsPromise 스트리밍(hydration 불가) 전용으로 존속
```

- [ ] **Step 1**: queryOptions 실패 테스트(queryKey·staleTime) → 구현 → 훅이 소비하도록 재구성(refetchInterval 로직은 훅 잔류) → 배럴 export
- [ ] **Step 2**: `[sid]/page.tsx` — preview prop 전달 삭제, `await queryClient.prefetchQuery(orderPreviewQueryOptions(sid, token)).catch(() => undefined)` (기존 `dehydrate`에 자동 포함). `StrategyDetailContent`/`StrategyDetail`의 `initialPreview` prop 제거, 훅 호출 `useStrategyOrderPreviewQuery(strategy.id)`. `StrategyCard` 스트리밍 경로는 불변
- [ ] **Step 3**: `npm run test:run -- entities/order widgets/strategy-detail` + typecheck
- [ ] **Step 4**: Commit — `refactor(order): 주문 미리보기 queryOptions 도입 및 전략 상세 hydration 이관`

### Task 10: `StrategyDetail.tsx` 분해 (456줄) — T9 완료 후 같은 워커

**Files:**
- Create: `widgets/strategy-detail/orderBannerCopy.ts` + 테스트, `StrategyMetaSection.tsx`, `NextOrderCard.tsx`, `DeleteStrategyDialog.tsx`, `useTodayMarketStatus.ts`
- Modify: `widgets/strategy-detail/StrategyDetail.tsx` (오케스트레이터로 축소), `StrategyDetail.test.tsx` (import 경로만 — 1222줄 본문 무수정 통과)

**이동 지도:**
- `orderBannerCopy.ts` (순수): `SKIP_REASON_LABELS`(39-42), `BUY_COPY`/`SELL_COPY`(47-63), `directionUnplacedMessage`(66-70), `directionBannerText`(76-80), `nextOrderBannerText`(85-97), `previewErrorMsg`(99-105), `recurringModeLabel`(107-112)
- `useTodayMarketStatus.ts`: 139-151 → `(): { marketStatusMessage: string | null; isConfirmedHoliday: boolean }` (`useMonthlyHolidaysQuery` + `todayKst` 내장)
- `StrategyMetaSection.tsx`: 186-319 — props `{ strategy; preview; isLoadingPreview; isPreviewError; previewError }`
- `NextOrderCard.tsx`: 321-423 — props `{ strategy; preview; isLoadingPreview; isPreviewError; previewError; readiness; mode: 'preview' | 'executed'; canExecute; bannerText; marketStatusMessage; isConfirmedHoliday; execute; isExecuting }` — cancel 뮤테이션 2개는 내부로 이동
- `DeleteStrategyDialog.tsx`: 435-451 — props `{ open; onOpenChange; ticker; onConfirm; disabled; isDeleting }`
- 잔류: preview 쿼리, `computeOrderReadiness`, `useManageStrategyMutations`, 조립

- [ ] **Step 1**: `orderBannerCopy` 특성화 테스트 먼저 (분기 6종: canExecute false / preview+시장상태 / preview+휴장 / buy·sell deficit 동시 / uncertain의 preview·executed 차이)
- [ ] **Step 2**: 순수 함수 → 훅 → 컴포넌트 순으로 하나씩 이동, 매 단계 `npm run test:run -- widgets/strategy-detail` 녹색 유지
- [ ] **Step 3**: typecheck → Commit — `refactor(strategy-detail): 배너 순수함수·메타 그리드·주문 카드·삭제 다이얼로그 분리`

### Task 11: `useStrategyForm.ts` 분해 (587줄)

**Files:**
- Create: `features/strategy/create-strategy/model/vrDerived.ts`, `strategyFormGuards.ts`, `buildStrategyPayload.ts` (각 + 테스트), `useTypeDefaults.ts`
- Modify: `features/strategy/create-strategy/model/useStrategyForm.ts` — **public API(`UseStrategyFormReturn`·`VrFields`) 완전 불변, 1089줄 기존 테스트 무수정 통과가 완료 조건**

**이동 지도:**
- `vrDerived.ts` (순수, 318-340): `computeVrDerived(input): VrDerived` — `VrDerived = { evaluatedStockValueEstimate; normalizedInitialValue; normalizedRecurringAmount; recurringMagnitude; effectiveInitialGradient; initialAssets; evaluatedAssets; requiredWithdrawalAssets }`, input은 `{ initial?; avgPrice; quantity; initialValue; seedUsd; recurringMode; recurringAmount; intervalWeeks; initialGradient }`
- `strategyFormGuards.ts` (순수): `isInvalidBootstrap`(344-350), `isInvalidScheduledStart`(353), `isInvalidVr`(356-370), `isRuntimeValueInvalid`(372-384), `computeCannotSubmit`(386-389), `computeSubmitDisabledReason`(391-448). **주의: `cannotSubmit`과 `submitDisabledReason` 조건이 완전 동치가 아님**(비VR runtime invalid는 disabled인데 reason 없음 등) — 두 함수를 별도 추출하고 특성화 테스트로 현재 분기 잠금, 동작 통일 금지
- `buildStrategyPayload.ts` (순수, 509-556): `buildStrategyPayload(input): StrategyRequest` — input `{ initial?; type; ticker; cycleSeedType; seedUsd; canEditSeed; isVr; usesDivisionCount; divisionCount; divisionCountSettings?; runtimeStrategy?; vrFields; vrDerived; scheduledStartDate }`
- `useTypeDefaults.ts` (훅): type 변경 effect(277-296)와 `setType`(465-478)의 중복 기본값 세팅을 `applyTypeDefaults` 공용 함수로 묶어 이동 → `useTypeDefaults({ form, initial, runtimeConfig, enabledStrategyTypes, availableTickers }): { setType }`
- 잔류(~250줄 목표): RHF 셋업·watch·쿼리·`useSeedModel`·뮤테이션·return 조립. useEffect 중 174-177, 258-266, 299-307, 310-316은 **잔류** (실행 순서 변화 위험 — 이번 범위는 순수 함수 추출까지)

- [ ] **Step 1**: 순수 3모듈의 실패 테스트를 기존 `useStrategyForm.test.ts` 시나리오에서 역산해 먼저 작성
- [ ] **Step 2**: 모듈별 이동, 매 단계 `npm run test:run -- features/strategy/create-strategy` 전체 녹색 유지
- [ ] **Step 3**: typecheck → Commit — `refactor(create-strategy): useStrategyForm을 파생·검증·payload 순수 모듈과 타입 기본값 훅으로 분해`

### Task 12: `AdminSettingsForm.tsx` 분해 (550줄)

**Files:**
- Create: `features/admin/settings/ui/ToggleRow.tsx`, `ValueListEditor.tsx`, `RecurringModeEditor.tsx`, `FieldEditor.tsx`, `features/admin/settings/model/normalizers.ts` + 테스트
- Modify: `features/admin/settings/ui/AdminSettingsForm.tsx` (조립 + `AdminSettingsFormContent` + `clone` + `STRATEGY_LABELS` 잔류) — 기존 테스트 2개 파일 무수정 통과

**이동 지도** (심볼·props 시그니처 그대로): `ToggleRow`(36-48), `ValueListEditor<T>`(50-182, `ValueSet<T>` 타입 함께 export), `RecurringModeEditor`(184-270, `RECURRING_MODE_OPTIONS` 포함), `FieldEditor<T>`(272-333), `normalizeSymbol`/`normalizeText`/`normalizeNumber`(55-68) → `model/normalizers.ts`

- [ ] **Step 1**: normalizers 실패 테스트(trim, 대문자화, 빈 문자열→null, 비유한수→null) → 파일 생성
- [ ] **Step 2**: 컴포넌트 4개 기계적 이동('use client' 각 파일 유지) → 기존 `AdminSettingsForm.test.tsx`·`.lifecycle.test.tsx` 회귀
- [ ] **Step 3**: typecheck → Commit — `refactor(admin-settings): 폼 내부 에디터 컴포넌트 4종과 정규화 헬퍼 파일 분리`

### Task 13: `HousingBenchmarkComparison.tsx` 분해 (523줄)

**Files:**
- Create: `widgets/benchmark-comparison/model/benchmarkPeriods.ts` + 테스트, `model/useBenchmarkFilters.ts`, `model/useBenchmarkStrategyOptions.ts`, `BenchmarkFilterBar.tsx`, `BenchmarkStates.tsx`
- Modify: `HousingBenchmarkComparison.tsx` (컨테이너로 축소) — 기존 590줄 테스트 무수정 통과. **props `{ enabled, defaultTo }` 불변** (speed 플랜 Task 8과의 계약)

**이동 지도:**
- `benchmarkPeriods.ts` (순수): `Period`(26), `HOUSING_PERIODS`/`ETF_PERIODS`(38-52), `toMonthInput`/`fromMonthInput`/`subtractMonths`(54-74), `emptyMessage`(133-141), `isHousingQuintile`(143-145), `uniqueSymbols`(149-151)
- `useBenchmarkFilters.ts`: 필터 useState 전부(190-219) + `from`/`to`/`selection`/`params` 파생(247-275) → `useBenchmarkFilters(defaultTo, runtimeEtf: { symbols; defaultSymbol })` 반환 `{ scope, setScope, activeAsset, setActiveAsset, quintile, setQuintile, etfSymbol, handleEtfSymbolChange, period, setPeriod, periods, isCustomPeriod, customFromMonth…customToDate 4쌍, selectedStrategyId, setSelectedStrategyId, selection, from, to, buildParams(effectiveStrategyId) }`
- `useBenchmarkStrategyOptions.ts`: 221-246 → `(enabled, isStrategyScope, selectedStrategyId)` — 전략+계좌 쿼리, MOCK 필터, `effectiveStrategyId`, failed/loading/empty 플래그
- `BenchmarkFilterBar.tsx`: 311-469 JSX + `ToggleButton`(76-100)·`AssetTabButton`(153-174)·`ASSET_SELECT_CLASS`
- `BenchmarkStates.tsx`: `BenchmarkLoading`(102-118), `StrategyListLoading`(120-131)
- 잔류: runtime-config ETF 파생(177-189), fallback·라벨 파생(277-309), 결과 렌더 분기(471-521)

- [ ] **Step 1**: `benchmarkPeriods` 특성화 테스트(`subtractMonths` 윤년·월말 클램프 포함) → 순수 모듈 이동
- [ ] **Step 2**: 훅 2개 → JSX 분리 순서, 매 단계 `npm run test:run -- widgets/benchmark-comparison` 녹색 유지 (T7과 파일 비중첩 — 병렬 가능)
- [ ] **Step 3**: typecheck → Commit — `refactor(benchmark): 필터 상태 훅·기간 순수 모듈·필터 바 컴포넌트 분리`

### Task 14: 위젯 cross-import 정책 명문화 (문서 전용 — 검수 예외)

**Files:** Modify: `docs/agents/widgets.md`

- [ ] **Step 1**: 공용 위젯 화이트리스트를 닫힌 목록으로 확정 — `layout`, `page-header`, `kpi-card`, `revealable-value`, `theme-toggle`, `glass-card`, `pull-to-refresh`, **`account-card`**, **`strategy-card`**, **`cycle-history`**, **`strategy-list`**. "등" 표현 제거, "목록 외 위젯 간 import 금지, 페이지 위젯 조합은 app 계층 slot으로" 규칙 추가. 잔여 위반은 `widgets/dashboard` → `market-holiday-calendar`/`fear-greed-card` 2건뿐이며 T16에서 해소 예정임을 명시
- [ ] **Step 2**: Commit — `docs(widgets): 공용 위젯 화이트리스트 확정 및 cross-import 규칙 명문화`

---

## Group 3 — dashboard (speed 플랜 머지로 게이트 해제, 즉시 가능)

### ~~T15~~: 종료

- fcm 타입 원천 import: `7b18875`로 **이미 완료** (`FcmAutoRegister.tsx:5`이 `@shared/lib/api-schema`에서 import 확인).
- meta `API_BASE_URL` SSOT → **T1로 흡수**. layout `'kista-user-role'` 리터럴 → **T2로 흡수**.
- 별도 태스크 없음.

### Task 16: market queryOptions + dashboard 위젯 조합 app 이관

**Files:**
- Create: `entities/market/model/queryOptions.ts` + 테스트
- Modify: `entities/market/hooks/useMarketQueries.ts:9-18`, `entities/market/index.ts`, `app/(main)/dashboard/page.tsx` (speed Task 2 적용 후 기준 — `kstWeekStartDate()` 유지), `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx`, `widgets/dashboard/DashboardContent.tsx`·`DashboardEmpty.tsx`·`DashboardOverview.tsx`, `docs/agents/entities.md`·`docs/agents/cache-policy.md` (holidays initialData 예외 서술 갱신)

**Interfaces (Produces):**

```ts
// entities/market/model/queryOptions.ts — server-safe. queryFn은 token 유무 3분기를 factory 내부에서 정리
export function monthlyHolidaysQueryOptions(year: number, month: number, token?: string)
//   queryKey: marketKeys.holidays(year, month), staleTime: 24h
//   server+token → getMonthlyHolidays / server 비인증 → public 엔드포인트 / client → getMonthlyHolidaysClient
// DashboardEmpty·DashboardOverview에 slot prop 추가: { marketPanels: ReactNode; chartPanels: ReactNode }
```

- [ ] **Step 1**: queryOptions TDD → `useMonthlyHolidaysQuery(year, month)`에서 `initialData` 파라미터와 24h/0 이중 staleTime 분기 제거. 기존 "실패한 서버 조회를 빈 달로 24시간 hydrate 금지" 시맨틱은 prefetch `.catch(() => undefined)` 시 dehydrate 미포함 → 클라이언트 재조회로 보존됨을 테스트에 명시
- [ ] **Step 2**: `dashboard/page.tsx` — `holidays` prop 제거, `prefetchQuery(monthlyHolidaysQueryOptions(...))`로 교체 (기존 try/catch·public fallback 로직 단순화)
- [ ] **Step 3**: `WeeklyMarketCalendar`가 `accountIds` prop 대신 `useAccountsQuery()` 캐시에서 계좌 ID 파생 → `DashboardEmpty`/`DashboardOverview`의 `market-holiday-calendar`·`fear-greed-card` import 제거 + slot prop 추가 → 조합은 `app/(main)/dashboard/page.tsx`에서 `<DashboardContent marketPanels={<><WeeklyMarketCalendar /><FearGreedSection /></>} …/>`
- [ ] **Step 4**: `npm run test:run -- entities/market widgets/dashboard widgets/market-holiday-calendar "app/(main)/dashboard"` + typecheck
- [ ] **Step 5**: Commit — `refactor(dashboard): 휴장일 hydration 이관 및 대시보드 위젯 조합을 app 계층 slot으로 이동`

---

## 최종 통합 검증 (오케스트레이터, 그룹별 완료 시)

- [ ] `npm run test:run` 전체 PASS, `npm run typecheck` exit 0, `npm run build` 성공
- [ ] `fsd-boundary-checker` 에이전트 실행 — cross-import 위반 0건 확인 (T14a 화이트리스트 기준)
- [ ] 시각 검증 (로컬 kista-api가 떠 있는 경우에만 — 임의 기동 금지): `/dashboard`, `/accounts/[id]/strategies/[sid]`, `/benchmark`, `/settings`, `/admin/users` Playwright 스크린샷
- [ ] 문서 드리프트: `docs/agents/shared.md`(env·normalize·cookies 신규 모듈), `docs/agents/entities.md`(order/market queryOptions), `README.md` 아키텍처 서술 영향 확인

## 리스크 메모

- **T4가 인프라 최대 리스크** — `proxy()` 시나리오 테스트 보강(Step 1)을 구현보다 먼저. 회귀 시 전 사용자 인증 장애.
- **T11이 회귀 최대 리스크** — `useStrategyForm.test.ts`(1089줄) 무수정 통과가 완료 조건. `cannotSubmit`/`submitDisabledReason` 비동치 분기를 통일하려는 유혹 금지(동작 보존).
- T3의 fcm 4xx relay, T16의 holidays 캐시 시맨틱은 의도된 동작 변경 — 각 테스트에 의도 주석 명시.
- Group 2는 Group 1과 파일 비중첩이라 병행 가능하나, 최종 머지는 Group 1 커밋 후 리베이스 순서 권장.
- T9의 order queryOptions는 speed 플랜 Task 7이 만드는 `entities/stats/model/queryOptions.ts`와 스타일(60s staleTime, `queryOptions` 헬퍼) 통일.
