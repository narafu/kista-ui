## 환경변수

```text
NEXT_PUBLIC_KAKAO_CLIENT_ID=
NEXT_PUBLIC_API_BASE_URL=
```

- 새 `NEXT_PUBLIC_*` 추가 시 `.env` 예시 파일도 같이 갱신한다.
- Docker에서는 `NEXT_PUBLIC_*`가 빌드 타임 인라인되므로 `Dockerfile`의 `ARG`/`ENV`와 `docker-compose.yml` 전달을 함께 맞춰야 한다.

## CORS / API 연동

- Server Component fetch도 서버 간 호출이므로 CORS 영향이 있다.
- Fly.io 로그에 요청이 없는데 403이면 CORS 필터 차단 가능성을 먼저 본다.
- `kista-api` 연동 변경이 있으면 `../kista-api/CLAUDE.md`와 함께 확인한다.

## Docker

- `docker compose up -d --build`
- `docker compose down`
- `docker compose logs`

API URL은 환경에 따라 `API_BASE_URL=http://host.docker.internal:8080` 구성이 필요할 수 있다. 세부 쿠키, 프록시, Route Handler quirk는 `app/CLAUDE.md`를 본다.

## Vercel 배포

- 프로젝트: `narafus-projects/kista-ui`
- GitHub 통합 자동 배포
- `NEXT_PUBLIC_*` 값이 비면 런타임 오류로 이어질 수 있다
- 운영 로그 확인은 `vercel logs --scope narafus-projects --json`

catch-all Route Handler URL을 바꿀 때는 대개 Route Handler 본체보다 `entities/{domain}/api/` 호출부를 조정한다.
