#!/bin/bash
# .ts / .tsx 파일 편집 시에만 typecheck 실행
stdin=$(cat)
if echo "$stdin" | grep -qE '\.tsx?"'; then
  cd /d/src/study/kista/kista-ui && npm run typecheck 2>&1 | tail -8
fi
