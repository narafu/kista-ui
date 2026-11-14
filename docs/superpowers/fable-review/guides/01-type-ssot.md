# 01. 타입 SSOT — 생성 타입을 직접 쓰고 수기 타입·정규화를 없앤다

> **실행 세션은 먼저 맨 끝의 "실행 전 보정" 절과 `00-roadmap.md` 4절(공통 규칙)을 읽는다.** 본문과 다르면 그쪽이 우선한다. (2026-11-14)

근거 측정: `findings/b-type-duplication.md` (전 절), `findings/a-vertical-trace.md` 종합 2번.

## 현재 구조와 문제

같은 DTO를 네 번 적는다: OpenAPI 생성 타입 → entities 수기 타입 → 정규화 함수의 필드 열거 → 폼 스키마와 payload 빌더.

- 생성 타입 `shared/lib/api-types.ts`는 9,564줄, 스키마 186개다. 런타임 코드에서 `components['schemas']`를 인용하는 파일은 4개뿐이다(`entities/admin/model/types.ts`, `entities/market/model/types.ts`, `entities/stats/model/types.ts`, `shared/lib/api-schema.ts`).
- `entities/*/model/types.ts` 15개 파일 967줄이 생성 스키마 74개를 다시 적는다. 필드명 일치율은 99.3%(449/452), 필드 집합이 완전히 같은 쌍이 66/74다.
- 응답 정규화 함수 16개 217줄 중 214줄(98.6%)이 이름 변경 없는 `String()`/`Number()`/`toNum()` 복사다. 헬퍼·인라인 변환·Raw 타입까지 합치면 약 352줄이고, 대응 테스트 3개 파일이 751줄이다.
  - `entities/strategy/api/index.ts:11-125` (`normalizeVrSummary`, `normalizeDca*`, `normalizeStrategy`)
  - `entities/order/api/index.ts:14-75`, `entities/trade/api/index.ts:13-43`, `shared/model/placed-order.ts:14-25`
- 정규화는 검증이 아니다. `String(c.indicator) as DcaIndicator`(`entities/strategy/api/index.ts:37`) 같은 단언이 9곳이고, 실제 검증은 `isDcaWeekday` 3줄뿐이다.
- 수기 타입이 생긴 원인은 생성 타입의 모양이다. 프로퍼티 832개 중 692개(83%)가 optional이고, enum이 스펙에서 빠진 필드가 있다(`shared/lib/api-schema.ts:22-36`의 `OrderType` 수기 정의와 `ExactUnion` 고정). `entities/admin/model/types.ts:3-10`은 이를 `Required<>`와 `NullableFields<>`로 손으로 보정한다.
- 정규화의 유일한 근거였던 주석 "KIS live 응답은 숫자 필드를 BigDecimal string으로 내려보내는 경우가 있어"(`entities/trade/api/index.ts:12`)는 현재 서버 코드와 맞지 않는다. kista-api에는 Jackson 전역 설정이 없어 BigDecimal이 JSON number로 나간다(2026-11-11 fable-api가 서버 코드로 확인, 서버 기동 실측은 아님).
- 결과: VR 램프 필드 하나(`pGraceWeeks`)가 타입 수준 12곳에 선언돼 있고, DTO 필드 하나를 추가하려면 types·normalizer·zod·payload 빌더 4곳을 고친다. 이 수작업을 점검하려고 `.claude/skills/dto-sync-check`가 따로 있다.

## 목표 구조

**도메인 타입은 생성 타입의 별칭이다. 응답은 변환 없이 그대로 쓴다.**

```ts
// shared/lib/api-schema.ts
export type Schema<K extends keyof components['schemas']> = components['schemas'][K]

// entities/strategy/model/types.ts — 별칭과 UI 전용 타입만 남는다
export type Strategy = Schema<'TradingCycleResponse'>
export type StrategyRequest = Schema<'TradingCycleRequest'>
export type StrategyVrSummary = Schema<'VrSummary'>
export type DcaRule = Schema<'DcaRuleResponse'>
export type DcaIndicator = DcaRule['conditions'][number]['indicator']

// entities/strategy/api/index.ts
export const listStrategies = (accountId: string, token?: string) =>
  fetchEither<Strategy[]>(`/api/accounts/${accountId}/trading-cycles`, undefined, token)
```

