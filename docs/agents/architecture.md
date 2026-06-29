## 프로젝트 개요

KISTA V2 프론트엔드. 한국투자증권 KIS API 기반 해외주식 자동 분할매매 SaaS의 Next.js 앱이다.

- 주요 스택: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, React Query, Firebase FCM
- 백엔드 연동: `../kista-api`

## 인증 상태 라우팅

`proxy.ts`가 `UserStatus`에 따라 강제 분기한다.

- 비인증: `/`
- `PENDING`: `/pending`
- `REJECTED`: `/rejected`
- `ACTIVE`: `/dashboard`

## 레이아웃 그룹

- `app/(auth)/`: 비인증 전용
- `app/pending/`, `app/rejected/`: `(main)` 밖, Sidebar 미적용
- `app/(main)/`: ACTIVE 전용, `DesktopSidebar` + `MobileBottomNav`
- `app/(admin)/`: ADMIN role 전용

## FSD 계층 구조

```text
app/           -> Next.js 라우팅만 (Server Component 데이터 페칭 + 레이아웃)
widgets/       -> 페이지 합성 단위
features/      -> 사용자 시나리오
entities/      -> 도메인 모델 + API 함수 + React Query 훅
shared/        -> 도메인 무관 공용
```

의존성은 `app -> widgets -> features -> entities -> shared` 단방향이다. 동일 계층 cross-import는 금지한다.

## tsconfig 경로 alias

```text
@app/*         -> ./app/*
@widgets/*     -> ./widgets/*
@features/*    -> ./features/*
@entities/*    -> ./entities/*
@shared/*      -> ./shared/*
@/lib/*        -> ./lib/*        # shadcn ui 호환용
@/components/* -> ./components/* # shadcn ui 호환용
```

새 코드는 FSD alias를 우선 사용한다. `@/lib/*`, `@/components/*`는 shadcn 자동생성 파일 호환용으로만 유지한다.

## API 계층

- `shared/lib/api-client/`: `apiFetch`, `clientFetch`, `ApiError`
- `entities/{domain}/api/`: 도메인별 API 함수
- Server Component: `getAuthToken()`으로 토큰 취득 후 `apiFetch`
- Client Component: 도메인 API 함수 호출 후 Route Handler 경유

Client Component에서 직접 `kista-api`를 호출하면 안 된다. 인증 쿠키와 CORS 처리는 Route Handler 경유를 전제로 한다.

## 보조 문서

세부 구현 quirk는 아래 문서를 추가로 본다.

- `app/CLAUDE.md`
- `entities/CLAUDE.md`
- `features/CLAUDE.md`
- `widgets/CLAUDE.md`
- `shared/CLAUDE.md`
