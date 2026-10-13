# DCA 전략 UI 설계

- 작성일: 2026-10-13
- 백엔드 SSOT: `kista-api` `docs/superpowers/specs/2026-10-13-dca-strategy-design.md` (커밋 3eceed94, 7장 API 계약)
- 이 문서는 kista-ui 쪽 변경만 다룬다. 계약 필드 정의는 백엔드 spec 7장을 따르고, 여기에는 UI가 소비하는 방식만 적는다.

## 1. 목표와 확정 요구사항

정기 적립식(DCA) 전략을 등록·수정·조회할 수 있게 한다.

| 항목 | 확정 내용 |
|---|---|
| 종목 | UPRO, QLD (DCA 전용, 메타 `availableTickers`가 SSOT) |
| 방향 | 전략 1개 = BUY 또는 SELL. 같은 계좌·티커에 매수 1개 + 매도 1개까지 |
| 주기 | DAILY / WEEKLY(월~금 요일) / MONTHLY(1~31일 또는 말일) |
| 금액 | 회차당 USD (`amountUsd > 0`) |
| 주문유형 | MOO / MOC 두 가지만 |
| 조건 | 0개 이상, AND 결합. AVG_PRICE(±n%) / SMA(20·50·120·200) / RSI / FEAR_GREED |
| 보정 | 날짜 보정·휴장 이월·조건 평가는 전부 서버가 한다. UI는 응답의 `nextExecution`을 표시만 한다 |

백엔드 결정 중 UI에 영향이 있는 것:

1. 매수 MOO/MOC는 서버가 캡 지정가(전일종가 × 1.05, KIS는 LOO/LOC)로 바꿔 접수한다. 갭이 +5%를 넘으면 미체결될 수 있다.
2. Toss 계좌의 MOO는 "개장 직후 지정가"로 근사한다. 시가 체결을 보장하지 않는다.
3. 보유 수량과 평단은 브로커 실잔고(계좌+티커 합산) 기준이다. 수동 매매분도 포함된다.
4. 개장 배치가 22:30에서 22:00 KST로 당겨진다.
5. DCA는 수동 실행(`/execute`)과 미리보기를 지원하지 않는다(409 `DCA_MANUAL_EXECUTION_UNSUPPORTED`).
6. 수정 시 ticker와 direction은 바꿀 수 없다.

## 2. 데이터 계층 (`entities/`)

- `npm run gen:types`로 openapi 타입을 받는다. 수동 타입은 기존 `types.ts` 관례대로 api-schema에서 파생한다.
- `entities/strategy/model/types.ts`
  - `Strategy.dca?: StrategyDcaSummary`: 등록 필드 + `nextExecution {usSessionDate, kstTradeDate} | null` + `lastExecution {kstTradeDate, status, skipReason} | null`
  - `StrategyRequest.dca?: DcaConfigRequest`
  - `DcaCondition { indicator, operator, threshold?, smaPeriod? }`
- `entities/strategy/api/index.ts`
  - `reconfigureDca(id, body)`: `PUT /api/trading-cycles/{id}/dca-config` (`reconfigureVr`와 같은 패턴)
  - `listDcaExecutions(id, page, size)`: `GET /api/trading-cycles/{id}/dca-executions`
  - normalizer: 기존 Strategy normalizer에 `dca` 매핑 추가
- `entities/strategy/hooks`
  - `useDcaExecutionsQuery(id, page)`: queryKey는 `queryKeys.ts`에 추가
  - `useReconfigureDcaMutation`: `onError` 토스트에 마침표(entities 레이어 컨벤션). 성공하면 전략 목록과 상세 키를 invalidate
- `entities/meta`: `StrategyCapability`에 `orderTypes`, `directions`, `frequencies`, `conditionIndicators`를 추가한다. 신규 enum 메타(`DcaFrequency`, `DcaIndicator`와 SMA 기간 옵션, `DcaOperator`, `DcaSkipReason`)는 label을 메타에서 받는다. UI에 라벨 리터럴을 하드코딩하지 않는다.
- `strategyTypeShort('DCA')`는 원문 `DCA`를 그대로 반환하므로 변경하지 않는다.

## 3. 등록·수정 폼 (`features/strategy/create-strategy`)

방식: A'안(2026-10-13 승인, A안 수정). 라우트·페이지·모달·전략 유형 선택은 기존 `StrategyForm`을 그대로 쓰고, 유형이 DCA면 그 아래를 별도 `DcaStrategyForm`(자체 hook·스키마·payload)으로 렌더한다.

