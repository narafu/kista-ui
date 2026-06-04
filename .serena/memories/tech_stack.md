# 기술 스택

## 언어/런타임
- TypeScript 5, React 19, Next.js 16.2.6 (Turbopack)
- Node.js 22 고정 필수 (undici v8 호환 — 20으로 다운그레이드 금지)

## 주요 의존성
- `@tanstack/react-query` ^5 — 서버 상태 관리
- `tailwindcss` ^4 + `tailwind-merge` + `class-variance-authority` — 스타일링
- `shadcn` ^4 + `@base-ui/react` — UI 컴포넌트
- `recharts` ^3 — 차트
- `sonner` — toast
- `vaul` — Drawer (모바일)
- `firebase` ^12 — FCM 푸시 알림
- `undici` ^8 — SSE 타임아웃 해결용

## 빌드/배포
- 패키지 매니저: npm
- 빌드: `next build --turbopack`
- 배포: Vercel 자동 배포 (GitHub main push)
- Docker: `docker compose up -d --build` (standalone 모드)

## 환경변수
- `NEXT_PUBLIC_KAKAO_CLIENT_ID` — 카카오 REST API 키
- `NEXT_PUBLIC_API_BASE_URL` — kista-api Render URL (빌드 타임 인라인)
- Docker Route Handler: `API_BASE_URL=http://host.docker.internal:8080` (빌드 타임 `NEXT_PUBLIC_*`와 별개)
- `NEXT_PUBLIC_DEV_BYPASS_MIN_SEED=true` — 최소 시드 제한 우회 (로컬 전용)
