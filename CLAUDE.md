# kista-ui

개발 가이드라인 전체는 `shrimp-rules.md` 참고. 여기서는 AI 작업 시 필요한 컨텍스트만 기록.

## 기술 스택 주의사항

- **shadcn v4 (Base UI 기반)**: `Button`에 `asChild` prop 없음 → `cn(buttonVariants({ variant, size }))` + `<Link>` 조합으로 대체
- **Next.js 15 dynamic route**: `params`는 `Promise` → 반드시 `const { id } = await params` 패턴 사용
- **Tailwind v4**: `tailwind.config.ts` 없음 — `postcss.config.mjs`와 `app/globals.css`로 설정

## 개발 환경

- shadcn 컴포넌트 추가: `npx shadcn@latest add <component> --yes --defaults`
- 타입 체크: `npm run typecheck` (tsc --noEmit)
- 빌드 검증: `npm run build`

## .gitignore 주의

- `.shrimp-data/` — shrimp-task-manager 데이터, 내부에 별도 git repo 포함 → 커밋 금지 (이미 ignore 처리됨)
- `next-env.d.ts` — Next.js 자동 생성 파일, 커밋 금지 (이미 ignore 처리됨)
