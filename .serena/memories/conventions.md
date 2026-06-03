# 코딩 컨벤션

## 포맷
- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 (`{ useState }`)
- 포맷 일괄 변경 금지 — 기능 작업 중 기존 파일 포맷 변경 금지, 별도 커밋으로 분리

## TypeScript
- `any` 엄격 금지 — 제네릭·`?.`·`??` 활용
- `TradingCycleResponse` 필드 추가 시 `types/strategy.ts` + `lib/api/strategies.ts`의 `normalizeStrategy()` **두 곳 동시 업데이트 필수** (누락 시 런타임 `undefined`)
- BigDecimal 필드는 `toNum()` 사용
- `lib/mock-data.ts` 하드코딩 mock — 인터페이스 변경 시 동기화 필수 (`typecheck`로 확인)

## 상태 관리
- 서버 상태: React Query — Query/Mutation 훅 분리. 서버 상태를 `useState`에 복사 금지
- 클라이언트 상태: `useState` 우선. Zustand는 진정한 전역에만
- `new Date()` SSR 불일치: `useState('')` + `useEffect(() => setState(...), [])` 패턴

## 컴포넌트 설계
- Server Component + 인터랙션: `*Button.tsx`/`*Trigger.tsx` 별도 Client Component 분리 (페이지 전체 `use client` 전환 금지)
- Server Component 갱신: `router.refresh()` 필요 (로컬 useState 업데이트만으론 서버 값 미반영)
- 형제 컴포넌트 router.refresh() 후 state: `useEffect(() => setState(prop), [prop])` 동기화 패턴
- JSX 내 IIFE 금지: `{(() => {...})()}` — 계산 변수는 컴포넌트 본문 상단 호이스팅
- `비동기 선언적 위임`: `Suspense`, `ErrorBoundary`, `loading.tsx`, `error.tsx`

## 전략(Strategy/TradingCycle) 판별
- `'INFINITE'`/`'PRIVACY'` 리터럴 분기 금지
- INFINITE: `typeMeta?.availableTickers?.length > 1`
- API 인자: `meta.tickers.map(t => t.code)` (하드코딩 금지)

## Route Handler / API
- Route Handler에서 API URL: `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 패턴 필수
- `204` 응답: `clientFetch<void>` 사용 (`res.json()` 금지)
- 독립 API 호출은 try/catch 분리 (묶으면 두 번째 실패 시 첫 번째 성공 toast 덮어씀)
- Promise.all fail-fast 방지: 각 항목에 `.catch(() => null)` 필수

## CSS/스타일링
- 인라인 `style={{ display: ... }}` 금지 — Tailwind 반응형 무효화
- `style={{ ... }}` 전면 금지 — 예외: `var(--pos)`, `var(--neg)` 등 CSS 토큰
- 손익 색상: `style={{ color: v >= 0 ? 'var(--pos)' : 'var(--neg)' }}`
- `--status-error`: 반려 색상. 하드코딩 `#C8443A` 금지
- 다크모드 gradient: `.dark .class-name {}` 오버라이드 패턴 (globals.css)

## Git
- 괄호 경로 git add: `git add "app/(main)/layout.tsx"` (큰따옴표 필수)
- git push는 사용자가 직접 실행 — Claude는 commit까지만
