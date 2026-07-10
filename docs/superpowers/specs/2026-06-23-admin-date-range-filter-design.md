# Admin 기간 조회 기능 설계

## 개요

어드민 거래내역·계좌현황·사용자목록 세 페이지에 기간 필터를 추가한다.
기존 privacy-trades 페이지의 `RangeFilterBar` 컴포넌트를 `shared/ui/`로 이동하여 네 페이지가 공통으로 사용한다.

## 기본값 규칙

| 구분 | 값 |
|---|---|
| UI 기본 프리셋 | **7일** (4페이지 공통) |
| API `from`/`to` 미전달 | **전체** (4페이지 공통, null = 제한 없음) |

## API 변경 (kista-api)

### 1. `Account` 도메인 모델에 `createdAt` 추가

`AccountEntity`는 `BaseAuditEntity`를 상속하므로 DB에 `created_at` 컬럼이 이미 존재한다.
도메인 record에 필드만 추가하고 Mapper에서 매핑한다.

```java
// Account.java
public record Account(
    UUID id, UUID userId, String nickname,
    String accountNo, String appKey, String secretKey,
    String brokerAccountCode, Account.Broker broker,
    Instant createdAt   // 추가
) { ... }
```

### 2. `AdminQueryUseCase` 시그니처 변경

```java
List<Order> listTrades(LocalDate from, LocalDate to);   // null = 전체
List<Account> listAccounts(LocalDate from, LocalDate to); // null = 전체
```

사용자 필터는 `AdminUserUseCase`에 추가:
```java
List<AdminUserView> listAll(LocalDate from, LocalDate to); // null = 전체
List<AdminUserView> listByStatus(User.UserStatus status, LocalDate from, LocalDate to);
```

### 3. 컨트롤러 파라미터 추가

세 컨트롤러 모두 동일 패턴:
```java
@GetMapping
public List<...> list(
    @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate from,
    @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate to
) { ... }
```

`AdminUserController`는 기존 `status` 파라미터를 유지하고 `from`/`to` 추가.

### 4. `AdminQueryService` 필터 구현

- **거래내역**: `OrderPort.findAll(from, to)` 시그니처 유지. `from` null → `LocalDate.EPOCH`, `to` null → `LocalDate.now(KST)` (privacy 구현과 동일 패턴)
- **계좌현황**: `Account.createdAt`을 KST LocalDate로 변환 후 범위 필터 (서비스 레벨)
- **사용자목록**: `AdminUserView.createdAt`을 KST LocalDate로 변환 후 범위 필터 (서비스 레벨)

계좌·사용자는 DB 쿼리 필터가 아닌 메모리 필터로 구현 (데이터 규모가 작음).

## UI 변경 (kista-ui)

### 1. `RangeFilterBar` 이동

```
widgets/admin-privacy-trade-list/RangeFilterBar.tsx
  → shared/ui/RangeFilterBar.tsx
```

`privacy-trades/page.tsx`의 import 경로만 수정. 컴포넌트 코드는 변경 없음.

### 2. `entities/user/api/index.ts` API 함수 시그니처 변경

```ts
listAdminTrades(token: string, from?: string, to?: string): Promise<AdminTrade[]>
listAdminAccounts(token: string, from?: string, to?: string): Promise<AdminAccount[]>
listAdminUsers(token?: string, status?: UserStatus, from?: string, to?: string): Promise<AdminUser[]>
```

쿼리 파라미터로 `from=2024-01-01&to=2024-01-31` 형식 전달.

### 3. 각 페이지 searchParam 확장

세 페이지 모두 동일 패턴:

```ts
searchParams: Promise<{ range?: string; size?: string; page?: string; from?: string; to?: string }>
```

`parseRangePreset` 미입력 시 `'7d'` 반환 (privacy-trades와 동일).

`range` → `from`/`to` 날짜 변환 후 API 호출:
- `7d`: today - 7일
- `30d`: today - 30일
- `all`: `from`/`to` 미전달
- `custom`: searchParam의 `from`/`to` 그대로 전달

### 4. 각 페이지 UI 구성

`RangeFilterBar`를 `PageSizeSelector` 왼쪽에 배치 (privacy-trades와 동일 레이아웃):

```tsx
<div className="flex items-center justify-between mb-4 flex-wrap gap-3">
  <RangeFilterBar current={range} from={from} to={to} />
  <PageSizeSelector value={sizeStr} />
</div>
```

