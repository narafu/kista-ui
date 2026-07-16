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

- `lint`는 현재 신뢰 가능한 기본 검증 명령이 아니다 (react-doctor 규칙 미정의 오류). 기본 검증은 `npm run typecheck`.
- Playwright 첫 실행 시 브라우저 설치가 필요하면 `npx playwright install chromium`.
- 포트 충돌: Docker가 3000 점유 시 `npm run dev`는 3001 등으로 fallback — 실제 포트는 `cat /tmp/kista_dev.log | grep "Local:"`로 확인.
- `npm run typecheck`가 `.next/dev/types` 스테일 참조(삭제된 라우트)로 실패하면 `.next` 삭제 후 재실행 — 라우트 삭제·이동 뒤 발생하는 산출물 문제이며 코드 오류가 아님.
