# R. 구현 평가 — 지침서 04·07 대 커밋

측정일 2026-11-14, 기준 HEAD `72ef1770`, 비교 기준 `11600a19`(2026-11-12, 묶음 A 착수 직전 main). 사실만 적는다. 확인 못 한 것은 "미확인". 빌드·vitest·e2e는 돌리지 않았다(grep·wc·ls·git만).

줄 수 규칙: "ts 제품" = 추적되는 `*.ts(x)` 중 `*.test.*`·`testing/`·`__fixtures__`·`fixtures.ts`·`*.d.ts`·`api-types.ts`·`docs`를 뺀 것(eslint 설정 `.mjs`, yml, caddy 등 비-ts는 "비ts"로 따로). "테스트" = `*.test.ts(x)`. "testing·fixtures"는 `testing/`·`fixtures.ts`·`__fixtures__`.

## 0. 요약

- 2026-11-11 이후 커밋 58개. `docs:`로 시작하지 않는 것은 20개(병합 `459f9e3c` 1개 포함, 병합 제외 19개). 제목에 "docs"가 들어가 `grep -v ' docs'`에서 빠진 `cc80c297`(fix)은 구현 쪽으로 센다.
- 20개의 내역: 병합 1, 지침서 태스크에 대응하는 구현 커밋 8개(04: T2·T3·T4·T5a·T5b·T5c 6개, 07: T2+T5 한 커밋·T3 한 커밋 2개), 같은 태스크의 후속·재작업 4개(`3ebc90dc`·`9c8faa92`·`508a28ae`·`cc80c297`), 지침서 밖 7개(스펙 재수신·compose·CLDR 날짜 표기 2·CI 2·Caddy). 04 T1(폼 전수표)은 `eaf98591`(docs)이라 이 20개에 없다.
- 지침서 04·07 태스크 상태: 끝난 것 11개(04: T1·2·3·4·5a·5b·5c, 07: T1·2·3·5. T0은 결정 승인이라 뺐다), 부분 1개(04 T7), 그 밖은 미착수(04: 5d·5e·5f·5g·6, 07: 4·6·7·8·9).
- 지침서와 다르게 구현된 곳 13건(D-01~D-13, 3절). 이 중 지침서 본문에 옛 문장이 아직 남은 것 6건(D-03·04·05·06·07·08. 문장 위치로는 04 7곳, 07 1곳), 부분 1건(D-09).
- 실행 중 드러난 틀린 전제 15건(W-01~W-15, 5절). 착수 전 grep으로 걸러졌을 것: 예 9건, 아니오 6건.
- 제품·테스트 줄 수(기준 `11600a19` 대 HEAD): ts 제품 41,933 → 40,600(−1,333), 테스트 `*.test.*` 30,110 → 30,111(+1), `tests/`(1파일 129줄) 포함 30,239 → 30,240. 지침서 07의 목표 약 21,000(−9,300)에 대해 테스트 줄은 변화 없음.

## 1. 커밋 대조 (`docs:` 아닌 20개)

"제품"은 ts 제품, "비ts"는 설정·yml·caddy·json 등(md·docs 제외). 줄은 `git show --numstat`의 추가/삭제.

| 해시 | 날짜 | 제목(요약) | 대응 | ts 제품 | 테스트 `*.test.*` | testing·fixtures | 비ts |
|---|---|---|---|---|---|---|---|
| 0af4d34b | 11-11 | API 스펙 재수신(`session`·`isDst` 삭제) | 밖(kista-api 반영) | +0 −0 | 0 | 0 | +5 −11 |
| 459f9e3c | 11-11 | 병합 | 밖 | — | — | — | — |
| 374c47ba | 11-12 | PRIVACY 죽은 `days` 인자·루트 compose `TRADING_API_BASE_URL` | 밖(08 태스크 2 일부, 문서 정정 포함) | +3 −4 | 0 | 0 | +37 −249(문서 대부분) |
| d93e8570 | 11-12 | `mockApi`·`renderApp`·소스 패턴 테스트→ESLint | 07 T2 + T5 | +33 −0 | +98 −372 | +134 −0 | +34 −5 |
| 514002d7 | 11-12 | 도메인 테스트 빌더로 캐스트 제거 | 07 T3 | +0 −0 | +61 −81 | +32 −1 | +76 −1(PROGRESS 기록) |
| 60ea8f11 | 11-12 | `FormDialog` 추가 | 04 T2 | +43 −0 | +85 −0 | 0 | 0 |
| fc4456df | 11-12 | `required-env` 삭제, compose 필수 보간 | 밖(kista-infra 01 T3) | 0 | 0 | 0 | +10 −10 |
| cc80c297 | 11-12 | Tailwind가 `docs`의 md를 스캔 → `@source not "../docs"` | 04 T3 후속(밖에서 드러남) | 0 | 0 | 0 | +2 −0 |
| e2ddf7cc | 11-12 | 작은 폼 `FormDialog` 전환, 인터셉트 라우트 삭제 | 04 T3 | +243 −878 | +583 −702 | 0 | +22 −27 |
| 3ebc90dc | 11-12 | 고아 `isSubviewEntry` 삭제 | 04 T3 후속 | +0 −3 | +3 −6 | 0 | +1 −2 |
| 9c8faa92 | 11-13 | `FormDialog` 늦은 close가 뒤로 가기를 한 번 더 부르는 문제 | 04 T2·T3 후속(리뷰 지적) | +30 −25 | +29 −4 | 0 | +1 −1 |
| 508a28ae | 11-13 | `BudgetFormDialog` 병합, `FormDialog` `onClose`, `fmtDate` 직접 조립 | 04 T3 후속 + 밖(`fmtDate`) | +59 −43 | +21 −22 | 0 | +2 −2 |
| 9a81ad47 | 11-13 | 날짜+시각 표기도 직접 조립(CLDR 49) | 밖 | +23 −14 | +7 −1 | 0 | 0 |
| 7cf52b11 | 11-13 | CI에서 vitest 실행 | 밖(`.github/workflows`) | 0 | 0 | 0 | +41 −38 |
| 42fc30cd | 11-13 | 배포 결과를 commit status로 받음 | 밖(kista-infra 01 T6) | 0 | 0 | 0 | +10 −162 |
| 1d8858c1 | 11-13 | `useAppForm`·`FormField`·`FormActions` | 04 T4 | +117 −3 | +107 −0 | 0 | +1 −0 |
| e2eb96a6 | 11-13 | `CapitalForm` 하나로 | 04 T5c | +160 −246 | +119 −207 | 0 | +2 −5 |
| c9da8857 | 11-13 | 가계부 폼 `useAppForm`, 카테고리 폼 둘 병합 | 04 T5a | +408 −693 | +367 −213 | 0 | +3 −3 |
| 77249aab | 11-13 | 관리자 개인정보 다이얼로그 쌍 병합, 남은 수동 폼 | 04 T5b | +602 −1,067 | +571 −444 | 0 | 0 |
| 5804575f | 11-13 | ui 도메인 Caddy 스니펫 | 밖(kista-infra 01 T7) | 0 | 0 | 0 | +17 −1 |

