#!/usr/bin/env bash
# 헬스 게이트 + 자동 롤백 — 서버에서 실행(deploy.sh 다음, 실패해도 호출됨).
# 입력(env): DEPLOY_PATH, KISTA_UI_IMAGE, RUN_TAG, GATE_ATTEMPTS(기본 30), GATE_INTERVAL(초, 기본 10)
# 이번 run이 컨테이너 교체를 시작한 경우(rollback/kista-ui.run == RUN_TAG)에만 판정·롤백한다 — 다른 run의 기록으로 롤백 방지
set -euo pipefail
exec </dev/null

: "${DEPLOY_PATH:?}" "${KISTA_UI_IMAGE:?}" "${RUN_TAG:?}"
attempts=${GATE_ATTEMPTS:-30}
interval=${GATE_INTERVAL:-10}
cd "${DEPLOY_PATH}"

if [ "$(cat rollback/kista-ui.run 2>/dev/null)" != "${RUN_TAG}" ]; then
  echo "✗ 이번 run에서 kista-ui 컨테이너 교체가 시작되지 않음 — 게이트·롤백 생략"
  exit 1
fi

echo "헬스 게이트 시작 (최대 $((attempts * interval))초)..."
for i in $(seq 1 "$attempts"); do
  status=$(docker inspect --format '{{.State.Health.Status}}' kista-ui 2>/dev/null || echo "unknown")
  if [ "$status" = "healthy" ]; then
    echo "✓ 헬스체크 통과 (${i}회 시도)"
    # 이 레포 이미지 중 컨테이너가 안 쓰는 태그만 정리(사용 중이면 rmi가 거부) + dangling 레이어 —
    # prune -f(dangling만)로는 SHA 태그가 무한 누적되고, prune -a는 다른 레포(kista-infra 등)가 막 pull한 이미지까지 지울 수 있다.
    # 롤백·수동 복구는 GHCR(public)에서 다시 pull된다
    docker image ls --format '{{.Repository}}:{{.Tag}}' ghcr.io/narafu/kista-ui | xargs -r docker rmi >/dev/null 2>&1 || true
    docker image prune -f >/dev/null || true
    exit 0
  fi
  if [ "$status" = "unhealthy" ]; then
    echo "✗ 헬스체크 실패 (unhealthy, ${i}회 시도)"
    break
  fi
  echo "  대기 중... (${i}/${attempts}, 상태: ${status})"
  sleep "$interval"
done

# 헬스체크 실패 → 이미지와 compose 파일을 교체 직전 상태로 자동 롤백
prev_image=$(cat rollback/kista-ui.image 2>/dev/null || echo "")
if [ -z "$prev_image" ]; then
  echo "✗ 헬스체크 실패 — 이전 이미지 정보 없음, 수동 복구 필요"
  exit 1
fi
compose_prev=rollback/kista-ui.compose.yml
[ -f "$compose_prev" ] || compose_prev=docker-compose.yml
echo "✗ 헬스체크 실패 — 롤백: ${prev_image} (${compose_prev})"
KISTA_UI_IMAGE="$prev_image" docker compose -p "$(basename "${DEPLOY_PATH}")" \
  --project-directory "${DEPLOY_PATH}" -f "$compose_prev" up -d --no-deps kista-ui
exit 1
