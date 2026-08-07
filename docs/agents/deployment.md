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

- 새 `NEXT_PUBLIC_*` 추가 시 `.env.example`과 레포 루트 `.env.production.public`(평문 커밋, 빌드 타임 로드용) 동기화 필수
- Docker에서는 `NEXT_PUBLIC_*`가 빌드 타임 인라인되므로 `Dockerfile`의 `ARG`/`ENV`와 `docker-compose.yml` 전달을 함께 맞춰야 한다.

## CORS / API 연동

- Server Component fetch도 서버 간 호출이므로 CORS 영향이 있다.
- kista-api 로그에 요청이 없는데 403이면 CORS 필터 차단 가능성을 먼저 본다
- `CORS_ALLOWED_ORIGINS`에 UI 도메인(`https://kista-app.com`)이 등록돼 있어야 한다 — SSOT는 `kista-infra` 레포의 `secrets/kista-api.env.gpg`(`scripts/env.sh edit kista-api`로 편집), kista-api 서버 `.env` 직접 수정은 다음 배포 때 덮어써져 무효
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

## Vercel 배포 (종료됨)

kista-ui는 더 이상 Vercel에서 운영되지 않는다. `vercel project remove kista-ui`로 프로젝트 자체를 완전히 삭제했다 — 배포 이력·env var 복구 불가, 재구축 필요 시 `vercel project add`부터 새로 시작해야 한다.

## OCI 배포

kista-ui는 OCI(Oracle Cloud, arm64) 단일 인스턴스 `kista-api-server`에서 `kista-api`와 함께 운영된다(2026-08-07 `kista-ui-server` 인스턴스 통합 완료). 토폴로지 상세는 `deploy/server/README.md` 참고.

- 배포 파일: `deploy/server/{docker-compose.yml,README.md}`(롤백 runbook 등 상세), `.github/workflows/server-deploy.yml`
- 도메인: apex `kista-app.com` (kista-api `api.kista-app.com`, fida `fida.kista-app.com`와 구분)
- 헬스체크 대상: `app/api/health/route.ts` — 인증 불필요, Caddy·Docker healthcheck 공용
- `NEXT_PUBLIC_*` 9개는 이미지 빌드 타임에 인라인되며, 레포 루트 `.env.production.public`(평문 커밋 — 공개 클라이언트 번들 노출값이라 평문 커밋이 안전하다는 판단)에서 로드된다. GitHub Secrets는 미사용
- `server-deploy.yml` 트리거는 `push: main`(kista-api/fida와 동일)
- 세부 절차는 `deploy/server/README.md`가 SSOT — 이 문서에는 요약만 유지
