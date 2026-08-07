# Server deployment (OCI)

`kista-ui`를 OCI 단일 인스턴스 `kista-api-server`에서 Docker Compose로 운영한다 — `kista-api`와 같은 인스턴스를 공유하며, Caddy(리버스 프록시)·PostgreSQL·Redis는 `kista-infra` 레포가 전담 호스팅한다(`kista-ui-server`라는 별도 인스턴스는 2026-08-07 인스턴스 재편으로 삭제되고 이 인스턴스로 통합됨). 이 레포는 `kista-ui` 컨테이너 하나만 배포·운영하며, 호스트 프로비저닝·방화벽·도메인·Caddy·Reserved IP는 `kista-infra` 소관이다 — 상세는 그 레포 README 참고.

## 서버 레이아웃

```text
/opt/kista-ui/
├── .env                    ← kista-infra 배포 워크플로가 매 배포마다 렌더링·덮어씀
└── docker-compose.yml      ← GitHub Actions 업로드
```

## 초기 서버 설정

호스트 프로비저닝(OCI 인스턴스·방화벽·Docker 설치·로그 로테이션 등)과 도메인·Caddy·Reserved IP 관리는 `kista-infra` 레포가 전담한다 — 상세 절차는 그 레포 README의 "서버 재구축 시 순서" 참고.

`/opt/kista-ui/` 디렉터리 생성·`.env` 렌더링은 이 레포와 kista-infra의 배포 워크플로가 각각 자동으로 처리한다(`server-deploy.yml`이 `mkdir -p`, kista-infra가 `.env` 렌더링) — 수동으로 만들거나 `.env`를 직접 편집할 필요 없다. 직접 편집해도 다음 kista-infra 배포 때 소실된다(위 "서버 레이아웃" 참고). 환경변수 변경은 반드시 kista-infra의 `scripts/env.sh edit kista-ui` 경로로만 한다.

## GitHub Secrets

| Secret | 설명 |
|--------|------|
| `SERVER_HOST` | 서버 IP 또는 도메인 — `kista-api`와 같은 인스턴스를 공유하지만 저장소별 GitHub Secret은 독립 등록 필요 |
| `SERVER_USER` | SSH 사용자명 |
| `SERVER_SSH_KEY` | SSH 개인키 (PEM) — kista-api/fida와 동일 키페어 |
| `SERVER_SSH_PORT` | SSH 포트 (기본값 22, 생략 가능) |

`NEXT_PUBLIC_*` 9개는 레포 루트 `.env.production.public`(평문 커밋, 클라이언트 번들에 노출되는 설계상 공개값)에서 빌드 타임에 로드된다 — GitHub Secrets 미사용. 값 변경 시 이 파일을 직접 수정.

## .env 내용

`NEXT_PUBLIC_*`는 빌드 타임에 이미지에 인라인되므로 서버 `.env`에 다시 넣을 필요 없다. 서버 `.env`에는 `API_BASE_URL`(kista-ui 런타임이 실제로 소비 — `environment:`로 컨테이너에 주입됨)과 `UI_DOMAIN` 2개가 있다. **`UI_DOMAIN`은 이 레포의 스택에서는 더 이상 아무것도 소비하지 않는 사실상 흔적값이다** — kista-infra의 Caddy는 자신의 `/opt/kista-infra/.env`(`infra.env.gpg`에서 렌더링)에 담긴 자체 `UI_DOMAIN`을 참조하며, kista-ui의 `docker-compose.yml`도 더 이상 `UI_DOMAIN`을 읽지 않는다. `server-deploy.yml`의 필수 키 검증(`for key in UI_DOMAIN API_BASE_URL`)이 여전히 이 값의 존재를 요구하므로 `.env`에는 계속 채워둬야 한다. 이 `.env` 자체는 `kista-infra`의 배포 워크플로가 `secrets/kista-ui.env.gpg`에서 매 배포마다 렌더링·덮어쓴다 — 값을 바꾸려면 kista-infra의 `scripts/env.sh edit kista-ui`로 암호화 파일을 직접 수정해야 하며, 서버 `.env`를 직접 편집해도 다음 kista-infra 배포 때 덮어써진다.

```dotenv
UI_DOMAIN=kista-app.com
API_BASE_URL=https://api.kista-app.com
```

## 배포 흐름

`push: main` 또는 `workflow_dispatch` → `server-deploy.yml` — kista-api/fida와 동일한 트리거 구조다.

1. `main` push 또는 `workflow_dispatch` → `verify` job (`npm run typecheck`, `npm run test:run`)
2. Docker 이미지 빌드(`.env.production.public`에서 읽은 9개 `NEXT_PUBLIC_*`를 build-args로 주입) → GHCR push
3. SSH로 `docker-compose.yml` 업로드
4. `docker compose pull kista-ui && docker compose up -d --no-deps kista-ui` (caddy는 kista-infra 소관 — 이 워크플로 관여 없음)
5. 헬스 게이트: 호스트에서 `docker inspect --format '{{.State.Health.Status}}' kista-ui`로 컨테이너 헬스 상태를 10초 간격 최대 5분(300초) 폴링
6. 실패 시 이전 이미지로 자동 롤백
7. Caddy `lb_try_duration 120s`가 컨테이너 재시작 공백을 클라이언트에 투명하게 처리

kista-api와 달리 매매 시간대 배포 가드는 불필요하다 — kista-ui는 로그인·조회 UI일 뿐 트레이딩 로직을 직접 실행하지 않는다.

## 롤백 Runbook

**자동 롤백**: 헬스 게이트 실패 시 Actions가 이전 이미지로 자동 복구. 자동 롤백 후 롤백된 컨테이너의 헬스는 재검증되지 않으므로, Actions 실패 알림을 받으면 서버에서 `docker inspect --format '{{.State.Health.Status}}' kista-ui`로 수동 확인 필요.

**수동 롤백**: GHCR에 SHA 태그 이미지가 보존됨.
```bash
cd /opt/kista-ui
docker images | grep kista-ui

export KISTA_UI_IMAGE=ghcr.io/<org>/kista-ui:<previous-sha>
docker compose up -d --no-deps kista-ui
```

**이미지 디스크 정리 참고**: 배포 워크플로의 `docker image prune -f`는 dangling(태그 없는) 레이어만 제거한다 — 롤백에 쓰이는 SHA 태그 이미지는 계속 쌓인다. 디스크 압박이 느껴지면 수동으로 `docker image prune -af --filter "until=720h"`(30일 이상 지난 이미지만) 등으로 정리하되, 최근 롤백 후보 몇 개는 남겨둘 것.

## 모니터링

- **헬스체크**: `/api/health` (Next.js Route Handler, 인증 불필요) — Caddy·Docker healthcheck 공용 대상
- **로그**: `docker compose logs -f kista-ui` (서버 SSH)

## 운영 전환 시 확인 사항

신규 인스턴스로 재구축하거나 도메인을 바꿀 때 재확인할 항목 — 정상 운영 중에는 해당 없음.

- 카카오 개발자 콘솔 redirect URI가 실제 UI 도메인(`https://kista-app.com/auth/callback`)과 일치하는지 — `app/(auth)/login/page.tsx`가 `window.location.origin` 기반으로 동적 생성하므로 도메인만 콘솔에 등록하면 됨
- `../kista-api` 쪽 `CORS_ALLOWED_ORIGINS`(SSOT: `kista-infra` secrets)에 UI 도메인이 등록돼 있는지
- Vercel 프로젝트(`narafus-projects/kista-ui`)는 완전 삭제되어 더 이상 운영 대상이 아님 — 재구축 시 `vercel project add`부터 새로 시작
