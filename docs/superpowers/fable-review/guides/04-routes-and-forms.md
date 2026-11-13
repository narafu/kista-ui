# 04. 라우트와 폼 — 폼 형태를 둘로, 폼 구현을 하나로

근거 측정: `findings/c-parallel-structures.md` 4~5절과 5절 보충, `findings/g-ux-pattern-variance.md` 2·4절, `findings/d-single-use-abstractions.md` 5절, `findings/a-vertical-trace.md` 화면 4.

**결정 1(인터셉트 라우트 폐지)은 2026-11-12 사용자가 승인했다.** 아래 "승인되지 않으면" 문단은 기록으로만 남긴다.

## 현재 구조와 문제

### 생성·수정 흐름의 형태가 여섯 가지다

전용 페이지, 페이지 + `@modal` 인터셉트 쌍, Dialog, AlertDialog 확인, 인라인 편집, 타이핑 확인 Dialog. 가계부 안에서만 거래내역·카테고리·재무계좌는 Dialog, 자산 기록·예산은 페이지 + 모달 쌍이다. 어느 형태를 고르는지 정한 규칙은 없다(`findings/g` 11(d)-3).

### 인터셉트 라우트 쌍은 폼 하나에 app 파일 다섯 개를 요구한다

`/finance/new` 예:

| 파일 | 줄 | 내용 |
|---|---:|---|
| `app/(main)/finance/new/page.tsx` | 19 | `<div className="max-w-lg mx-auto">`로 감싼다 |
| `app/(main)/@modal/(.)finance/new/page.tsx` | 14 | `<RouteModal>`로 감싼다 |
| `app/(main)/finance/new/NewAssetFormBody.tsx` | 30 | 두 page가 공유하는 조립 |
| `app/(main)/finance/new/loading.tsx` | 13 | 스켈레톤 |
| `app/(main)/@modal/(.)finance/new/loading.tsx` | 1~13 | 스켈레톤 |

이런 폼 라우트가 10개이고 합계 777줄이다. 쌍끼리의 차이는 3~8줄이다.

이 패턴은 주변에 보조 장치를 계속 만든다(`docs/agents/app.md` "인터셉팅 라우트 모달"부터 네 문단).

- 모든 폼 컴포넌트가 `dismiss: 'push' | 'back'` prop을 받아 끝내는 방법을 가른다(`features/strategy/inject-capital/InjectCapitalForm.tsx:36-45` 등).
- `@modal/default.tsx`, `@modal/[...catchAll]/page.tsx`(모달 안 링크로 이동하면 모달이 남는 문제의 방어).
- `shared/ui/RouteModal.tsx` 132줄: 포커스 트랩, ESC 처리, `MutationObserver`로 자식의 `h1`을 찾아 `aria-labelledby`를 건다. 포털에 포커스가 있거나 하위 오버레이가 열려 있으면 ESC를 무시하는 분기가 있다.
- `shared/lib/subviewHistory.ts` 61줄: 모달 안에서 하위 뷰를 열면 이력을 하나 쌓고, 닫을 때 `history.go(-2)`.
- 예산은 목록 자체가 라우트 모달이라 목록 → 폼 이동 때 목록이 unmount된다. 그래서 필터·페이지를 `window.history.replaceState`로 searchParams에 쓴다. 모달이 뜬 동안 배경의 `usePathname()`이 모달 경로가 되므로 `FinanceHeader`가 원래 탭 경로로 되돌려 판정한다.
- 공유 조립 파일을 둘 곳이 없어 `app/` 안 cross-import를 이 패턴 전용 예외로 허용했다.

### 폼 구현이 두 벌이다

`<form>` 19개 중 react-hook-form + zod가 5개, `useState` 수동 폼이 14개다(`findings/g` 4절).

- 수동 폼은 필드마다 `useState`를 두고(4~9개), 검증은 제출 핸들러의 `if (!name.trim()) return`이며, 필드 에러를 그리지 않는다. 실패는 토스트로만 나간다(가계부 5개 폼에 에러 렌더링 0건).
- 제출 처리가 폼마다 다시 적힌다. 가계부 폼은 `shared/lib/form/submitFormDialog.ts`(42줄)로 create/edit 분기와 성공 토스트를 묶었지만 그 폼들만 쓴다.
- 필드 조립(Label + 입력 + 힌트 + 에러 + `aria-describedby`)을 손으로 한다. 필수 표시가 `*`와 `(선택)`으로 갈리고, 제출 중 문구가 `...`과 `…`로 갈린다.
- 생성·수정이 별도 파일인 쌍이 있다: `CategoryFormDialog`(130) / `SystemCategoryFormDialog`(120, 주석이 "거의 동일"이라 적는다), `CreatePrivacyBaseDialog`(193) / `EditPrivacyBaseDialog`(120), `AddPrivacyOrderDialog`(114) / `EditPrivacyOrderDialog`(89), `InjectCapitalForm`(118) / `WithdrawCapitalForm`(121, 약 80% 동일).

