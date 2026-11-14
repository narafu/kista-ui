# 11. 지침서 01~09가 다루지 않은 영역

> **실행 세션은 먼저 맨 끝의 "실행 전 보정" 절과 `00-roadmap.md` 4절(공통 규칙)을 읽는다.** 본문과 다르면 그쪽이 우선한다. (2026-11-14)

근거 측정: `findings/p-uncovered-runtime.md`(지형표, 인증·SSE·알림·오류·앱 셸·관리자·시장 통계·shared), `findings/q-uncovered-assets.md`(차트·스타일 토큰·scripts·e2e·설정·의존성·public).

01~09는 "서버 데이터를 화면에 붙이는 길"(타입 → 데이터 층 → 폼·목록 → 계층)을 다뤘다. 이 지침서는 그 길 밖에 있는 것을 다룬다: 세션, 실시간 연결, 오류 수집, 차트, 디자인 토큰, 개발 도구.

## 덮인 범위와 남은 범위

| 지침서 | 덮는 디렉토리·주제 |
|---|---|
| 01 | `entities/*/model/types.ts`, 응답 정규화, `shared/lib/api-schema.ts` |
| 02 | `entities/*/{api,hooks}`, queryKeys·queryOptions, `shared/lib/{api-client,proxy,query}`, 프록시 Route Handler 13개 |
| 03 | 5계층 → 4범위 이동, barrel, alias, lint 경계. `shared` 안의 단일 소비 파일 내리기 |
| 04 | 모든 폼, `FormDialog`, `useAppForm`, 전략 폼 |
| 05 | 서버 규칙 사본(집계·상태 판정·코드값·업무 날짜·검증), `runtime-config`, 클라이언트 페이지네이션 |
| 06 | 목록·로딩·실패·빈 상태·확인·금액 입력·`Surface`·포매터·URL 상태·내비 항목 배열·분기점 상수 |
| 07 | vitest 테스트, `testing/` |
| 08 | CLAUDE.md, `docs/`, memory, `.claude` |
| 09 | knip, `package.json` 스크립트 일부, `deploy/`, workflow, Dockerfile의 공개 환경값 |

어느 지침서도 구조를 다루지 않은 영역(비테스트 줄 수):

| 영역 | 줄 | 이 지침서의 판정 |
|---|---:|---|
| 인증·세션(`proxy.ts`, `app/auth`, `app/api/auth`, `shared/lib/auth`, `features/auth`, `app/pending`·`rejected`) | 1,384 | **1절 — 손댄다** |
| SSE(Route Handler 2, 구독 2) | 187 | **2절 — 손댄다** |
| 푸시 알림·PWA(FCM, 서비스 워커, manifest, 텔레그램) | 약 800 | **3절 — 일부 손댄다** |
| 오류 수집(`error.tsx` 5, `ErrorDisplay`, 리포터) | 365 | **4절 — 손댄다** |
| 금액 가림(구현 2종) | 약 150 | **5절 — 손댄다** |
| 기간 선택과 화면용 날짜 산술 | 약 250 | **6절 — 손댄다** |
| 차트(recharts 12파일, lightweight-charts 1) | 2,098 | **7절 — 손댄다** |
| 디자인 토큰(`app/globals.css` 588줄, 임의값 667건) | 588 | **8절 — 손댄다** |
| 개발 도구(`scripts/` 1,230줄, e2e 6 spec) | 약 1,850 | **9절 — 손댄다** |
| lint·환경값·보안 헤더 설정 | 약 250 | **10절 — 일부 손댄다** |
| 관리자 화면 | 약 5,420 | 11절 — 검토함, 대부분 유지 |
| 시장·통계 화면의 차트 외 로직 | 약 5,640 | 11절 — 검토함, 6·7절과 05가 덮는다 |
| 앱 셸·Provider·테마, `shared` 잡동사니, `components/ui`, `public/` | 약 2,800 | 11절 — 검토함, 유지 |

## 1. 인증·세션 — 세션을 쓰고 읽는 곳을 하나로

### 현재 구조와 문제

로그인 상태는 쿠키 네 개다: AT(`kista-token`), RT(`refresh_token`), 상태 캐시(`kista-user-status`), 역할 캐시(`kista-user-role`). 이 쿠키를 쓰는 코드가 흩어져 있다.

- 쿠키 옵션이 6곳에 적혀 있고 직렬화 방식이 셋이다: `ResponseCookies.set`(`proxy.ts:15-21`, `app/auth/callback/route.ts:12-18`), 문자열 조립(`shared/lib/auth/refresh.ts:45`), 문자열 직접 작성(`app/api/auth/refresh/route.ts:29`). 삭제도 `cookies.delete`(`proxy.ts:93-94`), `set('', CLEAR_COOKIE)`(route 3개), 문자열(`refresh/route.ts:29`) 셋이다.
- 같은 쿠키의 수명이 쓰는 곳마다 다르다. 상태 캐시는 로그인 콜백이 7일로(`callback/route.ts:73-76`), `proxy.ts`가 1시간으로(`:19`) 쓴다. 역할 캐시는 콜백이 쓰지 않는다. AT 수명 `604800`은 두 곳에 리터럴이고 주석이 "JWT TTL과 동일"로 묶는다(`callback/route.ts:16`, `refresh.ts:45`).
- `x-forwarded-proto` 판정이 4곳이다(`proxy.ts:17,132`, `refresh/route.ts:18`, `callback/route.ts:11`).
- 상태 → 경로 표가 3곳이다: `proxy.ts:183-210`(정본), `callback/route.ts:96-103`(주석이 "어차피 proxy가 이동시킨다"고 적는다), `app/pending/PendingStatusWatcher.tsx:14-16`.
- 상태·역할을 알려고 `/api/auth/me`를 부르는 곳이 3곳이다: `proxy.ts:52`, `app/api/auth/me/route.ts:16`, `entities/user/api/index.ts:5`. 역할 판정도 3곳이다(`proxy.ts:192`, `app/(main)/layout.tsx:34`, `admin/users/page.tsx:24`).
- 로그아웃 경로가 둘이고 진행 중 요청 공유는 한쪽에만 있다(`features/auth/logout/LogoutButton.tsx:19-20`, `shared/lib/api-client/index.ts:60-67`).
- 인증 Route Handler 5개가 401 본문을 세 모양으로 낸다(`{error:'Unauthorized'}`, `{error:'No refresh token'}`, 평문).
- 주석이 사본을 묶는다: "proxy.ts와 refresh/route.ts가 동일 값을 쓰도록", "app/api/auth/refresh/route.ts와 동일 값"(`refresh.ts:41`, `proxy.ts:131`). `refresh.ts:4`는 없는 함수 이름(`tryRefresh`)을 가리킨다.

근본 원인은 상태·역할 캐시 쿠키다. 이 캐시가 있어서 캐시 무효화 규칙이 생겼다: PENDING은 캐시하지 않는다(`proxy.ts:155`, `callback/route.ts:72`), AT를 갱신했으면 캐시를 건너뛴다(`proxy.ts:45`), 갱신 Route Handler가 캐시를 지운다(`refresh/route.ts:27-30`), `/me` 실패는 지우고 예외는 지우지 않는다(`proxy.ts:57,63`). `proxy.ts` 214줄 중 절반이 이 캐시를 맞추는 일이다.

### 목표 구조

**(가) 세션 모듈 하나.** `shared/auth/session.ts`가 쿠키를 쓰는 유일한 곳이다.

```ts
writeSession(response, request, { accessToken, upstreamSetCookies })  // AT + RT relay
clearSession(response)                                                 // 로그아웃·탈퇴·갱신 실패
landingPath({ status, role }, pathname): string | null                 // 가야 할 경로. null이면 그대로
```

- 직렬화는 `Set-Cookie` 문자열 append 하나로 통일한다. `ResponseCookies.set`은 먼저 append한 헤더를 덮어쓰므로(`callback/route.ts:79-82`의 주석이 이 사고를 기록한다) 섞어 쓰지 않는 것이 유일하게 안전하다.
- 수명·`secure` 판정·쿠키 이름은 이 파일의 상수다.
- `landingPath`를 `proxy.ts`, 로그인 콜백, 승인 대기 화면이 같이 쓴다.
- 브라우저 쪽 로그아웃은 `logout()` 하나다. `LogoutButton`과 02의 `kistaFetch`(401 처리)가 같은 함수를 부른다.

