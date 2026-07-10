# Admin Error Logs Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 사이드바에 "오류 로그" 메뉴를 추가하고, `GET /api/admin/error-logs` 데이터를 조회·표시하는 페이지를 구현한다.

**Architecture:** 기존 `/admin/audit` 페이지 패턴을 그대로 따른다. `entities/user`에 타입·API 함수를 추가하고, Server Component page에서 데이터를 fetch한 뒤 `'use client'` `ErrorLogItem` 컴포넌트로 stackTrace 접기/펼치기 상호작용을 처리한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, lucide-react

## Global Constraints

- `apiFetch` 사용: server-side token 전달 방식 (`entities/user/api/index.ts` 패턴)
- `'use client'` 컴포넌트는 최소 단위로 분리 — page.tsx 자체는 Server Component 유지
- Tailwind 클래스만 사용 — 인라인 style 금지
- 새 icon은 `lucide-react`에서 import

---

### Task 1: AppErrorLog 타입 및 API 함수 추가

**Files:**
- Modify: `entities/user/model/types.ts`
- Modify: `entities/user/api/index.ts`
- Modify: `entities/user/index.ts`

**Interfaces:**
- Produces: `AppErrorLog` 인터페이스, `listAdminErrorLogs(token: string, limit?: number): Promise<AppErrorLog[]>`

- [ ] **Step 1: `AppErrorLog` 타입을 `types.ts` 끝에 추가**

`entities/user/model/types.ts` 파일 끝에 추가:
```ts
export interface AppErrorLog {
  id: string
  errorType: string
  message: string
  stackTrace: string
  context: Record<string, string>
  createdAt: string
}
```

- [ ] **Step 2: API 함수를 `api/index.ts` 끝에 추가**

`entities/user/api/index.ts`의 import 줄에 `AppErrorLog` 추가:
```ts
import type { User, UserRole, UserStatus, AdminUser, AdminStats, AdminAccount, AdminTrade, AdminAuditLog, AdminAnomalies, AppErrorLog } from '../model/types'
```

파일 끝에 함수 추가:
```ts
export async function listAdminErrorLogs(token: string, limit = 100): Promise<AppErrorLog[]> {
  return apiFetch<AppErrorLog[]>(`/api/admin/error-logs?limit=${limit}`, { method: 'GET' }, token)
}
```

- [ ] **Step 3: `index.ts`에 export 추가**

`entities/user/index.ts`의 `export type { ... }` 블록에 `AppErrorLog` 추가:
```ts
export type {
  UserStatus,
  UserRole,
  NotificationChannel,
  User,
  AdminUser,
  AdminStats,
  AdminAccount,
  AdminTrade,
  AdminAuditLog,
  AdminAnomalyAccount,
  AdminAnomalies,
  AppErrorLog,             // ← 추가
} from './model/types'
```

`export { ... }` 블록에 함수 추가:
```ts
  listAdminErrorLogs,     // ← 추가 (getAdminAnomalies 뒤에)
```

- [ ] **Step 4: 타입 컴파일 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 5: 커밋**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add entities/user/model/types.ts entities/user/api/index.ts entities/user/index.ts
git commit -m "feat(entities): AppErrorLog 타입 및 listAdminErrorLogs API 함수 추가"
```

---

### Task 2: ErrorLogItem 클라이언트 컴포넌트

**Files:**
- Create: `features/admin/error-logs/ErrorLogItem.tsx`
- Create: `features/admin/error-logs/index.ts`

**Interfaces:**
- Consumes: `AppErrorLog` from `@entities/user`
- Produces: `ErrorLogItem` 컴포넌트 — `props: { log: AppErrorLog }`

- [ ] **Step 1: `features/admin/error-logs/` 디렉토리 생성 및 `ErrorLogItem.tsx` 작성**

```tsx
'use client'

import { useState } from 'react'
import type { AppErrorLog } from '@entities/user'

