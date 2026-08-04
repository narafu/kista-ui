# kista-ui

[![CI](https://github.com/narafu/kista-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/narafu/kista-ui/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8)

KISTA(Key Investment Strategy & Trading Automation) — 정밀한 투자 전략을 기반으로 작동하는 다중 증권사 통합 자동매매 SaaS의 프론트엔드.
백엔드는 별도 저장소 [`kista-api`](https://github.com/narafu/kista-api)(Java 21 + Spring Boot 3, OCI)와 연동한다.

## 기술 스택

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · shadcn/ui · React Query 5 · Firebase FCM

## 아키텍처

### 전체 시스템 구성

```mermaid
graph TB
    subgraph Client["사용자"]
        Browser["브라우저 / PWA"]
    end

    subgraph OCIUI["OCI — kista-ui (Next.js 16, Docker + Caddy)"]
        Proxy["proxy.ts (Edge)<br/>인증 상태 라우팅"]
        RSC["Server Component<br/>apiFetch (token 필요)"]
        RouteHandler["Route Handler<br/>(catch-all proxy)"]
        ClientComp["Client Component<br/>clientFetch"]
    end

    subgraph OCIAPI["OCI — kista-api (Spring Boot)"]
        Web["adapter/in/web<br/>REST Controller"]
        Security["JwtAuthFilter /<br/>InternalTokenAuthFilter"]
        App["application/service<br/>UseCase 구현체"]
        Domain["domain<br/>순수 도메인 모델"]
        AdapterOut["adapter/out<br/>broker · notify · sse · persistence"]
        Scheduler["adapter/in/schedule<br/>TradingOpen/CloseScheduler"]
    end

    subgraph Data["데이터 저장소"]
        PG[("Supabase PostgreSQL")]
        Redis[("Redis<br/>JWT 블랙리스트 · Toss 토큰")]
    end

    subgraph External["외부 서비스"]
        Kakao["카카오 OAuth"]
        KIS["한국투자증권 KIS API"]
        Toss["토스증권 API"]
        Telegram["Telegram Bot API"]
        FCM["Firebase FCM"]
        Alpaca["Alpaca Markets<br/>(휴장일)"]
    end

    Browser -->|"모든 요청"| Proxy
    Proxy -->|"인증 상태별 강제 분기"| Browser
    Browser -->|"Server-rendered page"| RSC
    Browser -->|"CSR 상호작용"| ClientComp

    RSC -->|"apiFetch + Bearer token"| Web
    ClientComp -->|"clientFetch (same-origin)"| RouteHandler
    RouteHandler -->|"Bearer token 첨부 후 프록시<br/>(CORS_ALLOWED_ORIGINS)"| Web

    Web --> Security --> App --> Domain
    App --> AdapterOut
    Scheduler --> App

    AdapterOut --> PG
    AdapterOut --> Redis
    AdapterOut --> Kakao
    AdapterOut --> KIS
    AdapterOut --> Toss
    AdapterOut --> Telegram
    AdapterOut --> FCM
    AdapterOut --> Alpaca
```

**핵심 원칙**: Client Component는 kista-api를 절대 직접 호출하지 않는다. 쿠키(HttpOnly RT, 인증 상태 캐시) 처리와 CORS 회피를 위해 항상 Next.js Route Handler를 경유한다. Server Component는 서버 간 호출이므로 `apiFetch`로 직접 호출하지만 이 역시 CORS 대상이다(`CORS_ALLOWED_ORIGINS`에 kista-ui 도메인 등록 필요 — kista-ui·kista-api가 서로 다른 OCI 인스턴스라 같은 VCN이어도 CORS 검증 대상).

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

GitHub `main` push 시 GitHub Actions가 arm64 Docker 이미지를 빌드해 OCI 인스턴스(`kista-ui-server`)에 배포한다 — 상세: `deploy/server/README.md`. Docker 로컬 실행은 `docker compose up -d --build`.

Vercel에서 운영하던 이전 배포(`narafus-projects/kista-ui`)는 2026-08-04 OCI 커트오버 검증 완료 후 프로젝트째 삭제했다.
