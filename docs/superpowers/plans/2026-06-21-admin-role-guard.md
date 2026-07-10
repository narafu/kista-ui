# 관리자 역할 변경 방어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 자기 자신을 USER로 강등하거나 마지막 ADMIN을 강등하는 것을 API(kista-api)와 UI(kista-ui) 양쪽에서 방어한다.

**Architecture:** kista-api `AdminService.changeRole()`에 두 가지 guard 추가 (자기 강등 → 400, 마지막 ADMIN 강등 → 400). kista-ui `ChangeRoleButton`에 `isSelf` prop 추가, 자신의 행에서는 버튼을 비활성화·툴팁 표시. 두 Task는 서로 독립적.

**Tech Stack:** Java 21 · Spring Boot 3 · JUnit 5 + Mockito (kista-api) / Next.js 16 · TypeScript · Tailwind CSS (kista-ui)

## Global Constraints

- kista-api: Hexagonal Architecture 준수, 감사 로그 유지, `IllegalArgumentException` → 400, `IllegalStateException` → 400 (GlobalExceptionHandler 기존 매핑)
- kista-ui: 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백, `style={{ ... }}` 금지 (CSS 토큰 var() 예외), FSD alias 사용
- git push 금지 — 사용자 명시적 요청 시에만
- 커밋 author: `narafu <narafu@kakao.com>`
- 기존 파일 포맷(따옴표·세미콜론 등) 일괄 변경 금지

---

## File Map

| 파일 | 변경 | 레포 |
|---|---|---|
| `domain/port/out/UserPort.java` | `countByRole` 메서드 추가 | kista-api |
| `adapter/out/persistence/user/UserJpaRepository.java` | `countByRole` 쿼리 추가 | kista-api |
| `adapter/out/persistence/user/UserPersistenceAdapter.java` | `countByRole` 구현 추가 | kista-api |
| `application/service/admin/AdminService.java` | `changeRole()`에 guard 2개 추가 | kista-api |
| `application/service/admin/AdminServiceTest.java` | 테스트 3개 추가 | kista-api |
| `app/(admin)/admin/users/page.tsx` | `getMe(token)` 추가, `currentUserId` prop 전달 | kista-ui |
| `widgets/admin-user-list/AdminUsersTable.tsx` | `currentUserId` prop 추가, `ChangeRoleButton`에 전달 | kista-ui |
| `features/admin/change-role/ChangeRoleButton.tsx` | `isSelf` prop 추가, 비활성화·툴팁 처리 | kista-ui |

---

## Task 1: kista-api — countByRole 추가 + changeRole guard

**Files:**
- Modify: `src/main/java/com/kista/domain/port/out/UserPort.java`
- Modify: `src/main/java/com/kista/adapter/out/persistence/user/UserJpaRepository.java`
- Modify: `src/main/java/com/kista/adapter/out/persistence/user/UserPersistenceAdapter.java`
- Modify: `src/main/java/com/kista/application/service/admin/AdminService.java`
- Modify: `src/test/java/com/kista/application/service/admin/AdminServiceTest.java`

**작업 디렉토리:** `/Users/phs/workspace/kista/kista-api`

**Interfaces:**
- Produces: `userPort.countByRole(User.UserRole.ADMIN)` — Task 2와 무관 (UI 독립)

- [ ] **Step 1: UserPort에 countByRole 추가**

`src/main/java/com/kista/domain/port/out/UserPort.java` 에 한 줄 추가:

```java
long countByRole(User.UserRole role); // 역할별 사용자 수 (관리자 최소 1명 검증용)
```

기존 `countByStatus` 바로 아래에 삽입.

- [ ] **Step 2: UserJpaRepository에 countByRole 추가**

`src/main/java/com/kista/adapter/out/persistence/user/UserJpaRepository.java` 에 추가:

```java
long countByRole(User.UserRole role); // 역할별 사용자 수 (Spring Data JPA 자동 파생)
```

기존 `countByStatus` 바로 아래에 삽입.

- [ ] **Step 3: UserPersistenceAdapter에 countByRole 구현**

`src/main/java/com/kista/adapter/out/persistence/user/UserPersistenceAdapter.java` 에 추가:

```java
@Override
public long countByRole(User.UserRole role) {
    return jpaRepository.countByRole(role);
}
```

기존 `countByStatus` 구현 바로 아래에 삽입.

- [ ] **Step 4: AdminService.changeRole에 guard 추가**

`src/main/java/com/kista/application/service/admin/AdminService.java` 의 `changeRole` 메서드를 아래로 교체:

```java
@Override
public void changeRole(UUID adminId, UUID targetUserId, User.UserRole role) {
    if (role == User.UserRole.USER) {
        // 자기 자신 강등 방지
        if (adminId.equals(targetUserId)) {
            throw new IllegalArgumentException("자기 자신의 역할을 강등할 수 없습니다");
        }
        // 마지막 ADMIN 강등 방지
        if (userPort.countByRole(User.UserRole.ADMIN) <= 1) {
            throw new IllegalStateException("최소 1명의 관리자가 존재해야 합니다");
        }
    }
    User user = userPort.findByIdOrThrow(targetUserId);
    userPort.save(user.withRole(role));
    log.info("관리자 역할 변경: adminId={}, targetUserId={}, role={}", adminId, targetUserId, role);
    auditLogPort.log(adminId, "USER_ROLE_CHANGE", "USER", targetUserId,
            Map.of("newRole", role.name()));
}
```