**(나) 상태·역할을 AT 안에서 읽는다(api 필요).** AT의 클레임에 `status`와 `role`을 넣으면 `proxy.ts`는 이미 하는 만료 디코드(`shared/lib/auth/jwt.ts:8`)에서 둘을 함께 읽는다.

- 캐시 쿠키 2개, `resolveStatusRole`, `/me` 호출 3곳 중 2곳, 캐시 무효화 규칙 4개가 사라진다.
- 상태가 바뀌면(승인·반려·역할 변경) 서버가 옛 AT를 거절하고 갱신을 요구한다. 역할은 이미 이렇게 동작한다(`proxy.ts:44`의 주석 "TOKEN_STALE_ROLE"). 상태에도 같은 규칙을 적용한다.
- 디코드는 서명을 검증하지 않는다. 화면 분기에만 쓰고, 데이터 접근은 지금처럼 api가 막는다. 지금의 캐시 쿠키도 같은 신뢰 수준이다.
- `app/api/auth/reapply-done`(상태 캐시를 지우려고 있는 Route Handler)과 `auth/me`의 GET은 순수 프록시가 돼 02의 단일 프록시로 들어간다.

**api 답(2026-11-13, `cross-repo.md` B절 "api 답" U1): 수용.** `role` 클레임은 이미 AT에 있고 `status`를 더한다. 상태가 바뀌면 옛 AT를 거절하는 장치는 역할 변경과 같고 거절 코드도 `TOKEN_STALE_ROLE` 그대로다(UI의 401 처리 분기를 늘리지 않는다). api가 먼저 배포하고 UI의 캐시 쿠키 삭제가 뒤따른다(api 지침서 13 U1). 그래서 역할 캐시 쿠키는 api 배포를 기다리지 않고 태스크 2에서 먼저 지울 수 있다(`role`은 지금도 토큰에 있다). 상태 캐시만 태스크 3으로 남는다.

### 그렇게 정한 이유

- 인증은 실수 비용이 가장 큰 영역인데 같은 값을 여러 곳이 각자 적고 주석으로만 맞춘다. 상태 캐시 수명이 7일과 1시간으로 갈린 것이 그 결과다.
- 상태·역할은 토큰의 속성이다. 토큰 밖에 사본을 두면 사본을 맞추는 규칙이 필요하고, 그 규칙이 지금의 복잡도다.

### 기각한 대안

- **매 요청 `/me`를 부르고 캐시를 없앤다**: 단순하지만 모든 화면 이동에 왕복이 하나 는다.
- **쿠키 대신 서버 세션 저장소**: 상태 저장소가 UI 컨테이너에 생긴다. blue/green 교체와 맞지 않는다.
- **`proxy.ts`를 여러 파일로 쪼갠다**: 줄 수는 그대로다. 문제는 크기가 아니라 캐시다.

### 감량과 위험

- (가): 약 80줄, 쿠키 옵션 6곳 → 1곳.
- (나): `proxy.ts` 약 60줄, Route Handler 2개, `(main)/layout.tsx`의 역할 폴백. 합쳐 약 200줄.
- 위험: 로그인·갱신·로그아웃이 한 번에 바뀐다. 쿠키 속성 하나가 달라지면 Safari에서 로그인이 풀린다. (가)와 (나)를 다른 커밋으로 나누고, (나)는 api 배포 뒤에 한다.
- `app/(main)/layout.tsx`(87줄, 인증·역할 분기 포함)는 직접 테스트가 없다. 선행 테스트로 덮는다.

### 선행 테스트

1. 현재 `proxy.test.ts`(267줄 11케이스), `refresh.test.ts`, 콜백 테스트를 그대로 통과시킨다. 케이스를 지우지 않는다(07 "지키는 것").
2. 쿠키 고정 테스트를 먼저 추가한다: 로그인 콜백·proxy 갱신·갱신 Route Handler·로그아웃이 내는 `Set-Cookie` 문자열 전체를 스냅샷이 아닌 속성 단언으로 고정한다(이름, `Max-Age`, `HttpOnly`, `SameSite`, `Secure` 유무).
3. `(main)/layout`의 분기(비회원·USER·ADMIN, 만료 토큰)를 렌더 테스트 3~4건으로 고정한다.
4. e2e `auth-guard.spec.ts` 전후 통과, 실제 로그인·토큰 갱신·로그아웃 1회씩 수동 확인.

## 2. SSE — 연결 하나, 끊김을 메우는 규칙 하나

### 현재 구조와 문제

- Route Handler 둘(`app/api/trades/stream/route.ts` 46줄, `app/api/auth/status-stream/route.ts` 36줄)이 undici `Agent` 선언·주석·응답 헤더까지 글자 그대로 같다. 인증 실패 처리만 다르다(SSE `auth-error` 이벤트 대 401).
- 구독도 둘이고 재연결 방식이 다르다: `entities/trade/providers/TradeNotificationProvider.tsx:50-53`은 5초 고정 재시도, `app/pending/PendingStatusWatcher.tsx`는 `onerror` 없이 브라우저 기본 동작에 맡긴다.
- 화면이 가려졌을 때의 처리가 0건이다(`visibilitychange`·`online` grep 0건). 모바일 PWA가 백그라운드에 있는 동안 연결이 끊기고, 그 사이의 체결 이벤트는 사라진다. 돌아와도 화면은 옛 데이터를 보여준다.
- `TradeNotificationProvider`는 이름이 Provider지만 컨텍스트가 없고 `null`을 그린다. Provider → `TradeNotificationBridge` → `(main)/layout`의 세 단이 각각 사용처 1곳이다(entities끼리 import하지 못해 생긴 구조, 03이 없앤다).

### 목표 구조

- **승인 대기 화면은 SSE를 쓰지 않는다.** `/api/auth/me`를 화면이 보일 때와 30초마다 조회한다(`refetchInterval`, `refetchOnWindowFocus`). 상태가 바뀌면 1절의 `landingPath`로 이동한다. `status-stream` Route Handler와 `PendingStatusWatcher`의 `EventSource`가 사라진다. 서버의 `/api/auth/status-stream`은 UI가 구독을 지운 배포 뒤에 api가 지운다(api 답 U2).
  - 이유: 가입 승인은 운영에서 6월 이후 1건이다(`findings/o` 2절). 승인까지 분·시간이 걸리는 흐름에 상시 연결은 맞지 않는다. 30초 늦게 넘어가도 잃는 것이 없다.
- **체결 스트림은 남기고, 끊김을 메운다.** 구독 hook 하나(`useTradeStream`)가 맡는다.
  - 화면이 가려지면 닫고, 다시 보이면 연다.
  - 다시 연결될 때마다 체결 의존 쿼리를 한 번 무효화한다. 끊긴 동안의 이벤트를 따로 받지 않아도 화면이 맞는다.
  - 재시도는 5초 고정에서 상한 있는 증가 간격으로 바꾼다.
  - `auth-error`를 받으면 멈춘다(지금과 같다).
- Route Handler는 하나가 남으므로 공용 헬퍼를 만들지 않는다. 02의 단일 프록시에 스트림 분기를 넣지 않는다(그대로 더 구체적인 경로로 우선 매칭).

### 감량과 위험

- 약 70줄 + 테스트 62줄(`PendingStatusWatcher.test.tsx`). 서버 엔드포인트 1개.
- 위험: 재연결 시 무효화가 02의 무효화 대상·제외 목록(`TradeNotificationBridge`의 표)을 그대로 써야 한다. 폼의 시드 미리보기는 제외 목록에 있다. 표를 새로 만들지 않고 같은 함수를 부른다.
- 선행 테스트: `TradeNotificationProvider.test.tsx`(121줄)의 케이스를 유지하고 "가려짐 → 닫힘", "다시 보임 → 재연결 + 무효화 1회" 두 케이스를 먼저 추가한다(`vitest.setup.ts`의 `MockEventSource` 사용).

## 3. 푸시 알림·PWA — 등록 경로 하나

### 현재 구조와 문제

