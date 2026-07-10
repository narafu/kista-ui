# 관리자 회원 강제 탈퇴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 페이지 사용자 목록에 "탈퇴" 버튼을 추가해 관리자가 특정 회원을 강제 탈퇴(cascade 삭제)시킬 수 있도록 한다.

**Architecture:** kista-api의 `DELETE /api/admin/users/{userId}` 엔드포인트는 이미 구현 완료. kista-ui `entities/user` 레이어의 `deleteAdminUser()` API 함수와 `useDeleteAdminUserMutation()` 훅도 이미 존재. 추가할 것은 UI 레이어(`features/admin/withdraw-user/WithdrawUserButton.tsx`)와 `widgets/admin-user-list/AdminUsersTable.tsx`에 "탈퇴" 열 연결뿐.

**Tech Stack:** Next.js 16 · TypeScript · Tailwind CSS · React Query (`useDeleteAdminUserMutation`) · `useState` 기반 인라인 confirm modal

## Global Constraints

- 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백 (`{ useState }`) — `.prettierrc` 기준 포맷 준수
- `style={{ ... }}` 인라인 스타일 금지 — Tailwind 유틸리티 클래스만 사용 (CSS 토큰 값 예외)
- `@entities/*`, `@features/*`, `@widgets/*`, `@shared/*` FSD alias 사용 — `@/lib/*`·`@/components/*` 직접 사용 금지
- `'use client'` 필수 — 이벤트 핸들러 포함 컴포넌트
- 기능 작업 중 기존 파일 포맷 일괄 변경 금지
- `git push`는 사용자 명시적 요청 시에만 실행

---

## 사전 확인 (구현 전 필독)

### 이미 구현된 것 (건드리지 말 것)

| 파일 | 내용 |
|---|---|
| `kista-api/.../AdminUserController.java` | `DELETE /api/admin/users/{userId}` — cascade 삭제 + 감사 로그 |
| `entities/user/api/index.ts` line 93-95 | `deleteAdminUser(userId: string): Promise<void>` |
| `entities/user/hooks/useUserQueries.ts` line 151-162 | `useDeleteAdminUserMutation()` — `invalidateQueries(['adminUsers'])` + `router.refresh()` |
| `entities/user/index.ts` line 52 | `useDeleteAdminUserMutation` public export |

---

## File Map

| 파일 | 변경 |
|---|---|
| `features/admin/withdraw-user/WithdrawUserButton.tsx` | 신규 생성 — 탈퇴 버튼 + 인라인 confirm modal |
| `features/admin/withdraw-user/index.ts` | 신규 생성 — public re-export |
| `widgets/admin-user-list/AdminUsersTable.tsx` | 수정 — "탈퇴" 열 추가 |

---

## Task 1: WithdrawUserButton 컴포넌트

**Files:**
- Create: `features/admin/withdraw-user/WithdrawUserButton.tsx`
- Create: `features/admin/withdraw-user/index.ts`

**Interfaces:**
- Consumes: `useDeleteAdminUserMutation` from `@entities/user`
- Produces: `WithdrawUserButton({ userId: string, nickname: string })` — Task 2가 사용

- [ ] **Step 1: WithdrawUserButton.tsx 작성**

```tsx
'use client'

import { useState } from 'react'
import { useDeleteAdminUserMutation } from '@entities/user'

interface Props {
  userId: string
  nickname: string
}

export function WithdrawUserButton({ userId, nickname }: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useDeleteAdminUserMutation()

  function handleConfirm() {
    mutation.mutate(userId, {
      onSuccess: () => setOpen(false),
      onError: () => setOpen(false),
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[var(--status-error)]/50 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50 transition-colors"
      >
        탈퇴
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-[var(--r-lg)] p-6 w-[320px] shadow-lg">
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--status-error)' }}>
              회원 강제 탈퇴
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{nickname}</span> 회원을 탈퇴 처리합니다.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              계좌·전략·거래 데이터가 즉시 삭제되며 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
                className="flex-1 py-2 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className="flex-1 py-2 rounded-[var(--r-md)] text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                style={{ background: 'var(--status-error)' }}
              >
                {mutation.isPending ? '처리 중...' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

> **CSS 토큰 참고** (`widgets/CLAUDE.md`):
> - `--status-error`: 라이트 `#C8443A`, 다크 `#F87171`
> - `--status-error-bg`: 에러 배경색
> - `--status-error-border`: 에러 테두리색
> - `--r-lg`, `--r-md`: 라운드 반경 토큰
> - 색상이 CSS 토큰 값(`var(...)`)이므로 `style={{ color: ... }}`·`style={{ background: ... }}` 사용 — 이 경우는 CSS 토큰 예외에 해당

