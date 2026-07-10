# Admin 기간 조회 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 거래내역·계좌현황·사용자목록·운영로그 4페이지에 날짜 범위 필터를 추가하고, kista-api를 서버 수준에서 필터링하도록 변경한다.

**Architecture:** kista-api 컨트롤러에 `from`/`to` (LocalDate, optional) 파라미터를 추가하고, 각 서비스/어댑터 계층에서 필터를 적용한다. kista-ui는 `RangeFilterBar`를 `shared/ui/`로 이동해 4페이지가 공통으로 재사용한다. UI 기본 프리셋은 7일, API 미전달 기본값은 전체(제한 없음)로 통일한다.

**Tech Stack:** Java 21, Spring Boot 3, Spring Data JPA, Next.js 16 App Router (Server Component), TypeScript, Tailwind CSS

---

## 파일 맵

### kista-api
| 파일 | 변경 유형 |
|---|---|
| `domain/model/account/Account.java` | 수정 — `createdAt: Instant` 필드 추가 |
| `adapter/out/persistence/account/AccountPersistenceAdapter.java` | 수정 — `toDomain()` createdAt 매핑 추가 |
| `application/service/account/AccountService.java` | 수정 — Account 생성자 호출에 `null` createdAt 추가 |
| `domain/port/in/AdminQueryUseCase.java` | 수정 — `listTrades`, `listAccounts`, `listAuditLogs`, `getAnomalies` 시그니처 변경 |
| `application/service/admin/AdminQueryService.java` | 수정 — 동적 날짜 필터 적용 |
| `domain/port/in/AdminUserUseCase.java` | 수정 — `listAll`, `listByStatus` 시그니처 변경 |
| `application/service/admin/AdminService.java` | 수정 — in-memory 날짜 필터 적용 |
| `domain/port/out/AuditLogPort.java` | 수정 — `findAll(Instant from, Instant to)` 추가 |
| `adapter/out/persistence/audit/AuditLogJpaRepository.java` | 수정 — 날짜 범위 쿼리 메서드 추가 |
| `adapter/out/persistence/audit/AuditLogPersistenceAdapter.java` | 수정 — 날짜 필터 구현 |
| `domain/port/out/AppErrorLogPort.java` | 수정 — `findRecent(int, Instant, Instant)` 추가 |
| `adapter/out/persistence/audit/AppErrorLogJpaRepository.java` | 수정 — 날짜 범위 쿼리 메서드 추가 |
| `adapter/out/persistence/audit/AppErrorLogPersistenceAdapter.java` | 수정 — 날짜 필터 구현 |
| `adapter/in/web/AdminTradeController.java` | 수정 — `from`/`to` @RequestParam 추가 |
| `adapter/in/web/AdminAccountController.java` | 수정 — `from`/`to` @RequestParam 추가 |
| `adapter/in/web/AdminUserController.java` | 수정 — `from`/`to` @RequestParam 추가 |
| `adapter/in/web/AdminObservabilityController.java` | 수정 — `from`/`to` + `inactiveDays` @RequestParam 추가 |

### kista-ui
| 파일 | 변경 유형 |
|---|---|
| `shared/ui/RangeFilterBar.tsx` | 신규 (widgets에서 이동) |
| `widgets/admin-privacy-trade-list/RangeFilterBar.tsx` | 삭제 후 shared/ui re-export |
| `entities/user/api/index.ts` | 수정 — 6개 API 함수에 날짜 파라미터 추가 |
| `app/(admin)/admin/trades/page.tsx` | 수정 — RangeFilterBar + range searchParam |
| `app/(admin)/admin/accounts/page.tsx` | 수정 — RangeFilterBar + range searchParam |
| `app/(admin)/admin/users/page.tsx` | 수정 — RangeFilterBar + range searchParam |
| `app/(admin)/admin/logs/page.tsx` | 수정 — RangeFilterBar + inactiveDays searchParam |
| `app/(admin)/admin/privacy-trades/page.tsx` | 수정 — import 경로 변경 |
| `features/admin/logs/InactiveDaysSelect.tsx` | 신규 — 드롭다운 Client Component |
| `features/admin/logs/index.ts` | 수정 — InactiveDaysSelect re-export 추가 |

---

## Task 1: RangeFilterBar shared/ui로 이동

**Files:**
- Create: `kista-ui/shared/ui/RangeFilterBar.tsx`
- Modify: `kista-ui/widgets/admin-privacy-trade-list/RangeFilterBar.tsx`
- Modify: `kista-ui/app/(admin)/admin/privacy-trades/page.tsx`

- [ ] **Step 1: shared/ui/RangeFilterBar.tsx 생성**

`widgets/admin-privacy-trade-list/RangeFilterBar.tsx` 내용 그대로 복사:

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
}