- 변경 이유: `useStrategyForm`의 제출 guard(`computeCannotSubmit`, `computeSubmitDisabledReason`)가 시드·예수금·VR 계산에 엮여 있다. DCA 분기를 끼워 넣으면 guard마다 `!isDca`가 필요하고, 하나라도 빠지면 제출이 막힌다.
- `useStrategyForm` 변경은 seed preview 쿼리 `enabled`에 `type !== 'DCA'`를 추가하는 것뿐이다.
- `StrategyForm`: `form.type === 'DCA'`(등록) 또는 `initial?.type === 'DCA'`(수정)이면 `StrategyTypeSection` 아래에 `DcaStrategyForm`을 렌더하고 기존 섹션과 제출 버튼은 렌더하지 않는다.
- `DcaStrategyForm` 구성: Ticker(기존 `StrategyTickerSection` 재사용), ScheduledStart(등록 전용, 재사용), `DcaSettingsSection`, `DcaConditionsSection`, 자체 `FormActions`
- 런타임 설정 노출: 등록 폼은 `runtimeConfig.strategies[code].enabled`인 유형만 보여준다. DCA가 런타임 설정에 포함되는지는 API 회신으로 확정하고 계획에 반영한다.
- 신규 `sections/DcaSettingsSection.tsx`
  - 방향: 매수/매도 라디오. 수정 모드에서는 읽기 전용.
  - 금액(USD)
  - 주문유형: MOO/MOC 라디오. 각 옵션 아래 안내 캡션(문구는 5장)
  - 주기: DAILY/WEEKLY/MONTHLY
    - WEEKLY는 요일 셀렉트(월~금)
    - MONTHLY는 날짜 셀렉트(1~31 + "말일"). "말일"은 `dayOfMonth: null`로 직렬화한다.
    - 29~31을 고르면 보정 캡션을 표시한다.
- 신규 `sections/DcaConditionsSection.tsx`
  - `useFieldArray`로 조건 행을 관리한다. 행 구성은 `[지표] [연산자] [기준값 또는 SMA 기간]` + 삭제 버튼, 아래에 "조건 추가" 버튼.
  - 지표별 입력: AVG_PRICE는 % 숫자(음수 허용), RSI·FEAR_GREED는 0~100, SMA는 기간 셀렉트(threshold 미전송)
  - 0개면 "조건 없이 매 회차 주문"을 표시한다.
  - 조건 영역 상단에 "계좌 전체 보유 기준" 캡션을 둔다.
  - 매수 DCA에만 "보유 0주일 때는 평단가 조건 없이 매수" 캡션을 단다.
  - 지표 선택지는 `capability.conditionIndicators`를 따른다. 백엔드 1단계 배포에서는 미지원 지표 등록 시 400이 나므로, 메타가 반환하는 목록만 노출한다.
- `model/dcaFormSchema.ts`(신규, zod): DCA 검증
  - 금액 > 0
  - WEEKLY면 요일 필수
  - RSI·FEAR_GREED 0~100, AVG_PRICE는 숫자
  - SMA면 기간 필수
- `model/buildDcaPayload.ts`(신규): 등록은 `{ type: 'DCA', ticker, scheduledStartDate?, dca }`, 수정은 `dca` 객체만 보낸다.
- 수정 경로: `DcaStrategyForm`이 `initial`이 있으면 `PUT /dca-config`(`useReconfigureDcaMutation`)로, 없으면 기존 `useCreateStrategyMutation`으로 저장한다. 수정 모드에서 ticker와 direction은 읽기 전용이다.
- 등록 응답의 `todayOpenBatchMissed` 토스트는 DCA에서 띄우지 않는다. "바로 주문" 경로가 없기 때문이다.
- 409 중복(같은 계좌·티커·방향)은 기존 서버 에러 피드백 패턴으로 표시한다.

## 4. 카드·상세 (`widgets/`)

미리보기 409를 막는 것이 핵심이다.

- `useStrategyOrderPreviewQuery`를 DCA에서 호출하지 않는다. `StrategyCard`와 `StrategyDetail`에서 `enabled: strategy.type !== 'DCA'`로 막는다. 쿼리 옵션에 `enabled` 파라미터가 없으면 추가한다.
  - 막지 않으면 카드마다 409 에러 상태가 된다.
  - `initialPreview` SSR 프리페치도 DCA는 제외한다.
- `StrategyCard`: DCA 레이아웃 분기
  - 방향 배지(매수/매도)
  - 요약 한 줄: 예) "매월 말일 · $300 · MOC", "매주 월요일 · $100 · MOO"
  - 다음 판정일: `nextExecution.kstTradeDate`, null이면 "예정일 미정"
  - 최근 결과: `lastExecution`(주문됨 / 건너뜀 + 사유 라벨)
  - readiness와 시드 배지는 숨긴다.
