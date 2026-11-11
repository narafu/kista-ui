# 07. 테스트 — 경계에서 한 번 흉내 내고, 계층마다 한 번만 검증한다

근거 측정: `findings/e-test-bloat.md` (전 절), `findings/a-vertical-trace.md` 종합 1번.

## 현재 구조와 문제

테스트는 260파일 30,240줄, 케이스 1,816개다. 제품 코드 41,934줄의 0.72배이고, 최근 200커밋에서 변경 줄의 35.7%가 테스트다.

줄 수의 원인은 케이스 수가 아니라 케이스를 세우는 비용이다.

- **모듈을 흉내 낸다.** `vi.mock` 395개(155파일, 2,384줄). 같은 블록이 복붙돼 있다: `next/navigation` 49파일, `@entities/meta` 44파일 334줄(공용 `MetaProvider` + `testMeta`가 있는데 쓰는 파일은 10개), `sonner` 39파일, `../api` 26파일, `@tanstack/react-query` 17파일. 모듈 경로에 묶여 있어 파일을 옮기면(03 지침서) 전부 깨진다.
- **감싸개를 파일마다 만든다.** `QueryClientProvider` wrapper가 21개 정의돼 있다(이름만 다른 동형, 약 324줄).
- **픽스처를 그 자리에서 손으로 쓴다.** 6줄 이상 리터럴 124개 1,386줄. 도메인 객체 공용 빌더는 0개이고, 타입이 안 맞아 `as unknown as`·`as never`·`as any`가 53건이다.
- **같은 규칙을 여러 층에서 다시 검증한다.** 전략 폼의 `initialDeposit`이 17개 테스트 파일에 나온다. `useStrategyForm.test.ts`(1,169줄, 43케이스)가 `buildStrategyPayload`·`strategyFormGuards`·`strategyFormSchema` 테스트와 같은 규칙을 hook 수준에서 한 번 더 본다.
- **검증할 것이 없는 것을 검증한다.** 상수 표를 같은 값으로 다시 대조(`entities/user/model/status.test.ts`), 키 튜플 재진술(`queryKeys.test.ts`), mock한 fetch가 그 URL로 불렸는지(`entities/*/api/index.test.ts` 14파일 1,576줄 중 URL·메서드 조립 63케이스). 추정 80~120케이스.
- **lint가 할 일을 테스트가 한다.** `shared/lib/query/cacheArchitecture.test.ts` 282줄이 AST로 import 금지 규칙을 구현한다. `eslint.config.mjs`에 `no-restricted-*` 규칙은 0건이다.
- **문구에 묶여 있다.** 한글 리터럴이 들어간 단언·질의가 1,219건(126파일)이다. 문구 변경 커밋 28건에 테스트 수정이 딸려 갔다.

쏠림도 있다. 상위 5개 파일이 3,786줄(12.5%)이다: `useStrategyForm.test.ts` 1,169, `StrategyDetail.test.tsx` 888(대상 125줄의 7.1배), `HousingBenchmarkComparison.test.tsx` 785, `StrategyCard.test.tsx` 505, `CryptoMarketSection.test.tsx` 439.

## 목표 구조

### 1. 흉내는 네트워크 경계 한 곳에서

02 지침서 이후 모든 요청은 `kistaFetch` 하나를 지난다. 테스트는 모듈이 아니라 그 아래 `fetch`를 대체한다.

```tsx
// 테스트
mockApi({
  'GET /api/accounts': { items: [account()] },
  'GET /api/accounts/{id}/trading-cycles': { items: [strategy({ type: 'VR' })] },
  'POST /api/finance/transactions': (body) => transaction(body),
})
renderApp(<AccountDetailScreen accountId="a1" />)
```

- `mockApi`는 `paths` 타입으로 키와 응답 모양을 검사하는 `fetch` 대체다(`vi.stubGlobal('fetch', …)`, 약 50줄, 의존성 추가 없음). 응답 모양이 스펙과 어긋나면 typecheck가 잡는다.
- `renderApp`은 `QueryClientProvider`·`MetaProvider(testMeta)`·라우터 대역·`Toaster`를 한 번에 감싼다. 파일별 wrapper 21개를 대체한다.
- `next/navigation`·`next/link`·`sonner`의 대역은 `vitest.setup.ts`에 한 번만 둔다.
- 결과: `vi.mock('@entities/…')`, `vi.mock('../api')`, `vi.mock('@tanstack/react-query')`가 없어진다. 테스트가 파일 경로를 모르므로 구조를 바꿔도 깨지지 않는다.

