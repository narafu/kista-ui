# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능.  
`shared/` 내부에서 `entities/`·`features/`·`widgets/` import 금지.

## 디렉토리 구조

```
shared/
  lib/
    api-client/   # apiFetch, clientFetch, ApiError
    auth/         # getAuthToken (Server Component 전용)
    cache/        # getCachedAccounts, getCachedStrategies, getMe (unstable_cache 래퍼)
    format/       # fmtUsd, fmtKrw, fmtPercent, fmtDate, fmtTime
    firebase.ts   # Firebase 앱 초기화
    utils.ts      # cn(), toNum()
  providers/
    QueryProvider.tsx   # React Query Provider (retry:0, staleTime:0, gcTime:5min)
    Providers.tsx       # QueryProvider + ThemeProvider 조합
  hooks/          # 도메인 무관 범용 훅 (현재 미사용)
  config/         # 환경 상수 (현재 미사용)
  ui/             # shadcn 컴포넌트 (수정 금지 — 자동생성)
  index.ts        # public re-export
```

## api-client

```ts
import { apiFetch, clientFetch, ApiError } from '@shared/lib/api-client'
```

- **`apiFetch(path, opts, token)`**: Server Component 전용 — kista-api 직접 호출. token 필수.
- **`clientFetch<T>(path, opts?)`**: Client Component 전용 — `/api/...` Route Handler 경유. 401 시 자동 로그아웃.
- **`clientFetch<void>`**: 204 응답 처리. `res.json()` 직접 호출 금지.

## format

```ts
import { fmtUsd, fmtKrw, fmtPercent, fmtDate, fmtTime } from '@shared/lib/format'
```

- `fmtUsd(n)` — `$1,234.56`
- `fmtKrw(n)` — `₩1,234,567`
- `fmtPercent(n)` — `+12.34%`
- `fmtDate(s)` — `2025-06-05`
- `fmtTime(s)` — `14:32`

## cache (Server Component 전용)

```ts
import { getCachedAccounts, getCachedStrategies, getMe } from '@shared/lib/cache'
```

`unstable_cache` 래퍼. 5분 TTL. `revalidateTag(tag, 'max')` 호출로 무효화.  
에러 처리: `.catch()` 금지 → `try { await getCachedX() } catch {}` 패턴.

## utils

```ts
import { cn } from '@shared/lib/utils'   // clsx + tailwind-merge
import { toNum } from '@shared/lib/utils' // BigDecimal string → number
```

## ui (shadcn)

`shared/ui/` 파일 직접 수정 금지. `npx shadcn@latest add <component> --yes`로만 추가.  
shadcn 파일 내부에서 `@/components/ui/*`, `@/lib/utils` alias 사용 — 이 alias 직접 사용 금지.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트. `QueryProvider` 단독 사용도 가능. Toaster 배치 규칙은 `app/CLAUDE.md` 참고.
