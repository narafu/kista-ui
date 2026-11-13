#!/usr/bin/env bats
# deploy/server reconcile 계약 — kista-infra reconcile.sh가 읽는 bundle 파일

D="$BATS_TEST_DIRNAME/../../deploy/server"

@test "reconcile 계약: roles=kista-ui, compose 이미지 변수 KISTA_UI_IMAGE, 런타임 URL은 :? 필수 보간" {
  [ "$(cat "$D/roles")" = kista-ui ]
  [ ! -e "$D/required-env" ]
  grep -q 'API_BASE_URL: ${API_BASE_URL:?' "$D/docker-compose.yml"
  grep -q 'TRADING_API_BASE_URL: ${TRADING_API_BASE_URL:?' "$D/docker-compose.yml"
  grep -q 'image: ${KISTA_UI_IMAGE' "$D/docker-compose.yml"
}

@test "bluegreen: kista-ui 대상 + compose에 container_name 없음(있으면 --scale 2가 이름 충돌로 실패)" {
  [ "$(grep -vE '^[[:space:]]*(#|$)' "$D/bluegreen")" = kista-ui ]
  [ "$(grep -vE '^[[:space:]]*#' "$D/docker-compose.yml" | grep -c container_name)" -eq 0 ]
}

@test "caddy 스니펫: 파일명=앱 이름(reconcile이 caddy/<앱>.caddy만 설치), upstream snippet에 healthcheck와 같은 경로" {
  grep -q '127.0.0.1:3000/api/health"' "$D/docker-compose.yml"
  grep -qE '^[[:space:]]*import upstream /api/health$' "$D/caddy/kista-ui.caddy"
  grep -q '^{\$UI_DOMAIN} {' "$D/caddy/kista-ui.caddy"
}
