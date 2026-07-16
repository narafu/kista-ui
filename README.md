# kista-ui

KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS**의 프론트엔드.
백엔드는 별도 저장소 [`kista-api`](../kista-api)(Java 21 + Spring Boot 3, Fly.io)와 연동한다.

## 기술 스택

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · shadcn/ui · React Query 5 · Firebase FCM

## 시작하기

```bash
cp .env.example .env.local   # 환경변수 채우기 (카카오 키, kista-api URL, Firebase)
npm install
npm run dev                  # http://localhost:3000 (3000 점유 시 3001 등으로 fallback)
```

## 주요 명령어

```bash
npm run typecheck    # TypeScript 타입 검사 (기본 검증)
npm run test:run     # Vitest 1회 실행
npm run build        # 프로덕션 빌드
npm run fetch:spec   # 로컬 kista-api에서 openapi.json 갱신
npm run gen:types    # openapi.json 기준 API 타입 재생성
```

## 아키텍처

FSD(Feature-Sliced Design) 단방향 계층: `app → widgets → features → entities → shared`.
상세 문서는 [`docs/agents/`](docs/agents/README.md) 참고 (구조·컨벤션·배포·레이어별 quirk).

## 배포

GitHub `main` push 시 Vercel 자동 배포. Docker 로컬 실행은 `docker compose up -d --build`.
자세한 내용은 [`docs/agents/deployment.md`](docs/agents/deployment.md).
