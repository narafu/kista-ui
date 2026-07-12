# 반려 사유(rejectReason) 기능 설계 (감사 S-06)

- 작성일: 2026-07-12
- 배경: `app/rejected/page.tsx`의 "반려 사유" 카드가 하드코딩 고정 문구를 출력 — `UserResponse`에 사유 필드가 없어 개인화 불가 (UI 감사 S-06). kista-api + kista-ui 양 레포 연계 작업.
- 상태: 설계 초안 — 사용자 리뷰 대기

## 현재 구조 (탐사 확정)

| 계층 | 현재 상태 |
|---|---|
| DB | `users` 테이블에 사유 컬럼 없음 (migration V9까지) |
| 도메인 | `User` record — `lastReappliedAt`은 있으나 사유 필드 없음. `UserStatus { PENDING, ACTIVE, REJECTED }` |
| 유스케이스 | `AdminService.rejectUser(adminId, targetUserId)` → `userUseCase.reject(targetUserId)` + `auditLogPort.log(..., detail=null)` |
| API | `PATCH /api/admin/users/{userId}/status` body `{ status }` (`AdminStatusRequest` — status만) |
| 응답 DTO | `UserResponse` — rejectReason 없음 |
| UI(admin) | `ApproveRejectButtons` — 거절 버튼 클릭 즉시 mutation (사유 입력 단계 없음) |
| UI(본인) | `app/rejected/page.tsx` — 고정 문구 "관리자가 가입 신청을 거절했습니다..." |

## 설계 결정

1. **사유 입력은 선택(optional)** — 초대제 소규모 SaaS에서 강제 입력은 운영 마찰. 빈 값이면 서버에 null 저장, rejected 화면은 현행 기본 문구로 fallback. 기존 REJECTED 사용자(사유 null)도 동일 fallback이라 마이그레이션 데이터 보정 불필요.
2. **저장 위치는 `users` 컬럼** (`reject_reason TEXT NULL`) — audit_logs에도 detail로 남기지만, 본인 조회(`/me`) 경로가 단순해야 하므로 사용자 레코드에 직접 보관. 이력 관리는 audit_logs 몫.
3. **사유 갱신 규칙**: `reject(reason)` 시 덮어쓰기. `approve`·`reapply` 시 초기화하지 않음(단순 유지) — PENDING/ACTIVE 화면은 사유를 노출하지 않으므로 잔존 값이 UI에 새지 않고, 재반려 시 새 값으로 덮임.
4. **길이 제한 500자** — DTO validation(`@Size(max=500)`) + UI textarea maxLength 동기화.
5. **텔레그램 반려 알림에 사유 포함** — 사유가 있을 때만 메시지에 덧붙임 (없으면 현행 메시지 그대로).

## kista-api 변경 명세

1. **Migration `V10__add_reject_reason_to_users.sql`**: `ALTER TABLE users ADD COLUMN reject_reason TEXT;`
2. **`User` record**: `String rejectReason` 필드 추가(nullable, telegramBotUsername 뒤) + `withStatus` 계열과 별개로 `withRejection(String reason)` 헬퍼 (REJECTED 전환 + reason 세팅 + lastReappliedAt 갱신 — 기존 reject 로직의 상태 전이 재사용)
3. **`UserEntity`** + 매퍼: `rejectReason` 컬럼 매핑 추가
4. **`UserUseCase.reject(UUID userId)` → `reject(UUID userId, String reason)`** 시그니처 확장, `UserService` 구현 반영 (reason은 trim 후 blank → null 정규화)
5. **`AdminUserUseCase.rejectUser` / `AdminService`**: `reason` 전달 + `auditLogPort.log(adminId, "USER_REJECT", "USER", targetUserId, reason)` — 기존 null detail 자리에 사유 기록
6. **`AdminStatusRequest`**: `record AdminStatusRequest(User.UserStatus status, @Size(max = 500) String reason)` — reason은 REJECTED일 때만 사용, ACTIVE면 무시
7. **`UserResponse`**: `@Schema(description = "반려 사유 (REJECTED 상태에서만 의미, null 가능)") String rejectReason` 추가 — `from()`에서 `user.rejectReason()` 매핑. **status가 REJECTED가 아니면 null로 마스킹**(잔존 값 노출 방지, 결정 3 보완)
8. **텔레그램 어댑터**: reject 알림 메시지에 사유 조건부 첨부
9. **테스트**: `AdminService` 반려 사유 저장·audit detail 기록, `UserResponse` 마스킹(비REJECTED → null), reason blank 정규화