### 전략 폼

`features/strategy/create-strategy`는 33파일 3,094줄이고 형제 테스트가 소스보다 많다(6,663줄).

- 일반 폼(`StrategyForm.tsx` 200 + `model/useStrategyForm.ts` 278)과 DCA 폼(`DcaStrategyForm.tsx` 215 + `dcaFormSchema.ts` 187)이 서로 다른 스키마·hook·payload 빌더를 가진 별개 구현이다.
- `useStrategyForm.ts`가 자기만 쓰는 hook·헬퍼 9개 파일을 조립한다(`:13-22`). 반환 객체의 필드가 수십 개다.
- 서버 규칙의 사본이 폼 안에 있다: `strategyFormGuards.ts` 200줄, `vrDerived.ts` 84줄, `useTypeDefaults.ts` 70줄(런타임 기본값 적용), `RAMP_DEFAULTS_BY_MODE`.

## 목표 구조

### 결정 1 (승인됨, 2026-11-12): 폼 형태는 "다이얼로그" 아니면 "페이지"다. 인터셉트 라우트를 없앤다

| 형태 | 기준 | 화면에서 |
|---|---|---|
| 폼 다이얼로그 | 한 화면에 들어오고 하위 뷰가 없는 폼. 현재 기준: 투자금 추가·인출, 가계부 거래내역·카테고리·재무계좌·예산, 닉네임, 관리자 개인정보 주문·기준 | PC는 가운데 다이얼로그, 모바일은 전체 화면 시트. 배경 화면이 그대로 남는다 |
| 폼 페이지 | 섹션이 여럿이거나 하위 뷰·단계가 있는 폼. 현재 기준: 전략 등록·수정(DCA 포함), VR 재설정, 계좌 등록(스테퍼)·수정, 자산 기록 등록·수정, 일괄 등록, 관리자 설정 | PC·모바일 모두 일반 페이지. `PageHeader`의 뒤로 링크로 돌아간다 |

바뀌는 사용자 경험: 지금 PC에서 모달로 뜨는 큰 폼(전략 등록·수정, VR 재설정, 자산 기록)이 일반 페이지로 열린다. 작은 폼(투자금 추가·인출, 예산)은 지금처럼 PC에서 모달로 뜨되 URL이 바뀌지 않는다.

이 결정은 `docs/agents/app.md`의 "인터셉팅 라우트 모달" 결정(다이얼로그 폼을 페이지로 바꾸면서 PC 전환이 불편해 도입)을 뒤집는다. 뒤집는 이유:

- 원래 요구는 "PC에서 작은 폼을 열 때 화면 전체가 바뀌지 않게"였다. 작은 폼을 다이얼로그로 두면 그 요구는 라우트 장치 없이 충족된다.
- 큰 폼은 PC에서도 모달이 맞지 않는다. 전략 폼은 섹션 열 개 남짓에 하위 뷰(DCA 규칙 편집)가 있어, 모달 안 스크롤·하위 뷰 이력·ESC 예외가 전부 이 폼 때문에 생겼다.
- 한 폼을 두 방식으로 띄우는 데 드는 장치(위 "보조 장치" 목록)가 폼 자체보다 복잡하다.

승인되지 않으면(인터셉트 쌍 유지): 이 지침서의 "폼 구현" 부분(태스크 4 이후)만 실행하고, 라우트 쪽은 `FormBody`가 받는 `dismiss`를 `RouteModal` 컨텍스트로 옮겨 폼에서 prop을 지우는 데서 멈춘다. 감량은 아래 표의 라우트 행이 빠진다.

### 폼 다이얼로그 프리미티브 하나

`shared/ui/FormDialog` — 제목·설명·본문·`FormActions`를 받는 반응형 다이얼로그(PC 가운데, 모바일 전체 화면 시트). 열림 상태는 부모의 `useState`다. 포커스·ESC·`aria-labelledby`는 shadcn `Dialog`(Base UI)가 처리한다. `RouteModal`, `subviewHistory`, `@modal` 슬롯, `dismiss` prop, `FormBody` 파일을 지운다.