export function ErrorLogItem({ log }: { log: AppErrorLog }) {
  const [open, setOpen] = useState(false)
  const hasContext = Object.keys(log.context).length > 0

  return (
    <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* errorType 뱃지 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
              {log.errorType}
            </span>
          </div>

          {/* message */}
          <p className="text-sm mt-1 font-medium break-all">{log.message}</p>

          {/* context */}
          {hasContext && (
            <pre className="mt-1 text-xs text-muted-foreground bg-muted/40 rounded p-1 overflow-x-auto">
              {JSON.stringify(log.context, null, 2)}
            </pre>
          )}

          {/* stackTrace 접기/펼치기 */}
          <button
            onClick={() => setOpen(v => !v)}
            className="mt-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {open ? '스택트레이스 접기' : '스택트레이스 보기'}
          </button>
          {open && (
            <pre className="mt-1 text-xs bg-muted/40 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
              {log.stackTrace}
            </pre>
          )}
        </div>

        {/* 발생 시각 */}
        <time className="text-xs text-muted-foreground shrink-0">
          {new Date(log.createdAt).toLocaleString('ko-KR')}
        </time>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `index.ts` 작성**

```ts
export { ErrorLogItem } from './ErrorLogItem'
```

- [ ] **Step 3: 타입 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add features/admin/error-logs/
git commit -m "feat(features): ErrorLogItem 클라이언트 컴포넌트 추가"
```

---

### Task 3: 페이지 및 loading 스켈레톤

**Files:**
- Create: `app/(admin)/admin/error-logs/page.tsx`
- Create: `app/(admin)/admin/error-logs/loading.tsx`

**Interfaces:**
- Consumes: `listAdminErrorLogs` from `@entities/user`, `ErrorLogItem` from `@features/admin/error-logs`

- [ ] **Step 1: `page.tsx` 작성**

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { listAdminErrorLogs } from '@entities/user'
import type { AppErrorLog } from '@entities/user'
import { ErrorLogItem } from '@features/admin/error-logs'

export default async function AdminErrorLogsPage() {
  const token = await getAuthToken()
  const logs: AppErrorLog[] = token
    ? await listAdminErrorLogs(token, 100).catch(() => [])
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">오류 로그</h1>
        <p className="text-sm text-muted-foreground mt-1">
          최근 {logs.length}건
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          기록된 오류가 없습니다
        </div>
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border">
          {logs.map((log) => (
            <ErrorLogItem key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `loading.tsx` 작성**

```tsx
export default function AdminSubLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-muted mb-6" />
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-border last:border-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 타입 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add "app/(admin)/admin/error-logs/"
git commit -m "feat(admin): 오류 로그 조회 페이지 추가"
```

---

### Task 4: 사이드바 네비게이션 추가

**Files:**
- Modify: `widgets/layout/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `Bug` icon from `lucide-react`

- [ ] **Step 1: `AdminSidebar.tsx` 수정**

`lucide-react` import 줄에 `Bug` 추가:
```ts
import { LayoutDashboard, Users, LogOut, Wallet, ArrowLeftRight, ScrollText, AlertTriangle, ArrowLeft, Table2, Bug } from 'lucide-react'
```

`NAV_ITEMS` 배열에서 `'/admin/audit'` 항목 바로 뒤에 추가:
```ts
  { href: '/admin/audit',       label: '감사 로그', icon: ScrollText },
  { href: '/admin/error-logs',  label: '오류 로그', icon: Bug },        // ← 추가
  { href: '/admin/anomalies',   label: '이상 징후', icon: AlertTriangle },
```

- [ ] **Step 2: 타입 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui && npx tsc --noEmit
```
Expected: 오류 없음

- [ ] **Step 3: 커밋**

```bash
cd /Users/phs/workspace/kista/kista-ui
git add widgets/layout/AdminSidebar.tsx
git commit -m "feat(admin): 사이드바에 오류 로그 메뉴 추가"
```

---

### Task 5: 동작 검증

- [ ] **Step 1: 개발 서버 기동**

```bash
cd /Users/phs/workspace/kista/kista-ui && npm run dev
```

- [ ] **Step 2: 어드민 로그인 후 `/admin/error-logs` 접속 확인**

- 사이드바에 "오류 로그" 메뉴 표시 여부
- 페이지 로드 시 목록 또는 빈 상태 메시지 표시 여부
- "스택트레이스 보기" 버튼 클릭 시 stackTrace 펼쳐지는지 확인

- [ ] **Step 3: 최종 커밋 (변경사항 없으면 생략)**
