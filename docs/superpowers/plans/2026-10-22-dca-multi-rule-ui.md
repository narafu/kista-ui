# DCA 다중 규칙 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DCA 전략을 "종목 1개 + 규칙 1~10개(매수·매도 혼합) + 전략 원장"으로 등록·수정·조회하도록 kista-ui를 kista-api Plan 2 계약에 맞춘다.

**Architecture:** `entities/strategy` 타입·정규화·포맷터를 새 계약으로 바꾸고, 등록·수정 폼은 "규칙 요약 목록 + 같은 화면 안 규칙 편집 뷰"로 재구성한다(편집 초안은 별도 `useForm`). 상세·카드·회차 이력은 공용 규칙 요약 포맷터를 쓰고, 보유는 응답의 원장 값(`dca.currentHoldings`·`dca.avgPrice`)으로 표시한다.

**Tech Stack:** Next.js 16.2.6 App Router · React Hook Form + zod · React Query · vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-10-21-dca-multi-rule-ui-design.md`(UX SSOT, §3 사용자 결정 7개). 계약 원본: `../kista-api/.superpowers/sdd/2026-10-21-dca-multi-rule/kista-ui-contract.md`(아래 "계약 요약"에 필요한 부분을 옮겨 두었다. 원본이 사라져도 이 문서로 충분하다). kista-api 코드: `git -C ../kista-api diff 7fd9cea8..6668fafc`.

## Global Constraints

- **브랜치에서 작업한다**: `feat/dca-multi-rule`(worktree 권장). main push = 배포이고 이 변경은 kista-api Plan 2(6668fafc)와 **함께 배포**해야 한다. 구 UI는 DCA 등록·수정이 400. main 병합·push는 사용자가 API 배포와 묶어 지시할 때만 한다.
- **전체 typecheck는 Task 1 직후부터 Task 8 끝까지 빨간 상태가 정상이다**(소비처가 구 형태를 쓰므로). 태스크별 검증은 `npx tsc --noEmit 2>&1 | grep -E "<그 태스크의 경로>"`(출력 없음 = 통과)와 대상 vitest 파일로 좁힌다. 전체 `typecheck`·`lint`·`knip`·`test:run`이 초록이어야 하는 시점은 Task 9뿐이다. 리뷰어는 다른 경로의 타입 오류를 그 태스크의 결함으로 잡지 않는다.
- 포맷: 싱글 쿼트, 세미콜론 없음, import 중괄호 공백. 기존 파일 포맷 일괄 변경 금지.
- 카피: 합니다체, 카드·리스트 짧은 설명은 명사구·마침표 없음, 완전한 문장은 "~습니다."/"~하세요.", 화면 안 에러·빈 상태 문구는 마침표. UI 용어는 "코인"이 아니라 "크립토". 기존 문구를 먼저 grep해 재사용한다.
- FSD: 포맷터·타입은 `entities/strategy`(다른 entity import 금지, 라벨은 인자로 받는다), 폼은 `features/strategy/create-strategy`, 화면 합성은 `widgets/`. 범용 이력 헬퍼는 `shared/lib`.
- 서버 상태를 `useState`에 복사하지 않는다(규칙 초안은 사용자 입력이라 예외 아님). 오류 화면은 `isError && !data`.
- 라벨은 `/api/meta`가 SSOT. 신규 메타 키 `dcaSizingTypes`, `dcaShortfallPolicies`. `labelOf`는 누락 키를 가드한다.
- 접근성: 규칙 줄은 `<button>`이고 accessible name에 요약 포함. Select에 `aria-label`. 뷰 전환 시 포커스 이동. 모달 트리거에 `disabled` 금지.
- 로컬 DB는 실데이터다. 실제 제출(뮤테이션)로 검증하지 않는다 — 제출 계약은 단위 테스트로 고정한다.
- 서브에이전트에게 위임할 때 "커밋은 태스크 지시대로만, 그 외 커밋 금지"를 명시한다.

## 계약 요약 (kista-api 6668fafc)

요청 — 등록 `TradingCycleRequest.dca`, 수정 `PUT /api/trading-cycles/{id}/dca-config` 본문 모두:
```
{ rules: DcaRuleRequest[] }   // 1~10개 필수
DcaRuleRequest {
  ruleKey?: string|null         // 등록: 보내면 400(키 자체를 만들지 않는다). 수정: 기존 규칙은 응답 ruleKey 재전송, 신규는 null. 현재 버전에 없는 키 400
  direction: 'BUY'|'SELL'
  frequency: 'DAILY'|'WEEKLY'|'MONTHLY', dayOfWeek: DayOfWeek|null (WEEKLY), dayOfMonth: int|null (MONTHLY, null=말일)
  orderType: 'MOO'|'MOC'|'MARKET'   // 주식 MOO|MOC, 크립토 MARKET
  executionHour?: int           // 크립토 필수 0~23 KST. 주식은 보내지 않는다(서버 무시)
  sizing: { type: 'AMOUNT'|'HOLDING_PERCENT', amount: number|null, percent: number|null }
        // AMOUNT: amount>0 (주식 USD, 크립토 원 단위 정수 ≥5,000), percent=null
        // HOLDING_PERCENT: SELL 전용, 0<percent≤100, 서버 scale 2(셋째 자리부터 반올림), amount=null
  shortfall: 'PARTIAL'|'REJECT'
  conditions: DcaConditionRequest[]  // 기존 구조, 규칙당 ≤10
}
TradingCycleRequest.initialHoldings: number   // 주식 정수(소수면 400), 크립토 소수 8자리. DCA도 initialHoldings·initialAvgPrice 허용(initialHoldings>0이면 avgPrice>0 필수)
```
응답 `TradingCycleResponse.dca`:
```
{ rules: DcaRuleResponse[]  /* 입력 순서 보존 */, currentHoldings: number|null /* 원장, 크립토 소수 */, avgPrice: number|null }
DcaRuleResponse = DcaRuleRequest 필드(ruleKey 항상 채움, executionHour null 가능) +
  nextExecution: { usSessionDate, kstTradeDate } | null      // 크립토는 두 값이 같은 KST 일자
  lastExecution: { kstTradeDate, status: 'ORDERED'|'SKIPPED', skipReason: string|null } | null