- FCM 토큰을 서버에 등록하는 경로가 셋이다(`entities/fcm/providers/FcmAutoRegister.tsx:19-20`, `entities/fcm/hooks/useFcmToken.ts:42-53`, `features/settings/notification-channel/NotificationSettings.tsx:73`). 알림 권한 확인이 4곳에 있다.
- Firebase 설정 6키가 두 번 적혀 있다(`shared/lib/firebase.ts:4-11`, `app/firebase-messaging-sw.js/route.ts:2-9`).
- `app/api/fcm/tokens/route.ts`와 `tokens/[token]/route.ts`는 토큰을 붙여 넘기고 204를 돌려주는 순수 프록시인데 직접 구현돼 있다.
- `FcmForegroundListener`의 `enabled` prop은 항상 `true`다(`widgets/layout/FcmBridge.tsx:14`).

### 목표 구조

- `ensurePushRegistered()` 한 함수: 권한 확인 → 서비스 워커 등록 → 토큰 발급 → 서버 등록. 자동 등록과 설정 화면이 같은 함수를 부른다. 권한 확인은 이 함수 안에만 둔다.
- Firebase 설정은 `shared/lib/firebase.ts`의 상수 하나를 서비스 워커 Route Handler가 import한다.
- FCM Route Handler 2개는 02 태스크 2의 단일 프록시로 들어간다(02의 완료 판정 "route.ts 10개 이하"가 8개 이하가 된다).
- 03 뒤에는 `domains/user/push/` 한 폴더에 모인다(Bridge 체인 3단이 없어진다).

### 검토함, 유지

- 설치 프롬프트·오프라인 캐시가 없다. 실시간 주문 상태를 보는 앱이라 오프라인 화면이 줄 것이 없다. 만들지 않는다.
- `PullToRefresh`(102줄, 사용처 2): 한 구현이고 평행이 없다.
- 텔레그램 연결(207줄): 04-5b에서 폼이 통일됐다.
- `app/manifest.ts`의 색 리터럴 2개: manifest는 CSS 변수를 읽지 못한다.

감량: 약 90줄, Route Handler 2개. 위험: 서비스 워커 등록은 실브라우저에서만 확인된다. 알림 권한 허용 → 토큰 등록 → 테스트 알림 수신을 실기기 1회로 확인한다.

## 4. 오류 수집 — 화면 밖 오류도 모은다

### 현재 구조와 문제

- 오류가 서버에 기록되는 길은 React 오류 경계 하나다(`widgets/error-display/ErrorDisplay.tsx` → `useReportClientError` → `/api/client-errors`). 이벤트 핸들러와 비동기 코드의 오류(`window.onerror`, `unhandledrejection`)는 수집하지 않는다. 서버 쪽(서버 컴포넌트, Route Handler)의 오류는 `console.error` 8곳뿐이고, 운영 컨테이너 로그는 30일에 4줄이다(`findings/o` 3절). `instrumentation.ts`가 없다.
- `app/global-error.tsx`(74줄)는 `ErrorDisplay`를 쓰지 않고 500 화면을 인라인 스타일 11곳으로 다시 그린다. 문구가 `ErrorDisplay.tsx:26-32`의 사본이다. 다크로 고정돼 테마를 따르지 않는다.
- `error.tsx` 3개(root, `(main)`, `(admin)/admin`)가 함수 이름만 다른 같은 16줄이다.

### 목표 구조

- **수집 지점 셋, 보내는 함수 하나.**
  - 렌더 오류: 지금 그대로(`ErrorDisplay`).
  - 브라우저의 그 밖 오류: 루트 레이아웃의 작은 클라이언트 컴포넌트가 `error`·`unhandledrejection`을 듣고 같은 `reportClientError`를 부른다. 같은 오류의 반복 전송은 메시지 기준으로 세션당 한 번으로 막는다.
  - 서버 오류: `instrumentation.ts`의 `onRequestError`가 같은 엔드포인트로 보낸다. 실행 전 Next 16.2의 해당 API를 `node_modules/next` 소스나 context7로 확인한다.
- `global-error.tsx`는 `globals.css`를 import하고 `ErrorDisplay standalone`을 그린다. 약 15줄이 된다.
- `error.tsx` 3개는 세그먼트마다 파일이 있어야 하므로(레이아웃을 유지하려면) 남기되, 본문은 `shared/ui`의 컴포넌트 재수출 한 줄이다(06의 `loading.tsx` 프리셋 재수출과 같은 방식).

### 감량과 위험

- 줄 수는 약 80줄 줄고 약 40줄 는다. 목적은 감량이 아니라 사각지대 제거다.
- 위험: 수집을 넓히면 `app_error_logs`가 늘어난다(지금 30일 96건). 확장 프로그램·네트워크 끊김 같은 잡음이 섞인다. 서버가 `error_type`으로 분류하므로 관리자 로그 화면의 유형 필터로 거른다. 잡음이 많으면 무시 목록을 리포터 한 곳에 둔다.
- 선행 테스트: `useReportClientError` 테스트(70줄)에 "전역 오류 1건 → 전송 1회, 같은 오류 재발 → 전송 없음"을 추가한다.

## 5. 금액 가림 — 구현 둘을 하나로

### 현재 구조와 문제

- 구현이 둘이다. `shared/lib/hooks/use-amount-hidden.ts`(87줄)는 전역 설정(localStorage, 탭 간 동기)이고 가계부 12파일이 쓴다. `widgets/revealable-value/RevealableValue.tsx`(31줄)는 값마다 눈 아이콘을 누르는 로컬 토글이고 4파일이 쓴다.
- `AssetOverview.tsx`와 `FinanceSummary.tsx`는 둘을 함께 쓴다. 가림 표현도 다르다(`maskAmount` 대 `'••••••••'`).
- 가림이 닿는 범위가 구현을 따라 갈린다. 가계부는 전역 설정을 따르고, 계좌 요약·관리자 계좌 표는 값마다 따로 누른다. 전략·통계 화면의 금액은 어느 쪽도 적용되지 않는다.

### 목표 구조

`<Amount value={…} currency={…} sensitive />` 하나가 전역 설정을 읽어 가리고, 가려진 값을 누르면 그 값만 잠깐 보인다. 포매터(06 7절)와 가림이 한 컴포넌트에서 만난다. `RevealableValue`와 호출부의 `maskIfHidden` 조합을 지운다.

**사용자 결정이 필요한 것**: 전역 "금액 숨김"을 매매 화면(계좌 요약, 전략 상세, 통계)에도 적용할지. 지금은 가계부 설정 탭에만 스위치가 있다. 적용하면 스위치는 계정 설정으로 옮긴다.

감량: 약 60줄. 위험: 가려야 할 값이 드러나는 회귀. `Amount`의 컴포넌트 테스트에 "설정이 켜져 있으면 첫 렌더부터 가려져 있다"(서버 렌더 포함)를 둔다.

## 6. 기간 선택 — 프리셋 체계 셋을 하나로

### 현재 구조와 문제

05는 업무 날짜(거래일, 롤오버일, 다음 실행일)를 서버로 옮긴다. 화면 상태로서의 기간 선택은 UI에 남는데, 그것이 세 벌이다.

| 체계 | 위치 | 프리셋 | 상태 보관 | 날짜 계산 |
|---|---|---|---|---|
| 관리자·목록 | `shared/lib/date-range.ts:5` | 7d·30d·90d·180d·ytd·all·custom | URL | KST 기준 |
| 벤치마크 | `widgets/benchmark-comparison/model/benchmarkPeriods.ts:1` | 3M·1Y·5Y·ALL·CUSTOM | hook 내부 | 월 빼기를 윤년까지 손으로(`:28-41`) |
| 통계 | `widgets/stats-overview/StatsOverview.tsx:18` | 1M·3M·6M·1Y·ALL | `useState` | UTC 기준(`:28-34`) |

- 같은 "최근 3개월"이 화면에 따라 KST·UTC·로컬 시각으로 계산된다. 자정 전후에 하루가 어긋난다.
- `pad`·`toDateStr`이 `WeeklyMarketCalendar.tsx:22-26`과 `useDailyTradesRangeQuery.ts:25-29`에 같은 본문으로 있다. `DAYS_OPTIONS = [365,180,90,30]`이 `CryptoIndicatorCards.tsx:21`과 `FearGreedSection.tsx:9`에 있다.

### 목표 구조

