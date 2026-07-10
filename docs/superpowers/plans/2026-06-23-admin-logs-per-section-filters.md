# 운영 로그 섹션별 독립 필터 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 로그 페이지의 이상 징후·오류 로그·감사 로그 섹션에 각각 독립적인 기간 필터와 페이지 사이즈 드롭다운을 추가한다.

**Architecture:** kista-api의 `/api/admin/logs/anomalies` 엔드포인트에 `from`/`to` 파라미터를 추가하고, kista-ui의 `RangeFilterBar`에 `paramPrefix` prop을 추가해 섹션별 URL 파라미터(`anoRange`/`errRange`/`audRange` 등)를 독립적으로 관리한다. 공통 기간 필터를 제거하고 각 섹션이 자체 필터 UI를 갖는다.

**Tech Stack:** Java 21 + Spring Boot 3 (kista-api), Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui (kista-ui)

## Global Constraints

- kista-ui: 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백 (`.prettierrc` 기준)
- kista-ui: `style={{ ... }}` 인라인 금지 (CSS 변수 제외) — Tailwind 클래스만 사용
- kista-ui: FSD 의존성 — `app → widgets → features → entities → shared`
- kista-api: `git -C /Users/phs/workspace/kista/kista-api` 로 작업
- 커밋 author: `narafu <narafu@kakao.com>`

---

## 파일 맵

### kista-api

| 상태 | 파일 |
|---|---|
| 수정 | `src/main/java/com/kista/domain/port/in/AdminQueryUseCase.java` |
| 수정 | `src/main/java/com/kista/application/service/admin/AdminQueryService.java` |
| 수정 | `src/main/java/com/kista/adapter/in/web/AdminObservabilityController.java` |
| 수정 | `src/test/java/com/kista/adapter/in/web/AdminObservabilityControllerTest.java` |

### kista-ui

| 상태 | 파일 |
|---|---|
| 수정 | `shared/ui/RangeFilterBar.tsx` |
| 수정 | `entities/user/api/index.ts` |
| 수정 | `app/(admin)/admin/logs/page.tsx` |
| 수정 | `features/admin/logs/LogsFilterChips.tsx` |

---

## Task 1: kista-api — anomalies 엔드포인트 from/to 지원

**Files:**
- Modify: `kista-api/src/main/java/com/kista/domain/port/in/AdminQueryUseCase.java`
- Modify: `kista-api/src/main/java/com/kista/application/service/admin/AdminQueryService.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/in/web/AdminObservabilityController.java`
- Test: `kista-api/src/test/java/com/kista/adapter/in/web/AdminObservabilityControllerTest.java`

**Interfaces:**
- Produces: `AdminQueryUseCase.getAnomalies(int inactiveDays, LocalDate from, LocalDate to)`
- `from`/`to` null이면 `inactiveDays` 기준 동작 (기존 하위 호환)
- `from`/`to` 있으면 해당 날짜 범위를 비활성 계좌 판정 기간으로 사용

- [ ] **Step 1: 테스트 추가** (`AdminObservabilityControllerTest.java`)

기존 `getAnomalies_adminRole_returns200` 테스트를 수정하고 from/to 파라미터 테스트를 추가한다.

```java
@Test
void getAnomalies_adminRole_returns200() throws Exception {
    when(adminQuery.getAnomalies(7, null, null))
            .thenReturn(new AdminAnomalies(List.of(), List.of()));
    when(adminUser.listAll(null, null)).thenReturn(List.of());

    mockMvc.perform(get("/api/admin/logs/anomalies")
                    .with(authentication(token(ADMIN_UUID, "ROLE_ADMIN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pausedAccounts").isArray())
            .andExpect(jsonPath("$.inactiveAccounts").isArray());
}

@Test
void getAnomalies_withDateRange_passesRangeToService() throws Exception {
    when(adminQuery.getAnomalies(7, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 6, 1)))
            .thenReturn(new AdminAnomalies(List.of(), List.of()));
    when(adminUser.listAll(null, null)).thenReturn(List.of());

    mockMvc.perform(get("/api/admin/logs/anomalies?from=2026-01-01&to=2026-06-01")
                    .with(authentication(token(ADMIN_UUID, "ROLE_ADMIN"))))
            .andExpect(status().isOk());
}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /Users/phs/workspace/kista/kista-api && ./gradlew test --tests "com.kista.adapter.in.web.AdminObservabilityControllerTest" 2>&1 | tail -20
```

