# 05. UI·API 책임 분담 — 서버가 아는 것을 UI가 다시 계산하지 않는다

기준 문서: `kista-api/docs/superpowers/fable-review/ui-api-principles.md`(사용자 지시로 정한 공통 원칙), 서버 쪽 규약 `kista-api/docs/superpowers/fable-review/guides/10-ui-contract.md`.
근거 측정: `findings/j-ui-api-principle-violations.md`(위반 전수), `findings/b-type-duplication.md` 4·6절.

원칙 요약: 어느 쪽에서 해도 되는 일은 API가 한다. UI는 화면 상태, 표시 형식, 상호작용, 레이아웃 문구, 전량형 목록 안의 즉시 정렬·필터만 맡는다. 판정 질문은 "두 번째 클라이언트가 생기면 이 로직을 다시 구현해야 하는가"이다.

이 지침서의 태스크는 전부 서버 변경이 먼저다. 서버 변경 없이 UI만 지울 수 있는 것은 없다.

## 현재 구조와 문제

원칙 표의 행별 위반(`findings/j` 11-1절). 중복을 빼면 API가 바뀔 때 사라지는 UI 코드는 약 1,800~2,000줄이다.

| 원칙 행 | 위반 | UI 줄 | 대표 위치 |
|---|---|---:|---|
| 목록 페이징·정렬·필터 | 늘어나는 데이터를 전량 받아 클라이언트에서 처리하는 목록 10개, 서버 페이지 안 재정렬 1건 | 약 240 | `widgets/finance-record-list/FinanceRecordList.tsx:102-139`(12개월치를 받아 유형·기간·카테고리·메모 검색·정렬 5키·페이징), `widgets/asset-record-list/AssetRecordList.tsx:68-119`(전 기간 전량), `widgets/strategy-detail/StrategyOrderHistory.tsx:46-59`, `DcaExecutionHistory.tsx:56-63`(주석이 "페이지 단위 정렬 — 경계를 못 맞춘다"고 적는다) |
| 집계·계산 | 가계부 5파일, 그 외 12건 | 약 1,350 | `entities/finance/lib/aggregate.ts` 271, `flowAggregate.ts` 296, `bulkRegisterPreview.ts` 162, `period.ts` 146. 그 외 일별 체결 캘린더 합계, 통계 활성 사이클 합, 벤치마크 CAGR, PRIVACY 누적 손익 |
| 업무 규칙 검증 | `features/strategy/**/model`에서 업무 규칙 254줄(형식 검증 116줄의 2.2배). VR 램프 규칙은 5곳에 사본 | 약 254 | `strategyFormGuards.ts` 200줄, `vrDerived.ts:36-84`, `dcaFormSchema.ts`의 상한 상수(`MAX_DCA_RULES`, 주석 "kista-api 상한과 동일") |
| 상태 판정 | 13건 | 약 210 | `entities/order/model/order-readiness.ts` 64(서버가 준 점검 결과 3개를 다시 해석), `entities/strategy/model/capitalAdjustment.ts`, `scheduled-start.ts`, `entities/account/model/apiKeyExpiry.ts`(주석 "api 만료 알림(D-30)과 같은 기준"), 예산 상태, 월 마감 스코프 판정 |
| 코드값 라벨·옵션 | 값 집합 19종이 약 110곳에 선언. 메타 키가 없는 집합의 라벨을 UI가 보유 | 약 260 | `entities/user/model/status.ts`·`role.ts` 50, `orderBannerCopy.ts:5-12`, `vrRamp.ts:1-9`, `shared/lib/api-schema.ts:52-114`(증권사 → 시장·통화·자릿수 맵, 주석이 메타와의 중복을 인정) |
| 오류 문구 | `apiMsg(err, '…')` 폴백 문구 약 31개, 코드 → 문구 맵 | 약 90 | `entities/account/model/brokerCredentials.ts:16-30`, mutation hook마다의 실패 문구 |
| 날짜·거래일 | 13건 | 약 230 | `entities/strategy/model/vr-rollover.ts`(주석 "VrCycleRolloverService의 dueDate와 동일 규칙"), `dcaFormat.ts:73-93`, KST 주 시작·거래일 계산 |
| 금액 반올림 | 9건 | 약 25 | `floorToCents`, `CURRENCY_SCALE` 사본 |
| 리소스 합치기 | 한 화면이 항상 같이 부르는 묶음 9화면 | 약 400 | 계좌 상세(계좌 + 전략 목록 + 주문 미리보기 + 포트폴리오 + 원장 합계), 가계부 대시보드 |

