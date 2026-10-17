# 코인 거래소 연결 + 코인 DCA (1차: 업비트) 설계

- 작성일: 2026-10-17
- 상태: 사용자 승인 (브레인스토밍 섹션 ①~⑤)
- 범위: kista-ui 구현 + kista-api·kista-infra 요청 사항

## 배경과 목표

계좌 연결에 빗썸·업비트·바이낸스를 추가하고, DCA 전략에서 BTC·ETH를 선택할 수 있게 한다.
현재 시스템은 미국 주식을 전제로 한다(정수 수량, USD 고정, MOO/MOC, 미국 거래일 보정, CNN 공포탐욕). 그래서 거래소를 순차로 붙인다.

- **1차 (이 문서)**: 업비트. 코인 DCA 전 구간(계좌 연결, DCA 설정, 체결·잔고 표시)을 완성한다.
- 2차: 빗썸. KRW 마켓이라 1차 구조를 거의 그대로 쓴다(broker enum, 어댑터, ApiStep config 추가).
- 3차: 바이낸스. `CRYPTO_USDT` market과 USDT 통화를 추가한다. 국내 미신고 거래소라 한국 거주자 서비스 제한이 있으므로 착수 전에 운영 리스크를 다시 판단한다.

## 확정 요구사항

- 코인은 **DCA 전략만** 지원한다. 무한매수 등 다른 전략 타입은 코인 계좌에서 숨긴다.
- 코인 거래소 계좌는 코인 티커만, 주식 계좌는 주식 티커만 고를 수 있다(broker market과 ticker market 일치).
- 매수·매도 양방향 DCA, 금액 기준.
- 실행: 사용자가 실행 시각(KST, 시 단위, 기본 09시)을 지정하고 **시장가**로 주문한다.
  - 매수: 업비트 `ord_type=price`(KRW 금액 시장가 매수)
  - 매도: 금액 ÷ 현재가로 수량을 계산해 `ord_type=market`
- 주기 DAILY / WEEKLY / MONTHLY 유지. 휴장일 보정 없음(24/7). 없는 날짜의 말일 보정만 유지한다. WEEKLY 요일은 토·일도 고를 수 있다.
- 조건(AND): 평단가(±n%), SMA 20/50/120/200, RSI(14)는 **업비트 일봉**(KST 09:00 마감) 기준으로 계산한다. "전일 종가"는 "직전에 완성된 일봉 종가"로 해석한다.
- 공포탐욕 조건은 지표 코드 `FEAR_GREED`를 그대로 쓰고, 코인 계좌는 Crypto Fear & Greed Index(alternative.me)를 소스로 쓴다.
- 업비트 최소 주문 5,000 KRW. 설정 저장 시 `amount >= 5000`을 검증한다. 실행 시 예수금·보유량 때문에 축소된 금액이 5,000 미만이면 skip하고 알림을 보낸다.
- 통화: 계좌·전략 단위 화면은 계좌 통화로 표시한다. 통화 간 환산은 하지 않는다.
- 통계: 1차 제외. 현재 통계 집계(`TradingStatsService` 등)가 DCA 전략을 집계에서 빼므로 DCA만 있는 코인 계좌는 KRW 통계가 항상 비어 있다(kista-api 확인, 사용자 결정).
- 1차 제외: 벤치마크, 백테스트(코인 계좌·티커를 목록에서 숨김).

## 접근 방식

기존 모델을 확장하고 메타 기반으로 분기한다(1안). 별도 `CRYPTO_DCA` 타입이나 코인 전용 서브시스템은 폼·스케줄러·화면이 중복되므로 채택하지 않는다.

## ① 데이터 모델·API 계약 (kista-api)

### 메타 `/api/meta`

- `brokers[]`(EnumMeta)에 `market: 'US_STOCK' | 'CRYPTO_KRW'`, `currency: 'USD' | 'KRW'`를 추가한다. `UPBIT` 항목을 추가한다.
- runtime-config `brokers.UPBIT.enabled`로 노출을 제어한다(기존 패턴).
- `tickers[]`(TickerMeta)에 `market`을 추가한다. `BTC`, `ETH`를 추가한다(`targetProfitRate` 0, DCA 전용).
- `FEAR_GREED` 코드는 유지한다. 서버가 계좌 market으로 소스를 고른다(US_STOCK: CNN, CRYPTO_KRW: alternative.me).

### 계좌

- `AccountRequest`: UPBIT는 `appKey`(Access Key)와 `secretKey`만 받는다. `accountNo` 없음. 등록 시 업비트 `/v1/accounts`로 키를 검증한다.
- `AccountResponse`에 `currency`를 추가한다(broker에서 파생되지만 화면마다 meta를 조인하지 않도록 직접 준다).
- 연결 테스트 엔드포인트가 UPBIT를 지원한다. 업비트 에러 코드를 응답에 실어 UI가 구분할 수 있게 한다.
- runtime-config `brokers.UPBIT.allowedIp`: 업비트 허용 IP 안내용 서버 공인 IP.

