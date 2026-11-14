# S. 지침서 01~06 전제 점검 (측정, 2026-11-14)

규칙: 코드·지침서는 고치지 않았다. 판정은 일치 / 수치만 다름 / 대상 없음 / 이름 바뀜 / 뜻이 달라짐. 기준 코드는 `main` 72ef1770(묶음 A·B·C 반영). 검색은 `git grep`(따옴표 glob), 줄 수는 `wc -l`.

## 요약

> 정정(2026-11-14, 오케스트레이터 재확인): 02 절의 "프록시 12개, 02만으로는 route 11개"는 틀렸다. `app/api/backtest/route.ts`도 `createProxyRoute`를 쓴다. 프록시는 13개이고 02 태스크 2의 판정 "10 이하"는 맞다(`guides/02`의 보정 절).

### 지침서별 "태스크 성패를 가르는 어긋남" 건수

| 지침서 | 건수 | 대표 |
|---|---:|---|
| 01 타입 SSOT | 6 | 태스크 1 판정 명령(`grep -c '?:'`)이 프로퍼티 비율이 아님, 태스크 3b·4 판정 기대값이 항상 통과·0이 안 됨, admin 로컬 `Schema`가 `Required` 변형, `dto-sync-check` 이미 없음, visual-diff 목 응답이 문자열 숫자 |
| 02 데이터 층 | 6 | 태스크 2 판정 route ≤10인데 02만으로는 11, `GET /api/trading-cycles/{id}`는 이미 스펙에 있음, 태스크 8의 `docs/agents/deployment.md`엔 문자열 없고 누락 7곳, `useAppForm` 소비처 15파일을 모름, 11 태스크 4와 SSE 충돌 |
| 03 계층 구조 | 5 | `fsd-*` 에이전트·스킬 이미 삭제, 도메인 표에 api 15가 지울 `crypto-market-indicators`, `vitest.config.ts` alias 중복 선언 누락, 태스크 6 판정 기준값 없음, `placed-order.ts` 지위 |
| 04 라우트와 폼 | 5 | 5d 판정 grep이 `DcaStrategyForm`·`DcaRuleEditor`·`ReconfigureVrForm`의 `canSubmit` 3곳을 놓침, 5d가 묶음 C의 `onSubmit` 가드를 되돌리는 일, 5f가 api 04·15가 지울 KIS·업비트·바이낸스 단계를 포함, 6 선행 테스트에 크립토 DCA, PROGRESS와 04의 토스트 분담이 반대 |
| 05 UI·API 책임 | 6 | 삭제 범위가 KIS·업비트뿐인데 api 15는 코인 전체, 태스크 9 grep이 `.mjs`·`app/pending` 문구를 놓침, `dcaFormat.ts:73-93` 삭제가 PROGRESS D10 정정과 충돌, 10의 B2·B3 미반영, 태스크 1 판정 `\b`, 10 D4(크립토 지표 유지)와 api 15(삭제) |
| 06 UX 프리미티브 | 4(+미확인 1) | 태스크 4 판정이 묶음 C가 유지한 `CapitalForm` 확인 AlertDialog에 걸림·`ConfirmDialog` 모양 불일치, `AmountInput`이 기대는 `amountScale`을 api 15가 지움, 포매터 정리 대상이 삭제 예정 위젯, 태스크 8이 05 태스크 5 선행 |

### 가장 중요한 어긋남

1. **코인·KIS 삭제(api 04 A·15)와 UI 지침서가 맞지 않는다.** 05 태스크 9는 KIS·업비트만, 04 5f·6은 KIS·업비트·바이낸스 단계를 그대로 전환·고정, 06은 `amountScale`·크립토 지표 포매터에 기대고, 03 도메인 표도 `crypto-market-indicators`를 흡수한다. UI 쪽 코인 삭제 태스크가 어느 지침서에도 없다(크립토·업비트·바이낸스·USDT·executionHour 문자열이 든 비테스트 파일이 features/strategy·features/account·widgets·entities·shared·app 합계 63개).
2. **01 태스크 1 판정 명령이 틀렸다.** `grep -c '?:'`는 2,720(스키마 외 포함)이고 스키마 구간만 세면 optional 690/826 = 83.5%다. `openapi.json`은 api T1(11-13)보다 앞선 11-11 상태라 먼저 `fetch:spec`을 해야 하고, 그건 사용자 기동 api 2개가 필요하다. visual-diff 목 응답(`scripts/visual-diff/fixtures/trading.mjs`)도 문자열 숫자다.
3. **04 5d 판정 grep과 대상 목록이 어긋난다.** `canSubmit`이 `DcaStrategyForm.tsx:211`·`DcaRuleEditor.tsx:59`·`ReconfigureVrForm.tsx:151`에도 있는데 5d 대상에도 개명 문장에도 없다. 5d는 묶음 C가 넣은 `onSubmit` 가드(`canSubmit ? form.submit(e) : e.preventDefault()`)를 되돌리는 일이다.
4. **서버 계약이 UI 스펙에 아직 없다.** `fieldErrors`·`allowedActions`·`reapplyAvailableAt`·`ENGINE_RESTARTING`은 `api-types.ts`에 0건, T1·T2만 끝났고 UI 스펙은 재생성 전. `GET /api/trading-cycles/{id}`는 이미 있고(02의 단건 요청 절반이 불필요) `GET /api/accounts/{id}`만 없다.
5. **05가 PROGRESS의 정정을 아직 안 받았다.** `dcaFormat.ts:73-93` 삭제 문장(05:77), 10의 B2·B3 판정 한 줄씩, KIS grep 구멍(10:121)이 모두 05 본문에 없다. 이 상태로 05를 따라 하면 서버 값 표시 코드를 지운다.

---

## 지침서 01 타입 SSOT

실행 여부: 태스크 0~6 모두 미실행. `.claude/skills/dto-sync-check`만 PROGRESS 74행 기준으로 이미 삭제됨(태스크 6 대상 일부가 없음). 서버 T1·T2는 끝났지만 UI 스펙은 재생성 전이다.

### 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 코드 | 판정 |
|---|---|---|---|
| 태스크 1 완료 판정 | "`fetch:spec && gen:types` 후 `grep -c '?:'`가 스키마 프로퍼티의 20% 미만" | **판정 명령이 틀렸다.** `grep -c '?:' shared/lib/api-types.ts` = 2720줄(경로·쿼리 파라미터·`?: never` 포함)이라 프로퍼티 수와 비교할 수 없다. 스키마 구간만 python으로 센 값: optional 690 / 필수 136 = 83.5%(지침서 서두 "832개 중 692개 83%"와 같은 상태). `openapi.json`·`api-types.ts` 마지막 재생성은 `0af4d34b`(2026-11-11)로 api T1(`1915ba682`, 11-13)보다 앞이다. 그래서 지금은 재생성 전이고, 재생성하면 수치가 바뀐다 | **뜻이 달라짐**(성패 갈림: 명령대로 하면 항상 20%를 넘어 중단하거나 비교 불능) |
| 태스크 1 | `npm run fetch:spec` | `scripts/fetch-spec.mjs:7-9`가 8080·8081 두 스펙을 받아 병합한다. 로컬 api 2개(8080·8081) 기동이 필요하고 사용자 기동이다. api 05가 role 통합을 하면 이 스크립트가 바뀐다(02 태스크 8) | 일치(실행 전제만 사용자) |
| 1절 | "`shared/lib/api-types.ts` 9,564줄, 스키마 186개" | 9,558줄, 스키마 186개(`schemas:` 아래 8칸 들여쓰기 `Name: {` = 186; 같은 구간 `grep -c "^    [A-Za-z]*: {"` 103은 들여쓰기가 달라 무의미) | 수치만 다름(6줄) |
| 1절 | "`components['schemas']` 인용 4개 파일(`admin/model/types.ts`, `market/model/types.ts`, `stats/model/types.ts`, `shared/lib/api-schema.ts`)" | `git grep -n "components\['schemas'\]" -- '*.ts' '*.tsx'` = 위 4개 + `entities/stats/hooks/useHousingBenchmarkQuery.test.tsx` 1개(테스트) | 수치만 다름 |
| 1절 | "`entities/*/model/types.ts` 15개 파일 967줄" | `wc -l entities/*/model/types.ts` = 15개 967줄 | 일치 |
| 1절 | "`entities/strategy/api/index.ts:11-125`, `order/api/index.ts:14-75`, `trade/api/index.ts:13-43`, `shared/model/placed-order.ts:14-25`" | 같은 함수가 있다: strategy `normalizeVrSummary:11`·`normalizeStrategy:104`, order `normalizeLedgerCheck:14`·`normalizePreview:37`(75 부근), trade `normalizePortfolio:13`, placed-order 25줄 | 일치 |
| 1절 | "`String(c.indicator) as DcaIndicator`(`entities/strategy/api/index.ts:37`)" | `:35`(`normalizeDcaCondition` 안) | 수치만 다름(2줄) |
| 1절 | "`api-schema.ts:22-36`의 `OrderType` 수기 정의와 `ExactUnion`" | `shared/lib/api-schema.ts:22`(`OrderType`), `:25-34`(`ExactUnion`·`_orderEnumPin`) | 일치 |
| 1절 | "`admin/model/types.ts:3-10` `Required<>`·`NullableFields<>`" | `entities/admin/model/types.ts:5-7`. 로컬 `Schema`가 `Required<>`로 감싸므로 태스크 2의 "로컬 `Schema` 제거"는 공용 `Schema<K>`(Required 없음)와 이름은 같고 뜻이 다르다 | 수치만 다름 + **뜻이 달라짐**(같은 이름 `Schema`가 admin에서 Required 변형이라, 지우지 않고 공용으로 바꾸면 `NullableFields` 소비 5곳 `types.ts:20,25,40,43,51`이 의미가 바뀜) |
| 1절 | "주석 'KIS live 응답은…'(`entities/trade/api/index.ts:12`)" | `entities/trade/api/index.ts:12` 그대로 | 일치 |
| 1절 | "정규화 함수 16개" | `git grep` 결과 `function normalize*` = strategy 8(`normalizeVrSummary`,`DcaCondition`,`DcaSizing`,`DcaRule`,`Dca`,`DcaExecution`,`Strategy`,`PlacedOrder`) + order 4 + trade 1 = 13개. account는 이름이 `normalize`가 아니라 `getPrices:41`·계좌 `deposit: toNum(...)`(`entities/account/api/index.ts:62-64`) 인라인 변환 | 수치만 다름(13+인라인) |
| 1절 규칙 3 | "배열 → Record 3건(`getPrices`, `getCryptoPrices`)과 평탄화 1건(`executeStrategy`)" | 이름은 2개만 적혀 있다("3건"인데 둘). 위치: `getPrices`는 `entities/account/api/index.ts:41`(trade가 아님), `getCryptoPrices` `entities/trade/api/index.ts:95`, `executeStrategy` `entities/strategy/api/index.ts:232` | 수치만 다름(건수 불일치) |
| 태스크 3b | "`grep -rn "normalize\|Raw\b" entities/{account,trade}` 0건" | account는 이미 0건(`normalize` 이름 없음 — 그 변환은 `toNum` 인라인), trade는 `entities/trade/api/index.ts:13,65` 2건. account의 `toNum` 인라인 변환(`:44,62-64`)은 이 판정에 안 걸려 지운 것을 확인하지 못함 | **뜻이 달라짐**(account 부분은 판정이 항상 통과) |
| 태스크 4 | "`grep -rnE "'BUY' \| 'SELL'" … \| grep -v api-types` 0건" | 지금 9건: `entities/order/model/types.ts:65`, `entities/privacy/model/types.ts:3`, `entities/strategy/model/types.ts:27`, `entities/trade/model/types.ts:2`(`'BUY'\|'SELL'\|'INFO'\|'FAIL'`, 로그 종류라 생성 타입 대응 아님), `shared/model/placed-order.ts:4,19`, `shared/lib/api-schema.ts:32`(ExactUnion pin), `widgets/strategy-detail/NextOrderCard.tsx:53`, 테스트 2곳. 테스트와 pin까지 0이 되려면 지침서가 말하지 않는 `ExactUnion` 삭제가 선행. `trade`의 INFO·FAIL 결합은 대상 아님인데 grep이 잡는다 | **뜻이 달라짐**(0건이 되지 않을 수 있는 항목이 판정에 섞임) |
| 태스크 5 | "`pGraceWeeks` … 타입 선언 위치가 zod 스키마 2곳 이하" | 지금 제품 코드 `pGraceWeeks` 선언: `entities/strategy/model/types.ts:21,101,140`, `vrRamp.ts:17`, `VrFieldControls.tsx:155`, `useStrategyForm.ts:44`, zod `strategyFormSchema.ts:30`·`reconfigureVrFormSchema.ts:27` 등 총 8곳 이상. 묶음 C의 `useAppForm`은 이 선언을 안 건드렸다 | 일치(미실행) |
| 태스크 5 | `features/strategy/**/model/*`, `entities/backtest/model/types.ts` | `features/strategy/create-strategy/model/*`·`reconfigure-vr/model/*` 존재. 단 `ReconfigureVrForm.tsx:48,104`가 모델 밖에서 payload를 만든다. 묶음 C가 `features/strategy/adjust-capital/CapitalForm`(04-5c)을 만들며 `inject-capital`·`withdraw-capital`을 지웠다(01이 이 슬라이스를 언급하지 않아 영향 없음) | 일치 |
| 태스크 6 | "`.claude/skills/dto-sync-check/`" | 이미 삭제(`ls .claude/skills` = playwright-cli, react-doctor, typecheck-and-report, ui-audit). PROGRESS 74행에 삭제 기록 | **대상 없음** |
| 태스크 6 | "`shared/lib/normalize.ts`(+테스트), `utils.ts`의 `toNum`(사용처 0이면)" | `normalize.ts` 15줄 + 테스트 28줄 존재. `toNum`은 `shared/lib/utils.ts:13`, 사용: `entities/{account,order,strategy}/api/index.ts` 다수. `optStr/optNum/optDec`는 `entities/strategy/api/index.ts:3`에서만 import | 일치 |
| 태스크 6 | "`docs/agents/entities.md` 'KIS live API quirk', `shared.md` 'normalize'" | `docs/agents/entities.md:66-68` "KIS live API quirk", `docs/agents/shared.md:68-70` "normalize · api-schema". 추가로 `docs/agents/entities.md:7`(`normalizeStrategy` 언급)·`docs/agents/strategy.md:7`("`normalizeStrategy()`를 함께 수정")이 같은 규칙을 말하는데 지침서 목록에 없음 | 일치 + 누락 2곳 |
| 위험 | "`=== undefined`·`!== undefined`를 grep" | `git grep -c "=== undefined\|!== undefined" -- entities widgets features` = 3개 파일(`entities/meta/api/index.test.ts` 1, `entities/user/hooks/useUserQueries.ts` 1, `features/account/create-account/CreateAccountStepper.tsx` 1)로 소수. 단 `=== undefined` 말고 `?? ` 연쇄·`!= null`이 더 많을 수 있어 grep 범위가 좁다 | 수치만 다름 |
| 선행 테스트 3 | `npm run visual-diff -- <base-ref>` | 도구는 있다. 단 `scripts/visual-diff/fixtures/trading.mjs:14,19,23`이 `averagePrice: '28.1500'`처럼 **문자열 숫자**로 가짜 응답을 만든다. 01이 타입을 number로 바꾸면 이 목 응답이 옛 와이어를 계속 낸다 | **뜻이 달라짐**(성패 갈림: 지침서가 이 파일을 안 적어 전후 비교가 문자열 입력으로 계속 돈다) |

