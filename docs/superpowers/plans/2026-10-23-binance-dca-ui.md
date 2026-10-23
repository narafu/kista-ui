# 바이낸스 현물 DCA UI 구현 계획

> 상태: 계획 (2026-10-23). **착수 조건: 바이낸스-api 세션의 "계획 2 배포" 알림.** 그 전에는 gen:types·코드 수정을 하지 않는다.
>
> 계약 출처(kista-api main 79da7f1d, push됨):
> - `kista-api/docs/superpowers/plans/2026-10-23-binance-dca-phase2-binance.md` — "kista-ui 세션 인계" 절
> - `kista-api/docs/superpowers/specs/2026-10-23-binance-spot-dca-design.md` — 10절
>
> 선행 UI 작업(DCA 다중 규칙 UI `cd5bf396`~`a0cea00f`, 메리츠 UI `50b0908a`·`8e9efa42`)은 main에 커밋돼 있다. 2026-10-23 기준 메리츠-ui 세션은 idle이다. 착수 시 `ListAgents`로 겹치는 파일(`api-schema.ts`·`dcaFormSchema.ts`·`DcaSettingsSection.tsx`)을 편집 중인 세션이 없는지 다시 확인한다.

## 목표

- 바이낸스(USDT 마켓) 계좌를 등록하고 BTC·ETH DCA를 USDT로 등록·조회할 수 있게 한다.
- 크립토 = 업비트 = KRW 전제(`'CRYPTO_KRW'` 리터럴, `'KRW'` 하드코딩, 티커 시장으로 통화 판정)를 **계좌 broker → 시장·통화** 기준으로 일반화한다. 사용자 방침: 크립토는 바이낸스가 중심이고 업비트는 옵션이다.
- 업비트 화면 동작은 바뀌지 않는다. 바뀌는 것은 TradeToast의 업비트 KRW `$` 표기 결함뿐이다(이번에 고친다).

## 계약 요약 (gen:types 뒤 실제 스키마와 대조할 가정)

| # | 가정 | 확인 방법 |
|---|---|---|
| A1 | `BrokerCode`에 `BINANCE`가 추가된다 | gen:types 후 `BROKER_MARKET` `Record<BrokerCode,…>`에서 typecheck가 깨진다(의도된 신호) |
| A2 | `GET /api/meta` `brokers[]` = `{code,label,description,market,currency,minOrderAmount:string,amountScale:number}`. BINANCE는 `market:"CRYPTO_USDT"`, `currency:"USDT"`, `minOrderAmount:"5"`, `amountScale:2`. UPBIT은 `"5000"`/0, US_STOCK broker는 `"0"`/2 | 로컬 api `curl /api/meta`. 2026-10-23 바이낸스-api 사전 확인(계획 2 기준, MetaControllerTest 단언) |
| A3 | `tickers[].markets: string[]`. BTC·ETH = `["CRYPTO_KRW","CRYPTO_USDT"]`. 단수 `market`은 다음 릴리스에 제거된다 | 동일 |
| A4 | `crypto-portfolio`에 `currency`("KRW"\|"USDT"), `cash`, `totalAsset`, `holdings[].evalAmount`가 생긴다. `krwCash`·`totalAssetKrw`·`evalAmountKrw`는 deprecated(같은 값). `holdings[].avgBuyPrice`는 nullable | api-types 스키마 |
| A5 | `AdminTradeResponse.currency`(nullable) | api-types |
| A6 | SSE `TradeEventMessage.currency`("USD"\|"KRW"\|"USDT"\|null). null은 USD로 해석한다 | 2026-10-23 사전 확인: record 마지막 컴포넌트 `currency`, 키 개명 어노테이션 없음 — 구 메시지·INFO/FAIL은 null |
| A7 | `ErrorCode`에 `BROKER_WITHDRAWAL_ENABLED`가 생긴다 | api-types |
| A8 | 런타임 설정 `brokers.BINANCE = {enabled:false, allowedIp:"168.107.63.152"}` | `/api/admin/settings` 응답 |
| A9 | BINANCE 계좌 등록: `appKey`=API Key, `secretKey`=Secret Key, `accountNo` 없음. 응답 `accountNo`·`accountNoMasked`·`apiKeyExpiresAt`은 null | api-types·로컬 등록은 실키 필요(미검증 대상) |
| A10 | DCA 규칙 `sizing.amount`는 USDT 소수 2자리까지 서버가 받는다. `executionHour`는 크립토 시장 전체에 적용된다 | 2026-10-23 사전 확인: CRYPTO_USDT 소수 2자리·최소 5 USDT(`DcaRule.requireCompatible`). 거부 문구 "코인 DCA 금액은 소수 2자리까지 입력할 수 있습니다"·"코인 DCA 금액은 5.00 USDT 이상이어야 합니다". 코인 시장은 MARKET 필수, MARKET이면 executionHour(KST 0~23) 필수 |