공통 징후는 주석이다. "서버와 동일 규칙", "kista-api 상한과 동일", "UI `RAMP_DEFAULTS_BY_MODE`와 동기화"(서버 문서 쪽)처럼 사본임을 주석으로만 묶어 둔 곳이 양쪽에 있다. 서버 규칙이 바뀌면 조용히 어긋난다.

부수 발견: PRIVACY 목록에서 UI가 `?days=`를 보내는데 서버 파라미터는 `range`다. 기간이 서버에 전달되지 않고 UI가 전량을 받아 로컬에서 거른다(`findings/j` 11-3 A8). fable-api에 확인을 요청했다.

## 목표 구조

UI가 맡는 일을 원칙의 "UI 소유 목록"으로 줄인다. 영역별 목표와 짝이 되는 서버 태스크(api 지침서 10의 T번호):

### 1. 목록 (T3·T4)

- 목록은 전량형과 커서 페이지형 둘이다(02 지침서 5절, 06 지침서 `DataList`).
- 페이지형 10개(가계부 거래, 자산 기록, 전략 주문, 관리자 users·accounts·trades, audit·error 로그, PRIVACY 매매표, 일별 체결)는 필터·검색·기간을 쿼리 파라미터로 보내고, UI는 받은 페이지를 그대로 그린다. `filter`/`sort`/`slice` 코드와 `use-client-pagination`을 지운다.
- 가계부 거래의 "12개월 윈도우를 통째로 받는" 설계(`entities/finance/lib/period.ts`의 `windowRange`, `financeKeys.transactions(from, to)`)가 없어진다. 목록은 커서로 받고, 요약·추이는 집계 엔드포인트가 준다.
- 전량형(계좌, 전략, 가계부 계좌·카테고리·예산, 보유 종목, 전략 유형 비교) 안의 열 정렬·즉시 필터는 UI에 남는다.

### 2. 집계 (T8과 응답 필드 추가)

- 가계부: 자산 요약·월별 합·추이·구성비·점검, 거래 요약·추이·예산 진행, 일괄 등록 미리보기를 서버 집계 엔드포인트가 준다. 화면이 필요로 하는 결과 모양은 `findings/j` 2-1절에 함수 단위로 적혀 있고 서버 명세의 재료로 전달했다. `aggregate.ts`·`flowAggregate.ts`·`bulkRegisterPreview.ts`와 `period.ts`의 대부분을 지운다.
- 그 외: 일별 체결 캘린더의 날짜·통화별 합계, 통계 요약의 활성 사이클 합, 벤치마크 구간 CAGR, PRIVACY 누적 실현손익·현금 비율을 응답 필드로 받는다.
- UI에 남는 것: 이미 집계된 값을 차트 좌표·눈금·게이지 각도로 바꾸는 일(`niceTicks.ts`, `normalizeEquityCurve`의 100 기준 재계산은 표시용 재기준화라 남긴다).

### 3. 업무 규칙 검증 (T5·T7 + 검증 전용 엔드포인트)

- zod 스키마에는 형식 검증만 둔다(필수, 숫자, 범위). 범위·기본값·상한은 메타에서 받는다.
- 교차 필드 규칙, 한도, 종류별 필수 조합은 서버가 `fieldErrors[{field, detail}]`로 알려주고 04의 `useAppForm`이 필드에 붙인다.
- 전략 폼은 입력 중에도 제출 가능 여부와 서버가 채울 값을 보여준다(VR "자동" placeholder, 시드 한도 경고). 서버가 **검증 전용 엔드포인트**를 만든다(api 지침서 10의 T10, 2026-11-12 확정): `POST /api/accounts/{accountId}/trading-cycle-validations`(등록과 같은 body, 수정·VR 재설정도 같은 형태) → `{ fieldErrors[], warnings[], derived{…} }`. 등록 서비스와 같은 경로를 저장 없이 태우므로 등록이 거절하는 입력은 검증도 같은 `fieldErrors`를 낸다. 기존 `strategy-seed-preview`는 `derived`로 흡수된다.
- UI는 입력이 멈추면 디바운스로 이 엔드포인트를 부르고 결과를 필드와 placeholder에 표시한다. `strategyFormGuards.ts`, `vrDerived.ts`, `RAMP_DEFAULTS_BY_MODE`, `useTypeDefaults.ts`, `useStrategySeedPreviewQuery`를 지운다. 사본은 0이 목표다.

