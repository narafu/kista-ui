#!/usr/bin/env bats
# deploy/server/bin/{deploy,health-gate}.sh — docker를 스텁으로 바꿔 분기(롤백 판정)를 검증

BIN="$BATS_TEST_DIRNAME/../../deploy/server/bin"

setup() {
  export DEPLOY_PATH="$BATS_TEST_TMPDIR/opt"
  export KISTA_UI_IMAGE=ghcr.io/narafu/kista-ui:new RUN_TAG=run-1
  export DOCKER_LOG="$BATS_TEST_TMPDIR/docker.log" PATH="$BATS_TEST_DIRNAME/stub:$PATH"
  export STUB_PREV_IMAGE=ghcr.io/narafu/kista-ui:old GATE_ATTEMPTS=2 GATE_INTERVAL=0
  mkdir -p "$DEPLOY_PATH/rollback"
  : > "$DOCKER_LOG"
  printf 'UI_DOMAIN=x\nAPI_BASE_URL=x\n' > "$DEPLOY_PATH/.env"
  echo old-compose > "$DEPLOY_PATH/docker-compose.yml"
  echo new-compose > "$DEPLOY_PATH/docker-compose.yml.new"
}

@test "deploy: 롤백 기록을 남기고 compose를 교체한 뒤 up" {
  run bash "$BIN/deploy.sh"
  [ "$status" -eq 0 ]
  [ "$(cat "$DEPLOY_PATH/docker-compose.yml")" = new-compose ]
  [ "$(cat "$DEPLOY_PATH/rollback/kista-ui.compose.yml")" = old-compose ]
  [ "$(cat "$DEPLOY_PATH/rollback/kista-ui.image")" = "$STUB_PREV_IMAGE" ]
  [ "$(cat "$DEPLOY_PATH/rollback/kista-ui.run")" = run-1 ]
  grep -q "docker logout ghcr.io" "$DOCKER_LOG"
  grep -q "docker network create shared_net" "$DOCKER_LOG"
  grep -q "docker compose up -d --no-deps kista-ui" "$DOCKER_LOG"
}

@test "deploy: 필수 환경변수 누락이면 docker 호출 없이 실패" {
  sed -i '/^API_BASE_URL=/d' "$DEPLOY_PATH/.env"
  run bash "$BIN/deploy.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"API_BASE_URL"* ]]
  [ "$(cat "$DEPLOY_PATH/docker-compose.yml")" = old-compose ]
  [ ! -s "$DOCKER_LOG" ]
}

gate_after_deploy() {
  bash "$BIN/deploy.sh" >/dev/null
  : > "$DOCKER_LOG"
}

@test "health-gate: 다른 run의 기록이면 판정·롤백 없이 실패" {
  echo other-run > "$DEPLOY_PATH/rollback/kista-ui.run"
  run bash "$BIN/health-gate.sh"
  [ "$status" -ne 0 ]
  ! grep -q "compose" "$DOCKER_LOG"
}

@test "health-gate: healthy면 통과하고 자기 레포 이미지만 정리" {
  gate_after_deploy
  run bash "$BIN/health-gate.sh"
  [ "$status" -eq 0 ]
  grep -q "docker image ls --format {{.Repository}}:{{.Tag}} ghcr.io/narafu/kista-ui" "$DOCKER_LOG"
  ! grep -q "prune -a" "$DOCKER_LOG"
  ! grep -q "compose" "$DOCKER_LOG"
}

@test "health-gate: unhealthy면 이전 이미지·compose로 롤백" {
  gate_after_deploy
  export STUB_HEALTH=unhealthy
  run bash "$BIN/health-gate.sh"
  [ "$status" -ne 0 ]
  grep -q "docker compose -p opt --project-directory $DEPLOY_PATH -f rollback/kista-ui.compose.yml up -d --no-deps kista-ui" "$DOCKER_LOG"
}

@test "health-gate: 이전 이미지 정보가 없으면 롤백하지 않고 실패" {
  export STUB_PREV_IMAGE=""
  gate_after_deploy
  export STUB_HEALTH=unhealthy
  run bash "$BIN/health-gate.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"수동 복구 필요"* ]]
  ! grep -q "compose" "$DOCKER_LOG"
}

@test "reconcile 계약: roles=kista-ui, required-env는 deploy.sh 필수 키와 동일" {
  D="$BATS_TEST_DIRNAME/../../deploy/server"
  [ "$(cat "$D/roles")" = kista-ui ]
  [ "$(tr '\n' ' ' < "$D/required-env")" = "UI_DOMAIN API_BASE_URL " ]
}
