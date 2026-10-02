# Server deployment (OCI)

`kista-ui`를 OCI 단일 인스턴스 `kista-api-server`에서 Docker Compose로 운영한다 — `kista-api`와 같은 인스턴스를 공유하며, Caddy(리버스 프록시)·PostgreSQL·Redis는 `kista-infra` 레포가 전담 호스팅한다(`kista-ui-server`라는 별도 인스턴스는 2026-08-07 인스턴스 재편으로 삭제되고 이 인스턴스로 통합됨). 이 레포는 `kista-ui` 컨테이너 하나만 배포·운영하며, 호스트 프로비저닝·방화벽·도메인·Caddy·Reserved IP는 `kista-infra` 소관이다 — 상세는 그 레포 README 참고.

## 서버 레이아웃

```text
/opt/kista-ui/
├── .env                    ← kista-infra 배포 워크플로가 매 배포마다 렌더링·덮어씀
├── releases/<id>/          ← kista-infra가 config SHA의 deploy/server/{docker-compose.yml,roles,required-env} + images.env로 구성한 bundle
├── current → releases/<id> ← 마지막 적용 성공 release
├── previous → releases/<id>
└── reconcile.log           ← 마지막 reconcile 출력
```

## 초기 서버 설정

호스트 프로비저닝(OCI 인스턴스·방화벽·Docker 설치·로그 로테이션 등)과 도메인·Caddy·Reserved IP 관리는 `kista-infra` 레포가 전담한다 — 상세 절차는 그 레포 README의 "서버 재구축 시 순서" 참고.

`/opt/kista-ui/` 디렉터리 생성·`.env` 렌더링·release 업로드는 kista-infra 워크플로가 자동으로 처리한다 — 수동으로 만들거나 `.env`를 직접 편집할 필요 없다. 직접 편집해도 다음 kista-infra 배포 때 소실된다(위 "서버 레이아웃" 참고). 환경변수 변경은 반드시 kista-infra의 `scripts/env.sh edit kista-ui` 경로로만 한다.

## GitHub Secrets

| Secret | 설명 |
|--------|------|
| `INFRA_APP_PRIVATE_KEY` (secret) + `INFRA_APP_CLIENT_ID` (Actions variable) | GitHub App `kista-infra-dispatch`(kista-infra에만 설치, Contents read/write·Actions read) — Actions 변수 `INFRA_APP_CLIENT_ID` + secret `INFRA_APP_PRIVATE_KEY`, 워크플로가 실행마다 `actions/create-github-app-token`으로 1시간짜리 설치 토큰 발급(장기 PAT 없음). 이 레포는 서버 SSH 키를 갖지 않는다 |

`NEXT_PUBLIC_*` 9개는 레포 루트 `.env.production.public`(평문 커밋, 클라이언트 번들에 노출되는 설계상 공개값)에서 빌드 타임에 로드된다 — GitHub Secrets 미사용. 값 변경 시 이 파일을 직접 수정.

## .env 내용

`NEXT_PUBLIC_*`는 빌드 타임에 이미지에 인라인되므로 서버 `.env`에 다시 넣을 필요 없다. 서버 `.env`에는 `API_BASE_URL`(kista-ui 런타임이 실제로 소비 — `environment:`로 컨테이너에 주입됨)과 `UI_DOMAIN` 2개가 있다. **`UI_DOMAIN`은 이 레포의 스택에서는 더 이상 아무것도 소비하지 않는 사실상 흔적값이다** — kista-infra의 Caddy는 자신의 `/opt/kista-infra/.env`(`infra.env.gpg`에서 렌더링)에 담긴 자체 `UI_DOMAIN`을 참조하며, kista-ui의 `docker-compose.yml`도 더 이상 `UI_DOMAIN`을 읽지 않는다. `deploy/server/required-env`(kista-infra reconcile.sh가 적용 전 검사)가 여전히 이 값의 존재를 요구하므로 `.env`에는 계속 채워둬야 한다. 이 `.env` 자체는 `kista-infra`의 배포 워크플로가 `secrets/kista-ui.env.gpg`에서 매 배포마다 렌더링·덮어쓴다 — 값을 바꾸려면 kista-infra의 `scripts/env.sh edit kista-ui`로 암호화 파일을 직접 수정해야 하며, 서버 `.env`를 직접 편집해도 다음 kista-infra 배포 때 덮어써진다.

```dotenv
UI_DOMAIN=kista-app.com
API_BASE_URL=https://api.kista-app.com
```

## 배포 흐름

`push: main` 또는 `workflow_dispatch` → `server-deploy.yml`. 서버 적용은 kista-infra `Reconcile App`이 한다 — 설계 `kista-infra/docs/superpowers/specs/2026-10-02-deploy-reconcile-design.md`.