### 4. 상태 판정 (T6)

- 전략: `allowedActions`와 `blockedActions[{action, reasonCode}]`를 읽어 버튼을 노출·비활성화한다. `supportsCapitalAdjustment`·`canWithdrawCapital`·`isScheduledStart`와 여러 필드를 조합한 버튼 조건을 지운다.
- 주문 미리보기: `warnings[{code, detail}]`를 그대로 보여준다. `computeOrderReadiness`를 지운다.
- 계좌: `apiKeyExpiry{status, expiresOn, daysLeft}`를 읽는다. `apiKeyExpiryState`와 D-30 상수를 지운다.
- 가계부: 예산 `status`, 월 마감 여부를 응답에서 읽는다. `budgetStatus(b, today)`, `isMonthClosed`의 스코프 판정을 지운다.

### 5. 코드값 (T5)

- 라벨·설명·옵션 목록·기본값·허용 범위는 전부 `/api/meta`에서 온다. 메타에 추가되는 집합: 사용자 상태·역할, 통화, skip 사유, VR 정기입출금 모드, 요일, 가계부 그룹 역할, 예산 상태, 전략 종류 짧은 이름.
- `/api/runtime-config`의 전략 기본값·허용값이 메타로 합쳐진다. `entities/runtime-config`와 메타를 병합하던 코드(`deriveRuntimeFields`, `isRuntimeValueInvalid`)가 메타 읽기 하나가 된다.
- 타입은 생성 타입에서 파생한다(01). 수기 union·`z.enum` 값 목록·옵션 배열을 지우고, 폼의 선택지는 메타 배열을 그대로 쓴다.
- 증권사 → 시장·통화·자릿수는 메타 `brokers[]`에서 읽는다. `api-schema.ts:52-114`의 정적 맵을 지운다. 서버 컴포넌트에서도 메타를 읽을 수 있게 메타 프리페치를 `(main)/layout`에서 한다(지금 정적 맵을 둔 이유가 "서버 컴포넌트에서도 판정"이다).
- UI에 남는 것: 색·아이콘·톤 같은 표시 형식 맵(`USER_STATUS_TONE`, `ORDER_STATUS_BADGE_CLS`, `BROKER_UI`의 아이콘). 키 타입은 생성 타입 union이라 값이 추가되면 typecheck가 알려준다.
- 사용자 상태 라벨이 화면에 따라 다른 것(본인 화면 "반려", 관리자 화면 "거절" — `entities/user/model/status.ts`의 "의도적으로 다름")은 메타가 한 라벨만 주면 사라진다. 레이아웃 문구로 보고 UI에 남길지, 하나로 통일할지는 사용자 결정이다(결정 2).

### 6. 오류 문구 (T7)

- 실패 문구는 서버 `detail`을 그대로 보여준다(02의 전역 처리). UI에 폴백 문구를 mutation마다 두지 않는다. 서버에 닿지 못했을 때의 문구는 전역 한 곳에 하나만 둔다("요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.").
- `ErrorCode`는 동작 분기에만 쓴다(재로그인, 특정 필드 강조). 코드 → 문구 맵(`BROKER_ERROR_MESSAGE`)을 지운다.

### 7. 날짜·금액

- 다음 롤오버일, 다음·마지막 실행일, 예정 시작 여부는 응답 필드로 받는다. `vr-rollover.ts`, `dcaFormat.ts:73-93`, `scheduled-start.ts`를 지운다.
- UI의 날짜 코드는 표시 형식과 상대 표시, 그리고 화면 상태로서의 기간 선택(이번 달, 최근 30일 프리셋 → 쿼리 파라미터)만 남는다.
- 금액을 UI에서 다시 반올림하지 않는다. 입력 자릿수 제한은 입력 마스크라 UI에 남고(06의 `AmountInput`), 자릿수 값은 메타 `amountScale`에서 받는다.

### 8. 리소스 합치기