### DCA 설정

- `orderType`에 `MARKET`을 추가한다. 코인 계좌는 `MARKET`만, 주식 계좌는 `MOO|MOC`만 허용한다(서버 검증).
- `executionHour: 0~23`(KST)을 신설한다. 코인은 필수, 주식은 무시한다.
- `amountUsd`를 `amount`(계좌 통화 단위)로 바꾼다. 배포 순서 때문에 api가 한 사이클 동안 두 필드를 모두 받고 모두 응답한다. UI 전환 뒤 `amountUsd`를 제거한다.
- 코인 `amount`는 원 단위 정수, 최소 5,000.

### 수량

- 보유·주문·체결 응답의 `quantity`를 정수에서 소수(BigDecimal, 최대 8자리)로 바꾼다. 주식은 계속 정수 값이다. TS 타입은 `number` 그대로다.

### 스케줄러

- 코인 DCA는 매시 정각 트리거에서 `executionHour == 현재 KST 시`인 전략을 실행한다.

### 통계

- 1차 변경 없음(통계 `currency` 파라미터 제외). DCA 통계 집계가 생길 때 통화별 집계를 함께 설계한다.

### DCA 실행 이력

- skip·실패 사유 코드에 최소 금액 미달, 업비트 API 오류를 추가한다.

## ② 계좌 연결 UI (`features/account/create-account`)

- **BrokerStep**: `BROKER_UI`에 `UPBIT`(설명 "Access Key / Secret Key 방식", 아이콘 `Bitcoin`)를 추가한다. 목록·순서는 meta + runtime-config `enabled`.
- **흐름**: UPBIT = Broker → Api → AccountInfo → Confirm. AccountInfoStep은 MOCK처럼 별칭만 받는다. 기존 `isMock` 분기를 "계좌번호가 필요 없는 broker" 판정으로 일반화한다(`ACCOUNT_CONFIG[broker]`가 없으면 별칭만).
- **ApiStep**: `UPBIT` config(라벨 Access Key/Secret Key, 업비트 Open API 발급 링크)를 추가한다. KIS처럼 연결 테스트를 통과해야 다음으로 넘어간다. 테스트가 키와 허용 IP를 함께 검증한다.
- **IP 안내 박스**: `brokers.UPBIT.allowedIp`를 표시하고 복사 버튼을 둔다. 필요한 권한(자산 조회, 주문 조회, 주문하기)도 함께 적고, 출금 권한은 체크하지 말라고 강조한다(키가 유출돼도 출금은 막힌다). 현재 값은 `168.107.63.152`(OCI Reserved IP, IPv4 하나).
- `data.broker === 'TOSS' ? 'TOSS' : 'KIS'` 같은 이분법 하드코딩을 `Exclude<BrokerCode, 'MOCK'>` 기반 config 조회로 정리한다. ConfirmStep, EditAccountForm의 `broker === 'TOSS'` 분기도 점검한다. UPBIT는 계좌번호를 표시하지 않는다.

## ③ DCA 폼 (`features/strategy/create-strategy`)

폼은 계좌 broker에서 `market`과 `currency`를 알고 시작한다.

- **티커**: `loadStrategyFormContext`에서 계좌 market과 일치하는 티커만 남긴다. 코인 계좌에서는 `StrategyTypeSection`이 DCA 외 타입을 보여주지 않는다(api capability가 SSOT).
- **DcaSettingsSection**
  - 금액: `amountUsd`를 `amount`로 바꾼다. 단위 라벨·placeholder는 currency("USD"/"원")를 따른다.
  - 주문유형: 코인은 선택 카드를 숨기고 `MARKET`으로 고정한다. 주식은 기존 MOO/MOC.
  - 실행 시각: 코인일 때만 `executionHour` Select(00시~23시, 기본 09시)를 보여준다.
  - 주기는 그대로. 코인 WEEKLY는 토·일 포함.
- **DcaConditionsSection**: 지표 4종 유지. `FEAR_GREED` 설명에 market별 출처(CNN / Crypto Fear & Greed)를 표시한다. 코인 SMA/RSI 설명에 "업비트 일봉(09:00 KST 마감) 기준"을 적는다.
- **dcaFormSchema / buildDcaPayload**: `market`을 받아 분기한다. 스키마는 `superRefine`으로 market별 규칙을 건다(코인: `MARKET`, `executionHour` 필수, 원 단위 정수, 최소 5,000 / 주식: `MOO|MOC`).
- 수정 화면: 기존 잠금 정책을 유지하고 `executionHour`는 수정할 수 있다.

