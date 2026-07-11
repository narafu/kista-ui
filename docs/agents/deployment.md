## 환경변수

```text
NEXT_PUBLIC_KAKAO_CLIENT_ID=   # 카카오 REST API 키
NEXT_PUBLIC_API_BASE_URL=      # kista-api Fly.io URL (https://kista-api.fly.dev)

# Firebase FCM
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=     # 웹 푸시 VAPID 인증서 키
```

- 새 `NEXT_PUBLIC_*` 추가 시 `.env.example` 동기화 필수
- Docker에서는 `NEXT_PUBLIC_*`가 빌드 타임 인라인되므로 `Dockerfile`의 `ARG`/`ENV`와 `docker-compose.yml` 전달을 함께 맞춰야 한다.

## CORS / API 연동

- Server Component fetch도 서버 간 호출이므로 CORS 영향이 있다. **주의: Vercel 서버→Fly.io 서버 간 통신은 CORS 검증 대상이다.**
- Fly.io 로그에 요청이 없는데 403이면 CORS 필터 차단 가능성을 먼저 본다
- `CORS_ALLOWED_ORIGINS` 구체적 값: `https://kista-ui.vercel.app,https://kista-ui-narafus-projects.vercel.app`
- `kista-api` 연동 변경이 있으면 `../kista-api/CLAUDE.md`와 함께 확인한다.
- `kista-api`의 추가 운영/구현 규칙이 필요하면 `../kista-api/AGENTS.md`도 함께 확인한다.

## Docker

```bash
docker compose up -d --build     # 빌드 후 시작
docker compose down              # 정지
docker compose logs              # 로그 확인
```

설정:
- `NEXT_PUBLIC_*` 빌드 타임 인라인 → `Dockerfile` `ARG`/`ENV` 필수
- API URL: `API_BASE_URL=http://host.docker.internal:8080` + `docker-compose.yml` `extra_hosts: host-gateway` 설정
- Node.js 22 고정 필수 (undici v8 호환, 20으로 다운그레이드 금지)
- 세부 쿠키, 프록시, Route Handler quirk는 `app/CLAUDE.md` 참고

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui` (ID: `prj_bSRl2Q8cUSpdMgeYwpUmptyoiMfi`)
- GitHub 통합 자동 배포
- 강제 재배포: `git commit --allow-empty -m "redeploy" && git push`
- `NEXT_PUBLIC_*` 비면 런타임 500 — Vercel 대시보드 env var 확인: `vercel link --scope narafus-projects --project prj_...` 후 `vercel env ls production`
- 운영 로그: `vercel logs --scope narafus-projects --json`
- catch-all Route Handler URL 변경 시 호출부(`entities/{domain}/api/`)만 수정 — Route Handler 본체 수정 불필요
