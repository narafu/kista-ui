#!/bin/bash
# .env.local 직접 편집 차단 (.env.local.example 은 허용)
stdin=$(cat)
if echo "$stdin" | grep -qE '\.env\.local"'; then
  echo ".env.local 직접 편집 차단됨 — 로컬 값은 직접 터미널에서, 운영 시크릿은 kista-infra scripts/env.sh로 편집하세요" >&2
  exit 2
fi