- `shared/lib/period.ts` 하나: 프리셋 표(일 단위·월 단위·전체·직접 입력)와 `rangeOf(preset, today)`. 기준 시각은 KST 하나다(서버의 거래일 기준과 같다).
- `PeriodToggle` 하나: 화면은 쓸 프리셋 목록만 넘긴다. 상태는 06 8절의 `useUrlState`에 둔다.
- 날짜 문자열 만들기는 `shared/lib/format`의 한 함수다.
- **api 답(U6): 서버가 `range` 프리셋 코드를 받는다**(api T4·T5). 서버가 KST 오늘 기준으로 구간을 계산하고, 프리셋 코드와 라벨은 메타에서 온다. `from`/`to`와 함께 보내면 400이다. 지금은 `from`/`to`만 받는다(PRIVACY의 `range`는 정수라 다른 것이다).
- 그래서 목표가 더 줄어든다. `rangeOf`를 만들지 않는다. `PeriodToggle`은 메타의 프리셋 목록을 그리고 고른 코드를 `range`로 보낸다. 직접 입력일 때만 `from`/`to`를 보낸다. UI에 남는 날짜 코드는 직접 입력의 날짜 문자열 만들기 하나다. `shared/lib/date-range.ts`의 프리셋 계산(`PRESET_DAYS`, `kstDateMinusDays`)도 지운다.

감량: 약 180줄(`date-range.ts`의 계산 포함). 위험: 통계·벤치마크의 조회 구간이 하루 달라질 수 있다(UTC → KST). 의도한 수정이고 계산은 서버가 한다. KST 자정 전후 케이스는 서버 테스트의 몫이다(`cross-repo.md`에 짝으로 적는다).

## 7. 차트 — 틀을 한 번만 적는다

### 현재 구조와 문제

- recharts 차트 12개 1,819줄에 공용 부품은 상수 2개뿐이다(`shared/lib/chart/axisTick.ts` 2줄, `tooltip.ts` 9줄).
- 같은 줄이 차트마다 있다: `<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />` 10곳, `<ResponsiveContainer width="100%" height="100%">` 12곳, `tickLine={false} axisLine={false}` 24줄, `margin` 리터럴 10곳, `domain={['auto','auto']}` 8곳, `min-h-[240px]` 9줄.
- `accessibilityLayer`는 6개에만 있다. 나머지 6개는 키보드로 값을 읽을 수 없다.
- `widgets/benchmark-comparison`의 차트 3개(`HousingBenchmarkChart` 125, `EtfPriceChart` 117, `HousingPriceIndexChart` 118)는 카드 골격과 로딩·실패·빈 상태 분기가 같고 차트 본체는 각 25줄쯤이다.
- 12파일 전부가 같은 `eslint-disable-next-line react-doctor/prefer-dynamic-import`로 시작한다.
- 색이 하드코딩된 곳은 `widgets/fear-greed-card/fearGreedZones.ts`의 hex 5개뿐이다.

### 목표 구조

```tsx
<AsyncSection query={q} title="ETF 가격" skeleton="chart" empty="표시할 데이터가 없습니다.">
  {(data) => (
    <LineChartFrame data={data} x="date" xFormat={fmtAxisMonth} yFormat={fmtMoney}>
      <Line dataKey="close" stroke="var(--chart-1)" />
    </LineChartFrame>
  )}
</AsyncSection>
```

- `shared/ui/chart/`의 틀 컴포넌트가 컨테이너·높이 프리셋·그리드·축 기본값·툴팁·범례·`accessibilityLayer`를 갖는다. 선·막대·영역 차트가 같은 틀을 쓴다(`LineChartFrame`, `BarChartFrame`은 같은 내부 구현의 얇은 이름).
- 카드 골격과 세 상태는 06의 `AsyncSection`이 맡는다. 차트 파일에는 계열 정의만 남는다.
- recharts를 import하는 곳은 `shared/ui/chart/` 한 폴더다. 계열 컴포넌트(`Line`, `Bar`, `Area`)도 여기서 재수출한다. lint 예외가 한 파일로 준다.
- 구간색 5개는 토큰으로 옮긴다(8절).
- 틀에 담기지 않는 차트는 그대로 둔다: `PrivacyBaseChartInner`(405줄, 3패널), `FearGreedGauge`(반원 게이지).

### 검토함, 유지

- `lightweight-charts`(1파일 279줄): recharts에 캔들 차트가 없다. 대시보드 시장 차트 하나를 위해 의존성 하나를 두는 값은 한다. 이동평균·RSI 계산은 05 태스크 10이 서버로 옮긴다.
- 테마 대응 방식이 둘인 것(recharts는 CSS 변수 직접 참조, lightweight-charts는 계산된 값을 읽어 넘김): 캔버스는 CSS 변수를 읽지 못한다.
- `niceTicks.ts`(38줄): 한 위젯 전용이다. 틀이 recharts 자동 눈금을 쓰므로 승격하지 않는다.

### 감량과 위험

- 차트 9~10개 × 15~25줄 + 벤치마크 3파일의 골격 = 약 350~450줄. 06의 차트 지연 로딩 래퍼 감량(202줄)과 별개다.
- 위험: 여백·눈금 간격이 차트마다 조금씩 달랐던 것이 같아진다. visual-diff로 확인하고 의도한 통일로 본다.
- 선행: 틀 전환 전후로 차트가 있는 화면을 visual-diff 한다(9절의 경로 표에 전부 있어야 한다).

## 8. 디자인 토큰 — 체계 하나, 이름으로 쓴다

### 현재 구조와 문제

- `app/globals.css` 588줄에 CSS 변수 157개가 있다. shadcn 표준 이름 32개와 자체 이름 67개가 함께 있고, 같은 값을 가리키는 묶음이 라이트 15개·다크 11개다(`--sidebar`=`--sidebar-bg`, `--destructive`와 `--status-error`, `--chart-1`=`--asset-series-1`, `--radius-*`와 `--r-*` 등).
- 코드에서 한 번도 참조되지 않는 변수가 25개다(변수 12 + `@theme` 별칭 13). shadcn `--sidebar-*` 8개는 sidebar 컴포넌트가 없는데 남아 있다.
- 토큰을 이름이 아니라 임의값으로 쓴다. `-[var(--x)]` 형태가 282건이다: `rounded-[var(--r-lg)]` 50, `text-[var(--status-error)]` 31, `rounded-[var(--r-sm)]` 28, `text-[var(--brand-fg-soft)]` 19. `--status-error`·`--warn`·`--brand-fg-soft`는 `@theme`에 별칭이 있는데도 임의값으로 쓴다. `--r-*`는 별칭이 없어 임의값 말고는 쓸 방법이 없다.
- 같은 의미에 색이 둘이다. 실패 표시가 `text-destructive` 69건과 `status-error` 88건으로 갈린다(06이 "조회 실패 색은 `--status-error` 하나"로 정했지만 토큰 자체는 둘이 남는다).
- 쓰이지 않는 클래스 7개(반응형 그리드 5개 약 19줄, `.text-pos-bg`, `.text-neg-bg`).
- Pretendard를 jsdelivr CDN에서 `@import`한다(`globals.css:1`). 첫 화면 CSS가 외부 요청을 기다린다.

### 목표 구조

- **토큰 층은 둘이다.** 팔레트(`--rose-*` 등 날것의 색)와 의미 토큰(배경·글자·상태·브랜드·차트 계열·모서리·그림자). 컴포넌트는 의미 토큰만 쓴다.
- **의미 토큰은 전부 `@theme`에 노출해 이름 있는 유틸리티로 쓴다.** `rounded-[var(--r-lg)]` → `rounded-lg`(모서리 체계를 `--radius-*` 하나로 합친다), `text-[var(--status-error)]` → `text-status-error`.
- shadcn 표준 이름은 `components/ui`가 읽는 것만 남기고, 자체 토큰의 별칭으로 선언한다(`--destructive: var(--status-error)`). 값을 두 번 적지 않는다.
- 미참조 25개와 미사용 클래스 7개를 지운다.
- 임의값 `-[var(--…)]`를 lint로 막는다(`no-restricted-syntax`로 className 문자열의 패턴). 06의 "새 임의값을 추가하지 않는다"를 문서가 아니라 도구가 지킨다.
- 인라인 `style`의 토큰 리터럴 19건(`style={{ color: 'var(--status-error)' }}`)은 클래스로 바꾼다. 계산값과 런타임 색(25 + 6건)은 남긴다.
- Pretendard는 `next/font/local` 또는 npm 패키지로 자체 호스팅한다(다른 두 글꼴은 이미 `next/font`다).