가정이 하나라도 틀리면 해당 태스크를 실제 계약에 맞춰 고치고, 계약 쪽 결함이면 바이낸스-api 세션에 알린다.

## 설계 결정

1. **시장·통화의 출처는 계좌 broker다.** BTC는 두 시장에 걸쳐 있어서 티커로는 통화를 정할 수 없다. 티커 시장으로 크립토·통화를 판정하는 곳은 전부 계좌 broker 기준으로 바꾼다.
2. **정적 맵은 market·currency만 갖는다.** Server Component(계좌 상세 prefetch)도 판정해야 하므로 `BROKER_MARKET`과 `MARKET_CURRENCY`는 정적 맵으로 둔다. `minOrderAmount`·`amountScale`은 Client 폼에서 `meta.brokers`로 읽는다. 이렇게 하면 하드코딩된 `MIN_CRYPTO_ORDER_KRW`를 없앨 수 있다.
3. **zod 규칙에는 주문 금액 제약을 복사해 넣는다.** 지금도 부모 폼이 `market`을 각 규칙에 복사하는데, 같은 방식으로 `orderAmount: { min: number; scale: number; currency: Currency }`를 규칙 값에 넣는다. `buildDcaPayload.toRule`이 필드를 명시적으로 고르므로 payload로 새 나가지 않는다(테스트로 고정한다). 스키마 팩토리는 쓰지 않는다. `useForm` resolver를 다시 만들지 않아도 되고, 기존 패턴과도 같다.
4. **메타 캐시 폴백.** 메타는 1h 캐시라 새 필드가 빠진 응답이 올 수 있다. 그래서 `minOrderAmount`·`amountScale`·`markets`는 optional로 둔다.
   - 메타에 값이 없으면 크립토 폼은 통화별 폴백(KRW 5000·USDT 5, scale은 `CURRENCY_SCALE`)을 쓴다. 서버 400이 최종 방어선이다(구현 시 리뷰 반영으로 하한 0 대신 업비트 기존 동작을 보존하도록 바꿨다).
   - `markets`가 없으면 단수 `market`으로 폴백한다.
5. **USDT 표기는 `10.50 USDT`로 한다.** 소수 2자리이고 단위는 뒤에 붙인다. `fmtMoney(n, 'USDT')` 하나로 처리한다. 이 표기는 기본값으로 정했고 사용자 확인이 필요하다. 바꾸게 되면 `fmtMoney` 한 곳만 고치면 된다.
6. **`Math.round` 대신 통화 scale로 반올림한다.** `DcaStrategyDetail`의 평가금액 반올림(`5c834cd5`)은 원 미만 표시를 막으려고 의도적으로 넣은 것이다. 그래서 지우지 않고 `roundMoney(n, currency)`로 바꾼다. KRW는 0자리, USD·USDT는 2자리다.
7. **범위 밖 `$` 사이트.** `StrategyOrderHistory`·`OrderRows`·`CycleHistoryTable`·`StrategyTradesTab`은 `StrategyDetail`(사이클 전략)과 `TradesTab`(주식 계좌)에서만 렌더된다. 크립토 계좌는 `AccountDetailTabs`에서 `CryptoHoldingsCard`로 갈라지고, DCA는 `DcaStrategyDetail`로 갈라지므로 이 화면들은 바꾸지 않는다. VR·privacy·backtest·benchmark·stats KPI도 주식 전용이라 제외한다.

