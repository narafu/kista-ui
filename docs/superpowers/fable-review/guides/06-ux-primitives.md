# 06. UX 프리미티브 — 같은 상황은 같은 컴포넌트가 그린다

근거 측정: `findings/g-ux-pattern-variance.md` (전 절), `findings/c-parallel-structures.md` 5~6절.

## 현재 구조와 문제

같은 종류의 상황을 화면마다 다르게 그린다. 방식이 셋 이상으로 갈린 항목이 13개다(`findings/g` 11(a)). 규칙 문서와 충돌하는 곳은 거의 없고, 대부분 규칙도 공용 컴포넌트도 없는 영역이다(11(d) 12개).

| 상황 | 방식 수 | 현황 |
|---|---:|---|
| 목록(같은 데이터를 표와 모바일 카드로) | 3 | 표 + `lg:hidden` 카드 이중 마크업 10파일 2,222줄, 카드 내부 이중 레이아웃 3파일 481줄, 표 단독 5파일. 컬럼을 선언형으로 정의한 파일은 1개 |
| 로딩 | 5 | 라우트 `loading.tsx` 39개(그중 17개 257줄은 `animate-pulse` 손수 작성), 위젯 스켈레톤, `LoadingRow` 25곳, 직접 쓴 "불러오는 중…" 약 14곳, 버튼 `Spinner`. 같은 "목록 위젯 로딩"이 `LoadingRow`·스켈레톤·텍스트로 갈린다 |
| 조회 실패 | 5, 색 4 | `error.tsx`, `SectionError` 38곳, `role="alert"` 블록 16파일, 인라인 한 줄 약 22곳, 토스트. 같은 "조회 실패"가 `text-destructive`·`text-[var(--status-error)]`·`text-warn`·muted로 표시된다 |
| 빈 상태 | 3 | `EmptyState` 박스형 21·text형 21, 직접 `<p>` 11곳(가계부 위젯에 집중). rich 분기(icon/title/action)는 사용처 0 |
| 위험 동작 확인 | 3 | `ConfirmDeleteDialog` 7곳, `AlertDialog` 자체 구성 14파일(그중 9파일 619줄이 삭제·종료·탈퇴 확인), 타이핑 확인 Dialog 1곳 |
| 금액·수량 입력 | 5 | `UnitInput`, `InputWithUnit`, 콤마 금액, `type="number"`, `inputMode` Input |
| 섹션 컨테이너 | 4 | `Card`(ring + rounded-xl) 28파일, `Surface`(border + r-lg + shadow) 13파일, 같은 클래스를 직접 쓴 곳 33파일, `GlassCard` 3파일. 시각 언어가 둘이다 |
| 섹션 제목 | 3 | `CardTitle role="heading" aria-level={2} className="text-base lg:text-lg"` 26곳 복붙, 손수 `<h2>` 클래스 조합 12종 |
| 목록 상태(필터·페이지) 위치 | 3 | URL, 로컬 `useState`, 컨텍스트. `StrategyOrderHistory`는 기간은 URL, 방향·유형·상태·페이지는 `useState`(`:40-43`) |
| 페이지네이션 | 3 | URL `?page=`, 클라이언트 `useState(1)`, "더 보기" |
| 숫자·날짜 표기 | 3 | 공용 `fmt*` 약 25종, 위젯 로컬 `fmt*` 약 20개(`CryptoIndicatorCards.tsx`에 9개), 포매터 밖 `toFixed` 23줄·`${n}%` 24줄. 부호 없는 퍼센트 포매터가 없다 |
| 토스트 어미 | 3 | "했습니다" 21, "되었습니다" 19, "됐습니다" 5. 실패는 "실패했습니다" 24, "하지 못했습니다" 6 |
| 반응형 분기 | 3 | Tailwind `sm`/`lg`, JS 미디어쿼리(1280px, 1023px), 별도 컴포넌트 |