export function RangeFilterBar({ current, from, to }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  function navigate(range: RangePreset, f?: string, t?: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    params.set('page', '1')
    if (range === 'custom' && f && t) {
      params.set('from', f)
      params.set('to', t)
    } else {
      params.delete('from')
      params.delete('to')
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

- [ ] **Step 2: widgets/admin-privacy-trade-list/RangeFilterBar.tsx → re-export로 교체**

기존 파일 내용을 아래로 교체 (호환성 유지):

```tsx
export { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
```

- [ ] **Step 3: privacy-trades/page.tsx import 경로 수정**

```tsx
// 변경 전
import { RangeFilterBar, type RangePreset } from '@widgets/admin-privacy-trade-list/RangeFilterBar'
// 변경 후
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'
```

- [ ] **Step 4: 타입 검사 통과 확인**

```bash
cd /c/Users/USER/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add "shared/ui/RangeFilterBar.tsx" "widgets/admin-privacy-trade-list/RangeFilterBar.tsx" "app/(admin)/admin/privacy-trades/page.tsx"
git commit -m "refactor(admin): RangeFilterBar를 shared/ui로 이동"
```

---

## Task 2: Account 도메인 createdAt 추가

**Files:**
- Modify: `kista-api/src/main/java/com/kista/domain/model/account/Account.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/out/persistence/account/AccountPersistenceAdapter.java`
- Modify: `kista-api/src/main/java/com/kista/application/service/account/AccountService.java`

- [ ] **Step 1: Account.java — createdAt 필드 추가**

```java
public record Account(
        UUID id,
        UUID userId,
        String nickname,
        String accountNo,
        String appKey,
        String secretKey,
        String brokerAccountCode,
        Broker broker,
        Instant createdAt    // 추가 — DB created_at, 신규 등록 시 null
) {
    // withNickname도 createdAt 포함
    public Account withNickname(String newNickname) {
        return new Account(id, userId, newNickname != null ? newNickname : nickname,
                accountNo, appKey, secretKey, brokerAccountCode, broker, createdAt);
    }
    // ... 나머지 기존 코드 유지
}
```

- [ ] **Step 2: AccountPersistenceAdapter.java — toDomain() createdAt 매핑**

```java
private Account toDomain(AccountEntity e) {
    return new Account(
            e.getId(), e.getUserId(), e.getNickname(),
            crypto.decrypt(e.getAccountNo()),
            crypto.decrypt(e.getAppKey()),
            crypto.decrypt(e.getSecretKey()),
            e.getBrokerAccountCode(),
            e.getBroker(),
            e.getCreatedAt()    // 추가
    );
}
```

- [ ] **Step 3: AccountService.java — Account 생성자 호출에 null createdAt 추가**

신규 계좌 생성 시 createdAt은 DB가 설정하므로 null 전달:

```java
Account account = new Account(
        null, userId, cmd.nickname(),
        cmd.accountNo(), cmd.appKey(), cmd.secretKey(),
        brokerAccountCode,
        broker,
        null    // createdAt — DB에서 자동 설정
);
```

- [ ] **Step 4: 컴파일 확인**

```bash
cd /c/Users/USER/workspace/kista/kista-api && ./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: 커밋**

```bash
git add src/main/java/com/kista/domain/model/account/Account.java \
        src/main/java/com/kista/adapter/out/persistence/account/AccountPersistenceAdapter.java \
        src/main/java/com/kista/application/service/account/AccountService.java
git commit -m "feat(account): Account 도메인에 createdAt 필드 추가"
```

---

## Task 3: AdminQueryUseCase/Service — 거래내역·계좌현황 날짜 필터

**Files:**
- Modify: `kista-api/src/main/java/com/kista/domain/port/in/AdminQueryUseCase.java`
- Modify: `kista-api/src/main/java/com/kista/application/service/admin/AdminQueryService.java`

- [ ] **Step 1: AdminQueryUseCase.java — 시그니처 변경**

```java
public interface AdminQueryUseCase {
    AdminStats getStats();
    List<Account> listAccounts(LocalDate from, LocalDate to);   // null = 전체
    List<Order> listTrades(LocalDate from, LocalDate to);       // null = 전체
    List<AuditLog> listAuditLogs(Instant from, Instant to);     // null = 전체
    AdminAnomalies getAnomalies(int inactiveDays);
    List<PrivacyTradeBaseView> listPrivacyBases(Integer days);
}
```

- [ ] **Step 2: AdminQueryService.java — listTrades 동적 날짜 적용**

```java
@Override
public List<Order> listTrades(LocalDate from, LocalDate to) {
    LocalDate f = from != null ? from : LocalDate.EPOCH;
    LocalDate t = to   != null ? to   : LocalDate.now(TimeZones.KST);
    return orderPort.findAll(f, t);
}
```

- [ ] **Step 3: AdminQueryService.java — listAccounts 날짜 필터 (in-memory)**

```java
@Override
public List<Account> listAccounts(LocalDate from, LocalDate to) {
    List<Account> all = accountPort.findAll();
    if (from == null && to == null) return all;
    return all.stream()
            .filter(a -> {
                if (a.createdAt() == null) return true;
                LocalDate d = a.createdAt().atZone(TimeZones.KST).toLocalDate();
                return (from == null || !d.isBefore(from))
                    && (to   == null || !d.isAfter(to));
            })
            .toList();
}
```

- [ ] **Step 4: AdminQueryService.java — getAnomalies inactiveDays 파라미터 적용**

```java
@Override
public AdminAnomalies getAnomalies(int inactiveDays) {
    LocalDate today = LocalDate.now(TimeZones.KST);
    List<Account> allAccounts = accountPort.findAll();

    List<Account> pausedAccounts = allAccounts.stream()
            .filter(a -> strategyPort.findByAccountId(a.id()).stream()
                    .anyMatch(Strategy::isPaused))
            .toList();

    Set<UUID> activeAccountIds = orderPort.findAll(today.minusDays(inactiveDays), today)
            .stream().map(Order::accountId).collect(Collectors.toSet());

    List<Account> inactiveAccounts = allAccounts.stream()
            .filter(a -> strategyPort.findByAccountId(a.id()).stream()
                    .anyMatch(Strategy::isActive))
            .filter(a -> !activeAccountIds.contains(a.id()))
            .toList();

    return new AdminAnomalies(pausedAccounts, inactiveAccounts);
}
```

- [ ] **Step 5: AdminQueryService.java — listAuditLogs 스텁 (Task 5에서 완성)**

Task 5 전까지 컴파일을 통과시키기 위해 임시 구현:

```java
@Override
public List<AuditLog> listAuditLogs(Instant from, Instant to) {
    return auditLogPort.findAll(); // Task 5에서 날짜 필터 추가
}
```

- [ ] **Step 6: 컴파일 확인**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 7: 커밋**

```bash
git add src/main/java/com/kista/domain/port/in/AdminQueryUseCase.java \
        src/main/java/com/kista/application/service/admin/AdminQueryService.java
git commit -m "feat(admin): 거래내역·계좌현황 날짜 필터 서비스 구현"
```

---

## Task 4: AdminUserUseCase/Service — 사용자 날짜 필터

**Files:**
- Modify: `kista-api/src/main/java/com/kista/domain/port/in/AdminUserUseCase.java`
- Modify: `kista-api/src/main/java/com/kista/application/service/admin/AdminService.java`

- [ ] **Step 1: AdminUserUseCase.java — listAll, listByStatus 시그니처 변경**

```java
public interface AdminUserUseCase {
    List<AdminUserView> listAll(LocalDate from, LocalDate to);   // null = 전체
    List<AdminUserView> listByStatus(User.UserStatus status, LocalDate from, LocalDate to);
    void approveUser(UUID adminId, UUID targetUserId);
    void rejectUser(UUID adminId, UUID targetUserId);
    void changeRole(UUID adminId, UUID targetUserId, User.UserRole role);
    void deleteUser(UUID adminId, UUID targetUserId);
}
```

- [ ] **Step 2: AdminService.java — listAll 날짜 필터 (in-memory)**

```java
@Override
@Transactional(readOnly = true)
public List<AdminUserView> listAll(LocalDate from, LocalDate to) {
    return filterByDate(adminUserViewPort.findAll(), from, to);
}

@Override
@Transactional(readOnly = true)
public List<AdminUserView> listByStatus(User.UserStatus status, LocalDate from, LocalDate to) {
    return filterByDate(adminUserViewPort.findAllByStatus(status), from, to);
}

private List<AdminUserView> filterByDate(List<AdminUserView> views, LocalDate from, LocalDate to) {
    if (from == null && to == null) return views;
    return views.stream()
            .filter(v -> {
                if (v.createdAt() == null) return true;
                LocalDate d = v.createdAt().atZone(TimeZones.KST).toLocalDate();
                return (from == null || !d.isBefore(from))
                    && (to   == null || !d.isAfter(to));
            })
            .toList();
}
```

`import com.kista.common.TimeZones;`와 `import java.time.LocalDate;`를 상단에 추가.

- [ ] **Step 3: 컴파일 확인**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: 커밋**

```bash
git add src/main/java/com/kista/domain/port/in/AdminUserUseCase.java \
        src/main/java/com/kista/application/service/admin/AdminService.java
git commit -m "feat(admin): 사용자 목록 날짜 필터 서비스 구현"
```

---

## Task 5: 감사 로그 날짜 필터 (Port → JPA → Adapter)

**Files:**
- Modify: `kista-api/src/main/java/com/kista/domain/port/out/AuditLogPort.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/out/persistence/audit/AuditLogJpaRepository.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/out/persistence/audit/AuditLogPersistenceAdapter.java`
- Modify: `kista-api/src/main/java/com/kista/application/service/admin/AdminQueryService.java`

- [ ] **Step 1: AuditLogPort.java — findAll(Instant, Instant) 추가**

기존 `findAll()` 유지하고 오버로드 추가:

```java
public interface AuditLogPort {
    void log(UUID adminId, String action, String targetType, UUID targetId, Map<String, Object> payload);
    AuditLog findById(UUID id);
    List<AuditLog> findAll();  // 기존 — 100건 최신순 (내부 서비스 호출용)
    List<AuditLog> findAll(Instant from, Instant to);  // 추가 — 날짜 범위, 최대 100건
}
```

- [ ] **Step 2: AuditLogJpaRepository.java — 날짜 범위 쿼리 추가**

```java
interface AuditLogJpaRepository extends JpaRepository<AuditLogEntity, UUID> {
    List<AuditLogEntity> findTop100ByOrderByCreatedAtDesc();

    @Query("SELECT a FROM AuditLogEntity a WHERE a.createdAt >= :from AND a.createdAt < :to ORDER BY a.createdAt DESC LIMIT 100")
    List<AuditLogEntity> findTop100ByCreatedAtBetween(
            @Param("from") Instant from,
            @Param("to") Instant to);
}
```

- [ ] **Step 3: AuditLogPersistenceAdapter.java — findAll(from, to) 구현**

```java
@Override
public List<AuditLog> findAll(Instant from, Instant to) {
    return repo.findTop100ByCreatedAtBetween(from, to).stream()
            .map(this::toDomain)
            .toList();
}
```

- [ ] **Step 4: AdminQueryService.java — listAuditLogs 스텁 완성**

Task 3 Step 5의 임시 구현을 교체:

```java
@Override
public List<AuditLog> listAuditLogs(Instant from, Instant to) {
    if (from == null && to == null) return auditLogPort.findAll();
    Instant f = from != null ? from : Instant.EPOCH;
    Instant t = to   != null ? to   : Instant.now();
    return auditLogPort.findAll(f, t);
}
```

- [ ] **Step 5: 컴파일 확인**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 6: 커밋**

```bash
git add src/main/java/com/kista/domain/port/out/AuditLogPort.java \
        src/main/java/com/kista/adapter/out/persistence/audit/AuditLogJpaRepository.java \
        src/main/java/com/kista/adapter/out/persistence/audit/AuditLogPersistenceAdapter.java \
        src/main/java/com/kista/application/service/admin/AdminQueryService.java
git commit -m "feat(admin): 감사 로그 날짜 범위 필터 구현"
```

---

## Task 6: 오류 로그 날짜 필터 (Port → JPA → Adapter)

**Files:**
- Modify: `kista-api/src/main/java/com/kista/domain/port/out/AppErrorLogPort.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/out/persistence/audit/AppErrorLogJpaRepository.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/out/persistence/audit/AppErrorLogPersistenceAdapter.java`

- [ ] **Step 1: AppErrorLogPort.java — findRecent(int, Instant, Instant) 추가**

```java
public interface AppErrorLogPort {
    void save(Exception e, String caller);
    List<AppErrorLog> findRecent(int limit);   // 기존
    List<AppErrorLog> findRecent(int limit, Instant from, Instant to);  // 추가 — 날짜 범위
}
```

- [ ] **Step 2: AppErrorLogJpaRepository.java — 날짜 범위 쿼리 추가**

```java
interface AppErrorLogJpaRepository extends JpaRepository<AppErrorLogEntity, UUID> {
    @Query("SELECT e FROM AppErrorLogEntity e ORDER BY e.createdAt DESC LIMIT :limit")
    List<AppErrorLogEntity> findTopNByOrderByCreatedAtDesc(@Param("limit") int limit);

    @Query("SELECT e FROM AppErrorLogEntity e WHERE e.createdAt >= :from AND e.createdAt < :to ORDER BY e.createdAt DESC LIMIT :limit")
    List<AppErrorLogEntity> findByCreatedAtBetween(
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("limit") int limit);
}
```

- [ ] **Step 3: AppErrorLogPersistenceAdapter.java — findRecent(limit, from, to) 구현**

```java
@Override
public List<AppErrorLog> findRecent(int limit, Instant from, Instant to) {
    return repo.findByCreatedAtBetween(from, to, limit).stream()
            .map(this::toDomain)
            .toList();
}
```

- [ ] **Step 4: 컴파일 확인**

```bash
./gradlew compileJava 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 5: 커밋**

```bash
git add src/main/java/com/kista/domain/port/out/AppErrorLogPort.java \
        src/main/java/com/kista/adapter/out/persistence/audit/AppErrorLogJpaRepository.java \
        src/main/java/com/kista/adapter/out/persistence/audit/AppErrorLogPersistenceAdapter.java
git commit -m "feat(admin): 오류 로그 날짜 범위 필터 구현"
```

---

## Task 7: 4개 컨트롤러 파라미터 추가

**Files:**
- Modify: `kista-api/src/main/java/com/kista/adapter/in/web/AdminTradeController.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/in/web/AdminAccountController.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/in/web/AdminUserController.java`
- Modify: `kista-api/src/main/java/com/kista/adapter/in/web/AdminObservabilityController.java`

- [ ] **Step 1: AdminTradeController.java — from/to 파라미터 추가**

```java
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@GetMapping
public List<AdminTradeResponse> listTrades(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    Map<UUID, Account> accountMap = adminQuery.listAccounts(null, null).stream()
            .collect(Collectors.toMap(Account::id, Function.identity()));
    Map<UUID, AdminUserView> userMap = adminUser.listAll(null, null).stream()
            .collect(Collectors.toMap(AdminUserView::id, Function.identity()));
    return adminQuery.listTrades(from, to).stream()
            .map(t -> AdminTradeResponse.from(t, accountMap, userMap))
            .toList();
}
```

- [ ] **Step 2: AdminAccountController.java — from/to 파라미터 추가**

```java
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@GetMapping
public List<AdminAccountResponse> listAccounts(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    Map<UUID, AdminUserView> userMap = adminUser.listAll(null, null).stream()
            .collect(Collectors.toMap(AdminUserView::id, Function.identity()));
    return adminQuery.listAccounts(from, to).stream()
            .map(a -> AdminAccountResponse.from(a, userMap.get(a.userId())))
            .toList();
}
```

- [ ] **Step 3: AdminUserController.java — from/to 파라미터 추가**

```java
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;

@GetMapping
public List<AdminUserResponse> listUsers(
        @RequestParam(required = false) User.UserStatus status,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @AuthenticationPrincipal UUID adminId) {
    List<AdminUserView> views = status == null
            ? adminUser.listAll(from, to)
            : adminUser.listByStatus(status, from, to);
    return AdminUserResponse.fromList(views);
}
```

- [ ] **Step 4: AdminObservabilityController.java — from/to + inactiveDays 파라미터 추가**

```java
import com.kista.common.TimeZones;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.Instant;
import java.time.LocalDate;

@GetMapping("/audit")
public List<AuditLogResponse> listAuditLogs(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    Instant fromInstant = from != null ? from.atStartOfDay(TimeZones.KST).toInstant() : null;
    Instant toInstant   = to   != null ? to.plusDays(1).atStartOfDay(TimeZones.KST).toInstant() : null;
    return adminQuery.listAuditLogs(fromInstant, toInstant).stream()
            .map(AuditLogResponse::from)
            .toList();
}

@GetMapping("/errors")
public List<ErrorLogResponse> listErrorLogs(
        @RequestParam(defaultValue = "100") int limit,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    int safeLimit = Math.min(limit, MAX_LIMIT);
    List<AppErrorLog> logs;
    if (from == null && to == null) {
        logs = appErrorLogPort.findRecent(safeLimit);
    } else {
        Instant f = from != null ? from.atStartOfDay(TimeZones.KST).toInstant() : Instant.EPOCH;
        Instant t = to   != null ? to.plusDays(1).atStartOfDay(TimeZones.KST).toInstant() : Instant.now();
        logs = appErrorLogPort.findRecent(safeLimit, f, t);
    }
    return logs.stream().map(ErrorLogResponse::from).toList();
}

@GetMapping("/anomalies")
public AnomaliesResponse getAnomalies(
        @RequestParam(defaultValue = "7") int inactiveDays) {
    AdminAnomalies anomalies = adminQuery.getAnomalies(inactiveDays);
    Map<UUID, AdminUserView> userMap = adminUser.listAll(null, null).stream()
            .collect(Collectors.toMap(AdminUserView::id, Function.identity()));
    List<AccountItem> paused = anomalies.pausedAccounts().stream()
            .map(a -> AccountItem.from(a, userMap)).toList();
    List<AccountItem> inactive = anomalies.inactiveAccounts().stream()
            .map(a -> AccountItem.from(a, userMap)).toList();
    return new AnomaliesResponse(paused, inactive);
}
```

- [ ] **Step 5: 전체 컴파일 및 테스트**

```bash
./gradlew compileJava 2>&1 | tail -5
./gradlew test --tests "com.kista.adapter.in.web.AdminTradeControllerTest" --tests "com.kista.adapter.in.web.AdminAccountControllerTest" --tests "com.kista.adapter.in.web.AdminUserControllerTest" --tests "com.kista.adapter.in.web.AdminObservabilityControllerTest" 2>&1 | tail -20
```

Expected: `BUILD SUCCESSFUL` (기존 테스트 통과, 추가 파라미터는 모두 optional이므로 기존 테스트 영향 없음)

- [ ] **Step 6: 커밋 (kista-api)**

```bash
git add src/main/java/com/kista/adapter/in/web/AdminTradeController.java \
        src/main/java/com/kista/adapter/in/web/AdminAccountController.java \
        src/main/java/com/kista/adapter/in/web/AdminUserController.java \
        src/main/java/com/kista/adapter/in/web/AdminObservabilityController.java
git commit -m "feat(admin): 어드민 컨트롤러 날짜 범위 파라미터 추가"
```

---

## Task 8: UI — entities/user/api 업데이트 + 공통 유틸

**Files:**
- Modify: `kista-ui/entities/user/api/index.ts`

- [ ] **Step 1: listAdminTrades, listAdminAccounts, listAdminUsers 파라미터 추가**

```ts
export async function listAdminTrades(token: string, from?: string, to?: string): Promise<AdminTrade[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<AdminTrade[]>(`/api/admin/trades${qs}`, { method: 'GET' }, token)
}

export async function listAdminAccounts(token: string, from?: string, to?: string): Promise<AdminAccount[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<AdminAccount[]>(`/api/admin/accounts${qs}`, { method: 'GET' }, token)
}

export async function listAdminUsers(token?: string, status?: UserStatus, from?: string, to?: string): Promise<AdminUser[]> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return fetchEither<AdminUser[]>(`/api/admin/users${qs}`, { method: 'GET' }, token)
}
```

- [ ] **Step 2: listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies 파라미터 추가**

```ts
export async function listAdminAuditLogs(token: string, from?: string, to?: string): Promise<AdminAuditLog[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<AdminAuditLog[]>(`/api/admin/logs/audit${qs}`, { method: 'GET' }, token)
}

export async function listAdminErrorLogs(token: string, limit = 100, from?: string, to?: string): Promise<AppErrorLog[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return apiFetch<AppErrorLog[]>(`/api/admin/logs/errors?${params.toString()}`, { method: 'GET' }, token)
}

export async function getAdminAnomalies(token: string, inactiveDays = 7): Promise<AdminAnomalies> {
  return apiFetch<AdminAnomalies>(`/api/admin/logs/anomalies?inactiveDays=${inactiveDays}`, { method: 'GET' }, token)
}
```

- [ ] **Step 3: 타입 검사**

```bash
cd /c/Users/USER/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add "entities/user/api/index.ts"
git commit -m "feat(entities): 어드민 API 함수에 날짜 범위 파라미터 추가"
```

---

## Task 9: UI — 거래내역·계좌현황·사용자목록 페이지 RangeFilterBar

**Files:**
- Modify: `kista-ui/app/(admin)/admin/trades/page.tsx`
- Modify: `kista-ui/app/(admin)/admin/accounts/page.tsx`
- Modify: `kista-ui/app/(admin)/admin/users/page.tsx`

공통 헬퍼 함수 (각 페이지 파일 상단에 정의):

```ts
import type { RangePreset } from '@shared/ui/RangeFilterBar'

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function resolveApiRange(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return from && to ? { from, to } : {}
  const today = new Date()
  const days = range === '7d' ? 7 : 30
  const f = new Date(today)
  f.setDate(f.getDate() - days)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(f), to: fmt(today) }
}
```

- [ ] **Step 1: app/(admin)/admin/trades/page.tsx 수정**

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminTrades } from '@entities/user'
import { fmtUsd } from '@shared/lib/format'
import type { AdminTrade } from '@entities/user'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

const DIRECTION_LABEL: Record<string, string> = { BUY: '매수', SELL: '매도' }
const STATUS_STYLE: Record<string, string> = {
  PLACED:  'bg-blue-100 text-blue-700',
  FILLED:  'bg-emerald-100 text-emerald-700',
  FAILED:  'bg-red-100 text-red-700',
}

const VALID_SIZES = ['10', '30', '50', '100'] as const

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function resolveApiRange(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return from && to ? { from, to } : {}
  const today = new Date()
  const days = range === '7d' ? 7 : 30
  const f = new Date(today)
  f.setDate(f.getDate() - days)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(f), to: fmt(today) }
}

export default async function AdminTradesPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string; page?: string; range?: string; from?: string; to?: string }>
}) {
  const { size: rawSize, page: rawPage, range: rawRange, from, to } = await searchParams
  const size = parseSize(rawSize)
  const range = parseRangePreset(rawRange)
  const { from: apiFrom, to: apiTo } = resolveApiRange(range, from, to)

  const token = await getAuthToken()
  const all: AdminTrade[] = token ? await listAdminTrades(token, apiFrom, apiTo).catch(() => []) : []

  const totalPages = Math.max(1, Math.ceil(all.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)
  const trades = all.slice((page - 1) * size, page * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">거래 내역</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 거래 내역 (총 {all.length}건)</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <RangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={String(size)} />
      </div>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          거래 내역이 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">날짜</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">소유자</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">종목</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">방향</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">유형</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">수량</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">가격</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{t.tradeDate}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{t.ownerNickname}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.ticker}</td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap ${t.direction === 'BUY' ? 'text-pos' : 'text-neg'}`}>
                    {DIRECTION_LABEL[t.direction] ?? t.direction}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{t.orderType}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{t.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap">${fmtUsd(t.price)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[t.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} />
    </div>
  )
}
```

- [ ] **Step 2: app/(admin)/admin/accounts/page.tsx 수정**

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminAccounts } from '@entities/user'
import type { AdminAccount } from '@entities/user'
import { RevealableValue } from '@widgets/revealable-value'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { PaginationBar } from '@shared/ui/PaginationBar'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

const VALID_SIZES = ['10', '30', '50', '100'] as const

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function resolveApiRange(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return from && to ? { from, to } : {}
  const today = new Date()
  const days = range === '7d' ? 7 : 30
  const f = new Date(today)
  f.setDate(f.getDate() - days)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(f), to: fmt(today) }
}

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ size?: string; page?: string; range?: string; from?: string; to?: string }>
}) {
  const { size: rawSize, page: rawPage, range: rawRange, from, to } = await searchParams
  const size = parseSize(rawSize)
  const range = parseRangePreset(rawRange)
  const { from: apiFrom, to: apiTo } = resolveApiRange(range, from, to)

  const token = await getAuthToken()
  const all: AdminAccount[] = token ? await listAdminAccounts(token, apiFrom, apiTo).catch(() => []) : []

  const totalPages = Math.max(1, Math.ceil(all.length / size))
  const page = Math.min(parsePage(rawPage), totalPages)
  const accounts = all.slice((page - 1) * size, page * size)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">계좌 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 사용자 계좌 목록 (총 {all.length}개)</p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <RangeFilterBar current={range} from={from} to={to} />
        <PageSizeSelector value={String(size)} />
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          등록된 계좌가 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">소유자</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">계좌번호</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{acc.ownerNickname}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    <RevealableValue
                      value={acc.accountNoMasked ?? ''}
                      hiddenDisplay={acc.accountNoMasked ?? ''}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} />
    </div>
  )
}
```

- [ ] **Step 3: app/(admin)/admin/users/page.tsx 수정**

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers, getMe } from '@entities/user'
import { AdminUsersTable } from '@widgets/admin-user-list'
import { RangeFilterBar, type RangePreset } from '@shared/ui/RangeFilterBar'

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function resolveApiRange(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return from && to ? { from, to } : {}
  const today = new Date()
  const days = range === '7d' ? 7 : 30
  const f = new Date(today)
  f.setDate(f.getDate() - days)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(f), to: fmt(today) }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, from, to } = await searchParams
  const range = parseRangePreset(rawRange)
  const { from: apiFrom, to: apiTo } = resolveApiRange(range, from, to)

  const token = await getAuthToken()
  const [users, me] = token
    ? await Promise.all([
        listAdminUsers(token, undefined, apiFrom, apiTo).catch(() => []),
        getMe(token).catch(() => null),
      ])
    : [[], null]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">사용자 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
      </div>

      <div className="mb-4">
        <RangeFilterBar current={range} from={from} to={to} />
      </div>

      <AdminUsersTable initialUsers={users} currentUserId={me?.id ?? null} />
    </div>
  )
}
```

- [ ] **Step 4: 타입 검사**

```bash
cd /c/Users/USER/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
git add "app/(admin)/admin/trades/page.tsx" "app/(admin)/admin/accounts/page.tsx" "app/(admin)/admin/users/page.tsx"
git commit -m "feat(admin): 거래내역·계좌현황·사용자목록 기간 조회 UI 추가"
```

---

## Task 10: UI — 운영로그 페이지 RangeFilterBar + InactiveDaysSelect

**Files:**
- Create: `kista-ui/features/admin/logs/InactiveDaysSelect.tsx`
- Modify: `kista-ui/features/admin/logs/index.ts`
- Modify: `kista-ui/app/(admin)/admin/logs/page.tsx`
- Modify: `kista-ui/features/admin/logs/LogsFilterChips.tsx`

- [ ] **Step 1: InactiveDaysSelect.tsx 생성**

```tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const OPTIONS = [
  { value: '7',  label: '7일 기준' },
  { value: '14', label: '14일 기준' },
  { value: '30', label: '30일 기준' },
]

