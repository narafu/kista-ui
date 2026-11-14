# 12. 코인 제거 — 업비트·바이낸스와 코인 화면을 전부 걷는다

2026-11-14 작성. 서버 쪽 원본은 `../kista-api/docs/superpowers/fable-review/guides/15-crypto-removal.md`, 레포 간 항목은 `cross-repo.md` G1~G3·G9다. 측정은 `findings/t-guide-premises-07-11.md` 6절(코인·KIS 지형)이다. 공통 규칙은 `00-roadmap.md` 4절.

## 결정

사용자가 2026-11-13 밤~14에 크립토 전체 삭제를 정했다(api 15 C1~C5 확정, ETH DCA 전략은 2026-11-14 종료). ui 지침서 01~11은 그 전에 써서 코인 삭제 태스크가 없고, 오히려 코인 코드를 전제로 한 지시가 여럿 있었다(`00-roadmap.md` 3절). 이 지침서가 그것들을 대신한다.

- 10의 D4·태스크 3(크립토 지표를 크립토 계좌가 있을 때만)은 없앤다. 위젯째 지운다.
- memory "완료 작업 재작업 금지"의 바이낸스·업비트 DCA 가드는 "다시 만들지 않는다"로 뜻이 바뀐다(T5).
- KIS는 이 지침서의 범위가 아니다. 05 태스크 9가 api 04 단계 A와 같은 날 지운다. 다만 코인과 KIS가 같은 파일에 있으면(계좌 등록 단계, `brokerCredentials.ts`) 코인 줄만 지우고 KIS 줄은 둔다.

## 현재 지형

`git grep -n -i -l -E "crypto|upbit|binance" -- '*.ts' '*.tsx' ':!shared/lib/api-types.ts'`가 97파일이다(절반이 테스트). 코인 전용 파일은 약 1,340줄이다(`widgets/crypto-market-indicators/**`, `widgets/account-detail/CryptoHoldingsCard*`, `app/api/crypto-market-indicators/route.ts`). 나머지는 주식과 같이 쓰는 파일 안의 코인 분기다.

| 영역 | 걷을 것 | 위치 |
|---|---|---|
| 대시보드 코인 지표 | 위젯·프록시·쿼리 전부 | `widgets/crypto-market-indicators/**`(`IndicatorLineChart.tsx`·`niceTicks.ts` 포함), `app/api/crypto-market-indicators/route.ts`, `entities/market/{api,hooks,model}`의 코인 지표 함수·키·타입, `app/(main)/dashboard/page.tsx`의 `bottomPanels={<CryptoMarketSection />}` |
| 공포탐욕 | 응답의 `crypto` 필드 소비 | `widgets/fear-greed-card/FearGreedSection.tsx`(CNN만 남긴다), `dcaIndicatorLabel`의 `isCrypto` 인자(`entities/strategy/model/dcaFormat.ts`) |
| 계좌 상세 | 코인 포트폴리오 카드와 분기 | `widgets/account-detail/{CryptoHoldingsCard,AccountDetailContent,AccountDetailTabs,AccountSummaryCard}.tsx`, `app/(main)/accounts/[id]/page.tsx`의 `isCryptoBroker` 프리페치 분기, `entities/trade/{api,model}`의 `getCryptoPortfolio`·`getCryptoPrices`·키·옵션·타입과 deprecated 폴백(`krwCash` 등) |
| 계좌 등록·수정 | 업비트·바이낸스 선택지, 허용 IP 안내, 코인 자격증명 문구 | `features/account/create-account/steps/{BrokerStep,AccountInfoStep,ApiStep,ApiStepParts,ConfirmStep}.tsx`, `entities/account/model/brokerCredentials.ts`(`BROKER_IP_NOT_ALLOWED` 문구 포함) |
| DCA 전략 폼·상세 | 코인 분기: BTC·ETH, 시장가, 실행 시각 `executionHour`, 최소 주문 금액, 코인 다음 실행 표기 | `features/strategy/create-strategy/{DcaStrategyForm.tsx,model/{buildDcaPayload,dcaFormSchema,useStrategyForm,useStrategyFormData}.ts,sections/Dca*.tsx}`, `entities/strategy/{api/index.ts,model/{dcaFormat,types}.ts}`, `widgets/strategy-detail/{DcaStrategyDetail,DcaExecutionHistory}.tsx`, `widgets/strategy-card/DcaStrategyCard.tsx` |
| 체결 알림·표 | 코인 통화 분기 | `entities/trade/providers/TradeToast.tsx`, `widgets/admin-trade-list/AdminTradesTable.tsx` |
| 관리자 설정 | `brokers[...].allowedIp`, DCA 종목 제안의 `BTC`·`ETH` | `entities/runtime-config/model/types.ts`, `features/admin/settings/**`(`AdminSettingsForm.tsx`의 `DCA_TICKER_SUGGESTIONS`) |
| 공용 | 시장·통화 판정과 USDT | `shared/lib/api-schema.ts`의 `isCryptoMarket`·`isCryptoBroker`·`MARKET_CURRENCY`의 코인 행·`USDT`, `shared/lib/format/index.ts`의 `fmtCompactMoneyNarrow` USDT 분기, `entities/meta/model/{types,marketRules}.ts`의 `market`·`minOrderAmount`·`amountScale` |
| 그 밖 | 주간 달력·벤치마크 문구의 코인 언급 | `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx`, `widgets/benchmark-comparison/housingBenchmarkContent.ts`, `entities/finance/lib/aggregate.ts`(문자열이 걸린 이유를 보고 판단) |
| 도구·테스트 | 코인 계좌 시드·가짜 응답·시나리오 | `scripts/visual-diff/{fixtures/api.mjs,fixtures/trading.mjs,scenarios.mjs,run.mjs,README.md}`, `scripts/shared/seed.mjs`, `tests/e2e/support/account-cache-lock.ts`, `e2e/ledger-budget.spec.ts`의 주석, `entities/meta/__fixtures__/testMeta.ts`, `features/strategy/create-strategy/__fixtures__/dcaTestMeta.ts` |
| 문서 | 코인 서술 | `docs/agents/*.md`·디렉토리 `CLAUDE.md`·`README.md`에 11줄(`git grep -n -i "crypto\|바이낸스\|업비트\|코인"`) |