일관성 문제이면서 코드량 문제다. 화면마다 다시 그리는 만큼 줄이 늘고, 다시 그릴 때마다 조금씩 달라진다.

## 목표 구조

**"상황 → 컴포넌트"를 일대일로 만든다. 화면은 무엇을 보여줄지만 적고, 어떻게 보일지는 프리미티브가 정한다.**

### 1. 목록: `DataList`

컬럼 정의 하나로 PC 표와 모바일 카드를 그린다.

```tsx
<DataList
  query={ordersQuery}                       // 전량형 useQuery 또는 페이지형 useInfiniteQuery 결과
  columns={[
    { key: 'date',  header: '일자', cell: (o) => fmtDate(o.tradeDate), mobile: 'title' },
    { key: 'side',  header: '구분', cell: (o) => <DirectionBadge value={o.direction} />, mobile: 'badge' },
    { key: 'price', header: '가격', cell: (o) => fmtMoney(o.price, currency), numeric: true, sortBy: (o) => o.price },
    { key: 'qty',   header: '수량', cell: (o) => fmtQuantity(o.quantity), numeric: true },
  ]}
  empty="주문 내역이 없습니다."
/>
```

- 컬럼의 `mobile` 역할(`title` / `badge` / 기본은 라벨-값 행 / `hidden`)로 카드 배치가 정해진다. 카드 마크업을 따로 쓰지 않는다.
- 목록의 종류는 서버 규약대로 둘이다(02 지침서 5절).
  - 전량형: `sortBy`가 있는 컬럼은 헤더 클릭 정렬, 모바일은 `MobileSortControl`. 지금의 `useTableSort` + `SortableHeadCell` 조합이 안으로 들어간다.
  - 페이지형: 정렬 없음, 목록 아래 "더 보기". `hasMore`·다음 페이지 실패 안내를 `DataList`가 그린다.
- 로딩·실패·빈 상태는 `query`에서 판정해 아래 2번과 같은 표현으로 그린다. 오류는 `isError && !data`일 때만(`docs/agents/react-query.md`의 기존 규칙).
- 가로 스크롤 컨테이너의 `role="region"`·`aria-label`·`tabIndex`, 헤더·숫자 셀 정렬 규칙(`docs/agents/widgets.md` "테이블 정렬")을 안에 넣는다. 그 규칙 문단은 문서에서 지운다.
- 번호 페이지네이션(`PaginationBar`, `PageSizeSelector`, `use-client-pagination`)은 없앤다. 서버가 총 건수를 주지 않는다(api 지침서 10의 2-2절).

### 2. 구역의 세 상태: `AsyncSection`

```tsx
<AsyncSection query={q} title="자산 추이" empty="표시할 기록이 없습니다." skeleton="chart">
  {(data) => <AssetTrendChart data={data} />}
</AsyncSection>
```

- 한 구역(카드)의 제목, 로딩, 조회 실패(다시 시도 포함), 빈 상태, 본문을 한 컴포넌트가 그린다. `SectionError`·`EmptyState`·`LoadingRow`·`CardSkeleton`의 조합과 직접 쓴 텍스트를 대체한다.
- 로딩 표현은 `skeleton` 프리셋(`rows` / `chart` / `cards` / `text`) 중 하나다. "불러오는 중…" 직접 텍스트를 쓰지 않는다.
- 서버 재시작 안내: 응답이 503이고 `code`가 `ENGINE_RESTARTING` 또는 `WRONG_ROLE`이면(둘 다 `ErrorCode`에 추가된다 — api 지침서 05의 7절, 이름 확정) 실패 대신 서버 `detail`("매매 서버를 재시작하는 중입니다. …")을 보여주고 일정 간격으로 다시 조회한다(React Query `retry`를 이 오류에만 켠다 — `createQueryClient` 한 곳). 어느 경로가 엔진 경로인지 UI는 알지 않는다. 판정은 응답의 `code`만 본다. worker가 내려가 있을 때는 Caddy `handle_errors`가 같은 형식의 503 ProblemDetail을 싣는다(확정, Caddy 문법·재시도 대기 시간은 fable-infra 확인 중). mutation이 같은 오류를 받으면 전역 토스트가 같은 문구를 띄운다.
- 조회 실패 색은 `--status-error` 하나다. `text-warn`은 경고(사용자가 조치할 수 있는 상태)에만 쓴다.
- 차트 지연 로딩 래퍼 5개(`AssetTrend`, `AssetComposition`, `FinanceTrend`, `FearGreedCard`, `MarketChartCard`, 합 202줄)는 `AsyncSection` + `dynamic()` 한 줄이 된다.