규칙:

1. `entities/*/model/types.ts`에 응답·요청 DTO를 `interface`로 다시 적지 않는다. 생성 스키마에 대응하는 타입은 `Schema<'…'>` 별칭 한 줄이다. 필드 주석은 서버 `@Schema(description)`이 생성 타입 JSDoc으로 내려오므로 UI에 다시 적지 않는다.
2. 값의 표현은 와이어를 따른다. 금액·가격·수량은 `number`, 없는 값은 서버가 보내는 대로 `null`이다. `null`을 `undefined`로 바꾸는 층(`optStr`/`optNum`/`optDec`)을 두지 않는다.
3. 모양을 실제로 바꾸는 변환만 api 함수에 남긴다. 현재 해당하는 것은 배열 → Record 3건(`getPrices`, `getCryptoPrices`)과 평탄화 1건(`executeStrategy`)이다. 이것도 05 지침서에서 서버 응답 변경으로 없앨 후보다.
4. 코드값 union은 생성 타입에서 파생한다. 수기 union(`DcaDirection` 등 7개, `OrderType`, `TradingMarket`, `Currency`)은 서버가 enum으로 표기하면 삭제한다.
5. 폼은 zod 스키마가 폼 값의 SSOT이고, 요청 타입은 생성 타입이다. payload 빌더의 반환식에 `satisfies Schema<'…Request'>`를 붙여 필드 드리프트를 typecheck가 잡게 한다. 같은 필드 묶음을 여러 타입에 다시 적지 않고 `Pick`으로 꺼낸다(VR 램프 8필드: `Pick<Schema<'VrConfigRequest'>, RampKey>`).

### 그렇게 정한 이유

- 수기 타입이 생성 타입과 99.3% 같다. 차이가 나는 0.7%는 수기 쪽이 서버 필드를 빠뜨린 것이다(`Account.currency`, `User.rejectReason` 등). 수기 타입은 정보를 더하지 않고 드리프트만 만든다.
- 정규화의 전제(문자열 숫자)가 사실이 아니다. 전제가 사라지면 정규화는 필드 열거의 사본일 뿐이다.
- 계약의 정확성은 서버 스펙에서 확보하는 것이 맞다. 스펙이 정확하면 UI는 타입 선언과 변환을 0줄로 얻고, 필드 추가는 `gen:types` 한 번으로 끝난다.

### 기각한 대안

- **zod로 응답을 런타임 검증한다**: 스키마 186개를 zod로 다시 적으면 지금의 수기 타입과 같은 복제가 형태만 바꿔 남는다. 서버가 같은 조직의 코드이고 스펙에서 타입이 생성되므로, 경계 검증은 서버 쪽 스펙 테스트가 맡는다.
- **생성 타입은 그대로 두고 UI에서 `Required<>` 보정을 일반화한다**(현 admin 방식): nullable 정보가 스펙에 없어 `NullableFields`를 필드마다 손으로 열어야 한다. 원인을 서버에 둔 채 UI가 계속 보정하는 구조다.
- **`openapi-fetch` 도입으로 경로에서 응답 타입까지 추론한다**: 타입 인자 표기까지 없앨 수 있지만 fetch 경로(서버 직결·프록시·401 갱신)와 엮여 있어 이 지침서에서 다루지 않는다. 02 지침서에서 판단한다.

## 예상 감량과 위험

| 대상 | 현재 | 목표 | 감량 |
|---|---:|---:|---:|
| `entities/*/model/types.ts` (15파일) | 967줄 | 별칭 + UI 전용 타입 약 250줄 | 약 700 |
| 응답 정규화·헬퍼·Raw 타입 | 352줄 | 모양 변환 약 30줄 | 약 320 |
| 정규화 테스트 3파일 | 751줄 | 모양 변환 테스트 약 100줄 | 약 650 |
| `api-schema.ts` enum 방어(`ExactUnion`, 수기 `OrderType`), admin `Required<>` 보정 | 약 25줄 | 0 | 25 |
| `shared/lib/normalize.ts` + 테스트, `dto-sync-check` 스킬 | 파일 3개 | 삭제 | 약 80 |