주: 07 T1(기준선)은 코드 커밋이 없다. `514002d7`에 PROGRESS 기록이 같이 들어갔다. 04 T1(폼 전수표)은 `eaf98591`(docs)이다. 커밋 시각은 `1d8858c1`~`77249aab`가 10:19~10:29로 10분 안에 몰려 있다(5c는 파일이 겹치지 않아 5a·5b와 병렬이라고 PROGRESS가 적음).

묶음별 합(ts, 위 표에서 합산):

| 묶음 | 커밋 | ts 제품 | 테스트 `*.test.*` | testing·fixtures |
|---|---|---|---|---|
| A (07 T2·3·5) | d93e8570, 514002d7 | +33 −0 | +159 −453 (순 −294) | +166 −1 |
| B (04 T2·3 + 후속 3개) | 60ea8f11, e2ddf7cc, 3ebc90dc, 9c8faa92, 508a28ae | +375 −949 (순 −574) | +721 −734 (순 −13) | 0 |
| C (04 T4·5a·5b·5c) | 1d8858c1, e2eb96a6, c9da8857, 77249aab | +1,287 −2,009 (순 −722) | +1,164 −864 (순 +300) | 0 |

B의 제품 합에는 `508a28ae`의 `fmtDate` 변경(`shared/lib/format/index.ts` 9줄 변경)이 섞여 있다.

## 2. 끝난 태스크 표와 완료 판정 명령 재실행

"지금 코드"는 HEAD `72ef1770`. 명령은 git grep·ls·wc만 썼고 glob은 따옴표를 붙였다. 0건은 다른 패턴으로 한 번 더 확인했다.

### 2-1. 지침서 04 (태스크 14행)

| # | 태스크 | 상태 | 커밋 | 완료 판정 대 지금 코드 |
|---|---|---|---|---|
| 0 | 결정 1 승인 | 완료(결정) | — | 판정 명령 없음 |
| 1 | 폼 전수표 | 완료 | `eaf98591`(docs) | "폼 전부 행이 있음". `findings/m-form-inventory.md` 표 28행(`sed -n 13,47p … grep -c '^| [0-9]'` = 28). 통과. 지침서 원문은 "폼 31개"였고 지금은 "실제 28행"으로 고쳐져 있다 |
| 2 | `FormDialog` | 완료(실기기 확인은 남음) | `60ea8f11`, 후속 `9c8faa92`·`508a28ae` | 판정 "a11y-check, 모바일 스크린샷". 실행하지 않음(미확인). 코드 사실: `shared/ui/FormDialog.tsx` 50줄, 단위 테스트 `shared/ui/FormDialog.test.tsx` 존재, 소비처 18파일(`git grep -l FormDialog -- '*.tsx' ':!*test*'`) |
| 3 | 작은 폼 전환·인터셉트 삭제 | 완료 | `e2ddf7cc`(+`3ebc90dc`·`cc80c297`) | (a) `ls "app/(main)/@modal"` → "No such file or directory": 통과. (b) `git grep -n dismiss -- '*.tsx' ':!*test*' ':!docs'` 0건: 통과(`vitest.setup.ts:10`의 `dismiss: vi.fn()`은 sonner `toast.dismiss`라 무관). (c) `git grep -n "RouteModal\|subviewHistory"`: `RouteModal` 0건, `subviewHistory`는 4곳(`features/strategy/create-strategy/DcaStrategyForm.tsx:10`, `shared/ui/FormDialog.tsx:5`, `shared/lib/subviewHistory.test.ts`, 문서)이라 **원문 판정은 불일치**. 지침서 태스크 행이 "subviewHistory는 남겼다 — 판정 grep에서 뺀다"고 이미 고쳐 두어 의도된 불일치 |
| 4 | `useAppForm`·`FormField` | 완료 | `1d8858c1` | 판정 "단위 테스트(제출·진행·성공·서버 필드 오류 매핑)". `shared/ui/form/useAppForm.test.tsx` 107줄, `it(` 6건(`grep -c`). 서버 필드 오류 매핑은 `serverFieldErrors` 순수 함수 단위 테스트 2건과 `MAP_SERVER_FIELD_ERRORS = false`(`shared/ui/form/useAppForm.ts:11`)로 꺼진 상태. 테스트 실행은 안 함 |
| 5a | 가계부 폼·카테고리 병합 | 완료 | `c9da8857` | `git grep -n submitFormDialog -- ':!docs'` 0건(보조: `git grep -n SaveButton -- '*.ts' '*.tsx'` 0건, `SystemCategoryFormDialog` 0건): 통과. 선행 테스트 2(제출 요청 고정)는 코드 확인만(`mockApi` 쓰는 테스트 19파일). `git grep -n submitFormDialog`(docs 포함)는 `PROGRESS.md`·`findings/*`에서 걸리지만 기록 문서다 |
| 5b | 관리자 개인정보 쌍 병합·수동 폼 | 완료 | `77249aab` | `git grep -nE "useState.*\(''\)" -- 'features/**/*Form*.tsx' 'widgets/**/*Form*.tsx'` → 1건 `features/account/edit-account/EditAccountForm.tsx:49 deleteConfirm`(폼 필드가 아닌 삭제 확인). 판정 "폼 필드 용도로 0건": 통과 |
| 5c | 투자금 추가·인출 | 완료 | `e2eb96a6` | `features/strategy/`에 `inject-capital`·`withdraw-capital` 없음, `adjust-capital/CapitalForm.tsx`·`describe.each` 1개(`CapitalForm.test.tsx:44`). 통과 |
| 5d | 제출 버튼 규칙 통일 | 미착수 | — | `git grep -n canSubmit -- '*.tsx' ':!*test*'` 5곳(`CredentialsCard.tsx:37`, `AssetForm.tsx:94,99,167`, `AccountFormDialog.tsx:121`, `BudgetForm.tsx:93,96,155`)이 남음. 판정 0건과 불일치(착수 전이라 정상) |
| 5e | `AdminSettingsForm` | 미착수 | — | `AdminSettingsForm`은 전환 안 됨(PROGRESS 5b "그대로 둔 것") |
| 5f | 계좌 등록 스테퍼 | 미착수 | — | 미확인(코드 확인 안 함) |
| 5g | 서버 필드 오류 켜기 | 미착수 | — | `MAP_SERVER_FIELD_ERRORS`가 `false`로 남음(위) |
| 6 | 전략 폼 통합 | 미착수 | — | `git grep -nE "\((선택\|필수)\)" -- '*.tsx' ':!*test*'` → `features/strategy/reconfigure-vr/ReconfigureVrSections.tsx:108,138` 2건(지침서 태스크 6이 지우기로 한 그것) |
| 7 | 문서 갱신 | 부분 | `e2ddf7cc`(a), `1d8858c1`(c의 일부) | (a) `docs/agents/app.md` 인터셉트 4문단 삭제: 완료(`git grep -n "인터셉트\|@modal" -- 'docs/agents/*.md'`가 `app.md:40` 한 줄만 반환). (b) `docs/agents/a11y.md` "폼" 항목: `git grep -n "useAppForm\|FormField" -- 'docs/agents/*.md'`가 `shared.md:91`만 반환 → 미착수. (c) `shared.md:91` 프리미티브 설명: 있음 |

