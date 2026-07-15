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
  model/
    placed-order.ts
  providers/
  ui/
    stepper/
    percent-gauge/
    RangeFilterBar.tsx
    PageSizeSelector.tsx
    PaginationBar.tsx
    Spinner.tsx
    CardSkeleton.tsx
    Badge.tsx
    EmptyState.tsx
    Surface.tsx
    IconButton.tsx
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

## model

도메인 무관 공용 도메인 모델 및 타입:

- `placed-order.ts` — 주문 상태 타입 (entities/order에서 재export)

## api-schema

`openapi.json`이 SSOT다. enum 타입을 직접 정의하지 말고 `api-schema.ts`에서 가져온다. 타입 재생성은 `npm run gen:types`.

## proxy

`createProxyRoute`는 catch-all 및 정적 Route Handler에서 kista-api 요청 프록시, 인증 토큰 포함, `revalidateTag` 처리를 공통화한다. 정적 Route Handler처럼 route context가 없는 호출은 `basePath`를 그대로 사용한다.

## ui

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리다.

- `RangeFilterBar` — 날짜 범위 필터링
- `PageSizeSelector` — 페이지당 항목 수 선택
- `PaginationBar` — 페이지 네이션
- `Spinner` — 로딩 표시기
- `CardSkeleton` — 로딩 스켈레톤
- `Badge` — 라벨 배지
- `EmptyState` — 빈 상태 표시
- `Surface` — 배경 서페이스
- `IconButton` — 44px 히트영역 아이콘 전용 버튼(`<button>`), `aria-label` 필수 prop. `<Link>` 아이콘 버튼엔 미사용(패턴만 수동 복제)
- `stepper/` — 다단계 폼 스테퍼
- `percent-gauge/` — 백분율 게이지 및 입력 컴포넌트

shadcn 자동생성 컴포넌트는 `components/ui/`에 두고 `npx shadcn@latest add <component> --yes`로만 추가한다.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트한다. Toaster 배치 규칙은 `docs/agents/app.md`를 기준으로 본다.