### 2. 픽스처는 생성 타입의 빌더

```ts
// domains/strategy/testing.ts
export const strategy = (over: Partial<Strategy> = {}): Strategy => ({ id: 's1', accountId: 'a1', type: 'INFINITE', status: 'ACTIVE', …, ...over })
```

도메인마다 `testing.ts` 하나에 그 도메인 응답 타입의 빌더를 둔다. 타입은 01의 별칭이라 서버 필드가 바뀌면 빌더에서 typecheck가 깨진다. 인라인 리터럴과 캐스트를 빌더 호출로 바꾼다.

### 3. 무엇을 어디서 검증하는가

| 대상 | 검증 위치 | 하지 않는 것 |
|---|---|---|
| 순수 로직(도메인 계산, 포매터, payload 빌더) | 그 함수의 단위 테스트. 표 주도(`it.each`) | 같은 규칙을 hook·컴포넌트에서 다시 검증 |
| 프리미티브(`DataList`, `AsyncSection`, `ConfirmDialog`, `FormField`, `useAppForm`, `AmountInput`) | 프리미티브의 컴포넌트 테스트 한 벌 | 화면 테스트에서 로딩·실패·빈 상태·정렬·필드 오류 표시를 다시 검증 |
| 전송·캐시 규칙(`kistaFetch`, 자동 무효화, 401 처리) | `shared/api`의 단위 테스트 | 도메인마다 "이 URL로 불렸는가" 검증 |
| 화면 | 화면당 통합 테스트 1파일: `mockApi` + `renderApp`으로 "이 데이터가 오면 이 화면이 보이고, 이 동작을 하면 이 요청이 나간다" 핵심 흐름 3~6케이스 | 하위 컴포넌트를 각각 따로 통합 렌더 |
| 사용자 흐름(로그인 가드, 계좌 캐시, 주문 금액) | e2e 스모크(현재 17케이스 유지) | — |
| 구조 규칙(금지 import, 계층 방향, 금지 문법) | ESLint | vitest로 소스 패턴 검사 |
| 서버 업무 규칙 | 서버 테스트 | UI에서 사본을 테스트(05에서 사본과 함께 삭제) |

쓰지 않는 테스트: 상수 표 재진술, 타입이 이미 막는 것(`Record<UserStatus, …>`의 키 누락), 전달만 하는 코드, 기본 prop 렌더.

### 4. 문구 단언

- 문구를 값으로 단언하는 곳은 그 문구를 소유한 컴포넌트의 테스트 한 곳이다. 다른 테스트는 요소를 찾는 데만 쓴다(`getByRole('button', { name: '삭제' })`).
- 코드값 라벨은 `testMeta`에서 온 값을 그대로 쓴다(`labelOf` 결과를 리터럴로 다시 적지 않는다).
- 서버 `detail`을 보여주는 실패 문구는 `mockApi`가 준 문자열을 단언한다(UI에 문구가 없다).

### 5. 고친 테스트가 회귀를 잡는지 확인한다

프로젝트 규칙(루트 `CLAUDE.md` "직접 확인 우선")대로, 테스트를 합치거나 옮긴 뒤에는 대상 로직을 잠깐 깨뜨려 실패하는지 본다. 이 지침서의 병합 태스크는 전부 이 확인을 완료 판정에 넣는다.

### 그렇게 정한 이유

- 테스트 줄의 큰 덩어리는 "무엇을 검증하는가"가 아니라 "검증하려고 세우는 무대"다(mock 2,384 + wrapper 324 + 픽스처 1,386 = 약 4,100줄, 13.5%). 무대를 한 번 만들면 케이스는 짧아진다.
- 모듈 mock은 구현 구조를 테스트에 새긴다. 01~06처럼 구조를 바꾸는 작업마다 테스트가 이유 없이 깨진다. 네트워크 경계는 서버 계약이라 구조 변경과 무관하게 안정적이다.
- 같은 규칙을 한 층에서만 검증하면 규칙이 바뀔 때 테스트 하나를 고친다. 지금은 17개 파일을 본다.

