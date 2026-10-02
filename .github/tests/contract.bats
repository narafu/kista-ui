#!/usr/bin/env bats
# deploy/server reconcile 계약 — kista-infra reconcile.sh가 읽는 bundle 파일

D="$BATS_TEST_DIRNAME/../../deploy/server"

@test "reconcile 계약: roles=kista-ui, required-env=UI_DOMAIN·API_BASE_URL, compose 이미지 변수 KISTA_UI_IMAGE" {
  [ "$(cat "$D/roles")" = kista-ui ]
  [ "$(tr '\n' ' ' < "$D/required-env")" = "UI_DOMAIN API_BASE_URL " ]
  grep -q 'image: ${KISTA_UI_IMAGE' "$D/docker-compose.yml"
}