원칙 마지막 행: 한 화면이 항상 같이 쓰는 묶음은 API가 한 응답으로 준다. 서로 독립적으로 갱신되는 리소스는 UI가 각각 부른다. 9개 화면 중 갱신 주기가 같은 묶음(가계부 대시보드의 요약류)은 2번의 집계 엔드포인트가 흡수한다. 계좌 상세처럼 구성 리소스가 따로 갱신되는 화면(포트폴리오는 체결 시, 주문 미리보기는 폼 변경 시)은 지금처럼 각각 부른다. 새 "화면 전용 묶음 엔드포인트"는 만들지 않는다(api 지침서 10 6절).

### 9. 삭제되는 증권사

KIS·업비트는 삭제가 결정됐다(사용자 결정, fable-api 전달). UI의 KIS 전용 약 40줄, 업비트 전용 약 30줄과 테스트·픽스처 참조 38파일(`findings/j` 13절)을 서버 삭제와 같은 묶음에서 지운다. 증권사별 분기는 메타 `brokers[]`의 속성(`market`, 자격증명 필드 구성)으로 읽고, 코드에 증권사 이름 리터럴을 두지 않는다.

### 그렇게 정한 이유

- 사본은 틀려도 테스트가 통과한다. UI 테스트는 UI 사본이 UI의 기대대로 동작하는지만 본다. 서버 규칙과의 일치는 주석이 유일한 연결이다.
- 주문·금액·상태는 서버가 최종 판정자다. UI가 미리 판정해 버튼을 막거나 값을 바꾸면, 서버는 허용하는데 UI가 막는 경우와 그 반대가 생긴다.
- 클라이언트가 전량을 받아 자르는 목록은 데이터가 쌓일수록 느려진다. 가계부 거래와 자산 기록은 지금 상한이 없다.

### 기각한 대안

- **사본을 유지하고 계약 테스트로 묶는다**(서버와 UI가 같은 픽스처로 규칙을 검증): 사본 자체는 남고 두 레포에 테스트가 는다. 서버가 답을 줄 수 있는 것을 UI가 계산할 이유가 없다.
- **집계는 UI에 두고 목록만 페이지형으로 바꾼다**: 집계하려면 전량이 필요해 페이지형 전환과 모순된다. 둘은 같이 간다.
- **dry-run 대신 메타에 규칙을 선언형으로 실어 UI가 해석한다**: 규칙 해석기를 UI에 만들게 된다. 교차 필드 규칙은 선언형으로 담기 어렵다.

## 예외 대장 판정 결과 (2026-11-12, fable-api)

등록된 예외는 0건이다. 판정 기록의 원본은 원칙 문서의 "판정 기록" 표다.

| 항목 | 판정 | UI에서 할 일 |
|---|---|---|
| 입력 마스크·소수 자릿수 거부 | UI 소유 | 자릿수 값은 메타 `amountScale`에서 받는다 |
| 시드 비율 채우기 버튼 | UI 소유 | 유지 |
| 전량형 안의 즉시 정렬·필터 | 원칙이 허용 | 유지 |
| 차트 기간 토글(365일 한 번 받고 화면에서 자름) | UI 소유. "기간 상한이 있는 전량형 시계열"로 목록 규약에 명시됨 | 유지 |
| 차트 덧그림 이동평균·RSI | **API로 이전(T12).** 같은 지표를 서버가 DCA 조건 판정에 쓴다. 계산이 두 벌이면 화면 값과 판정 값이 어긋난다 | 시계열 응답에 실린 값을 그린다. `shared/lib/indicators.ts`(37줄)와 테스트 삭제 |
| 제출 가능 여부 계산, VR 파생값 placeholder | 예외 아님(T10) | 3절대로 삭제 |
| 재신청 쿨다운 | 서버에 이미 있다(REJECTED 24시간 / PENDING 1시간, 429 `COOLDOWN_ACTIVE` + `retryAfter`). 사용자 상태 응답에 `reapplyAvailableAt`이 추가된다(T12) | `localStorage` 판정 삭제(`ReapplyButton.tsx`, `RejectedReapplyButton.tsx`). `reapplyAvailableAt`만 본다 |
| 낙관적 갱신·캐시 동기화, 비회원 접근 게이팅 | UI 소유 | 유지 |

