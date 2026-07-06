# CLAUDE.md

이 파일은 Claude Code 진입점이다. Codex 진입점은 `AGENTS.md`이며, 실제 프로젝트 공통 지식은 `docs/agents/`에 둔다.

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
npm run doctor     # React Doctor 점검
# lint는 react-doctor 규칙 미정의 오류 발생으로 신뢰 불가 — typecheck만 사용

npx shadcn@latest add <component> --yes
```

@AGENTS.md
@docs/agents/commands.md
@docs/agents/architecture.md
@docs/agents/constraints.md
@docs/agents/deployment.md
@docs/agents/app.md
@docs/agents/entities.md
@docs/agents/features.md
@docs/agents/widgets.md
@docs/agents/shared.md

## 아키텍처

### 인증 상태 라우팅
`proxy.ts`가 `UserStatus`에 따라 강제 분기: 비인증 → `/` | PENDING → `/pending` | REJECTED → `/rejected` | ACTIVE → `/dashboard`

### 레이아웃 그룹
- `app/(auth)/` — 비인증 전용
- `app/pending/`, `app/rejected/` — (main) 밖, Sidebar 미적용
- `app/(main)/` — ACTIVE 전용, DesktopSidebar(lg↑) + MobileBottomNav(lg↓)
- `app/(admin)/` — ADMIN role 전용

### FSD 계층 구조

```
app/           → Next.js 라우팅만 (Server Component 데이터 페칭 + 레이아웃)
widgets/       → 페이지 합성 단위 (dashboard, account-detail, strategy-detail, ...)
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

# Firebase FCM
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=     # 웹 푸시 VAPID 인증서 키
```
- 새 `NEXT_PUBLIC_*` 추가 시 `.env.example` 동기화 필수
- Docker: `.env.local` 미전달 → `docker-compose.yml` `build.args`에 명시 필요

## CORS

- Server Component fetch → Vercel 서버 → Fly.io — CORS 영향 있음
- `kista-api CORS_ALLOWED_ORIGINS`: `https://kista-ui.vercel.app,https://kista-ui-narafus-projects.vercel.app`
- Fly.io 로그에 없는 403 → CORS 필터 차단

## Docker

- `docker compose up -d --build` / `docker compose down` / `docker compose logs`
- `NEXT_PUBLIC_*` 빌드 타임 인라인 → Dockerfile `ARG`/`ENV` 필수
- API URL: `API_BASE_URL=http://host.docker.internal:8080` + `extra_hosts: host-gateway` (자세한 내용 → `app/CLAUDE.md`)
- Dockerfile Node.js 22 고정 필수 (`undici` v8 호환, 20으로 다운그레이드 금지)

## 작업 방식

- **기존 오류 발견 시 적극 수정**: 코드베이스 탐색 중 발견한 타입 오류, 컴파일 오류, 명백한 버그는 현재 작업과 무관하더라도 별도 확인 없이 즉시 수정할 것 (범위가 넓으면 먼저 언급)
- **의심 사항 적극 제보**: 확실하지 않더라도 버그·설계 이상·불일치가 의심되면 묻어두지 말고 바로 언급할 것 — "확실하지 않지만 X가 이상해 보입니다" 형태로 제보
- **리팩토링 필요 적극 제보**: 코드 중복·불필요한 복잡도·FSD 계층 위반·가이드라인 불일치 등 리팩토링이 필요해 보이면 현재 작업과 무관하더라도 적극 언급할 것 (즉시 수정은 작업 완료 후 별도 진행)
- **보일러플레이트 즉시 수정**: 반복 객체 생성, 불필요한 중간 변수, 유틸 함수로 추출 가능한 중복 코드를 발견하면 제안 없이 즉시 수정
- **작업 완료 후 자동 커밋**: 요청된 작업이 완전히 완료되면 스스로 커밋을 생성할 것 — 사용자가 별도로 "커밋해줘"라고 요청하지 않아도 됨
- **kista-api 연계 작업 감지 시**: API 응답 형식 변경, 인증/토큰 흐름 등 kista-api와 결합된 작업이면 즉시 `../kista-api/CLAUDE.md`를 Read로 확인할 것 — 세션 시작 디렉토리가 아닌 저장소의 CLAUDE.md는 자동 로드되지 않음
- **기회적 리팩토링**: 다른 작업 중 가이드라인 위반 코드(FSD 계층 위반·코드 중복·불필요한 복잡도)를 발견하면 작업 완료 후 별도로 제안할 것 — 즉시 수정 금지

## Git 규칙

- **git push는 사용자가 명시적으로 요청할 때만 실행** — 요청 없이 자동 푸시 금지, 요청하면 즉시 실행
- `git config user.name` / `git config user.email` 확인 필수 — 올바른 값: name=`narafu`, email=`narafu@kakao.com`
- 괄호 경로: `git add "app/(main)/layout.tsx"` (큰따옴표 필수)

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui` (`prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi`)
- GitHub 통합 자동 배포. 강제 재배포: `git commit --allow-empty -m "redeploy" && git push`
- `NEXT_PUBLIC_*` 비면 런타임 500 — Vercel 대시보드 env var 확인
- 환경변수: `vercel link --scope narafus-projects --project prj_...` 후 `vercel env ls production`
- **운영 로그 (vercel-cli)**: `vercel logs --scope narafus-projects --json`
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