### 2. 이름이 박힌 가드·테스트·설정

| 위치 | 박힌 이름 | 01의 어느 태스크가 건드리나 |
|---|---|---|
| `knip.json:5` | `"ignore": ["shared/lib/api-types.ts"]` | 태스크 1(재생성). 경로 불변이라 영향 없음. 02가 `shared/api-types.ts`로 옮기면(미확인) 여기도 |
| `package.json:19` | `gen:types`가 `-o shared/lib/api-types.ts` | 태스크 1 |
| `package.json:16`, `scripts/fetch-spec.mjs:7-9` | `fetch:spec`이 8080·8081 두 URL | 태스크 1(서버 기동 전제). 02 태스크 8이 지운다 |
| `scripts/visual-diff/fixtures/trading.mjs:14,19,23`, `fixtures/api.mjs:46` | 문자열 숫자 목 응답(`'28.1500'`, `'5000'`) | 태스크 3c(order·strategy 숫자화) |
| `docs/agents/entities.md:7,66-68`, `docs/agents/shared.md:68-71`, `docs/agents/strategy.md:7` | `normalizeStrategy`, `optStr/optNum/optDec`, "KIS live API quirk" | 태스크 6 문서 항목. entities.md:7·strategy.md:7은 지침서 목록에 없음 |
| `docs/agents/shared.md:71` | "enum 타입은 `api-schema.ts`에서 가져온다" | 태스크 4가 `OrderType` 등 수기 union 삭제 시 문장 갱신 필요(지침서 언급 없음) |
| `eslint.config.mjs`·`tsconfig.json`·`vitest.config.ts` | 01 대상 경로 문자열 없음(`git grep -n "normalize\|api-schema\|placed-order"` 0건, 다른 패턴 `model/types`로도 0건) | 없음 |
| `entities/strategy/model/fixtures.ts:5` | 묶음 A 빌더. `pGraceWeeks` 등이 number로 이미 들어 있음 | 태스크 3c·5가 빌더 타입도 함께 바꿔야 한다(지침서는 빌더 존재를 모름) |
| `shared/lib/normalize.test.ts`, `entities/{strategy,order,trade}/api/index.test.ts`(294·277·180줄), `shared/model/placed-order.test.ts`(61줄) | 정규화 테스트 | 태스크 3b·3c·6. 지침서는 "3개 파일 751줄"이라 적었는데 지금 합 751줄 + `placed-order.test.ts` 61줄 + `normalize.test.ts` 28줄 |

### 3. 중단 조건·확인 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 76 | "서버 선행 조건 미충족: 스펙의 optional 비율이 그대로면 이 지침서는 실행할 수 없다" | 없음(실행을 멈춘다는 말뿐. 그 사이 UI가 할 일 없음) |
| 80 | "로컬 kista-api(8080)·kista-trading(8081)이 떠 있을 때(사용자가 기동)" | 없음. 안 떠 있을 때 숫자 필드가 number인지 확인하는 대체 수단 없음 |
| 81 | "보장되지 않는 것은 서버 변경 요청으로 넘긴다" | 있음(서버 요청). 단 그 필드를 UI에서 어떻게 두는지는 없음 |
| 89 | "넘으면 중단하고 서버에 미표기 DTO 목록을 넘긴다" | 있음(서버로 넘김) |
| 102 | "태스크 0이 끝나기 전에 UI에서 `Required<Schema<…>>`를 전 도메인으로 퍼뜨리지 않는다" | 있음(하지 말 것) |
| 106 | "정규화 테스트를 케이스 검토 없이 통째로 지우지 않는다(선행 테스트 2번)" | 있음 |

### 4. 서버 선행 조건

| 태스크 | 기다리는 것 | 현재 상태 |
|---|---|---|
| 0, 1~6 | api T1(required·nullable), T2(BigDecimal plain number) | api `cross-repo.md` B절·`guides/10-ui-contract.md` 8절: "T1·T2는 끝났다(`1915ba682`)". UI 스펙은 재생성 전이므로 `openapi.json`은 구 상태(optional 83.5%). **태스크 1부터 시작 가능**하나 로컬 api를 사용자가 기동해야 한다 |
| 3c | api 05(role 통합) 시 `trading_` operationId 접두사 변화 | 태스크 1 이후 재생성할 때 접두사로 스키마·operation 이름이 바뀔 수 있다. T1 이후 스키마 이름 변화는 `cross-repo.md` B절 첫 문단("스키마명 `OrderLine`(관리…")에 적혀 있다(전문 미확인, 줄 잘림) |
| 계약 포함 여부 | `git grep -c "fieldErrors" shared/lib/api-types.ts` = 0, `{items}` 봉투: `CycleHistoryPageResponse.items`(`api-types.ts:3144`)처럼 일부는 이미 있으나 T3 공용 `Items<T>`는 없음, JWT `status` 클레임은 타입 밖이라 확인 불가 | 미포함(T3·T7·U1 전) |

### 5. 다른 지침서와의 충돌

- **02 ↔ 01**: 02가 "`openapi-fetch` 도입"으로 `fetchEither<Strategy[]>` 호출을 바꾼다. 01 목표 구조 코드(35-36행)의 `fetchEither`는 02 뒤 사라진다. 순서 01 → 02라서 충돌은 아니지만 01 코드 예가 02 뒤엔 무효(02 절에서 상세).
- **05·10 ↔ 01 태스크 3a/3c**: 05가 `getPrices`·`executeStrategy` 모양 변환을 서버 응답 변경으로 없애라고 한다(01 규칙 3 "05에서 없앨 후보"). 해당 변환을 01이 남기고 05가 지운다 — 순서가 지켜지면 문제 없음.
- **크립토**: 01 태스크 3b·4의 대상(`entities/trade`의 `getCryptoPrices:95`, 코인 포트폴리오 타입)과 api 15(코인 전체 삭제, U 단계)가 겹친다. 01 3b가 코인 타입을 별칭으로 전환하는 작업을 하면 15 단계 U에서 곧 지워진다(`git grep -n "crypto\|코인\|업비트\|UPBIT" -- 'docs/superpowers/fable-review/guides/01-type-ssot.md'` = 0건. 01은 크립토 언급이 `getCryptoPrices` 한 곳뿐).

---

## 지침서 02 데이터 층

실행 여부: 태스크 1~8 모두 미실행(`git grep -n "resolveUpstream\|openapi-fetch" -- '*.ts' '*.tsx' '*.json'` 결과 package.json에 openapi-typescript만, `ls node_modules/openapi-fetch node_modules/openapi-react-query` 둘 다 없음). 묶음 A의 `testing/mockApi.ts`가 같은 경로 키(`'GET /api/…'`)를 쓰므로 02가 바꿀 hook·키 쪽 테스트는 이미 fetch 경계 기준이다.

### 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 코드 | 판정 |
|---|---|---|---|
| 현재 구조 | "api 함수 130개 / 16파일 1,307줄" | `git grep -hE "^export (async )?(function\|const) " -- 'entities/*/api/index.ts' \| wc -l` = 130, `wc -l` 합 1,306, 파일 16 | 일치 |
| 〃 | "`queryKeys.ts`+`queryOptions.ts` 21파일 487줄, 테스트 10파일 427줄" | 21파일 487줄, 테스트 10파일 | 일치 |
| 〃 | "hooks 23파일 1,912줄, 한 줄짜리 query hook 17개, `use*Mutation` 73개" | hooks 비테스트 22파일, `export … use*Mutation` 71개, `return useQuery(` 28줄(한 줄짜리만 센 17과 기준이 달라 비교 불가) | 수치만 다름 |
| 〃 | "`useInvalidateFinanceMutation`(`useFinanceMutations.ts:260-271`)을 28곳이" | 정의 `entities/finance/hooks/useFinanceMutations.ts:260`(`function`), 비테스트 사용 29줄(정의 1 + 호출 28) | 일치 |
| 〃 | "`token?: string` 인자 api 함수 87개" | `git grep -o "token?: string" -- 'entities/*/api/index.ts' \| wc -l` = 87 | 일치 |
| 〃 | "`apiFetch` `api-client/index.ts:121-140`, `clientFetch` `:93-106`, `TRADING_PREFIXES` `:6-13`" | `shared/lib/api-client/index.ts`(140줄): `TRADING_PREFIXES:6`, `clientFetch:93`, `apiFetch:121`. `:10`에 `/api/stats`도 trading으로 보낸다 | 일치 |
| 〃 | "`entities/market/api/index.ts:8-20`, `queryOptions.ts:17-18`" | `entities/market/api/index.ts:10-18` `getMonthlyHolidaysPublic`, `entities/market/model/queryOptions.ts` `typeof window` 분기 존재 | 수치만 다름 |
| 〃 | "`app/api/*/route.ts` 13개 각각의 `target`" | `git grep -ln createProxyRoute -- 'app/api'` 비테스트 **12개**(accounts, admin, client-errors, crypto-market-indicators, daily-trades, finance, market, orders, runtime-config, settings, stats, trading-cycles). 경로 추가: `backtest/route.ts`는 `createProxyRoute`를 안 쓴다(목록에 없음, 직접 구현 추정, 미확인) | 수치만 다름(12 대 13) |
| 〃 | "`AccountDetailContent.tsx:24-25`, `StrategyDetailContent.tsx:28-31`, `StrategyFormPage.tsx:26`" | `AccountDetailContent.tsx:25`, `StrategyDetailContent.tsx:39-40`, `StrategyFormPage.tsx:20-21`(`initial` prop은 `:13,16`). 방식은 같고 03행 위치 이동. 묶음 C가 `StrategyFormPage`를 안 건드림 | 수치만 다름 |
| 목표 4·태스크 6 | "`grep -rn "initialAccount\|initialStrategy" --include='*.tsx' .` 0건" | 대상 존재: `app/(main)/accounts/[id]/page.tsx:52`, `app/(main)/accounts/[id]/strategies/[sid]/page.tsx:48-49`, `AccountDetailContent.tsx`, `StrategyDetailContent.tsx`. `StrategyFormPage`는 `initial`(이름이 `initial`) — 이 grep 패턴에 안 걸린다 | **뜻이 달라짐**(`initial` prop은 판정 밖) |
| 태스크 2 완료 판정 | "`find app/api -name route.ts \| wc -l`이 10 이하" | 지금 22개. 프록시 12개를 1개로 바꾸면 22-12+1 = **11**. 11 지침서는 같은 수를 8로 고쳤다(PROGRESS 11 문단: "02 태스크 2의 route 수 10 → 8") | **뜻이 달라짐**(성패 갈림: 02 자체로는 11이라 ≤10 미충족, 11 태스크 2·12가 끝나야 8) |
| 위험 | "단건 조회 엔드포인트 `GET /api/accounts/{id}`, `GET /api/trading-cycles/{id}`를 요청" | `shared/lib/api-types.ts:1664-1677` `"/api/trading-cycles/{id}"`에 `get: operations["get"]`가 이미 있다. `"/api/accounts/{id}"`(`:1720`)는 put·delete뿐이고 GET 없음. api `10-ui-contract.md` 8절이 "T11: `GET /api/trading-cycles/{id}`는 이미 있다, 만들 것은 `GET /api/accounts/{id}` 하나"로 정정 | **뜻이 달라짐**(요청 대상 한 건은 이미 있다. `strategyDetailQueryOptions`가 목록 find 대신 이 GET을 지금 바로 쓸 수 있음) |
| 위험·하지 말 것 | "`detailFromListQueryOptions`, `strategyDetailQueryOptions`" | `shared/lib/query/detailFromList.ts:4`(목록 `find`), `entities/strategy/model/queryOptions.ts:31` | 일치 |
| 위험 | "`accountKeys.prices`는 티커를 정렬해 키에 넣는다" | `entities/account/model/queryKeys.ts:8-9`(`[...tickers].sort().join(',')`) | 일치 |
| 5절 | "`PaginationBar`·`PageSizeSelector`, 사용 15·13파일" | 비테스트 tsx 15·13 | 일치 |
| 5절 | "`use-client-pagination`" | `shared/lib/hooks/use-client-pagination.ts`, 소비 `widgets/admin-trade-list/AdminTradesWorkbench.tsx`, `admin-user-list/AdminPendingList.tsx`, `AdminUsersTable.tsx` | 일치 |
| 1절 | "`app/auth/callback/route.ts:28-90`, `:82-84`, `shared/lib/auth/refresh.ts:33-34`, `proxy.ts:17,132,96`, `app/api/auth/refresh/route.ts:18,25`" | `callback/route.ts:84`(Set-Cookie 복사), `proxy.ts:17,132` x-forwarded-proto 일치, `proxy.ts:96` 일치, `refresh/route.ts:18,25` 일치. `refresh.ts`는 `:33-34` 대신 주석 `:5,41` 확인(줄 번호 미확인) | 수치만 다름 |
| 태스크 8 | "`TRADING_API_BASE_URL`(env.ts, `.env.example`, 루트·`deploy/server` compose, `docs/agents/deployment.md`)" | `docs/agents/deployment.md`에는 이 문자열이 **없다**(`git grep -n "TRADING_API_BASE_URL" -- docs/agents .github` = `.github/tests/contract.bats:10` 한 줄뿐). 지침서에 없는데 걸려 있는 곳: `.github/tests/contract.bats:10`, `README.md:18,59`, `playwright.config.ts:35`, `scripts/visual-diff/run.mjs:124`, `shared/lib/proxy/createProxyRoute.test.ts:58,60,82`, `app/(main)/accounts/[id]/strategies/[sid]/edit/page.test.tsx:21`, `deploy/server/README.md:32` | **대상 없음**(deployment.md) + 누락 7곳 |
| 태스크 8 | "`scripts/fetch-spec.mjs`의 8080·8081 병합(42줄)" | 42줄, `:7-9`에서 두 URL | 일치 |
| 태스크 3 | "`docs/agents/shared.md`의 'Stale Time' 표", "체결 SSE" | `docs/agents/shared.md:22` `### Stale Time`, `:47` 체결 SSE 절 | 일치 |
| 태스크 5c | "`widgets/layout/TradeNotificationBridge.tsx`" | 존재(+ `.test.tsx`), 소비 `app/(main)/layout.tsx` | 일치 |
| 태스크 1 | `openapi-fetch`·`openapi-react-query`를 설치 | 둘 다 미설치. `package.json`은 `openapi-typescript ^7.13.0`만 | 일치(미실행) |
| 묶음 C 후속 | 02는 "hook 73개를 `$api.useMutation`으로" | 묶음 C의 `shared/ui/form/useAppForm.ts`가 기존 entities mutation hook 결과를 받는다(PROGRESS 묶음 C 04-4). 02가 hook을 지우면 `useAppForm` 호출부 15파일이 `$api.useMutation(...)`을 받아야 함. PROGRESS는 "02의 `$api.useMutation`도 같은 모양"으로 가정했으나 02 지침서는 `useAppForm`을 모른다 | **뜻이 달라짐**(02가 모르는 소비처가 생김. 호출부 수는 `git grep -l useAppForm` 비테스트 15파일) |