### 감량과 위험

- CSS 약 60~80줄, 클래스 문자열 282곳이 짧아진다. 줄 수보다 "토큰을 쓰는 방법이 하나"가 효과다.
- 위험: 값이 같아 보이는 토큰을 합쳤다가 다크에서만 다른 쌍을 놓친다. 합치기 전에 라이트·다크 양쪽 값이 같은 쌍만 고른다(`findings/q` 2-2의 묶음은 라이트와 다크가 다르다). 전환은 치환 스크립트로 하고 visual-diff를 라이트·다크 둘 다 돌린다.
- `rounded-*`의 의미가 바뀐다(shadcn 기본 반경 → 자체 `--r-*`). `components/ui`의 모서리가 함께 바뀌는지 visual-diff로 본다. 06 태스크 6(`Card` → `Surface`)과 같은 묶음에서 한다.

## 9. 개발 도구 — 준비 코드 하나, 경로 표 하나

### 현재 구조와 문제

브라우저를 띄워 앱을 여는 도구가 셋이다: e2e(Playwright 러너), `scripts/a11y-check`(307줄), `scripts/visual-diff`(코드 6파일 709줄). 서로 준비 코드를 공유하지 않는다.

- dev 토큰 발급이 4곳(`a11y-check/run.mjs:66`, `visual-diff/run.mjs:144`, `shared/seed.mjs:32`, `e2e/global.setup.ts:34-41`), 쿠키 주입이 3곳, 뷰포트 상수가 2곳, 컨텍스트 옵션이 2곳, 쓰기 차단이 2곳(방식이 다르다)에 있다.
- 화면 경로를 손으로 적은 표가 둘이다: a11y-check의 28개, visual-diff의 48개. 앱의 화면은 35개인데 a11y-check 표에는 9개가 빠져 있다(`/strategies`, `/pending`, `/rejected`, `/finance/new`, `/finance/[id]/edit`, `/finance/budgets/[type]`, `/finance/bulk-register`, 전략 수정, VR 재설정). 화면을 추가해도 표는 따라오지 않는다.
- e2e가 두 디렉토리에 있다(`e2e/`, `tests/e2e/`).
- `scripts/`의 테스트는 0개다. 지침서 03·06·7절·8절이 전부 visual-diff를 회귀 확인 수단으로 쓴다.

### 목표 구조

- `scripts/shared/browser.mjs`: `devToken(role)`, `authedContext(browser, role, viewport)`, `VIEWPORTS`, 읽기 전용 가드. 세 도구가 같은 것을 쓴다. e2e의 `global.setup.ts`도 `devToken`을 import한다(`seed.mjs`를 이미 그렇게 쓴다).
- `scripts/shared/routes.mjs`: 화면 경로 표 하나. 행마다 경로 틀, 필요한 역할, 시드 ID 채우는 법, 다이얼로그 여는 법(있으면). a11y-check는 이 표 전체를, visual-diff는 이 표에 상태 변형(fixture 모드)을 더해 쓴다.
- **표가 앱과 어긋나면 실패한다.** `find app -name page.tsx`로 얻은 경로가 전부 표에 있는지 보는 검사를 `npm run lint` 뒤에 붙인다(스크립트 약 15줄). 화면을 추가하고 표를 안 고치면 CI가 막는다.
- e2e는 `e2e/` 한 디렉토리로 모은다.

### 검토함, 유지

- e2e `auth-guard.spec.ts`가 `proxy.test.ts`와 같은 분기를 본다. 층이 다르다(실제 쿠키·리다이렉트 대 함수). 07이 e2e 17케이스 유지를 정했다.
- 실데이터를 바꾸는 e2e 2케이스(계좌 생성·삭제): 전용 접두사·루프백 단언·락이 있다.
- visual-diff의 읽기 전용 프록시와 fixture 서버(259줄): 로컬 api 없이 화면 상태를 재현하는 수단이다. 07의 `mockApi`와 역할이 겹쳐 보이지만 하나는 vitest 안, 하나는 실제 브라우저다.

감량: 약 150줄. 효과는 줄 수가 아니라 회귀 확인 수단의 사각지대(9개 화면)를 없애는 것이다. 위험은 작다(제품 코드를 건드리지 않는다). 다른 지침서가 visual-diff에 기대므로 일찍 한다.

## 10. 설정 — lint 억제, 환경값, 보안 헤더

### 10-1. react-doctor 억제 주석

- 현재: react-doctor는 ESLint 플러그인이 아닌데 억제는 `eslint-disable react-doctor/*` 주석으로 한다(제품 코드 49건, 그중 12건이 recharts import 한 줄). ESLint가 모르는 규칙 이름을 막지 않게 하려고 아무 규칙에나 응답하는 stub 플러그인을 등록했고(`eslint.config.mjs:6-14`), stub 때문에 `reportUnusedDisableDirectives`를 전역으로 껐다. 그 결과 **쓸모없어진 `eslint-disable` 주석을 ESLint가 알려주지 않는다**(react-doctor가 아닌 주석 포함).
- 실행 명령은 `npx react-doctor@latest`다(`package.json:11`). 버전이 고정돼 있지 않아 규칙이 어느 날 바뀐다.
- 목표: 억제를 `doctor.config.json`의 파일·규칙 단위 예외로 옮긴다(이미 `components/ui/**`에 4개 규칙이 그렇게 돼 있다). 7절 뒤에는 recharts 예외가 `shared/ui/chart/**` 한 줄이다. stub을 지우고 `reportUnusedDisableDirectives`를 켠다. react-doctor를 devDependency로 버전 고정한다.
- 줄 단위 억제가 설정 파일로 표현되지 않는 규칙이 남으면 실행 세션이 react-doctor 문서를 확인해 정한다(`questions.md` 대상).
- **사용자 결정(2026-11-13): 걷어낸다.** CI 검사는 PR에만 걸리는데 이 레포의 변경은 대부분 main 직접 커밋이라(커밋 2,011개 중 머지 34개) 평소 변경이 검사를 거치지 않는다. 그 대가로 억제 주석 49건과 ESLint 미사용 억제 감지 꺼짐을 지고 있었다. 접근성·hooks·Next 규칙은 ESLint(jsx-a11y strict, react-hooks, next)와 `a11y-check`가 이미 본다.

### 10-2. 환경값

- `process.env`를 `shared/lib/env.ts` 밖에서 직접 읽는 곳이 15줄이다. Firebase 6키가 두 파일에 같은 목록으로 있다(3절).
- `.env.example`에 코드가 읽는 키가 빠져 있다: `API_BASE_URL`(가장 먼저 읽는 키), `DEPLOYMENT_VERSION`, `E2E_*` 3개, `KISTA_DEV_SEED`.
- 목표: 공개 값은 `env.ts`의 `publicEnv` 객체 하나, 서버 값은 지금의 함수. `.env.example`을 코드와 맞춘다. 09 태스크 6(`NEXT_PUBLIC_*` 원본 통합)과 같은 묶음에서 한다.

### 10-3. 보안 헤더 (확인 필요)

- 코드 근거: `next.config.ts`(12줄)에 `headers()`가 없다. kista-infra의 `Caddyfile`과 `deploy/server/caddy/*.caddy`에도 `header` 지시문이 없다(grep 0건).
- 인증 쿠키로 주문을 내는 앱이 `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`(또는 CSP `frame-ancestors`), `Referrer-Policy`를 보내지 않는 것으로 보인다. 운영 응답 헤더를 직접 확인하지는 않았다.
- **infra 답(2026-11-13, `cross-repo.md` F1, infra 지침서 04의 2-8절·T9)**: 보안 헤더는 infra `Caddyfile`의 공용 스니펫 `(site)`에 둔다. `next.config.ts`에는 두지 않는다. 이 레포가 할 일은 `deploy/server/caddy/kista-ui.caddy`의 사이트 블록에 `import site <앱>` 한 줄이다. **순서가 있다**: infra가 `(site)`를 먼저 배포한 뒤에 import를 넣는다. 반대면 caddy reload가 실패해 reconcile이 롤백한다. 09 태스크 7(C 묶음)과 같은 배포에 넣는다.
- CSP만 앱 몫이다. 본문(스크립트 출처 제한)은 카카오 로그인·Firebase·jsdelivr 글꼴(8절에서 제거)을 조사해야 해서 별도 작업이다.