### 폼 구현은 한 가지

모든 폼이 react-hook-form + zod + 아래 두 프리미티브를 쓴다.

**폼의 판정 기준**: 사용자가 입력한 값을 검증해 mutation 하나로 제출하면 폼이다. 셋 중 하나라도 빠지면 폼이 아니고 `useAppForm` 대상이 아니다.

| 폼이 아닌 것 | 예 | 가는 곳 |
|---|---|---|
| 확인 단계(입력이 "정말 할 것인가"의 확인뿐) | 계좌 삭제 타이핑 확인(`EditAccountForm`의 `deleteConfirm`), AlertDialog 확인 | 06의 확인 다이얼로그 |
| 검증할 입력이 없는 실행(기본값이 있는 옵션 선택 + 버튼) | `InviteDialog`(만료 시간 Select) | 그대로 둔다 |
| 값과 `onChange`를 받는 제어 편집기(자기 mutation이 없는 입력 부품) | `SuggestionListEditor`, `ValueListEditor` | 폼 안에서는 `FormField`의 children으로 쓴다 |
| 서버 목록의 행을 고르고 덮어쓰는 화면 | `BulkRegisterForm` | 05의 일괄 등록 미리보기(api 지침서 10의 2-6절)가 화면을 다시 정한다 |

이 기준으로 `AdminSettingsForm`(태스크 5e)과 계좌 등록 스테퍼(태스크 5f)는 폼이다. 예외로 두지 않는다.

```tsx
const form = useAppForm({
  schema,                    // zod: 형식 검증만(필수·숫자·범위)
  defaultValues,
  mutation,                  // 02의 $api.useMutation 결과
  successMessage: '카테고리가 추가되었습니다',
  onDone: close,             // 다이얼로그 닫기 또는 router.push
})

<form onSubmit={form.submit}>
  <FormField control={form.control} name="name" label="이름" required>
    {(field) => <Input {...field} />}
  </FormField>
  <FormActions form={form} label="저장" />
</form>
```

- `useAppForm`이 맡는 것: `zodResolver`, 제출 → `mutation.mutate`, 성공 토스트와 `onDone`, 진행 상태, 그리고 **서버 필드 오류를 필드에 붙이는 일**. `schema`·`mutation`·`toPayload`·`successMessage`·`onDone` 밖의 옵션은 `useForm`에 그대로 넘긴다(`values`, `resetOptions` 등). 폼별 옵션을 새로 만드는 것이 아니라 RHF 옵션의 통과다.
- **서버 오류의 분담**(api T7 뒤, `MAP_SERVER_FIELD_ERRORS`를 지우고 항상 켠다):
  - 실패 토스트는 02의 전역 `onError` 한 곳이 **항상** 서버 `detail`로 띄운다. `fieldErrors`가 있어도 건너뛰지 않고, mutation에 폼 표시용 `meta`를 달지 않는다. 폼이 그리지 않는 필드의 오류가 묻히지 않게 하기 위해서다.
  - `fieldErrors[{field, detail}]`가 있는 응답의 `detail`은 요약 문장이다("입력값을 확인해 주세요." — `cross-repo.md` B 2026-11-13 항목). 그래서 토스트는 "오류가 있다", 필드는 "무엇이 틀렸다"를 말하고 같은 문장이 두 번 나오지 않는다.
  - `useAppForm`은 `field`가 폼 필드 이름과 같으면 `setError(field, { type: 'server', message: detail })`로 붙이고 첫 필드에 포커스를 준다(`shouldFocus`). 배열 경로는 `serverFieldErrors`가 `orders[0].price`를 `orders.0.price`로 바꾼다.
  - 폼 필드와 이름이 맞지 않는 `fieldErrors`(요청 바디에만 있는 필드, `toPayload`가 이름을 바꾼 필드)는 `setError('root.server', ...)`로 모으고, `FormActions`가 버튼 위에 `role="alert"` 한 줄로 그린다. 폼마다 이름 대응표를 만들지 않는다.
  - 기각: 전역 처리가 `fieldErrors`가 있으면 건너뛴다(폼이 아닌 mutation과 이름이 안 맞는 필드에서 오류가 사라진다). mutation마다 `meta: { fieldErrors: true }`를 단다(폼마다 적어야 하고, 빠뜨려도 드러나지 않으며, 이름이 안 맞는 필드의 대책이 따로 필요하다).
