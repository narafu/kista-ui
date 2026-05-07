# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS** 프론트엔드.
상세 개발 규칙은 `shrimp-rules.md` 참고.

## 주요 명령어

```bash
npm run dev        # 개발 서버 (Turbopack)
npm run build      # 프로덕션 빌드 (Turbopack)
npm run typecheck  # TypeScript 타입 검사 (tsc --noEmit)
npm run lint       # ESLint

# shadcn 컴포넌트 추가
npx shadcn@latest add <component> --yes --defaults
```

## 아키텍처

### 인증 상태 라우팅
사용자 상태(`UserStatus`)에 따라 `middleware.ts`(루트)가 강제 분기:
- 비인증 → `/` | PENDING → `/pending` | REJECTED → `/rejected` | ACTIVE → `/dashboard`

`middleware.ts`: Supabase SSR 세션 + `kista-user-status` HTTP-only 쿠키(7일) 캐싱 기반 라우팅.
미들웨어에서는 `lib/supabase/server.ts` 불가(next/headers 사용 불가) — `@supabase/ssr` createServerClient를 `request.cookies`/`response.cookies`로 직접 구성.

### 레이아웃 그룹
- `app/(auth)/` — 비인증/PENDING/REJECTED 공통, 중앙 정렬 레이아웃
- `app/(main)/` — ACTIVE 전용, `DesktopSidebar`(lg 이상) + `MobileBottomNav`(lg 미만) 반응형

### API 계층
- API 레이어: `lib/api/{auth,accounts,trades,settings}.ts` — `apiFetch(path, options, accessToken)` 공통 래퍼 사용
- 모든 API 호출은 `lib/api/` 함수 경유 (컴포넌트 직접 fetch 금지)
- Supabase 클라이언트: 브라우저 컴포넌트 → `lib/supabase/client.ts`, 서버/미들웨어 → `lib/supabase/server.ts`
- Server Component token 취득: `const supabase = await createClient(); const { data: { session } } = await supabase.auth.getSession(); const token = session?.access_token`
- Client Component token 취득: `createClient().auth.getSession()` (lib/supabase/client.ts)

### 구현 현황
- **완료**: Phase 1-4 (UI, Auth, API 연동, 통계 차트)

## 기술 스택 quirk

- **shadcn v4 (@base-ui/react 기반)**: `Button`, `DialogTrigger` 등 모든 컴포넌트에 `asChild` 없음 → `cn(buttonVariants({ variant, size }))` 클래스 직접 적용
- **Next.js 15 dynamic route**: `params`는 `Promise` → `const { id } = await params`
- **Next.js 15 Route Handler**: `cookies()`는 async → `const cookieStore = await cookies()`
- **Tailwind v4**: `tailwind.config.ts` 없음 — `postcss.config.mjs` + `globals.css`로 설정
- **recharts**: SSR 미지원 → `'use client'` 필수. Tooltip `formatter`의 `value` 파라미터는 `ValueType | undefined` → `Number(value)` 사용
- **HTTP-only 쿠키 삭제**: Client JS에서 불가 → Route Handler에서 `response.cookies.set(name, '', { maxAge: 0 })` 처리
- **kista-api DTO**: `UserResponse`는 `{ id, nickname, status, hasTelegram }`, `AccountResponse`는 `{ id, nickname, accountNoMasked, strategy, strategyStatus, hasTelegram }` — `types/` 참고