### 2. 이름이 박힌 가드·테스트·설정

| 위치 | 박힌 이름 | 02의 어느 태스크 |
|---|---|---|
| `eslint.config.mjs:74` | `files: ['entities/**/hooks/**']` + `hookRefreshSelector`(router.refresh 금지) | 태스크 5(hooks 삭제). 남는 hook에만 적용되므로 영향 작음. 단 `$api` 호출이 `entities`가 아닌 `shared/api`로 옮겨 가면 "`entities` hook에서 `router.refresh()`로 캐시 동기화 금지"가 새 위치를 안 덮는다 |
| `eslint.config.mjs:19`, `:70` | `getCached(Accounts\|Strategies\|User)` 식별자 금지, `next/cache`의 `unstable_cache`·`cacheTag` import 금지 | 이름은 02와 무관, `files: runtimeFiles = ['app/**','widgets/**','features/**','entities/**']`(`:16`)에 `shared/**`가 없다. 02가 `shared/api/**`(신규)에 서버 `kistaFetch`를 두면 이 규칙이 닿지 않는다 |
| `tsconfig.json:25-33`, `vitest.config.ts:17-23` | alias `@shared/*`·`@testing/*`. `@testing`은 묶음 A가 추가 | 02 신규 `shared/api/**`는 기존 alias로 충분 |
| `vitest.setup.ts` | 전역 대역 `next/navigation`·`next/link`·`sonner` | `kistaFetch`가 `next/headers`를 직접 쓰면 PROGRESS "남긴 것"의 3건째가 돼 전역 대역 승격 조건("3건 이상")에 걸림 |
| `testing/mockApi.ts` | 전역 `fetch` 대체, 키 `'GET /api/…'`, 타입 `paths` | 02가 `openapi-fetch`로 바꿔도 `fetch` 주입이라 그대로 걸린다. 단 `kistaFetch`가 `fetch`를 `globalThis.fetch`로 캡처해 두면 mock이 안 먹는다(지침서에 주의 문장 없음) |
| `.github/tests/contract.bats:10` | `TRADING_API_BASE_URL: ${TRADING_API_BASE_URL:?` 단언 | 태스크 8(compose에서 삭제하면 이 bats가 실패) |
| `playwright.config.ts:35`, `scripts/visual-diff/run.mjs:124` | `API_BASE_URL`·`TRADING_API_BASE_URL`·`NEXT_PUBLIC_API_BASE_URL` 주입 | 태스크 8 |
| `scripts/visual-diff/proxy.mjs`, `fixtures/trading.mjs` | 8080·8081 두 목 서버 | 태스크 8(진입점 단일화 뒤 두 서버를 하나로 합쳐야 하는지 미확인) |
| `docs/agents/architecture.md` "API 계층", `entities.md:22`(`api/index.ts`·`model/queryKeys.ts`·`queryOptions.ts` 구조 표), `shared.md:22,47` | `apiFetch`/`clientFetch`/`fetchEither` 서술 | 태스크 7 문서 갱신. 지침서 목록(`architecture/entities/shared.md`)과 일치 |
| `knip.json` | `"ignore": ["shared/lib/api-types.ts"]` | 02가 `shared/api/**`(신규)로 경로 이동 시 영향 없음. 03이 api-types를 옮기면 갱신 |
| `app/(main)/**/page.tsx`의 `getAuthToken()` 호출 | 서버 토큰 전달(태스크 6) | 03이 `app/`→`screens/`로 옮기므로 순서 |
| `proxy.ts:35-64`의 상태·역할 캐시 쿠키 | 11 태스크 2·3이 지움 | 02 태스크 2가 프록시를 합칠 때 `proxy.ts`는 건드리지 않음(인증 `proxy.ts`와 Route Handler는 별개) |

### 3. 중단 조건·확인 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 62 | "확인이 남은 것은 SSE 2개(`trades/stream`, `auth/status-stream`)가 Caddy 내부 리스너를 지날 때 버퍼링·타임아웃 없이 흐르는지다. 전환 때 실제로 확인한다" | 없음(실패 시 어떻게 하는지 미기재) |
| 118 | "사용자 결정(2026-11-12): `openapi-fetch`·`openapi-react-query` 도입 승인" | 해당 없음(이미 승인) |
| 138 | "서버에 `GET /api/accounts/{id}`, `GET /api/trading-cycles/{id}`를 요청한다 … 생기기 전까지는 목록 쿼리 + `select`로 읽는다" | 있음(목록 + select) |
| 141 | "확인하지 못한 것 — `useSuspenseQuery` 제공 여부와 키 세 번째 원소 … 태스크 1에서 `node_modules` 소스로 확인하고, 없으면 `useSuspenseQuery($api.queryOptions(...))`" | 있음 |
| 142 | "목록 규약 전환은 api와 같은 날 배포한다" | 없음(api가 먼저 나가면 UI가 깨지는 상황의 대체 없음. api `10` 8절은 "ui 쪽 커밋이 준비됐다는 사용자 확인이 없으면 push 요청하지 않는다") |
| 149 | "e2e: 로컬 api 필요, 사용자가 기동" | 없음 |
| 140 (위험 "401 처리") | "Opus가 맡고 `/code-review high`를 돌린다" | 해당 없음 |
| 165 (태스크 8) | "api 지침서 05 단계 M 직후" | 없음(M이 늦어지면 태스크 8을 미루는 것 외 명시 없음) |
| 174 (하지 말 것) | "401 갱신·로그아웃 로직을 이 기회에 고치지 않는다" | 있음(그대로 옮김) |

### 4. 서버 선행 조건

| 태스크 | 기다리는 것 | 현재 상태 |
|---|---|---|
| 1~3, 5a·5b | 01(타입 재생성) | 01 미실행 |
| 5 중 목록 전환(5a 가계부, 5c 전략 이력) | api T3(`Items`·`CursorPage`)·T4(목록 규약) | api 미실행(`cross-repo.md` 짝 표에 "묶음별 같은 날 배포"). `CycleHistoryPageResponse`(`api-types.ts:3142-3148`)에 `items`·`nextCursor`·`hasMore`가 이미 있다(커서 2종 중 하나). 나머지 목록은 배열 |
| 위험(단건) | api T11 | 일부 완료: `GET /api/trading-cycles/{id}`는 이미 스펙에 있다(`api-types.ts:1672-1674`). `GET /api/accounts/{id}`만 미구현 |
| 3 `MutationCache` `onError`(서버 `detail`) | api T7(오류 문구·`fieldErrors`) | 미실행. 스펙에 `fieldErrors` 0건(`git grep -c fieldErrors shared/lib/api-types.ts` = 0) |
| 8 | api 05 단계 M(role 통합) | 미실행 |
| 1·2 | api T1·T2 | 완료(`1915ba682`) — 단 `openapi.json` 재생성 전 |

### 5. 다른 지침서와의 충돌

- **02 ↔ 04(5g, `useAppForm`)**: 02 3절은 `MutationCache`의 `onError`가 서버 `detail`을 항상 토스트("응답에 `fieldErrors`가 있어도 건너뛰지 않는다")로 한다. 묶음 C 결과(PROGRESS 04-4)는 "hook `onError`가 이미 토스트하므로 `useAppForm`은 토스트하지 않는다 — T7 뒤 켤 때 필드에 붙은 오류를 hook 토스트가 또 띄우지 않게 hook `onError`도 고친다"고 쓰여 있다. 두 서술은 "필드 오류가 있을 때 전역 토스트 여부"가 반대 방향이다(02: 항상, 04 5g: 필드에 붙으면 토스트를 줄인다). 04 5g 원문은 04 절에서 확인.
- **02 ↔ 06**: 06의 목록·`AsyncSection`이 `$api.useQuery` 결과를 전제하는지 06 절에서 확인.
- **02 ↔ 11 태스크 2·3·12**: 11이 `app/api/auth/{me,status-stream,reapply-done}`·`crypto-market-indicators`를 지우거나 합친다. 02 태스크 2의 "프록시가 아닌 것(auth/*, fcm/*, SSE 2개, health)은 그대로 우선 매칭" 서술이 11 뒤엔 어긋난다.
- **02 ↔ api 15(코인 삭제)**: 02 5b·5c의 대상 `entities/trade`의 코인 쿼리(`getCryptoPrices`, `cryptoPortfolioQueryOptions` 등)와 프록시 `app/api/crypto-market-indicators/route.ts`는 15 단계 U가 지운다. 02가 먼저 이 코드를 `$api`로 옮기면 곧 지울 코드를 이식하는 셈(`git grep -nE "crypto|Crypto" -- 'guides/02-data-layer.md'`로 02 본문에 크립토 언급은 없다). 태스크 순서 규칙 없음.
- **02 ↔ 03**: 03이 `shared/api/**` 위치를 어떻게 부르는지(`shared/` 폐지 시 `core/`로?) 03 절에서 확인.

---

## 지침서 03 계층 구조

실행 여부: 미실행(`ls screens domains` 없음, `@screens`·`@domains` alias 없음 — `tsconfig.json:25-33`은 `@app/@widgets/@features/@entities/@shared/@testing`). 03은 01·02·04·05·06 뒤라서 지금 시작 불가(지침서 하지 말 것 136행). 묶음 A·B·C가 03에 준 영향은 "새 파일 위치"와 "지워진 대상"이다.

### 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 코드 | 판정 |
|---|---|---|---|
| 1절 | "슬라이스는 widgets 42개, features 31개, entities 16개" | 디렉토리 수: `find widgets -mindepth 1 -maxdepth 1 -type d` 42, features는 최상위 8개 아래 슬라이스 `find features -mindepth 2 -maxdepth 2 -type d` **30**, entities 16. 묶음 C 04-5c가 `inject-capital`·`withdraw-capital` 2개를 지우고 `adjust-capital` 1개를 만들어 31 → 30 | 수치만 다름 |
| 1절 | "`features/settings/*` 5개 슬라이스" | 지금 6개(`delete-user-account`, `edit-nickname`, `notification-channel`, `notification-prefs`, `telegram-connect`, `theme-select`) | 수치만 다름 |
| 1절 | "barrel이 105개, 순수 재수출 87개" | `git ls-files \| grep -c '/index.ts$'` = 104(순수/한 줄 구분은 미측정). 묶음 B가 `@modal` 쪽 파일을 지워 1개 줄었을 가능성(원인은 미확인) | 수치만 다름 |
| 1절 | "`.claude/agents/fsd-boundary-checker`가 grep으로 본다" | `ls .claude/agents` 비어 있음, `git grep -n "fsd-boundary-checker\|fsd-scaffold" -- . ':!docs/superpowers'` = 0건. PROGRESS 74행: "`fsd-boundary-checker`, `fsd-scaffold`, `dto-sync-check` 삭제" | **대상 없음**(03 규칙 2·태스크 9의 "`fsd-*` 에이전트·스킬을 지운다"는 이미 끝남) |
| 1절 | "`DashboardContent.tsx:15` → `DashboardOverview.tsx:11-28` → `DashboardMarkets.tsx:13-28`" 슬롯 3단 | `widgets/dashboard/DashboardContent.tsx`에 `marketPanels: ReactNode`·`bottomPanels?: ReactNode` prop 존재(`:11-12`), 나머지 두 파일 줄은 미확인 | 일치(대략) |
| 1절 | "`renderHousingExtras`" | `app/(main)/stats/benchmark/BenchmarkPageContent.tsx:18`, `widgets/benchmark-comparison/HousingBenchmarkComparison.tsx:22,25` | 일치 |
| 1절 | "`docs/agents/widgets.md` '대표 슬라이스' 화이트리스트 12개" | `docs/agents/widgets.md:20-23`에 있음. 개수는 줄이 잘려 미확인. 실제 위젯 간 import(`git grep -nE "from '@widgets/" -- 'widgets/*' ':!*test*'`): `account-card` 1, `cycle-history` 2, `dashboard/DashboardMarkets` 2, `dashboard/MarketChartCard` 1, `dashboard/marketChartCategories` 1, `kpi-card` 6, `page-header` 6, `revealable-value` 4, `strategy-card` 2, `strategy-list` 1, `theme-toggle` 1. 슬라이스 단위 8개 이상 | 일치(대략) |
| 1절 | "`useStrategyForm.ts:13-21`이 자기만 쓰는 hook 3개(`useStrategyFormData` 44줄, `useStrategyFormEffects` 101줄, `useTypeDefaults` 70줄)" | `features/strategy/create-strategy/model/useStrategyForm.ts:13,18,20`에서 import. 줄 수 44·101·70 일치 | 일치 |
| 1절 | "테스트 제외 709개 중 324개(46%)가 30줄 미만" | 지금 테스트·testing·e2e·scripts·api-types 제외 ts/tsx 671개(709는 다른 기준일 수 있음, 확장자 범위 미확인). 30줄 미만 수는 미측정 | 수치만 다름 |
| 1절 | "shared의 export 파일 82개 중 22개(843줄)가 사용처 2곳 이하" | 미확인(재계산하지 않음) | 미확인 |
| 1절 | "`widgets` 중 한 라우트 전용 27개" | 미재측정. `ls widgets` 42(+`CLAUDE.md` 1) | 미확인 |
| 도메인 표 | "`market`: widgets/fear-greed-card, **crypto-market-indicators**, market-holiday-calendar" | `widgets/crypto-market-indicators` 존재. api 15 단계 U가 코인 전체를 지운다(`cross-repo.md` G1: 위젯 `crypto-market-indicators` 걷기) | **뜻이 달라짐**(이동 표에 곧 지울 위젯이 들어감. 03 실행 시점엔 이미 지워져 있어야 이동 표의 행이 틀리지 않음) |
| shared 절 | "`shared/model/placed-order.ts`, `shared/ui/SuggestionListEditor.tsx` 등 사용처 1곳 12개" | 두 파일 존재(`shared/ui/SuggestionListEditor.tsx`, `shared/model/placed-order.ts`). 01 태스크 3c가 `placed-order.ts`의 정규화(14-25행)를 지운다(파일 자체 삭제 여부는 01에 없음) | **뜻이 달라짐**(01 뒤 `placed-order.ts`가 없을 수 있어 "내릴" 대상이 아님) |
| 규칙 6 | "루트 `testing/`(alias `@testing/*`, 07 태스크 2에서 생김)은 `mockApi`·`renderApp`을 담고 `domains/meta`를 import" | `testing/mockApi.ts`·`testing/renderApp.tsx` 존재, `tsconfig.json:31`·`vitest.config.ts:23` alias 일치. `renderApp`이 `entities/meta`의 `MetaProvider`·`testMeta`를 쓴다는 PROGRESS 07-2와 일치 | 일치 |
| 위험 | "테스트의 `vi.mock('@entities/…')` 경로 395개" | 395는 묶음 A 전 수치("모듈 mock 395개"). 지금 `git grep -c "vi\.mock(" -- '*.ts' '*.tsx'` 합 350, `@entities` 한정 128. 그래서 "경로 395개를 치환"의 규모가 작아짐 | 수치만 다름(성패 영향 작음) |
| 위험 | "07 태스크 5에서 `cacheArchitecture.test.ts`·`metadata.test.ts`를 옮긴 것, `runtimeFiles`·`entities/**/hooks/**`·`app/**` glob" | `eslint.config.mjs:16` `runtimeFiles = ['app/**','widgets/**','features/**','entities/**']`, `:74` `entities/**/hooks/**`, `:75-76` `app/**`. 두 테스트 파일은 삭제됨 | 일치 |
| 규칙 5 | "alias는 `@screens/*`, `@domains/*`, `@shared/*` 세 개다" | 같은 절 규칙 6이 `@testing/*`를 허용하고, 최상위 설명에는 "app / screens / domains / shared" 4범위 + `testing/` 1개. 표 "최상위 코드 디렉토리 5계층 → 4범위"와 규칙 6 "다섯 번째 최상위 디렉토리"가 서로 다른 세기 | 수치만 다름(내부 모순) |
| 기각한 대안 2 | "`@modal` 인터셉트 라우트와 본 라우트가 같은 본문을 공유할 때…" | `@modal`은 묶음 B 04-3이 삭제함(`git grep -c "@modal" -- app widgets features shared docs/agents` = `docs/agents/app.md` 1건만 남음, 문장 내용 미확인). 기각 이유 하나가 사라짐 | 뜻이 달라짐(기각 결론은 유지 가능, 근거 절이 낡음) |
| 태스크 3 | "`widgets/{page-header,kpi-card,…}` → `shared/ui`" | 8개 위젯 모두 존재(`ls widgets`). `shared/ui/SectionError.tsx`·`FormDialog.tsx`·`form/useAppForm.ts`는 이미 `shared/ui`(03이 모르는 묶음 B·C 산출물) | 일치 |
| 태스크 5 | "`ls widgets features entities`가 없음" | 해당 디렉토리 모두 존재, 각 디렉토리에 `CLAUDE.md`(15)·`docs/agents/*.md`(16개) import | 일치(미실행) |
| 태스크 6 | "`git ls-files \| grep -c '/index.ts$'`가 실코드 barrel(`shared/lib/format` 등) 수 이하" | `shared/lib/format/index.ts` 200줄(순수 barrel이 아니라 코드를 가짐)을 포함한 104개가 지금. "실코드 barrel 수"가 몇인지 지침서가 적지 않아 기대값이 없음 | **뜻이 달라짐**(판정 기준값 없음) |
| 태스크 8 | "`domains/strategy/form/**`" | 현재 폼 코드 `features/strategy/create-strategy/**`·`reconfigure-vr/**`·`adjust-capital/**`. `form/`이라는 이름은 이 지침서의 새 이름이라 문제 없음 | 일치 |
| 태스크 9 | "`docs/agents/{architecture,entities,features,widgets,app}.md`" | 5개 존재. `shared.md`·`strategy.md`·`finance*.md`·`deployment.md`도 경로 문자열(`entities/…`)을 담는데 목록에 없음(내용은 `git grep`으로 미전수) | 일치 + 누락 |