- **제출 버튼은 진행 중과 잠금일 때만 비활성이다.** 잠금은 지금 무엇을 입력해도 제출할 수 없는 서버 상태다(월 마감 등). 잠금이면 이유 문장을 폼에 보인다. 빈 필수 값·형식 오류로는 비활성화하지 않는다. 제출하면 zod가 필드에 오류를 붙이고 RHF가 첫 오류 필드로 포커스를 옮긴다. 이유: 비활성 버튼은 무엇이 빠졌는지 알려주지 않고, 버튼과 Enter 제출을 따로 막아야 한다(묶음 C 리뷰 지적 2건이 이 누락이었다). `FormActions`의 `canSubmit`은 `locked`로 바꾼다.
- `FormField`가 맡는 것: Label, 필수 표시, 힌트, 에러 문구, `aria-describedby`·`aria-invalid`·`role="alert"` 연결. 표기는 여기 한 곳에서 정한다(필수 `*`, 제출 중 문구 `…`). **선택 필드에는 표기를 두지 않는다.** `*`가 없으면 선택이다. 라벨·섹션 제목에 "(선택)"·"(필수)"를 쓰지 않고, `FormField`에 `optional` prop을 만들지 않는다. 건너뛸 수 있는 섹션이라는 안내가 필요하면 섹션 설명 문장에 쓴다.
- 업무 규칙 검증을 zod에 넣지 않는다. 범위·기본값은 메타에서 받아 스키마를 만든다(`z.number().min(meta.min).max(meta.max)`). 교차 필드 규칙과 한도는 서버가 `fieldErrors`로 알려준다(05 지침서).
- 생성·수정은 한 컴포넌트다. `initial`이 있으면 수정이다. `submitFormDialog`는 `useAppForm`에 흡수된다.
- 금액·수량 입력은 06 지침서의 `AmountInput` 하나를 쓴다.

### 전략 폼은 하나의 골격에 종류별 섹션

- `StrategyForm` 하나가 공통 골격(계좌·종목·종류 선택, 제출)을 갖고, 종류별 섹션 컴포넌트(`InfiniteSection`, `VrSection`, `DcaSection`)를 끼운다.
- 스키마는 `z.discriminatedUnion('type', [...])` 하나다. 일반 폼과 DCA 폼의 별도 스키마·hook·payload 빌더를 합친다.
- 기본값·허용 범위·VR 램프 기본값표는 `/api/meta`에서 온다(api 지침서 10의 T5). `useTypeDefaults`, `RAMP_DEFAULTS_BY_MODE`, 런타임 설정 병합 코드가 "메타 → defaultValues" 한 함수가 된다.
- `strategyFormGuards.ts`와 `vrDerived.ts`의 서버 규칙 사본은 05 지침서에서 지운다. 제출 가능 여부를 UI가 미리 계산하지 않고, 서버가 준 `fieldErrors`와 미리보기 `warnings`를 보여준다.
- `useStrategyForm`이 조립하는 9개 파일은 03의 "한 곳만 쓰는 hook은 그 파일에" 규칙에 따라 섹션 컴포넌트와 폼 파일로 흡수한다.

### 라우트 파일

- 폼 페이지의 `page.tsx`는 데이터 프리페치와 화면 컴포넌트 렌더만 한다. 래퍼 `div`와 `PageHeader`는 화면 컴포넌트(03의 `screens/`)에 둔다.
- `loading.tsx`는 06 지침서의 로딩 프리셋을 재수출하는 한 줄이다.

### 그렇게 정한 이유

- 폼의 형태 규칙이 없어서 가계부 한 영역에 세 방식이 생겼다. 규칙은 판정이 쉬워야 지켜진다. "한 화면에 들어오고 하위 뷰가 없으면 다이얼로그, 아니면 페이지"는 폼을 보면 바로 판정된다.
- 폼 구현이 하나면 검증 시점, 에러 위치, 필수 표시, 제출 중 표시, 성공 후 동작이 프리미티브 안에서 정해져 화면마다 달라질 수 없다. 일관성을 규칙 문서가 아니라 코드 구조로 얻는다.
- 서버가 필드 오류를 구조화해 주면 UI는 업무 규칙을 복제하지 않고도 필드 옆에 오류를 보여줄 수 있다. 수동 폼이 토스트로만 실패를 알리던 문제도 같이 풀린다.

### 기각한 대안