- [ ] **Step 2: index.ts 작성**

```ts
export { WithdrawUserButton } from './WithdrawUserButton'
```

- [ ] **Step 3: TypeScript 타입 검사**

```bash
npm run typecheck 2>&1 | head -40
```

오류 없어야 함. 오류 시 import 경로·타입 확인.

- [ ] **Step 4: 커밋**

```bash
git add features/admin/withdraw-user/WithdrawUserButton.tsx features/admin/withdraw-user/index.ts
git commit -m "feat(admin): 회원 강제 탈퇴 버튼 컴포넌트 추가"
```

---

## Task 2: AdminUsersTable에 탈퇴 열 연결

**Files:**
- Modify: `widgets/admin-user-list/AdminUsersTable.tsx`

**Interfaces:**
- Consumes: `WithdrawUserButton({ userId, nickname })` from `@features/admin/withdraw-user`
- Consumes: `AdminUser` (기존 타입 — `{ id, nickname, status, role, createdAt }`)

- [ ] **Step 1: 현재 파일 내용 확인 (이미 읽었으면 스킵)**

파일 경로: `widgets/admin-user-list/AdminUsersTable.tsx`

현재 테이블 열: 닉네임 | 상태 | 역할 | 가입일 | 역할 변경

- [ ] **Step 2: AdminUsersTable.tsx 수정**

`import` 블록에 `WithdrawUserButton` 추가 및 테이블에 "탈퇴" 열 추가:

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
}

export function AdminUsersTable({ initialUsers }: Props) {
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
                <ChangeRoleButton userId={user.id} currentRole={user.role} />
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

- [ ] **Step 3: TypeScript 타입 검사**

```bash
npm run typecheck 2>&1 | head -40
```

오류 없어야 함.

- [ ] **Step 4: 개발 서버에서 수동 확인**

```bash
# 개발 서버 시작 (이미 실행 중이면 스킵)
npm run dev > /tmp/kista_dev.log 2>&1 &
# 실제 포트 확인
sleep 3 && cat /tmp/kista_dev.log | grep "Local:"
```

브라우저에서 `http://localhost:{PORT}/admin/users` 접속 → "탈퇴" 열 표시 확인 → 탈퇴 버튼 클릭 → 모달 표시 확인 → "취소" 클릭 시 모달 닫힘 확인.

- [ ] **Step 5: 커밋**

```bash
git add "widgets/admin-user-list/AdminUsersTable.tsx"
git commit -m "feat(admin): 사용자 목록 테이블에 강제 탈퇴 열 추가"
```

---

## Self-Review

### Spec coverage
- ✅ 관리자가 회원을 탈퇴시킬 수 있는 UI 버튼 추가
- ✅ 확인 모달 — 실수 방지 (닉네임 표시 + 경고 문구)
- ✅ 기존 `useDeleteAdminUserMutation()` 재사용 (query invalidation + router.refresh 포함)
- ✅ kista-api `DELETE /api/admin/users/{userId}` 연동 (Route Handler proxy 경유, 별도 설정 불필요 — `app/api/admin/[[...path]]/route.ts` 이미 DELETE 지원)
- ✅ FSD 계층 준수: feature → entities 방향

### Placeholder scan
없음 — 모든 코드 블록이 실제 구현 완료.

### Type consistency
- `WithdrawUserButton({ userId: string, nickname: string })` — Task 1에서 정의, Task 2에서 `user.id`(string)·`user.nickname`(string)으로 호출 — 일치.
- `useDeleteAdminUserMutation()` — `mutate(userId: string)` — `entities/user/hooks/useUserQueries.ts:151` 참조.

### 추가 고려 사항 (현재 계획 범위 밖)
- **자기 자신 탈퇴 방지**: 현재 테이블에 현재 로그인 관리자의 ID가 없으므로 버튼 비활성화가 어려움. API 측 가드 없음. 우선 허용(관리자 책임)하되, 향후 `currentUserId` prop을 `AdminUsersPage`에서 내려서 `userId === currentUserId` 시 버튼 비활성화 가능.
- **ADMIN 역할 탈퇴 제한**: 현재 없음. 필요 시 `user.role === 'ADMIN'` 조건으로 버튼 비활성화 추가 가능.