## 태스크

Task 1은 직렬로 진행하는 기반 작업이다. Task 2~4는 서로 파일이 겹치지 않아 병렬로 맡길 수 있다. 위임할 때는 "커밋하지 말 것"을 명시한다. Task 5는 마지막에 한 번만 한다.

### Task 0 — 계약 반영 (직렬)

1. 배포 알림을 받으면 `npm run fetch:spec && npm run gen:types`를 실행한다.
2. 위 가정표의 A1~A10을 `shared/lib/api-types.ts`와 로컬 api 응답으로 대조한다.
3. `/dto-sync-check account`, `/dto-sync-check trade`, `/dto-sync-check meta`를 실행한다.
4. typecheck가 깨지는 지점을 목록으로 만든다. 예상 지점은 `BROKER_MARKET`, `BROKER_CREDENTIAL`, `ApiStep.BROKER_CONFIG`, `RuntimeBrokerCode` 소비처다.

### Task 1 — 어휘·포맷·메타 기반 (직렬, Task 2~4의 전제)

파일: `shared/lib/api-schema.ts`, `shared/lib/format/index.ts`, `entities/meta/model/types.ts`, meta normalizer와 provider(`useMeta`), 각 테스트.

- `TradingMarket = 'US_STOCK' | 'CRYPTO_KRW' | 'CRYPTO_USDT'`, `Currency = 'USD' | 'KRW' | 'USDT'`로 넓힌다.
- `BROKER_MARKET.BINANCE = 'CRYPTO_USDT'`, `MARKET_CURRENCY.CRYPTO_USDT = 'USDT'`, `BROKER_LABEL.BINANCE = '바이낸스'`를 추가한다.
- 크립토 판정을 `CRYPTO_MARKETS = new Set<TradingMarket>(['CRYPTO_KRW', 'CRYPTO_USDT'])` 하나로 모은다.
  - `isCryptoMarket`과 `isCryptoBroker`가 이 집합을 쓴다. `isKeyOnlyBroker`는 따라서 자동으로 바뀐다.
  - 계좌 시장을 돌려주는 `brokerMarket`을 export한다. 지금은 private이다.
- `fmtMoney`: USDT일 때 `${fmtUsd(n)} USDT`를 쓴다. `fmtSignedMoney(n, currency)`를 추가한다. `CycleRows`의 KRW/USD 이분기를 이것으로 바꾼다.
- `roundMoney(n, currency)`와 `CURRENCY_SCALE = { KRW: 0, USD: 2, USDT: 2 }`를 추가한다.
- `MetaBundle.brokers`를 `EnumMeta[]`에서 `BrokerMeta[]`로 바꾼다. 필드는 `market?`, `currency?`, `minOrderAmount?: string`, `amountScale?: number`다. normalizer는 `minOrderAmount`를 number로 바꾼다.
- `TickerMeta.markets?: string[]`를 추가한다. `useMeta`에 `findBroker(code)`와 `tickerTradesIn(code, market)`을 추가한다. `tickerTradesIn`은 `markets`가 있으면 `markets.includes(market)`로 판정하고, 없으면 단수 `market`이 같은지로 판정한다.
- `entities/strategy/model/dcaFormat.ts:72`: `formatDcaSizing(sizing, market)`·`formatDcaRuleSummary(rule, labelOf, market)`로 바꾼다. 통화는 `MARKET_CURRENCY[market]`, 크립토 여부는 `isCryptoMarket(market)`으로 판정한다. 호출부가 Task 2(`DcaRuleList`)와 Task 3(상세·카드)에 걸쳐 있어서 시그니처 변경과 호출부 수정을 이 태스크에서 함께 끝낸다.
- 테스트: `api-schema.test`(BINANCE 크립토·key-only·USDT), format 테스트(`fmtMoney` USDT, `roundMoney`), meta normalizer 테스트(필드 누락 폴백).