### 검토함, 유지

- `tsconfig.json`의 alias 8개와 `vitest.config.ts`의 alias 8개가 같은 목록이다. 03 태스크 7이 alias를 3개로 바꿀 때 한 곳에서 읽게 한다(vitest가 tsconfig paths를 직접 읽는 설정이 있는지 그때 확인).
- `strict: true`, `as any` 0건, `@ts-ignore` 0건. 타입 설정은 손댈 것이 없다.
- 선언 없이 import하는 `sharp`·`axe-core`: 09 B6에 `axe-core`를 더한다.

## 11. 검토함, 유지

| 영역 | 측정 | 판정 |
|---|---|---|
| 관리자 화면 전체(약 5,420줄, 제품의 13%) | 공용 표·페이지·오류 프리미티브를 이미 쓴다. 남은 평행(정렬 블록 7곳, 확인 다이얼로그 3개, 필터 3종, 페이지 자르기)은 06·05가 덮는다 | 별도 구조 작업 없음 |
| 관리자 계좌 표 2벌(`widgets/admin-account-list/AdminAccountsTable.tsx` 62줄, `widgets/admin-log-list/AccountTable.tsx` 55줄) | 같은 데이터를 다른 폴더에서 그린다 | 06 태스크 2에서 `DataList` 하나로 합친다 |
| P 매매표(`/admin/privacy-trades`, 1,925줄, 관리자의 36%) | 기준표는 FIDA가 수집해 넣는 원천 데이터이고 KISTA에 산출 공식이 없다(api 답 U4). 수동 등록·수정은 FIDA 실패 대응용이고 90일에 11건이다 | **보류.** api 지침서 12 B5(수동 수정 원인 조사)가 끝난 뒤 다시 판정한다. 그때까지 화면 축소를 정하지 않는다. 표의 목록 부분은 06 `DataList` 대상에서 원래 제외돼 있다 |
| `UrlRangeFilterBar`(98줄, `shared/ui`지만 관리자만 쓴다) | 소비 7파일 전부 관리자 | 06 8절 `useUrlState` + 6절 `PeriodToggle`로 흡수 |
| 시장·통계 화면의 차트 외 로직(약 5,640줄) | 위젯 8개가 전부 화면 1곳 전용. 로컬 포매터 10종, 해설 문구 데이터 2파일 | 포매터는 06, 화면 전용 배치는 03, 계산은 05, 기간은 6절, 차트는 7절. 남는 것 없음 |
| `MetaProvider`가 두 레이아웃에 각각 있음 | `(main)`과 `(admin)`이 각자 감싼다 | 로그인·승인 대기 화면은 메타가 필요 없다. 루트로 올리지 않는다 |
| Provider 조립(`shared/providers` 25줄), 테마(next-themes 1곳) | 평행 없음 | 유지 |
| 내비 항목 배열 복사 2쌍, 활성 판정 2종 | — | 06 9절이 덮는다 |
| `shared`의 단일 소비 파일 8개(`use-decimal-amount-text`, `use-scrolled-to-end`, `SuggestionListEditor`, `YearSelect`, `Stepper` 등) | 소비처 1곳 | 03 태스크 3이 쓰는 곳으로 내린다 |
| localStorage 키 3개의 이름 규칙이 제각각 | `reapply_*` 2개는 05 태스크 10이 지운다 | 남는 키가 1개라 규칙이 필요 없다 |
| `components/ui`(shadcn 14파일 1,068줄) | 소비처 0인 파일 없음. `pagination`·`card`는 06이 지운다 | 유지 |
| 에러 화면 전용 CSS(약 96줄, `ErrorDisplay` 1파일용) | 연출용 키프레임과 클래스 | 유지. 4절로 `global-error`도 같은 클래스를 쓰게 된다 |
| `public/`(5파일) | 같은 md5 1쌍은 09 B8이 유지로 판정 | 유지 |
| `next.config.ts`(12줄), `postcss.config.mjs`, `components.json` | 특이점 없음(보안 헤더는 10-3) | 유지 |
| `/api/health`(5줄), `shared/lib/env.ts`, `query-string.ts` | 특이점 없음 | 유지 |

## 예상 감량 합계와 위험

| 절 | 감량(추정) | 성격 |
|---|---:|---|
| 1 인증·세션 | 약 200(api가 클레임을 넣을 때) / 약 80 | 사본 제거, 사고 예방 |
| 2 SSE | 약 70 + 테스트 62 | 삭제 + 끊김 보완 |
| 3 푸시 | 약 90, Route Handler 2 | 경로 통일 |
| 4 오류 수집 | 순감 약 40 | 사각지대 제거 |
| 5 금액 가림 | 약 60 | 구현 통일 |
| 6 기간 | 약 120 | 구현 통일, 시각 기준 수정 |
| 7 차트 | 350~450 | 틀 추출 |
| 8 토큰 | CSS 60~80, 클래스 282곳 단축 | 체계 통일 |
| 9 개발 도구 | 약 150 | 사본 제거, 검증 범위 확대 |
| 10 설정 | 주석 49줄 | 도구 복원 |

합계 제품 약 1,100~1,300줄. 01~09(약 11,000줄)에 비해 작다. 이 지침서의 값은 줄 수가 아니라 (a) 인증처럼 틀리면 안 되는 곳의 사본을 없애고 (b) 오류 수집·화면 회귀 확인·lint의 사각지대를 메우는 데 있다.