- **인터셉트 쌍을 유지하고 라우트 팩토리로 보일러플레이트만 줄인다**: 파일 수는 Next 규약상 줄지 않고(page 2개 + loading 2개는 남는다), 보조 장치도 그대로다.
- **전부 다이얼로그로 한다**: 전략 폼처럼 큰 폼은 모달에 맞지 않고, 새로고침·공유 가능한 URL이 사라진다.
- **전부 페이지로 한다**: 한 필드짜리 투자금 추가에 화면 전환이 생긴다. 원래의 불편이 되살아난다.
- **수동 `useState` 폼으로 통일한다**: 필드 에러·dirty·서버 오류 매핑을 직접 만들어야 한다. 이미 있는 의존성(react-hook-form, zod)이 하는 일이다.
- **shadcn `form.tsx`를 추가한다**: `FormField`가 하는 일과 겹치지만 Context 4단 조립(`FormItem`/`FormLabel`/`FormControl`/`FormMessage`)을 호출부마다 적어야 한다. 프로젝트 표기 규칙을 담은 한 컴포넌트가 호출부를 더 짧게 만든다.

## 예상 감량과 위험

| 대상 | 현재 | 목표 | 감량 |
|---|---:|---:|---:|
| 폼 라우트 세트(page·`@modal` page·loading 2·FormBody) 10개 | 777줄, 약 50파일 | 폼 페이지 6개의 page + loading 약 150줄 | 약 620줄, 약 35파일 |
| `RouteModal`·`subviewHistory`·`dismiss`·`@modal/default`·`catchAll`·`ModalFormSkeleton` | 약 260줄 | `FormDialog` 약 50줄 | 약 210 |
| 예산 목록의 모달 대응(`replaceState`, `FinanceHeader` 경로 보정) | 약 60줄 | 0 | 약 60 |
| 가계부 수동 폼 5개 + `submitFormDialog` | 830줄 | 약 520줄 | 약 310 |
| 생성·수정·평행 쌍 4묶음 | 985줄 | 약 600줄 | 약 385 |
| 전략 폼(`create-strategy` 33파일) | 3,094줄 | 약 2,000줄(05의 규칙 사본 제거 약 350줄 포함) | 약 1,100 |
| 그 외 수동 폼(`AssetForm`, `EditAccountForm`, `AdminSettingsForm` 등)의 필드 조립 | — | `FormField` 전환 | 약 200 |

합계 제품 약 2,900줄(05와 겹치는 약 350줄 포함), 파일 약 55개. 테스트는 07에서 계산한다.

위험:

- **전략 폼은 주문 금액을 만든다.** payload가 한 필드라도 달라지면 실계좌 주문이 달라진다. 선행 테스트 1번으로 payload를 고정하고 Opus가 맡는다.
- **뒤로 가기 동작이 바뀐다.** 지금은 모달을 닫으면 `router.back()`이다. 다이얼로그는 이력을 쌓지 않으므로 모바일에서 뒤로 가기를 누르면 폼이 닫히지 않고 이전 화면으로 간다. 모바일 전체 화면 시트에서 이것이 문제인지 실기기로 확인한다(선행 테스트 3번). 문제면 `FormDialog`가 열릴 때 이력 항목을 하나 쌓고 `popstate`에서 닫는다(약 15줄, `FormDialog` 한 곳).
- **iOS PWA 뷰포트**: memory의 미해결 Bug B(실기기 필요)가 전체 화면 레이어와 관련 있을 수 있다. 모바일 시트는 실기기에서 키보드가 올라온 상태로 확인한다.
- **복제 등록 링크**: `/finance/new?duplicateFrom=`처럼 URL로 폼 초기값을 넘기는 흐름은 폼 페이지로 남는 쪽(자산 기록)에만 있다. 다이얼로그로 가는 폼에 같은 흐름이 있는지 태스크 1에서 전수 확인한다.
- **서버 `fieldErrors`가 없으면** 필드 옆 오류가 안 나온다. api 지침서 10의 T7 전에는 필드 매핑을 꺼 두고(`MAP_SERVER_FIELD_ERRORS = false`) 실패는 `detail` 토스트로만 알린다. 토스트를 띄우는 곳은 02 전에는 entities mutation hook의 `onError`, 02 뒤에는 전역 `onError`다. `useAppForm`은 어느 때도 실패 토스트를 띄우지 않는다. T7 뒤에 "서버 오류의 분담"대로 켠다(태스크 5g).
- api가 요약 `detail` 규약을 받지 않으면 필드 하나짜리 오류에서 같은 문장이 토스트와 필드에 함께 나온다. 동작은 깨지지 않으므로 UI 쪽 분담은 바꾸지 않는다.

## 동작 보존용 선행 테스트

