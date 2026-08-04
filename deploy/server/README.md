# Server deployment (OCI)

> ⚠️ **배포 전 필독 — 이 브랜치를 아직 `main`에 병합하지 말 것**
> 이 문서와 `server-deploy.yml`은 `kista-infra` 레포(Caddy·Postgres·Redis 소유)가 실제로 서버에 배포된 **이후** 상태를 전제로 작성됐다.
> `kista-infra`가 아직 배포되지 않은 시점에 이 브랜치를 `main`에 병합하면 `push: main` 트리거로 `server-deploy.yml`이 즉시 자동 실행되어 `shared_net`이 없는 상태로 배포가 시도되고, kista-api 쪽에서는 `--remove-orphans` 없는 재기동으로 구 caddy/redis 컨테이너가 orphan 처리되어 Caddy 라우팅이 끊기는 장애로 이어진다.
> **병합 가능 조건**: kista-infra의 Phase 0(인스턴스 재편) + kista-infra 자체 최초 배포(`kista-infra/.github/workflows/server-deploy.yml` 성공 실행)가 완료된 뒤에만 이 브랜치를 `main`에 병합할 것.

`kista-ui`를 단일 인스턴스(OCI `kista-ui-server`)에서 Docker Compose로 운영한다(Caddy는 kista-infra 레포가 전담). `kista-api`·`fida`와 동일 VCN/서브넷(`ap-chuncheon-1` AD-1)에 위치하되 **별도 인스턴스·별도 공인 IP**로 분리되어 있다.

## 서버 레이아웃

```text
/opt/kista-ui/
├── .env                    ← kista-infra 배포 워크플로가 매 배포마다 렌더링·덮어씀
└── docker-compose.yml      ← GitHub Actions 업로드
```

## 초기 서버 설정 (최초 1회)

1. OCI 인스턴스(이미 생성됨): `kista-ui-server`, `VM.Standard.A1.Flex`(Ampere arm64), 1 OCPU, 6GB RAM, 부트 볼륨 50GB, Ubuntu 24.04 LTS — **arm64이므로 배포 워크플로가 `linux/arm64`로 이미지를 빌드한다**. 공인 IP는 `134.185.118.35`(Reserved, 2026-08-04 전환 완료).
2. 도메인 A 레코드: apex `kista-app.com` → `134.185.118.35`. **DNS 제공자가 프록시 기능을 지원하면(예: Cloudflare) 반드시 "DNS only"(프록시 끔, 회색 구름)로 설정** — 켜져 있으면 Caddy의 Let's Encrypt 자동 인증서 발급(HTTP-01 challenge)이 실패한다.
   - **임시(ephemeral) IP → Reserved IP 최초 전환은 같은 IP를 유지하며 승격하는 기능이 없다**: OCI가 ephemeral IP를 다른 private IP로 옮기는 것 자체를 지원하지 않아(`oci network public-ip update --help` 확인), 새 Reserved IP를 별도로 생성한 뒤 기존 ephemeral IP를 삭제하고 그 자리에 재할당해야 한다 — **IP 주소가 바뀐다.** 인스턴스 자체는 그대로라 SSH·Docker 컨테이너·Caddy의 기존 TLS 인증서(`caddy_data` 볼륨)는 영향 없지만, DNS A 레코드와 GitHub Secret `SERVER_HOST`는 반드시 새 IP로 갱신해야 한다.
   - **예약(Reserved) 공인 IP로 무중단 호스트 교체**(향후 인스턴스 재생성 시나리오 — 위 최초 전환과는 다른 상황): 이미 Reserved IP가 있는 상태에서 새 인스턴스를 임시 공인 IP로 완전히 기동·스모크 테스트한 뒤 기존 예약 IP만 `oci network public-ip update --private-ip-id <새 인스턴스 private-ip-ocid>`로 재할당하면 된다 — 도메인·DNS·GitHub Secret(`SERVER_HOST`) 변경 없이 호스트를 교체할 수 있다.