공통 위험: 1·2·3절은 실브라우저와 실제 로그인이 있어야 확인된다. 로컬 api는 사용자가 기동한 세션에서만 쓴다.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 | 선행 |
|---|---|---|---|---|---|
| 1 | 도구 준비 코드·경로 표 통합, 경로 누락 검사, e2e 디렉토리 통합 | `scripts/shared/**`, `scripts/{a11y-check,visual-diff}/**`, `e2e/**`, `tests/e2e/**`, `playwright.config.ts` | Sonnet | `grep -rn "dev-token\|dev-admin-token" scripts e2e \| wc -l`이 1곳, 경로 검사가 화면 35개를 전부 통과, `npm run a11y-check`·`npm run test:e2e` 통과(로컬 api) | 없음. 가장 먼저 |
| 2 | 세션 모듈(가): 쿠키 쓰기·지우기·`landingPath`·`logout()` 한 곳 | `shared/lib/auth/**`, `proxy.ts`, `app/auth/callback/route.ts`, `app/api/auth/**`, `features/auth/logout/**` | Opus | 1절 선행 테스트 1~3 통과, `grep -rnE "Max-Age\|maxAge" --include='*.ts' app shared proxy.ts \| grep -v test`가 세션 모듈 1파일, `/code-review high` | 02 태스크 3(`kistaFetch`)과 같은 묶음이면 `logout()`을 한 번만 옮긴다 |
| 3 | 상태를 AT 클레임에서 읽기(나), 상태 캐시 쿠키 삭제(역할 캐시는 태스크 2에서 먼저 지운다 — `role` 클레임은 이미 있다) | `proxy.ts`, `shared/lib/auth/**`, `app/(main)/layout.tsx`, `app/api/auth/{me,reapply-done}` | Opus | `grep -rn "STATUS_COOKIE\|ROLE_COOKIE" . \| grep -v test` 0건, 승인 → 화면 전환, 역할 변경 → 관리자 메뉴 반영을 로컬 api에서 확인, `/code-review high` | api가 클레임과 옛 토큰 거절을 배포한 뒤 |
| 4 | 승인 대기 화면을 조회 방식으로, `status-stream` 삭제 | `app/pending/**`, `app/api/auth/status-stream` | Sonnet | `grep -rn "status-stream" . \| grep -v docs` 0건, 해당 vitest | 태스크 2 |
| 5 | 체결 스트림: 가려짐 처리, 재연결 시 무효화, 증가 간격 | `entities/trade/providers/**`, `widgets/layout/TradeNotificationBridge.tsx` | Opus | 2절 선행 테스트 2케이스 통과, 변이 확인 1회(무효화 호출 제거 시 실패) | 02 태스크 5c 뒤(무효화 표가 경로 기준이 된 뒤) |
| 6 | 푸시 등록 경로 통일, Firebase 설정 한 곳, FCM Route Handler를 단일 프록시로 | `entities/fcm/**`, `shared/lib/firebase.ts`, `app/firebase-messaging-sw.js/route.ts`, `app/api/fcm/**`, `features/settings/notification-channel/**` | Sonnet | `grep -rn "Notification.permission" --include='*.ts*' . \| grep -v test`가 1파일, 실기기 알림 1회 | 02 태스크 2 |
| 7 | 오류 수집 확장, `global-error`·`error.tsx` 정리 | `entities/error-log/**`, `app/{error,global-error}.tsx`, `app/(main)/error.tsx`, `app/(admin)/admin/error.tsx`, `instrumentation.ts`(신규) | Sonnet | 4절 선행 테스트, `wc -l app/global-error.tsx`가 20 이하, 고의 오류(이벤트 핸들러 throw, 서버 컴포넌트 throw)가 로컬 api의 오류 로그에 1건씩 남음 | 없음 |
| 8 | `Amount` 컴포넌트로 금액 가림 통일 | `shared/ui/**`, `shared/lib/hooks/use-amount-hidden.ts`, `widgets/revealable-value/**`, 소비 16파일 | Sonnet | `grep -rn "RevealableValue\|maskIfHidden" . \| grep -v test` 0건 | 사용자 결정(적용 범위), 06 태스크 7(포매터) |
| 9 | 기간 선택 통일: 메타 프리셋 + `range` 파라미터, UI 날짜 계산 삭제(api T4·T5 뒤, 05 태스크 5와 같은 묶음) | `shared/lib/{date-range,period}.ts`, `widgets/{benchmark-comparison,stats-overview,market-holiday-calendar,crypto-market-indicators,fear-greed-card}/**`, `entities/trade/hooks/useDailyTradesRangeQuery.ts` | Sonnet | `grep -rnE "RANGE_DAYS\|BENCHMARK_PERIODS\|DAYS_OPTIONS" . \| grep -v test` 0건, `grep -rn "kstDateMinusDays\|subtractMonths\|rangeToFrom" . \| grep -v test` 0건 | api T4·T5, 06 태스크 8(`useUrlState`) |
| 10 | 차트 틀 추출과 전환 | `shared/ui/chart/**`, recharts 차트 10파일 | Opus(틀), Sonnet(전환) | `grep -rln "from 'recharts'" --include='*.tsx' . \| grep -v shared/ui/chart \| wc -l`이 2 이하(3패널·게이지), visual-diff 검토 | 06 태스크 3(`AsyncSection`), 태스크 1 |
| 11 | 토큰 체계 통일, 임의값 치환, 미참조 삭제, lint 규칙, Pretendard 자체 호스팅 | `app/globals.css`, 클래스 문자열 282곳, `eslint.config.mjs`, `app/layout.tsx` | Opus(체계·치환 스크립트), Sonnet(잔여) | `grep -rnE "\-\[var\(--" --include='*.tsx' . \| wc -l` 0, visual-diff 라이트·다크 | 06 태스크 6과 같은 묶음, 태스크 1 |
| 12 | react-doctor 걷어내기: stub 플러그인과 `reportUnusedDisableDirectives: 'off'` 삭제, `react-doctor/*` 억제 주석 49줄 삭제, `doctor.config.json`·`.react-doctor/`·`.github/workflows/react-doctor.yml`·`package.json`의 `doctor` 스크립트·`.claude/skills/react-doctor/` 삭제, `docs/agents/commands.md`·`finance-widgets.md`의 언급 정리 | 위 파일들 | Haiku | `git grep -n "react-doctor" -- ':!docs/superpowers'` 0건, `npm run lint` 통과, 고의로 쓸모없는 `eslint-disable` 1건을 넣었을 때 lint가 보고하는지 확인 후 되돌림 | 없음(태스크 10과 무관해졌다) |
| 13 | 환경값 접근 한 곳, `.env.example` 정합 | `shared/lib/env.ts`, 직접 접근 15줄, `.env.example` | Haiku | `grep -rn "process.env" --include='*.ts*' app entities shared features widgets \| grep -v "shared/lib/env.ts" \| grep -v test` 0건 | 09 태스크 6과 같은 묶음 |

## 판단이 갈릴 때의 기본값

- 인증 코드에서 동작이 애매하면 지금 동작을 보존한다. `/me` 실패 시 캐시를 지우고 예외 시 지우지 않는 비대칭(`proxy.ts:57,63`)도 태스크 2에서는 그대로 옮기고, 태스크 3에서 캐시와 함께 사라진다.
- 틀·컴포넌트에 담기지 않는 화면은 그대로 둔다(06과 같은 규칙).
- 토큰을 합칠지 애매하면 합치지 않는다. 라이트·다크 값이 둘 다 같은 것만 합친다.

## 하지 말아야 할 것

- 태스크 2에서 401 갱신·로그아웃의 동작을 고치지 않는다(02와 같은 금지).
- AT 클레임을 디코드한 값으로 데이터 접근을 허용하지 않는다. 화면 분기에만 쓴다.
- SSE 구독을 일반화한 `useEventSource` hook을 만들지 않는다. 구독은 하나가 남는다.
- 차트 틀에 차트 하나를 위한 prop을 넣지 않는다.
- 오류 리포터에 재시도·큐·오프라인 저장을 넣지 않는다. 한 번 보내고 실패하면 버린다(지금과 같다).
- 관리자 화면을 사용자 화면과 "통합"하려고 추상화를 만들지 않는다. 공용 프리미티브를 쓰는 것으로 충분하다.
- CSP를 이 지침서의 태스크에 끼워 넣지 않는다. 출처 조사가 필요한 별도 작업이다.

## 재심한 유지 확정 항목

| 기존 결정 | 출처 | 재심 결과 |
|---|---|---|
| status·role을 1시간 쿠키로 캐시하고 PENDING은 캐시하지 않는다 | `proxy.ts:13,155`, `docs/agents/app.md` | 변경. AT 클레임으로 대체(api 필요). 받아들여지지 않으면 유지 |
| `secure`는 `NODE_ENV`가 아니라 실제 프로토콜 기준 | `proxy.ts:14`, `refresh.ts:43` | 유지. 판정을 한 곳으로 |
| RT `Set-Cookie`는 마지막에 raw로 relay | `callback/route.ts:79-82` | 유지. 전부 raw로 통일해 규칙 자체가 필요 없게 한다 |
| prefetch 요청은 AT를 갱신하지 않는다 | `proxy.ts:103-106` | 유지 |
| 승인 대기 화면은 SSE로 승인을 감지한다 | `docs/agents/app.md` | 변경. 주기 조회 |
| `/dashboard`는 비회원도 접근 가능 | `proxy.ts:22`, `docs/agents/architecture.md` | 지침서 10의 D12에 따른다. 폐지되면 게스트 게이팅(`hasValidToken` 2곳, `enabled: isAuthenticated`, 공개 엔드포인트 토큰 미부착 규칙 3곳)이 함께 사라진다 |
| 차트는 `dynamic()`으로 지연 로딩 | `docs/agents/widgets.md` | 유지(06이 래퍼를 한 줄로) |
| 인라인 `style`은 토큰값·계산값 예외 | `docs/agents/constraints.md` | 변경. 토큰값은 클래스로, 예외는 계산값·런타임 색만 |

## 다른 지침서와의 의존·순서

- 태스크 1(도구)은 독립이고 03·06·7절·8절의 회귀 확인 수단이라 가장 먼저 한다. 묶음 D(06) 앞에 넣는다.
- 태스크 2는 02 태스크 3과, 태스크 6은 02 태스크 2와 같은 묶음이 싸다.
- 태스크 10·11은 06(태스크 3·6) 직후, 03 이동 전에 한다(이동할 코드가 준다).
- 태스크 3·4의 서버 쪽, P 매매표 질문, 기간 프리셋 파라미터는 `cross-repo.md` B절에 요청으로 적었다.
- 보안 헤더(10-3)와 접근 로그(지침서 10의 D17)는 fable-infra가 답했다(`cross-repo.md` F1·F2). ui 쪽 일은 caddy 스니펫 import 한 줄이고 infra 배포 뒤다.
- infra 문서 링크·서술 정정(F5·F6)은 `deploy/server/README.md:41`, `.github/workflows/server-deploy.yml:115`가 대상이다. F5는 infra 사용자 승인 뒤, F6의 줄 번호 표는 infra 지침서 05의 9절. 08 태스크 5(문서 정리)에 넣는다.
- 08 2단계: 태스크 2·3이 끝나면 `docs/agents/app.md`의 쿠키·캐시 서술을 세션 모듈 한 줄로 줄인다.