목록 규약 보충(같은 회신): 페이지형에서 사용자가 고르는 정렬·필터·검색은 전부 서버 파라미터다(`sort=<필드>,<asc|desc>`, 필터는 필드명 그대로). 커서는 정렬 키를 포함한 불투명 문자열이다. 가계부 거래 목록의 유형·메모 검색·카테고리·정렬·페이지 5가지가 전부 서버로 간다. 06의 `DataList` 페이지형 모드는 정렬 헤더를 클릭하면 `sort` 파라미터를 바꾸고 첫 페이지부터 다시 받는다.

PRIVACY `days` 파라미터(2026-11-12 정리): 코드를 다시 확인하니 `listAdminPrivacyBases(token, days?)`의 `days`를 넘기는 호출부가 없었다(`entities/privacy/model/queryOptions.ts:10`). 즉 틀린 이름의 파라미터는 보내진 적이 없고, 화면은 처음부터 전량을 받아 로컬에서 거른다. 죽은 인자를 지웠다. 전량 수신 자체는 T4 관리자 묶음의 페이지형 전환에서 해소한다.

## 예상 감량과 위험

| 영역 | 감량(추정) | 짝이 되는 서버 태스크 |
|---|---:|---|
| 가계부 집계 | 650~700 | T8 |
| 목록 클라이언트 처리 + `period.ts` 윈도우 | 약 300 | T3·T4 |
| 업무 규칙 사본(dry-run 전제) | 약 350 | T5·T7 + dry-run |
| 상태 판정 | 약 170 | T6 |
| 코드값 라벨·옵션·정적 맵, runtime-config 병합 | 약 300 | T5 |
| 날짜·거래일 | 약 150 | T6(응답 필드) |
| 오류 문구 | 약 60 | T7 |
| 그 외 집계 필드 | 약 250 | 응답 필드 추가 |
| KIS·업비트 전용 | 약 70 + 테스트 참조 | 브로커 삭제 |

합계 약 2,300줄(01·02·04와 겹치는 부분 제외 약 1,900줄). 대응 테스트는 07에서 계산했다(약 2,500줄 중 이 지침서 몫이 대부분).

위험:

- **배포 순서.** 서버가 필드를 추가하는 변경(상태 플래그, 집계 필드, 메타 키)은 서버 먼저 배포하고 UI가 뒤따르면 된다. 봉투·페이지 형식 변경과 `/api/runtime-config` 이관은 같은 날 배포해야 한다. 묶음별 순서는 `kista-api/docs/superpowers/fable-review/cross-repo.md`가 원본이다.
- **집계 결과 불일치.** 서버 집계가 지금 UI 계산과 다른 값을 내면 사용자가 보던 숫자가 바뀐다. 부채 판정(`isLiability`), 월 마감 스코프, 미분류 처리 같은 경계 규칙이 대상이다. 선행 테스트 1번으로 대조한다.
- **dry-run 왕복 지연.** 입력 중 피드백이 수백 ms 늦어진다. 형식 오류는 zod가 즉시 보여주고, 업무 규칙 오류만 디바운스 뒤에 나온다. 제출 시에는 서버가 다시 검증하므로 정합성 문제는 없다.
- **메타 의존이 커진다.** 메타를 못 받으면 폼을 그릴 수 없다. 메타는 `(main)/layout`에서 서버 프리페치하고 실패 시 화면 전체 오류로 처리한다(지금도 `MetaProvider`가 같은 위치에 있다).
- **주문 실행 가능 여부.** `computeOrderReadiness` 제거는 주문 버튼 노출에 직결된다. 서버 `warnings`와 지금 UI 판정이 같은 결과를 내는지 선행 테스트 2번으로 확인한다. Opus가 맡는다.

## 동작 보존용 선행 테스트