interface Props {
  value: string
}

export function InactiveDaysSelect({ value }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('inactiveDays', e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      aria-label="비활성 기준 기간"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 2: features/admin/logs/index.ts — InactiveDaysSelect re-export 추가**

```ts
export { LogsFilterChips } from './LogsFilterChips'
export { InactiveDaysSelect } from './InactiveDaysSelect'
```

- [ ] **Step 3: LogsFilterChips.tsx — 타입 전환 시 range 파라미터 보존**

```tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const FILTERS = [
  { type: 'all',     label: '전체' },
  { type: 'anomaly', label: '이상 징후' },
  { type: 'error',   label: '오류 로그' },
  { type: 'audit',   label: '감사 로그' },
] as const

export function LogsFilterChips() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('type') ?? 'all'

  function navigate(type: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (type === 'all') {
      params.delete('type')
    } else {
      params.set('type', type)
    }
    params.delete('ap')
    params.delete('ep')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          onClick={() => navigate(type)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === type
              ? 'bg-rose-100 text-rose-700'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: app/(admin)/admin/logs/page.tsx 수정**

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
const VALID_INACTIVE_DAYS = ['7', '14', '30'] as const

function parseSize(raw: string | undefined): number {
  return VALID_SIZES.includes(raw as (typeof VALID_SIZES)[number]) ? Number(raw) : 10
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

function parseRangePreset(raw: string | undefined): RangePreset {
  if (raw === '30d' || raw === 'all' || raw === 'custom') return raw
  return '7d'
}

function parseInactiveDays(raw: string | undefined): string {
  return VALID_INACTIVE_DAYS.includes(raw as (typeof VALID_INACTIVE_DAYS)[number]) ? raw! : '7'
}

function resolveApiRange(range: RangePreset, from?: string, to?: string): { from?: string; to?: string } {
  if (range === 'all') return {}
  if (range === 'custom') return from && to ? { from, to } : {}
  const today = new Date()
  const days = range === '7d' ? 7 : 30
  const f = new Date(today)
  f.setDate(f.getDate() - days)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { from: fmt(f), to: fmt(today) }
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string; size?: string; ap?: string; ep?: string
    range?: string; from?: string; to?: string; inactiveDays?: string
  }>
}) {
  const { type = 'all', size: rawSize, ap, ep, range: rawRange, from, to, inactiveDays: rawInactiveDays } = await searchParams
  const logType = type as LogType
  const size = parseSize(rawSize)
  const range = parseRangePreset(rawRange)
  const inactiveDays = parseInactiveDays(rawInactiveDays)
  const { from: apiFrom, to: apiTo } = resolveApiRange(range, from, to)

  const showAudit   = logType === 'all' || logType === 'audit'
  const showError   = logType === 'all' || logType === 'error'
  const showAnomaly = logType === 'all' || logType === 'anomaly'

  const token = await getAuthToken()
  const [allAuditLogs, allErrorLogs, anomalies] = await Promise.all([
    showAudit && token
      ? listAdminAuditLogs(token, apiFrom, apiTo).catch(() => [] as AdminAuditLog[])
      : ([] as AdminAuditLog[]),
    showError && token
      ? listAdminErrorLogs(token, 100, apiFrom, apiTo).catch(() => [] as AppErrorLog[])
      : ([] as AppErrorLog[]),
    showAnomaly && token
      ? getAdminAnomalies(token, Number(inactiveDays)).catch(() => EMPTY_ANOMALIES)
      : EMPTY_ANOMALIES,
  ])

  const auditTotalPages = Math.max(1, Math.ceil(allAuditLogs.length / size))
  const errorTotalPages = Math.max(1, Math.ceil(allErrorLogs.length / size))
  const auditPage = Math.min(parsePage(ap), auditTotalPages)
  const errorPage = Math.min(parsePage(ep), errorTotalPages)

  const auditLogs = allAuditLogs.slice((auditPage - 1) * size, auditPage * size)
  const errorLogs = allErrorLogs.slice((errorPage - 1) * size, errorPage * size)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">감사 · 오류 · 이상 징후 통합 뷰</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Suspense fallback={null}><LogsFilterChips /></Suspense>
        {(showAudit || showError) && <PageSizeSelector value={String(size)} />}
      </div>

      {(showAudit || showError) && (
        <div className="mt-3">
          <RangeFilterBar current={range} from={from} to={to} />
        </div>
      )}

      <div className="mt-6 space-y-8">
        {showAnomaly && (
          <AnomaliesSection
            anomalies={anomalies}
            inactiveDays={inactiveDays}
          />
        )}
        {showError && (
          <ErrorLogsSection
            logs={errorLogs}
            total={allErrorLogs.length}
            page={errorPage}
            totalPages={errorTotalPages}
          />
        )}
        {showAudit && (
          <AuditLogsSection
            logs={auditLogs}
            total={allAuditLogs.length}
            page={auditPage}
            totalPages={auditTotalPages}
          />
        )}
      </div>
    </div>
  )
}

function AnomaliesSection({ anomalies, inactiveDays }: { anomalies: AdminAnomalies; inactiveDays: string }) {
  const total = anomalies.pausedAccounts.length + anomalies.inactiveAccounts.length
  return (
    <section>
      <h2 className="text-base font-bold mb-3">
        이상 징후
        {total > 0 && (
          <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            {total}
          </span>
        )}
      </h2>
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
          <div className="flex items-center gap-3 mb-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              비활성 계좌
              {anomalies.inactiveAccounts.length > 0 && (
                <span className="ml-2 normal-case font-medium text-slate-600">
                  {anomalies.inactiveAccounts.length}
                </span>
              )}
            </p>
            <Suspense fallback={null}>
              <InactiveDaysSelect value={inactiveDays} />
            </Suspense>
          </div>
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

function ErrorLogsSection({ logs, total, page, totalPages }: { logs: AppErrorLog[]; total: number; page: number; totalPages: number }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-3">
        오류 로그
        <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
      </h2>
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

function AuditLogsSection({ logs, total, page, totalPages }: { logs: AdminAuditLog[]; total: number; page: number; totalPages: number }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-3">
        감사 로그
        <span className="ml-2 text-sm font-normal text-muted-foreground">총 {total}건</span>
      </h2>
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

- [ ] **Step 5: 타입 검사**

```bash
cd /c/Users/USER/workspace/kista/kista-ui && npm run typecheck 2>&1 | tail -5
```

Expected: 오류 없음

- [ ] **Step 6: 커밋**

```bash
git add "features/admin/logs/InactiveDaysSelect.tsx" \
        "features/admin/logs/index.ts" \
        "features/admin/logs/LogsFilterChips.tsx" \
        "app/(admin)/admin/logs/page.tsx"
git commit -m "feat(admin): 운영로그 기간 조회 및 비활성 기준 드롭다운 추가"
```

---

## 스펙 커버리지 체크

| 스펙 요구사항 | 구현 태스크 |
|---|---|
| UI 기본 프리셋 7일 (4페이지) | Task 9, 10 (`parseRangePreset` 기본값 `'7d'`) |
| API 미전달 기본값 전체 | Task 3, 4, 5, 6, 7 (null 시 전체 반환) |
| 거래내역 날짜 필터 (API) | Task 3, 7, 8, 9 |
| 계좌현황 날짜 필터 (API, createdAt 기준) | Task 2, 3, 7, 8, 9 |
| 사용자목록 날짜 필터 (API) | Task 4, 7, 8, 9 |
| 감사로그 날짜 필터 | Task 5, 7, 8, 10 |
| 오류로그 날짜 필터 | Task 6, 7, 8, 10 |
| 이상징후 비활성 기준 드롭다운 (7/14/30일) | Task 7, 8, 10 |
| RangeFilterBar shared/ui 이동 | Task 1 |
| LogsFilterChips 타입 전환 시 range 파라미터 보존 | Task 10 Step 3 |