### 기각한 대안

- **MSW 도입**: 같은 일을 하지만 요청이 전부 한 `fetch`를 지나는 구조에서는 50줄짜리 대체 함수로 충분하다. 스펙 타입 검사도 직접 붙일 수 있다.
- **모듈 mock을 `__mocks__` 공용 파일로 모은다**: 복붙은 줄지만 경로 결합이 남고, 03의 이동에서 다시 고쳐야 한다.
- **스냅샷 테스트로 화면 검증을 대체한다**: 줄 수는 줄지만 문구·구조 변경마다 통째로 갱신하게 돼 검증력이 없다.
- **커버리지 기준으로 삭제 대상을 고른다**: 중복 검증은 커버리지에 드러나지 않는다. 계층 표(위 3)가 기준이다.

## 예상 감량과 위험

이 지침서 단독 감량은 작고, 01~06이 지우는 코드에 딸린 테스트가 크다. 둘을 나눠 적는다.

| 출처 | 내용 | 감량(추정) |
|---|---|---:|
| 01 | 정규화 테스트 | 약 650 |
| 02 | `entities/*/api/index.test.ts`의 URL 조립, `queryKeys`·`queryOptions` 테스트, 얇은 hook 테스트 | 약 1,900 |
| 04·05 | 전략 폼의 서버 규칙 사본 테스트(`strategyFormGuards`, `vrDerived`, 런타임 기본값), `useStrategyForm.test.ts`의 다층 중복, 생성·수정 쌍 병합 | 약 2,500 |
| 06 | 화면별 로딩·실패·빈 상태·정렬·페이지네이션·이중 마크업 검증 → 프리미티브 테스트 한 벌 | 약 2,000 |
| 07-인프라 | 모듈 mock·wrapper·인라인 픽스처 → `mockApi`·`renderApp`·빌더 | 약 1,200 |
| 07-정리 | 재진술·전달 테스트 삭제, 소스 패턴 테스트 → ESLint, `it.each` 묶음 | 약 1,100 |

합계 약 9,300줄(30,240 → 약 21,000). 케이스 수는 약 1,816 → 약 1,350.

지키는 것:

- **인증·토큰·프록시**(19파일 1,567줄 103케이스): 케이스를 지우지 않는다. 무대만 바꾼다.
- **주문 금액·payload**: 04의 payload 고정 픽스처를 이 지침서에서도 그대로 유지한다.
- **서버로 옮겨가는 규칙의 테스트**: UI에서 지우기 전에 같은 규칙의 서버 테스트가 있는지 확인한다(`cross-repo.md`에 "UI 테스트 X 삭제 ↔ 서버 테스트 Y 존재"를 짝으로 적는다). 없으면 서버에 먼저 만든다.

위험:

- 화면 통합 테스트로 합치면서 드물게 쓰이는 분기의 케이스가 빠질 수 있다. 합치기 전에 기존 케이스 제목 목록을 뽑아 새 테스트의 어느 케이스(또는 어느 프리미티브·단위 테스트)가 그것을 맡는지 표로 대응시킨다. 대응이 없는 케이스는 지우는 이유를 적는다.
- `mockApi`의 경로 매칭이 느슨하면 틀린 요청도 통과한다. 등록하지 않은 요청은 테스트를 실패시킨다.

## 동작 보존용 선행 테스트

