#!/usr/bin/env bash
# kista-ui 교체 — 서버에서 실행(server-deploy.yml이 bin/으로 업로드 후 호출).
# 입력(env): DEPLOY_PATH, KISTA_UI_IMAGE(SHA 태그), RUN_TAG(run 시도 식별자)
# 사전 업로드: docker-compose.yml.new
set -euo pipefail
exec </dev/null   # 하위 명령이 stdin을 물어 멈추거나 입력을 삼키지 않도록

: "${DEPLOY_PATH:?}" "${KISTA_UI_IMAGE:?}" "${RUN_TAG:?}"
cd "${DEPLOY_PATH}"
mkdir -p rollback

# 필수 환경변수 존재 검증 (.env는 kista-infra 배포가 렌더링)
for key in UI_DOMAIN API_BASE_URL; do
  grep -q "^${key}=" .env || { echo "::error::필수 환경변수 누락: ${key}"; exit 1; }
done

# 롤백 기록: 교체 직전 compose 파일·실행 이미지. /tmp가 아닌 배포 디렉토리에 둬 재부팅에도 유지
cp docker-compose.yml rollback/kista-ui.compose.yml 2>/dev/null || true
docker inspect -f '{{.Config.Image}}' kista-ui > rollback/kista-ui.image 2>/dev/null || : > rollback/kista-ui.image
mv docker-compose.yml.new docker-compose.yml

# GHCR 패키지가 public이라 로그인 없이 pull — 예전 배포가 남긴 만료 토큰이 ~/.docker/config.json에 있으면
# 익명 대신 그걸로 인증해 'denied'가 나므로 매번 제거
docker logout ghcr.io >/dev/null 2>&1 || true
export KISTA_UI_IMAGE
docker compose pull kista-ui
# shared_net은 kista-infra가 생성하는 external 네트워크 — kista-infra가 아직 안 뜬 최초 배포 순서 방어
docker network create shared_net >/dev/null 2>&1 || true

# 이 시점부터 컨테이너가 교체되므로 헬스 게이트가 롤백 대상으로 인식하도록 run 식별자 기록
echo "${RUN_TAG}" > rollback/kista-ui.run
docker compose up -d --no-deps kista-ui