04 판정 중 문서 쪽 부수 사실: `docs/agents/app.md:40`은 "가계부 거래내역·카테고리·재무계좌 다이얼로그는 아직 이력 칸 없는 일반 `Dialog`라 모바일 뒤로 가기가 화면을 떠난다(이전 대상)"라고 적는데, `c9da8857`이 이 셋을 `FormDialog` 셸로 옮겼다(`git grep -ln FormDialog -- 'features/finance/*'`에 `AccountFormDialog.tsx`·`BudgetFormDialog.tsx` 등이 나옴). `app.md`를 마지막으로 고친 커밋은 `508a28ae`라 묶음 C 이전이다. 지금은 낡은 문장이다.

### 2-2. 지침서 07 (태스크 9행)

| # | 태스크 | 상태 | 커밋 | 완료 판정 대 지금 코드 |
|---|---|---|---|---|
| 1 | 기준선 | 완료 | 없음(PROGRESS 기록) | `PROGRESS.md:107-145`("07-1 기준선")에 260파일 1,887케이스·커버리지 표 있음. 통과 |
| 2 | `mockApi`·`renderApp`·전역 대역 | 완료(파일럿 1개만 전환) | `d93e8570` | 판정 "자체 테스트(미등록 요청 실패, 타입 검사)": `testing/mockApi.test.ts` 53줄, `testing/mockApi.test.ts:49 it.fails('등록하지 않은 요청이 삼켜져도 테스트 종료 시 실패시킨다'…)`. 통과(실행은 안 함). 사용 범위: `mockApi`를 쓰는 테스트 19파일, `renderApp` 19파일(`git grep -l`). 기준 `vi.mock(` 395문/155파일 → 지금 350문/141파일(`git grep -n "vi\.mock(\|vi\.doMock("`로 기준 ref와 HEAD를 같은 식으로 셈). `vi.mock('next/navigation'` 파일 49 → 37, `vi.mock('sonner'` 39 → 34 |
| 3 | 도메인 빌더 | 완료 | `514002d7` | 판정 `git grep -n "as unknown as" -- '*.test.ts' '*.test.tsx' | wc -l`이 5 이하: **5건, 통과**(기준 29건). 5건은 `assetSort.test.ts:44,46`, `BacktestForm.test.tsx:28`, `strategyFormHelpers.test.ts:8`, `MarketChartCardInner.test.tsx:19`. 참고: 제품 코드에는 05c가 새로 만든 `features/strategy/adjust-capital/CapitalForm.tsx:88`의 `as unknown as z.ZodType<Values, Values>`가 있다(판정 범위 밖) |
| 4 | 재진술·전달 테스트 삭제 | 미착수 | — | 해당 커밋 없음 |
| 5 | 소스 패턴 테스트 → ESLint | 완료 | `d93e8570` | 판정 "금지 import를 고의로 넣었을 때 lint 실패 확인 후 테스트 파일 삭제". `ls shared/lib/query/cacheArchitecture.test.ts shared/lib/metadata.test.ts` 둘 다 "No such file". 규칙은 `eslint.config.mjs:27 restrict()`(`no-restricted-syntax`), `:69 no-restricted-imports`. 고의 위반 lint 실행은 이번에 하지 않음(미확인 — PROGRESS가 11건 위반 검출 확인을 적어 둠) |
| 6 | 화면 통합 테스트 전환 | 미착수 | — | `vi.mock('@(entities|domains)` 0건 목표: `git grep -n "vi.mock('@entities\|vi.mock('@features\|vi.mock('\.\./api\|vi.mock('@tanstack" -- '*.ts' '*.tsx' | wc -l` = 187건. 불일치(미착수) |
| 7 | `useStrategyForm.test.ts` 중복 정리 | 미착수 | — | 해당 커밋 없음 |
| 8 | `it.each` 묶음 | 미착수 | — | 해당 커밋 없음 |
| 9 | 문서(08에 합침) | 미착수 | — | 08 소관 |

### 2-3. 소계

- 끝난 태스크: 04 T1·T2·T3·T4·T5a·T5b·T5c 7개 + 07 T1·T2·T3·T5 4개 = 11개. 부분: 04 T7. 04 T0은 결정이라 제외.
- 완료 판정 명령을 돌려 통과한 것: 04 T1·T3(원문 grep은 `subviewHistory` 때문에 불일치지만 지침서가 의도된 예외로 적음)·T5a·T5b·T5c, 07 T1·T3·T5(파일 삭제 부분). 돌리지 못한 것(실행 필요): 04 T2 a11y-check·모바일 스크린샷, 07 T5의 고의 위반 lint, 04 T4·07 T2 단위 테스트 실행.

## 3. 지침서와 다르게 구현된 곳

출발점은 PROGRESS "지침서와 다른 점"·"지침서와 달랐던 점"과 `questions.md` Q-01~05다. "원문"은 `11600a19`의 지침서(07 `git show 11600a19:…/07-tests.md`, 04는 `eaf98591` 이전 상태를 PROGRESS 인용으로 확인)다. "지금 지침서"는 HEAD의 `guides/04-…md`·`guides/07-…md`를 가리킨다. 지침서 줄 번호는 HEAD 기준이다.