## ④ 표시·통계

### 포맷 (`shared/lib/format`)

- `fmtMoney(n, currency)`, `fmtSignedMoney(n, currency)`를 추가한다. USD는 `fmtUsd`/`fmtSignedUsd`, KRW는 `fmtKrw`/`fmtSignedKrw`에 위임한다.
- `fmtQuantity(n)`: 정수면 그대로, 소수면 최대 8자리에서 끝의 0을 지운다.
- 계좌·전략에 귀속된 금액만 `fmtMoney(…, currency)`로 바꾼다(account-card, account-detail, strategy-card, strategy-detail, cycle-history, create-strategy sections, admin-trade-list 류). 시장 지수, 휴장 캘린더, 벤치마크처럼 본래 USD인 곳은 그대로 둔다.
- 수량 표시는 `fmtQuantity`로 바꾼다.

### 통계 (`/stats`)

- 1차는 변경하지 않는다. 통화 토글도 만들지 않는다(KRW 통계가 항상 비어 있어 의미가 없다). DCA 통계 집계가 api에 생기면 `StrategyTypeFilterToggle` 패턴으로 통화 토글을 추가한다.
- KPI, 자산 곡선, 전략 비교의 금액 포맷은 선택 통화를 따른다.

### 대시보드

- 계좌 요약이 USD로 합산되는 지점이 있으면 통화별로 나눠 표시한다(합산 금지). 실제 합산 지점은 구현 계획 단계에서 확인한다.

### 1차 제외

- 벤치마크·백테스트 목록에서 코인 계좌·티커를 숨긴다. 관리자 화면은 금액·수량 포맷만 맞춘다.

## ⑤ 에러 처리·테스트

### 에러 처리

- 연결 테스트 에러 코드 매핑: `no_authorization_ip` → IP 미등록, `invalid_access_key`·`jwt_verification` → 키 오류, `out_of_scope` → 권한 부족, 그 외 → 일반 실패.
- DCA 실행 실패는 기존 실행 이력·알림 경로를 쓴다. UI는 새 사유 코드 라벨만 추가한다.
- 키 만료나 IP 변경으로 인한 주문 실패는 기존 계좌 오류 표시 패턴을 쓴다.

### 업비트 키 만료

업비트 Open API 키는 유효기간이 있다(1년으로 알려져 있으나 api 작업 시 확인한다). 만료되면 주문이 실패하므로 미리 알린다.

- api: 계좌 등록·연결 테스트 시 업비트 API 키 조회(`GET /v1/api_keys`의 `expire_at`)로 만료일을 저장한다. `AccountResponse`에 `apiKeyExpiresAt`(nullable)을 추가한다. 만료 30일·7일 전, 만료 당일에 알림을 보낸다.
- 만료된 키로 주문이 실패하면 skip 사유를 키 만료로 기록하고 알림을 보낸다.
- UI: 계좌 카드·계좌 상세에 만료 30일 이내면 "API 키 만료 임박", 만료됐으면 "API 키 재등록 필요"를 표시한다. 재등록은 EditAccountForm에 키 수정 입력을 새로 추가한다(현재 계좌 PUT은 별칭만 수정하므로 api에 키 수정 경로를 신설한다). UPBIT 키 수정에도 연결 테스트 게이트를 적용한다.
- 서버 IP가 바뀌면 모든 업비트 사용자가 키를 다시 등록해야 한다. IP는 Reserved IP라 고정이며, UI는 runtime-config `allowedIp`만 읽으므로 화면 코드 변경은 없다.

### 테스트 (UI)

- `dcaFormSchema`: market별 superRefine 규칙
- `buildDcaPayload`: `amount`, `executionHour` 포함
- `fmtMoney`, `fmtQuantity` 단위 테스트
- Stepper: UPBIT 흐름(계좌번호 없음, 연결 테스트 게이트, IP 안내)
- 최종 확인: 로컬 kista-api(업비트 반영 후) + dev 서버 + Playwright 스크린샷. 실주문은 실계좌가 필요해 미검증으로 남긴다.

## 작업 분담과 순서

1. **kista-api**: ① 전체(메타, 계좌·연결 테스트, DCA 계약, 소수 수량, 코인 스케줄러, 업비트 어댑터, Crypto F&G 수집, 계좌 키 수정 경로, 키 만료 추적).
2. **kista-infra**: alternative.me·업비트 API egress 확인, 서버 공인 IP 확인과 runtime-config `allowedIp` 값 설정.
3. **kista-ui**: api 계약 머지 → `npm run gen:types` → ②③④ 구현. UI가 `amount`로 전환한 뒤 api에 `amountUsd` 제거를 요청한다.