1. **집계 대조**: 서버 집계 엔드포인트가 나오면, 같은 원본 데이터(운영 DB 읽기 전용 덤프 또는 로컬 시드)로 현재 UI 함수(`calcMonthlySummary` 등)의 결과와 서버 응답을 비교하는 일회성 스크립트를 돌린다. 차이가 0이 된 뒤 UI 함수를 지운다. 현재 UI 집계 테스트(`aggregate.test.ts` 346줄 등)의 케이스는 서버 테스트로 옮겨졌는지 `cross-repo.md`에 짝으로 적는다.
2. **상태 플래그 대조**: `computeOrderReadiness`·`canWithdrawCapital`·`apiKeyExpiryState`의 현재 테스트 케이스를 입력으로 삼아, 서버가 같은 입력에서 같은 판정(플래그·사유)을 내는지 서버 도메인 테스트에 같은 표가 있는지 확인한다.
3. **검증 규칙 대조**: `strategyFormGuards.test.ts`·`vrDerived.test.ts`의 케이스 표를 서버 `validateVrCommand`·`validateBootstrapPosition` 테스트와 대조한다. UI에만 있는 규칙이 나오면 서버에 추가를 요청한다(UI에만 있던 규칙은 지금 우회 가능한 규칙이다).
4. **메타 가드**: 메타에 있어야 할 키 목록을 UI 타입으로 고정한다(`MetaBundle` 생성 타입). 키가 빠지면 typecheck가 실패한다.

## 태스크 분해

서버 태스크가 끝난 묶음부터 실행한다. 각 태스크의 완료 판정에는 공통으로 `npm run typecheck && npm run lint && npx vitest run <대상>`이 들어간다.

| # | 태스크 | 선행(서버) | 대상 | 모델 | 추가 완료 판정 |
|---|---|---|---|---|---|
| 1 | 메타 확장 소비: 라벨 맵·옵션 배열·수기 union 삭제, 증권사 정적 맵 삭제, 서버 컴포넌트 메타 프리페치 | T5 | `entities/user/model/{status,role}.ts`, `shared/lib/api-schema.ts`, `entities/strategy/model/{vrRamp,dcaFormat,badges}.ts`, `widgets/strategy-detail/orderBannerCopy.ts`, 옵션 배열 사용처 | Sonnet | `grep -rnE "_LABEL\b" --include='*.ts*' . \| grep -v test`가 표시 형식 맵만 남음 |
| 2 | runtime-config를 메타로 합침 | T5 | `entities/runtime-config/**`, `features/strategy/create-strategy/model/{useTypeDefaults,strategyFormHelpers}.ts`, `features/admin/settings/**` | Opus | `ls entities/runtime-config`가 없음 |
| 3 | 상태 플래그 소비 | T6 | `entities/order/model/order-readiness.ts`, `entities/strategy/model/{capitalAdjustment,scheduled-start,vr-rollover}.ts`, `entities/account/model/apiKeyExpiry.ts`, 소비 위젯 | Opus | 선행 테스트 2 통과, 위 파일 삭제 |
| 4 | 오류 문구 정리 | T7 | mutation 폴백 문구, `entities/account/model/brokerCredentials.ts` | Sonnet | `grep -rn "apiMsg(" --include='*.ts*' . \| grep -v test \| wc -l`이 전역 처리 1곳 |
| 5 | 목록 페이지형 전환(가계부 → 전략 주문·체결·이력 → 관리자), 서버와 같은 날 배포 | T3·T4 | 목록 10개 화면, `shared/lib/hooks/use-client-pagination.ts`, `entities/finance/lib/period.ts` | Sonnet(묶음별) | `grep -rn "useClientPagination" .` 0건 |
| 6 | 가계부 집계 이전 | T8 | `entities/finance/lib/{aggregate,flowAggregate,bulkRegisterPreview,period}.ts`, 소비 위젯 | Opus | 선행 테스트 1 차이 0, 파일 삭제 |
| 7 | 그 외 집계 필드 소비(일별 체결, 통계 합, CAGR, PRIVACY) | 응답 필드 추가 | `entities/trade/hooks/useDailyTradesRangeQuery.ts`, `widgets/stats-overview/**`, `widgets/benchmark-comparison/**`, `widgets/admin-privacy-trade-list/**` | Sonnet | 해당 `reduce(` 집계 코드 삭제 |
| 8 | 업무 규칙 사본 삭제, 검증 전용 엔드포인트 연결 | T10, T7 | `features/strategy/**/model/{strategyFormGuards,vrDerived}.ts`, `dcaFormSchema.ts`의 업무 규칙 | Opus | 선행 테스트 3 통과. 04 태스크 6과 한 묶음 |
| 9 | KIS·업비트 전용 코드 삭제(api 지침서 04 단계 A와 같은 배포 묶음) | 브로커 삭제 | `findings/j` 13절 목록 | Sonnet | `grep -rnE "'KIS'\|'UPBIT'" --include='*.ts*' . \| grep -v api-types` 0건 |
| 10 | 차트 지표·재신청 쿨다운을 서버 값으로 | T12 | `shared/lib/indicators.ts`, `widgets/dashboard/MarketChartCardInner.tsx`, `features/auth/reapply/**` | Sonnet | `grep -rn "localStorage" features/auth` 0건, `indicators.ts` 삭제 |
| 11 | 원칙 문서 연결 | T9 | 08 지침서에 합친다 | Haiku | 08의 판정 |