합계 제품 약 1,050줄, 테스트 약 700줄. 줄 수보다 큰 효과는 DTO 필드 변경 시 수정 지점이 4곳에서 0~1곳으로 주는 것이다.

위험:

- **`null` 대 `undefined`**: 지금은 정규화가 `null`을 `undefined`로 바꾼다. 와이어 그대로 쓰면 `=== undefined` 비교와 기본값 인자(`x = 0`)가 다르게 동작한다. typecheck가 대부분 잡지만 `x === undefined ? a : b` 꼴은 타입이 `T | null`이어도 통과한다. 태스크 3에서 도메인마다 `=== undefined`·`!== undefined`를 grep해 확인한다.
- **string → number**: 주문 미리보기 8개 필드(`NextOrderPositionSnapshot`의 `averagePrice` 등 7개, `NextOrderItem.price`)는 지금 UI가 `string`으로 들고 있다. 포매터가 문자열을 받는 호출부를 number로 바꾼다. 지수 표기 number(`5E-7`)는 JS가 그대로 파싱한다.
- **주문·매매 금액 표시**: 실수 비용이 큰 영역이다. order·strategy 도메인은 마지막에, Opus로 옮긴다.
- **서버 선행 조건 미충족**: 스펙의 optional 비율이 그대로면 이 지침서는 실행할 수 없다. 태스크 1의 판정 수치로 확인한다.

## 동작 보존용 선행 테스트

1. 서버 변경 전후로 대표 응답을 비교한다. 로컬 kista-api(8080)·kista-trading(8081)이 떠 있을 때(사용자가 기동) 다음 엔드포인트의 응답 JSON을 저장해 두고, 숫자 필드가 number 토큰인지 확인한다: `/api/accounts/{id}/trading-cycles`, `/api/accounts/{id}/portfolio`, 주문 미리보기, `/api/accounts/{id}/ledger-totals`. 이 실측이 "문자열 숫자가 없다"는 전제의 최종 근거다.
2. 정규화를 지우기 전에 각 정규화 테스트에서 **값이 바뀌는 케이스**만 골라 남긴다(`cycleSeedType ?? 'NONE'`, `recurringAmount ?? 0`, `status ?? 'PLACED'`, `id === 'null'` 제거, deprecated 별칭 폴백). 이 기본값들이 서버에서 보장되는지 fable-api `cross-repo.md`로 확인하고, 보장되면 테스트와 함께 지운다. 보장되지 않는 것은 서버 변경 요청으로 넘긴다.
3. 화면 회귀: 전략 상세·계좌 상세·주문 미리보기 화면을 `npm run visual-diff -- <base-ref>`로 전후 비교한다.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 0 | (kista-api) 응답 DTO required·nullable·enum 표기, BigDecimal plain number 전역 통일 | kista-api 지침서 | — | `cross-repo.md` 해당 항목 완료 표시 |
| 1 | 스펙 재생성과 수치 확인 | `openapi.json`, `shared/lib/api-types.ts` | Haiku | `npm run fetch:spec && npm run gen:types` 후 `grep -c '?:' shared/lib/api-types.ts`가 스키마 프로퍼티의 20% 미만. 넘으면 중단하고 서버에 미표기 DTO 목록을 넘긴다 |
| 2 | `Schema<K>` 헬퍼 추가, admin의 로컬 `Schema`/`NullableFields` 제거 | `shared/lib/api-schema.ts`, `entities/admin/model/types.ts` | Sonnet | `npm run typecheck` |
| 3a | 정규화가 없는 도메인을 별칭으로 전환 | `entities/{finance,user,meta,runtime-config,admin-settings,stats,backtest,market,privacy,error-log}/model/types.ts`와 소비처 | Sonnet (도메인별 병렬 가능, 파일 안 겹침) | `npm run typecheck && npx vitest run entities/<domain>` |
| 3b | account·trade 전환, 정규화 삭제 | `entities/{account,trade}/**`, 소비 위젯 | Sonnet | 위와 같음 + `grep -rn "normalize\|Raw\b" entities/{account,trade}` 0건(모양 변환 제외) |
| 3c | order·strategy 전환, 정규화 삭제 | `entities/{order,strategy}/**`, `shared/model/placed-order.ts`, `widgets/strategy-detail/**`, `features/strategy/**` | Opus | 위와 같음 + visual-diff 3개 화면 |
| 4 | 코드값 수기 union 삭제, 생성 타입 파생으로 교체 | `entities/strategy/model/types.ts`, `shared/lib/api-schema.ts`, `entities/privacy/model/types.ts` | Sonnet | `grep -rnE "'BUY' \| 'SELL'" --include='*.ts' --include='*.tsx' . \| grep -v api-types` 0건 |
| 5 | payload 빌더에 `satisfies`, VR 램프 타입을 `Pick`으로 통합 | `features/strategy/**/model/*`, `entities/strategy/model/vrRamp.ts`, `entities/backtest/model/types.ts` | Sonnet | `grep -rn "pGraceWeeks" --include='*.ts' --include='*.tsx' . \| grep -v test \| grep -v api-types`에서 타입 선언 위치가 zod 스키마 2곳 이하 |
| 6 | 잔재 삭제 | `shared/lib/normalize.ts`(+테스트), `shared/lib/utils.ts`의 `toNum`(사용처 0이면), `.claude/skills/dto-sync-check/`, 문서의 정규화 규칙(`docs/agents/entities.md` "KIS live API quirk", `shared.md` "normalize") | Haiku | `npm run knip`, `npm run lint`, `npm run test:run` |