### 2. 이름이 박힌 가드·테스트·설정

| 위치 | 박힌 이름 | 03의 어느 태스크 |
|---|---|---|
| `tsconfig.json:25-33` | alias `@app/@widgets/@features/@entities/@shared/@testing/@/lib/@/components` | 태스크 7(alias 교체) — 지침서에 있음 |
| `vitest.config.ts:17-23` | 같은 alias 6개를 별도 객체로 중복 선언 | 태스크 7에서 tsconfig만 고치면 vitest가 옛 alias로 남는다(지침서에 vitest.config 언급 없음) |
| `eslint.config.mjs:16-17,74-76` | `runtimeFiles`·`nonRuntimeFiles`·`entities/**/hooks/**`·`app/**`·`app/layout.tsx` | 태스크 7 — 지침서에 있음. 단 `:19`·`:70`의 `getCached*`·`next/cache` 금지는 `runtimeFiles`에 `shared/**`가 없어 shared로 내려가는 코드는 안 걸림 |
| `knip.json:5`, `package.json:19` | `shared/lib/api-types.ts` | 03이 `shared/lib`를 건드리면(미정) 두 곳 |
| `components.json:15-20` | `@/components`·`@/lib/utils`·`@/components/ui`·`@/hooks` alias | 03이 `@/lib/*`·`@/components/*` 유지로 명시했으나 `@/hooks`는 가리키는 디렉토리 `hooks/` 존재 여부를 확인하지 않음(미확인) |
| `app/globals.css:6` | `@source not "../docs"` | 03이 새 최상위 `screens/`·`domains/`를 만들면 Tailwind 자동 탐지가 새 디렉토리를 자동 스캔하므로 영향 없음(문서 디렉토리를 옮기면 이 줄만 확인) |
| 각 디렉토리 `CLAUDE.md`(app, widgets, features, entities, shared, 그 하위 슬라이스 포함 총 23개) | `@../docs/agents/<layer>.md` import | 태스크 9 → 08 |
| `docs/agents/widgets.md:14,20` | 화이트리스트 | 폐지 대상(03 재심표) |
| `playwright.config.ts:4` | 주석 "kista-trading(:8081)도 필수 — dev 서버가 trading 경로(코인 지표 등)를 프록시" | 03과 무관(02·15) |
| `scripts/**`, `e2e/**`, `proxy.ts` | FSD 경로 import 없음(`proxy.ts`는 `@shared/lib/...`만, `git grep -nE "@(entities|features|widgets|shared|app)/" -- e2e scripts proxy.ts`) | `@shared` alias가 유지되므로 영향 없음 |
| `.github/workflows/` | FSD 디렉토리 경로 없음(`git grep -nE "(entities\|features\|widgets\|shared\|app)/" -- .github` = 0) | 없음 |
| `.claude/settings.json`·`.claude/hooks/block-env-local.sh` | 경로 문자열 없음(`grep` 0건) | 없음 |
| 테스트 `vi.mock('@entities/…')` 128곳, `vi.mock(` 전체 350곳 | 모듈 경로 문자열 | 태스크 2(이동 스크립트의 `vi.mock` 치환) |
| `scripts/visual-diff/scenarios.mjs`·`a11y-check/run.mjs` | URL 경로 표(`/finance`, `/admin/*` 등)만. 소스 경로 없음 | 라우트가 안 바뀌므로 영향 없음 |

### 3. 중단 조건·확인 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 24 | "사용자 결정(2026-11-12): 이 구조로의 이동을 승인. 코드 지침서 중 마지막에 전용 worktree에서 실행한다" | 해당 없음(승인 완료) |
| 100 | "다른 세션이 같은 시기에 코드를 고치면 충돌한다. 실행 중에는 다른 세션의 코드 작업을 멈추고, 전용 worktree에서 한다" | 없음(멈춰야 하는데 멈출 수 없을 때의 대안 없음) |
| 102 | "순환 import가 드러날 수 있다 … 이동 후 `npm run build`와 e2e로 확인한다" | 없음(순환이 나왔을 때 어떻게 하는지 미기재) |
| 133 | "순서가 틀렸으면 표를 고치고, 조합이면 screens로 올린다" | 있음 |
| 136 | "01·02·04·05·06이 끝나기 전에 시작하지 않는다" | 없음 |
| 117(태스크 1 판정) | "순서 위반 0건이 되도록 표를 조정" | 있음(표 조정). 조정으로도 0건이 안 되는 도메인이 있을 때 대안 없음 |
| (선행 테스트 3) | "늘어나면 원인을 찾는다" | 없음(찾지 못했을 때의 기준 없음) |

### 4. 서버 선행 조건

03은 서버 태스크를 직접 기다리지 않는다. 간접: 01(api T1·T2: 완료·UI 미반영), 02(api T3·T4·T7·T11, 05 단계 M: 미실행), 05(api T3~T8·T10~T12: 미실행), 06(api T4), 04 태스크 5g·6(T5·T7·T10). 즉 03은 모든 api 선행이 끝난 뒤이므로 api 15(코인 삭제, 단계 U)·api 14 영향 반영 뒤에 시작하는 것이 순서상 안전하다. 현재 api 로드맵은 T3 이후 미실행(`git -C kista-api log --since=2026-11-13`에 T3~T12 feat 커밋 없음, `1915ba682`가 T1·T2뿐).

### 5. 다른 지침서와의 충돌

- **03 ↔ 08**: 03 태스크 9가 "문서·도구 정리 … 08 지침서에 합친다"로 위임. 08 69행은 "레이어 문서 5개(app·entities·features·widgets·shared)는 03 이후 지운다 … `architecture.md`·`ui.md`·도메인 `CLAUDE.md`로 옮긴다", 08 70행은 `copy.md`·`a11y.md`·`react-query.md`를 `ui.md`로 합친다. 03 태스크 9의 문서 목록은 `architecture.md`를 넣고 `shared.md`를 뺐다. 08의 5개는 레이어 문서(app·entities·features·widgets·shared)라 구성이 다르다.
- **03 ↔ 04**: 04 7b가 `docs/agents/a11y.md`에 "폼" 항목을 더하고(`04-routes-and-forms.md:195`) 08 12행이 그것을 `ui.md`로 옮긴다(`08-docs.md:164`). 03은 `a11y.md`의 위치를 `shared/` 소유로 보는지 명시 없음. 순서 04 → 08 12 → 03 9 충돌은 없으나 `ui.md`라는 이름은 03에 한 번도 나오지 않는다(`git grep -n "ui\.md" -- guides/03-layer-structure.md` 0건).
- **03 ↔ 09**: 09 62행 표("다른 지침서가 지우는 것")에 04가 `shared/lib/subviewHistory.ts`·`shared/lib/dismiss.ts`·`@modal/**`·`RouteModal`을 지운다고 적혀 있다. 04 185행과 PROGRESS 묶음 B는 `subviewHistory`를 **남겼다**(FormDialog와 DCA 하위 뷰가 쓴다). 09의 해당 줄이 낡음 — 03 태스크 3이 `shared/lib/subviewHistory.ts`를 이동 대상으로 잡아야 하는지가 걸린다(03은 `subviewHistory`를 언급하지 않음, `git grep -n subviewHistory -- guides/03*` 0건).
- **03 ↔ 11**: 11이 `shared/ui/chart/**`(7절 recharts 예외)·`doctor.config.json`을 정하고 03은 `shared/ui`로 위젯을 올린다. 11 태스크 12가 react-doctor를 지우면 03이 말하지 않는 lint 설정 정리가 겹친다. 같은 `eslint.config.mjs`를 03 태스크 7(경계 규칙)과 11 태스크 12(stub 플러그인·`reportUnusedDisableDirectives` 삭제)가 고친다 — 순서 지정 없음.
- **03 ↔ api 15 / 크립토**: 03 도메인 표의 `market` 행이 `crypto-market-indicators`를 흡수하고 `strategy` 행이 크립토 `trade`·`order`를 흡수한다. api 15가 코인 전체를 지우면 이 표의 행이 낡는다. 03은 코인 언급이 한 곳(`crypto-market-indicators`)뿐(`git grep -niE "crypto|코인|업비트|binance" -- guides/03-layer-structure.md` 1건).
- **03 ↔ 10**: 10이 `/strategies` 병합(D1), `/admin/pending` 병합(D2), 새 화면(스케줄러 수동 실행, D6 등)을 추가한다. 03의 `screens` 약 30개·"한 라우트 전용 27개" 계산은 그 전 수치.

---

## 지침서 04 라우트와 폼

실행 여부: 태스크 0~5c·7(a) 완료(PROGRESS 묶음 B·C). 남은 것: 5d, 5e, 5f, 5g, 6, 7(b)(c). 아래는 남은 태스크 위주이고, 완료된 태스크의 낡은 서술(1절 현재 구조 등)은 측정하지 않았다.