## 사용자 결정이 필요한 것

확정(2026-11-12):

- **결정 2**: REJECTED 라벨은 "반려"로 통일한다. 메타 라벨 하나를 두 화면이 쓴다. `USER_STATUS_LABEL`·`ADMIN_USER_STATUS_LABEL` 두 벌과 `copy.md`의 "의도적으로 분리된 용어" 예외를 지운다. 서버 메타의 `userStatuses` REJECTED 라벨이 "반려"여야 한다(fable-api에 전달).
- 관리자 목록과 전략 주문 내역의 번호 페이지네이션을 "더 보기"로 바꾼다.

## 하지 말아야 할 것

- 서버 변경이 배포되기 전에 UI 사본을 먼저 지우지 않는다.
- 서버가 플래그를 주는데 UI가 "혹시 몰라" 같은 조건을 한 번 더 검사하지 않는다. 그 검사가 사본이다.
- 메타에 없는 코드값을 만나면 UI에 라벨을 임시로 넣지 않는다. 서버 가드 테스트(응답에 쓰이는 enum ⊆ 메타)가 막아야 하는 상황이므로 서버에 알린다.
- 페이지형 목록을 "전부 불러오기" 루프로 전량화하지 않는다.
- 새 화면 전용 묶음 엔드포인트를 요청하지 않는다. 갱신 주기가 같은 묶음만 해당한다.
- 예외 대장에 없는 예외를 UI 코드에 남기지 않는다. 남기려면 먼저 대장에 올린다.

## 재심한 유지 확정 항목

| 기존 결정 | 출처 | 재심 결과 |
|---|---|---|
| 전략 type·status·ticker는 `string`, 메타가 SSOT(리터럴 금지) | `entities/strategy/model/types.ts:1` | 방향 유지, 강화. 타입은 생성 union, 라벨·옵션은 메타 |
| 증권사 → 시장 정적 맵을 서버 컴포넌트 판정용으로 둔다 | `shared/lib/api-schema.ts:57` | 폐지. 메타를 서버에서 프리페치 |
| `USER_STATUS_LABEL`과 `ADMIN_USER_STATUS_LABEL`은 의도적으로 다르다 | `docs/agents/copy.md`, `status.ts` | 폐지. "반려"로 통일(2026-11-12 사용자 결정) |
| 가계부 거래는 12개월 윈도우 키로 조회하고 클라이언트가 집계 | `entities/finance/model/queryKeys.ts` 주석, `docs/agents/finance.md` | 폐지. 커서 목록 + 서버 집계 |
| stats `cycles`는 서버가 필터 후 번호 페이지네이션 | `docs/agents/entities.md` "stats" | 변경. 커서 페이지형 |
| runtime-config는 `staleTime: 0` + focus refetch로 운영 설정을 즉시 반영 | `docs/agents/entities.md` "runtime-config" | 메타로 합쳐진 뒤의 캐시 정책은 서버 T5가 정한다. UI는 그 정책을 `setQueryDefaults` 한 줄로 따른다 |
| mutation hook `onError`의 폴백 문구 컨벤션 | `docs/agents/copy.md` | 폐지. 서버 `detail` |

## 다른 지침서와의 의존·순서

- 선행: 01(생성 타입), 02(`$api`, 목록 두 종류, 전역 실패 처리). 서버 태스크 T3~T8, T10(검증 전용), T11(단건 조회), T12.
- 04 태스크 6(전략 폼 통합)은 이 지침서 태스크 2·8과 한 묶음으로 실행한다.
- 06의 `DataList` 페이지형 모드가 태스크 5의 화면 쪽 수단이다.
- 08: 원칙 문서가 `kista-api/docs/agents/ui-api-contract.md`로 옮겨지면 kista-ui 루트 `CLAUDE.md`가 그 경로를 가리킨다.
