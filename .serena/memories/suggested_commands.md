# 운영 명령어

## 개발/빌드
```bash
npm run dev          # 개발 서버 (Turbopack, 포트 3000 또는 3001+)
npm run build        # 프로덕션 빌드
npm run typecheck    # TypeScript 타입 검사 (tsc --noEmit) — lint 대신 사용
# lint는 현재 실행 불가 (eslintrc circular JSON 오류)
```

## shadcn 컴포넌트 추가
```bash
npx shadcn@latest add <component> --yes
```

## Docker
```bash
docker compose up -d --build   # 빌드+기동
docker compose down
docker compose logs
```

## 배포
```bash
# Vercel 강제 재배포
git commit --allow-empty -m "redeploy" && git push

# 운영 로그
vercel logs --scope narafus-projects --json

# 환경변수 확인
vercel link --scope narafus-projects --project prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi
vercel env ls production
```

## 디버깅
```bash
# 개발 서버 실제 포트 확인
cat /tmp/kista_dev.log | grep "Local:"

# 스타일 버그 탐지 (display 인라인 style)
grep -rn "style={{ display:" app components --include="*.tsx"

# 스크린샷 (첫 실행 시 playwright install chromium)
npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:PORT/path /tmp/out.png
```

## Git
```bash
# 괄호 경로는 큰따옴표 필수
git add "app/(main)/layout.tsx"
```