### 3. 라우트 로딩: 프리셋 재수출

`shared/ui/skeletons`에 화면 골격 프리셋 넷(`FormPageSkeleton`, `DetailPageSkeleton`, `ListPageSkeleton`, `AdminTableSkeleton`)을 두고 `loading.tsx`는 한 줄 재수출이다. 손수 쓴 `animate-pulse` 17파일을 없앤다.

### 4. 확인: `ConfirmDialog`

```tsx
<ConfirmDialog
  open={open} onOpenChange={setOpen}
  title="전략을 삭제합니다" description="주문 이력은 남고 전략 설정이 삭제됩니다."
  confirmLabel="삭제" destructive
  typeToConfirm={account.nickname}          // 선택: 타이핑 확인
  mutation={deleteMutation} variables={strategy}
/>
```

- 삭제·종료·탈퇴·역할 변경·연결 해제·금액 이동 확인이 전부 이 하나다. `ConfirmDeleteDialog`를 이것으로 넓히고 자체 구성 14파일을 호출로 바꾼다.
- 진행 중 표시와 실패 처리(02의 전역 토스트), 성공 후 닫기가 안에 있다. 진행 문구는 `confirmLabel` + " 중…"으로 만든다.
- 확인을 두는 기준: 되돌릴 수 없는 동작과 돈이 움직이는 동작(투자금 추가·인출, VR 재설정, 주문 실행). 그 밖의 저장에는 두지 않는다.

### 5. 금액·수량 입력: `AmountInput`

통화(또는 단위)를 받아 자릿수·천 단위 구분·단위 표시를 정한다. 자릿수는 메타의 `amountScale`을 쓴다. 값은 `number | null`이다. `UnitInput`·`InputWithUnit`·콤마 금액·`type="number"` 직접 사용을 대체한다. 04의 `FormField` 안에서 쓴다.

### 6. 컨테이너와 제목: `Surface`, `SectionTitle`

- 섹션 카드는 `Surface` 하나다. shadcn `Card` 사용처 28파일과 같은 클래스를 직접 쓴 33파일을 `Surface`로 옮기고 `components/ui/card.tsx`를 지운다. 패딩은 `Surface`의 `size`(기본 / compact) 둘로 줄인다.
- 구역 제목은 `SectionTitle`(h2) 하나다. `CardTitle` 복붙 26곳과 `<h2>` 클래스 12종을 대체한다. `AsyncSection`의 `title`이 이것을 쓴다.

### 7. 표기 규칙을 코드로

- 숫자·날짜는 `shared/lib/format`의 포매터만 쓴다. 부호 없는 퍼센트 `fmtPercent`를 추가하고, 위젯 로컬 `fmt*`는 공용에 있는 것이면 지우고 도메인 고유한 것(해시레이트, 펀딩비 등)은 그 도메인의 `format.ts` 한 파일로 모은다. 컴포넌트 안에서 `toFixed`·`toLocaleString`·`${n}%`를 쓰지 않는다(lint `no-restricted-syntax`로 건다).
- 성공 토스트 어미는 "~했습니다" 하나다(능동, 가장 많은 쪽). 실패 문구는 서버 `detail`이 맡는다(02). `docs/agents/copy.md`의 "토스트 마침표는 레이어별" 규칙은 레이어가 없어지므로 "토스트는 한 문장이면 마침표 없음" 하나로 줄인다.
- 값 없음은 `-`(기존 규칙 유지).