### 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 코드 | 판정 |
|---|---|---|---|
| 5d 대상 | "`shared/ui/FormActions.tsx`, `features/finance/{save-transaction,manage-accounts,manage-categories,manage-budgets,manage-group}/**`, `features/asset/save-asset/AssetForm.tsx`, `features/account/edit-account/CredentialsCard.tsx`" | 모두 존재. `canSubmit`이 걸린 곳(`git grep -n canSubmit -- '*.tsx' '*.ts' ':!*test*'`): `CredentialsCard.tsx:37,59`, `AssetForm.tsx:94,99,167`, `AccountFormDialog.tsx:121`, `BudgetForm.tsx:93,96,155`, `CategoryFormDialog.tsx:115`, `TransactionFormDialog.tsx:102,105,162`, `FormActions.tsx:17,27,39`. `manage-group`에는 `canSubmit`이 없다 | 일치(대상 일부는 이미 없음: manage-group) |
| 5d 완료 판정 | "`grep -rn "canSubmit" --include='*.tsx' app features widgets shared \| grep -v test` 0건(전략 폼은 04-6 전까지 `locked={form.cannotSubmit}`로 이름만 옮긴다)" | 지침서가 언급하지 않은 `canSubmit` 사용처가 더 있다: `features/strategy/create-strategy/DcaStrategyForm.tsx:211`(`canSubmit={!pending}`), `features/strategy/create-strategy/sections/DcaRuleEditor.tsx:59`(`canSubmit` 생략 불리언 true), `features/strategy/reconfigure-vr/ReconfigureVrForm.tsx:151`(`canSubmit`), `StrategyForm.tsx:194`(지침서가 언급). 앞 3곳은 5d 대상 목록에도 이름 바꿈 문장에도 없다 | **뜻이 달라짐**(성패 갈림: 지침서대로 하면 판정 grep이 3건 남아 0건이 되지 않음) |
| 5d | 비활성 제출 버튼으로 막던 조건을 zod 필수·형식 오류로 | 묶음 C 04-5a가 이미 `onSubmit={(e) => (canSubmit ? form.submit(e) : e.preventDefault())}` 가드로 Enter 제출까지 막았다(`TransactionFormDialog.tsx:105`, `BudgetForm.tsx:96`, `AssetForm.tsx:99`). 5d는 이 `canSubmit` 가드 자체를 지우는 일이 된다(PROGRESS 04-5a 문장: "비활성 제출 버튼으로만 막던 조건은 `onSubmit` 가드로 Enter 제출도 막는다(리뷰 지적)"). 지침서 5d는 "버튼만 막는다"고 전제 | **뜻이 달라짐**(지금은 버튼과 Enter 둘 다 가드, 5d가 되돌리는 것임을 문장이 안 말함) |
| 5d·5f 영향 테스트 | (언급 없음) | 제출 버튼 비활성을 단언하는 테스트: `features/finance/manage-budgets/BudgetForm.test.tsx`(2), `features/asset/save-asset/AssetForm.test.tsx`(3), `features/account/edit-account/EditAccountForm.test.tsx`(3), `features/account/create-account/steps/AccountInfoStep.test.tsx`(2), `ApiStep.test.tsx`(3)의 `toBeDisabled`. `features widgets shared` 전체 `toBeDisabled` 27파일 66건(전부 제출 버튼은 아님) | 지침서에 없음(영향 범위 누락) |
| 5e | "`features/admin/settings/**`, `AdminSettingsForm`, `activatesPendingUsersRef`, `setStrategyField`, `validateAdminSettings`" | `features/admin/settings/ui/AdminSettingsForm.tsx` 331줄, `:101 activatesPendingUsersRef`, `:136 setStrategyField`, `:132 validateAdminSettings`, `model/validateAdminSettings.ts:30` 모두 있음 | 일치 |
| 5e 완료 판정 | "`grep -n "useState" features/admin/settings/ui/AdminSettingsForm.tsx`가 펼침 상태 1건뿐" | 지금 `useState` 4건(`:47 open`, `:92 draft`, `:94 prevSettings`, `:100 attempted`)과 `useRef` 1건 | 일치(미실행) |
| 5e 선행 | "편집 후 저장하면 나가는 요청 바디 단언을 전환 전에 고정" | 기존 테스트: `AdminSettingsForm.test.tsx`, `AdminSettingsForm.lifecycle.test.tsx`(`:93-95`에서 `setQueryDefaults`로 queryFn 대체) — 요청 바디 단언 유무 미확인 | 미확인 |
| 5f 대상 | "`features/account/create-account/**` … `useReducer`·단계별 `useState`·`touched*` … `useTestKisConnectionMutation`" | `CreateAccountStepper.tsx`(97줄) `:3,74 useReducer`. `touched*`는 `steps/AccountInfoStep.tsx:54-55`, `steps/ApiStep.tsx:77,90`(reducer 안). `useTestKisConnectionMutation`은 `steps/ApiStep.tsx:6`. 단 **ApiStep이 `UPBIT`·`BINANCE` 항목(`:42,53`)과 KIS 연결 테스트를 담는다**. api 04 단계 A(KIS 삭제)와 15(코인 삭제)가 이를 지운다(`cross-repo.md` G1: "계좌 등록의 업비트·바이낸스 선택과 허용 IP 안내"). `AccountInfoStep.tsx:6,59,85`도 `isCryptoBroker`·UPBIT·BINANCE 분기 | **뜻이 달라짐**(성패 갈림: 5f가 전환할 단계 구성이 api 04·15 뒤에 달라진다. 지침서에 순서 문장 없음) |
| 5f 완료 판정 | "`grep -rnE "useReducer\|touched" features/account/create-account --include='*.tsx' \| grep -v test` 0건" | 지금 `useReducer` 2파일(`CreateAccountStepper.tsx`, `ApiStep.tsx`), `touched*` 2파일. 대상 맞음 | 일치(미실행) |
| 5g | "`MAP_SERVER_FIELD_ERRORS` 삭제, 배열 경로 변환, `root.server`와 `FormActions` 표시, 첫 필드 포커스" | `shared/ui/form/useAppForm.ts:11` `export const MAP_SERVER_FIELD_ERRORS = false`, `:59-60`에서 `form.setError(field, …)`. 배열 경로 변환·`root.server`·포커스는 코드에 없음(`git grep -n "root\.server\|orders\.0" -- shared/ui` 0건). `FormActions`에 `fieldErrors`용 표시 없음 | 일치(미실행) |
| 5g 전제 | api `detail` 요약 규약 | `git grep -c "fieldErrors" shared/lib/api-types.ts` = 0. 현재 api 타입에 `fieldErrors`가 없어 `serverFieldErrors`(`useAppForm.ts:14-20`)는 `err.body.fieldErrors`를 타입 없이 읽는다. api T7 미실행 | 일치(대기) |
| 5g ↔ PROGRESS | "T7 뒤 켤 때 할 일: 필드에 붙은 오류를 hook 토스트가 또 띄우지 않게 hook `onError`도 고친다"(PROGRESS 묶음 C 04-4) | 지침서 04 "서버 오류의 분담"은 "실패 토스트는 02의 전역 `onError`가 **항상** 띄운다 … `fieldErrors`가 있어도 건너뛰지 않는다"로 정리됨(묶음 C 질문 답변 뒤 갱신, 커밋 `e9e1000e`). PROGRESS 기록은 구버전 서술 | **뜻이 달라짐**(PROGRESS와 지침서 04가 반대 방향. 실행 세션은 PROGRESS 먼저 읽으라는 순서라 오해 가능) |
| 6 | "`StrategyForm.tsx` 200 + `model/useStrategyForm.ts` 278, `DcaStrategyForm.tsx` 215 + `dcaFormSchema.ts` 187, `strategyFormGuards.ts` 200, `vrDerived.ts` 84, `useTypeDefaults.ts` 70" | 줄 수 모두 일치(`wc -l`) | 일치 |
| 6 | "`create-strategy` 33파일 3,094줄·테스트 6,663줄" | 지금 62파일(비테스트 36 = 3,181줄, 테스트 4,328줄). 파일 수·줄 수가 다르다(묶음 A·C의 테스트 전환 영향 가능, 원인 미확인) | 수치만 다름 |
| 6 | "`useStrategyForm.ts`가 자기만 쓰는 hook·헬퍼 9개 파일을 조립(`:13-22`)" | 파일 `useStrategyForm.ts:13-22`에서 `useStrategyFormData`·`useSeedModel`·`vrDerived`·`strategyFormGuards`·`buildStrategyPayload`·`useTypeDefaults`·`strategyFormHelpers`·`useStrategyFormEffects`·`strategyFormSchema` 9개 import | 일치 |
| 6 | "`RAMP_DEFAULTS_BY_MODE`" | `entities/strategy/model/vrRamp.ts:34` 정의, `entities/strategy/index.ts:37` 재수출, `features/backtest/run-backtest/model/useBacktestForm.ts:10`이 소비(지침서는 `create-strategy`만 언급) | 일치 + 소비처 추가 |
| 6 | "`ReconfigureVrSections`의 섹션 제목 '(선택)' 2건" | `features/strategy/reconfigure-vr/ReconfigureVrSections.tsx:108`("투자금 추가 (선택)"), `:138`("투자금 인출 (선택)") | 일치 |
| 6 완료 판정 | "`grep -rnE "\((선택\|필수)\)" --include='*.tsx' app features widgets shared \| grep -v test`가 주석 외 0건" | 위 2건 + `shared/ui/ShareableRowActions.tsx:103`(주석, 제외 대상) | 일치 |
| 6 선행 테스트 1 | "종류별(INFINITE, PRIVACY, VR 3모드, **DCA 주식·크립토**, 등록·수정)" | 크립토 DCA 사례가 포함돼 있다. api 15가 코인 DCA(BTC·ETH) 전체를 삭제한다. `git grep -nEi "crypto|upbit|binance|executionHour|USDT" -- features/strategy ':!*test*'` features/strategy만 64줄, 같은 패턴을 features/account·widgets·entities·shared·app까지 넓히면 63파일 | **뜻이 달라짐**(성패 갈림: 크립토 케이스를 만들면 곧 지울 코드를 고정) |
| 7(b) | "`docs/agents/a11y.md`에 '폼' 항목으로 추가" | `git grep -n "폼\|useAppForm" -- docs/agents/a11y.md` 0건 → 아직 없음(지침서가 "5d와 같은 커밋"). `docs/agents/shared.md:91`에는 `form/useAppForm`+`FormField`+`FormActions` 항목이 이미 있다 | 일치(7c는 이미 일부 반영) |
| 7(c) | "`docs/agents/shared.md`의 `form/useAppForm` 항목" | `shared.md:91` 존재, `:111`에 폼 제출 버튼 위계 서술 | 일치 |
| 1절 | "`/finance/new` 예 … 폼 라우트가 10개 777줄" | 묶음 B가 삭제함(`@modal` 전체 삭제). 낡은 서술 | 대상 없음(기록용) |
| 목표(다이얼로그) | "닉네임" | PROGRESS 04-1: 닉네임은 다이얼로그가 아니라 인라인 편집(지침서 표 "닉네임"이 낡음) | 뜻이 달라짐(기록용) |
| 4절 선행 4 | "`npm run a11y-check`의 다이얼로그 점검이 `FormDialog` 사용처에서 통과" | `scripts/a11y-check/run.mjs:41-45` `FORM_DIALOGS` 표가 있고 `투자금 추가`·`예산 추가`만 점검. 묶음 C가 옮긴 가계부 거래내역·재무계좌·카테고리·관리자 개인정보 폼 다이얼로그는 이 표에 없다(사용 안내문 `--skip axe,tab,dialog,modal`의 `modal`은 낡음) | 일치 + 점검 범위 좁음 |

### 2. 이름이 박힌 가드·테스트·설정

| 위치 | 박힌 이름 | 04의 어느 태스크 |
|---|---|---|
| `scripts/a11y-check/run.mjs:41-45`(`FORM_DIALOGS`), `:36-39`(`DIALOG_PAGES`: `/finance/settings`, `/admin/settings`…) | `button:has-text("투자금 추가")`, `"예산 추가"` 트리거 셀렉터와 경로 | 5d(버튼 활성 규칙)·5e(`/admin/settings` 화면)·5f(`/accounts/new` = `WIZARD`, `:23`) — 화면 구조가 바뀌면 셀렉터 재확인 |
| `scripts/a11y-check/README.md`, `scripts/visual-diff/scenarios.mjs` | 설정·계좌 등록·전략 폼 시나리오(`NEW_STRATEGY`, `KIS_NEW_STRATEGY`, `adminCascade`) | 6(전략 폼 통합), 5f. 시나리오의 `pickVr`(`/밸류리밸런싱/`)·`openAdvanced`('고급 설정' summary)는 섹션 구조 의존 |
| `e2e/ledger-budget.spec.ts:25-35` | `getByLabel('예수금 (USD)')`, `getByRole('button',{name:'등록', exact:true})`, `toBeEnabled()` | 6, 5d(라벨 `*` 표기·버튼 문구 `{label} 중…`이 접근 이름을 바꿀 수 있음. 묶음 C가 `*`를 `aria-hidden`으로 뺐다고 적음) |
| `eslint.config.mjs:19-27` | 폼과 무관(`getCached*`, `initialDataUpdatedAt`, `" \| KISTA"`) | 해당 없음 |
| `docs/agents/app.md` | 인터셉트 문단 삭제 완료(PROGRESS 04-3). 남은 `@modal` 문자열 1건(`git grep -c "@modal" -- docs/agents` = app.md 1) | 7(a)는 "완료"로 적혀 있는데 `@modal` 문자열이 아직 1건 남아 있음(내용 미확인) |
| `docs/agents/shared.md:91,111`, `copy.md`(제출 중 문구 `…`) | `FormActions`·`useAppForm` 서술, "저장 중..." 표기 | 5d·5g·7(c) |
| `features/strategy/create-strategy/*.test.tsx` 외 `useStrategyForm.test.ts`·`useStrategyFormData.test.ts`·`strategyFormGuards.test.ts` 등 | `useStrategyForm` 반환 필드 | 6(전략 폼 통합) |
| `testing/mockApi.ts` | 묶음 C가 폼 테스트를 `mockApi`·`renderApp`으로 옮김 | 5d~6 테스트 갱신은 이 무대를 쓰면 됨 |
| `shared/ui/FormActions.tsx:17,27,39` | prop 이름 `canSubmit` | 5d(`locked`로 개명) — 소비처 13곳 이상 |

### 3. 중단 조건·확인 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 5 | "결정 1(인터셉트 라우트 폐지)은 2026-11-12 사용자가 승인했다" | 해당 없음(승인 완료) |
| 70 | "승인되지 않으면(인터셉트 쌍 유지): …" | 기록용(승인됨) |
| 165 | "모바일 전체 화면 시트에서 이것이 문제인지 실기기로 확인한다 … 문제면 `FormDialog`가 열릴 때 이력 항목을 하나 쌓고" | 있음(대체 구현은 이미 반영됨, 실기기 확인은 PROGRESS "미검증") |
| 166 | "memory의 미해결 Bug B(실기기 필요)가 전체 화면 레이어와 관련 있을 수 있다. … 실기기에서 키보드가 올라온 상태로 확인한다" | 없음 |
| 167 | "다이얼로그로 가는 폼에 같은 흐름이 있는지 태스크 1에서 전수 확인한다" | 완료(태스크 1) |
| 175 | "실기기 확인 목록(Playwright CLI로 모바일 뷰포트 스크린샷 + 사용자 실기기)" | 없음(PROGRESS "미검증"에 이월됨) |
| 191(5e) | "서버값이 바뀔 때 '편집 중이면 초안 전체 보존'이 '편집한 필드만 보존'으로 바뀐다(허용)" | 해당 없음(사용자 승인 2026-11-13) |
| 191(5e) | "선행: '편집 후 저장하면 나가는 요청 바디' 단언을 전환 전에 고정" | 없음(고정하지 못하면 어떻게 하는지 없음) |
| 193(5g) | "api T7과 02 완료 뒤" | 없음(그 전에는 멈춘다 외 없음. `MAP_SERVER_FIELD_ERRORS = false`가 대체 동작) |
| 197 | "태스크 6은 05 지침서(서버 규칙 사본 제거)와 api 지침서 10의 T5(메타 기본값)·T7(`fieldErrors`) 뒤에 한다. 그 전에 하면 지울 코드를 새 구조로 옮기게 된다" | 없음 |
| 199 | "5d의 버튼 동작 변경과 5e의 필드 단위 보존은 사용자가 승인했다(2026-11-13)" | 해당 없음 |
| 168 (위험 "서버 `fieldErrors`가 없으면") | "api 지침서 10의 T7 전에는 필드 매핑을 꺼 두고 … 실패는 `detail` 토스트로만 알린다" | 있음 |
| 위험 | "전략 폼은 주문 금액을 만든다. … Opus가 맡는다" | 해당 없음 |

### 4. 서버 선행 조건

| 태스크 | 기다리는 것 | 현재 상태 |
|---|---|---|
| 5d, 5e, 5f | 없음 | 가능. 단 5f는 api 04 A(KIS 삭제)·15(코인 삭제)와 순서 충돌(5절) |
| 5g | api T7(`fieldErrors` + 요약 `detail`), ui 02(전역 `onError`) | api 미실행: `git -C kista-api log`에 T7 feat 커밋 없음, 스펙에 `fieldErrors` 0건. api T7의 선행 05 P1은 끝남(`10-ui-contract.md` 8절 "T7의 선행(05 P1)도 끝났다"). 02 미실행 |
| 6 | api T5(메타 기본값·VR 램프 기본값표 이관), T7, T10(검증 전용 엔드포인트 `trading-cycle-validations`), ui 05 | T5는 root 안에서 끝나는 부분만 지금 가능, trading-core 값 이관은 05 단계 M 뒤(`10-ui-contract.md` 8절). T10 미실행: `git grep -c "trading-cycle-validations" shared/lib/api-types.ts` = 0, 기존 `strategy-seed-preview`만 있다(`api-types.ts:2157`). 스펙에 `allowedActions`·`blockedActions` 없음(`warnings?: string[]`만 `:3506`) |
| 6 | api T10의 "`derived`에 넣는 값" 범위 | api 8절 보정: "kista-ui 지침서 05가 요구한 목록에 있을 때만 더한다. 목록을 확인할 수 없으면 더하지 않는다" — 05가 그 목록을 명시했는지 05 절에서 확인 |