## kista-ui 변경 명세

1. **OpenAPI 동기화**: kista-api 반영 후 `npm run fetch:spec && npm run gen:types` — `UserResponse.rejectReason`, `AdminStatusRequest.reason` 타입 유입
2. **`entities/user/model/types.ts`**: `User`에 `rejectReason?: string | null` (normalizer 경유 시 함께)
3. **`entities/admin/api`**: `rejectUser(userId, reason?)` — body `{ status: 'REJECTED', reason }`. `useRejectUserMutation` 변수 시그니처 `{ userId, reason }`로 확장
4. **`features/admin/approve-reject/ApproveRejectButtons`**: 거절 클릭 → 즉시 mutation 대신 **AlertDialog**(shadcn, 기존 `open/onOpenChange` 직접 제어 패턴) 오픈: textarea(placeholder "사유를 입력하면 사용자에게 표시됩니다 (선택)", maxLength 500) + [건너뛰고 거절] [사유와 함께 거절] 액션. 취소 가능
5. **`app/rejected/page.tsx`**: Server Component에서 `getMe(token)`으로 `rejectReason` 조회 — 있으면 사유 카드 본문에 실제 사유, 없으면 현행 기본 문구. 라벨은 사유 존재 시 "반려 사유", 부재 시 "안내"로 완화(감사 S-06 개선 방향 반영)
6. **테스트**: ApproveRejectButtons 다이얼로그 흐름(사유 입력/스킵), rejected 페이지 fallback 분기

## 실행 순서·모델 배정

| 순서 | 작업 | 레포 | 모델 |
|---|---|---|---|
| 1 | api 변경 전체 (migration→도메인→서비스→DTO→테스트) | kista-api | **Sonnet** (계약 확정된 구현) |
| 2 | `./gradlew test` + 로컬 기동 → openapi 동기화 | kista-ui | **Haiku** (명령 실행) |
| 3 | ui 변경 전체 (api 함수→다이얼로그→rejected 페이지→테스트) | kista-ui | **Sonnet** |
| 4 | 통합 검증: admin에서 테스트 사용자 반려(사유 입력) → rejected 화면 사유 렌더 확인 | 양쪽 | **Fable** (판독) — 단, REJECTED 계정 세션 필요해 실계정 검증은 제약. 대안: `/api/auth/me` 응답 curl 확인 + rejected 페이지 코드 경로 단위 테스트 |
| 5 | 각 레포 커밋 (한글 메시지, push는 요청 시) | 양쪽 | — |

## 제약·리스크

- **실사용자 반려 검증 불가**: ACTIVE 관리자 계정뿐이라 rejected 화면 실렌더는 테스트 계정 없이는 어려움 — 단위 테스트 + `/me` 응답 검증으로 대체하고, 두 번째 카카오 계정이 있으면 E2E 가능(사용자 협조 항목)
- **하위 호환**: `reason` 필드는 optional이라 구버전 UI(필드 미전송)와 신버전 API 공존 무해. 반대(신 UI + 구 API)는 배포 순서상 api 먼저 배포로 회피
- **PENDING 사용자 API 접근 quirk**(docs/agents/app.md): SettingsController는 UserStatus 미검증 — 본 작업과 무관하나 rejectReason 마스킹(결정 7)으로 REJECTED 외 상태에서 사유 노출 차단됨