### 8. 상태를 두는 곳

- 목록의 필터·기간·탭처럼 새로고침·뒤로 가기·링크 공유에서 유지돼야 하는 것은 URL에 둔다. `useUrlState(key, parser)` 하나로 읽고 쓴다(지금의 `UrlRangeFilterBar`·`use-search-param`·`useRangeFilterState`를 하나로).
- 펼침·선택·다이얼로그 열림처럼 그 순간만 의미 있는 것은 `useState`다.
- 한 화면에서 같은 목록의 필터를 URL과 로컬에 나눠 두지 않는다.

### 9. 반응형과 내비게이션

- 분기는 Tailwind `sm`·`lg` 둘이다. JS 미디어쿼리는 CSS로 못 하는 경우(차트 props)에만 쓰고 분기점은 `shared/lib/breakpoints.ts`의 상수를 쓴다(1023·1280 리터럴 제거).
- 내비게이션 항목은 배열 하나에서 PC 사이드바·모바일 하단바·모바일 헤더가 읽는다.

### 그렇게 정한 이유

- 일관성을 문서로 지키려면 사람이 화면마다 규칙을 기억해야 한다. 규칙이 없는 12개 영역에 문서를 12개 더 쓰는 대신, 상황마다 컴포넌트를 하나로 만들면 다르게 그릴 방법이 없어진다.
- 목록·구역 상태·확인·금액 입력은 이 앱 화면의 대부분을 이룬다. 이 넷이 정해지면 새 화면은 데이터와 컬럼만 적으면 된다.
- 서버 목록 규약이 둘로 줄었으므로(전량형·커서형) UI 목록도 한 컴포넌트의 두 모드로 맞출 수 있다. 지금은 페이지 형식 3갈래가 페이지네이션 UI 3갈래를 만들었다.

### 기각한 대안

- **TanStack Table 도입**: 헤드리스 정렬·페이지·컬럼 모델을 주지만 이 앱의 표는 정렬 하나(전량형)와 "더 보기"(커서형)뿐이다. 필요한 것은 "컬럼 → 표 + 카드" 렌더이고 이것은 150줄 안쪽의 컴포넌트다.
- **모바일도 표로 보여주고 가로 스크롤한다**: 이중 마크업이 사라지지만 금액·날짜가 많은 표는 모바일에서 읽기 어렵다. 카드 표현은 유지하되 마크업을 한 번만 쓴다.
- **상태별 컴포넌트를 그대로 두고 사용 규칙만 문서화한다**: 지금 구조다. `SectionError`가 있는데도 인라인 실패 텍스트가 22곳 생겼다.
- **`Card`로 통일한다**: `Surface`의 토큰(`--r-lg`, `--sh-card`)이 디자인 토큰 체계와 맞고, `Card`는 shadcn 기본 시각(ring)이라 토큰 밖이다.

## 예상 감량과 위험

| 프리미티브 | 대체 대상 | 감량(추정) |
|---|---|---:|
| `DataList` | 이중 마크업 10파일 2,222줄 + 표 5파일 + 정렬·페이지네이션 조립 | 700~900 |
| `AsyncSection` + 스켈레톤 프리셋 | 인라인 로딩 14·실패 22·빈 상태 11곳, 차트 래퍼 5파일 202줄, `loading.tsx` 손수 작성 17파일 257줄 | 450~550 |
| `ConfirmDialog` | 자체 `AlertDialog` 9파일 619줄 + 인라인 5곳 | 250~300 |
| `AmountInput` | 입력 5종의 조립 | 80~120 |
| `Surface`·`SectionTitle` | 클래스 직접 사용 33파일, `CardTitle` 26곳, `card.tsx` | 100~150 |
| 포매터 정리 | 위젯 로컬 `fmt*` 약 20개, `toFixed` 23줄 | 60~100 |
| 페이지네이션 제거 | `PaginationBar`·`PageSizeSelector`·`pagination.tsx`·`use-client-pagination` | 약 350 |
| URL 상태 hook 통합, 내비 항목 단일화 | — | 약 100 |

