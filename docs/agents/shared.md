# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능하며, `shared/` 내부에서 `entities/`·`features/`·`widgets/` import는 금지한다.

## 디렉토리 구조

```text
shared/
  lib/
    api-client/
    api-types.ts
    api-schema.ts
    auth/
    cache/
    format/
    proxy/
    firebase.ts
    utils.ts
  providers/
  hooks/
  config/
  ui/
  index.ts
```

## api-client

```ts
import { apiFetch, clientFetch, ApiError } from '@shared/lib/api-client'
```

- `apiFetch(path, opts, token)`: Server Component 전용
- `clientFetch<T>(path, opts?)`: Client Component 전용, 401 시 자동 로그아웃
- `clientFetch<void>`: 204 응답 처리용

## format

- `fmtUsd(n)`
- `fmtDate(s)`

## cache

`unstable_cache` 래퍼. 5분 TTL. `revalidateTag(tag, 'max')` 호출로 무효화한다. 에러 처리는 `.catch()` 대신 `try/catch` 패턴 사용.

## utils

- `cn`: `clsx` + `tailwind-merge`
- `toNum`: BigDecimal string → number

## api-schema

`openapi.json`이 SSOT다. enum 타입을 직접 정의하지 말고 `api-schema.ts`에서 가져온다. 타입 재생성은 `npm run gen:types`.

## proxy

`createProxyRoute`는 catch-all Route Handler에서 kista-api 요청 프록시, 인증 토큰 포함, `revalidateTag` 처리를 공통화한다.

## ui

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리다.

- `RangeFilterBar`
- `PageSizeSelector`
- `PaginationBar`
- `Spinner`

shadcn 자동생성 컴포넌트는 `components/ui/`에 두고 `npx shadcn@latest add <component> --yes`로만 추가한다.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트한다. Toaster 배치 규칙은 `docs/agents/app.md`를 기준으로 본다.