### Task 2 — DCA 폼 (`features/strategy/create-strategy`)

- **근본 지점은 `StrategyForm.tsx:98`이다.** 지금은 `form.isCrypto ? 'CRYPTO_KRW' : 'US_STOCK'`이다. 이것을 계좌 broker의 `brokerMarket(account.broker)`로 바꾼다. `useStrategyForm`은 `isCrypto: boolean`과 함께 `market: TradingMarket`도 노출한다. 계좌는 이미 `isCrypto`를 계산하는 경로에서 얻는다.
- 티커 필터(`useStrategyForm.ts:167`, `useStrategyFormData.ts:21,36`)는 티커 시장이 크립토인지가 아니라 `tickerTradesIn(code, market)`으로 판정한다. 주식 목록은 `market === 'US_STOCK'`인 경우다.
- `dcaFormSchema.ts`:
  - `z.enum`에 `CRYPTO_USDT`를 추가한다(39·97행).
  - `isCrypto`는 `isCryptoMarket(v.market)`으로 판정한다.
  - 규칙에 `orderAmount: { min, scale, currency }`를 추가한다(설계 결정 3).
  - 크립토 금액 검사: 소수 자릿수가 `scale`을 넘으면 오류를 낸다. 메시지는 scale 0이면 "원 단위 정수로 입력하세요.", 그 외에는 "소수 {scale}째 자리까지 입력하세요."다. `min`이 0보다 크고 금액이 그보다 작으면 "최소 주문 금액은 {fmtMoney(min, currency)}입니다."를 낸다.
  - `MIN_CRYPTO_ORDER_KRW`는 삭제한다. `DEFAULT_EXECUTION_HOUR` 주석은 "거래소 일봉 마감(09:00 KST) 직후"로 바꾼다. 바이낸스 1d kline 경계도 KST 09:00으로 같다.
  - `buildDcaRuleDefaults(direction, market, orderAmount)`와 `ruleToFormValue`에도 같은 값을 넘긴다.
- 리터럴 사이트를 `isCryptoMarket(market)`으로 바꾼다: `DcaStrategyForm.tsx:70`, `DcaRuleList.tsx:36`, `DcaConditionsSection.tsx:50`, `DcaSettingsSection.tsx:35,140`, `DcaRuleEditor.tsx:49`, `buildDcaPayload.ts:23`.
- 금액 입력의 라벨·단위·`step`은 `currency`와 `scale`을 따른다. 기존 KRW 입력 컴포넌트를 그대로 쓰되 USDT는 소수 2자리 입력을 허용한다. 실제 입력 컴포넌트를 착수할 때 확인한다.
- `DcaConditionsSection.tsx:65` 문구를 "이동평균·RSI는 거래소 일봉(09:00 KST 마감) 기준"으로 바꾼다.
- 테스트: 스키마 USDT 케이스(10.5 통과, 10.555 거부, 4.99 거부, min 누락 폴백), `buildDcaPayload`에 `orderAmount`가 포함되지 않음, 업비트 케이스 회귀(4999 거부·정수 강제).

### Task 3 — 표시 위젯 (통화를 계좌 기준으로)

계좌 broker를 얻는 방법: `DcaStrategyDetail`과 `DcaStrategyCard`는 `accountId`를 이미 받으므로 `useAccountsQuery()`에서 찾는다(캐시 공유). `DcaExecutionHistory`에는 `currency` prop을 추가해 부모 `DcaStrategyDetail`이 넘기도록 한다. 상세 화면이 계좌 정보를 prop으로 이미 받고 있으면 그것을 우선 쓴다. 착수할 때 `StrategyDetailContent`의 props를 확인한다.

- `DcaStrategyDetail.tsx:39,52,78`:
  - `currency = brokerCurrency(broker)`, `isCrypto = isCryptoBroker(broker)`로 바꾼다.
  - `Math.round`는 `roundMoney(…, currency)`로 바꾼다.
  - 보유 수량 단위는 지금처럼 `ticker`로 둔다.