합계 약 2,100~2,600줄. `findings/g`의 추정은 파일별 모바일 블록 줄 수를 재지 않은 비율 가정이라, `DataList` 수치는 태스크 1의 시범 전환 2개로 다시 잰다.

위험:

- **`DataList`가 모든 표를 담지 못한다.** `AdminPrivacyBaseTable`(489줄, 행 안 편집·중첩 행)과 `AssetRecordRows`(그룹 행)는 일반 표가 아니다. 담기지 않는 표는 억지로 옵션을 늘리지 않고 그대로 둔다. 목표는 15개 중 11개 이상이다.
- **모바일 카드 모양이 달라진다.** 지금 카드는 파일마다 손으로 배치했다. 컬럼 역할 기반 배치로 바꾸면 화면마다 조금씩 달라진다. 화면별로 전후 스크린샷을 사용자에게 보여 확인받는다(선행 테스트 2).
- **번호 페이지네이션이 "더 보기"로 바뀐다.** 관리자 목록 포함 전환을 사용자가 승인했다(2026-11-12). 특정 위치를 찾는 일은 검색·필터 파라미터로 푼다.
- **테스트의 문구·구조 단언이 대량으로 깨진다.** 07 지침서의 "문구 단언 정리"를 이 지침서와 같은 묶음으로 실행한다.
- **`Card` → `Surface`는 모서리·테두리가 눈에 보이게 바뀐다.** 한 번에 전부 바꾸고 visual-diff로 확인한다.

## 동작 보존용 선행 테스트

1. `npm run visual-diff -- <base-ref>`를 전환 묶음마다 돌려 의도한 차이만 남는지 확인한다.
2. Playwright CLI로 전환 대상 화면을 PC(1440×900)와 모바일(390×844) 두 뷰포트로 전후 캡처한다(`npx playwright screenshot --viewport-size "390,844" …`). 로컬 api가 필요한 화면은 사용자가 api를 기동한 세션에서 한다.
3. `npm run a11y-check -- --url …`: 표 region, 다이얼로그 포커스, 포커스 링이 프리미티브 전환 뒤에도 통과.
4. `DataList`·`AsyncSection`·`ConfirmDialog`에 컴포넌트 테스트를 둔다(상태 판정, 정렬, 더 보기, 타이핑 확인). 화면별 테스트에서 같은 것을 다시 검사하지 않는다.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 1 | `DataList` 설계와 시범 전환 2개(전량형 `StrategyTypeComparison`, 페이지형 `CycleHistoryTable`), 감량 실측 | `shared/ui/data-list/**` | Opus | 컴포넌트 테스트, 두 화면 전후 스크린샷, 실측 줄 수를 PROGRESS에 기록 |
| 2 | 나머지 표 전환 | 표 13파일(도메인별 병렬, 파일 안 겹침) | Sonnet | `grep -rln "lg:hidden" --include='*.tsx' . \| wc -l`이 5 이하, 해당 vitest |
| 3 | `AsyncSection` + 스켈레톤 프리셋, 인라인 로딩·실패·빈 상태 전환, 차트 래퍼 5개 정리, `loading.tsx` 재수출화 | `shared/ui/**`, 전 위젯, `app/**/loading.tsx` | Opus(프리미티브), Sonnet(전환) | `grep -rn "불러오는 중" --include='*.tsx' . \| grep -v shared/ui` 0건, `grep -rln "animate-pulse" app \| wc -l` 0 |
| 4 | `ConfirmDialog`로 통합 | `shared/ui/ConfirmDeleteDialog.tsx`, 자체 `AlertDialog` 14파일 | Sonnet | `grep -rln "<AlertDialog" --include='*.tsx' . \| grep -v shared/ui \| grep -v components/ui` 0건 |
| 5 | `AmountInput` 통합 | 입력 5종 사용처 | Sonnet | `grep -rn 'type="number"' --include='*.tsx' .` 0건 |
| 6 | `Surface`·`SectionTitle` 통합, `card.tsx` 삭제 | 전 화면 | Sonnet | `grep -rn "components/ui/card" .` 0건, visual-diff 검토 |
| 7 | 포매터 정리와 lint 규칙, 토스트 어미 통일 | `shared/lib/format/**`, 위젯 로컬 `fmt*`, `eslint.config.mjs` | Sonnet | `npm run lint`(새 규칙 포함) |
| 8 | `useUrlState` 통합, 페이지네이션 컴포넌트 삭제, 내비 항목 단일화, 분기점 상수 | `shared/lib/hooks/**`, `shared/ui/{PaginationBar,PageSizeSelector}.tsx`, `components/ui/pagination.tsx`, 레이아웃 | Sonnet | `npm run knip`, `npm run test:run` |