- `StrategyDetail`: DCA면 `NextOrderCard`(바로 주문 버튼 포함)를 렌더하지 않고 다음을 보여준다.
  - 설정 요약 + 조건 목록(예: "RSI(14) ≤ 35", "종가 < SMA200", "평단 −5% 이하")
  - 다음 판정일(보정 반영) + 안내 "조건 충족 여부는 실행일에 판정"
  - 보유 수량: `strategy.currentHoldings`(브로커 스냅샷), 캡션 "계좌 전체 보유 기준". `PositionGrid`는 preview를 쓰므로 DCA에서는 쓰지 않는다.
  - 회차 이력 리스트(`dca-executions`, 페이지네이션)
    - 열: 거래일, 결과(주문됨/건너뜀), 사유 라벨 + `detail`, 기준가, 수량, 주문 상태와 체결
    - 표가 가로로 스크롤되면 `role="region"` + `aria-label` + `tabIndex={0}`을 단다.
  - 일시정지·재개·삭제는 기존 그대로 쓴다.
- 요약 문구 포맷터 `formatDcaSchedule(dca, meta)`와 조건 포맷터 `formatDcaCondition`은 `entities/strategy/model`에 순수 함수로 둔다.

## 5. 안내 문구 (합니다체, 캡션은 명사구·마침표 없음)

- MOO: "장 시작 시 시장가 주문"
- MOC: "장 마감 시 시장가 주문"
- 매수 공통 캡션: "매수는 전일 종가 +5% 상한 지정가로 접수되어 급등 시 미체결될 수 있음"
- Toss 계좌 + MOO: "토스증권은 개장 직후 지정가로 접수되어 시가 체결이 보장되지 않음". 계좌 브로커 정보로 분기하며, 브로커 필드 위치는 계획 단계에서 확인한다.
- 29~31일 선택: "해당 날짜가 없는 달은 말일에 실행"
- 휴장 안내: "휴장일이면 같은 주·월 안의 다음 거래일에 실행"
- 날짜 기준: "실행일은 미국 거래일 기준이라 한국 날짜와 하루 차이 날 수 있음"
- skip 사유 라벨은 메타 `DcaSkipReason` label을 쓴다.
- 새 문구를 확정하기 전에 기존 문구를 grep해서 같은 표현을 재사용한다(constraints.md 카피 규칙).

## 6. 22:30 → 22:00 문구 동기화

백엔드 배포와 함께 개장 배치 시각 표기를 고친다.

- `features/strategy/create-strategy/model/useStrategyFormEffects.ts`: 토스트와 주석
- `features/strategy/create-strategy/sections/ScheduledStartSection.tsx`: 주석
- `shared/lib/format/index.ts`: 주석
- `shared/lib/api-types.ts`: `gen:types`로 자동 반영

## 7. 배포 순서와 범위

- 백엔드는 ① 무조건 DCA → ② 평단/SMA/RSI → ③ 공포탐욕 순으로 배포된다.
- UI는 ① 배포 후 한 번에 구현한다. 조건 지표는 메타 `conditionIndicators`로 노출을 제어하므로, ②와 ③ 배포 때 UI를 다시 수정할 필요가 없다.
- 구현 착수는 백엔드 ① 배포 알림 이후다(`gen:types`가 필요하기 때문).

## 8. 테스트

- 순수 함수 단위 테스트: `formatDcaSchedule`(말일·요일·일자), `formatDcaCondition`(지표별), `buildDcaPayload`(말일 → null, SMA는 threshold 미포함, WEEKLY 외 dayOfWeek null)
- 스키마: `dcaFormSchema` 검증
- 섹션 RTL: `DcaSettingsSection`(주기 전환 시 요일/날짜 노출, 29~31 캡션, 수정 모드에서 방향 읽기 전용), `DcaConditionsSection`(행 추가·삭제, SMA면 기간 셀렉트, 0개 안내)
- 위젯: `StrategyCard`와 `StrategyDetail`이 DCA에서 preview 쿼리를 호출하지 않고 바로 주문 버튼이 없는지
- 최종: `typecheck` + `lint` + 관련 테스트, Playwright로 등록 폼·카드·상세 스크린샷 확인

## 9. 범위 밖

- 수동 실행과 미리보기(백엔드 1차 미지원)
- 조건 OR와 그룹, 종료일·총 한도, 금액 이월
- 지정가와 LOC 주문유형