- [ ] **Step 5: 컴파일 확인**

```bash
./gradlew compileJava 2>&1 | tail -10
```

오류 없어야 함.

- [ ] **Step 6: 실패 테스트 작성**

`src/test/java/com/kista/application/service/admin/AdminServiceTest.java` 에 3개 테스트 추가 (기존 `changeRole_updatesRoleAndLogsAudit` 아래):

```java
@Test
void changeRole_throwsWhenSelfDemotion() {
    UUID adminId = UUID.randomUUID();

    assertThatThrownBy(() -> adminService.changeRole(adminId, adminId, User.UserRole.USER))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("자기 자신");
}

@Test
void changeRole_throwsWhenLastAdmin() {
    UUID adminId = UUID.randomUUID(), targetId = UUID.randomUUID();
    when(userPort.countByRole(User.UserRole.ADMIN)).thenReturn(1L);

    assertThatThrownBy(() -> adminService.changeRole(adminId, targetId, User.UserRole.USER))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("최소 1명");
}

@Test
void changeRole_allowsDemotionWhenMultipleAdmins() {
    UUID adminId = UUID.randomUUID(), targetId = UUID.randomUUID();
    User existing = user(targetId, User.UserStatus.ACTIVE);
    when(userPort.countByRole(User.UserRole.ADMIN)).thenReturn(2L);
    when(userPort.findByIdOrThrow(targetId)).thenReturn(existing);
    when(userPort.save(any())).thenAnswer(inv -> inv.getArgument(0));

    adminService.changeRole(adminId, targetId, User.UserRole.USER);

    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userPort).save(captor.capture());
    assertThat(captor.getValue().role()).isEqualTo(User.UserRole.USER);
}
```

import 필요: `import static org.assertj.core.api.Assertions.assertThatThrownBy;`
(기존 파일에 `import static org.assertj.core.api.Assertions.assertThat;`가 있으므로 한 줄 추가)

- [ ] **Step 7: 테스트 실행 — 실패 확인**

```bash
./gradlew test --tests "com.kista.application.service.admin.AdminServiceTest" 2>&1 | tail -20
```

새 3개 테스트 실패, 기존 4개 통과 예상.

- [ ] **Step 8: 테스트 통과 확인**

Step 4 구현이 이미 완료됐으므로 다시 실행:

```bash
./gradlew test --tests "com.kista.application.service.admin.AdminServiceTest" 2>&1 | tail -20
```

7/7 통과 예상.

- [ ] **Step 9: 커밋 (kista-api)**

```bash
git -C /Users/phs/workspace/kista/kista-api add \
  src/main/java/com/kista/domain/port/out/UserPort.java \
  src/main/java/com/kista/adapter/out/persistence/user/UserJpaRepository.java \
  src/main/java/com/kista/adapter/out/persistence/user/UserPersistenceAdapter.java \
  src/main/java/com/kista/application/service/admin/AdminService.java \
  src/test/java/com/kista/application/service/admin/AdminServiceTest.java
git -C /Users/phs/workspace/kista/kista-api commit -m "feat(admin): 역할 변경 시 자기 강등·마지막 ADMIN 강등 방지"
```

---

## Task 2: kista-ui — ChangeRoleButton 자신 비활성화

**Files:**
- Modify: `app/(admin)/admin/users/page.tsx`
- Modify: `widgets/admin-user-list/AdminUsersTable.tsx`
- Modify: `features/admin/change-role/ChangeRoleButton.tsx`

**작업 디렉토리:** `/Users/phs/workspace/kista/kista-ui`

**Interfaces:**
- Consumes: `getMe(token): Promise<User>` from `@entities/user` — `{ id: string, ... }`
- Produces: `ChangeRoleButton({ userId, currentRole, isSelf? })` — `isSelf=true`이면 비활성화

- [ ] **Step 1: AdminUsersPage — currentUserId 내려주기**

`app/(admin)/admin/users/page.tsx` 전체 교체:

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminUsers, getMe } from '@entities/user'
import { AdminUsersTable } from '@widgets/admin-user-list'

export default async function AdminUsersPage() {
  const token = await getAuthToken()
  const [users, me] = token
    ? await Promise.all([
        listAdminUsers(token).catch(() => []),
        getMe(token).catch(() => null),
      ])
    : [[], null]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">사용자 목록</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {users.length}명</p>
      </div>
      <AdminUsersTable initialUsers={users} currentUserId={me?.id ?? null} />
    </div>
  )
}
```

- [ ] **Step 2: AdminUsersTable — currentUserId prop 추가 및 전달**

`widgets/admin-user-list/AdminUsersTable.tsx` 전체 교체:

```tsx
'use client'