1. **전략 payload 고정**: `buildStrategyPayload`·`buildDcaPayload`의 현재 테스트에서 "폼 값 → 요청 JSON" 케이스를 종류별(INFINITE, PRIVACY, VR 3모드, DCA 주식·크립토, 등록·수정)로 골라 입력·출력 쌍을 픽스처 파일로 뽑는다. 새 폼이 같은 입력에서 같은 JSON을 내는지를 리팩토링 내내 이 한 테스트로 확인한다.
2. **폼별 제출 동작**: 가계부 폼 5개와 투자금 추가·인출에 대해 "채우고 제출하면 어떤 요청이 나가는가"를 e2e 또는 컴포넌트 테스트 1개씩으로 고정한다(이미 있으면 재사용).
3. **실기기 확인 목록**(Playwright CLI로 모바일 뷰포트 스크린샷 + 사용자 실기기): 다이얼로그로 바뀌는 폼 각각의 열기·닫기·뒤로 가기·키보드 표시.
4. `npm run a11y-check`의 다이얼로그 점검이 `FormDialog` 사용처에서 통과.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 0 | 결정 1 승인 받기 | — | — | 완료(2026-11-12, 폐지 승인) |
| 1 | 폼 전수표: 폼마다 현재 형태, 필드 수, 하위 뷰 유무, URL 파라미터 의존, 목표 형태 | `findings/m-form-inventory.md` | Sonnet | 폼 전부 행이 있음(**완료 2026-11-12**, 실제 28행) |
| 2 | `FormDialog` 추가, 모바일 뒤로 가기 동작 확인(**완료 2026-11-12**, 실기기 확인은 남음) | `shared/ui/FormDialog.tsx` | Opus | a11y-check, 모바일 뷰포트 스크린샷 |
| 3 | 작은 폼을 다이얼로그로 전환하고 인터셉트 라우트 제거(**완료 2026-11-12**. `subviewHistory`는 `FormDialog`와 DCA 하위 뷰가 함께 쓰므로 남겼다 — 완료 판정 grep에서 뺀다) | `app/(main)/@modal/**`, 해당 `page.tsx`·`loading.tsx`·`*FormBody.tsx`, 폼 컴포넌트의 `dismiss` | Sonnet | `ls "app/(main)/@modal"`이 없음, `grep -rn "dismiss" --include='*.tsx' . \| grep -v test` 0건, `grep -rn "RouteModal\|subviewHistory" .` 0건 |
| 4 | `useAppForm`·`FormField` 추가, `FormActions`를 form 객체를 받게 변경 | `shared/ui/form/**` | Opus | 단위 테스트(제출·진행·성공·서버 필드 오류 매핑) |
| 5a | 가계부 폼 5개 전환, 생성·수정 쌍 병합(`CategoryFormDialog`·`SystemCategoryFormDialog`) | `features/finance/**` | Sonnet | 선행 테스트 2 통과, `grep -rn "submitFormDialog" .` 0건 |
| 5b | 관리자 개인정보 다이얼로그 쌍 병합, 그 외 수동 폼 전환 | `widgets/admin-privacy-trade-list/**`, `features/{account,asset,admin,settings}/**` | Sonnet (디렉토리별 병렬) | 해당 vitest, `grep -rnE "useState.*\(''\)" features --include='*Form*.tsx'`가 폼 필드 용도로 0건 |
| 5c | 투자금 추가·인출을 한 컴포넌트로 | `features/strategy/{inject,withdraw}-capital/**` | Sonnet | 선행 테스트 2 통과 |
| 5d | 제출 버튼 규칙 통일: 값 유무·형식으로 버튼을 막는 조건을 zod 필수·형식 오류로 옮기고, `FormActions`의 `canSubmit`을 `locked`로 바꾼다. 잠금(월 마감)은 `locked`와 `onSubmit` 가드로 남긴다. 교차 필드 가드(예산 종료일 < 시작일)는 api T7까지 그대로 둔다 | `shared/ui/FormActions.tsx`, `features/finance/{save-transaction,manage-accounts,manage-categories,manage-budgets,manage-group}/**`, `features/asset/save-asset/AssetForm.tsx`, `features/account/edit-account/CredentialsCard.tsx` | Sonnet | 폼마다 "빈 값으로 제출하면 필드 오류가 보이고 요청이 나가지 않는다" 단언 1건, `grep -rn "canSubmit" --include='*.tsx' app features widgets shared \| grep -v test` 0건(전략 폼은 04-6 전까지 `locked={form.cannotSubmit}`로 이름만 옮긴다) |
| 5e | `AdminSettingsForm`을 `useAppForm`으로: 초안·서버값 따라가기·dirty·되돌리기를 `values: settings` + `resetOptions: { keepDirtyValues: true }`·`formState.isDirty`·`reset()`으로 바꾸고, `setStrategyField` 등 경로별 setter를 `FormField name="strategies.X.fields.Y"`로 바꾼다. `validateAdminSettings` 중 형식 검증만 zod로 옮기고 나머지는 05 판정에 따른다. 저장 뒤 무효화(`activatesPendingUsersRef`)는 그 폼에 남긴다. 서버값이 바뀔 때 "편집 중이면 초안 전체 보존"이 "편집한 필드만 보존"으로 바뀐다(허용) | `features/admin/settings/**` | Opus(전 사용자의 전략 기본값을 바꾸는 요청이다) | 선행: "편집 후 저장하면 나가는 요청 바디" 단언을 전환 전에 고정. 전환 뒤 통과, `grep -n "useState" features/admin/settings/ui/AdminSettingsForm.tsx`가 펼침 상태 1건뿐 |
| 5f | 계좌 등록 스테퍼를 폼 하나로: `CreateAccountStepper`가 `useAppForm` 하나를 갖고 단계 컴포넌트는 `control`을 받는다. "다음"은 `form.trigger([그 단계 필드])`가 통과하면 넘어간다(버튼 비활성 없음). 단계 번호만 `useState`로 남기고 `useReducer`·단계별 `useState`·`touched*`를 지운다. 연결 테스트(`useTestKisConnectionMutation`)는 Api 단계의 동작으로 남긴다. 필수 `*`는 `FormField`가 붙인다 | `features/account/create-account/**` | Sonnet | 선행: 4단계를 채워 제출하면 나가는 요청 바디 단언(있으면 재사용). `grep -rnE "useReducer\|touched" features/account/create-account --include='*.tsx' \| grep -v test` 0건 |
| 5g | 서버 필드 오류 켜기: "서버 오류의 분담" 구현(`MAP_SERVER_FIELD_ERRORS` 삭제, 배열 경로 변환, `root.server`와 `FormActions` 표시, 첫 필드 포커스). 5d가 남긴 교차 필드 가드를 지운다 | `shared/ui/form/**`, `shared/ui/FormActions.tsx`, 가드가 남은 폼 | Sonnet | api T7과 02 완료 뒤. 단위 테스트: 이름이 맞는 필드, 배열 경로, 이름이 안 맞는 필드 각 1건 |
| 6 | 전략 폼 통합(골격 1 + 종류별 섹션, 판별 유니언 스키마, 메타 기본값). `ReconfigureVrSections`의 섹션 제목 "(선택)" 2건을 지운다 | `features/strategy/create-strategy/**`, `features/strategy/reconfigure-vr/**` | Opus | 선행 테스트 1 통과, `/code-review high`, `grep -rnE "\((선택\|필수)\)" --include='*.tsx' app features widgets shared \| grep -v test`가 주석 외 0건 |
| 7 | 문서 갱신. (a) `docs/agents/app.md`의 인터셉트 라우트 4문단 삭제, 폼 형태 기준 추가(**완료 2026-11-12**). (b) 폼 규칙 3줄을 `docs/agents/a11y.md`에 "폼" 항목으로 추가한다(features·widgets·shared에서 로드된다): 폼의 판정 기준과 `useAppForm`·`FormField` 사용, 제출 버튼은 진행 중·잠금에만 비활성, 필수는 `*`이고 "(선택)"·"(필수)"를 쓰지 않는다. (c) `docs/agents/shared.md`의 `form/useAppForm` 항목은 프리미티브 설명으로 두되 5d·5g가 바꾼 부분을 그때 고친다 | 08 지침서에 합친다(08 태스크 12가 (b)를 `ui.md`로 옮기고, 태스크 13이 (c)를 지운다) | Haiku | 08의 판정 |

