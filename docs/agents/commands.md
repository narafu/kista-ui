## 자주 쓰는 명령어

### Next.js / TypeScript

```bash
npm run dev           # 개발 서버 (Turbopack)
npm run build         # 프로덕션 빌드 (Turbopack)
npm run typecheck     # TypeScript 타입 검사
npm run test:run      # Vitest 1회 실행
npm run test          # Vitest watch
npm run test:coverage # 테스트 커버리지
npm run doctor        # React Doctor 점검
```

### OpenAPI 동기화

```bash
npm run fetch:spec    # 로컬 kista-api에서 openapi.json 갱신
npm run gen:types     # openapi.json 기준 shared/lib/api-types.ts 재생성
```

### shadcn/ui

```bash
npx shadcn@latest add <component> --yes
```

### Docker / 로컬 연동

```bash
docker compose up -d --build
docker compose down
docker compose logs
```

### 개발 로그 / 디버깅

```bash
cat /tmp/kista_dev.log | grep "Local:"   # dev 서버 실제 포트 확인
tail -f .next/dev/logs/next-development.log
npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:3000/path /tmp/out.png
cd ../kista-api && ./gradlew compileJava
```

참고:

- `lint`는 현재 신뢰 가능한 기본 검증 명령이 아니다. 루트 `CLAUDE.md` 기준으로 우선 `npm run typecheck`를 사용한다.
- Playwright 첫 실행 시 브라우저 설치가 필요하면 `npx playwright install chromium`.
