# kista-ui Development Guidelines

## Project Overview

- **목적**: KISTA V2 — 한국투자증권 KIS API 기반 해외주식 자동 분할매매 **초대제 멀티 사용자 SaaS** 프론트엔드
- **기술 스택**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **인증**: Supabase Auth (카카오 OAuth Provider)
- **배포**: Vercel
- **API 연동**: kista-api (Spring Boot, Render 배포)
- **최대 사용자**: 10명 (초대제, 관리자 승인)

---

## Project Architecture

### 디렉토리 구조

```
app/                        # Next.js App Router 페이지
├── (auth)/                 # 비인증 레이아웃 그룹
│   └── page.tsx            # / — 카카오 로그인
├── pending/                # PENDING 상태 전용
│   └── page.tsx
├── rejected/               # REJECTED 상태 전용
│   └── page.tsx
├── dashboard/              # ACTIVE 전용 (메인 레이아웃 적용)
│   └── page.tsx
├── accounts/               # ACTIVE 전용
│   ├── new/page.tsx        # 계좌 등록
│   └── [id]/
│       ├── page.tsx        # 계좌 상세
│       └── edit/page.tsx   # 계좌 수정
├── settings/               # ACTIVE 전용
│   └── page.tsx
├── layout.tsx              # 루트 레이아웃
└── middleware.ts           # 인증 상태별 라우팅 분기

components/
├── ui/                     # shadcn/ui 컴포넌트 (수동 수정 금지)
├── layout/
│   ├── DesktopSidebar.tsx
│   └── MobileBottomNav.tsx
└── common/
    ├── AccountCard.tsx
    ├── StrategyBadge.tsx
    ├── TradingStatusIndicator.tsx
    └── ProfitDisplay.tsx

lib/
├── supabase/
│   ├── client.ts           # 브라우저 클라이언트
│   └── server.ts           # 서버 컴포넌트용 클라이언트
├── api/                    # kista-api 호출 함수
└── mock-data.ts            # Phase 2 더미 데이터

types/
├── user.ts                 # UserStatus, User 타입
├── account.ts              # Account, Strategy, StrategyStatus 타입
└── trade.ts                # TradeHistory, PortfolioSnapshot 타입
```

---

## Routing & Auth State Standards

### 인증 상태 흐름

```
비인증  →  /  (카카오 로그인)
PENDING →  /pending
REJECTED → /rejected
ACTIVE  →  /dashboard
```

### middleware.ts 규칙

- `middleware.ts`는 **`app/` 디렉토리 밖 루트에 위치** (Next.js App Router 요구사항)
- Supabase SSR `@supabase/ssr`의 `createServerClient`로 세션 확인
- 상태별 리다이렉트:

| 접근 경로 | 허용 상태 | 리다이렉트 대상 |
|-----------|-----------|----------------|
| `/` | 비인증만 | 인증 시 → `/dashboard` |
| `/pending` | PENDING만 | ACTIVE → `/dashboard`, REJECTED → `/rejected` |
| `/rejected` | REJECTED만 | ACTIVE → `/dashboard`, PENDING → `/pending` |
| `/dashboard`, `/accounts/*`, `/settings` | ACTIVE만 | 비인증 → `/`, 비ACTIVE → 상태별 경로 |

---

## Layout System Standards

### 레이아웃 분기 (반응형)

- **`lg` 미만 (모바일/태블릿)**: 상단 헤더 + 하단 고정 내비게이션 바 (`MobileBottomNav`)
- **`lg` 이상 (데스크탑, 1024px↑)**: 좌측 고정 사이드바(240px) + 우측 콘텐츠 (`DesktopSidebar`)
- ACTIVE 페이지(`dashboard`, `accounts/*`, `settings`)만 메인 레이아웃 적용
- `/`, `/pending`, `/rejected`는 중앙 정렬 카드 레이아웃 (별도 레이아웃 그룹)

### Tailwind 브레이크포인트 (변경 금지)

| 이름 | 기준 | 용도 |
|------|------|------|
| `sm` | 640px↑ | 대형 모바일 |
| `md` | 768px↑ | 태블릿 |
| `lg` | 1024px↑ | 데스크탑 레이아웃 분기 기준 |

