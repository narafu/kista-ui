# kista-ui

[![CI](https://github.com/narafu/kista-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/narafu/kista-ui/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8)

KISTA — 한국투자증권(KIS)·토스증권 API 기반 해외주식 자동 분할매매 SaaS의 프론트엔드.
백엔드는 별도 저장소 [`kista-api`](../kista-api)(Java 21 + Spring Boot 3, Fly.io)와 연동한다.
두 저장소를 아우르는 전체 시스템 구성·배포·계약 동기화는 [`../ARCHITECTURE.md`](../ARCHITECTURE.md) 참고.

## 기술 스택

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · shadcn/ui · React Query 5 · Firebase FCM

## 아키텍처

### 계층 구조 (FSD)

`entities/{domain}/api/`가 kista-api DTO를 소비하는 유일한 경계 — `normalizeXxx()` 함수로 KIS live 응답과 UI 타입 불일치를 흡수한다.

```mermaid
graph LR
    app["app/<br/>Next.js 라우팅 + 레이아웃"]
    widgets["widgets/<br/>페이지 합성 단위"]
    features["features/<br/>사용자 시나리오"]
    entities["entities/<br/>도메인 모델 + API 함수 + React Query"]
    shared["shared/<br/>api-client · format · cache · providers"]

    app --> widgets --> features --> entities --> shared
```

### 인증 흐름 (카카오 로그인 → JWT → 상태 라우팅)

```mermaid
sequenceDiagram
    participant B as 브라우저
    participant K as 카카오 OAuth
    participant CB as kista-ui<br/>app/auth/callback/route.ts
    participant API as kista-api<br/>AuthController
    participant P as proxy.ts (Edge)

    B->>K: 카카오 로그인 동의
    K-->>B: authorization code (redirect)
    B->>CB: GET /auth/callback?code=...
    CB->>API: POST /api/auth/kakao (code)
    API->>API: 카카오 토큰 교환 → 사용자 조회/생성<br/>JWT(access) + RefreshToken 발급<br/>(ADMIN_KAKAO_IDS 매칭 시 ADMIN 자동 승격)
    API-->>CB: JWT + Set-Cookie(RT, HttpOnly)
    Note over CB: response.cookies.set() 완료 후<br/>headers.append()로 RT 쿠키 relay<br/>(순서 바뀌면 RT 유실)
    CB-->>B: kista-token(JWT) + kista-user-status/role 캐시 쿠키 설정
    B->>P: 이후 모든 페이지 요청
    P->>P: kista-user-status 쿠키 확인 (maxAge 3600s)
    alt 캐시 유효
        P-->>B: 캐시 기반 즉시 분기
    else 캐시 만료/없음
        P->>API: GET /api/auth/me (JWT 검증)
        API-->>P: UserStatus, UserRole
        P->>P: PENDING 상태는 캐시 저장 금지
    end
    P-->>B: 비인증→/ · PENDING→/pending · REJECTED→/rejected · ACTIVE→/dashboard
```

### 실시간 알림 (SSE) 경로

```mermaid
graph LR
    Emitter["TradeSseEmitterRegistry<br/>(kista-api adapter/out/sse)"]
    Handler["app/api/trades/stream/route.ts<br/>(Route Handler, Bearer 토큰 중계)"]
    ES["브라우저 EventSource"]

    Emitter -->|"undici Agent<br/>bodyTimeout:0"| Handler
    Handler -->|"request.signal 전달"| ES
```

브라우저 `EventSource`는 커스텀 헤더를 지원하지 않아 Route Handler가 Bearer 토큰을 붙여 중계한다.

## 배포

GitHub `main` push 시 Vercel 자동 배포. Docker 로컬 실행은 `docker compose up -d --build`.
