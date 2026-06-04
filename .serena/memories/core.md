# kista-ui 코어

KISTA V2 — KIS API 기반 해외주식 자동 분할매매 초대제 멀티 사용자 SaaS 프론트엔드.
백엔드: kista-api (`../kista-api/`), 배포: Vercel (`narafus-projects/kista-ui`)

## 디렉토리 구조

```
app/
  (auth)/          — 비인증 전용
  (main)/          — ACTIVE 전용, DesktopSidebar + MobileBottomNav
  (admin)/         — ADMIN role 전용
  pending/         — PENDING 사용자
  rejected/        — REJECTED 사용자
  api/             — Route Handler (Server→kista-api 중계)
  layout.tsx       — 루트 레이아웃, Toaster 단 하나
  globals.css      — CSS 토큰 정의 (--warn, --pos, --neg, --status-error 등)

components/
  common/          — KpiCard, RevealableValue, ProfitDisplay, StrategyBadge 등
  accounts/        — 계좌 관련 UI
  strategies/      — 전략(=TradingCycle) 관련 UI
  providers/       — QueryProvider, MetaProvider, FcmAutoRegister
  layout/          — 사이드바, 네비
  admin/           — 관리자 UI
  ui/              — shadcn (직접 수정 금지)

lib/
  api/             — apiFetch/clientFetch + 기능별 API 함수
  cache/           — unstable_cache + revalidateTag (tags.ts, cached-api.ts)
  fcm.ts           — FCM 토큰 등록/해제
  mock-data.ts     — 타입 변경 시 동기화 필수

hooks/             — 범용 훅 (컴포넌트 전용은 components/{feature}/hooks/)
types/             — TypeScript 인터페이스
proxy.ts           — Edge middleware (구 middleware.ts, Next.js 16)
```

## 인증 상태 라우팅 (proxy.ts)
비인증→`/` | PENDING→`/pending` | REJECTED→`/rejected` | ACTIVE→`/dashboard` | ADMIN→`/admin`

## API 계층 핵심 규칙
- Server Component: `apiFetch(path, opts, token)` — kista-api 직접 호출
- Client Component: `clientFetch<T>(path, opts?)` — Route Handler 경유 필수 (CORS+쿠키)
- **Client Component에서 kista-api 직접 호출 절대 금지**

## 불변 규칙
- `components/ui/` (shadcn) 직접 수정 금지
- 인라인 `style={{ display: ... }}` 금지 (Tailwind 반응형 무효화)
- `style={{ ... }}` 전면 금지 — 예외: CSS 토큰 값(`var(--pos)`)만 허용
- `'INFINITE'`/`'PRIVACY'` 리터럴 분기 금지 — `findStrategyType()` / `availableTickers.length > 1` 판별
- `any` 타입 엄격 금지

## 주요 참조 메모리
- API 계층 상세: `mem:api_layer`
- 컴포넌트 패턴·shadcn·스타일링: `mem:components`
- Next.js/proxy/쿠키/SSE quirk: `mem:nextjs_quirks`
- 빌드·배포·명령어: `mem:suggested_commands`
- 코딩 컨벤션: `mem:conventions`