- `DcaExecutionHistory.tsx:24-25`: prop으로 받은 `currency`를 쓴다.
- `DcaStrategyCard.tsx:24`: `isCryptoBroker(account.broker)`로 바꾼다. 계좌를 찾지 못하면 기존 티커 판정으로 폴백한다.
- 포트폴리오 normalizer(`entities/trade/api/index.ts:77-99`, `model/types.ts:80-86`):
  - 신규 필드 `currency`·`cash`·`totalAsset`·`evalAmount`를 쓰고, 신규 필드가 없으면 deprecated 필드로 폴백한다.
  - `avgBuyPrice`는 `number | null`로 바꾼다. `toNum(null)`이 0이 되지 않게 기존 `num` 헬퍼를 쓴다.
  - deprecated 필드는 타입에서 제거한다. UI 내부 이름도 중립 이름으로 바꾼다.
- `AccountSummaryCard.tsx:54-59`: 라벨 "원화 예수금"을 "예수금"으로 바꾸고 `fmtMoney(cash, currency)`로 표시한다. `KRW_VALUE_CLASS` 이름이 통화 중립이 되도록 확인한다.
- `CryptoHoldingsCard.tsx:49-51`: `fmtMoney(evalAmount, currency)`로 표시한다. 평단(`avgBuyPrice`)이 null이면 `-`로 표시한다.
- `AdminTradesTable.tsx:57`: `fmtMoney(trade.price, trade.currency ?? 'USD')`로 바꾼다. `filledPrice` 열이 있으면 같은 방식으로 바꾼다.
- `CycleRows.tsx:24-27`: `fmtSignedMoney(pnl, brokerCurrency(broker))`로 바꾼다.
- `TradeToast.tsx:33`: `` ` @ ${fmtMoney(event.price, event.currency ?? 'USD')}` ``로 바꾼다. SSE 타입은 `entities/trade`에서 확인한다.
- 테스트: 각 위젯의 기존 테스트에 BINANCE(USDT) 케이스 하나와 업비트 회귀 케이스를 추가한다. TradeToast KRW 케이스는 기존 결함을 고친 것을 증명한다.

### Task 4 — 계좌 등록·관리자 (`features/account`, `entities/account`, `entities/runtime-config`)

- `BrokerStep.tsx:16-20`: `BINANCE: { description: 'API Key / Secret Key 방식', Icon: Bitcoin }`를 추가한다. 아이콘은 업비트와 같은 Bitcoin을 쓴다. 바이낸스 로고는 브랜드 자산이라 쓰지 않는다.
- `ApiStep.tsx` `BROKER_CONFIG.BINANCE`:
  - 제목은 "바이낸스 API 키 입력"이다.
  - 라벨은 API Key와 Secret Key다.
  - 링크는 `https://www.binance.com/en/my/settings/api-management`, 링크 문구는 "바이낸스 API 키 발급"이다.
  - `needsTest`는 true다.
  - 149행 옆에 `{broker === 'BINANCE' && <BinanceKeyGuide allowedIp={runtimeConfig?.brokers.BINANCE?.allowedIp} … />}`를 둔다.
- `ApiStepParts.tsx`의 `BinanceKeyGuide`는 `UpbitKeyGuide`의 구조를 재사용한다. 공통 부분을 props로 뽑을 수 있으면 하나로 합친다. 안내할 내용은 다음과 같다.
  - 키 유형은 "시스템 생성(HMAC)"만 쓸 수 있다. Ed25519·RSA 자가 생성 키는 쓸 수 없다.
  - 필요한 권한은 "읽기 활성화"와 "현물 및 마진 거래 활성화(Enable Spot & Margin Trading)"다.
  - 출금 권한은 반드시 끈다.
  - IP 제한이 필수이고, 허용 IP를 표시한다.
