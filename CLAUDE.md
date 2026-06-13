# CLAUDE.md

세부 quirk는 각 디렉토리 CLAUDE.md 참고:
- `app/CLAUDE.md` — proxy·쿠키·Next.js·SSE·PWA quirk
- `entities/CLAUDE.md` — 도메인 모델·kista-api DTO·KIS quirk·queryKey
- `features/CLAUDE.md` — 사용자 시나리오·뮤테이션 훅 규칙
- `widgets/CLAUDE.md` — 페이지 합성·shadcn·CSS 토큰·UI 패턴
- `shared/CLAUDE.md` — api-client·format·cache·providers

## 프로젝트 개요

KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS** 프론트엔드.
기술 스택: **Next.js 16** · TypeScript · Tailwind CSS · shadcn/ui · React Query · Firebase (FCM)

## 주요 명령어

```bash
npm run dev        # 개발 서버 (Turbopack)
npm run build      # 프로덕션 빌드 (Turbopack)
npm run typecheck  # TypeScript 타입 검사 (tsc --noEmit)
# lint는 현재 실행 불가 (eslintrc circular JSON 오류) — typecheck만 사용

npx shadcn@latest add <component> --yes
```

## 아키텍처

### 인증 상태 라우팅
`proxy.ts`가 `UserStatus`에 따라 강제 분기: 비인증 → `/` | PENDING → `/pending` | REJECTED → `/rejected` | ACTIVE → `/dashboard`

### 레이아웃 그룹
- `app/(auth)/` — 비인증 전용
- `app/pending/`, `app/rejected/` — (main) 밖, Sidebar 미적용
- `app/(main)/` — ACTIVE 전용, DesktopSidebar(lg↑) + MobileBottomNav(lg↓)
- `app/(admin)/` — ADMIN role 전용

### FSD 계층 구조 (신규)

```
app/           → Next.js 라우팅만 (Server Component 데이터 페칭 + 레이아웃)
widgets/       → 페이지 합성 단위 (dashboard, account-detail, next-order-preview, ...)
features/      → 사용자 시나리오 (auth, settings, strategy, account, admin, ...)
entities/      → 도메인 모델 + API 함수 + React Query 훅 (account, strategy, order, ...)
shared/        → 도메인 무관 공용 (ui/, lib/api-client, lib/format, lib/utils, providers/)
```

의존성: `app → widgets → features → entities → shared` (단방향, 동일 계층 cross-import 금지)

### tsconfig 경로 alias

```
@app/*          → ./app/*
@widgets/*      → ./widgets/*
@features/*     → ./features/*
@entities/*     → ./entities/*
@shared/*       → ./shared/*
@/lib/*         → ./lib/*             (shadcn ui 호환 — 수정 금지)
@/components/*  → ./components/*      (shadcn ui 호환 — 수정 금지)
```

새 코드는 반드시 FSD alias(`@entities/*`, `@features/*`, `@widgets/*`, `@shared/*`) 사용.  
`@/lib/*`, `@/components/*`는 shadcn 자동생성 파일 전용 — 직접 사용 금지.

### API 계층
- `shared/lib/api-client/`: `apiFetch` (Server Component 전용, token 필요) / `clientFetch` (Client Component, Route Handler 경유) / `ApiError`
- `entities/{도메인}/api/`: 도메인별 API 함수
- Server Component: `getAuthToken()` → token 취득 후 `apiFetch` 호출
- Client Component: token 없이 `entities/{도메인}/api` 함수 → Route Handler 자동 경유
- **Client Component에서 직접 kista-api 호출 전면 금지** (CORS + 쿠키 문제)

## 환경변수

```
NEXT_PUBLIC_KAKAO_CLIENT_ID=   # 카카오 REST API 키
NEXT_PUBLIC_API_BASE_URL=      # kista-api Fly.io URL (https://kista-api.fly.dev)
```
- 새 `NEXT_PUBLIC_*` 추가 시 `.env.local.example` 동기화 필수
- Docker: `.env.local` 미전달 → `docker-compose.yml` `build.args`에 명시 필요
- `NEXT_PUBLIC_DEV_BYPASS_MIN_SEED=true` — 최소 시드 제한 우회 (로컬 전용)

## CORS

- Server Component fetch → Vercel 서버 → Fly.io — CORS 영향 있음
- `kista-api CORS_ALLOWED_ORIGINS`: `https://kista-ui.vercel.app,https://kista-ui-narafus-projects.vercel.app`
- Fly.io 로그에 없는 403 → CORS 필터 차단

## Docker

- `docker compose up -d --build` / `docker compose down` / `docker compose logs`
- `NEXT_PUBLIC_*` 빌드 타임 인라인 → Dockerfile `ARG`/`ENV` 필수
- API URL: `API_BASE_URL=http://host.docker.internal:8080` + `extra_hosts: host-gateway` (자세한 내용 → `app/CLAUDE.md`)
- Dockerfile Node.js 22 고정 필수 (`undici` v8 호환, 20으로 다운그레이드 금지)

## Git 규칙

- **git push는 사용자가 직접 실행** — Claude는 commit까지만
- `git config user.name` 확인 필수 — 올바른 값: `narafu <narafu@kakao.com>`
- 괄호 경로: `git add "app/(main)/layout.tsx"` (큰따옴표 필수)

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui` (`prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi`)
- GitHub 통합 자동 배포. 강제 재배포: `git commit --allow-empty -m "redeploy" && git push`
- `NEXT_PUBLIC_*` 비면 런타임 500 — Vercel 대시보드 env var 확인
- 환경변수: `vercel link --scope narafus-projects --project prj_...` 후 `vercel env ls production`
- 런타임 로그: `vercel logs --scope narafus-projects --json`
- catch-all Route Handler URL 변경 시 호출부(`entities/{domain}/api/`)만 수정 — Route Handler 수정 불필요

## 개발 도구

- 포트 충돌: Docker가 3000 점유 시 `npm run dev`는 3001 등으로 fallback → 실제 포트 확인: `cat /tmp/kista_dev.log | grep "Local:"`
- 개발 서버 요청/에러 로그: `.next/dev/logs/next-development.log` (JSON 형식, `tail -f`로 실시간 확인)
- Playwright: `npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:PORT/path /tmp/out.png` (첫 실행 시 `npx playwright install chromium`)
- kista-api 위치: `../kista-api/` — 빌드: `cd ../kista-api && ./gradlew compileJava`

## FE 코딩 가이드라인

### 코딩 컨벤션
- **포맷**: 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백 (`{ useState }`)
- **포맷 무단 변경 금지**: 기능 작업 중 기존 파일 포맷 일괄 변경 금지 — 별도 커밋으로 분리

### 스타일링
- **인라인 style 금지**: `style={{ ... }}` 엄격 금지 — Tailwind 유틸리티 클래스만 (반응형 무효화 방지). 예외: CSS 토큰 값(`var(--pos)`)은 `style={{ color: ... }}`로 사용
- **동적 스타일**: `cn()` · 복잡한 변형은 `cva`

## 기회적 리팩토링 원칙

다른 작업 중 가이드라인 위반 코드를 발견하면 **작업 완료 후 별도로 제안**할 것. 즉시 수정 금지.