### MobileBottomNav 탭 순서 (변경 금지)

`대시보드 · 계좌 · 통계 · 설정 · 프로필` (5개)

---

## Component Standards

### 공통 컴포넌트 규칙

| 컴포넌트 | 반응형 규칙 |
|----------|-------------|
| `AccountCard` | 모바일: 전체 너비(`w-full`) / 데스크탑: 그리드 내 고정 너비 |
| `ProfitDisplay` | 모바일: 축약형(K, M 단위) / 데스크탑: 전체 금액 표시 |
| `StrategyBadge` | 상태별 색상: `INFINITE`=blue, `PRIVACY`=purple |
| `TradingStatusIndicator` | `ACTIVE`=green dot 애니메이션, `PAUSED`=gray |

### 컴포넌트 파일 작성 규칙

- Server Component를 기본으로 사용; 인터랙션 필요 시만 `"use client"` 추가
- `components/ui/` 내 파일은 **직접 수정 금지** — shadcn/ui CLI로만 추가/업데이트
- 새 공통 컴포넌트 추가 시 `components/common/`에 위치
- Props 타입은 인라인 `interface`로 정의 (별도 types 파일 불필요)

---

## Supabase Auth Standards

### 클라이언트 분리

- **브라우저 컴포넌트** (`"use client"`): `lib/supabase/client.ts`의 `createBrowserClient` 사용
- **서버 컴포넌트 / Route Handler / middleware**: `lib/supabase/server.ts`의 `createServerClient` 사용
- `@supabase/supabase-js` 직접 import 금지 — 반드시 `lib/supabase/` 래퍼 사용

### 사용자 상태 조회

- `users` 테이블의 `status` 컬럼이 단일 진실 공급원(Source of Truth)
- `auth.users`(Supabase Auth)와 `public.users` 테이블 상태는 항상 동기화
- 상태 변경(PENDING→ACTIVE 등)은 kista-api를 통해서만 수행 (UI에서 직접 DB 수정 금지)

### 카카오 OAuth 처리

- Supabase Auth Provider: `kakao`
- 로그인 후 콜백: `/auth/callback` Route Handler에서 세션 교환 처리
- 콜백 이후 `users.status` 조회 → 상태별 리다이렉트

---

## API Communication Standards

### kista-api 호출 규칙

- 모든 API 호출은 `lib/api/` 함수로 캡슐화 (컴포넌트에서 직접 `fetch` 금지)
- 베이스 URL: `NEXT_PUBLIC_API_BASE_URL` 환경변수 사용
- 인증 헤더: Supabase JWT를 `Authorization: Bearer {token}`으로 전달
- API 함수 파일 분리:

| 파일 | 역할 |
|------|------|
| `lib/api/auth.ts` | 인증 관련 API |
| `lib/api/accounts.ts` | 계좌 CRUD + 전략 중지/재개 |
| `lib/api/trades.ts` | 거래 내역 + 포트폴리오 + 손익 |
| `lib/api/settings.ts` | 텔레그램 봇 설정 |

### API 엔드포인트 목록

**인증**
- `GET /api/auth/me` — 현재 사용자 정보
- `POST /api/auth/reapply` — 재신청 (REJECTED → PENDING)

**계좌**
- `GET /api/accounts` — 계좌 목록
- `POST /api/accounts` — 계좌 등록
- `PUT /api/accounts/{id}` — 계좌 수정
- `DELETE /api/accounts/{id}` — 계좌 삭제
- `PATCH /api/accounts/{id}/strategy/pause` — 전략 중지
- `PATCH /api/accounts/{id}/strategy/resume` — 전략 재개

**통계**
- `GET /api/accounts/{id}/trades` — 거래 내역
- `GET /api/accounts/{id}/portfolio` — 포트폴리오 현황
- `GET /api/accounts/{id}/profit` — 기간 손익

**설정**
- `PUT /api/settings/telegram` — 텔레그램 봇 등록/수정
- `DELETE /api/settings/telegram` — 텔레그램 봇 해제

---

## TypeScript Type Standards

### 핵심 타입 (변경 시 세 파일 동시 검토)