3a는 도메인끼리 파일이 겹치지 않으므로 병렬 디스패치한다. 3b·3c는 순차로 한다.

## 하지 말아야 할 것

- 태스크 0이 끝나기 전에 UI에서 `Required<Schema<…>>`를 전 도메인으로 퍼뜨리지 않는다. nullable 정보가 없는 상태에서 optional만 지우면 `null`이 오는 필드에서 런타임 오류가 난다.
- 별칭으로 바꾸면서 필드 이름을 UI 취향으로 다시 짓지 않는다(매핑 층이 되살아난다).
- 응답 타입에 zod 스키마를 새로 만들지 않는다.
- `api-types.ts`를 손으로 고치지 않는다. 모양이 틀리면 서버 스펙을 고친다.
- 정규화 테스트를 케이스 검토 없이 통째로 지우지 않는다(선행 테스트 2번).

## 다른 지침서와의 의존·순서

- 선행: kista-api 응답 계약 지침서(태스크 0).
- 02(데이터 층)는 이 지침서의 api 함수 단순화를 전제로 한다. 01을 끝낸 뒤 02를 한다.
- 05(서버 규칙·코드값 사본)는 태스크 4의 연장이다. 메타에 없는 값 집합의 라벨·옵션 배열은 05에서 다룬다.
- 07(테스트)은 이 지침서가 지운 테스트를 제외하고 계산한다.

## 실행 전 보정 (2026-11-14 — 본문과 다르면 이 절이 우선)

공통 규칙은 `00-roadmap.md` 4절. 측정 원본은 `findings/s-guide-premises-01-06.md`. 서버 T1·T2는 끝났다(api `1915ba682`). 그런데 `openapi.json`·`shared/lib/api-types.ts`는 2026-11-11 재생성본이라 그 이전 상태다(스키마 프로퍼티 826개 중 optional 690개, 83.5%). 태스크 1부터 시작한다.

전제 정정:

