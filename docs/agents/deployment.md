## 환경변수

```text
NEXT_PUBLIC_KAKAO_CLIENT_ID=   # 카카오 REST API 키
NEXT_PUBLIC_API_BASE_URL=      # kista-api 도메인 (https://api.kista-app.com — OCI 이전 후 현재 값)

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
- Docker에서는 `NEXT_PUBLIC_*`가 빌드 타임 인라인되므로 `Dockerfile`의 `ARG`/`ENV`와 `docker-compose.yml` 전달을 함께 맞춰야 한다.
- **값 저장 위치는 배포 방식마다 다르다**: Vercel은 대시보드 env var, OCI는 GitHub Secrets(`server-deploy.yml`의 `build-args`) — 값을 갱신할 때 두 곳 다 반영해야 두 배포 경로가 드리프트하지 않는다(OCI 완전 커트오버·Vercel 정리 전까지).

## CORS / API 연동

- Server Component fetch도 서버 간 호출이므로 CORS 영향이 있다. **주의: kista-ui 서버→kista-api 서버 간 통신은 물리적으로 다른 호스트(Vercel/OCI 무관)라 항상 CORS 검증 대상이다.**
- kista-api 로그에 요청이 없는데 403이면 CORS 필터 차단 가능성을 먼저 본다
- `CORS_ALLOWED_ORIGINS` 현재 값(Vercel과 OCI 병행 운영 중): `https://kista-ui.vercel.app,https://kista-ui-narafus-projects.vercel.app,https://kista-app.com` (`../kista-api`의 서버 `.env`, 별도 저장소 작업, 2026-08-04 갱신)
- `kista-api` 연동 변경이 있으면 `../kista-api/CLAUDE.md`와 함께 확인한다.
- `kista-api`의 추가 운영/구현 규칙이 필요하면 `../kista-api/AGENTS.md`도 함께 확인한다.

## Docker

```bash
docker compose up -d --build     # 빌드 후 시작
docker compose down              # 정지
docker compose logs              # 로그 확인
```

설정:
- `NEXT_PUBLIC_*` 빌드 타임 인라인 → `Dockerfile` `ARG`/`ENV` 필수
- API URL: `API_BASE_URL=http://host.docker.internal:8080` + `docker-compose.yml` `extra_hosts: host-gateway` 설정
- Node.js 22 고정 필수 (undici v8 호환, 20으로 다운그레이드 금지)
- 세부 쿠키, 프록시, Route Handler quirk는 `app/CLAUDE.md` 참고

## Vercel 배포 (종료됨, 2026-08-04)

kista-ui는 더 이상 Vercel에서 운영되지 않는다. OCI 커트오버 검증(카카오 로그인 e2e 포함) 완료 후 `vercel git disconnect`로 GitHub 연동을 먼저 끊었으나, 옛 배포가 CORS·카카오 redirect 설정이 유효한 채로 계속 살아있어 실거래 가능한 프로덕션 표면으로 남는 문제가 있어 `vercel project remove kista-ui`로 프로젝트 자체를 완전히 삭제했다. `kista-ui.vercel.app`·`kista-ui-narafus-projects.vercel.app` 모두 404. 배포 이력·env var 복구 불가 — 재구축 필요 시 `vercel project add`부터 새로 시작해야 한다.

## OCI 배포 (커트오버 완료, 2026-08-04)

kista-api·fida에 이어 kista-ui도 Vercel에서 OCI(Oracle Cloud, arm64) 단일 인스턴스로 완전히 이전했다. Vercel 프로젝트 자체가 삭제됐으므로 이제 OCI가 유일한 운영 환경이다.

- 인스턴스: `kista-ui-server`, `VM.Standard.A1.Flex`(1 OCPU/6GB/부트 50GB), kista-api·fida와 동일 VCN이되 별도 인스턴스·별도 공인 IP(Reserved, `134.185.118.35`)
- 배포 파일: `deploy/server/{docker-compose.yml,Caddyfile,README.md}`(초기 서버 설정·GitHub Secrets·롤백 runbook·커트오버 체크리스트 상세), `.github/workflows/server-deploy.yml`
- 도메인: apex `kista-app.com` (kista-api `api.kista-app.com`, fida `fida.kista-app.com`와 구분)
- 헬스체크 대상: `app/api/health/route.ts` — 인증 불필요, Caddy·Docker healthcheck 공용
- `NEXT_PUBLIC_*` 9개는 이미지 빌드 타임에 인라인되므로 GitHub Secrets에 등록되어 있다(Vercel 대시보드와 별개 저장소)
- `server-deploy.yml` 트리거는 `push: main`(kista-api/fida와 동일)
- 세부 절차는 `deploy/server/README.md`가 SSOT — 이 문서에는 요약만 유지
