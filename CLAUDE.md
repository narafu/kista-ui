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

`middleware.ts`는 현재 Phase 1-2 더미 구현. Phase 3(TASK-004)에서 Supabase SSR 세션 기반으로 완성 예정.

### 레이아웃 그룹
- `app/(auth)/` — 비인증/PENDING/REJECTED 공통, 중앙 정렬 레이아웃
- `app/(main)/` — ACTIVE 전용, `DesktopSidebar`(lg 이상) + `MobileBottomNav`(lg 미만) 반응형

### API 계층
- Phase 1-2: `lib/mock-data.ts` 더미 데이터 사용
- Phase 3+: `lib/api/auth.ts`, `lib/api/accounts.ts`, `lib/api/trades.ts`, `lib/api/settings.ts`로 교체 예정
- 모든 API 호출은 `lib/api/` 함수 경유 (컴포넌트 직접 fetch 금지)
- Supabase 클라이언트: 브라우저 컴포넌트 → `lib/supabase/client.ts`, 서버/미들웨어 → `lib/supabase/server.ts`

### 구현 현황
- **완료**: Phase 1-2 (프로젝트 초기화, 공통 컴포넌트, 7개 페이지 UI)
- **대기**: Phase 3-4 — kista-api V2(users/accounts DB + Auth/Account API) 완료 후 진행

## 기술 스택 quirk

- **shadcn v4 (@base-ui/react 기반)**: `Button`에 `asChild` 없음 → `cn(buttonVariants({ variant, size }))` + `<Link>` 사용
- **Next.js 15 dynamic route**: `params`는 `Promise` → `const { id } = await params`
- **Tailwind v4**: `tailwind.config.ts` 없음 — `postcss.config.mjs` + `globals.css`로 설정
