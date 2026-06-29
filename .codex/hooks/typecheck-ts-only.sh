#!/bin/bash
# .ts / .tsx 파일 편집 시에만 typecheck 실행
stdin=$(cat)
script_dir="$(cd "$(dirname "$0")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
if echo "$stdin" | grep -qE '\.tsx?"'; then
  cd "$repo_root" && npm run typecheck 2>&1 | tail -8
fi