| # | 지침서 문장(절·인용) | 실제 구현 | 이유 | 지금 지침서에 옛 문장이 남았는가 |
|---|---|---|---|---|
| D-01 | 07 §1 "`renderApp`은 … 라우터 대역·`Toaster`를 한 번에 감싼다"와 "`sonner` 대역은 `vitest.setup.ts`" | `vitest.setup.ts:10`에 `toast`는 spy, `Toaster`는 null. `testing/renderApp.tsx` 30줄은 `QueryClientProvider`+`MetaProvider(testMeta)`만 감싼다 | 두 문장이 함께 성립하지 않는다. 실제 `Toaster`를 렌더하는 테스트 0건, 기존 39파일이 `toast.*` 호출을 단언(PROGRESS 07-2 "sonner 결정") | 아니오. `07-tests.md:39`가 "실행 결정, 2026-11-12"로 고쳐 있다 |
| D-02 | 07 태스크 2 대상 `shared/testing/**` | 루트 `testing/`, alias `@testing/*`(`tsconfig.json` +1, `vitest.config.ts` +1) | `renderApp`이 `entities/meta`를 쓰는데 `shared`에서 `entities` import는 금지(`docs/agents/architecture.md` FSD 단방향) | 아니오. `07-tests.md:40` 반영, 태스크 표(`:126`)도 `testing/**` |
| D-03 | 07 §1 "`mockApi` … 약 50줄" | `testing/mockApi.ts` 104줄 + `testing/mockApi.test.ts` 53줄 | 미등록 요청 기록·종료 시 실패, `apiError`, `undefined` → 204, `paths` 타입 검사까지 넣었다(PROGRESS 07-2) | **예**. `07-tests.md:37`에 "약 50줄"이 그대로 있다 |
| D-04 | 04 결정 1 표: 폼 다이얼로그 현재 기준에 "닉네임" | `NicknameEditor`는 다이얼로그가 아니라 인라인 편집으로 남고 `77249aab`에서 `useAppForm`만 입힘 | 전수표 #23이 "지침서는 다이얼로그로 분류했으나 실제는 인라인"(`m-form-inventory.md:41`) | **예**. `04-routes-and-forms.md:59`에 "닉네임" 그대로 |
| D-05 | 04 "`FormDialog` … 열림 상태는 부모의 `useState`다"(`:74`)와 위험 절 "다이얼로그는 이력을 쌓지 않으므로 … 문제면 `FormDialog`가 열릴 때 이력 항목을 하나 쌓는다(약 15줄)"(`:165`) | `FormDialog`가 `open`·`onClose`·children `(close)=>…`를 받고(`shared/ui/FormDialog.tsx:7-13`), 처음부터 `useSubviewHistory`로 이력 한 칸을 쌓는다(`:27`). 회차(`session`) 가드까지 있어 50줄 | 사용자 확정(PROGRESS 04-1 "FormDialog는 처음부터 이력 한 칸을 쌓는다"). 뒤로 가기가 화면을 떠나는 위험을 사전에 막음 | **예**. `:74`·`:165` 둘 다 옛 문장(가정형 문장) |
| D-06 | 04 목표 구조 "`RouteModal`, `subviewHistory`, `@modal` 슬롯, `dismiss` prop, `FormBody` 파일을 지운다"(`:74`) | `subviewHistory`는 남김(`shared/ui/FormDialog.tsx:5`, `DcaStrategyForm.tsx:10`). `RouteModal` 등 나머지는 삭제 | DCA 규칙 편집 하위 뷰와 `FormDialog`가 같은 훅을 씀 | 부분. 태스크 3 행(`:185`)은 고쳐졌고 목표 구조 절·감량 표(`:153` "`RouteModal`·`subviewHistory`·…")는 옛 문장 |
| D-07 | 04 위험 절 "복제 등록 링크 … `/finance/new?duplicateFrom=` … 폼 페이지로 남는 쪽(자산 기록)에만 있다"(`:167`) | 예산도 URL 파라미터 `?duplicateFrom=`·`?categoryId=`로 폼 초기값을 넘기고 있었다(`m-form-inventory.md:31` 행 #13, `NewBudgetFormBody.tsx:19,28,31,41`, `budgetRoutes.ts:23-28`). 다이얼로그 전환에서 행 데이터를 prop으로 넘기고 `newBudgetHref`·`editBudgetHref`를 지움(`e2ddf7cc`) | 전수표 3절이 전제를 깼다 | **예**(`:167`은 전수표 결과 반영 전 문장). "태스크 1에서 전수 확인한다"는 지시는 수행됨 |
| D-08 | 04 §폼 구현 코드 예 `mutation, // 02의 $api.useMutation 결과`(`:95`)와 의존 "선행: 02"(`:232`) | `useAppForm`은 기존 entities mutation hook 결과를 `MutationLike`로 받는다(`shared/ui/form/useAppForm.ts:23-27`). 02보다 먼저 실행됨. 실패 토스트는 `useAppForm`이 띄우지 않고 hook `onError`가 띄움 | 04가 02 선행이라 적었지만 PROGRESS "묶음" 표가 서버·02와 무관한 가장 큰 감량으로 04를 먼저 뽑음. 실패 토스트가 이중으로 뜨는 것을 피함 | **예**. `:95` 주석·`:232` 의존이 그대로. 위험 절의 "api T7 전에는 …"은 현재 상태를 반영 |
| D-09 | 04 §태스크 4 "`FormActions`를 form 객체를 받게 변경"(`:186`) | `FormActions`는 `form?: { isPending }`를 **추가**하고 옛 `isPending`·`canSubmit` prop을 유지(`shared/ui/FormActions.tsx:15-18`). 전략 폼·`DcaRuleEditor`·`ReconfigureVrForm` 4곳은 `form` 없이 `isPending`을 넘김(`git grep -n "<FormActions"`) | 전략 폼은 04-6까지 `useAppForm` 밖에 있어 공존 필요(커밋 `1d8858c1` 본문) | 부분. 지침서 5d가 `canSubmit`→`locked`로 바꾸겠다고 적음. 태스크 4 행은 "변경"이라고만 적음 |
| D-10 | 04 §폼 구현 "모든 폼이 react-hook-form + zod + 아래 두 프리미티브를 쓴다"와 감량표 "`AdminSettingsForm` 등의 필드 조립 `FormField` 전환" | `AdminSettingsForm`·`InviteDialog`·계좌 삭제 타이핑 확인은 전환하지 않음(`77249aab` 본문). `FormField`가 RHF `control`을 요구해 RHF 아닌 폼에 못 씀 | Q-03. 실행 세션이 예외를 정한 것을 Fable이 기준("판정 기준")으로 바꿈 | 아니오. 지금 지침서가 판정 기준·5e·5f를 가짐 |
| D-11 | 04에 제출 버튼·선택 표기 규칙 없음(Q-01·Q-04) | 5a(가계부·자산 기록)는 `canSubmit`로 비활성 유지, 5b(관리자 개인정보)는 항상 활성+제출 시 오류. " (선택)" 꼬리 삭제·필수 `*`. 제출 중 문구 `{label} 중…`으로 전략 등록·수정 버튼도 '등록 중…'·'수정 중…'으로 변경 | 규칙이 없어 실행 세션이 정함 | 아니오. 지금 지침서가 5d·"판단이 갈릴 때의 기본값" 절을 가짐. 단 코드는 아직 두 방식 혼재(`canSubmit` 5곳, 2-1절 5d 행) |
| D-12 | 04 T5c "투자금 추가·인출을 한 컴포넌트로" | `CapitalForm`(`kind`)이 `KIND` 표 하나 + 인출 한도 스키마를 가지며 `features/strategy/adjust-capital/CapitalForm.tsx:88`에 `as unknown as z.ZodType<Values, Values>`를 둔다 | inject·withdraw 스키마 입력 타입이 달라 하나의 `useAppForm` 제네릭에 맞추려 캐스트 | 해당 없음(지침서가 캐스트를 다루지 않음). 07 T3 판정(테스트의 캐스트 5건)과 별개 |
| D-13 | 04 T3 완료 판정의 `dismiss`·`RouteModal` grep(원문) | 통과 방식은 2-1절. 이 외에 지침서가 안 적은 것을 함께 지움: `FinanceHeader` 모달 배경 경로 보정, `SectionTabBar activePathname`, `isSubviewEntry`(`3ebc90dc`), a11y-check "라우트 모달" 점검 | 소비처가 사라진 코드 | 아니오. 지침서 감량표 행("예산 목록의 모달 대응 약 60줄")이 이 일부를 이미 다룸 |

참고(옛 문장이 남은 곳의 요약): 04 `:59`(닉네임), `:74`(열림 상태·`subviewHistory`를 지운다는 문장), `:95`(`$api.useMutation`), `:153`(`subviewHistory`를 지운다고 적은 감량 표 행), `:165`(이력 안 쌓는다는 위험), `:167`(복제 링크 위험), `:232`(선행 02) 7곳. 07은 `:37`(약 50줄) 1곳. 04 `:70` "승인되지 않으면" 문단과 `:5`는 "기록으로만 남긴다"고 적혀 있어 옛 문장으로 세지 않았다.

## 4. 예상 감량 대 실제

### 4-1. 전체 줄 수 (기준 `11600a19` 대 HEAD `72ef1770`)

세는 법은 `e-test-bloat.md` 머리의 계수 규칙과 같다: 줄 = `\n` 개수+1, "제품" = 추적되는 `*.ts(x)`에서 테스트·`__fixtures__`·`docs/.claude/scripts/e2e/tests/public`·`*.d.ts`·설정·`api-types.ts`(`shared/lib/api-types.ts`)를 뺀 것. 스크립트는 scratchpad `count.py`(저장소 밖). 기준 `11600a19`에서 이 방법이 `e-test-bloat.md`의 41,934와 41,933으로 맞았다. PROGRESS "기준선"의 "약 41,400"은 그것과 다르다(41,934가 맞다, PROGRESS 17행의 약 41,400은 미확인 출처).

| | `11600a19` | HEAD | 차이 |
|---|---:|---:|---:|
| ts 제품 줄(파일) | 41,933 (703) | 40,600 (660) | **−1,333 (−43파일)** |
| 테스트 `*.test.ts(x)` 줄(파일), `tests/` 제외 | 30,110 (259) | 30,111 (261) | +1 (+2파일) |
| 〃 `tests/account-cache-fixture.test.ts` 129줄 포함(PROGRESS 기준선과 같은 모집단) | 30,239 (260) | 30,240 (262) | +1 |
| `testing/`·`fixtures.ts`·`__fixtures__` 줄 | 127 | 296 | +169 |
| 테스트 케이스(`git grep -c` 줄 시작 `it(`·`test(`·`.each(`) | 1,834 | 1,849 | +15 |
| vitest 보고(PROGRESS) | 260파일 1,887 | 262파일 1,911(+`it.fails` 1) | +24 |

`git diff --numstat 11600a19..HEAD`로 보면(docs·md 제외): ts 제품 +1,621 −2,878(순 −1,257), `*.test.*` +1,925 −1,926(순 −1), `testing/`·fixtures +166 −1, 비ts(설정·yml·caddy 등) +112 −217. 순 −1,257과 줄 수 차이 −1,333의 차는 삭제된 파일 43개의 `+1`(줄 수 규칙) 약 43과 `scripts`·`e2e`·설정 `.ts`(+33)다.

현재 제품 총 줄 수 40,600(생성 `shared/lib/api-types.ts` 별도), 테스트 총 줄 수 30,111(`tests/` 포함 30,240).

### 4-2. 지침서 04 감량표 대 실제 (끝난 태스크 해당분)

지침서 04 "예상 감량과 위험" 표의 행을 끝난 태스크에 맞췄다. 실제는 `git show --numstat`의 ts 제품(테스트·md 제외)이고 순증감(추가−삭제)이다. 지침서는 테스트를 07로 넘기므로 테스트는 4-3에서 따로 본다.

| 지침서 행 | 예상 감량 | 해당 태스크·커밋 | 실제(ts 제품 순) |
|---|---:|---|---:|
| 폼 라우트 세트 10개(약 50파일) | 약 −620 | T3 `e2ddf7cc` | 삭제 43파일, 추가 1파일. 이 커밋 전체 +243 −878 = **−635** |
| `RouteModal`·`subviewHistory`·`dismiss` 등 약 260줄 → `FormDialog` 약 50줄 | 약 −210 | T2 `60ea8f11` | `FormDialog` +43줄로 추가, HEAD `shared/ui/FormDialog.tsx`는 50줄(후속 `9c8faa92`·`508a28ae`가 회차 가드와 `onClose`를 더함). `subviewHistory`는 남김(61줄 중 3줄만 삭제 `3ebc90dc`) |
| 예산 목록 모달 대응 약 60줄 | 약 −60 | T3 | 위 −635에 포함(분리 안 됨) |
| 위 세 행의 합 | 약 −890 | 묶음 B 5커밋 | **−574**(+375 −949). 예상의 64% |
| 가계부 수동 폼 5개 + `submitFormDialog` 830→520 | 약 −310 | T5a `c9da8857` | +408 −693 = **−285**(카테고리 쌍 병합 포함) |
| 생성·수정·평행 쌍 4묶음 985→600 | 약 −385 | 카테고리 `c9da8857`, 개인정보 둘 `77249aab`, 투자금 `e2eb96a6` | `e2eb96a6` +160 −246 = −86. 나머지는 위 행에 섞임 |
| 그 외 수동 폼 필드 조립 | 약 −200 | T5b `77249aab` | +602 −1,067 = **−465**(관리자 개인정보 쌍 포함) |
| 위 세 행의 합 | 약 −895 | T5a·5b·5c | −285 −465 −86 = **−836**(프리미티브 `1d8858c1` +114 빼고). 예상의 93% |
| 프리미티브 `useAppForm`·`FormField`·`FormActions` 추가 | 지침서 표에 없음 | T4 `1d8858c1` | **+114**(+117 −3) |
| 묶음 B+C 합 | 약 −1,785 | 9커밋 | **−1,296**(−574 −722). 예상의 73% |

미착수 행: 전략 폼(약 −1,100). 04 합계 "약 2,900"의 끝난 부분은 위 −1,785분이다.

### 4-3. 지침서 07 감량표 대 실제 (끝난 태스크 해당분)

지침서 07 표는 출처별 합이다. 끝난 태스크가 건드린 행만 본다. 테스트 줄 = `*.test.*`, 인프라 줄 = `testing/`·`fixtures.ts`·`vitest.setup.ts`.

| 지침서 행 | 예상 | 해당 태스크 | 실제 |
|---|---:|---|---|
| 07-정리: 소스 패턴 테스트 → ESLint(재진술 삭제와 `it.each`와 합쳐 약 −1,100) | 이 항목만의 예상 없음 | T5 `d93e8570` | 테스트 −307(`cacheArchitecture.test.ts` 281 + `metadata.test.ts` 26), `eslint.config.mjs` +28 → **−279** |
| 07-인프라: 모듈 mock·wrapper·인라인 픽스처 → `mockApi`·`renderApp`·빌더(약 −1,200) | −1,200 | T2 `d93e8570`(파일럿 1개), T3 `514002d7` | 테스트 순 +13(파일럿 `AccountDetailContent.test.tsx` +45 −65, `mockApi.test.ts` +53, T3 테스트 +61 −81). 인프라 +197(`mockApi.ts` 104, `renderApp.tsx` 30, `vitest.setup.ts` 32, 빌더 fixtures 31). 합 **+210**. 아직 소비처 전환이 거의 없어 줄지 않았다 |
| 04·05: 생성·수정 쌍 병합 등(약 −2,500, 대부분 전략 폼 규칙 사본 테스트) | −2,500 | 04 T5a·5b·5c가 일부 | 04 묶음 B+C의 `*.test.*` 순 **+287**(B −13, C +300). 선행 테스트(요청 바디 고정)가 폼마다 새로 생겼다 |
| 합계: 30,240 → 약 21,000(−9,300), 케이스 1,816 → 약 1,350 | −9,300 | — | 30,240 → 30,240(0), 케이스 1,834 → 1,849 |

세부 지표(지침서 본문의 측정치 대 지금):

| 지표 | 지침서 07(또는 PROGRESS 기준) | 지금 |
|---|---:|---:|
| `vi.mock(`·`vi.doMock(` 문 | 395(155파일) | 350(141파일) |
| `vi.mock('next/navigation'` 파일 | 49 | 37 |
| `vi.mock('sonner'` 파일 | 39 | 34 |
| 파일별 QueryClient wrapper 정의(`git grep -nE "(createWrapper\|createTestQueryClient\|createClient)…"`) | 21 | 19 |
| 테스트의 `as unknown as` | 29 | 5 |
| 소스 패턴 테스트 파일 | 2(308줄) | 0 |
| ESLint `no-restricted-*` 규칙 | 0건 | `eslint.config.mjs:27,69` |

묶음 C의 테스트가 줄지 않고 늘어난 이유(커밋 본문·PROGRESS): "폼마다 선행 테스트를 `mockApi`로 새로 추가"한 것(`c9da8857` 테스트 +367 −213, `77249aab` +571 −444). 지침서 07 "하지 말아야 할 것"("01~06 실행 전에 6·7을 먼저 하지 않는다")대로 07 T6·7은 건드리지 않았다.

## 5. 실행 중 드러난 틀린 전제 (W-01~W-15)

출처: PROGRESS "묶음 A/B/C 실행 기록", `questions.md` Q-01~05, 커밋 본문(`git log --since=2026-11-11 --format='%h%n%b'`), `findings/m-form-inventory.md`. "grep으로 걸러졌나"는 착수 전에 `git grep`(또는 문서 `grep`) 한 줄로 전제가 틀렸다는 것이 드러났을 것이냐다. 문서 내부 모순·판단 공백은 "아니오"로 적었다.

| # | 지침서·절 | 틀린 내용 | 실제 | 착수 전 grep으로 걸러졌나 |
|---|---|---|---|---|
| W-01 | 07 §1(원문) | `renderApp`이 `Toaster`를 감싸고, 동시에 `sonner` 대역을 `vitest.setup.ts`에 둔다 | 두 문장은 함께 성립하지 않는다. `toast` spy + `Toaster` null을 택함(`vitest.setup.ts:10`) | 아니오(같은 절 두 문장 대조. 실제 `Toaster` 렌더 테스트 0건·`toast.*` 단언 39파일은 grep으로 나옴) |
| W-02 | 07 태스크 2 대상(원문) | `mockApi`·`renderApp`을 `shared/testing/**`에 둔다 | `renderApp`이 `entities/meta`의 `MetaProvider`를 써야 해 `shared→entities` 금지에 걸림. 루트 `testing/` | 예(`git grep -n "MetaProvider" -- 'entities/meta'`로 위치 확인 → FSD 방향 위반이 바로 보임) |
| W-03 | 04 결정 1 표 | 닉네임은 폼 다이얼로그 | 인라인 편집(`m-form-inventory.md:41` 행 #23) | 예(`git grep -n NicknameEditor`가 `SettingsPageContent.tsx:39` 인라인 사용을 보임) |
| W-04 | 04 태스크 1 완료 판정(원문 "폼 31개") | 폼이 31개 | 28행(`m-form-inventory.md:9`). `<form` 19개 + 폼 태그 없는 입력 흐름 9개 | 예(`git grep -c "<form" -- '*.tsx'` + `findings/g` 4절 목록으로 셈이 가능) |
| W-05 | 04 위험 절 "복제 등록 링크" | URL로 폼 초기값을 넘기는 흐름은 자산 기록에만 있다 | 예산도 `?duplicateFrom=`·`?categoryId=`(`NewBudgetFormBody.tsx:19,28,31,41`, `budgetRoutes.ts:23-28`)를 썼다. 다이얼로그 전환에서 prop으로 바꿈(`e2ddf7cc`) | 예(`git grep -n duplicateFrom e2ddf7cc^ -- 'app'`이 `app/(main)/finance/budgets/[type]/new/NewBudgetFormBody.tsx:13,19` 등 예산 라우트를 보여줌) |
| W-06 | 04 목표 구조 `FormDialog` 절, 태스크 3 판정 | `subviewHistory`를 지운다 | DCA 규칙 편집 하위 뷰(`DcaStrategyForm.tsx:10`)와 `FormDialog`(`:5`)가 같이 씀 | 예(`git grep -n subviewHistory -- '*.tsx'`) |
| W-07 | 04 태스크 4·위험 절·의존 "선행: 02" | `useAppForm`이 02의 `$api.useMutation`·전역 실패 토스트를 받는다 | 02는 미착수. `git grep -n 'MutationCache\|\$api' -- '*.ts'`에 02의 산출물 없음. 기존 entities hook의 `onError` 토스트가 이미 `detail`을 띄워 `useAppForm`은 실패 토스트를 띄우지 않음 | 예(`git grep -n "onError" -- 'entities/*/hooks/*.ts'`) |
| W-08 | 04 태스크 3 대상·판정 | `@modal`·`RouteModal`·`dismiss`·`FormBody`를 지우면 정리가 끝난다 | `RouteModal`만 쓰던 `shared/lib/subviewHistory.ts`의 `isSubviewEntry`가 고아가 됨(`e2ddf7cc^:shared/ui/RouteModal.tsx:6,30`이 유일한 제품 소비처). 14분 뒤 `3ebc90dc`로 지움 | 예(삭제 전 `git grep -n isSubviewEntry`가 소비처 1곳을 보여줌). 태스크 3의 완료 판정 grep(`dismiss`·`RouteModal`·`subviewHistory`)에는 이름이 없어 놓침 |
| W-09 | 04 §FormDialog·위험 절 | 닫는 경로는 `history.back()` 하나면 충분 | `onDone`이 뒤로 가기로 닫힌 뒤 늦게 끝나거나, 다시 연 다이얼로그에 이전 회차의 `onDone`이 도착하면 `history.back()`을 한 번 더 불러 화면을 떠남(`9c8faa92` 본문) | 아니오(런타임 타이밍. 리뷰가 지적. grep으로는 안 드러남) |
| W-10 | CHARTER "실행 중 질문"이 가리키는 "판단이 갈릴 때의 기본값" 절(Q-01) | 지침서마다 그 절이 있다 | `guides/*.md` 9개 모두 없었음(Q-01 근거: `grep -n "판단이 갈릴" guides/*.md` 0건). 지금은 04(`:201`)·10(`:354`)·11(`:400`)에 생겼고 나머지에는 없음 | 예(그 한 줄로 확인됨) |
| W-11 | 04 "폼 구현은 한 가지" × 02 3절(`02-data-layer.md:74`) | 필드에 안 붙는 오류는 02의 전역 토스트가 띄운다 | 필드에 붙인 오류를 전역 토스트가 또 띄우지 않게 하는 방법이 어느 쪽에도 없었다(Q-02). 지금은 `MAP_SERVER_FIELD_ERRORS = false`로 껐다 | 아니오(두 문서의 분담 공백. grep으로는 `onError` 위치만 나옴) |
| W-12 | 04 "모든 폼이 react-hook-form + zod", 감량표 `AdminSettingsForm` `FormField` 전환 | 모든 폼에 `FormField`를 쓸 수 있다 | `FormField`는 RHF `control`이 필요. `AdminSettingsForm`(초안 편집기)·`InviteDialog`·계좌 삭제 타이핑 확인은 RHF 대상이 아님(Q-03) | 아니오(폼의 판정 기준이 없어서 생긴 판단 공백) |
| W-13 | 04 §FormField "표기는 여기 한 곳에서 정한다(필수 `*`)" | 선택 필드 표기까지 정해져 있다 | 선택 표기 규칙이 없고 `copy.md`에도 없음(Q-04). 코드에는 " (선택)"·"(필수)" 꼬리와 섹션 제목 "(선택)"이 섞여 있었고 지금도 `ReconfigureVrSections.tsx:108,138` 2건 | 예(`git grep -nE "\((선택\|필수)\)" -- '*.tsx'`와 `git grep -n "선택" -- 'docs/agents/copy.md'`는 필수·선택 표기 규칙이 아닌 무관한 한 줄만 반환) |
| W-14 | 04 태스크 7 | 폼 구현 규칙을 `docs/agents/app.md`에 쓴다 | 소비처가 features·widgets라 `app.md`가 로드되지 않음. 실행 세션은 `shared.md:91`에 썼고, Fable이 규칙 3줄은 `a11y.md`로 정함(Q-05) | 아니오(문서 로드 구조 판단: `CLAUDE.md`의 레이어별 import 표를 읽어야 함) |
| W-15 | 지침서 작성 단계(`findings/g-ux-pattern-variance.md`) | `docs/`의 md 예시 문자열은 앱 빌드에 영향이 없다 | Tailwind v4 자동 소스 탐지가 `docs/`의 md까지 스캔해 `text-[var(--…)]` 예시가 유틸리티로 생성되고 dev 서버가 "Parsing CSS source code failed"로 모든 화면을 못 띄움. 운영 Docker 빌드는 통과(`cc80c297` 본문, PROGRESS "함께 고친 것") | 아니오(`node_modules` Tailwind 소스를 읽거나 dev 서버를 띄워야 드러남. 4절 e2e에서 처음 드러남) |

건수: 15건. "예" 9건(W-02·03·04·05·06·07·08·10·13), "아니오" 6건(W-01·09·11·12·14·15).

분류: 코드 구조·호출처 6건(W-02·03·05·06·08, W-04 폼 수), 지침서 간·내부 모순 또는 공백 6건(W-01·07·10·11·12·13), 문서 위치·로드 구조 1건(W-14), 런타임 타이밍 1건(W-09), 도구 동작 1건(W-15). W-04는 수치 전제라 코드 구조에 넣었다.

범위 밖(전제는 아니고 발견된 것): CLDR 49(Node/ICU)가 `ko-KR` 기본 날짜를 `2026/8/1`로 바꿔 `fmtDate`(`508a28ae`)·`fmtDateTime`·크립토 표기(`9a81ad47`)를 고친 것. CI가 vitest를 안 돌려 못 잡았고(`7cf52b11` 본문) 지침서 04·07과 무관하다.

## 6. 실행 세션이 헤맨 지점

### 6-1. 재작업·후속 커밋과 놓친 것

| 커밋 | 앞선 커밋 | 무엇을 놓쳐서 생겼나(근거) |
|---|---|---|
| `3ebc90dc` (제목만, 본문 없음) | `e2ddf7cc`(20:06) 14분 뒤 20:20 | `RouteModal` 삭제 때 그 파일이 쓰던 `isSubviewEntry` export의 제품 소비처가 0이 된 것을 같은 커밋에서 지우지 않음. 지침서 04 태스크 3의 판정 grep(`dismiss`·`RouteModal`·`subviewHistory`)에 `isSubviewEntry`가 없다. 테스트는 지우지 않고 로컬 한 줄 함수로 옮김(`shared/lib/subviewHistory.test.ts:6`) |
| `9c8faa92` | `60ea8f11`·`e2ddf7cc` | `FormDialog`의 연타(popstate 전 두 번째 close)만 막았고(PROGRESS 04-2 "변이 확인"), 뒤로 가기로 닫힌 뒤 늦게 끝난 mutation의 `onDone`과 다시 연 다이얼로그에 도착한 이전 회차의 `onDone`이 `history.back()`을 한 번 더 부르는 경로를 놓침. 리뷰가 지적. 같은 커밋에 리뷰 지적 4건이 더 들어감: 전략 상세 투자금 버튼을 `Button`으로, 다이얼로그 설명을 문장형으로, `app.md` 가계부 다이얼로그 서술 정정, 빈 줄 제거. 단위 테스트가 6건 → 이 커밋에서 `FormDialog.test.tsx` +29 |
| `508a28ae` | `e2ddf7cc` | `e2ddf7cc`가 `BudgetManager`와 `FinanceBudgetProgress`에서 `FormDialog`+`BudgetForm`과 문구를 각각 조립하게 둠(같은 폼 두 곳 조립). 이 커밋이 `BudgetFormDialog`로 합침. `FormDialog.onOpenChange`가 `true`로 불릴 일이 없는 API였는데 `60ea8f11`에서 그렇게 만들어 `onClose`로 바꿈. 같은 커밋에 `fmtDate` CLDR 수정이 섞여 있음(무관) |
| `9a81ad47` | `508a28ae` 4시간 22분 뒤 | `508a28ae`에서 `fmtDate`만 직접 조립으로 고치고 같은 `ko-KR` 기본 패턴에 기대던 `fmtDateTime`·크립토 지표 표기는 그대로 둠. 같은 원인을 두 커밋으로 고침(커밋 본문). 제품 코드에 `toLocaleDateString`·`toLocaleString`은 지금 13곳(`git grep -n "toLocaleDateString\|toLocaleString" -- '*.ts' '*.tsx' ':!*test*'`) |
| `7cf52b11` | `9a81ad47` | 근본은 CI가 vitest를 안 돌려 CLDR 49 회귀를 못 잡은 것(본문). 지침서 04·07과 무관 |
| `cc80c297` | `e2ddf7cc` 직전(20:05) | `findings/g-ux-pattern-variance.md`의 `text-[var(--…)]` 예시를 Tailwind v4가 스캔. e2e(worktree, 로컬 api)에서 webServer가 모든 화면 실패로 드러남(PROGRESS "함께 고친 것"). 운영 Docker 빌드는 통과 중이었음 |

### 6-2. 리뷰 지적으로 커밋 전에 고친 것 (묶음 C, PROGRESS "묶음 C 실행 기록")

PROGRESS는 "태스크마다 Sonnet 리뷰어로 검수했다. 실제 결함 지적 5건은 커밋 전에 고쳤다"고 적는다. 본문에서 이름이 확인되는 것:

1. `CategoryFormDialog`의 `system` 모드가 그룹 목록을 조회함 → `useCanShareToGroup({ enabled })` 추가(5a).
2. 비활성 제출 버튼으로만 막던 조건(월 마감, 기간 등)이 Enter 제출을 막지 못함 → `onSubmit` 가드(5a, 자산 기록 5b도 같음). Q-01 답이 "묶음 C 리뷰 지적 2건이 이 누락"이라고 적음.
3. 자산 기록의 `categoryId`가 경로로 풀리지 않을 때 제출 잠금(5b).
4. 전략 상세에서 닫히는 중 다른 종류를 열면 폼 상태가 섞임 → `key={kind}`(5c).

(5건 중 위 4항목 + 2번이 가계부·자산 기록 두 곳이라 5건으로 센 것으로 보인다. PROGRESS가 5건의 목록을 따로 적지 않아 이 대응은 미확인.)

묶음 A·B에는 이런 집계가 없다. 묶음 B는 PROGRESS에 "리뷰 지적 함께 반영"이 `9c8faa92` 본문에만 있다.

### 6-3. 지침서에 기준이 없어 사후 질문이 된 것

- 질문 5건(Q-01~05)이 모두 묶음 C 완료 후 한꺼번에 올라옴. 멈춘 태스크는 없고 "정한 것이 맞는지 확인" 형식. 답은 지침서 04 개정 `e9e1000e`로 반영되어 새 태스크 5d~5g가 생김. 5d(제출 버튼 규칙 통일)는 묶음 C 안에서 5a(`canSubmit` 유지)와 5b(항상 활성)가 서로 다르게 정한 결과다. 코드에는 아직 두 방식이 섞여 있음(2-1절 5d 행).
- 기준 없음의 종류: "판단이 갈릴 때의 기본값"(W-10), 서버 오류 분담(W-11), 폼 판정 기준(W-12), 표기(W-13), 문서 위치(W-14).

### 6-4. 같은 영역을 여러 번 손댄 곳

- `widgets/strategy-detail/StrategyDetailContent.tsx`: `e2ddf7cc` → `9c8faa92` → `508a28ae` → `e2eb96a6`로 4회(`git log --since=2026-11-11 -- <파일>`). 마지막은 5c 합치기라 계획대로이고, 앞 3회 중 `9c8faa92`·`508a28ae`가 후속이다.
- `features/finance/manage-budgets/BudgetManager.tsx`: `e2ddf7cc` → `9c8faa92` → `508a28ae` 3회.
- `shared/ui/FormDialog.tsx`: 추가 `60ea8f11` → `9c8faa92` → `508a28ae` 3회(같은 파일의 API가 세 번 바뀜).
- `docs/agents/app.md`: `e2ddf7cc`·`9c8faa92`·`508a28ae` 3회 수정했는데 묶음 C 뒤 가계부 다이얼로그 서술은 갱신되지 않아 지금 낡았다(2-1절 끝).

### 6-5. 검증에서 흔들린 것

- 전체 vitest 실행에서 부하성 timeout(묶음 B 5건, 단독 재실행 24/24 통과). 묶음 A 기준선에도 1~20건(`cacheArchitecture.test.ts` 15초 timeout 등)을 적었다. 묶음 C는 timeout 0건.
- e2e `account-cache` 2건이 묶음 B 실행마다 결과가 달랐다(5초 이동 timeout 등). 묶음 C에서는 통과.
- 실기기 확인(Android·iOS PWA 뒤로 가기, iOS 키보드와 `h-dvh` 시트)은 묶음 B·C 모두 "미검증(실기기 필요)"로 남아 있다.