```
- 최상위 `currentHoldings`(integer)는 크립토 DCA에서 null. DCA 보유는 항상 `dca.currentHoldings`를 읽는다.
- `DcaExecutionItem`에 `ruleKey: string`, `direction: 'BUY'|'SELL'` 추가(항상 채움). 같은 날 규칙마다 행이 생긴다.
- 메타: `dcaSizingTypes`(AMOUNT "고정 금액", HOLDING_PERCENT "보유 비율"), `dcaShortfallPolicies`(PARTIAL "가용만큼 주문", REJECT "주문하지 않음"), `dcaSkipReasons`에 `INSUFFICIENT_HOLDINGS`("보유 수량 부족").
- 계좌+종목 중복 등록 409 "같은 계좌에 이미 해당 종목 전략이 있습니다." — 전 전략 공통. UI는 기존 mutation `onError` 토스트로 충분(사전 차단 없음).
- 순투입액·평가손익은 전략 응답에 없다(§6 질문 2). 통계 `/api/stats/cycles`는 DCA(크립토 KRW 포함) 행을 내려주고 `startAmount` = 초기 원가 + 누적 순투입액. 요약·곡선은 크립토 KRW 제외(서버 처리).
- 관리자 수동 체결 보정 DCA 허용. UI에는 체결 보정(fills) 화면이 없고 재주문 패널(`AdminTradeCorrectionPanel`)에 DCA 제외 분기도 없다 → 코드 변경 없음(Task 8에서 확인만).

## Review Focus

1. **PC 모달에서 규칙 편집 중 ESC·바깥 클릭** → 폼 모달 전체가 닫혀야 한다(편집 뷰만 닫히고 모달이 남으면 결정 7 위반). Task 6의 `RouteModal` 테스트가 고정한다.
2. **수정 저장 시 ruleKey 보존·순서** → 기존 규칙 편집·삭제·신규 추가를 섞어도 `rules`가 화면 순서대로, 기존 키 그대로, 신규는 `null`로 나간다. 등록 payload에는 `ruleKey` 키가 없다. Task 5·6 테스트가 고정한다.
3. **같은 날 여러 규칙의 회차 이력 행** → React key 충돌 없이 모두 렌더되고, 현재 규칙에 없는 `ruleKey`는 "삭제된 규칙"으로 표시된다. Task 2 테스트가 고정한다.
4. **크립토 KRW DCA 사이클 성과 행** → 손익이 `$`가 아니라 원화로 표시된다. Task 8 테스트가 고정한다.
5. **보유 비율을 매수 규칙에서 선택** → 매수 편집 뷰에는 규모 토글이 없고, 스키마도 BUY+HOLDING_PERCENT를 거부한다. Task 5·6 테스트가 고정한다.

---

### Task 1: entities — 계약 타입·정규화·메타·규칙 포맷터

**Files:**
- Modify: `entities/strategy/model/types.ts` (DCA 블록 전체, `StrategyRequest.initialHoldings` 주석)
- Modify: `entities/strategy/api/index.ts` (`normalizeDca`, `normalizeDcaExecution`)
- Modify: `entities/strategy/model/dcaFormat.ts`, `entities/strategy/index.ts`
- Modify: `entities/meta/model/types.ts` (`MetaBundle`에 `dcaSizingTypes: EnumMeta[]`, `dcaShortfallPolicies: EnumMeta[]`) + 메타 기본값/fixture가 있으면 같은 키 추가(`grep -rn "dcaSkipReasons" entities shared features widgets --include=*.ts*`로 위치 확인)
- Test: `entities/strategy/api/index.test.ts`, `entities/strategy/model/dcaFormat.test.ts`

**Interfaces:**
- Produces (`@entities/strategy`에서 export):
```ts
export type DcaSizingType = 'AMOUNT' | 'HOLDING_PERCENT'
export type DcaShortfallPolicy = 'PARTIAL' | 'REJECT'
export interface DcaSizing { type: DcaSizingType; amount: number | null; percent: number | null }
export interface DcaRuleRequest {
  ruleKey?: string | null
  direction: DcaDirection; frequency: DcaFrequency; dayOfWeek: DcaWeekday | null; dayOfMonth: number | null
  orderType: DcaOrderType; executionHour?: number; sizing: DcaSizing; shortfall: DcaShortfallPolicy; conditions: DcaCondition[]
}
export interface DcaConfigRequest { rules: DcaRuleRequest[] }
export interface DcaRuleExecution { kstTradeDate: string; status: string; skipReason: string | null }
export interface DcaRule extends Omit<DcaRuleRequest, 'ruleKey' | 'executionHour'> {
  ruleKey: string; executionHour: number | null
  nextExecution: { usSessionDate: string; kstTradeDate: string } | null
  lastExecution: DcaRuleExecution | null
}
export interface StrategyDcaSummary { rules: DcaRule[]; currentHoldings: number | null; avgPrice: number | null }
// DcaExecution에 ruleKey: string, direction: DcaDirection 추가
export type DcaLabelOf = (category: 'orderDirections' | 'dcaFrequencies' | 'orderTypes' | 'dcaShortfallPolicies' | 'dcaSkipReasons', code: string) => string
export function formatDcaRuleSummary(rule: DcaRuleSummaryInput, labelOf: DcaLabelOf, isCrypto: boolean): string
export function formatDcaSizing(sizing: DcaSizing, isCrypto: boolean): string
export function earliestNextExecution(rules: DcaRule[]): DcaRule | null
export function latestLastExecution(rules: DcaRule[]): DcaRuleExecution | null
// DcaRuleSummaryInput = Pick<DcaRuleRequest, 'direction' | 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'orderType' | 'sizing'> & { executionHour?: number | null }
```
  `MetaProvider.labelOf`(`(category: keyof MetaBundle, code) => string`)를 `DcaLabelOf` 자리에 그대로 넘길 수 있어야 한다(파라미터 반공변).

- [ ] **Step 1: 실패 테스트 작성**

`dcaFormat.test.ts`:
```ts
const labelOf: DcaLabelOf = (_c, code) => ({ BUY: '매수', SELL: '매도', DAILY: '매일', MONTHLY: '매월', MOC: 'MOC' } as Record<string, string>)[code] ?? code
it('크립토 매수 금액 규칙 요약', () => {
  expect(formatDcaRuleSummary({ direction: 'BUY', frequency: 'DAILY', dayOfWeek: null, dayOfMonth: null, orderType: 'MARKET', executionHour: 9, sizing: { type: 'AMOUNT', amount: 15000, percent: null } }, labelOf, true))
    .toBe('매수 · 매일 09시 · 15,000원')
})
it('주식 규칙은 주문 방식을 시점으로 표시', () => {
  expect(formatDcaRuleSummary({ direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', sizing: { type: 'AMOUNT', amount: 100, percent: null } }, labelOf, false))
    .toBe('매수 · 매월 말일 · MOC · $100.00')
})
it('보유 비율 매도', () => {
  expect(formatDcaSizing({ type: 'HOLDING_PERCENT', amount: null, percent: 50 }, true)).toBe('보유 50%')
})
it('가장 이른 다음 실행 — 날짜 같으면 실행 시각 비교, null은 뒤로', () => {
  const r = (key: string, date: string | null, hour: number | null) => ({ ...BASE_RULE, ruleKey: key, executionHour: hour, nextExecution: date ? { usSessionDate: date, kstTradeDate: date } : null })
  expect(earliestNextExecution([r('a', null, 9), r('b', '2026-10-23', 10), r('c', '2026-10-23', 9)])?.ruleKey).toBe('c')
  expect(earliestNextExecution([r('a', null, 9)])).toBeNull()
})
it('가장 최근 실행 결과', () => {
  // lastExecution.kstTradeDate 최댓값, 모두 null이면 null
})
```
`BASE_RULE`은 테스트 파일 상단에 완전한 `DcaRule` 하나로 둔다.

`api/index.test.ts`: 계약 응답 형태(`dca: { rules: [{ ruleKey:'k1', direction:'SELL', ..., sizing:{type:'HOLDING_PERCENT', amount:null, percent:'50.00'}, shortfall:'REJECT', nextExecution:null, lastExecution:{kstTradeDate:'2026-10-21', status:'SKIPPED', skipReason:'INSUFFICIENT_HOLDINGS'} }], currentHoldings: '0.12345678', avgPrice: '4100000' }`)를 `normalizeStrategy` 경유(`getStrategy` 등 기존 테스트가 쓰는 진입점)로 넣고 `percent === 50`, `currentHoldings === 0.12345678`, `rules[0].ruleKey === 'k1'`을 단언한다. `dca-executions` 항목의 `ruleKey`·`direction`이 보존되는지도 단언한다. 기존 단일 규칙 형태의 테스트 데이터는 새 형태로 교체한다.

- [ ] **Step 2: 실패 확인** — `npx vitest run entities/strategy` → FAIL(`formatDcaRuleSummary` 미정의 등)

- [ ] **Step 3: 구현**
  - 요약 형식: `방향 · 주기[ 시각] · [주문방식 · ]규모`. 주기는 기존 `formatDcaSchedule(rule, labelOf('dcaFrequencies', rule.frequency))`, 주문방식은 주식만 `labelOf('orderTypes', orderType)`, 규모는 `formatDcaSizing`(AMOUNT → `fmtMoney(amount, isCrypto ? 'KRW' : 'USD')`, HOLDING_PERCENT → `보유 ${percent}%`).
  - `earliestNextExecution`: `kstTradeDate` 문자열 비교 후 `executionHour ?? 0` 비교.
  - `normalizeDca`: 숫자는 기존 `toNum`/`optDec`(BigDecimal이 문자열로 올 수 있음). `currentHoldings`·`avgPrice`는 null 유지. 규칙 정규화는 `normalizeDcaRule` 함수로 분리.
  - 구 `DcaConfigRequest` 단일 필드를 참조하던 `formatDcaSchedule`의 `Pick<DcaConfigRequest, ...>`는 `Pick<DcaRuleRequest, ...>`로 바꾼다.
  - `entities.md`의 "DCA 금액: 필드는 `amount`" 문장은 Task 9에서 고친다(여기선 코드만).

- [ ] **Step 4: 통과 확인** — `npx vitest run entities/strategy` PASS, `npx tsc --noEmit 2>&1 | grep -E "entities/(strategy|meta)/"` 출력 없음

- [ ] **Step 5: 커밋** — `git add entities/strategy entities/meta && git commit -m "feat: DCA 다중 규칙 계약 타입과 규칙 요약 포맷터를 추가한다"`

---

### Task 2: 회차 이력 — 규칙 열·삭제된 규칙·행 key

**Files:**
- Modify: `widgets/strategy-detail/DcaExecutionHistory.tsx`
- Test: `widgets/strategy-detail/DcaExecutionHistory.test.tsx`

**Interfaces:**
- Consumes: `formatDcaRuleSummary`, `DcaRule`, `DcaExecution.ruleKey/direction` (Task 1)
- Produces: `DcaExecutionHistory({ strategyId, ticker, rules }: { strategyId: string; ticker: string; rules: DcaRule[] })` — Task 4가 `rules={dca?.rules ?? []}`로 넘긴다.

- [ ] **Step 1: 실패 테스트** — 같은 `kstTradeDate`에 `ruleKey` `a`(현재 규칙에 있음, BUY)·`x`(없음, SELL) 두 행을 mock하고:
  - 두 행이 모두 렌더된다(`getAllByRole('row')` 헤더 포함 3)
  - `a` 행에 `formatDcaRuleSummary` 결과 텍스트, `x` 행에 "삭제된 규칙"과 "매도" 배지
  - `INSUFFICIENT_HOLDINGS` skip 사유가 메타 라벨 "보유 수량 부족"으로 보인다(fixture 메타에 항목 추가)
- [ ] **Step 2: 실패 확인** — `npx vitest run widgets/strategy-detail/DcaExecutionHistory.test.tsx` FAIL
- [ ] **Step 3: 구현** — 첫 열 다음에 "규칙" 열(`TableHeadCell`). 현재 `rules`에서 `ruleKey`를 찾으면 `formatDcaRuleSummary` 결과 문자열만 표시한다(요약이 방향 단어로 시작하므로 배지는 두지 않는다). 못 찾으면 `directionBadgeClass(r.direction)` 배지(`@entities/trade`, 라벨 `labelOf('orderDirections', r.direction)`) + "삭제된 규칙". 행 key `${r.kstTradeDate}-${r.ruleKey}`, "전략당 거래일 1건 보장" 주석은 "(전략, 거래일, 규칙)당 1건"으로 고친다.
- [ ] **Step 4: 통과 확인** — 같은 vitest PASS, `npx tsc --noEmit 2>&1 | grep DcaExecutionHistory` 없음
- [ ] **Step 5: 커밋** — `feat: DCA 회차 이력에 규칙 열과 삭제된 규칙 표시를 추가한다`

---

### Task 3: 전략 카드 — 규칙 수·가장 이른 다음 실행·최근 결과

**Files:**
- Modify: `widgets/strategy-card/DcaStrategyCard.tsx`
- Test: `widgets/strategy-card/DcaStrategyCard.test.tsx`

**Interfaces:**
- Consumes: `earliestNextExecution`, `latestLastExecution`, `formatCryptoNextExecution` (Task 1, 기존)

- [ ] **Step 1: 실패 테스트** — 규칙 3개(매수 2·매도 1, 다음 실행 날짜가 서로 다름) fixture로:
  - "규칙 3개 · 매수 2 · 매도 1" 텍스트
  - 다음 실행 값이 가장 이른 규칙 기준(주식 `fmtDate`, 크립토 `formatCryptoNextExecution(date, 그 규칙의 executionHour)`)
  - 최근 결과 배지가 가장 최근 `lastExecution` 기준
  - 방향 배지·주문 방식 배지·"회차당 금액" 행은 더 이상 없다
  - `dca` 누락이어도 카드 셸·티커 렌더(기존 테스트 유지)
- [ ] **Step 2: 실패 확인** — `npx vitest run widgets/strategy-card/DcaStrategyCard.test.tsx` FAIL
- [ ] **Step 3: 구현** — 모바일 2행·PC 골격 유지. 기존 `schedule` 자리에 규칙 수 요약, PC 푸터 "회차당 금액" 행은 삭제하고 chevron을 다음 실행 행으로 옮긴다.
- [ ] **Step 4: 통과 확인** — vitest PASS, `npx tsc --noEmit 2>&1 | grep DcaStrategyCard` 없음
- [ ] **Step 5: 커밋** — `feat: DCA 전략 카드를 규칙 수 요약으로 바꾼다`

---

### Task 4: 상세 — 원장 보유 타일·규칙 카드

**Files:**
- Modify: `widgets/strategy-detail/DcaStrategyDetail.tsx`
- Test: `widgets/strategy-detail/DcaStrategyDetail.test.tsx`

**Interfaces:**
- Consumes: Task 1 포맷터, Task 2 `DcaExecutionHistory` 새 prop, `useAccountPricesQuery(accountId, [ticker], { enabled })`(`@entities/account`, 주식), `cryptoPortfolioQueryOptions(accountId)`(`@entities/trade`, 크립토 현재가)

- [ ] **Step 1: 실패 테스트**
  - 크립토: `dca.currentHoldings: 0.5`, `avgPrice: 4000000`, crypto-portfolio mock `currentPrice: 4400000` → "0.5 ETH", "4,000,000원", 평가금액 "2,200,000원", 수익률 "+10.00%"(기존 `fmtSignedPercent` 형식). 보유 수량 sub는 "이 전략 체결 기준"
  - 크립토 포트폴리오 조회 실패여도 보유 수량·평단가는 보이고 평가금액·수익률만 "확인 불가"
  - 주식: prices mock `{ UPRO: 100 }`, `currentHoldings: 3`, `avgPrice: 80` → "3주", "$80.00", "$300.00", "+25.00%"
  - `currentHoldings: null` → 보유 수량 "0", 평단가·평가금액·수익률 "-"
  - 규칙 카드: 규칙마다 요약, 조건 문장(조건 없으면 "조건 없이 매 회차 주문"), 부족 시 정책 라벨, "다음 …" · "최근 …". 기존 "방향" 타일·`dca-config-grid`·"추가 조건" 카드는 없다
- [ ] **Step 2: 실패 확인** — `npx vitest run widgets/strategy-detail/DcaStrategyDetail.test.tsx` FAIL
- [ ] **Step 3: 구현**
  - `CryptoHoldingGrid` 삭제. `DcaHoldingGrid({ accountId, strategy, isCrypto })` 하나로: 보유·평단은 `dca`, 현재가는 크립토 = crypto-portfolio의 해당 티커 `currentPrice`, 주식 = `useAccountPricesQuery`. 두 쿼리는 시장별로 `enabled` 게이팅(크립토 계좌로 prices 호출 금지 — 400). 현재가가 없으면 평가금액·수익률 `UNAVAILABLE`.
  - `HOLDINGS_SUB = '이 전략 체결 기준'`.
  - 규칙 카드: `Card` 하나에 `<h2>`(`CardTitle role="heading" aria-level={2}`) "규칙" + 규칙별 `<li>`. 다음 실행 표기는 카드와 같은 규칙(주식 "다음 판정일", 크립토 "다음 실행"). 최근 결과는 `dcaExecutionStatusLabel` + skip 사유 라벨. 순투입액·평가손익 타일은 만들지 않는다(응답에 없음).
  - 전략타입 타일 옆 빈칸이 생기면 그리드를 1열로 둔다(빌더 재량).
- [ ] **Step 4: 통과 확인** — vitest PASS, `npx tsc --noEmit 2>&1 | grep strategy-detail/Dca` 없음
- [ ] **Step 5: 커밋** — `feat: DCA 상세를 원장 보유와 규칙 카드로 바꾼다`

---

### Task 5: 폼 모델 — 규칙·전략 스키마, 기본값, payload

**Files:**
- Modify: `features/strategy/create-strategy/model/dcaFormSchema.ts`, `model/buildDcaPayload.ts`
- Test: `model/dcaFormSchema.test.ts`, `model/buildDcaPayload.test.ts`

**Interfaces:**
- Consumes: Task 1 타입
- Produces:
```ts
export const MAX_DCA_RULES = 10
export const dcaRuleSchema   // z.object: market, ruleKey: string|null, direction, orderType, executionHour, frequency, dayOfWeek, dayOfMonth,
                             //   sizingType: 'AMOUNT'|'HOLDING_PERCENT', amount: number|null, percent: number|null, shortfall: 'PARTIAL'|'REJECT', conditions
export type DcaRuleFormValues = z.infer<typeof dcaRuleSchema>
export const dcaFormSchema   // z.object: market, ticker, scheduledStartDate, initialHoldings: number|null, initialAvgPrice: number|null,
                             //   rules: z.array(dcaRuleSchema).min(1, '규칙을 추가하세요.').max(MAX_DCA_RULES)
export type DcaFormValues = z.infer<typeof dcaFormSchema>
export function buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string, market: TradingMarket): DcaFormValues  // 등록: rules []
export function buildDcaRuleDefaults(direction: DcaDirection, market: TradingMarket): DcaRuleFormValues
export function buildDcaConfig(v: DcaFormValues): DcaConfigRequest          // 수정용: ruleKey ?? null 포함
export function buildDcaCreatePayload(v: DcaFormValues): StrategyRequest    // 등록용: 규칙에 ruleKey 키 없음
```
  `DcaConditionFormValue`, `LAST_DAY`, `DAY_OPTIONS`, `MAX_DCA_CONDITIONS`, `MIN_CRYPTO_ORDER_KRW`, `DEFAULT_EXECUTION_HOUR`는 유지.

- [ ] **Step 1: 실패 테스트**
  - 규칙 스키마: 기존 주기·시장 검증 테스트를 규칙 단위로 옮긴다. 추가로
    - BUY + `HOLDING_PERCENT` → `sizingType` 경로 오류
    - SELL + `HOLDING_PERCENT` + percent 0 / 100.5 / 33.333 → `percent` 오류("0 초과 100 이하로 입력하세요." / "소수 둘째 자리까지 입력하세요."), 50·100 통과
    - `AMOUNT` + amount null → "금액을 입력하세요.", 크립토 4999 → "최소 주문 금액은 5,000원입니다.", 소수 → "원 단위 정수로 입력하세요."
    - `HOLDING_PERCENT`이면 amount null이어도 통과
  - 전략 스키마: rules 0개 → `rules` 오류 "규칙을 추가하세요.", 11개 → 오류. 보유 시작값: 수량만/평단만 입력 → 각각 반대 필드 오류(기존 `strategyFormGuards`의 문구 재사용), 주식 수량 1.5 → "정수로 입력하세요." 계열 기존 문구, 크립토 수량 0.123456789(9자리) → 오류, 0.12345678 통과, 음수 → 오류
  - 기본값: `buildDcaRuleDefaults('SELL', 'CRYPTO_KRW')` = `{ ruleKey: null, direction: 'SELL', orderType: 'MARKET', executionHour: 9, frequency: 'MONTHLY', dayOfMonth: 'LAST', sizingType: 'AMOUNT', shortfall: 'PARTIAL', conditions: [], ... }`. 주식은 `orderType: 'MOC'`, `executionHour: null`
  - 수정 기본값: initial `dca.rules`(ruleKey `a`,`b`)가 순서·ruleKey·sizing을 보존해 폼 값이 된다. `initialHoldings`·`initialAvgPrice`는 null
  - payload:
    - `buildDcaCreatePayload` 결과의 각 규칙에 `'ruleKey' in rule === false`, 수량>0이면 `initialHoldings`·`initialAvgPrice` 포함, 수량 null/0이면 둘 다 키 없음
    - `buildDcaConfig`가 `[{ruleKey:'b'},{ruleKey:null}]` 순서를 그대로 직렬화
    - AMOUNT → `sizing: { type:'AMOUNT', amount: 15000, percent: null }`, HOLDING_PERCENT → `{ type:'HOLDING_PERCENT', amount: null, percent: 50 }`(폼에 남은 반대 값은 버린다)
    - 주식 규칙은 `executionHour` 키 없음, 크립토는 포함. 주기 아닌 요일/날짜는 null(기존 테스트 유지)
- [ ] **Step 2: 실패 확인** — `npx vitest run features/strategy/create-strategy/model/dcaFormSchema.test.ts features/strategy/create-strategy/model/buildDcaPayload.test.ts` FAIL
- [ ] **Step 3: 구현** — 기존 `superRefine` 규칙을 `dcaRuleSchema`로 옮기고 sizing 검증을 추가한다. `amount`의 `.refine(v != null)`은 `sizingType === 'AMOUNT'`일 때만 superRefine에서 검사한다. 보유 시작값 검증은 `strategyFormGuards.ts`의 기존 문구를 grep해 재사용하고, 소수 자릿수는 주식 0·크립토 8. `buildDcaFormDefaults`의 수정 경로는 `initial.dca.rules.map(ruleToFormValue)`.
- [ ] **Step 4: 통과 확인** — 같은 vitest PASS, `npx tsc --noEmit 2>&1 | grep create-strategy/model/` 없음
- [ ] **Step 5: 커밋** — `feat: DCA 폼 모델을 규칙 목록 구조로 바꾼다`

---

### Task 6: 폼 UI — 규칙 목록·편집 뷰·이력 처리

**Files:**
- Create: `shared/lib/subviewHistory.ts` (+ `shared/lib/subviewHistory.test.ts`)
- Modify: `shared/ui/RouteModal.tsx`, `shared/ui/RouteModal.test.tsx`
- Create: `features/strategy/create-strategy/sections/DcaRuleList.tsx`, `sections/DcaRuleEditor.tsx`
- Modify: `features/strategy/create-strategy/DcaStrategyForm.tsx`, `sections/DcaSettingsSection.tsx`, `sections/DcaConditionsSection.tsx`
- Test: `DcaStrategyForm.test.tsx`, `sections/DcaSettingsSection.test.tsx`, `sections/DcaConditionsSection.test.tsx`, Create `sections/DcaRuleEditor.test.tsx`

**Interfaces:**
- Consumes: Task 5 전부, Task 1 `formatDcaRuleSummary`
- Produces:
```ts
// shared/lib/subviewHistory.ts — 같은 URL 안 하위 뷰(편집 화면 등)를 브라우저 이력 한 칸으로 표현
export const SUBVIEW_HISTORY_KEY = '__kistaSubview'
export function pushSubviewEntry(): void          // window.history.pushState({ ...window.history.state, [KEY]: true }, '')
export function isSubviewEntry(state: unknown = window.history.state): boolean
export function useSubviewHistory(open: boolean, onPop: () => void): { leave: () => void }
//   open이 false→true가 될 때 pushSubviewEntry, popstate에서 !isSubviewEntry(event.state)면 onPop 호출,
//   leave() = window.history.back() (편집 뷰를 닫는 유일한 경로 — onPop이 실제로 닫는다)
```
  `DcaRuleEditor({ market, initial, isNew, onDone, onDelete, onCancel }: { market: TradingMarket; initial: DcaRuleFormValues; isNew: boolean; onDone: (v: DcaRuleFormValues) => void; onDelete?: () => void; onCancel: () => void })`
  `DcaRuleList({ rules, market, onSelect, onAdd, registerRowRef, error }: { rules: DcaRuleFormValues[]; market: TradingMarket; onSelect: (index: number) => void; onAdd: (direction: DcaDirection) => void; registerRowRef: (index: number, el: HTMLButtonElement | null) => void; error?: string })`
  `DcaSettingsSection`·`DcaConditionsSection`의 `form` prop 타입은 `UseFormReturn<DcaRuleFormValues>`로 바뀐다.

**이력 처리 결정(Next 16.2.6 `app-router.js` 확인 결과):** URL 없이 `history.pushState(data, '')`를 부르면 Next 패치가 `__NA`·내부 트리를 `data`에 복사하고 라우터 액션을 dispatch하지 않는다. 그 항목에서 뒤로가기하면 `popstate`가 `__NA` 있는 state로 와 같은 URL 트래버스(no-op)가 된다. 따라서 쿼리 파라미터 없이 pushState 한 칸으로 처리한다.
- 편집 뷰 진입: `editing` 상태 설정 + `pushSubviewEntry()`.
- 편집 뷰 종료(완료·취소·← 규칙 목록): 완료는 초안을 부모 `rules`에 먼저 반영(`update`/`append`)한 뒤 `leave()`. 실제 `editing=null`과 포커스 복귀는 `onPop` 한 곳에서만 한다. 브라우저 뒤로가기도 같은 `onPop`을 탄다(= 취소).
- `RouteModal.dismiss()`: `isSubviewEntry()`면 `window.history.go(-2)`, 아니면 기존 `router.back()`. ESC·바깥 클릭·X 모두 `dismiss()`를 거치므로 편집 중에도 모달 전체가 닫힌다.
- ponytail: 편집 뷰에서 새로고침하면 표식만 남은 이력 한 칸이 생긴다(뒤로가기 한 번이 no-op). 마운트 시 정리 로직은 두지 않는다 — 실제 불편 보고가 오면 마운트에서 `replaceState`로 표식 제거.

- [ ] **Step 1: 실패 테스트**
  - `subviewHistory.test.ts`: `pushSubviewEntry` 후 `isSubviewEntry()` true, 기존 state 키 보존. `useSubviewHistory(true, onPop)`에서 `leave()` → popstate(표식 없는 state) → `onPop` 1회
  - `RouteModal.test.tsx`: `history.state`에 표식이 있으면 ESC 시 `window.history.go(-2)` 호출, `router.back` 미호출. 표식 없으면 기존대로 `router.back`
  - `DcaRuleEditor.test.tsx`:
    - BUY 편집: 규모 토글 없음, 금액 입력만. 부족 시 정책 라벨 "원화가 부족할 때"(크립토)/"달러가 부족할 때"(주식), 카드 "남은 금액만큼 매수"/"주문 안 함", 기본 선택 PARTIAL
    - SELL 편집: "금액 / 보유 비율 %" 토글, 비율 선택 시 비율 입력 + 캡션 "100% = 보유 전량", 라벨 "보유가 부족할 때", 카드 "잔량 전부 매도"/"주문 안 함"
    - "완료" 시 검증 실패(금액 비움)면 `onDone` 미호출·오류 표시, 통과하면 `onDone(values)`
    - `isNew=false`면 `destructive` "규칙 삭제" 버튼 → `onDelete`. `isNew=true`면 없음
    - 마운트 시 포커스가 제목("매수 규칙"/"매도 규칙", `h2`)에 있다
  - `DcaStrategyForm.test.tsx`(통합, mutation 훅 mock):
    - 등록: 규칙 0개로 "등록" → "규칙을 추가하세요." 표시, `create.mutate` 미호출. "+ 매수 규칙 추가" → 편집 뷰 → 금액 입력 → "완료" → 목록에 요약 줄(버튼 이름에 요약 포함) → "등록" → `create.mutate` 인자의 `dca.rules[0]`에 `ruleKey` 키 없음
    - **수정 ruleKey 보존**: initial 규칙 `a`(BUY)·`b`(BUY). `b` 줄 클릭 → 금액 변경 → 완료, `a` 줄 클릭 → "규칙 삭제", "+ 매도 규칙 추가" → 금액 입력 → 완료, "수정" → `reconfigure.mutate`가 `{ rules: [{ ruleKey: 'b', ... }, { ruleKey: null, direction: 'SELL', ... }] }`를 받는다
    - "취소"·"← 규칙 목록"은 변경을 버린다(편집 후 취소 → 요약 그대로)
    - 편집 뷰에서 돌아오면 포커스가 해당 규칙 줄(새 규칙이면 새 줄)
    - 10개면 추가 버튼 두 개 모두 없다
    - 편집 뷰에서 `FormActions`("등록"/"수정")는 렌더되지 않는다
  - 테스트 환경에서 `history.back()`은 popstate를 비동기로 쏘거나 jsdom이 지원하지 않을 수 있다 — `useSubviewHistory`의 `leave`를 직접 popstate를 디스패치하는 방식으로 감싸지 말고, 테스트에서 `vi.spyOn(window.history, 'back').mockImplementation(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))`로 고정한다.
- [ ] **Step 2: 실패 확인** — `npx vitest run shared/lib/subviewHistory.test.ts shared/ui/RouteModal.test.tsx features/strategy/create-strategy` FAIL
- [ ] **Step 3: 구현**
  - `DcaStrategyForm`: 부모 `useForm<DcaFormValues>` + `useFieldArray({ name: 'rules' })`(기본 keyName `id` — 폼 필드명으로 `id`를 쓰지 않는다). `editing: { index: number | null; direction: DcaDirection } | null` UI 상태. 편집 중이면 `DcaRuleEditor`만, 아니면 목록 뷰(종목 → 시작 예정일(등록) → 보유 시작값(Task 7, 이 태스크에선 자리 비움) → `DcaRuleList` → `FormActions`).
  - `DcaRuleEditor`: 자체 `useForm<DcaRuleFormValues>({ resolver: zodResolver(dcaRuleSchema), defaultValues: initial })`. 상단 `← 규칙 목록` 버튼(링크 스타일, `onCancel`) + `h2` 제목(방향 배지 포함, `tabIndex={-1}`, 마운트 포커스). 순서: 실행 시점 → 주기 → 조건 → 규모 → 부족 시 정책 → "취소"/"완료"(+ 기존 규칙이면 "규칙 삭제").
  - `DcaSettingsSection`에서 "방향" 블록을 제거하고(방향은 편집 뷰 제목이 보여 준다, 변경 불가 — 결정 2), 금액 블록은 규모 블록으로 바꾼다: SELL이면 `SelectionCard` 2장("금액"/"보유 비율 %") 토글 후 해당 입력, BUY면 금액만. 실행 시점(주식 MOO/MOC 카드·크립토 시각 Select)을 주기보다 위로. `isEdit`·`directions` prop 삭제.
  - `DcaConditionsSection`: `direction` prop은 유지(매수 평단 캡션). 캡션 "평단가·보유 수량은 계좌 전체 보유 기준" → "평단가·보유 수량은 이 전략 체결 기준". 라벨 "추가 조건 (모두 충족 시 주문)"은 "조건 (모두 충족 시 주문)".
  - 부족 시 정책 카드 문구는 방향별 UI 상수로 둔다(메타 라벨 대신, spec §4.6 빌더 재량).
  - `DcaRuleList`: 줄마다 `<button type="button">` — 1행 `formatDcaRuleSummary`, 2행 조건 `formatDcaCondition` 결과를 " AND "로 잇고 ` · ` + 부족 시 정책 짧은 라벨(`labelOf('dcaShortfallPolicies', ...)`), 오른쪽 `ChevronRight`. 제목 "규칙 (n/10)". 0개면 "규칙을 추가하세요." 빈 상태(+ 제출 시 스키마 오류 같은 문구). 하단 "+ 매수 규칙 추가"/"+ 매도 규칙 추가" `variant="brand-soft" size="sm"`, 10개면 숨김.
- [ ] **Step 4: 통과 확인** — 같은 vitest PASS, `npx tsc --noEmit 2>&1 | grep -E "create-strategy/|shared/(lib/subviewHistory|ui/RouteModal)"` 없음, `npx eslint features/strategy/create-strategy shared/lib/subviewHistory.ts shared/ui/RouteModal.tsx --max-warnings 0` 통과
- [ ] **Step 5: 커밋** — `feat: DCA 등록·수정 폼을 규칙 목록과 규칙 편집 화면으로 나눈다`

---

### Task 7: 보유 시작값 입력

**Files:**
- Modify: `features/strategy/create-strategy/sections/InitialHoldingsSection.tsx`, `DcaStrategyForm.tsx`
- Test: `sections/InitialHoldingsSection.test.tsx`, `DcaStrategyForm.test.tsx`

**Interfaces:**
- Produces: `InitialHoldingsSection`에 optional prop `priceUnit?: string`(기본 `'USD'`), `priceMaxDecimals?: number`(기본 2), `quantityUnit?: string`(기본 `'주'`), `quantityMaxDecimals?: number`(기본 없음 = 기존 동작), `caption?: ReactNode`. 기존 호출부(`StrategyForm`)는 변경 없이 동작해야 한다.

- [ ] **Step 1: 실패 테스트**
  - `InitialHoldingsSection`: `quantityUnit="ETH" quantityMaxDecimals={8} priceUnit="원" priceMaxDecimals={8}`면 단위 표시, 수량 9자리 소수 입력이 막힌다. prop 없으면 기존 "USD"/"주"
  - `DcaStrategyForm`: 등록 모드에 평단가·수량 입력이 있고 수정 모드엔 없다. 매도 규칙이 있거나 어떤 규칙에 `AVG_PRICE` 조건이 있는데 수량이 비면 "보유 0에서 시작합니다. 이미 보유 중이면 입력하세요." 캡션. 매수 규칙만 있고 평단 조건 없으면 캡션 없음. 수량·평단 입력 후 등록하면 payload에 `initialHoldings`·`initialAvgPrice`
- [ ] **Step 2: 실패 확인** — `npx vitest run features/strategy/create-strategy/sections/InitialHoldingsSection.test.tsx features/strategy/create-strategy/DcaStrategyForm.test.tsx` FAIL
- [ ] **Step 3: 구현** — `DcaStrategyForm`이 `setValue('initialHoldings'|'initialAvgPrice', v, { shouldValidate: isSubmitted })`로 연결. 크립토 단위는 티커(수량)·"원"(평단), 주식은 "주"·"USD". 스키마 오류 메시지는 섹션 아래에 표시(섹션에 `error?: string` prop 추가 또는 폼에서 렌더 — 빌더 재량).
- [ ] **Step 4: 통과 확인** — vitest PASS(기존 `StrategyForm.test.tsx`도 `npx vitest run features/strategy/create-strategy`로 함께), tsc grep 없음
- [ ] **Step 5: 커밋** — `feat: DCA 등록에 보유 시작값 입력을 추가한다`

---

### Task 8: 통계 크립토 DCA 행·잔여 단일 규칙 전제 정리

**Files:**
- Modify: `widgets/stats-overview/CyclePerformanceList.tsx`, `widgets/stats-overview/CycleRows.tsx`
- Test: `widgets/stats-overview/CyclePerformanceList.test.tsx`
- Modify(grep 결과에 따라): 구 전제가 남은 주석·문구

**Interfaces:**
- Consumes: `isCryptoBroker`, `brokerCurrency`(`@shared/lib/api-schema`), `fmtMoney`, `fmtSignedKrw`

- [ ] **Step 1: 실패 테스트** — 계좌 목록에 UPBIT 계좌 포함 시 계좌 필터 선택지에 그 계좌가 보인다. 그 계좌의 사이클 행 `pnl: 12345` → "+12,345원"(데스크톱 표·모바일 행 모두), USD 계좌 행은 기존 "+$…".
- [ ] **Step 2: 실패 확인** — `npx vitest run widgets/stats-overview/CyclePerformanceList.test.tsx` FAIL
- [ ] **Step 3: 구현** — `accountOptions`의 크립토 필터와 주석 삭제. `CycleRows`에 `currencyOf: (accountId: string) => Currency`(또는 `accountsById` 전달) prop을 추가해 `pnlText`가 KRW면 `fmtSignedKrw`, USD면 기존 `fmtSignedUsd(pnl, 2, '$')`. 시작금액 등 다른 금액 열이 있으면 같은 통화 규칙.
- [ ] **Step 4: 잔여 정리(확인 위주)** — 아래 grep 결과를 보고 구 전제(전략 = 단일 방향, 계좌 전체 보유, 매수·매도 DCA 별도 등록)가 남은 코드 주석·문구만 고친다. 동작 변경이 필요해 보이면 고치지 말고 보고한다.
  ```bash
  grep -rn "계좌 전체 보유\|매수·매도 DCA\|단방향\|코인 DCA는 cycle_position\|dca.direction\|dca.amount\|dca.nextExecution\|dca.lastExecution" --include=*.ts --include=*.tsx app entities features widgets shared
  ```
  확인만 하고 결과를 보고할 것: (a) `AdminTradeCorrectionPanel`·`AdminTradesWorkbench`가 DCA 전략을 거르지 않는다(현재 grep상 없음), (b) 배치 미리보기·다음 주문 소비처(`NextOrdersResponse`/`PositionSnapshot` 사용처)가 주식 DCA 행이 섞여도 깨지지 않는지, (c) `initialUsdDeposit` 합산처에 DCA가 섞이는지. 문제가 보이면 수정하지 말고 백로그로 보고한다.
- [ ] **Step 5: 통과 확인** — vitest PASS, `npx tsc --noEmit 2>&1 | grep stats-overview` 없음
- [ ] **Step 6: 커밋** — `feat: 통계 사이클 성과에 크립토 DCA 행을 원화로 표시한다`

---

### Task 9: 계약 재생성·문서·전체 검증

**Files:**
- Modify: `openapi.json`, `shared/lib/api-types.ts`(생성물)
- Modify: `docs/agents/entities.md`(strategy DCA·DCA 금액 항목), `docs/agents/widgets.md`(`strategy-card`·`strategy-detail` DCA 분기 항목의 "currentHoldings 계좌 전체 값 — 매수·매도 DCA가 공유" 문장), `docs/agents/features.md`(`create-strategy` DCA 분기 항목: 규칙 목록·편집 뷰·`subviewHistory`·"종목·방향 읽기 전용" → 종목만), `shared/ui/RouteModal` 관련 `docs/agents/app.md` 인터셉팅 라우트 항목(하위 뷰 이력 처리 한 줄)
- Modify: `README.md`(DCA 설명이 있으면 드리프트 확인)
- Modify: 메모리 `project_dca_strategy.md`(진행 상태)

- [ ] **Step 1: 스펙 재생성** — 사용자에게 kista-api main(6668fafc 포함)과 kista-trading을 로컬(:8080, :8081)로 띄워 달라고 요청한다(임의 기동 금지). 떠 있으면 `npm run fetch:spec && npm run gen:types`. 확인할 것: `DcaRuleRequest`·`DcaSizingRequest`·`dcaSizingTypes`가 생기고, holdings 계열(`initialHoldings`, `CycleHistoryResponse.holdings`, `PositionSnapshot.holdings`, `PositionDto.holdings`, `finalHoldings`)이 `number`. 계약 요약과 다른 필드명이 있으면 Task 1 타입을 맞추고 보고한다. API를 띄울 수 없으면 이 단계는 "미검증(로컬 API 미기동)"으로 보고하고 다음 단계로 간다.
- [ ] **Step 2: 전체 검증** — 한 번만:
  ```bash
  npm run typecheck && npm run lint && npm run knip && npm run test:run 2>&1 | grep -E "Test Files|Tests|FAIL|error" 
  ```
  전부 통과. 실패 시 원인 태스크 범위에서 고치고 재실행.
- [ ] **Step 3: 화면 확인** — 로컬 API가 떠 있을 때 dev 서버에서 Playwright 스크린샷(PC 1440×900, 모바일 390×844): 크립토·주식 DCA 상세, 전략 카드 목록, 등록 폼 목록 뷰·매도 편집 뷰(PC 모달). 모달에서 편집 뷰 진입 후 ESC → 모달이 닫히는지, 모바일 풀페이지에서 브라우저 뒤로가기 → 목록 뷰로, 한 번 더 → 폼 닫힘을 확인한다. 제출은 하지 않는다(실데이터). DCA 데이터가 로컬 DB에 없으면 visual-diff의 GET 전용 프록시 fixture(메모리 `project_visual_regression_mock_proxy.md`)를 쓴다. `npm run a11y-check -- --url <폼 URL>`로 편집 뷰 포커스·이름을 확인한다.
- [ ] **Step 4: e2e** — 화면 흐름이 바뀌었으므로 로컬 API가 떠 있으면 `npm run test:e2e`(DCA 관련 스펙). 낡은 단언은 새 흐름에 맞춘다.
- [ ] **Step 5: 문서 커밋** — 위 문서·생성물 수정 후 `git commit -m "docs: DCA 다중 규칙 구조로 에이전트 문서를 갱신한다"`(생성물은 별도 커밋 `chore: openapi 스펙과 생성 타입을 갱신한다`).
- [ ] **Step 6: 병합 보류 보고** — 브랜치를 main에 병합하지 않는다. 사용자에게 "kista-api Plan 2 배포와 함께 병합·push 필요"를 보고하고, kista-api-83 세션에 UI 준비 완료를 알린다.