- `brokerCredentials.ts`:
  - `BROKER_CREDENTIAL.BINANCE = { keyLabel: 'API Key', secretLabel: 'Secret Key', invalidMessage: 'API Key와 Secret Key를 다시 확인하세요. 키가 맞다면 바이낸스 API 설정의 허용 IP 목록에 안내된 IP가 있는지 확인하세요.' }`를 추가한다. 바이낸스는 키 오류와 IP 누락을 구분하지 않아 둘 다 안내한다.
  - `BROKER_ERROR_MESSAGE.BROKER_WITHDRAWAL_ENABLED = '출금 권한이 켜진 키는 사용할 수 없습니다. 출금 권한을 끈 키를 사용하세요.'`를 추가한다.
  - `BROKER_PERMISSION_DENIED`는 broker 공용 문구를 유지한다. 바이낸스에 필요한 권한은 Guide가 안내한다. 이는 현재 업비트 방식과 같다.
- `AccountInfoStep.tsx:59` 주석에 BINANCE를 추가한다. 동작은 `isKeyOnlyBroker`가 따라온다.
- `entities/runtime-config/model/types.ts:29`의 주석을 "거래소 허용 IP 안내용"으로 바꾼다.
- `AdminSettingsForm`은 `Object.keys(draft.brokers)`로 broker 목록을 제네릭하게 렌더하므로 코드를 바꾸지 않는다. 라벨은 `labelOf('brokers', 'BINANCE')`이고 메타에서 온다.
- 계좌 카드·상세·수정 화면은 `accountNoMasked`·`apiKeyExpiresAt` null을 이미 처리하므로 확인만 한다.
- 테스트: `brokerCredentials.test`(신규 코드), `ApiStep.test`(BINANCE 가이드와 허용 IP), `BrokerStep.test`(카드).
- 카피는 constraints.md 카피 규칙을 따른다. 트리거·제목·토스트의 동사가 같은지 확인한다.

### Task 5 — 마무리 (1회)

1. `npm run typecheck`, `npm run lint`, `npm run knip`, `npm run test:run`을 실행한다. 전체 스위트는 이 시점에 한 번만 돌린다.
2. `grep -rn "'CRYPTO_KRW'\|'KRW'" app widgets features entities shared`로 남은 리터럴을 확인한다. 정적 맵과 housing benchmark(무관)만 남아야 한다.
3. 시각 확인을 한다.
   - 로컬 api가 떠 있으면 dev-token으로 로그인해 확인하고, 없으면 visual-diff GET 프록시의 합성 fixture로 확인한다.
   - 확인할 화면: 계좌 등록 BINANCE 스텝, DCA 등록 폼(USDT 금액·최소 금액 오류), DCA 상세·카드(USDT), 계좌 상세(크립토 예수금·보유), 업비트 화면 회귀.
   - Playwright 스크린샷을 남긴다.
4. 화면 흐름과 문구가 바뀌었으므로 로컬에서 `npm run test:e2e`를 한 번 돌린다.
5. `README.md` 드리프트를 확인한다(지원 거래소 목록이 있다면).
6. `/code-review medium /Users/phs/workspace/kista/kista-ui`를 실행한다. 크립토 금액 경로가 포함되므로 결과를 보고 high가 필요한지 판단한다. 실제 결함은 고친 뒤 재검증한다.
7. 커밋한다(author `narafu`, 한글 메시지). push는 요청이 있을 때만 한다.
8. 바이낸스-api 세션에 UI 전환 완료를 알린다. 그러면 deprecated `krw*`·`TickerMeta.market` 제거(contract)가 가능해진다.

## 미검증으로 남길 것 (이유)

- 실제 바이낸스 키로 하는 연결 테스트·등록과 422 코드별 문구 노출: 실키 발급과 권한 토글은 사용자가 해야 하는 작업이다. 그래서 단위 테스트(mock 422)로 대체한다.
- 실주문 금액 반영(10.50 USDT): 실계좌 주문이 필요하다.

## 범위 밖 제안

- USD·USDT 이외 통화 대응, 원화 환산 합산 포트폴리오: 설계 비목표다.
- 업비트를 제거할 때는 `BROKER_MARKET.UPBIT`, `UpbitKeyGuide`, `BROKER_CREDENTIAL.UPBIT`, `BrokerStep` 카드를 함께 정리한다.