3. 인바운드 포트 개방 — 2단계:
   - OCI 콘솔: 인스턴스가 속한 VCN의 Security List(또는 연결된 NSG)에 Ingress Rule 확인 — TCP `80`, `443`, source `0.0.0.0/0` (`kista-api`/`fida`와 동일 서브넷이라 이미 상속돼 있을 가능성이 높음 — 실제 접속 테스트로 확인)
   - **주의**: OCI Ubuntu 이미지는 콘솔 레벨 방화벽 외에 OS 레벨에서도 `iptables`(netfilter-persistent)로 SSH 외 인바운드를 기본 차단해두는 경우가 있다. 콘솔에서 포트를 열었는데 접속이 안 되면 인스턴스에서 `sudo iptables -L INPUT -n --line-numbers`로 OS 방화벽 규칙을 먼저 확인할 것 — 막혀 있으면 80/443 허용 규칙 추가 후 `sudo netfilter-persistent save`로 저장한다
   - `3000`은 비공개 유지 — Caddy가 Docker 네트워크를 통해 접근한다
4. Docker 설치:
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```
5. 배포 경로 생성 및 `.env` 작성:
   ```bash
   sudo mkdir -p /opt/kista-ui
   sudo chown $USER:$USER /opt/kista-ui
   vi /opt/kista-ui/.env   # 아래 .env 내용 참고
   ```
6. 로그 로테이션 설정 (`/etc/docker/daemon.json`):
   ```json
   {
     "live-restore": true,
     "log-driver": "json-file",
     "log-opts": { "max-size": "50m", "max-file": "5" }
   }
   ```
7. 자동 재부팅 비활성화:
   ```bash
   sudo sed -i 's/^Unattended-Upgrade::Automatic-Reboot "true"/Unattended-Upgrade::Automatic-Reboot "false"/' \
     /etc/apt/apt.conf.d/50unattended-upgrades
   ```

## GitHub Secrets

| Secret | 설명 |
|--------|------|
| `SERVER_HOST` | 서버 IP 또는 도메인 (kista-api/fida 저장소의 동명 secret과 이름은 같지만 저장소가 달라 값은 별개) |
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

**`workflow_dispatch` 최초 수동 배포가 2026-08-04에 성공**해 `push: main` 자동 배포로 전환 완료 — kista-api/fida와 동일한 트리거 구조다. (전환 전에는 서버·Secrets 준비 없이 push가 켜져 있으면 배포 job이 빈 `SERVER_HOST`/`SERVER_SSH_KEY`로 실패하고 `build` job은 빈 `NEXT_PUBLIC_*`로도 조용히 성공해 GHCR `:latest`가 오염되는 위험이 있어 순서를 지켰다.)

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

## 커트오버 체크리스트

- [x] OCI 인스턴스 방화벽 확인(Security List/NSG + OS iptables) + 도메인 A 레코드(임시 IP) — 2026-08-04
- [x] `.env` 작성(`UI_DOMAIN`, `API_BASE_URL`) — 2026-08-04
- [x] GitHub Secrets 9개(`NEXT_PUBLIC_*`) + SSH 3종(`SERVER_SSH_PORT`는 기본값 22라 생략) 등록 — 2026-08-04
- [x] `docker compose up -d` 수동 실행 + 헬스체크 확인 (caddy 최초 수동 기동 포함) — 2026-08-04, Docker 헬스체크 `localhost`→`127.0.0.1` 수정 후 통과
- [x] `/api/health` 외부 접근 확인 — 2026-08-04, Let's Encrypt 인증서 정상 발급 확인
- [x] 카카오 개발자 콘솔 redirect URI → `https://kista-app.com/auth/callback`으로 갱신 (`app/(auth)/login/page.tsx`가 `window.location.origin` 기반으로 동적 생성) — 2026-08-04
- [x] `../kista-api` 저장소 `.env`의 `CORS_ALLOWED_ORIGINS`에 새 도메인 추가 + 재배포 (별도 저장소 작업) — 2026-08-04, preflight `access-control-allow-origin` 응답으로 확인
- [x] 로그인 리다이렉트 스모크 테스트(카카오 OAuth `client_id`/`redirect_uri` 수락 확인) — 2026-08-04. **실제 계정 인증까지 완료한 end-to-end 로그인 테스트는 아님** — 실사용자 카카오 계정 필요, 별도 확인 필요
- [x] Reserved IP 전환 — 2026-08-04, `134.185.118.35`, DNS·GitHub Secret `SERVER_HOST` 동반 갱신
- [x] Vercel 프로젝트(`narafus-projects/kista-ui`) 삭제 — 2026-08-04, `vercel project remove`. GitHub 연동 해제만으로는 옛 배포가 CORS·카카오 redirect 유효한 채로 계속 살아있어 실거래 가능한 프로덕션 표면으로 남는 문제가 있어 완전 삭제로 결정