import { useAdminUsersQuery } from '@entities/user'
import { ChangeRoleButton } from '@features/admin/change-role'
import { WithdrawUserButton } from '@features/admin/withdraw-user'
import { fmtDate } from '@shared/lib/format'
import type { AdminUser, UserStatus } from '@entities/user'

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: '대기',
  ACTIVE: '승인',
  REJECTED: '거절',
}

interface Props {
  initialUsers: AdminUser[]
  currentUserId: string | null
}

export function AdminUsersTable({ initialUsers, currentUserId }: Props) {
  const { data: users = initialUsers } = useAdminUsersQuery(undefined, initialUsers)

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border p-12 text-center text-sm text-muted-foreground">
        등록된 사용자가 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground font-semibold">
          <tr>
            <th className="text-left px-4 py-3 whitespace-nowrap">닉네임</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">상태</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">역할</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">가입일</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">역할 변경</th>
            <th className="text-left px-4 py-3 whitespace-nowrap">탈퇴</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 font-medium whitespace-nowrap">{user.nickname}</td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {STATUS_LABEL[user.status]}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {user.role}
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {fmtDate(user.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <ChangeRoleButton
                  userId={user.id}
                  currentRole={user.role}
                  isSelf={currentUserId === user.id}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <WithdrawUserButton userId={user.id} nickname={user.nickname} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: ChangeRoleButton — isSelf prop 추가**

`features/admin/change-role/ChangeRoleButton.tsx` 전체 교체:

```tsx
'use client'

import { toast } from 'sonner'
import { useChangeUserRoleMutation } from '@entities/user'
import type { UserRole } from '@entities/user'

interface Props {
  userId: string
  currentRole: UserRole
  isSelf?: boolean
}

export function ChangeRoleButton({ userId, currentRole, isSelf = false }: Props) {
  const mutation = useChangeUserRoleMutation()
  const newRole: UserRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'

  function handleChange() {
    mutation.mutate({ userId, role: newRole }, {
      onSuccess: () => toast.success(`역할을 ${newRole}로 변경했습니다`),
      onError: () => toast.error('역할 변경 실패'),
    })
  }

  if (isSelf) {
    return (
      <div className="relative group inline-block">
        <button
          type="button"
          disabled
          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground opacity-40 pointer-events-none"
        >
          → {newRole}
        </button>
        <span className="absolute left-0 top-full mt-1 px-2 py-1 text-xs bg-popover border border-border rounded shadow-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          자신의 역할은 변경할 수 없습니다
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={mutation.isPending}
      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      {mutation.isPending ? '...' : `→ ${newRole}`}
    </button>
  )
}
```

> **툴팁 패턴 근거** (`widgets/CLAUDE.md`):
> "disabled 버튼은 JS hover 차단되지만 부모 div의 CSS hover는 정상" → wrapper `div`에 `group` + 툴팁에 `opacity-0 group-hover:opacity-100`

- [ ] **Step 4: TypeScript 타입 검사**

```bash
npm run typecheck 2>&1 | head -40
```

오류 없어야 함.

- [ ] **Step 5: 커밋 (kista-ui)**

```bash
git -C /Users/phs/workspace/kista/kista-ui add \
  "app/(admin)/admin/users/page.tsx" \
  "widgets/admin-user-list/AdminUsersTable.tsx" \
  "features/admin/change-role/ChangeRoleButton.tsx"
git -C /Users/phs/workspace/kista/kista-ui commit -m "feat(admin): 자신 역할 변경 버튼 비활성화"
```

---

## Self-Review

### Spec coverage
- ✅ API guard — 자기 강등 (`adminId == targetUserId && role == USER`) → 400
- ✅ API guard — 마지막 ADMIN 강등 (`countByRole(ADMIN) <= 1 && role == USER`) → 400
- ✅ UI guard — `isSelf=true` 시 버튼 비활성화 + 툴팁
- ✅ `countByRole` 포트 추가 (UserPort → JpaRepository → Adapter 3-layer 전파)
- ✅ 기존 `changeRole_updatesRoleAndLogsAudit` 테스트 영향 없음 (ADMIN 승격 테스트라 guard 미진입)
- ✅ 마지막 ADMIN이 자신 강등 시도 — 자기 강등 guard가 먼저 발동 (더 구체적인 오류)

### Placeholder scan
없음.

### Type consistency
- `getMe(token)` 반환 타입 `User` (`{ id: string, ... }`) → `me?.id` 타입 `string | undefined` → `?? null`로 `string | null`
- `AdminUsersTable` Props: `currentUserId: string | null`
- `ChangeRoleButton` Props: `isSelf?: boolean` (기본값 `false`) — nullish `currentUserId === user.id`는 `null === string` → `false` 정상

### 추가 고려 사항
- **WithdrawUserButton에는 자기 탈퇴 방지 없음**: 관리자가 자기 자신을 탈퇴시키는 것은 더 심각하지만, 이 계획 범위 밖. 필요 시 같은 패턴으로 추가 가능 (`currentUserId` 이미 테이블에 있음).
- **ADMIN_KAKAO_IDS 안전망**: kista-api 환경변수에 Kakao ID가 등록된 관리자는 재로그인 시 자동 복구됨. 이 guard는 의도치 않은 실수 방지용.
