# shared/ — 도메인 무관 공용 자산

도메인 지식 없이 어디서나 사용 가능한 유틸리티. 모든 계층에서 import 가능하며, `shared/` 내부에서 `entities/`·`features/`·`widgets/` import는 금지한다. 구성: `lib/`(api-client·api-schema·auth·cache·format·hooks·proxy·date-range·firebase·utils), `model/`, `providers/`, `ui/`.

## api-client

```ts
import { apiFetch, clientFetch, ApiError } from '@shared/lib/api-client'
```

- `apiFetch(path, opts, token)`: Server Component 전용
- `clientFetch<T>(path, opts?)`: Client Component 전용, 401 시 자동 로그아웃
- `clientFetch<void>`: 204 응답 처리용

## format

- `fmtUsd(n)` / `fmtSignedUsd(n)` — USD 금액
- `fmtDate(s)` / `fmtDateTime(s)` / `fmtMonthDay(s)` / `fmtTime(s)` — 날짜·시각
- `todayKst()` — KST 기준 오늘 (ISO date string)
- `pnlTextClass(n)` — 손익 부호별 텍스트 클래스

## date-range

`lib/date-range.ts` — `RangePreset('7d'|'30d'|'all'|'custom')`, `resolveRange`/`resolveRangeStrict`, URL 쿼리 파서(`parseRangePreset`/`parseSize`/`parsePage`). `UrlRangeFilterBar`와 함께 사용.

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

`shared/ui/`는 도메인 무관 커스텀 UI 컴포넌트 디렉토리다. 이름으로 역할이 자명한 것들(`Spinner`·`CardSkeleton`·`Badge`·`EmptyState`·`Surface`·`PageSizeSelector`·`PaginationBar`·`UrlRangeFilterBar`·`stepper/`·`percent-gauge/`) 외 비자명 규칙만 기록:

- `IconButton` — 44px 히트영역 아이콘 전용 버튼(`<button>`), `aria-label` 필수 prop. `<Link>` 아이콘 버튼엔 미사용(패턴만 수동 복제)
- `TableHeadCell` — 테이블 헤더 셀 공통 스타일 (`<th>` 래퍼)
- `SelectionCard` — `selected`를 `aria-pressed`와 테마 대응 외곽선·틴트로 표현하는 선택 버튼. 큰 카드는 `showIndicator`를 명시해 체크 표시

shadcn 자동생성 컴포넌트는 `components/ui/`에 두고 `npx shadcn@latest add <component> --yes`로만 추가한다.

## providers

`Providers` 컴포넌트는 루트 `app/layout.tsx`에서 마운트한다. Toaster 배치 규칙은 `docs/agents/app.md`를 기준으로 본다.