### 5. 다른 지침서와의 충돌

- **04 ↔ 09**: `09-unused-files-and-deploy.md:62`가 04가 지우는 것으로 `shared/lib/subviewHistory.ts`·`dismiss.ts`·`@modal/**`·`RouteModal`을 적었고, `:24`(A4)는 `subviewHistory`의 `pushSubviewEntry`·`SUBVIEW_HISTORY_KEY`를 죽은 심볼로 본다. 04 185행·PROGRESS는 `subviewHistory`를 **남긴다**(`FormDialog`와 DCA 하위 뷰가 쓴다). 09 A4의 두 심볼은 `shared/lib/subviewHistory.ts:9,16` 안에서만 쓰이고 파일 밖 사용처는 0건(`git grep -n "pushSubviewEntry\|SUBVIEW_HISTORY_KEY" -- "*.ts" "*.tsx"` 필터 후)이라 "죽은 export"라는 판정 자체는 맞을 수 있다. 문제는 09 62행의 "파일 삭제" 서술이 04와 어긋나는 것.
- **04 ↔ 03**: 03 규칙 3("한 곳만 쓰는 hook은 그 파일에")와 04 태스크 6의 "9개 파일을 흡수"는 같은 방향. 04 표의 "화면 컴포넌트(03의 `screens/`)"는 03 이후 용어라 03보다 먼저 실행하는 04 6에는 `screens/`가 없다(`ls screens` 없음) — 04 6은 지금 `widgets/`·`features/` 위치 기준으로 해야 함.
- **04 ↔ 05**: 6이 05 뒤. 05가 지울 `strategyFormGuards.ts`·`vrDerived.ts`는 04 표에 감량 약 350줄로 겹쳐 계산(04 본문이 인정).
- **04 ↔ 02**: 앞 절(02)에서 적은 대로 `$api.useMutation`·`MutationCache` `onError`와 04 5g의 분담은 지침서 사이에서는 일치, PROGRESS 기록과는 불일치.
- **04 ↔ 08**: 08 164행(태스크 12)이 04 7b를 `ui.md`로 옮긴다. 04 7(b)가 먼저 `a11y.md`에 넣어야 08 12가 할 일이 생긴다. 지금 `a11y.md`에 "폼" 항목이 없음 → 04 5d가 7(b)를 안 하면 08 12가 빈손.
- **04 ↔ 10**: 10이 `/strategies` 병합(D1)·삭제 실행 취소(D14)·CSV(D13) 등을 폼·다이얼로그에 추가한다. 04 폼 판정 기준·`FormDialog` 규칙이 새 화면에 적용되는지는 10의 태스크 쪽에서 확인 필요.
- **04 ↔ 11**: 11 `FormDialog`·`useAppForm`을 "04 소관"으로 표에 넣음(`11-uncovered-areas.md:14`). 충돌 없음.
- **04 ↔ api 04·15(KIS·코인 삭제)**: 위 1절의 5f, 6 선행 테스트 1. 04에는 `grep -niE "crypto|코인|upbit|binance|kis"`로 찾은 크립토 언급이 "DCA 주식·크립토" 한 줄뿐(선행 테스트 1)이고 KIS 언급은 없다.

---

## 지침서 05 UI·API 책임 분담

실행 여부: 태스크 1~11 모두 미실행(지침서 8행 "이 지침서의 태스크는 전부 서버 변경이 먼저다"). 서버 T3~T12는 api에서 미실행. 그래서 지금 실행할 수 있는 태스크가 없다. 아래는 전제 대조.