## 목표

- 코인이라는 개념이 ui에 없다. 증권사는 주식 증권사뿐이고 통화는 KRW·USD 둘이다.
- "시장이 코인인가"를 묻는 함수(`isCryptoMarket`·`isCryptoBroker`)와 그 분기를 전부 지운다. 분기에서 주식 쪽 가지만 남긴다.
- 금액 자릿수는 통화 → 자릿수 표(`shared/lib/api-schema.ts`의 `CURRENCY_SCALE`) 하나에서 온다. 메타의 `amountScale`·`minOrderAmount`를 읽지 않는다(api 15 C4가 2차로 필드를 지운다). `marketRules.ts`가 그 둘만 다루면 파일째 지운다.
- DCA의 `executionHour`는 요청·표시에서 뺀다. 주식 DCA는 실행 시각이 없다(값이 `null`). 서버 타입에 필드가 남아 있는 동안은 요청에 싣지 않는 것으로 충분하다.
- `/api/meta`가 `BITO`·`EETH`를 더한다(G9). 종목은 메타에서 오므로 ui 변경이 없다. 종목을 하드코딩한 곳은 `AdminSettingsForm.tsx`의 `DCA_TICKER_SUGGESTIONS` 하나다. `BTC`·`ETH`를 빼고 `BITO`·`EETH`를 넣는다.

기각한 대안: 코인 분기를 "메타에 값이 없으면 안 보이는" 죽은 코드로 남기기. 서버가 값을 빼면 화면에는 안 보이지만 분기·타입·테스트 약 45파일이 남아 01·02·03이 그것을 계속 옮긴다.

## 예상 감량과 위험

- 제품 약 1,800~2,300줄(전용 파일 1,340줄 + 분기), 테스트 약 1,500줄 이상(코인 전용 케이스). 실측을 `PROGRESS.md`에 적는다.
- 위험 1: **운영에 코인 계좌가 남아 있는데 ui가 먼저 나가면** 그 계좌 상세가 주식 포트폴리오를 불러 400을 받는다. T0으로 막는다.
- 위험 2: 주식 DCA가 코인 분기와 같은 코드를 지난다(`buildDcaPayload`, `dcaFormSchema`). 분기를 걷다 주식 쪽 요청 바디가 달라질 수 있다. 선행 테스트로 막는다.
- 위험 3: `USDT`가 통화 union에서 빠지면 `Record<Currency, …>` 꼴의 표가 typecheck에서 걸린다. 이것은 찾는 수단이다. 캐스트로 넘기지 않는다.