**`types/user.ts`**
```typescript
type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED'
interface User {
  id: string           // Supabase Auth UID
  kakaoId: string
  nickname: string
  status: UserStatus
  telegramBotToken?: string
  telegramChatId?: string
}
```

**`types/account.ts`**
```typescript
type Strategy = 'INFINITE' | 'PRIVACY'
type StrategyStatus = 'ACTIVE' | 'PAUSED'
interface Account {
  id: string
  userId: string
  nickname: string
  accountNo: string    // 마스킹 표시 (****-**)
  strategy: Strategy
  strategyStatus: StrategyStatus
  telegramBotToken?: string
  telegramChatId?: string
}
```

**`types/trade.ts`**
- `TradeHistory`, `PortfolioSnapshot`, `ProfitSummary` 타입 위치

### 타입 추가 규칙

- 새 API 응답 타입은 관련 `types/` 파일에 추가
- `any` 사용 금지 — 타입 불명확 시 `unknown` 사용 후 타입 가드 작성

---

## Environment Variables Standards

### .env.local.example 관리 (변경 금지 없이 동기화 필수)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_BASE_URL=         # kista-api Render URL
```

- **환경변수 추가 시 `.env.local.example`도 반드시 동시 수정**
- `NEXT_PUBLIC_` 접두사: 브라우저 노출 허용 변수만
- 민감 서버 변수(있을 경우)는 접두사 없이 서버 전용으로 유지

---

## Key File Interaction Standards

### 동시 수정이 필요한 파일 쌍

| 파일 A 수정 시 | 파일 B도 반드시 수정 |
|---------------|---------------------|
| `types/user.ts` (`UserStatus` 변경) | `middleware.ts` 라우팅 분기 조건 |
| `types/account.ts` (`Strategy` 추가) | `StrategyBadge.tsx` 색상 매핑 |
| 새 환경변수 추가 | `.env.local.example` |
| 새 API 함수 추가 | `lib/api/` 해당 파일 + 타입 정의 |
| `MobileBottomNav` 탭 추가 | `DesktopSidebar` 항목 동기화 |
| Supabase 테이블 컬럼 변경 | 관련 `types/` 타입 파일 |

---

## AI Decision Standards

### 모호한 상황 판단 기준

| 상황 | 결정 |
|------|------|
| 새 페이지 추가 요청 | App Router 그룹 구조 유지, 레이아웃 그룹 확인 후 추가 |
| 인증 로직 수정 요청 | `middleware.ts` + `lib/supabase/` 래퍼만 수정 |
| 상태 직접 DB 수정 필요 시 | kista-api 엔드포인트 경유 — UI 직접 수정 금지 |
| 새 shadcn/ui 컴포넌트 필요 시 | `npx shadcn@latest add <component>` CLI 사용 |
| 타입 불명확 시 | `any` 금지 → `unknown` + 타입 가드 |
| 반응형 분기 추가 시 | `lg` 기준만 사용 (임의 중간 브레이크포인트 추가 금지) |
| 더미 데이터 vs 실제 API | Phase 2: `lib/mock-data.ts` 사용, Phase 3+: API 함수로 교체 |

---

## Prohibited Actions

- `components/ui/` 파일 **직접 편집 금지** — shadcn/ui CLI만 사용
- `middleware.ts`에서 상태 직접 DB 쿼리 금지 — Supabase SSR 세션 + API 경유
- `"use client"` 남발 금지 — Server Component 기본, 필요 시만 추가
- `lib/supabase/` 래퍼 우회하여 `@supabase/supabase-js` 직접 import 금지
- 컴포넌트 내 직접 `fetch()` 호출 금지 — `lib/api/` 함수 사용
- Tailwind 브레이크포인트 임의 변경 금지 (`sm`, `md`, `lg` 기준 고정)
- `MobileBottomNav` 탭 5개 구성 임의 변경 금지
- 계좌번호·KIS Key 평문 노출 금지 — 화면에는 마스킹(`****-**`) 표시
- `users.status` 변경을 UI에서 직접 Supabase DB 수정으로 처리 금지 (반드시 kista-api 경유)
- `NEXT_PUBLIC_` 접두사 없이 민감 정보를 브라우저 노출 변수로 정의 금지