## 운영 로그 페이지 추가 변경 (묶음 작업)

### 감사 로그 / 오류 로그 — 공통 RangeFilterBar

상단에 `RangeFilterBar` 1개를 추가하여 감사 로그·오류 로그 두 섹션에 동일한 날짜 범위를 적용한다.

- UI 기본 프리셋: **7일**
- API 미전달 기본값: **전체**
- URL searchParam: `range`, `from`, `to` (기존 `ap`/`ep` 페이지 파라미터와 공존)

**kista-api 변경:**
- `listAuditLogs(LocalDate from, LocalDate to)` 시그니처 변경 (`AdminQueryUseCase`)
- `listErrorLogs(int limit, LocalDate from, LocalDate to)` 시그니처 변경 (`AppErrorLogPort` 또는 서비스 레벨)
- `AdminObservabilityController`: `@RequestParam(required=false) LocalDate from, to` 추가

**kista-ui 변경:**
- `listAdminAuditLogs(token, from?, to?)` API 함수에 파라미터 추가
- `listAdminErrorLogs(token, limit, from?, to?)` API 함수에 파라미터 추가
- `app/(admin)/admin/logs/page.tsx`: `range/from/to` searchParam + `RangeFilterBar` 삽입

### 이상 징후 — 비활성 기준 드롭다운

현재 비활성 기준이 7일로 하드코딩된 것을 사용자가 선택 가능하게 변경한다.

- 선택지: **7일 / 14일 / 30일** (`<select>` 드롭다운)
- URL searchParam: `inactiveDays` (기본값: `7`)

**kista-api 변경:**
- `getAnomalies(int inactiveDays)` 시그니처 변경 (`AdminQueryUseCase`)
- `AdminQueryService.getAnomalies()`: 하드코딩 `7` → 파라미터로 교체
- `AdminObservabilityController`: `@RequestParam(defaultValue = "7") int inactiveDays` 추가

**kista-ui 변경:**
- `getAdminAnomalies(token, inactiveDays?)` API 함수에 파라미터 추가
- 이상 징후 섹션에 드롭다운 추가 (Client Component 분리 필요)
- 비활성 계좌 설명 텍스트를 동적으로 변경: `"(N일 거래 없음)"`

### 변경 파일 추가

**kista-api:**
- `AdminObservabilityController.java`
- `AdminQueryUseCase.java` (listAuditLogs, getAnomalies 시그니처)
- `AdminQueryService.java` (getAnomalies inactiveDays, listAuditLogs 날짜 필터)
- `AppErrorLogPort.java` / 구현체 (날짜 범위 필터)

**kista-ui:**
- `entities/user/api/index.ts` (listAdminAuditLogs, listAdminErrorLogs, getAdminAnomalies)
- `app/(admin)/admin/logs/page.tsx`
- `features/admin/logs/` (LogsFilterChips 또는 이상징후 드롭다운 Client Component)

## 영향 범위

- `AdminAccountResponse`에 `createdAt` 노출 없음 (UI 표시 불필요, 필터 용도만)
- `AdminUserResponse`에 `createdAt` 이미 없음 — 필터는 서버 서비스 레이어에서 처리
- `AdminUsersTable` 클라이언트 컴포넌트 변경 불필요
- 기존 pagination 로직 유지

## 변경 파일 목록

### kista-api
1. `domain/model/account/Account.java`
2. `adapter/out/persistence/account/AccountPersistenceAdapter.java` (toDomain 메서드에 createdAt 추가)
3. `domain/port/in/AdminQueryUseCase.java`
4. `domain/port/in/AdminUserUseCase.java`
5. `application/service/admin/AdminQueryService.java`
6. `application/service/admin/AdminService.java` (AdminUserUseCase 구현체)
7. `adapter/in/web/AdminTradeController.java`
8. `adapter/in/web/AdminAccountController.java`
9. `adapter/in/web/AdminUserController.java`

### kista-ui
1. `shared/ui/RangeFilterBar.tsx` (신규, 이동)
2. `shared/ui/index.ts` (re-export 추가)
3. `entities/user/api/index.ts`
4. `app/(admin)/admin/trades/page.tsx`
5. `app/(admin)/admin/accounts/page.tsx`
6. `app/(admin)/admin/users/page.tsx`
7. `app/(admin)/admin/privacy-trades/page.tsx` (import 경로만)
