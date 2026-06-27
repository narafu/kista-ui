# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능.  
`shared/` 내부에서 `entities/`·`features/`·`widgets/` import 금지.

## 디렉토리 구조

```
shared/
  lib/
    api-client/   # apiFetch, clientFetch, ApiError
    api-types.ts  # openapi-typescript 자동생성 — 직접 수정 금지 (npm run gen:types로 재생성)
    api-schema.ts # api-types에서 필요한 enum 타입만 re-export하는 facade
    auth/         # getAuthToken (Server Component 전용)
    cache/        # getCachedAccounts, getCachedStrategies, getMe (unstable_cache 래퍼)
    format/       # fmtUsd, fmtDate
    proxy/        # createProxyRoute — catch-all Route Handler 공통 로직 (인증·revalidateTag 내장)
    firebase.ts   # Firebase 앱 초기화
    utils.ts      # cn(), toNum()
  providers/
    QueryProvider.tsx   # React Query Provider (retry:0, staleTime:0, gcTime:5min)
    Providers.tsx       # QueryProvider + ThemeProvider 조합
  hooks/          # 도메인 무관 범용 훅 (현재 미사용)
  config/         # 환경 상수 (현재 미사용)
  ui/             # 커스텀 공용 UI 컴포넌트 (RangeFilterBar, PageSizeSelector, PaginationBar)
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
import { fmtUsd, fmtDate } from '@shared/lib/format'
```

- `fmtUsd(n)` — `$1,234.56`
- `fmtDate(s)` — `2025-06-05`

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

## api-schema (OpenAPI 타입 파생)

```ts
import type { BrokerCode, CycleSeedType, UserStatus } from '@shared/lib/api-schema'
```

`openapi.json`이 SSOT — enum 타입을 직접 정의하지 말고 `api-schema.ts`에서 import.  
`api-types.ts` 재생성: `npm run gen:types` (`openapi.json` 교체 후 실행).  
새 타입이 필요하면 `api-schema.ts`에 `NonNullable<components['schemas']['XxxResponse']['field']>` 형태로 추가.

## proxy (Route Handler 공통)

```ts
import { createProxyRoute } from '@shared/lib/proxy'
```

catch-all Route Handler에서 kista-api 요청 프록시 + 인증 토큰 포함 + `revalidateTag` 자동 처리.  
Route Handler URL 변경 시 `entities/{domain}/api/` 호출부만 수정 — `createProxyRoute` 내부 수정 불필요.

## ui (커스텀 공용 컴포넌트)

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리. 현재 구성:

- `RangeFilterBar` — 기간 필터 버튼 바. `presets` prop으로 표시할 프리셋 목록 커스터마이즈 가능 (기본값 `['7d','30d','all','custom']`). admin 페이지는 `['all','custom']`만 전달.
- `PageSizeSelector` — 페이지 크기 선택 드롭다운
- `PaginationBar` — 페이지네이션 바
- `Spinner` — 로딩 스피너. `size`(기본 16) · `className` prop. 인라인 spinner SVG 직접 작성 금지 — 항상 이 컴포넌트 사용

shadcn 자동생성 컴포넌트는 `components/ui/`에 위치 — `npx shadcn@latest add <component> --yes`로만 추가, 직접 수정 금지.  
shadcn 파일 내부에서 `@/components/ui/*`, `@/lib/utils` alias 사용 — 이 alias 직접 사용 금지.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트. `QueryProvider` 단독 사용도 가능. Toaster 배치 규칙은 `app/CLAUDE.md` 참고.
