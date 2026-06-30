#!/bin/bash
# .ts / .tsx 파일 편집 시에만 typecheck 실행
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

stdin=$(cat)
if echo "$stdin" | grep -qE '\.tsx?"'; then
  cd "$REPO_ROOT" && npm run typecheck 2>&1 | tail -8
fi
