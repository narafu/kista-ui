## 자주 쓰는 명령어

npm 스크립트 목록은 `package.json`이 SSOT다 (`dev`/`build`/`typecheck`/`test`/`test:run`/`test:coverage`/`doctor`/`fetch:spec`/`gen:types` 등).

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
npm run visual-diff -- <base-ref>   # 리팩토링 전후 화면 픽셀 비교 (scripts/visual-diff/README.md)
```

참고:

- `npm run lint`는 0 errors 상태다(warning은 `react-hooks/exhaustive-deps` 등 잔존) — 새 error를 만들지 않는다. 의도된 미사용 변수·인자는 `_` 접두로 표기한다. react-doctor 규칙은 `eslint.config.mjs` stub으로 등록돼 있다. 기본 검증은 `npm run typecheck` + `npm run lint`.
- Playwright 첫 실행 시 브라우저 설치가 필요하면 `npx playwright install chromium`.
- 포트 충돌: Docker가 3000 점유 시 `npm run dev`는 3001 등으로 fallback — 실제 포트는 `cat /tmp/kista_dev.log | grep "Local:"`로 확인.
- `npm run typecheck`가 `.next/dev/types` 스테일 참조(삭제된 라우트)로 실패하면 `.next` 삭제 후 재실행 — 라우트 삭제·이동 뒤 발생하는 산출물 문제이며 코드 오류가 아님.