태스크 6은 05 지침서(서버 규칙 사본 제거)와 api 지침서 10의 T5(메타 기본값)·T7(`fieldErrors`) 뒤에 한다. 그 전에 하면 지울 코드를 새 구조로 옮기게 된다.

5d·5e·5f는 서로 파일이 겹치지 않고 서버 선행 조건이 없다. 묶음 D(06) 앞뒤 어디에 넣어도 된다. 태스크 7의 (b) 문서 추가는 5d와 같은 커밋에 넣는다.

## 판단이 갈릴 때의 기본값

- **이미 Dialog인 폼도 `FormDialog` 셸로 옮긴다.** 결정 1 표의 "폼 다이얼로그"에 든 폼은 전부 같은 셸을 쓴다(모바일 전체 화면, 뒤로 가기로 닫기). 묶음 C에서 가계부 거래내역·재무계좌·카테고리와 관리자 개인정보 폼을 옮긴 것이 이 기본값이다.
- **폼인지 애매하면** "폼의 판정 기준" 세 조건으로 가른다. 조건을 다 채우는데 전환 이득이 작아 보여도 전환한다. 예외 목록을 늘리지 않는다.
- **폼 필드 이름은 요청 바디의 필드 이름과 같게 짓는다.** 서버 `fieldErrors`가 이름으로 붙기 때문이다. 화면 사정으로 다르게 지어야 하면 그대로 두고, 그 필드의 서버 오류는 버튼 위 한 줄로 나오게 둔다.
- **버튼을 막던 조건을 옮길 때**: 값이 비었거나 형식이 틀린 것은 zod 오류 문구로, 서버 상태 때문에 못 하는 것은 `locked`로, 두 필드를 비교하는 것은 api T7까지 그대로 둔다.
- **zod 오류 문구**는 "무엇을 하면 되는지"를 한 문장으로 쓴다("이름을 입력해 주세요."). 문구 규칙은 `docs/agents/copy.md`를 따른다.
- **성공 토스트**는 mutation hook이 이미 띄우면 `successMessage`를 넘기지 않는다. 02 뒤에는 hook 쪽을 지우고 `successMessage`로 모은다.
- **한 폼만 필요한 동작**(저장 뒤 추가 무효화, 확인 단계)은 그 폼에 적는다. 확인 단계가 있는 폼은 `<form onSubmit={form.handleSubmit(확인 열기)}>`로 열고 확인 버튼에서 `form.submit()`을 부른다.
- **화면 모양이 바뀌는 전환**(라벨 크기, 힌트 글씨 크기)은 `FormField` 기본값을 따르고 태스크 보고에 한 줄 남긴다. 폼마다 `className`으로 예전 모양을 되살리지 않는다.

