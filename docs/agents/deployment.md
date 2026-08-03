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
- `CORS_ALLOWED_ORIGINS` 현재 값(Vercel 병행 운영 중): `https://kista-ui.vercel.app,https://kista-ui-narafus-projects.vercel.app` — OCI 도메인(`https://kista-app.com`) 커트오버 시 이 목록에 추가 필요(`../kista-api`의 서버 `.env`, 별도 저장소 작업)
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

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui` (ID: `prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi`)
- GitHub 통합 자동 배포
- 강제 재배포: `git commit --allow-empty -m "redeploy" && git push`
- `NEXT_PUBLIC_*` 비면 런타임 500 — Vercel 대시보드 env var 확인: `vercel link --scope narafus-projects --project prj_...` 후 `vercel env ls production`
- 운영 로그: `vercel logs --scope narafus-projects --json`
- catch-all Route Handler URL 변경 시 호출부(`entities/{domain}/api/`)만 수정 — Route Handler 본체 수정 불필요

## OCI 배포 (진행 중 — Vercel과 병행)

kista-api·fida에 이어 kista-ui도 Vercel에서 OCI(Oracle Cloud, arm64) 단일 인스턴스로 이전 중이다. 커트오버 완료·검증 전까지는 Vercel과 병행 운영하며, 완료 후에만 Vercel 정리를 재확인한다.

- 인스턴스: `kista-ui-server`, `VM.Standard.A1.Flex`(1 OCPU/6GB/부트 50GB), kista-api·fida와 동일 VCN이되 별도 인스턴스·별도 공인 IP
- 배포 파일: `deploy/server/{docker-compose.yml,Caddyfile,README.md}`(초기 서버 설정·GitHub Secrets·롤백 runbook·커트오버 체크리스트 상세), `.github/workflows/server-deploy.yml`
- 도메인: apex `kista-app.com` (kista-api `api.kista-app.com`, fida `fida.kista-app.com`와 구분)
- 헬스체크 대상: `app/api/health/route.ts` — 인증 불필요, Caddy·Docker healthcheck 공용
- `NEXT_PUBLIC_*` 9개는 이미지 빌드 타임에 인라인되므로 GitHub Secrets에도 동일 값 등록 필요(Vercel 대시보드와 별개 저장소)
- 현재 `server-deploy.yml` 트리거는 `workflow_dispatch`만 활성화 — 서버 초기 설정·Secrets 등록 후 최초 수동 배포 성공 시에만 `push: main` 자동 배포로 전환(상세: `deploy/server/README.md`)
- 세부 절차는 `deploy/server/README.md`가 SSOT — 이 문서에는 요약만 유지