### 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 코드 | 판정 |
|---|---|---|---|
| 현재 구조 | `FinanceRecordList.tsx:102-139`, `AssetRecordList.tsx:68-119`, `StrategyOrderHistory.tsx:46-59`, `DcaExecutionHistory.tsx:56-63` | 네 파일 모두 존재(331·273·202·202줄). `FinanceRecordList.tsx:93,104,117,124`에 `useTableSort`·기간 `filter`·정렬 `useMemo`가 있어 위반 위치는 맞다. `DcaExecutionHistory.tsx`의 "페이지 단위 정렬" 주석은 `:55`(1줄 위) | 수치만 다름(줄 번호 1~몇 줄) |
| 〃 | `entities/finance/lib/aggregate.ts` 271, `flowAggregate.ts` 296, `bulkRegisterPreview.ts` 162, `period.ts` 146 | `wc -l` 271·296·162·146 정확히 일치 | 일치 |
| 〃 | `strategyFormGuards.ts` 200, `vrDerived.ts:36-84`, `dcaFormSchema.ts`의 `MAX_DCA_RULES`("kista-api 상한과 동일") | 200줄·84줄, `dcaFormSchema.ts:9` `MAX_DCA_RULES = 10 // kista-api 상한과 동일` | 일치 |
| 〃 | `order-readiness.ts` 64, `capitalAdjustment.ts`, `scheduled-start.ts`, `apiKeyExpiry.ts` | 64줄, 13줄, 17줄, 26줄. `capitalAdjustment.ts:8`에 `floorToCents`도 있다 | 일치 |
| 〃 | `entities/user/model/status.ts`·`role.ts` 50, `orderBannerCopy.ts:5-12`, `vrRamp.ts:1-9`, `api-schema.ts:52-114` | 44+6=50, `orderBannerCopy.ts:5-12` `SKIP_REASON_LABELS`, `vrRamp.ts:1-9` `VR_RECURRING_MODE_LABEL`, `api-schema.ts`(114줄) `BROKER_MARKET:58` `CURRENCY_SCALE:98` | 일치 |
| 〃 | "`apiMsg(err, '…')` 폴백 문구 약 31개" | `git grep -n "apiMsg(" -- '*.ts' '*.tsx' ':!*test*' \| wc -l` = 32 | 수치만 다름 |
| 〃 | `brokerCredentials.ts:16-30` | 파일 29줄. `BROKER_ERROR_MESSAGE`는 `:14` 부근부터. 단 `BROKER_CREDENTIAL`에 `KIS`·`UPBIT`·`BINANCE` 항목 3개가 있다(api 04·15가 지운다) | 수치만 다름 + 코인·KIS 대상 |
| 〃 | `vr-rollover.ts`("VrCycleRolloverService의 dueDate와 동일 규칙"), `dcaFormat.ts:73-93` | `vr-rollover.ts:2-3` 주석 일치. `dcaFormat.ts:73-93`은 `earliestNextExecution`·`latestLastExecution`(서버 값 중 고르는 표시 코드) | **뜻이 달라짐**(PROGRESS 지침서 10 D10 4차: "`dcaFormat.ts:73-93`은 서버 값 중 고르는 표시 코드라 05에서 대상에서 뺀다(다음 Fable 세션)". 05는 아직 `:77` 7절과 현재 구조 표에서 "지운다"로 적혀 있음 — 반영 전) |
| 〃 | "부수 발견: PRIVACY 목록에서 UI가 `?days=`를 보내는데 서버는 `range`" | 같은 지침서 `:118`이 정정("`days`를 넘기는 호출부가 없었다")하고 PROGRESS 74행이 죽은 인자 삭제를 기록. `git grep -n "days" -- entities/privacy` = 0건. 현재 구조 절 문장이 낡음 | 대상 없음(정정 문장과 충돌: 같은 문서 안) |
| 목표 5 | "`/api/runtime-config` 전략 기본값·허용값이 메타로 합쳐진다. `deriveRuntimeFields`, `isRuntimeValueInvalid`" | `strategyFormHelpers.ts:64 deriveRuntimeFields`, `strategyFormGuards.ts:63 isRuntimeValueInvalid` 존재. `entities/runtime-config/{api,hooks,index.ts,model}` 존재 | 일치 |
| 목표 5 | "사용자 상태 라벨 … 본인 화면 '반려', 관리자 화면 '거절'(`status.ts`의 '의도적으로 다름')" | `USER_STATUS_LABEL`·`ADMIN_USER_STATUS_LABEL`이 `entities/user/model/status.ts:7,17`, `entities/user/index.ts:10-11`에 있고 `widgets/admin-user-list/AdminOverviewContent.tsx:7`이 쓴다. `docs/agents/copy.md:9` 예외 문장 있음 | 일치(결정 2는 이미 확정, 코드 미반영) |
| 목표 2 | "`period.ts`의 `windowRange`, `financeKeys.transactions(from, to)`" | `entities/finance/model/queryKeys.ts:24` `transactions: (from, to)`, `entities/finance/lib/flowAggregate.ts:9` 주석·`useFinanceQueries.ts:33`에서 `windowRange` 언급 | 일치 |
| 목표 9 | "UI의 KIS 전용 약 40줄, 업비트 전용 약 30줄과 테스트·픽스처 참조 38파일" | `git grep -lE "'KIS'\|'UPBIT'\|\"KIS\"\|\"UPBIT\"" -- '*.ts' '*.tsx' '*.mjs' \| grep -v api-types \| wc -l` = 37파일. `KIS\|UPBIT\|Upbit\|업비트` 넓게 = 87파일. 그리고 이 절은 **바이낸스를 말하지 않는다**(`git grep -n "BINANCE\|바이낸스" -- guides/05*` 0건). api 15(코인 삭제)는 업비트·바이낸스·ETH·BTC 전부 삭제를 결정 | **뜻이 달라짐**(성패 갈림: 05 태스크 9의 삭제 범위가 KIS·업비트뿐인데 서버는 코인 전체를 지운다. 바이낸스·`isCryptoBroker`·크립토 DCA 분기는 어느 지침서도 UI 쪽 삭제 태스크를 갖고 있지 않다) |
| 태스크 9 완료 판정 | "`grep -rnE "'KIS'\|'UPBIT'" --include='*.ts*' . \| grep -v api-types` 0건" | 지금 87줄(비테스트 4줄, 나머지 테스트). 이 grep은 `*.mjs`(`scripts/shared/seed.mjs` 24건, `scripts/visual-diff/**`, `a11y-check/run.mjs`)와 `app/pending/page.tsx:16`("KIS API 자격증명 입력", 따옴표 없는 문구)을 못 잡는다. 10 지침서 121행이 이미 이 구멍을 지적(`grep -rn "KIS" app/pending`을 더하라)했는데 05에 반영되지 않음(PROGRESS: "아직 05를 고치지 않았다") | **뜻이 달라짐**(판정이 샌다) |
| 태스크 9 | `findings/j` 13절 목록 | 지금 KIS 시드를 쓰는 스크립트: `scripts/shared/seed.mjs`(`KIS`·`KIS_PAUSED` ID, `seed.kis`), `scripts/a11y-check/run.mjs`·`scripts/visual-diff/scenarios.mjs`(`KIS_NEW_STRATEGY`, `seed.kis`), `e2e/ledger-budget.spec.ts:12`(`a.broker === 'KIS'`)·`e2e/global.setup.ts`. KIS 삭제 뒤엔 로컬 시드에서 `paused` 전략의 계좌가 사라진다 | 일치 + 누락(스크립트·e2e 시드가 KIS 계좌에 의존) |
| 태스크 1 완료 판정 | "`grep -rnE "_LABEL\b" --include='*.ts*' . \| grep -v test`가 표시 형식 맵만 남음" | macOS `git grep -E`에서 `\b`가 안 먹는다. 풀어 쓴 `_LABEL([^A-Za-z_]|$)`는 비테스트 65줄. "표시 형식 맵만 남음"의 기대값이 숫자가 아님 | **뜻이 달라짐**(판정 기준 숫자 없음, 명령은 환경에서 0건으로 오판 가능) |
| 태스크 4 | "`grep -rn "apiMsg(" … \| wc -l`이 전역 처리 1곳" | 지금 32. 02의 전역 `onError`와 같은 목표 | 일치(미실행) |
| 태스크 5 | "`grep -rn "useClientPagination" .` 0건" | 소비 `widgets/admin-trade-list/AdminTradesWorkbench.tsx:4,87`, `widgets/admin-user-list/AdminPendingList.tsx:12`, `AdminUsersTable.tsx`, 정의 `shared/lib/hooks/use-client-pagination.ts:9`. 정의 파일과 테스트 파일까지 `.`을 grep하므로 정의·테스트도 지워야 0 | 일치 |
| 태스크 10 | "`grep -rn "localStorage" features/auth` 0건" | `ReapplyButton.tsx:16,30`, `RejectedReapplyButton.tsx:27,39` + 테스트 2파일에 `localStorage` 다수(`ReapplyButton.test.tsx:20,37,52,56` 등). 판정이 테스트까지 포함하므로 테스트 갱신 필요 | 일치 |
| 태스크 10 | "`shared/lib/indicators.ts`, `widgets/dashboard/MarketChartCardInner.tsx`" | 37줄(`indicators.ts`), `MarketChartCardInner.tsx:7`에서 `rsi, sma` import | 일치 |
| 태스크 7 | "`entities/trade/hooks/useDailyTradesRangeQuery.ts`" | 67줄, 존재 | 일치 |
| 상태 판정 | "`canWithdrawCapital`·`supportsCapitalAdjustment`" | 소비 `widgets/strategy-detail/StrategyDetailContent.tsx:7,66,71`. 묶음 B가 만든 `FormDialog` 연동이 이 두 조건 위에 있다(PROGRESS 04-3: 변이 확인 2건) | 일치(미실행) + 묶음 B 테스트가 이 조건에 의존 |
| 태스크 2 | `features/strategy/create-strategy/model/{useTypeDefaults,strategyFormHelpers}.ts`, `features/admin/settings/**`, `ls entities/runtime-config` 없음 | 모두 존재 | 일치 |
| 서두 | "서버 변경 없이 UI만 지울 수 있는 것은 없다" | 10 지침서 B1(02 태스크 6)·B2(05 4절, 태스크 3)·B3(05 태스크 9 판정)가 05에 한 줄씩 더하라고 적혀 있다(`10-feature-review.md:258-260`). 05는 B2 규칙("지원하는 동작은 항상 보이고 못 하면 비활성 + 사유")·B3(`/pending` 문구)를 아직 안 담음(`git grep -n "B2\|B3\|지원하는 동작은" -- guides/05*` 0건) | **뜻이 달라짐**(05만 읽고 실행하면 10의 보강이 빠진다) |

### 2. 이름이 박힌 가드·테스트·설정

| 위치 | 박힌 이름 | 05의 어느 태스크 |
|---|---|---|
| `docs/agents/copy.md:9` | "`USER_STATUS_LABEL`(본인 화면, R…) 의도적으로 분리된 용어" | 결정 2·태스크 1(문장 삭제) |
| `docs/agents/finance.md`, `finance-widgets.md`, `docs/agents/shared.md`, `entities.md`("stats cycles", "runtime-config") | 12개월 윈도우 키, `staleTime: 0` + focus refetch, `cycles` 번호 페이지네이션(`git grep -n "12개월\|windowRange" -- docs/agents` 3건) | 05 재심표. 태스크 목록에 문서 갱신 없음(08에 맡김, 05의 판정에는 없음) |
| `scripts/shared/seed.mjs`(KIS 24건), `scripts/visual-diff/{scenarios,fixtures/api,fixtures/trading,run}.mjs`, `scripts/a11y-check/run.mjs`, `e2e/{global.setup,ledger-budget,strategy}.spec.ts` | KIS·UPBIT·BINANCE 시드·브로커 문자열 | 태스크 9(`--include='*.ts*'`가 `.mjs`를 못 잡음) |
| `scripts/visual-diff/fixtures/api.mjs:43-46` | `limits = { UPBIT: …, BINANCE: … }` 메타 보강 | 태스크 1·9(`brokers[]` 정적 맵 삭제 시 이 목 응답도 따라 바뀜) |
| `scripts/visual-diff/fixtures/trading.mjs:14,19` | `priceOffsetRate: '10.0'`, 문자열 숫자 목 | 01과 같은 구멍 |
| `eslint.config.mjs`·`tsconfig.json`·`knip.json` | 05 대상 경로 문자열 없음(`git grep -nE "order-readiness|capitalAdjustment|apiKeyExpiry|aggregate" -- eslint.config.mjs knip.json tsconfig.json` 0건) | 없음 |
| `entities/meta/model/types.ts:9,66` | 주석 "1h 메타 캐시가 이 키보다 오래됐을 수 있어 optional" | 태스크 1(api 10 8절 보정: "메타 응답은 서버에서 캐시하지 않는다") — 낡은 전제 |
| `widgets/strategy-detail/orderBannerCopy.ts`, `NextOrderCard.tsx:53`(`getUnplacedDirections`가 `readiness` 사용) | `OrderReadiness`·`SKIP_REASON_LABELS` | 태스크 1·3 |
| `testing/mockApi.ts`, `entities/strategy/model/fixtures.ts`(묶음 A 빌더, `nextOrderPreview` 등) | 응답 모양을 `paths`·생성 타입으로 고정 | 05가 응답을 바꾸면(서버 필드 추가) 빌더도 같이 바꿔야 한다 — 05는 빌더 존재를 모름 |
| `.claude/hooks`, `.github/workflows` | 05 대상 문자열 없음 | 없음 |

### 3. 중단 조건·확인 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 8 | "이 지침서의 태스크는 전부 서버 변경이 먼저다. 서버 변경 없이 UI만 지울 수 있는 것은 없다" | 없음(서버가 안 오면 05 전체가 멈춤. 일부 태스크가 지금 가능한지 판정 없음) |
| 99~ | "dry-run 대신 메타에 규칙을 선언형으로…(기각)" | 해당 없음 |
| 138 | "서버가 필드를 추가하는 변경은 서버 먼저 배포하고 UI가 뒤따르면 된다. 봉투·페이지 형식 변경과 `/api/runtime-config` 이관은 같은 날 배포해야 한다" | 없음(같은 날 배포가 불가능할 때의 순서 없음) |
| 139(위험 집계) | "서버 집계가 지금 UI 계산과 다른 값을 내면 … 선행 테스트 1번으로 대조한다" | 있음(차이 0이 될 때까지) |
| 141 | "메타를 못 받으면 폼을 그릴 수 없다. … 실패 시 화면 전체 오류로 처리한다" | 있음 |
| 142 | "`computeOrderReadiness` 제거는 주문 버튼 노출에 직결된다 … 선행 테스트 2번으로 확인한다. Opus가 맡는다" | 있음 |
| 161 | "(가계부 → 전략 주문·체결·이력 → 관리자), 서버와 같은 날 배포" | 없음 |
| 173 | "결정 2: REJECTED 라벨은 '반려'로 통일한다" | 해당 없음(확정) |
| 178 | "서버 변경이 배포되기 전에 UI 사본을 먼저 지우지 않는다" | 해당 없음(하지 말 것) |
| 180 | "메타에 없는 코드값을 만나면 UI에 라벨을 임시로 넣지 않는다 … 서버에 알린다" | 있음(서버에 알림). 알리는 방법(어느 파일)은 미기재 |
| 147 | "UI에만 있는 규칙이 나오면 서버에 추가를 요청한다" | 있음 |

### 4. 서버 선행 조건

| 태스크 | 기다리는 것 | 현재 상태 |
|---|---|---|
| 1 | api T5(메타 확장) | 미실행. api 8절 보정: root 안에서 끝나는 부분(enum 라벨·설명, `userStatuses` REJECTED "반려", `/api/runtime-config`의 root 소유 값, 가드)은 지금 가능, trading-core 소유 값(VR 램프 기본값표)은 05 단계 M 뒤 |
| 2 | api T5 | 위와 같음. `entities/runtime-config`를 지우려면 trading-core 값 이관(05 M 뒤) 필요 |
| 3 | api T6(`allowedActions`·`blockedActions`·`apiKeyExpiry`·`warnings`) | 미실행. 스펙에 `allowedActions`·`blockedActions` 0건(`git grep -c "allowedActions" shared/lib/api-types.ts`), `warnings?: string[]`는 `api-types.ts:3506`에 이미 있는데 지침서는 `warnings[{code, detail}]`를 말함(형태 불일치 가능성, 미확인) |
| 4 | api T7 | 미실행 |
| 5 | api T3·T4 | 미실행. `CycleHistoryPageResponse`(`api-types.ts:3142-3148`)만 `items`·`nextCursor`·`hasMore` 있음 |
| 6 | api T8(가계부 집계) | 미실행. api 8절: "명세가 끝내 안 오면 `ui-api-principles.md`와 kista-ui 쪽 문서의 2-1절 입출력을 쓴다" |
| 7 | 응답 필드 추가(일별 체결·통계 합·CAGR·PRIVACY) | 미실행 |
| 8 | api T10, T7 | 미실행. 스펙에는 `strategy-seed-preview`(`api-types.ts:2157`)만. api 8절: "`derived`에 넣는 값은 지금 `strategy-seed-preview`가 주는 값과 `*CreationResolver`가 채우는 기본값까지. 그 밖의 값은 kista-ui 05가 요구한 목록에 있을 때만" — 05는 그 목록을 명시하지 않음(05 3절은 "VR 자동 placeholder, 시드 한도 경고"만 적음) → T10 범위가 05 본문에서 확인되지 않음 |
| 9 | api 04 단계 A(KIS 삭제), 15(코인 삭제) | 미실행 |
| 10 | api T12(`reapplyAvailableAt`, 지표 시계열) | 미실행. `git grep -n "reapplyAvailableAt" shared/lib/api-types.ts` = 0건 |
| 11 | api T9(원칙 문서 이동) | 미실행 |

### 5. 다른 지침서와의 충돌

- **05 ↔ 10 (dcaFormat, 판정 갱신 대기)**: 05 7절 77행·현재 구조 표 `dcaFormat.ts:73-93` 삭제 vs PROGRESS 10 D10 4차("05에서 대상에서 뺀다 — 다음 Fable 세션"). 아직 05 미수정. 실행 세션이 05를 따르면 `earliestNextExecution`·`latestLastExecution`을 지워 서버 값 표시가 깨진다(소비 `entities/strategy/ui/DcaRuleSummaryLabel.tsx`, `entities/strategy/api/index.ts`, `entities/strategy/index.ts`).
- **05 ↔ 10 (B2·B3, 태스크 3·9 판정)**: 10 `:258-260`이 05 4절·태스크 3·9에 판정 한 줄씩 더하라고 적었으나 05에 없음.
- **05 ↔ 10 (D4, 태스크 3)**: 10 태스크 3(`:332`)은 대시보드 크립토 지표를 "크립토 계좌가 있을 때만" 그리게 하고 `isCryptoBroker`/`brokers[]`로 판정하게 한다. api 15(`cross-repo.md` G1)는 `crypto-market-indicators` 위젯 자체를 삭제 대상으로 둔다. 두 지침이 정반대(유지·조건부 vs 삭제). PROGRESS의 사용자 결정 D4는 "승인"이었고 그 뒤 api 15가 코인 삭제를 정했다.
- **05 ↔ api 15 (바이낸스)**: 05 9절·태스크 9는 KIS·업비트만 삭제. api 15는 바이낸스·BTC·ETH까지. memory의 "완료 작업 재작업 금지"가 "바이낸스·업비트 DCA"를 유지로 둠(MEMORY.md 첫 줄) — 서버가 코인 전체를 지우는 결정이라면 memory 가드와 충돌. 이 판단은 UI 지침서에 없음.
- **05 ↔ 04 (태스크 8 ↔ 04 태스크 6)**: 서로 "한 묶음으로 실행"이라 선언(`05:` 의존 절, 04 197행). 04 5g는 02·api T7 뒤, 04 6은 05 뒤. 05 태스크 8의 선행이 api T10·T7인데 04 6의 선행은 api T5·T7·T10·05라 05 태스크 2(T5)가 04 6 앞에 필요 — 05 태스크 8만 실행하면 04 6 선행(T5 태스크 2)이 빠질 수 있다.
- **05 ↔ 02**: 05 태스크 4(`apiMsg(` 1곳)는 02의 전역 `onError`가 먼저 있어야 한다. 05 선행 문장은 "01, 02"라 일치.
- **05 ↔ 06**: 05 목록 페이지형 전환의 화면 수단이 06 `DataList`. 06 태스크 순서가 05 앞이라는 표(PROGRESS 실행 순서 01 → 02 → 05 → 04 → 06)와 05 5가 06 `DataList`를 쓴다는 문장이 서로 반대 방향이다(05는 06보다 먼저 실행되는데 06의 수단을 가정함).
- **05 ↔ 11**: 11이 `proxy.ts` 상태·역할 쿠키 삭제·`status-stream` 삭제를 담고, 05 태스크 3(상태 플래그)·태스크 10(재신청 쿨다운 `localStorage`)과 같은 `features/auth`를 건드린다(`features/auth/reapply/**`). 순서 지정 없음.

---

## 지침서 06 UX 프리미티브

실행 여부: 태스크 1~8 모두 미실행(`ls shared/ui/data-list shared/ui/skeletons` 없음, `shared/ui/AsyncSection*`·`ConfirmDialog*`·`AmountInput*`·`SectionTitle*` 없음). 묶음 D(PROGRESS)가 06-1·3·4·5·6·7을 서버 무관으로 분류했으므로 지금 실행 후보. 묶음 B·C 이후 달라진 것은 `app/**/loading.tsx` 개수·`AlertDialog` 사용처다.

### 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 코드 | 판정 |
|---|---|---|---|
| 현재 구조(로딩) | "라우트 `loading.tsx` 39개(그중 17개 257줄은 `animate-pulse` 손수 작성)" | `find app -name loading.tsx \| wc -l` = **27**, `animate-pulse`가 든 `loading.tsx` 15개. 묶음 B가 `@modal` 쪽 loading 10개와 폼 라우트 2개를 지움(PROGRESS 04-3) | 수치만 다름(39 → 27, 17 → 15) |
| 〃 | "`LoadingRow` 25곳, 직접 쓴 '불러오는 중…' 약 14곳" | `git grep -n "LoadingRow" -- '*.tsx' ':!*test*' \| wc -l` = 51줄(import 포함이라 곳 수와 비교 불가), `"불러오는 중" ... \| wc -l` = 24줄 | 수치만 다름(측정 기준이 다름) |
| 〃(실패) | "`SectionError` 38곳, `role="alert"` 블록 16파일" | `<SectionError` 비테스트 38줄, `role="alert"` 파일 15 | 수치만 다름(16 → 15) |
| 〃(빈 상태) | "`EmptyState` 박스형 21·text형 21" | `<EmptyState` 42줄 | 일치 |
| 〃(확인) | "`ConfirmDeleteDialog` 7곳, `AlertDialog` 자체 구성 14파일(그중 9파일 619줄이 삭제·종료·탈퇴 확인)" | `<ConfirmDeleteDialog` 7줄. `<AlertDialog `(shared/ui·components/ui 제외) 파일 **9개**: `features/admin/error-logs/ErrorLogsSectionClient.tsx`, `features/finance/manage-accounts/DeleteAccountDialog.tsx`, `manage-categories/DeleteCategoryDialog.tsx`, `manage-group/GroupMemberList.tsx`·`LeaveGroupDialog.tsx`, `features/strategy/adjust-capital/CapitalForm.tsx`, `manage-strategy/DeleteStrategyDialog.tsx`, `reconfigure-vr/ReconfigureVrForm.tsx`, `widgets/strategy-detail/CloseStrategyDialog.tsx`. 전체 `<AlertDialog` 사용 파일 15(shared·components 포함) | 수치만 다름(14 → 9, 묶음 C의 `CapitalForm` 병합 포함) |
| 〃(컨테이너) | "`Card` 28파일, `Surface` 13파일, `GlassCard` 3파일" | `components/ui/card` import 27파일, `<Surface` 13파일, `GlassCard` 4파일 | 수치만 다름 |
| 〃(제목) | "`CardTitle role="heading" aria-level={2}` 26곳" | 26줄 | 일치 |
| 〃(목록 상태) | "`StrategyOrderHistory`는 기간은 URL, … `useState`(`:40-43`)" | `widgets/strategy-detail/StrategyOrderHistory.tsx:40-45`에 `useState` 4개 + 기간은 `useRangeFilterState` 훅. 줄 위치 약간 다름 | 수치만 다름 |
| 〃(포매터) | "`CryptoIndicatorCards.tsx`에 9개 `fmt*`" | 파일은 `widgets/crypto-market-indicators/CryptoIndicatorCards.tsx` 존재(`fmt[A-Z]` 사용 41줄이라 정의 개수는 별도). **이 위젯 폴더 전체를 api 15가 삭제**(`cross-repo.md` G1) | **뜻이 달라짐**(성패 갈림: 7절의 "도메인 고유한 것(해시레이트, 펀딩비 등)은 그 도메인의 `format.ts` 한 파일로 모은다"는 곧 지울 위젯을 정리하는 일) |
| 목표 1 | "`AdminPrivacyBaseTable`(489줄, 행 안 편집·중첩 행)과 `AssetRecordRows`" | `widgets/admin-privacy-trade-list/AdminPrivacyBaseTable.tsx` 474줄, `widgets/asset-record-list/AssetRecordRows.tsx` 존재. 10 지침서가 PRIVACY 화면 축소(api 12 B5 뒤)를 보류 | 수치만 다름 |
| 목표 2 | "차트 지연 로딩 래퍼 5개(`AssetTrend`, `AssetComposition`, `FinanceTrend`, `FearGreedCard`, `MarketChartCard`, 합 202줄)" | 39+39+62+36+26 = 202줄 | 일치 |
| 목표 2 | "응답이 503이고 `code`가 `ENGINE_RESTARTING` 또는 `WRONG_ROLE`이면(둘 다 `ErrorCode`에 추가된다)" | `git grep -nE "ENGINE_RESTARTING\|WRONG_ROLE" -- shared/lib/api-types.ts` 0건. 서버 미반영 | 일치(미반영) |
| 목표 5 | "자릿수는 메타의 `amountScale`을 쓴다" | `entities/meta/model/types.ts:42` `amountScale?: number`, `entities/meta/model/marketRules.ts:16-17`이 `minOrderAmount`·`amountScale` 소비. 단 api 15(코인 삭제) 2차 단계가 `brokers[].market`·`minOrderAmount`·`amountScale` 필드를 **지운다**(`cross-repo.md` G2) | **뜻이 달라짐**(성패 갈림: `AmountInput`이 기대는 `amountScale`이 api 15 뒤 없어진다. 06은 통화별 자릿수(`CURRENCY_SCALE`, `shared/lib/api-schema.ts:98`)를 어디서 얻는지 대안을 적지 않음) |
| 목표 6 | "`Surface`의 토큰(`--r-lg`, `--sh-card`)" | `shared/ui/Surface.tsx` 존재. 토큰은 미확인 | 미확인 |
| 목표 7 | "`shared/lib/breakpoints.ts`" | 파일 없음(신규 생성 대상). `git grep -nE "1023\|1280" -- '*.ts' '*.tsx' ':!*test*'` = 2줄(지침서 "JS 미디어쿼리 1280px, 1023px"와 일치) | 일치 |
| 목표 7 | "`docs/agents/widgets.md` '테이블 정렬'" | `docs/agents/widgets.md`에 "**테이블 정렬**" 항목 존재(CSS 토큰 절) | 일치 |
| 목표 8 | "`UrlRangeFilterBar`·`use-search-param`·`useRangeFilterState`" | `shared/ui/UrlRangeFilterBar.tsx`, `shared/lib/hooks/use-search-param.ts`, `shared/lib/hooks/use-range-filter-state.ts`, 추가로 `shared/ui/range-filter/RangeFilterControls.tsx`(지침서에 없음) | 일치 + 누락 1 |
| 태스크 1 | "시범 전환 2개(전량형 `StrategyTypeComparison`, 페이지형 `CycleHistoryTable`)" | `widgets/stats-overview/StrategyTypeComparison.tsx`, `widgets/cycle-history/CycleHistoryTable.tsx` 존재. 단 `CycleHistoryTable`이 전략 주문·체결 이력과 같은 구조인지, 커서형인지는 02 5절·PROGRESS에서 "이미 커서"라고 적었으나 api 스펙에 `CycleHistoryPageResponse`(`items`·`nextCursor`·`hasMore`, `api-types.ts:3142-3148`)만 있음 — 서버 규약 T3의 공용 `CursorPage<T>`와 이름이 다름(api 8절: `CycleHistoryPageResponse`가 trading·stats에 같은 이름 충돌, 공용 타입으로 옮기며 스키마 이름이 바뀔 수 있다) | 일치 + 스키마 이름이 바뀔 가능성 |
| 태스크 2 판정 | "`grep -rln "lg:hidden" --include='*.tsx' . \| wc -l`이 5 이하" | 지금 비테스트 22파일(검색 범위에 `docs`는 `.tsx`가 없어 무관). "표 13파일 전환"으로 22 → 5가 되려면 `lg:hidden`이 `DataList` 밖 용도로 쓰이는 파일이 5개 이하여야 함. 용도 분류는 미측정 | 미확인(기대값의 근거 없음) |
| 태스크 3 판정 | "`grep -rn "불러오는 중" … \| grep -v shared/ui` 0건, `grep -rln "animate-pulse" app \| wc -l` 0" | 지금 "불러오는 중" 24줄, `animate-pulse` 파일(`app` 안, 비테스트) 15 | 일치(미실행) |
| 태스크 4 판정 | "`grep -rln "<AlertDialog" --include='*.tsx' . \| grep -v shared/ui \| grep -v components/ui` 0건" | 지금 9파일. **`CapitalForm.tsx`·`ReconfigureVrForm.tsx`의 AlertDialog는 묶음 C 사용자 결정으로 "다이얼로그 안 확인 단계로 유지"**(PROGRESS 04-5c, 04 지침서 `AlertDialog 확인 단계는 유지(사용자 결정)`). `ConfirmDialog`는 `mutation`·`variables`를 직접 받는 모양(06 4절)인데 두 폼은 `form.handleSubmit(확인 열기)` + `form.submit()` 흐름(04 기본값 절 "확인 단계가 있는 폼") | **뜻이 달라짐**(성패 갈림: 0건 판정이 두 파일에서 걸리고, `ConfirmDialog`의 `mutation` prop 모양이 04의 확인 흐름과 안 맞음) |
| 태스크 5 판정 | "`grep -rn 'type="number"' --include='*.tsx' .` 0건" | `git grep -l 'type="number"' -- '*.tsx'` 4파일(테스트 포함 여부 미구분) | 수치만 다름(미실행) |
| 태스크 6 판정 | "`grep -rn "components/ui/card" .` 0건" | `components/ui/card.tsx` 존재, import 27파일. `components.json`이 shadcn 갱신 대상으로 `card`를 유지하지 않는지 미확인 | 수치만 다름 |
| 태스크 8 | "`shared/ui/{PaginationBar,PageSizeSelector}.tsx`, `components/ui/pagination.tsx`" | 세 파일 모두 존재(`shared/ui/PaginationBar.tsx`, `PageSizeSelector.tsx`, `components/ui/pagination.tsx`). `PaginationBar` 사용 15파일·`PageSizeSelector` 13파일(앞 02 절에서 측정) | 일치 |
| 태스크 8 | "`shared/lib/hooks/**`의 `use-client-pagination`" | 05 태스크 5의 판정에도 같은 대상(`useClientPagination` 0건). 두 지침서가 같은 파일을 서로 다른 선행으로 지운다 | 일치(충돌은 5절) |
| 태스크 1 실측 | "실측이 추정의 절반에 못 미치면 태스크 2를 멈추고 사용자와 범위를 다시 정한다" | 해당 문장 | 일치 |

### 2. 이름이 박힌 가드·테스트·설정

| 위치 | 박힌 이름 | 06의 어느 태스크 |
|---|---|---|
| `scripts/a11y-check/run.mjs:35-45,184,218`, `README.md:7,10,37` | `[data-slot=alert-dialog-trigger\|dialog-trigger\|sheet-trigger]`, `[role=dialog],[role=alertdialog]`, axe `region` 예외 | 태스크 4(`ConfirmDialog`가 `alert-dialog-trigger` 슬롯을 유지하는지), 태스크 1(`DataList`가 `role="region"` 규칙을 안에 넣음 — README 37행의 `region` 예외 설명과 관련) |
| `scripts/visual-diff/scenarios.mjs` | 화면 목록(`strategies`, `detail-*`, `account-detail` 등), `expandPrivacyBase`가 `article h3 button[aria-expanded]`·`button[aria-label$="주문 명세"]`에 의존 | 태스크 1·2(표·카드 DOM 구조 전환 시 셀렉터 파손 가능) |
| `eslint.config.mjs:19-27` | 해당 없음(새 규칙 `toFixed`·`toLocaleString` 추가는 태스크 7). 기존 `restrict(...)` 구조에 selector 추가 | 태스크 7 — 지침서에 구체 selector 없음 |
| `doctor.config.json`(존재) | `components/ui/**` 4개 규칙 예외(11 지침서 10-1절) | 태스크 6(`card.tsx` 삭제와 무관), 11 태스크 12가 이 파일을 지움 |
| `knip.json` | `"components/ui/**": ["exports","types"]` ignoreIssues | 태스크 6·8(`card.tsx`·`pagination.tsx` 삭제) — 영향 작음 |
| `docs/agents/shared.md:87,95`, `widgets.md:25,64`, `copy.md:5`, `react-query.md:4` | `SectionError`, `Spinner`·`CardSkeleton`, `GlassCard topBar`, 토스트 마침표 규칙, "오류 화면은 `isError && !data`일 때만" | 태스크 3·7 문서 갱신(08 태스크 12·13). 06 표에 문서 갱신 태스크는 없음 |
| `e2e/*.spec.ts`, `playwright.config.ts` | 화면 문구·역할 셀렉터(`getByRole('button',{name:'등록'})` 등) | 모든 화면 전환 태스크 — 지침서는 e2e를 언급하지 않음(PROGRESS 04: "화면 흐름·문구를 바꾼 작업은 커밋 전에 로컬 e2e") |
| `testing/renderApp.tsx`, `vitest.setup.ts` | `sonner`는 `toast` spy·`Toaster`는 null(묶음 A) | 태스크 7의 "토스트 어미 통일(~했습니다)" 변경은 단언 문구 약 40+곳에 영향(문구 단언 1,219건, PROGRESS 서두) |
| `components/ui/pagination.tsx`, `components/ui/card.tsx` | shadcn 생성 파일. `eslint.config.mjs:79`이 `components/ui/**`를 lint 제외 | 태스크 6·8 |
| `shared/ui/range-filter/RangeFilterControls.tsx` | 06 8절에 없는 기간 선택 UI | 태스크 8(`useUrlState` 통합 시 11 지침서 6절의 기간 선택 통합과 겹침) |

### 3. 중단 조건·확인 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 147 | "화면별로 전후 스크린샷을 사용자에게 보여 확인받는다(선행 테스트 2)" | 없음(사용자가 거부하면 어떻게 하는지 없음) |
| 148 | "관리자 목록 포함 전환을 사용자가 승인했다(2026-11-12)" | 해당 없음(승인 완료) |
| 150 | "한 번에 전부 바꾸고 visual-diff로 확인한다" | 없음(차이가 크면 어떻게 하는지 없음) |
| 155 | "로컬 api가 필요한 화면은 사용자가 api를 기동한 세션에서 한다" | 없음 |
| 172 | "태스크 1의 실측이 추정의 절반에 못 미치면 태스크 2를 멈추고 사용자와 범위를 다시 정한다" | 있음(멈춤 + 질문). 단 "추정"이 700~900줄의 절반(350~450줄)이라는 숫자를 지침서가 같은 문장에 적지 않음 |
| 67·(위험 1) | "담기지 않는 표는 억지로 옵션을 늘리지 않고 그대로 둔다. 목표는 15개 중 11개 이상이다" | 있음 |
| 하지 말 것 | "`DataList` 컬럼에 `mobileRender` 같은 탈출구를 만들지 않는다" | 해당 없음 |
| 66 | "(Caddy 문법·재시도 대기 시간은 fable-infra 확인 중)" | 없음(미확정 상태로 실행 시 어떻게 하는지 없음) |

### 4. 서버 선행 조건

| 태스크 | 기다리는 것 | 현재 상태 |
|---|---|---|
| 1·2 페이지형 | api T4(목록 규약, 묶음별 같은 날 배포), T3 공용 타입 | 미실행. 시범 `CycleHistoryTable`만 이미 커서형(`CycleHistoryPageResponse`) |
| 3 서버 재시작 안내 | `ErrorCode`에 `ENGINE_RESTARTING`·`WRONG_ROLE`(api 05의 7절), Caddy `handle_errors`(infra) | 둘 다 미반영(스펙에 0건). 위 안내 부분은 서버 뒤로 미룰 수 있으나 지침서가 분리해 적지 않음 |
| 5 | 메타 `amountScale` | 현재 있음(`entities/meta/model/types.ts:42`). api 15 C4가 지움 |
| 7 | 서버 `detail` 문구(02 전역 `onError`) | 02 선행. 실패 문구는 서버 `detail`이 맡는다는 전제 — api T7 미실행 |
| 나머지(4, 6, 8, 3 일부) | 없음 | 서버 무관(PROGRESS 묶음 D가 06-1·3·4·5·6·7을 서버 무관으로 분류) |

### 5. 다른 지침서와의 충돌

- **06 ↔ 04/PROGRESS (ConfirmDialog 모양)**: 06 4절 `ConfirmDialog`는 `mutation`+`variables`를 직접 받아 진행·실패·닫기를 안에서 처리. 04 5c 이후 `CapitalForm`은 폼 제출 후 `AlertDialog` 확인을 거치며 `form.submit()`을 확인 버튼에서 부른다(PROGRESS 04-4: 확인 단계가 있는 폼은 `<form onSubmit={form.handleSubmit(열기)}>`). 두 방식이 합치려면 `ConfirmDialog`에 `onConfirm` 콜백 모드가 필요한데 06에는 없다. 06 태스크 4 판정 grep이 이 두 파일(`CapitalForm`, `ReconfigureVrForm`) 때문에 0건이 안 된다.
- **06 ↔ 05 (페이지네이션 삭제 순서)**: 06 태스크 8이 `PaginationBar`·`PageSizeSelector`·`components/ui/pagination.tsx` 삭제, 06 1절이 `use-client-pagination` 삭제를 말하고, 05 태스크 5는 api T3·T4 뒤 같은 `useClientPagination`을 지운다(판정 `grep -rn "useClientPagination" .` 0건). 06은 05보다 뒤 순서(PROGRESS "01 → 02 → 05 → 04 → 06")이고 `PaginationBar` 사용 15파일은 05 태스크 5가 서버 페이지형으로 바꿔야 "더 보기"가 된다. 06 태스크 8 실행 시점에 05 태스크 5가 안 끝났으면 `PaginationBar`를 지울 수 없다. 반대로 PROGRESS 묶음 D는 서버 무관 06-1·3·4·5·6·7만 앞당기고 8은 뺀다.
- **06 ↔ api 15 / 크립토**: 06 7절 포매터 정리(`CryptoIndicatorCards.tsx` 9개 `fmt*`, 도메인 `format.ts`)는 api 15가 삭제할 위젯(`widgets/crypto-market-indicators`)을 대상으로 한다. 10 지침서 D4 태스크 3("크립토 지표를 크립토 계좌가 있을 때만")과도 반대 방향.
- **06 ↔ api 15 (`amountScale`)**: 위 1절.
- **06 ↔ 03**: 06은 03 앞이라는 순서. 06이 새로 만드는 `shared/ui/data-list/**`·`skeletons`는 03이 `shared/ui`에 두는 위젯과 위치가 같아 충돌 없음.
- **06 ↔ 08**: 08 70행이 06 이후에 규칙(토스트 마침표, `onError` 덮어쓰기 금지, 오류 화면 판정식, 표 region 속성)을 지운다. 06 표에 문서 갱신 태스크가 없고 08 12가 "06 완료"를 선행으로 걸었다. 06이 `docs/agents/react-query.md`의 "오류 화면은 `isError && !data`일 때만"을 `DataList`·`AsyncSection` 안으로 옮기는데(06 1절) 08은 그 규칙을 지우는 쪽 — 일치.
- **06 ↔ 10**: 10이 새 화면(D5 대시보드 오늘의 주문 등)을 만들 때 `DataList`·`AsyncSection` 사용을 전제하는지 10 태스크 쪽에서 확인 필요(10 태스크 순서가 06 뒤인지 앞인지 PROGRESS 표에 없음).
- **06 ↔ 07**: 06 7절의 토스트 어미 통일("~했습니다")이 07의 문구 리터럴 단언 정리와 같은 묶음. `testing/mockApi.ts` 전환 이후에도 문구 단언 약 1,219건이 남아 있을 수 있음(PROGRESS 서두 수치, 재측정 안 함).