1. `verify` job (`npm run typecheck`, `npm run test:run`) + `deploy-checks` job (shellcheck·bats — `.github/tests`)
2. Docker 이미지 빌드(`.env.production.public`에서 읽은 9개 `NEXT_PUBLIC_*`를 build-args로 주입) → GHCR push
3. `deploy` — kista-infra에 `repository_dispatch(deploy-kista-ui)`로 `{config=이 커밋, roles=kista-ui=이 커밋, request_id}`를 보내고 그 run이 끝날 때까지 대기(`wait-reconcile.sh`). 커밋의 초록불 = 서버 적용·헬스 게이트 통과. 대기 중 더 새 요청이 대체하면 생략으로 성공 처리
4. kista-infra — SHA·이미지 검증, state보다 옛 요청 무시(신선도 병합), config SHA로 bundle 구성 → 서버 `reconcile.sh`: `required-env` 검사 → kista-ui는 `bluegreen` 대상이라 `up --dry-run`으로 변경 판정 후 `--scale kista-ui=2 --no-recreate`로 새 컨테이너를 옆에 띄움 → Docker 헬스 healthy 10초 간격 최대 5분 → 실패 시 새 컨테이너만 제거(옛 컨테이너가 계속 서비스), 성공 시 옛 컨테이너 stop/rm·`current` 전환·미사용 이미지 태그 정리 → `state/kista-ui.yml` 커밋
5. 교체 중 서비스 DNS 이름 `kista-ui`가 두 컨테이너를 모두 가리키고, Caddy(kista-infra `Caddyfile`, upstream `keepalive off`)가 종료 중 컨테이너로의 connection refused를 재시도로 흡수한다. 옛 컨테이너는 SIGTERM 후 처리 중 요청을 끝내고 `stop_grace_period` 35s 안에 종료(SSE는 끊기고 클라이언트가 재연결) — 설계 `kista-infra/docs/superpowers/specs/2026-10-02-kista-api-blue-green-design.md`

매매 시간대 배포 가드는 없다 — kista-ui는 로그인·조회 UI일 뿐 트레이딩 로직을 직접 실행하지 않는다.

## 롤백 Runbook

**자동 롤백**: reconcile 헬스 게이트 실패 시 새 컨테이너만 제거하고 옛 컨테이너가 계속 서비스한다(kista-infra run 실패 + 텔레그램 알림). 알림을 받으면 서버에서 `docker inspect --format '{{.Name}} {{.State.Health.Status}}' $(docker ps -qf label=com.docker.compose.service=kista-ui)`로 확인 — 컨테이너가 2개 이상(정지 포함, `docker ps -aqf ...`) 남아 있으면 다음 reconcile이 exit 2로 거부하므로 수동 정리.

**수동 롤백**: 서버에서 직전 release를 재적용한다(GHCR이 public이라 정리된 이미지도 다시 pull).
```bash
ls -l /opt/kista-ui/current /opt/kista-ui/previous
nohup bash /opt/kista-infra/bin/reconcile.sh kista-ui "$(basename "$(readlink /opt/kista-ui/previous)")"
```
그 뒤 kista-infra `state/kista-ui.yml`을 실제 적용한 SHA로 커밋한다(안 하면 다음 요청의 기준점이 어긋난다).

**이미지 디스크 정리 참고**: 적용 성공 시 이 레포 이미지(`ghcr.io/narafu/kista-ui`) 중 컨테이너가 쓰지 않는 태그를 `docker rmi`로 지우고 dangling 레이어를 `prune -f`로 정리한다(예전 `prune -f`만으로는 SHA 태그 이미지가 누적됐다 — 2026-10-01 실측 181개·35GB. `prune -a`는 다른 레포가 막 pull한 이미지까지 지울 수 있어 쓰지 않는다). 정리된 이미지로 롤백해도 GHCR이 public이라 compose가 다시 pull한다.

## 모니터링

- **헬스체크**: `/api/health` (Next.js Route Handler, 인증 불필요) — Caddy·Docker healthcheck 공용 대상
- **로그**: `docker logs -f $(docker ps -qlf label=com.docker.compose.service=kista-ui)` (서버 SSH — 컨테이너 이름은 blue/green 교체로 고정되지 않고, 서버 루트엔 compose 파일이 없어 `docker compose logs`는 쓰지 않는다)

## 운영 전환 시 확인 사항

신규 인스턴스로 재구축하거나 도메인을 바꿀 때 재확인할 항목 — 정상 운영 중에는 해당 없음.

- 카카오 개발자 콘솔 redirect URI가 실제 UI 도메인(`https://kista-app.com/auth/callback`)과 일치하는지 — `app/(auth)/login/page.tsx`가 `window.location.origin` 기반으로 동적 생성하므로 도메인만 콘솔에 등록하면 됨
- `../kista-api` 쪽 `CORS_ALLOWED_ORIGINS`(SSOT: `kista-infra` secrets)에 UI 도메인이 등록돼 있는지
- Vercel 프로젝트(`narafus-projects/kista-ui`)는 완전 삭제되어 더 이상 운영 대상이 아님 — 재구축 시 `vercel project add`부터 새로 시작