## 동작 보존용 선행 테스트

1. 주식 DCA의 요청 바디 고정: `DcaStrategyForm`에서 주식 계좌로 규칙 1개를 채워 제출했을 때 나가는 `POST` 바디를 `mockApi`로 단언한다(이미 있으면 그것을 쓴다. `features/strategy/create-strategy/DcaStrategyForm.test.tsx`를 먼저 본다). 삭제 전 코드에서 통과를 확인한다.
2. 주식 계좌 상세·대시보드(비회원, 계좌 있음)의 기존 테스트가 삭제 뒤에도 통과한다. 코인 케이스는 지운다(주식 케이스로 바꾸지 않는다. 같은 것을 두 번 검증하게 된다).
3. 변이 확인 1회: 선행 테스트 1의 바디에서 필드 하나를 빼면 실패하는지.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 0 | 운영 확인(읽기 전용). 코인 계좌·진행 중인 코인 전략이 0건인지 본다. SQL은 api 15의 T3 확인 SQL을 그대로 쓴다(`ssh kista-server` 뒤 `psql -U kista -d kistadb`). 0건이 아니어도 T1~T5는 진행하고 커밋한다. **push 요청만 미룬다** | — | Haiku | 결과를 완료 보고와 `PROGRESS.md`에 적는다 |
| 1 | 선행 테스트 1 고정, 그 뒤 전용 화면 삭제: 코인 지표 위젯·프록시·쿼리, 공포탐욕의 `crypto`, 계좌 상세의 코인 카드·프리페치 분기·코인 포트폴리오 쿼리 | 위 표의 1~3행 | Sonnet | `ls widgets/crypto-market-indicators app/api/crypto-market-indicators` 없음. `npm run typecheck && npm run knip` |
| 2 | 계좌 등록·수정과 관리자 설정에서 코인 걷기 | 위 표의 4·7행 | Sonnet | 계좌 등록 스테퍼 테스트 통과(증권사 선택지에 코인 없음 단언 1건). KIS 줄은 그대로다 |
| 3 | DCA 폼·상세·카드의 코인 분기 걷기, `executionHour` 제거 | 위 표의 5·6행 | Opus(돈이 움직이는 폼) | 선행 테스트 1 통과, 변이 확인 1회 |
| 4 | 공용 정리: `isCrypto*`·USDT·`MARKET_CURRENCY` 코인 행·메타의 `market`·`minOrderAmount`·`amountScale` 참조 | 위 표의 8·9행 | Sonnet | 아래 전체 판정 |
| 5 | 도구·픽스처·문서·memory | 위 표의 10·11행, memory `project_done_do_not_redo.md`와 `MEMORY.md` | Haiku | `scripts/`의 경로 표·시나리오가 없는 화면을 가리키지 않는다. memory 항목이 "코인은 2026-11-14 삭제 결정, 다시 만들지 않는다"로 바뀐다 |

전체 완료 판정:

```bash
git grep -n -i -E "crypto|upbit|binance|usdt|executionHour|allowedIp|BROKER_IP_NOT_ALLOWED|minOrderAmount|amountScale" -- '*.ts' '*.tsx' '*.mjs' ':!shared/lib/api-types.ts'   # 0건
git grep -n -E "'(BTC|ETH)'" -- '*.ts' '*.tsx' '*.mjs' ':!shared/lib/api-types.ts'   # 0건
npm run typecheck && npm run lint && npm run knip && npm run test:run
```

생성물(`shared/lib/api-types.ts`, `openapi.json`)에는 서버가 지울 때까지 코인 이름이 남는다. 손으로 고치지 않는다. 화면 확인은 visual-diff로 대시보드·계좌 상세·전략 등록(DCA) 세 화면을 본다(로컬 api가 없으면 `00-roadmap.md` 4-5의 2).