## 사용자 결정 (2026-11-13, "모두 권장대로")

| # | 결정 | 결과 |
|---|---|---|
| E1 | 금액 숨김의 적용 범위(5절) | **승인** — 매매 화면(계좌 요약·전략 상세·통계)까지. 스위치는 계정 설정으로 옮긴다. 태스크 8의 범위가 이것이다 |
| E2 | react-doctor(10-1) | **결정** — 걷어낸다(태스크 12) |
| E3 | 승인 대기 화면의 실시간 감지(2절) | **승인** — 30초 주기 조회. 서버 엔드포인트는 ui 배포 뒤 api가 지운다 |
| E4 | 상태를 토큰 클레임으로(1절 나) | **승인** — api 지침서 13 U1, api 먼저 배포 |
| E5 | 보안 헤더(10-3) | **승인(ui 쪽)** — 위치는 infra Caddy 공용 스니펫. 실행은 infra 지침서 04 T9이고 그쪽 결정 목록에서 따로 승인받는다 |

## 실행 전 보정 (2026-11-14 — 본문과 다르면 이 절이 우선)

공통 규칙은 `00-roadmap.md` 4절. 측정 원본은 `findings/t-guide-premises-07-11.md`. 사용자 결정 E1~E5는 닫혔다. 서버와 무관하게 지금 할 수 있는 것: 태스크 1, 2, 7, 12(로드맵 S2).

전제 정정(완료 판정이 0이 되지 않는 곳):

- 태스크 1: `grep -rn "dev-token\|dev-admin-token" scripts e2e`는 README 두 줄(`scripts/a11y-check/README.md:30`, `scripts/visual-diff/README.md:40`)에 걸려 1이 되지 않는다. `git grep -n "dev-token\|dev-admin-token" -- 'scripts/**/*.mjs' 'e2e/**/*.ts' 'tests/**/*.ts' | wc -l`이 1이면 통과다. "화면 35개"는 10의 1·2와 12가 화면을 줄인 뒤의 수로 센다.
- 태스크 4: `status-stream`은 생성물과 도구에 남는다. 판정은 `git grep -n "status-stream" -- . ':!docs' ':!shared/lib/api-types.ts' ':!openapi.json'` 0건이다. 같이 지울 것: `scripts/visual-diff/scenarios.mjs:51`의 `stubStatusStream`과 `README.md:67`, `deploy/server/docker-compose.yml:21`의 주석, `docs/agents/app.md:29`. 생성 타입에서는 api가 엔드포인트를 지운 뒤 사라진다(ui 먼저. `cross-repo.md`에 적는다).
- 태스크 12: 대상에 `.claude/settings.json:4`의 react-doctor 허용 규칙이 빠져 있다. 같이 지운다. `docs/agents/commands.md`의 lint 문장("react-doctor 규칙은 stub으로 등록")과 `CLAUDE.md`·`README.md`의 언급도 판정에 넣는다: `git grep -n -i "react-doctor\|doctor" -- . ':!docs/superpowers' ':!package-lock.json'` 0건.
- 태스크 9: 대상에 `app/(main)/stats/page.tsx`가 빠져 있다. `crypto-market-indicators`는 12가 지워서 대상에서 빠진다. 서버의 `range` 프리셋 코드는 아직 계약에 없다(PRIVACY의 정수 `range` 한 곳뿐).
- 태스크 10: recharts 차트는 지금 12파일이다. 코인의 `IndicatorLineChart.tsx`가 12로 사라지면 틀로 옮길 것은 9파일이다. 판정 "2 이하(3패널·게이지)"는 그대로다.
- **태스크 2·3과 PENDING 사용자의 `role`**: 본문은 "역할 캐시 쿠키는 태스크 2에서 먼저 지운다, `role` 클레임은 이미 있다"고 한다. ACTIVE 사용자에게는 맞다. 그런데 api 13 U1이 배포되면 **PENDING 사용자의 토큰에는 `role` 클레임이 없다.** 태스크 2에서 `landingPath`와 `proxy.ts:35-64`의 상태·역할 판정이 role 없는 토큰을 만나도 갱신·리다이렉트를 되풀이하지 않게 한다: 상태가 PENDING·REJECTED면 role을 읽지 않는다. 테스트에 "role 없는 PENDING 토큰" 1건을 넣는다.
- api 13 U1 뒤로 PENDING 사용자는 승인 대기 화면이 쓰는 경로 말고는 403을 받는다. ui가 부르는 경로 목록은 `findings/t` 6-7절에 있고 api 레포 `cross-repo.md`에 회신했다(2026-11-14). 태스크 4(주기 조회)·6(FCM)에서 PENDING 화면이 부르는 경로가 늘거나 바뀌면 `cross-repo.md`의 그 목록을 고친다. `clientFetch`의 전역 401 처리는 403에 반응하지 않는지 확인한다(반응하면 로그아웃 반복이 된다).
- 태스크 3의 선행은 `status` 클레임이다(api U1). 토큰은 타입에 보이지 않으므로 api 레포 `cross-repo.md` E절의 완료 표시로 확인한다. 표시가 없으면 하지 않는다.

같은 커밋에서 고칠 것(가드):

- 태스크 12와 03의 7이 같은 `eslint.config.mjs`를 고친다. 12가 먼저다. `reportUnusedDisableDirectives`를 켜면 쓰이지 않는 억제 주석이 전부 오류가 된다. 주석을 지우는 것과 같은 커밋이어야 lint가 통과한다.
- 태스크 6: `app/api/fcm/**` 2개를 단일 프록시로 옮기면 02의 route 수가 준다. 02의 2가 끝난 뒤에 한다.
- 태스크 11: `app/globals.css:6`의 `@source not "../docs"`를 지우지 않는다. 임의값 금지 lint 규칙은 위반 0 뒤에 켠다.
- 태스크 13: 09의 6과 같은 묶음이다. `.env.example`에서 `TRADING_API_BASE_URL`을 빼는 것은 02의 8이다.

기본값은 본문 "판단이 갈릴 때의 기본값" 절. 더할 것:

- 태스크 8(금액 가림, E1 승인: 매매 화면까지): 스위치를 계정 설정으로 옮기는 것은 조작 위치가 달라지는 변경이고 승인된 범위다. 가림 상태의 기본값(꺼짐)과 저장 위치는 지금 것을 유지한다.
- 태스크 7(오류 수집): 수집 요청이 실패해도 화면에 아무것도 보이지 않게 한다(지금 동작). PENDING 화면에서도 `POST /api/client-errors`가 나간다.
- 코인 위젯에 걸친 항목(기간 프리셋, 차트 틀, `fear-greed-card`의 crypto)은 12 전이면 건드리지 않는다(V8).

중단 조건의 대체 경로:

- 1·2·3절의 "실브라우저와 실제 로그인이 있어야 확인된다"(380행), 인증 흐름 수동 확인(103~109행) → 로드맵 4-5의 2. 인증 코드는 e2e `auth-guard.spec.ts` 전후 통과가 끝나기 전에 push를 요청하지 않는다. 테스트의 케이스를 지우지 않는 규칙은 그대로다.
- 서비스 워커 실기기 확인(154행) → 로드맵 4-5의 3.
- 태스크 2에서 기존 인증 테스트가 깨진다 → 되돌린다. 동작이 애매하면 지금 동작을 보존한다(본문 기본값).

배포: 태스크 2·3은 인증 경로라 `/code-review high`. 태스크 3은 api U1 배포 뒤, 태스크 4는 ui 먼저(api가 `status-stream`을 뒤에 지운다), 태스크 9는 05의 5와 같은 날이다(로드맵 4-4). 보안 헤더(E5)는 infra가 하고 ui는 `kista-ui.caddy`에 import 한 줄이다(10의 10과 같은 조건).