Expected: 기존 `getAnomalies_adminRole_returns200`이 mock 시그니처 불일치로 실패.

- [ ] **Step 3: UseCase 인터페이스 변경**

`AdminQueryUseCase.java`의 `getAnomalies` 시그니처를 변경한다.

```java
// 변경 전
AdminAnomalies getAnomalies(int inactiveDays);

// 변경 후
AdminAnomalies getAnomalies(int inactiveDays, LocalDate from, LocalDate to);  // from/to null = inactiveDays 기준
```

- [ ] **Step 4: Service 구현 변경**

`AdminQueryService.java`의 `getAnomalies` 메서드를 수정한다.

```java
@Override
public AdminAnomalies getAnomalies(int inactiveDays, LocalDate from, LocalDate to) {
    LocalDate today = LocalDate.now(TimeZones.KST);
    LocalDate rangeFrom = from != null ? from : today.minusDays(inactiveDays);
    LocalDate rangeTo   = to   != null ? to   : today;
    List<Account> allAccounts = accountPort.findAll();

    List<Account> pausedAccounts = allAccounts.stream()
            .filter(a -> strategyPort.findByAccountId(a.id()).stream()
                    .anyMatch(Strategy::isPaused))
            .toList();

    Set<UUID> activeAccountIds = orderPort.findAll(rangeFrom, rangeTo)
            .stream().map(Order::accountId).collect(Collectors.toSet());

    List<Account> inactiveAccounts = allAccounts.stream()
            .filter(a -> strategyPort.findByAccountId(a.id()).stream()
                    .anyMatch(Strategy::isActive))
            .filter(a -> !activeAccountIds.contains(a.id()))
            .toList();

    return new AdminAnomalies(pausedAccounts, inactiveAccounts);
}
```

- [ ] **Step 5: Controller 변경**

`AdminObservabilityController.java`의 `getAnomalies` 메서드를 수정한다.

```java
@GetMapping("/anomalies")
public AnomaliesResponse getAnomalies(
        @RequestParam(defaultValue = "7") int inactiveDays,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    AdminAnomalies anomalies = adminQuery.getAnomalies(inactiveDays, from, to);
    Map<UUID, AdminUserView> userMap = adminUser.listAll(null, null).stream()
            .collect(Collectors.toMap(AdminUserView::id, Function.identity()));

    List<AccountItem> paused = anomalies.pausedAccounts().stream()
            .map(a -> AccountItem.from(a, userMap))
            .toList();
    List<AccountItem> inactive = anomalies.inactiveAccounts().stream()
            .map(a -> AccountItem.from(a, userMap))
            .toList();

    return new AnomaliesResponse(paused, inactive);
}
```

- [ ] **Step 6: 테스트 실행 — 통과 확인**

```bash
cd /Users/phs/workspace/kista/kista-api && ./gradlew test --tests "com.kista.adapter.in.web.AdminObservabilityControllerTest" 2>&1 | tail -20
```

Expected: 모든 테스트 PASS.

- [ ] **Step 7: 전체 빌드 확인**

```bash
cd /Users/phs/workspace/kista/kista-api && ./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 8: 커밋**

```bash
git -C /Users/phs/workspace/kista/kista-api add src/
git -C /Users/phs/workspace/kista/kista-api commit -m "feat(admin): anomalies API from/to 날짜 범위 파라미터 추가"
```

---

## Task 2: kista-ui — RangeFilterBar paramPrefix 지원

**Files:**
- Modify: `shared/ui/RangeFilterBar.tsx`

**Interfaces:**
- Produces: `RangeFilterBar` — `paramPrefix?: string` prop 추가
  - `paramPrefix='err'` → URL 파라미터 `errRange`/`errFrom`/`errTo` 사용
  - `paramPrefix` 없음 → 기존 `range`/`from`/`to` 사용 (하위 호환)

- [ ] **Step 1: RangeFilterBar.tsx 수정**

`shared/ui/RangeFilterBar.tsx`를 다음과 같이 수정한다.

```tsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type RangePreset = '7d' | '30d' | 'all' | 'custom'