- **태스크 1의 판정 명령은 쓸 수 없다.** `grep -c '?:' shared/lib/api-types.ts`는 2,720이고 경로·쿼리 파라미터의 `?: never`까지 센다. 스키마 밖이 약 2,030줄이고 재생성으로 바뀌지 않는다. 판정을 이렇게 바꾼다: 재생성 뒤 같은 명령이 **2,200 이하**(스키마 optional이 826의 20%인 165 이하).
- 태스크 1의 `npm run fetch:spec`은 로컬 api 2개(8080·8081)가 떠 있어야 한다(`scripts/fetch-spec.mjs:7-9`). 사용자가 띄운다(로드맵 4-5의 2). 재생성 뒤 `git diff --stat openapi.json`으로 스키마 이름이 바뀐 것이 있는지 보고, 바뀐 이름은 소비처를 같은 커밋에서 고친다.
- 태스크 2: `entities/admin/model/types.ts:5-7`의 로컬 `Schema`는 공용 `Schema<K>`와 이름만 같고 `Required<>`로 감싼 변형이다. 재생성 뒤 필수 표기가 정확해졌으면 `Required<>`가 필요 없다. 공용으로 바꾸고 typecheck가 깨지는 필드는 서버가 아직 필수로 표기하지 않은 것이다. 그 목록을 api 레포 `cross-repo.md` B절에 적고, 그 필드만 호출부에서 좁힌다(`NullableFields` 소비 5곳: `types.ts:20,25,40,43,51`).
- 태스크 3b 판정: account에는 `normalize`라는 이름이 없다. 변환은 `toNum` 인라인이다(`entities/account/api/index.ts:44,62-64`). 판정에 `git grep -n "toNum" -- entities/account entities/trade` 0건을 더한다.
- 태스크 4 판정: `'BUY' | 'SELL'`은 지금 제품에 7곳이다. `entities/trade/model/types.ts:2`는 `'INFO' | 'FAIL'`이 붙은 로그 종류라 대상이 아니다(판정에서 뺀다). `shared/lib/api-schema.ts:25-34`의 `ExactUnion` 고정 장치는 수기 `OrderType`을 지우면 지킬 것이 없어지므로 같이 지운다. 테스트 파일은 판정에서 뺀다.
- 태스크 6: `.claude/skills/dto-sync-check/`는 이미 없다. 문서 대상에 `docs/agents/entities.md:7`, `docs/agents/strategy.md:7`(`normalizeStrategy`를 함께 고치라는 문장), `docs/agents/shared.md:71`(enum은 `api-schema.ts`에서)을 더한다.
- "정규화 함수 16개"는 지금 13개 + account의 인라인 변환이다. "배열 → Record 3건"에 이름이 둘만 적혀 있다(`getPrices`는 `entities/account/api/index.ts:41`, `getCryptoPrices`는 `entities/trade/api/index.ts:95`).

같은 커밋에서 고칠 것:

- `scripts/visual-diff/fixtures/trading.mjs:14,19,23`·`fixtures/api.mjs:46`의 가짜 응답이 문자열 숫자(`'28.1500'`)다. 태스크 3c에서 number로 바꾼다. 안 바꾸면 전후 비교가 옛 와이어로 계속 돈다.
- 묶음 A의 빌더(`entities/{strategy,order}/model/fixtures.ts`, `entities/meta/__fixtures__/testMeta.ts`)는 타입을 바꾸는 태스크에서 같이 바꾼다.
- 정규화 테스트는 `entities/{strategy,order,trade}/api/index.test.ts`(751줄) 말고도 `shared/model/placed-order.test.ts`(61줄)·`shared/lib/normalize.test.ts`(28줄)가 있다.

기본값:

- 재생성 뒤에도 optional이 20%를 넘으면 전체를 멈추지 않는다. 넘는 DTO 목록을 `cross-repo.md`에 적고, 필수 표기가 된 도메인부터 3a를 한다(3a는 도메인별로 독립이다). `Required<Schema<…>>`를 퍼뜨리지 않는 규칙은 그대로다.
- 숫자 필드가 number로 내려오는지는 api를 띄우지 않고 `openapi.json`의 해당 스키마 `"type"`으로 본다.
- 코인 타입·쿼리(`getCryptoPrices`, 코인 포트폴리오)는 12가 지운다. 12 전에 이 지침서를 하면 전환하지 않고 그대로 둔다(V8).
- `=== undefined` grep은 3파일뿐이라 좁다. 필수로 바뀐 필드의 `??`·`!= null` 방어는 typecheck가 잡지 않는다. 일부러 찾아 지우지 않는다(해롭지 않다).

중단 조건의 대체 경로: 76행("optional 비율이 그대로면 실행할 수 없다")은 위 기본값 첫 줄로 바꾼다. 80행(로컬 api)은 로드맵 4-5의 2.

배포: ui 단독. 화면이 같다.
