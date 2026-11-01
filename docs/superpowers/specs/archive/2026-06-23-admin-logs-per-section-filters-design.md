# 운영 로그 — 섹션별 독립 기간 필터 + 드롭다운 설계

## 배경

현재 운영 로그 페이지(`/admin/logs`)는 오류 로그와 감사 로그가 공통 기간 필터(`range`/`from`/`to`)와 페이지 사이즈 드롭다운(`size`)을 공유하고, 이상 징후 섹션에는 기간 필터가 전혀 없다. 각 섹션(이상 징후, 오류 로그, 감사 로그)이 독립적으로 필터링되도록 개선한다.

## URL 파라미터 체계

| 파라미터 | 대상 | 기본값 |
|---|---|---|
| `anoRange` / `anoFrom` / `anoTo` | 이상 징후 기간 | `7d` |
| `errRange` / `errFrom` / `errTo` | 오류 로그 기간 | `7d` |
| `audRange` / `audFrom` / `audTo` | 감사 로그 기간 | `7d` |
| `errSize` | 오류 로그 페이지 사이즈 | `10` |
| `audSize` | 감사 로그 페이지 사이즈 | `10` |
| `ep` | 오류 로그 페이지 번호 | `1` |
| `ap` | 감사 로그 페이지 번호 | `1` |
| `inactiveDays` | 이상 징후 비활성 기준 | `7` |
| `type` | 탭 타입 (all/anomaly/error/audit) | `all` |

기존 파라미터 `range` / `from` / `to` / `size`는 제거한다.

## kista-api 변경

`GET /api/admin/logs/anomalies`에 선택적 `from` / `to` 쿼리 파라미터를 추가한다. 미전달 시 현재 동작(전체 기간) 유지 — 하위 호환 보장.

```java
@GetMapping("/anomalies")
public AdminAnomaliesResponse getAnomalies(
    @RequestParam(defaultValue = "7") int inactiveDays,
    @RequestParam(required = false) LocalDate from,
    @RequestParam(required = false) LocalDate to
) { ... }
```

## kista-ui 변경

### 1. `shared/ui/RangeFilterBar.tsx`

`paramPrefix?: string` prop 추가. prefix가 있으면 `{prefix}Range` / `{prefix}From` / `{prefix}To` 파라미터를 읽고 씀. 미전달 시 기존 `range`/`from`/`to` 사용(하위 호환).

### 2. `entities/user/api/index.ts`

`getAdminAnomalies(token, inactiveDays?, from?, to?)` — from/to 파라미터 추가.

### 3. `app/(admin)/admin/logs/page.tsx`

- searchParams에 섹션별 파라미터 파싱 추가 (`anoRange`/`errRange`/`audRange` 등)
- 상단 공통 `RangeFilterBar` + `PageSizeSelector` 제거
- `showRange` 조건 제거 — 각 섹션이 항상 자체 필터 표시
- `AnomaliesSection` / `ErrorLogsSection` / `AuditLogsSection` 각각에 필터 props 전달

### 4. `features/admin/logs/LogsFilterChips.tsx`

파라미터 보존 목록에서 `range` 제거, 섹션별 파라미터 추가:
`anoRange`, `anoFrom`, `anoTo`, `errRange`, `errFrom`, `errTo`, `audRange`, `audFrom`, `audTo`, `errSize`, `audSize`, `inactiveDays`

## 각 섹션 헤더 레이아웃

```
이상 징후 [n]                        [비활성 기준: 7일 14일 30일]
[7일] [30일] [전체] [직접입력]

오류 로그  총 n건                                        [10개 ▼]
[7일] [30일] [전체] [직접입력]

감사 로그  총 n건                                        [10개 ▼]
[7일] [30일] [전체] [직접입력]
```

## 구현 순서

1. kista-api: anomalies 엔드포인트 `from`/`to` 파라미터 추가
2. `RangeFilterBar`: `paramPrefix` prop 지원 추가
3. `getAdminAnomalies` API 함수 업데이트
4. `page.tsx`: searchParams 파싱 + 섹션별 props 전달 리팩토링
5. 각 섹션 컴포넌트: 자체 필터 UI 추가
6. `LogsFilterChips`: 파라미터 보존 목록 업데이트