1. 기준선: `npm run test:run`의 파일 수·케이스 수·소요 시간을 기록한다. `npm run test:coverage`의 줄·분기 커버리지를 도메인별로 기록한다. 감량 뒤 분기 커버리지가 도메인별로 2%p 넘게 떨어지면 빠진 케이스를 찾는다.
2. 병합·이전한 테스트마다 변이 확인 1회(대상 로직의 조건 하나를 뒤집어 실패하는지).
3. e2e 17케이스는 손대지 않고 전후 통과를 확인한다(로컬 api 필요, 사용자가 기동).

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 1 | 기준선 기록 | PROGRESS | Haiku | 수치 기록 |
| 2 | `mockApi`·`renderApp`·전역 대역(`next/navigation`, `next/link`, `sonner`) | `shared/testing/**`, `vitest.setup.ts` | Opus | 자체 테스트(미등록 요청 실패, 타입 검사) |
| 3 | 도메인별 빌더 | `domains/*/testing.ts`(03 전이면 `entities/*/model/fixtures.ts`) | Sonnet | `grep -rn "as unknown as" --include='*.test.*' . \| wc -l`이 5 이하 |
| 4 | 재진술·전달 테스트 삭제(후보 목록을 먼저 만들고 사람이 읽을 수 있는 표로 보고) | 후보 80~120케이스 | Sonnet(목록), Opus(판정) | 표의 각 행에 삭제 이유. 커버리지 분기 기준 통과 |
| 5 | 소스 패턴 테스트를 ESLint 규칙으로 | `shared/lib/query/cacheArchitecture.test.ts`, `shared/lib/metadata.test.ts`, `eslint.config.mjs` | Sonnet | 금지 import를 고의로 넣었을 때 `npm run lint` 실패 확인 후 테스트 파일 삭제 |
| 6 | 화면 통합 테스트 전환(상위 5개 파일부터). 케이스 대응표 작성 → 전환 → 변이 확인 | `StrategyDetail`, `HousingBenchmarkComparison`, `StrategyCard`, `CryptoMarketSection`, 이후 나머지 | Opus(상위 5개), Sonnet(나머지, 도메인별 병렬) | `grep -rn "vi.mock('@\(entities\|domains\)" . \| wc -l` 0, 대응표에 빈 행 없음 |
| 7 | `useStrategyForm.test.ts`와 하위 단위 테스트의 중복 정리(04 태스크 6과 같은 묶음) | `features/strategy/create-strategy/**` 테스트 | Opus | payload 고정 테스트 통과, 변이 확인 3건 |
| 8 | `it.each` 묶음, 문구 단언 정리 | `shared/lib/format/index.test.ts` 등 18묶음 | Sonnet | `npm run test:run` |
| 9 | 문서: 테스트 규칙(계층 표)을 한 문서로 | 08 지침서에 합친다 | Haiku | 08의 판정 |

## 하지 말아야 할 것

- 줄 수를 맞추려고 케이스를 지우지 않는다. 지우는 케이스는 "어디서 이미 검증되는가" 또는 "검증할 것이 없다"를 적을 수 있어야 한다.
- 인증·주문 금액 테스트의 단언을 느슨하게 바꾸지 않는다.
- `mockApi`에 미등록 요청 허용 옵션을 만들지 않는다.
- 빌더에 테스트별 변형을 계속 추가하지 않는다. 변형은 호출부의 `over` 인자로 준다.
- 01~06을 실행하기 전에 이 지침서의 6·7을 먼저 하지 않는다(곧 지워질 코드의 테스트를 다시 쓰게 된다). 2·3·5는 먼저 해도 된다.

## 재심한 유지 확정 항목

| 기존 결정 | 출처 | 재심 결과 |
|---|---|---|
| `cacheArchitecture.test.ts`가 캐시 금지 규칙을 기계적으로 강제 | `docs/agents/shared.md` "cache" | 규칙은 유지, 수단을 ESLint로 변경 |
| `metadata.test.ts`가 탭 제목 규칙을 강제 | `docs/agents/shared.md` "metadata" | 위와 같음 |
| `TradeNotificationBridge.test.tsx`가 무효화 대상·제외 키와 순서를 고정 | `docs/agents/shared.md` "체결 SSE" | 유지(02에서 경로 기준으로 다시 쓴다) |
| e2e는 CI에서 돌지 않고 로컬에서 커밋 전 1회 | `docs/agents/commands.md` | 유지. CI 편입은 kista-infra 검토 범위 |
| 훅 mock이 `{ data, isError }`만 반환하므로 오류 판정은 `isError && !data` | `docs/agents/react-query.md` | 판정식은 유지. 이유 중 "훅 mock" 부분은 모듈 mock이 없어지면 사라진다 |

## 다른 지침서와의 의존·순서

- 태스크 2·3·5는 독립이라 가장 먼저 해도 된다. 특히 2는 01~06의 리팩토링이 테스트를 덜 깨뜨리게 하므로 02 직후에 넣는다.
- 태스크 6은 06(프리미티브) 뒤, 03(이동) 직후. 03의 이동 스크립트가 남은 `vi.mock` 경로를 한 번 치환하고, 그 뒤 6에서 없앤다.
- 태스크 7은 04 태스크 6과 한 묶음.