const LABELS: Record<RangePreset, string> = {
  '7d': '7일',
  '30d': '30일',
  all: '전체',
  custom: '직접입력',
}

interface Props {
  current: RangePreset
  from?: string
  to?: string
  pageParamKeys?: string[]
  paramPrefix?: string
}

export function RangeFilterBar({ current, from, to, pageParamKeys = ['page'], paramPrefix }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  const rangeKey = paramPrefix ? `${paramPrefix}Range` : 'range'
  const fromKey  = paramPrefix ? `${paramPrefix}From`  : 'from'
  const toKey    = paramPrefix ? `${paramPrefix}To`    : 'to'

  function navigate(range: RangePreset, f?: string, t?: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(rangeKey, range)
    pageParamKeys.forEach((key) => params.set(key, '1'))
    if (range === 'custom' && f && t) {
      params.set(fromKey, f)
      params.set(toKey, t)
    } else {
      params.delete(fromKey)
      params.delete(toKey)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {(['7d', '30d', 'all', 'custom'] as RangePreset[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => navigate(r, customFrom, customTo)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              current === r
                ? 'bg-rose-50 text-rose-600'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {LABELS[r]}
          </button>
        ))}
      </div>
      {current === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            aria-label="시작 날짜"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => navigate('custom', customFrom, customTo)}
            disabled={!customFrom || !customTo}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            적용
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
cd /Users/phs/workspace/kista/kista-ui && git add shared/ui/RangeFilterBar.tsx && git commit -m "feat(shared): RangeFilterBar paramPrefix prop 추가"
```

---

## Task 3: kista-ui — getAdminAnomalies API 함수 업데이트

**Files:**
- Modify: `entities/user/api/index.ts`

**Interfaces:**
- Consumes: kista-api `GET /api/admin/logs/anomalies?inactiveDays=&from=&to=`
- Produces: `getAdminAnomalies(token, inactiveDays?, from?, to?): Promise<AdminAnomalies>`

- [ ] **Step 1: entities/user/api/index.ts 수정**

`getAdminAnomalies` 함수에 `from`/`to` 파라미터를 추가한다.

```ts
export async function getAdminAnomalies(token: string, inactiveDays?: number, from?: string, to?: string): Promise<AdminAnomalies> {
  const params = new URLSearchParams()
  if (inactiveDays != null) params.set('inactiveDays', String(inactiveDays))
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.size ? `?${params}` : ''
  return apiFetch<AdminAnomalies>(`/api/admin/logs/anomalies${query}`, { method: 'GET' }, token)
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: 오류 없음.

- [ ] **Step 3: 커밋**

```bash
cd /Users/phs/workspace/kista/kista-ui && git add entities/user/api/index.ts && git commit -m "feat(entities): getAdminAnomalies from/to 파라미터 추가"
```

---

## Task 4: kista-ui — page.tsx 섹션별 필터 리팩토링

**Files:**
- Modify: `app/(admin)/admin/logs/page.tsx`

**Interfaces:**
- Consumes:
  - `RangeFilterBar` — `paramPrefix`, `current`, `from`, `to`, `pageParamKeys` props
  - `PageSizeSelector` — `value`, `pageParamKeys` props
  - `InactiveDaysSelect` — `current` prop (기존 유지)
  - `getAdminAnomalies(token, inactiveDays, from, to)`
  - `listAdminAuditLogs(token, from, to)`
  - `listAdminErrorLogs(token, 500, from, to)`
- URL 파라미터: `anoRange`/`anoFrom`/`anoTo` / `errRange`/`errFrom`/`errTo`/`errSize` / `audRange`/`audFrom`/`audTo`/`audSize`

- [ ] **Step 1: page.tsx 전체 교체**

`app/(admin)/admin/logs/page.tsx`를 다음으로 교체한다.

```tsx
import { Suspense } from 'react'
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies } from '@entities/user'
import type { AdminAuditLog, AppErrorLog, AdminAnomalies, AdminAnomalyAccount } from '@entities/user'
import { ErrorLogItem } from '@features/admin/error-logs'
import { LogsFilterChips, InactiveDaysSelect } from '@features/admin/logs'
import { RevealableValue } from '@widgets/revealable-value'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

type LogType = 'all' | 'audit' | 'error' | 'anomaly'

const VALID_SIZES = ['10', '30', '50', '100'] as const
const EMPTY_ANOMALIES: AdminAnomalies = { pausedAccounts: [], inactiveAccounts: [] }

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function parseInactiveDays(raw: string | undefined): number {
  const n = Number(raw)
  return [7, 14, 30].includes(n) ? n : 7
}

function resolveFromTo(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return { from, to }
  const days = range === '7d' ? 7 : 30
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  return {
    from: fromDate.toISOString().split('T')[0],
    to: toDate.toISOString().split('T')[0],
  }
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string
    anoRange?: string; anoFrom?: string; anoTo?: string
    errRange?: string; errFrom?: string; errTo?: string; errSize?: string
    audRange?: string; audFrom?: string; audTo?: string; audSize?: string
    ap?: string; ep?: string
    inactiveDays?: string
  }>
}) {
  const params = await searchParams
  const logType = (params.type ?? 'all') as LogType

  const anoRange = parseRangePreset(params.anoRange)
  const errRange = parseRangePreset(params.errRange)
  const audRange = parseRangePreset(params.audRange)
  const errSize  = parseSize(params.errSize)
  const audSize  = parseSize(params.audSize)
  const inactiveDays = parseInactiveDays(params.inactiveDays)
  const token = await getAuthToken()

  const showAudit   = logType === 'all' || logType === 'audit'
  const showError   = logType === 'all' || logType === 'error'
  const showAnomaly = logType === 'all' || logType === 'anomaly'

  const { from: anoFrom, to: anoTo } = resolveFromTo(anoRange, params.anoFrom, params.anoTo)
  const { from: errFrom, to: errTo } = resolveFromTo(errRange, params.errFrom, params.errTo)
  const { from: audFrom, to: audTo } = resolveFromTo(audRange, params.audFrom, params.audTo)

  const [allAuditLogs, allErrorLogs, anomalies] = await Promise.all([
    showAudit && token
      ? listAdminAuditLogs(token, audFrom, audTo).catch(() => [] as AdminAuditLog[])
      : ([] as AdminAuditLog[]),
    showError && token
      ? listAdminErrorLogs(token, 500, errFrom, errTo).catch(() => [] as AppErrorLog[])
      : ([] as AppErrorLog[]),
    showAnomaly && token
      ? getAdminAnomalies(token, inactiveDays, anoFrom, anoTo).catch(() => EMPTY_ANOMALIES)
      : EMPTY_ANOMALIES,
  ])

  const auditTotalPages = Math.max(1, Math.ceil(allAuditLogs.length / audSize))
  const errorTotalPages = Math.max(1, Math.ceil(allErrorLogs.length / errSize))
  const auditPage = Math.min(parsePage(params.ap), auditTotalPages)
  const errorPage = Math.min(parsePage(params.ep), errorTotalPages)

  const auditLogs = allAuditLogs.slice((auditPage - 1) * audSize, auditPage * audSize)
  const errorLogs = allErrorLogs.slice((errorPage - 1) * errSize, errorPage * errSize)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">감사 · 오류 · 이상 징후 통합 뷰</p>
      </div>

      <div className="mb-6">
        <Suspense fallback={null}><LogsFilterChips /></Suspense>
      </div>

      <div className="space-y-8">
        {showAnomaly && (
          <AnomaliesSection
            anomalies={anomalies}
            inactiveDays={inactiveDays}
            range={anoRange}
            from={params.anoFrom}
            to={params.anoTo}
          />
        )}
        {showError && (
          <ErrorLogsSection
            logs={errorLogs}
            total={allErrorLogs.length}
            page={errorPage}
            totalPages={errorTotalPages}
            size={errSize}
            range={errRange}
            from={params.errFrom}
            to={params.errTo}
          />
        )}
        {showAudit && (
          <AuditLogsSection
            logs={auditLogs}
            total={allAuditLogs.length}
            page={auditPage}
            totalPages={auditTotalPages}
            size={audSize}
            range={audRange}
            from={params.audFrom}
            to={params.audTo}
          />
        )}
      </div>
    </div>
  )
}

// ── 이상 징후 섹션 ──────────────────────────────────────────────────────────
function AnomaliesSection({
  anomalies, inactiveDays, range, from, to,
}: {
  anomalies: AdminAnomalies
  inactiveDays: number
  range: RangePreset
  from?: string
  to?: string
}) {
  const total = anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length
  return (
    <section>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-bold">
          이상 징후
          {total > 0 && (
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {total}
            </span>
          )}
        </h2>
        <Suspense fallback={null}>
          <InactiveDaysSelect current={inactiveDays} />
        </Suspense>
      </div>
      <div className="mb-4">
        <Suspense fallback={null}>
          <RangeFilterBar current={range} from={from} to={to} paramPrefix="ano" pageParamKeys={[]} />
        </Suspense>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            일시정지 계좌
            {anomalies.pausedAccounts.length > 0 && (
              <span className="ml-2 normal-case font-medium text-amber-600">
                {anomalies.pausedAccounts.length}
              </span>
            )}
          </p>
          {anomalies.pausedAccounts.length === 0 ? (
            <EmptyState text="일시정지된 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.pausedAccounts} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            비활성 계좌{' '}
            <span className="normal-case font-normal">({inactiveDays}일 거래 없음)</span>
            {anomalies.inactiveAccounts.length > 0 && (
              <span className="ml-2 font-medium text-slate-600">
                {anomalies.inactiveAccounts.length}
              </span>
            )}
          </p>
          {anomalies.inactiveAccounts.length === 0 ? (
            <EmptyState text="비활성 계좌가 없습니다" />
          ) : (
            <AccountTable accounts={anomalies.inactiveAccounts} />
          )}
        </div>
      </div>
    </section>
  )
}

// ── 오류 로그 섹션 ──────────────────────────────────────────────────────────
function ErrorLogsSection({
  logs, total, page, totalPages, size, range, from, to,
}: {
  logs: AppErrorLog[]
  total: number
  page: number
  totalPages: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-bold">
          오류 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
        </h2>
        <Suspense fallback={null}>
          <PageSizeSelector value={String(size)} pageParamKeys={['ep']} sizeParamKey="errSize" />
        </Suspense>
      </div>
      <div className="mb-4">
        <Suspense fallback={null}>
          <RangeFilterBar current={range} from={from} to={to} paramPrefix="err" pageParamKeys={['ep']} />
        </Suspense>
      </div>
      {logs.length === 0 ? (
        <EmptyState text="기록된 오류가 없습니다" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <ErrorLogItem key={log.id} log={log} />
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ep" />
    </section>
  )
}

// ── 감사 로그 섹션 ──────────────────────────────────────────────────────────
function AuditLogsSection({
  logs, total, page, totalPages, size, range, from, to,
}: {
  logs: AdminAuditLog[]
  total: number
  page: number
  totalPages: number
  size: number
  range: RangePreset
  from?: string
  to?: string
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-base font-bold">
          감사 로그
          <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
        </h2>
        <Suspense fallback={null}>
          <PageSizeSelector value={String(size)} pageParamKeys={['ap']} sizeParamKey="audSize" />
        </Suspense>
      </div>
      <div className="mb-4">
        <Suspense fallback={null}>
          <RangeFilterBar current={range} from={from} to={to} paramPrefix="aud" pageParamKeys={['ap']} />
        </Suspense>
      </div>
      {logs.length === 0 ? (
        <EmptyState text="감사 로그가 없습니다" />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                      {log.action}
                    </span>
                    {log.targetType && (
                      <span className="text-sm text-muted-foreground">
                        {log.targetType}
                        {log.targetId ? ` · ${log.targetId.slice(0, 8)}…` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">
                    admin: {log.adminId.slice(0, 8)}…
                  </p>
                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <pre className="mt-1 text-sm text-muted-foreground bg-muted/40 rounded p-1 overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
                <time className="text-sm text-muted-foreground shrink-0">
                  {new Date(log.createdAt).toLocaleString('ko-KR')}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationBar page={page} totalPages={totalPages} pageParam="ap" />
    </section>
  )
}

// ── 공통 서브컴포넌트 ────────────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function AccountTable({ accounts }: { accounts: AdminAnomalyAccount[] }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">소유자</th>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">계좌번호</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((a) => (
            <tr key={a.id} className="hover:bg-muted/20">
              <td className="px-4 py-2.5 font-medium">{a.ownerNickname}</td>
              <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">
                <RevealableValue
                  value={a.accountNoMasked ?? ''}
                  hiddenDisplay={a.accountNoMasked ?? ''}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

> **주의:** `PageSizeSelector`에 `sizeParamKey` prop을 사용하고 있다. 이 prop이 없으면 Task 4 Step 2 타입 오류가 발생하며 Task 5에서 추가한다.

- [ ] **Step 2: 타입 체크 (오류 예상)**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | grep -E "error TS" | head -20
```

Expected: `PageSizeSelector`의 `sizeParamKey` prop 관련 오류 발생 (Task 5에서 해결).

---

## Task 5: kista-ui — PageSizeSelector sizeParamKey 지원 + LogsFilterChips 업데이트

**Files:**
- Modify: `shared/ui/PageSizeSelector.tsx`
- Modify: `features/admin/logs/LogsFilterChips.tsx`

**Interfaces:**
- Consumes: Task 4의 `PageSizeSelector` 호출 — `sizeParamKey?: string` prop
- `sizeParamKey` 있으면 `?{sizeParamKey}=` 파라미터 사용, 없으면 기존 `?size=` 유지

- [ ] **Step 1: PageSizeSelector.tsx 수정**

`shared/ui/PageSizeSelector.tsx`를 수정해 `sizeParamKey` prop을 추가한다.

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SIZES = ['10', '30', '50', '100']

interface Props {
  value: string
  onChange?: (size: string) => void
  pageParamKeys?: string[]
  sizeParamKey?: string
}

export function PageSizeSelector({ value, onChange, pageParamKeys = ['page'], sizeParamKey = 'size' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (size: string | null) => {
    if (!size) return
    if (onChange) {
      onChange(size)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set(sizeParamKey, size)
    pageParamKeys.forEach((key) => params.set(key, '1'))
    router.push(`?${params.toString()}`)
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-24 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SIZES.map((s) => (
          <SelectItem key={s} value={s}>{s}개</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

- [ ] **Step 2: LogsFilterChips.tsx 수정**

파라미터 보존 목록에서 `range` 제거, 섹션별 파라미터 추가.

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const FILTERS = [
  { type: 'all',     label: '전체' },
  { type: 'anomaly', label: '이상 징후' },
  { type: 'error',   label: '오류 로그' },
  { type: 'audit',   label: '감사 로그' },
] as const

const PRESERVE_KEYS = [
  'anoRange', 'anoFrom', 'anoTo',
  'errRange', 'errFrom', 'errTo', 'errSize',
  'audRange', 'audFrom', 'audTo', 'audSize',
  'inactiveDays',
]

export function LogsFilterChips() {
  const searchParams = useSearchParams()
  const active = searchParams.get('type') ?? 'all'

  function buildHref(type: string) {
    const params = new URLSearchParams()
    if (type !== 'all') params.set('type', type)
    for (const key of PRESERVE_KEYS) {
      const v = searchParams.get(key)
      if (v) params.set(key, v)
    }
    const qs = params.toString()
    return qs ? `/admin/logs?${qs}` : '/admin/logs'
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(({ type, label }) => (
        <Link
          key={type}
          href={buildHref(type)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === type
              ? 'bg-rose-100 text-rose-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: 타입 체크 — 오류 없음 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run typecheck 2>&1 | grep -E "error TS" | head -20
```

Expected: 오류 없음.

- [ ] **Step 4: 커밋 (Task 4·5 통합)**

```bash
cd /Users/phs/workspace/kista/kista-ui && git add "app/(admin)/admin/logs/page.tsx" shared/ui/PageSizeSelector.tsx "features/admin/logs/LogsFilterChips.tsx" && git commit -m "feat(admin): 운영 로그 섹션별 독립 기간 필터·사이즈 드롭다운 추가"
```