태스크 1의 실측이 추정의 절반에 못 미치면 태스크 2를 멈추고 사용자와 범위를 다시 정한다.

## 하지 말아야 할 것

- 프리미티브에 화면 하나를 위한 prop을 넣지 않는다. 담기지 않는 화면은 프리미티브 밖에 둔다.
- `DataList` 컬럼에 `mobileRender` 같은 탈출구를 만들지 않는다. 그것이 이중 마크업의 재발이다.
- 로딩·실패·빈 상태를 화면에서 직접 그리지 않는다(`AsyncSection`·`DataList` 밖에서 `isLoading ? … : …`를 쓰지 않는다).
- 새 색·간격·모서리 임의값(`[13px]`, `[#…]`)을 추가하지 않는다. 토큰에 없으면 토큰을 추가한다.
- 규칙을 문서에만 적지 않는다. 컴포넌트나 lint로 강제할 수 없는 규칙만 문서에 남긴다.

## 재심한 유지 확정 항목

| 기존 결정 | 출처 | 재심 결과 |
|---|---|---|
| `TableHeadCell`·`TableDataCell` 쌍과 정렬 규칙 | `docs/agents/widgets.md`, `shared.md` | 유지하되 `DataList` 내부로. 문서 규칙 삭제 |
| `SortableHeadCell` + `MobileSortControl` + `useTableSort` 세트, 서버 페이지네이션 표에는 정렬 미적용 | `docs/agents/shared.md` | 유지(전량형만 정렬). `DataList` 내부로 |
| `SegmentedToggle`·`SegmentedTabs`·`SectionTabBar`를 의미로 구분 | `docs/agents/shared.md` | 유지 |
| CTA 버튼 위계(brand / brand-soft / default / destructive) | `docs/agents/shared.md` | 유지 |
| `SelectionCard`는 테두리만으로 선택 표시 | `docs/agents/shared.md` | 유지 |
| 토스트 마침표는 레이어별로 다르다 | `docs/agents/copy.md` | 변경. 레이어가 없어지므로 규칙 하나로 |
| 값 없음은 `-` | `docs/agents/copy.md` | 유지 |
| 인라인 `style` 원칙적 금지, 토큰값 예외 | `docs/agents/constraints.md` | 유지. 정적 토큰 색은 Tailwind 클래스로 쓰고 `style`은 계산값에만 |

## 다른 지침서와의 의존·순서

- 선행: 02(목록 두 종류, 전역 실패 처리), api 지침서 10의 T4(목록 규약). 페이지형 전환은 api와 같은 날 배포한다.
- 04의 `FormField`가 `AmountInput`을, 폼 페이지 `loading.tsx`가 스켈레톤 프리셋을 쓴다. 04와 06의 프리미티브 태스크(04-4, 06-1·3·4·5)를 먼저 하고 화면 전환을 뒤에 한다.
- 07: 문구·구조 단언 정리를 이 지침서의 화면 전환과 같은 묶음으로.
- 03보다 먼저 한다(이동할 코드가 준다).
