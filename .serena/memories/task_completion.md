# 작업 완료 체크리스트

## 코드 수정 후 필수
```bash
npm run typecheck    # 타입 오류 확인 (lint 대신 사용)
```

## 동시 수정 필요 파일 쌍
- `TradingCycleResponse` 필드 추가: `types/strategy.ts` + `lib/api/strategies.ts:normalizeStrategy()`
- `UserResponse` 필드 추가: `types/user.ts` + 사용처
- 새 `NEXT_PUBLIC_*` 환경변수: `.env.local.example` 동기화 + Vercel 대시보드 등록
- Docker용 환경변수: `docker-compose.yml build.args`에 추가
- `lib/mock-data.ts` 인터페이스 변경: mock 데이터 동기화

## Route Handler 추가 시
- catch-all Route Handler: `app/api/{resource}/[[...path]]/route.ts` 패턴
- URL: `process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL` 필수
- 쿠키 (v15+): `const cookieStore = await cookies()`
- 동적 파라미터 (v15+): `const { id } = await params`

## 배포 전 확인
- Vercel 환경변수 `NEXT_PUBLIC_*` 비어있으면 런타임 500
- `firebase-messaging-sw.js` git 추적 여부 확인 (없으면 FCM 토큰 발급 불가)