T1~T4는 같은 파일을 여러 번 지나므로(`api-schema.ts`, `entities/meta`) 병렬로 나누지 않고 순서대로 한다. 커밋은 태스크마다 하나다. 중간 커밋이 typecheck를 통과해야 하므로 공용 심볼(T4)은 소비처(T1~T3)가 다 사라진 뒤에 지운다.

## 판단이 갈릴 때의 기본값

- 코인과 주식이 같이 쓰는 컴포넌트에 `isCrypto` prop이 있으면 prop을 지우고 주식 쪽 가지만 남긴다. `false`로 고정해 두지 않는다.
- 코인 때문에 생긴 일반화(시장 → 통화 표, 최소 주문 금액 규칙)는 주식에서 쓰는 값이 하나뿐이면 상수로 접는다. 둘 이상이면(KRW·USD 자릿수) 표를 남긴다.
- 코인 전용 테스트는 지운다. 주식·코인을 `it.each`로 묶은 테스트는 코인 행만 뺀다.
- 문구에 "주식·코인"처럼 나열된 곳은 코인만 뺀다. 문장을 새로 쓰지 않는다.
- `git grep`에 걸렸지만 코인이 아닌 것(`coin` 부분 문자열, 가계부 색 이름 등)은 그대로 두고 판정 명령에 제외 경로를 더해 이 절에 적는다.

## 중단 조건과 대체 경로

| 조건 | 처리 |
|---|---|
| T0에서 코인 계좌·전략이 남아 있다 | 커밋까지 하고 push를 요청하지 않는다. `questions.md`에 "사용자 결정 필요"(남은 계좌 수, 사용자가 지울지)로 적는다. api 15 단계 P는 사용자 작업이다 |
| `ssh kista-server`가 안 된다 | T0을 "미확인"으로 적고 T1~T5를 한다. push 전 확인 항목으로 완료 보고에 남긴다 |
| 주식 DCA가 `executionHour`나 시장가를 실제로 쓰는 경로가 나온다(선행 테스트 1의 바디에 값이 실린다) | 그 필드는 남기고 T3에서 코인 분기만 걷는다. 발견을 api 레포 `cross-repo.md` G절에 적는다(api 15의 중단 조건과 같은 사실이다) |
| 선행 테스트 1이 삭제 뒤 깨진다 | 되돌린다. 기대값을 고치지 않는다 |
| 서버가 이미 메타에서 코인 값을 뺐는데 ui가 아직이다 | 정상 순서가 아니지만 화면은 깨지지 않는다(선택지가 비어 안 보인다). 이 지침서를 그대로 진행한다 |

## 하지 말아야 할 것

- KIS 코드를 같이 지우지 않는다(05 태스크 9, api와 같은 날).
- `shared/lib/api-types.ts`를 손으로 고치지 않는다.
- 코인 분기를 지우는 김에 DCA 폼 구조를 고치지 않는다(04 태스크 6).
- 빗썸 등 다른 거래소 자리를 남겨 두지 않는다.

## 배포와 다른 지침서와의 의존

- **ui 먼저.** push는 사용자가 요청할 때, T0이 0건일 때만. 배포 뒤 api 레포 `cross-repo.md` G1~G3 행에 "ui 제거 완료(커밋 해시, 배포일)"를 적는다. api는 그것을 보고 15 T4를 진행한다. 메타 필드 참조 제거(G2의 2차)도 T4로 끝나므로 같은 줄에 적는다.
- 이 지침서 뒤에 달라지는 것: 01의 3b(`getCryptoPrices` 없음), 02의 2(프록시 13 → 12개)·5b·5c, 03의 도메인 표(`crypto-market-indicators` 행 없음), 04의 5f·6(코인 단계·코인 DCA 없음), 06의 5·7(`amountScale`·코인 포매터 없음), 07의 6(`CryptoMarketSection` 없음), 09의 A1·C4, 10의 3(없음), 11의 9·10(코인 위젯 없음, 차트 9파일). 각 지침서의 보정 절에 적어 두었다.
- 이 지침서를 건너뛰고 다른 지침서를 먼저 실행해도 된다. 그때는 `00-roadmap.md` 4-2의 V8(코인 코드는 그대로 둔다)을 따른다.