## 하지 말아야 할 것

- 다이얼로그 폼을 URL로 열 수 있게 하려고 `?dialog=` 파라미터나 새 라우트 장치를 만들지 않는다. 깊은 링크가 필요한 폼이면 그것은 폼 페이지다.
- `useAppForm`에 폼별 옵션을 계속 얹지 않는다. 한 폼만 필요한 동작은 그 폼에 적는다.
- zod 스키마에 서버 한도·교차 필드 규칙을 다시 넣지 않는다.
- 전략 폼 통합 중에 필드 이름·기본값·반올림을 "정리"하지 않는다. payload 고정 테스트가 깨지면 되돌린다.
- 폼 형태를 화면마다 예외로 정하지 않는다. 기준에 안 맞는 폼이 나오면 기준을 고친다.

## 재심한 유지 확정 항목

| 기존 결정 | 출처 | 재심 결과 |
|---|---|---|
| 인터셉팅 라우트 모달(PC 모달·모바일 풀페이지) | `docs/agents/app.md` | 폐지(결정 1, 2026-11-12 승인) |
| 인터셉트 쌍의 `FormBody` 공유 조립과 `app/` 내 cross-import 예외 | `docs/agents/app.md` | 결정 1과 함께 폐지 |
| 목록 자체가 라우트 모달인 예산 화면과 searchParams `replaceState` | `docs/agents/app.md` | 결정 1과 함께 폐지. 예산 목록은 가계부 설정 화면의 일반 구역 + 폼 다이얼로그 |
| mutation hook이 `onError` 토스트를 갖고 호출부가 성공 토스트를 넣는다 | `docs/agents/entities.md`, `copy.md` | 변경. 실패는 02의 전역 처리, 성공은 `useAppForm`의 `successMessage` |
| `loading.tsx`는 실제 레이아웃을 모방한 skeleton | `docs/agents/app.md` | 유지하되 프리셋 재수출로(06) |

## 다른 지침서와의 의존·순서

- 선행: 02(`$api.useMutation`, 전역 실패 토스트).
- 05와 맞물린다: 전략 폼의 규칙 사본 제거는 05, 폼 구조 통합은 여기. 05 → 04 태스크 6 순서.
- 06: `AmountInput`, 로딩 프리셋, 확인 다이얼로그.
- api 지침서 10: T5(메타 기본값·범위), T7(`fieldErrors`). T7에 요약 `detail` 규약이 붙는다(`cross-repo.md` B 2026-11-13 항목, fable-api 반영 대기).
