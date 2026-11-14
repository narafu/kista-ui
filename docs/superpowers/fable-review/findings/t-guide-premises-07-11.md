# 지침서 07~11 전제·가드 측정 (2026-11-14)

측정만 했다. 지침서·코드 수정, git add/commit/stash 없음. `npm run test:run`·build·e2e·knip은 돌리지 않았다. 검색은 `git grep`(glob 따옴표)과 `wc`·`ls`·`git log`만 썼다. 지침서 07→08→09→10→11 순으로 절을 쓰고 각각 저장했다. 6절(코인·KIS 지형)은 맨 끝.

공통 사실 두 가지:

- 생성 타입 경로는 `shared/lib/api-types.ts`다(`shared/api-types.ts`는 없다: `ls shared/api-types.ts` → No such file). `openapi.json`·`api-types.ts`의 마지막 갱신은 `0af4d34b`(2026-11-11)다. api T1·T2 완료(api `1915ba682`, 2026-11-13)보다 앞이라, ui 쪽 생성 타입은 T1·T2 이전 스펙이다. ui 01 착수 전 `gen:types` 재생성이 필요하다(`git log -3 -- shared/lib/api-types.ts` 출력으로 확인).
- `kistaFetch`는 코드에 0건(`git grep -l kistaFetch -- '*.ts' '*.tsx'` → 0), `shared/api/` 디렉토리 없음, `domains/` 없음. 02·03은 미실행이라 07의 "02 이후"·"03 이동 뒤" 전제는 아직 성립하지 않는다.

---

# 지침서 07 (테스트)

## 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 상태(명령·결과) | 판정 |
|---|---|---|---|
| 현재 구조 | "테스트는 260파일 30,240줄, 케이스 1,816개" | `git ls-files '*.test.ts' '*.test.tsx'` 262파일, `cat \| wc -l` 29,979줄, `it(`/`test(` 줄 1,830 | 수치만 다름 |
| 현재 구조 | "`vi.mock` 395개(155파일, 2,384줄)" | `vi.mock(` 347개, 140파일(`git grep -c`) | 수치만 다름(무대 태스크 2·3·5 후 감소) |
| 현재 구조 | "`next/navigation` 49파일, `@entities/meta` 44파일, `sonner` 39파일, `../api` 26파일, `@tanstack/react-query` 17파일" | next/navigation 36, @entities/meta 40, sonner 33, `'../api'` 리터럴 0(상대경로 mock 전체 47건), react-query 13 | 수치만 다름. `../api`는 정확 문자열 0이라 "미확인"(상대경로 변형 47건은 있음) |
| 현재 구조 | "`QueryClientProvider` wrapper 21개" | `QueryClientProvider`가 든 테스트 파일 23개 | 수치만 다름(renderApp 도입 후에도 감소 안 함) |
| 현재 구조 | "`as unknown as`·`as never`·`as any` 53건" | `as unknown as` 5건, `as never\|as any` 73건 | 수치만 다름 |
| 현재 구조 | "`eslint.config.mjs`에 `no-restricted-*` 규칙은 0건" | `eslint.config.mjs:14,27,69`에 `no-restricted-syntax`·`no-restricted-imports` 있음 | **이미 끝남**(태스크 5 결과. 문장은 낡음, 실행에 영향 없음) |
| 현재 구조 | "`cacheArchitecture.test.ts` 282줄" | `git ls-files "shared/lib/*cacheArchitecture.test.ts"` → 없음. `metadata.test.ts`도 없음 | 이미 끝남(태스크 5) |
| 현재 구조 | 쏠림 상위 5: `useStrategyForm.test.ts` 1,169 / `StrategyDetail.test.tsx` 888 / `HousingBenchmarkComparison.test.tsx` 785 / `StrategyCard.test.tsx` 505 / `CryptoMarketSection.test.tsx` 439 | 1,168 / 887 / 784 / 500 / 438. 경로: `features/strategy/create-strategy/model/`, `widgets/strategy-detail/`, `widgets/benchmark-comparison/`, `widgets/strategy-card/`, `widgets/crypto-market-indicators/` | 수치만 다름(파일 모두 존재) |
| 1절 | `mockApi`·`renderApp`을 루트 `testing/`(`@testing/*`)에 | `ls testing` → `mockApi.test.ts mockApi.ts renderApp.tsx`; `tsconfig.json:31`, `vitest.config.ts:23`에 alias | 일치 |
| 1절 | "`mockApi`는 `paths` 타입으로 키와 응답 모양을 검사" | 사용 파일 19개(`git grep -l "mockApi("`), renderApp 19개. 아직 대다수 테스트는 모듈 mock | 일치(전환은 태스크 6) |
| 1절 | "lint 경계의 테스트 전용 예외로 둔다" | `git grep -n testing -- eslint.config.mjs knip.json` → 0건. FSD 방향·`testing/` 경계를 다루는 lint 규칙이 없다(`eslint.config.mjs:69`의 `no-restricted-imports`는 `next/cache`만) | **대상 없음**(예외를 둘 규칙 자체가 없음. 03이 경계 규칙을 새로 넣을 때 `testing/` 예외를 같이 넣어야 한다는 뜻으로 읽힘) |
| 1절 | `vitest.setup.ts`에 `next/navigation`·`next/link`·`sonner` 전역 대역 | `vitest.setup.ts:9-32` | 일치 |
| 4 | 태스크 4 후보 `entities/user/model/status.test.ts`, `queryKeys.test.ts`, `entities/*/api/index.test.ts` 14파일 | `status.test.ts` 43줄 존재, `queryKeys.test.ts` 3개(account 16·admin 13·finance 24줄), `entities/*/api/index.test.ts` 14개 | 일치 |
| 6 | 완료 판정 `grep -rn "vi.mock('@\(entities\|domains\)" . \| wc -l` 0 | `git grep -n "vi.mock('@\(entities\|domains\)" -- '*.ts' '*.tsx'` 128건. 지침서 명령은 `.`로 `node_modules`·`.next`까지 훑어 값이 부풀 수 있음 | 수치만 다름. 명령은 `git grep`으로 바꾸는 편이 안전(판정 영향 작음) |
| 6 | 대상에 `CryptoMarketSection` | `widgets/crypto-market-indicators/CryptoMarketSection.test.tsx` 존재. `app/(main)/dashboard/page.tsx:13,49`가 사용, `app/api/crypto-market-indicators/route.ts`, `entities/market/api/index.ts:41` | **뜻이 달라짐**(api가 코인 전체 삭제, 지침서 10 D4·api 15 T4. 전환할 대상이 지워질 예정) |
| 3 | 완료 판정 `grep -rn "as unknown as" --include='*.test.*' . \| wc -l`이 5 이하 | 같은 명령 결과 5 (경계값) | 일치(5는 "이하" 경계) |
| 의존 | 태스크 6·7을 01~06 뒤에 | `kistaFetch` 0건, `domains/` 없음, 04 태스크 6(전략 폼 통합)은 미실행 | 일치(아직 착수 불가 상태) |
| 재심 | e2e "17케이스" | `git grep -hE "^[[:space:]]*test\(" -- 'e2e/*.ts'` 15건(`global.setup.ts` 1건 포함 여부 구분: admin 2, auth-guard 4, dashboard 2, global.setup 1, ledger-budget 1, strategy 6 = 16줄 안에 setup 포함) | 수치만 다름 |

태스크 성패를 가르는 것은 1건: 태스크 6의 `CryptoMarketSection`(코인 삭제 결정).

## 2. 이름이 박힌 가드·테스트·설정 (07 태스크가 옮기거나 지우는 것)

| 파일:줄 | 박힌 이름 | 태스크 |
|---|---|---|
| `vitest.config.ts:23`, `tsconfig.json:31` | `@testing` alias → `./testing` | 03 이동 때 유지(지침서 40줄) |
| `eslint.config.mjs:14` 주석 | "docs/agents/shared.md "cache"·"metadata"" | 태스크 5는 끝남 |
| `docs/agents/shared.md:79` | `eslint.config.mjs`(app 소스의 `\| KISTA` 리터럴…)로 강제 | 이미 갱신됨 |
| `widgets/layout/TradeNotificationBridge.test.tsx` | 무효화 키·순서 고정(지침서 149줄 "유지, 02에서 경로 기준으로 다시 쓴다") | 02 |
| `docs/agents/react-query.md:4` | `isError && !data` 설명에 "훅 mock" 이유 | 태스크 6 후 사라짐(지침서 151줄) |
| `app/(main)/dashboard/page.test.tsx:40-41` | `vi.mock('@widgets/crypto-market-indicators')` | 코인 삭제 시 같이 수정 |
| `knip.json` | `testing` 항목 없음(`git grep -n testing -- knip.json` 0건) | 03에서 경로 표가 바뀔 때 knip 진입점 확인 필요(미확인: knip.json 안의 `project`/`entry` 패턴이 `testing/**`를 덮는지는 열어 보지 않음) |

## 3. 중단 조건·확인·결정 문장

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 74 | "대상 로직을 잠깐 깨뜨려 실패하는지 본다" | 있음(변이 확인 자체가 절차) |
| 108 | "서버로 옮겨가는 규칙의 테스트: …같은 규칙의 서버 테스트가 있는지 확인한다…없으면 서버에 먼저 만든다" | 부분적. api cross-repo.md의 "테스트 짝 확인" 표가 T6·T8·T10으로 짝을 줌. 서버가 아직 없으면 UI 테스트를 지우지 않는 것이 기본(지침서가 "없으면 먼저 만든다"고만 적음, ui 세션이 서버를 만들 수 없음) → 없음(ui 쪽 대체 경로 부재) |
| 112 | "기존 케이스 제목 목록을 뽑아…대응이 없는 케이스는 지우는 이유를 적는다" | 있음 |
| 117 | "분기 커버리지가 도메인별로 2%p 넘게 떨어지면 빠진 케이스를 찾는다" | 있음 |
| 119 | "e2e 17케이스는 손대지 않고…(로컬 api 필요, 사용자가 기동)" | 없음(사용자가 api를 기동하지 않으면 e2e 전후 확인 불가, 미룰지 생략할지 미기재. memory `verify_local_api_constraint`: 임의 기동 금지) |
| 128 | "후보 목록을 먼저 만들고 사람이 읽을 수 있는 표로 보고" | 부분(보고 후 승인 대기 여부가 명시되지 않음) |
| 141 | "01~06을 실행하기 전에 이 지침서의 6·7을 먼저 하지 않는다" | 있음 |

PROGRESS "아직 묻지 않은 것"은 07과 무관.

## 4. 서버·infra 선행 조건

| 07 태스크 | 기다리는 것 | 현재 상태 | 계약이 ui 스펙에 있는가 |
|---|---|---|---|
| 4 (재진술·전달 테스트 삭제) | 없음(UI만). 단 "서버로 옮겨간 규칙 테스트"는 api T6·T8·T10 짝 필요 | api T6·T8·T10 미실행(api 10 8절 "실행 전 보정": T5는 root 안에서 끝나는 것만 지금) | `git grep -c -E "blockedActions\|allowedActions\|reasonCode\|fieldErrors"` → 0건 |
| 6·7 | 05(규칙 사본 삭제)와 04 태스크 6 → api T10(검증 엔드포인트, T5·T7도 필요) | T10 미실행. `git grep "/validate"` → 0건 | 없음 |
| 인증·토큰 19파일 케이스 | api U1(AT에 status 클레임) | api 13 U1은 수용 답 있음, 구현 미확인(cross-repo.md E절) | 없음 |

## 5. 다른 지침서와의 충돌

| 대상 | 07 | 다른 지침서 | 비고 |
|---|---|---|---|
| `CryptoMarketSection` 전환 | 6에서 상위 5 중 하나로 전환 | 10 D4 "크립토 지표 조건부"(결정 전 문장 확인은 10절에서), api 15·cross-repo G1: 위젯 `crypto-market-indicators` 제거 | 충돌. 코인 삭제가 먼저면 전환 대신 파일째 삭제 |
| `StrategyCard`·`StrategyDetail`·`HousingBenchmarkComparison` | 6에서 통합 테스트로 전환 | 10 지침서가 주택 벤치마크(D1)·DCA 카드 등을 다룸 | 10절에서 상세 |
| e2e 17케이스 유지 | "손대지 않는다" | 09 B6·10 태스크가 e2e를 바꾸는지는 09·10절에서 | 확인 필요 |
| `domains/*/testing.ts` | 태스크 3은 03 전엔 `entities/*/model/fixtures.ts` | 실제로 `entities/{strategy,order}/model/fixtures.ts` 존재(`git ls-files 'entities/*/model/fixtures.ts'`로 확인 안 함: 지침서 문장 근거만, 미확인) | 03이 이동 시 처리 |
| 08 지침서 | 태스크 9: "테스트 규칙(계층 표)을 한 문서로 → 08 지침서에 합친다" | 08 안에 이 항목이 있는지는 아래 08절 | 확인 후 기재 |

(07 보충: `git ls-files 'entities/*/model/fixtures.ts'`는 출력이 비었다. 지침서 127행·PROGRESS의 "`entities/{strategy,order}/model/fixtures.ts`"는 이 명령으로 확인하지 못했다. 이름이 다를 수 있어 "미확인". 빌더 위치는 `git ls-files '*fixtures*' '*testing*' | head`로 한 번 더 봐야 한다.)

---

# 지침서 08 (문서)

남은 태스크: 1(결정), 5, 6, 7, 8~14. 끝난 것: 2·3·4.

## 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 상태(명령·결과) | 판정 |
|---|---|---|---|
| 지도 | 루트 `CLAUDE.md` + import 3개 "132줄(10.9KB)" | `cat CLAUDE.md docs/agents/{commands,architecture,constraints}.md \| wc -lc` → 132줄 10,966B | 일치 |
| 지도 | `docs/agents/*.md` 16개 580줄 116KB | 16개, `wc -l` 582줄, 114,489B | 수치만 다름 |
| 지도 | 디렉토리 `CLAUDE.md` 22개 | 루트 포함 23개, 루트 제외 22개(`git ls-files '*CLAUDE.md' \| wc -l` 23) | 일치 |
| 지도 | "13개는 `@import`로 자동, 3개(strategy·finance-widgets·deployment)는 수동" | `git grep -n "^@" -- '*CLAUDE.md'`: strategy·finance-widgets·deployment를 import하는 줄 없음 | 일치 |
| 문제 | "자동 로드 13개 494줄 86.9KB, 800바이트 초과 줄 18개" | 13개 496줄 85,535B(`wc`), `awk 'length > 800' docs/agents/*.md`는 16개 전체 29줄(그중 strategy 9, finance-widgets 3 → 자동 로드 쪽 17) | 수치만 다름. **완료 판정 명령이 수동 3개 파일까지 포함**: 태스크 6의 `awk … docs/agents/*.md \| wc -l` 0은 strategy.md의 9줄도 쪼개야 통과(대상 "자동 로드 문서 13개"보다 넓음) |
| 문제 | 어긋난 서술 10건(fmtSignedPct 등) | `git grep -n fmtSignedPct -- . ':!docs/superpowers'` 0건, README "lint 0 errors" 0건 | 이미 끝남(태스크 2) |
| 문제 | "import만 하는 파일 8개, 레이어 CLAUDE.md 5개는 같은 고정 문장 + `@import` 2~4줄" | `app/CLAUDE.md` 6줄(@2), `entities` 7줄(@3), `features` 8줄(@4), `shared` 6줄(@2), `widgets` 8줄(@4) | 일치 |
| 문제 | 가계부 규칙 5층, "`finance.md`·`strategy.md`는 자동 로드 아님인데 일부 디렉토리 CLAUDE.md가 @import" | `entities/finance/CLAUDE.md:3`, `features/asset/CLAUDE.md:3`, `features/finance/CLAUDE.md:3`가 `finance.md` @import. `strategy.md`는 어디에서도 @import 안 됨 | 일치(`finance.md`만) |
| 문제 | 작업 위치별 로드(widgets 239줄/32,062B 등) | widgets 239/32,098, features/finance 231/39,468(지침서 239/44,672), entities/finance 259/42,598(256/42,516), shared 264/32,099(263/31,037) | 수치만 다름(features/finance만 5KB 차이: 지침서가 슬라이스 CLAUDE.md를 포함했을 가능성, 미확인) |
| 목표 | `docs/agents` 16 → 5, `CLAUDE.md` 23 → 약 8 | 현재 16, 23 | 일치(미착수) |
| 도구 | 지울 3개(fsd-boundary-checker 등) | `git grep -n "fsd-boundary-checker\|fsd-scaffold\|dto-sync-check" -- . ':!docs/superpowers/fable-review'` 0건, `.claude/`에 해당 파일 없음 | 이미 끝남(태스크 3). 판정 명령 "참조 0건" 충족 |
| 도구 | `.claude` 나머지 2,015줄 | `.claude/{agents/next-component-boundary,agents/ui-markup-specialist,skills/ui-audit,skills/typecheck-and-report,skills/playwright-cli}` 합 2,587줄(`cat … \| wc -l`). 위 5개를 가리키는 코드·문서 참조는 `.gitignore:35-36`(playwright-cli 출력 폴더)뿐 | 수치만 다름. 지침서가 안 적은 `.claude` 파일: `.claude/hooks/block-env-local.sh`, `.claude/settings.json`(`:4` `Bash(npx react-doctor*)` 허용 규칙) |
| memory | `project_done_do_not_redo.md` "완료 기록 6건" | 지금 4건(바이낸스·업비트·KPI·DCA). 가계부·admin 가드는 2026-11-13 재심으로 이미 폐기됨(파일 끝 문단) | **수치만 다름이지만 태스크 7 의미 변경**: "6건 중 빗썸·KPI만 남기고 지운다"의 대상이 4건. 10 지침서 249행의 "가계부 가드는 08 태스크 7에서 지운다"는 이미 지워짐 |
| memory | `project_ios_pwa_viewport_bugs.md` "Bug A 이력 약 10줄 삭제" | `:12`부터 Bug A 이력 그대로, 파일 26줄 | 일치(미착수) |
| memory | `commands.md`에 "사용자가 기동한 로컬 api" | `docs/agents/commands.md` "사용자가 기동한 로컬 kista-api(:8080…)" | 이미 끝남 |
| memory | `feedback_orchestrate_subagents.md` "FSD 영역별" → 03 뒤 "도메인·화면별" | MEMORY.md 인덱스에 "FSD 영역별 파일 안 겹치게" 그대로 | 일치(03 대기) |
| 태스크 4 | `git ls-files docs/superpowers \| grep -v fable-review \| wc -l` | 0 | 일치 |
| 태스크 8 | `grep -rn "normalize" docs CLAUDE.md` 0건 | `git grep -n -i normalize -- 'docs/*.md' 'CLAUDE.md' '*CLAUDE.md' ':!docs/superpowers/fable-review'` 5건. 지침서 명령은 `grep -r`라 `docs/superpowers/fable-review/**`(지침서 자체)까지 걸린다 | 수치만 다름. 완료 판정 명령은 지침서 자체가 걸려 0이 되지 않음(`--exclude-dir=fable-review` 필요) |
| 선행 확인 3 | `grep -rn "docs/agents/\|CLAUDE.md" --include='*.md' .` | `.`는 `node_modules`·`.worktrees`·`.next`까지 훑음 | 명령 보정 필요 |
| 태스크 11 | "인터셉트 라우트 4문단 삭제, 폼 형태 기준 2줄 추가(04 완료)" | `git grep -n "인터셉트" -- docs/agents '*CLAUDE.md' README.md` 0건. `docs/agents/app.md:40`에 "폼 형태는 다이얼로그 아니면 페이지" 있음(04 태스크 7a, 2026-11-12) | **이미 끝남**(04가 했음) |
| 태스크 12 | "`a11y.md`의 "폼" 항목(04 태스크 7b)을 `ui.md`로 옮긴다" | `git grep -n "폼" -- docs/agents/a11y.md` 0건. 04 지침서 195행: 7b는 미완 | **대상 없음**(옮길 항목이 아직 없다. 04 7b를 먼저 해야 한다) |
| 태스크 10 | api T9가 `kista-api/docs/agents/ui-api-contract.md`로 옮긴다 | `ls /Users/phs/workspace/kista/kista-api/docs/agents/ui-api-contract.md` → No such file | 대상 없음(api T9 미실행, 선행 조건 미충족) |
| 태스크 9 | stale time 표 24행 등 | `docs/agents/shared.md:35` 표에 "crypto market indicators 10분" 행 등 표 존재 | 일치(02 대기). 코인 지표 행은 코인 삭제로 사라질 행 |
| 태스크 5 | 중복 R1~R15의 `file:line`(`findings/h` 136~150행) | 샘플: R5 `shared.md:93,106` → 지금 `:94,:107`; R6 `shared.md:89`·`widgets.md:54` 일치; R2 `entities.md:6-7`·`features.md:5-6`·`widgets.md:5-6` 일치; R3 `copy.md:15` 일치, `entities.md:35-36` → 지금 `:38`; R10 `entities.md:61` → `:64`; R12 `entities.md:54` → `:57`, `strategy.md:14` 일치 | 수치만 다름(줄 밀림 8건 내외). 태스크 성패와 무관 |
| 태스크 6 | "과거 서사 약 51줄" 등 | 미측정(문장 단위 분류가 필요) | 미확인 |
| 문서 배치 | `docs/agents/ui.md`로 `copy·a11y·react-query` 합침 | 파일 없음(3개 그대로) | 일치(미착수) |

태스크 성패를 가르는 어긋남: 3건. ① 태스크 11이 이미 04에서 끝남(두 지침서가 같은 일을 두 번 시킴). ② 태스크 12의 `a11y.md` "폼" 항목이 아직 없음(04 7b 미완). ③ 태스크 10의 정본 파일(`ui-api-contract.md`)이 아직 없음. 보조: 태스크 6 판정 명령이 수동 3개 파일까지 포함, 태스크 7의 "6건"이 4건.

## 2. 이름이 박힌 가드·테스트·설정 (08 태스크가 옮기거나 지우거나 이름을 바꾸는 것)

| 파일:줄 | 박힌 이름 | 영향 태스크 |
|---|---|---|
| `CLAUDE.md:11` 부근 | "docs/agents/…" `@import` 3개(commands·architecture·constraints), "docs/agents/strategy.md·deployment.md·finance-widgets.md 필요시 Read" 목록(`CLAUDE.md:33` 등) | 5·13: 파일 이동 시 루트가 가리키는 경로 갱신 |
| `app/CLAUDE.md:5-6`, `entities/CLAUDE.md:5-7`, `features/CLAUDE.md:5-8`, `shared/CLAUDE.md:5-6`, `widgets/CLAUDE.md:5-8` | `@../docs/agents/{app,entities,features,shared,widgets,copy,a11y,react-query}.md` | 12·13에서 파일 합침·삭제 시 @경로 깨짐. 지침서 68행은 이 파일들을 "본문을 직접 담는다"로 바꾸라고 함 |
| `entities/finance/CLAUDE.md:3`, `features/asset/CLAUDE.md:3`, `features/finance/CLAUDE.md:3`(`@…/finance.md`), `features/asset/save-asset/CLAUDE.md:5`·`features/finance/manage-{accounts,budgets,categories}/CLAUDE.md`·`save-transaction/CLAUDE.md`(`@…/finance-group-share.md`) | finance 문서 경로 | 13 |
| `docs/agents/finance.md:8` | `finance-widgets.md` 포인터 | 13 |
| `docs/agents/shared.md:79` | "강제는 `eslint.config.mjs`" | 이미 갱신 |
| `docs/agents/architecture.md`, `docs/agents/commands.md:3,24` | `doctor` npm 스크립트, react-doctor stub 언급 | 11 태스크 12가 지울 때 같이 수정 필요 |
| `.claude/settings.json:4` | `Bash(npx react-doctor*)` | 11 태스크 12 대상(지침서 11의 목록에 `settings.json`이 있는지는 5절에서) |
| `README.md:96` | PENDING→/pending·REJECTED→/rejected 다이어그램 | D0·D7 결정(반려 화면) 시 영향 |
| memory `MEMORY.md` 인덱스 | 8개 파일 링크 | 태스크 7 완료 판정 "인덱스와 파일 일치" |

## 3. 중단 조건·"확인 후"·"사용자에게 묻는다"

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 5 | "삭제·대량 개편은 사용자 승인 뒤에 실행한다" | 없음(승인 안 났을 때 어느 태스크를 뺄지 미기재). 결정 1은 승인됨 |
| 87 | "태스크 1에서 사용 여부를 사용자에게 묻는다" | 없음. 답이 없으면 `.claude` 나머지 5개는 그대로 둔다가 기본값일 것이나 문장은 없음 |
| 131 | "지우기 전에 줄마다 규칙/이유/서사로 나눠 이유는 남긴다" | 있음 |
| 132 | "`findings/f`의 약 357건 중…유지가 기본" | 있음(기본값 유지) |
| 133 | "삭제 커밋의 해시를 `PROGRESS.md`에 적는다" | 있음 |
| 134 | "2단계의 각 삭제는 대응 코드 지침서의 완료를 조건으로 한다" | 있음(조건 미충족이면 뒤로 미룸) |
| 148 | 태스크 1 "사용자 결정 받기" | 결정 4·5 미답 |
| 170 | 결정 1 승인됨 | — |
| 173 | 결정 4 "쓰고 있는지" | 없음 |
| 174 | 결정 5 "겹치는 4곳을 어느 쪽에 둘지는 사용자가 정한다" | 없음 |
| 179 | "강제 수단이 아직 없는 규칙을 먼저 지우지 않는다" | 있음 |

PROGRESS.md 69행 "아직 묻지 않은 것"과 08 태스크의 관계:

- `.claude` 나머지 도구 사용 여부(결정 4): 08 태스크 표에 이 도구를 지우는 태스크 자체가 없다(지우는 것은 11 T12의 react-doctor뿐). 묻지 않으면 막히는 태스크는 없고, "남은 5개를 그대로 둔다"가 사실상 기본이다.
- 전역 `~/.claude/CLAUDE.md` 중복 4곳(결정 5, `findings/h` R13): 태스크 5(R1~R15 정리)에서 R13 한 묶음이 막힌다. 나머지 R은 진행 가능. 태스크 6은 직접 막히지 않는다. 지침서에 "R13만 뺀다"는 대체 경로가 없다.
- `.prettierrc`·수동 스크립트·배포 workflow 변경 시점은 09 소관(08과 무관).
- `~/.claude/CLAUDE.md`는 16,577B(`wc -c`)로 지침서 "16.6KB"와 일치.

## 4. 서버·infra 선행 조건

| 08 태스크 | 선행 | 상태 |
|---|---|---|
| 10 | 05 + api T9(`ui-api-contract.md`로 이동) | api T9 미실행(파일 없음). 05 미실행 |
| 8·9·11~14 | ui 코드 지침서 01·02·04·06·03·07 | 01 미실행(타입 재생성도 아직: `shared/lib/api-types.ts` 마지막 `0af4d34b` 2026-11-11). 02·03·06 미실행. 04는 부분(태스크 4·5·7a 완료, 6·7b·8 미완) |
| 5·6·7 | 사용자 결정 5(R13) 일부 | 미답 |

문서 내용이 의존하는 api 쪽 사실: `docs/agents/shared.md:35`의 코인 지표 TTL 행은 api 15(코인 삭제)와 같이 사라질 것.

## 5. 다른 지침서와의 충돌

| 대상 | 08 | 다른 지침서 | 판정 |
|---|---|---|---|
| react-doctor | 173행: 지침서 11 태스크 12에서 `react-doctor` 스킬을 지운다 | 11 태스크 12(397행)는 stub·주석 49·`doctor.config.json`·`.react-doctor/`·workflow·`doctor` 스크립트·스킬 삭제. 같은 11의 10-1절(316~321행)은 반대로 "`doctor.config.json`으로 옮기고 devDependency로 고정, stub만 지운다". 09 A6(26행)은 `.react-doctor/false-positives.md`(5줄)를 삭제 | **충돌 3중**: 11 본문 10-1(유지·보강) ↔ 11 태스크 12·E2(삭제), 09 A6(`.react-doctor/`만 삭제). 판정 기준 한 줄: 11 E2·태스크 12가 사용자 결정이므로 우선. `commands.md:3,24`·`.claude/settings.json:4`·`eslint.config.mjs:6-42`·`package.json:11`·`.github/workflows/react-doctor.yml`·`doctor.config.json`·`.react-doctor/`(5줄)·주석 49건(`git grep -n "react-doctor/" -- '*.ts' '*.tsx'` 49)이 지금 실제로 남은 참조 |
| 07 태스크 9 → 08 | 07은 "테스트 규칙 계층 표를 08에 합친다" | 08 태스크 14가 그 일("테스트 규칙(07의 계층 표) 한 절 추가") | 일치(번호 대응: 07-9 = 08-14) |
| 03 태스크 9, 05 태스크 11 → 08 | 03-9(계층별 CLAUDE.md 등)는 08 태스크 13, 05-11은 08 태스크 10 | 08 187행이 "03의 태스크 9, 04의 태스크 7, 07의 태스크 9가 11·13·14로 합쳐진다"고 적는데 05-11→08-10은 적지 않음 | 수치만 다름(안내 누락) |
| 04 태스크 7 | 08 태스크 11이 같은 일 | 04 195행 (a) 완료(2026-11-12) | **이미 끝남**(위 1절) |
| 11 437행 | — | "08 2단계: 태스크 2·3이 끝나면 `app.md`의 쿠키·캐시 서술을 세션 모듈 한 줄로" | 08엔 해당 태스크 번호가 없음(태스크 13 재배치에 흡수 필요) |
| memory | 08 태스크 7이 "완료 기록 6건 중 빗썸·KPI만 남긴다" | 10 지침서 249행: 가계부·admin 가드 폐기는 이미 반영. 코인 삭제(api 15, ui 10 D4) 시 "바이낸스·업비트 DCA 완료·빗썸 금지" 항목도 대상이 사라짐 | 뜻이 달라짐(남길 항목 재판정 필요) |

---

# 지침서 09 (불필요 파일·배포)

남은 태스크: 1(결정), 2(A1~A3·A5~A7), 3(B5·B6), 5, 6, 7, 8. 끝난 것: 4. C1은 완료 표기.

## 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 상태(명령·결과) | 판정 |
|---|---|---|---|
| A1 | "`fmtCompactUsdNarrow`…`git grep -nw` → 정의와 테스트뿐"; 테스트 블록 `index.test.ts:204` | `git grep -nw fmtCompactUsdNarrow -- . ':!docs/superpowers'`: 정의 `shared/lib/format/index.ts:21`, **호출 `index.ts:31`**(`fmtCompactMoneyNarrow`의 USD 분기), 테스트 `index.test.ts:2,210-214`. `fmtCompactMoneyNarrow`는 `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx:6`이 쓴다 | **뜻이 달라짐**: 제품이 쓰는 함수다. 지우면 `fmtCompactMoneyNarrow`가 깨진다(typecheck 실패). 태스크 2의 A1은 그대로 못 한다. 대신 `fmtCompactMoneyNarrow`의 `USDT` 분기(`:31`)는 코인 삭제(api 15)로 죽는다 |
| A2 | `entities/stats/model/types.ts:99-100`의 `CurrentExchangeRate`, `HousingBenchmarkStrategy`, "선언과 테스트 1곳뿐" | `types.ts:99-100` 일치, 사용처는 `entities/stats/hooks/useHousingBenchmarkQuery.test.tsx:7,14,30-36`(타입 단언)뿐 | 일치. 단 주택 벤치마크 자체가 10 D1 삭제 후보(5절) |
| A3 | `reconfigureVrFormSchema` 상수는 테스트만 | `features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.test.ts:2,6-43`만 사용, 제품은 `ReconfigureVrForm.tsx:26`이 `createReconfigureVrFormSchema` | 일치 |
| A4 | `pnlTextClass` barrel 재수출, `pushSubviewEntry`·`SUBVIEW_HISTORY_KEY`, `QUERY_DEFAULT_*` 테스트만 import | `shared/lib/format/index.ts:200`(재수출)·`index.test.ts:81-92`; `subviewHistory.test.ts:4`; `createQueryClient.test.ts:5-6` | 일치 |
| A5 | `entities/finance/index.ts:98-99`의 `isLiability` 재수출 | `entities/finance/index.ts:99` `isLiability,`(98은 `@public` 태그 줄로 추정, 미확인). 외부 사용 `git grep -n isLiability`: `aggregate.ts` 내부와 `widgets/asset-overview/AssetOverviewParts.tsx:28,31`(같은 이름의 **prop**, 함수 아님) | 일치(줄 1 이동). 오탐 주의: `AssetOverviewParts`의 `isLiability`는 prop |
| A6 | `.react-doctor/false-positives.md` 5줄, 참조 0 | `wc -l` 5, `git grep -n false-positives -- . ':!docs/superpowers'` 0건, `git ls-files .react-doctor` 추적 중 | 일치. 단 11 태스크 12가 `.react-doctor/`·`doctor.config.json`을 통째로 삭제하므로 A6은 흡수됨(5절) |
| A7 | `components.json`의 `aliases.hooks: "@/hooks"`, `hooks/` 없음 | `components.json:20` `"hooks": "@/hooks"`, `ls hooks` 없음, `tsconfig.json`에 `@/hooks` 없음(`@/lib/*`는 `:32`) | 일치 |
| B1 | `NEXT_PUBLIC_TRADING_API_BASE_URL` 폴백, "어떤 .env*·Dockerfile·workflow도 선언하지 않는다" | `shared/lib/env.ts:16`에 폴백. 선언: `.env*`·Dockerfile·workflow 0건. 단 `scripts/visual-diff/run.mjs:124`가 설정함 | 일치(visual-diff가 쓰는 사실이 빠져 있음. 02 태스크 8이 키를 지울 때 `run.mjs:124`도 수정 필요) |
| B2 | `package.json`의 `start`, `test` | `package.json:8` `"start": "next start"`, `:12` `"test": "vitest"`; Dockerfile은 `node server.js` | 일치 |
| B3 | `test:coverage`+`@vitest/coverage-v8` | `package.json:14`, `:56` | 일치(유지) |
| B4 | `scripts/visual-diff/sheet.mjs` 78줄, `knip.json` `ignoreFiles` | 78줄, `knip.json` `ignoreFiles: [scripts/visual-diff/sheet.mjs]` | 일치 |
| B5 | `knip.json` `ignoreIssues: components/ui/**` | 일치(`exports`·`types`). `card.tsx`·`pagination.tsx`는 아직 있음(06 미실행) | 일치 |
| B6 | `ignoreDependencies: sharp`, "`scripts/visual-diff`가 sharp를 import" | `scripts/visual-diff/sheet.mjs:8` import, `knip.json` `ignoreDependencies: ["sharp"]`. `package.json`에 sharp 없음 | 일치. 단 **11 341행이 "09 B6에 `axe-core`를 더한다"고 했으나 09에 반영 안 됨**(`git grep -n axe-core -- docs/superpowers/fable-review/guides/09*` 0건). `scripts/a11y-check/run.mjs:12`가 `axe-core/axe.min.js`를 resolve하는데 `package.json`에 `axe-core` 없음(`git grep -n axe -- package.json` 0건, 전이 의존성 추정, 미확인) |
| B7 | `.prettierrc`, "prettier가 의존성에 없다", `constraints.md`가 "`.prettierrc` 기준" | `.prettierrc` 있음(`singleQuote`, `semi:false`, `printWidth:200`), `grep -n prettier package.json` 0건, `docs/agents/constraints.md` "`.prettierrc` 기준" | 일치(사용자 결정 대기) |
| B8 | `public/apple-touch-icon-precomposed.png` 유지 | 미측정(유지 판정이라 영향 없음) | 미확인 |
| C1 | `wait-reconcile.sh`·`.bats`·`stub/gh` 삭제 | `git show --stat 42fc30cd`: 세 파일 삭제 + `server-deploy.yml`의 대기 단계 삭제 | **이미 끝남**(지침서에도 완료 표기) |
| C2 | `deploy/server/required-env`, `contract.bats`의 해당 단언 | `required-env` 없음(`fc4456df`로 삭제), `deploy/server/docker-compose.yml`에 `${API_BASE_URL:?}`·`${TRADING_API_BASE_URL:?}`, bats에 `[ ! -e "$D/required-env" ]`(`.github/tests/contract.bats:8`) | **이미 끝남**(지침서에 완료 표기 없음) |
| C2·태스크 7·태스크 5 | `deploy/server/contract.bats`, `bats deploy/server/contract.bats` | 실제 경로 `.github/tests/contract.bats`(`git ls-files`로 확인, `deploy/server/contract.bats`는 추적 안 됨). `server-deploy.yml`의 `deploy-checks` 잡이 `bats .github/tests`를 이미 돈다 | **이름 바뀜(경로)**. 완료 판정 `bats deploy/server/contract.bats`는 실패한다. 또 태스크 5의 "`ci.yml`: bats 추가"는 bats가 PR 단계(ci.yml)에 없고 push 배포 workflow(`server-deploy.yml`)에만 있다는 점에서는 유효 |
| C3 | `UI_DOMAIN`은 "소비처 없는 흔적값(README:32)" | `deploy/server/README.md:32,35`에 여전히 "사실상 흔적값". 그러나 `5804575f`가 추가한 `deploy/server/caddy/kista-ui.caddy:5`가 `{$UI_DOMAIN}`을 쓴다(값은 caddy 컨테이너의 infra.env에서 옴) | **뜻이 달라짐**: 이 레포 서버 `.env`의 `UI_DOMAIN`은 여전히 소비처 없음(스니펫은 infra.env 값). 그러나 이름 자체는 스니펫이 쓰고 contract.bats(`:25`)도 `'^{\$UI_DOMAIN} {'`를 단언. README가 "더 이상 아무것도 소비하지 않는다"는 문장을 갱신하지 않았다 |
| C4 | "KIS·업비트 전용 UI 코드 약 70줄과 테스트·픽스처 참조 38파일" | `git grep -n -i -l "kis\b\|upbit" -- '*.ts' '*.tsx' ':!shared/lib/api-types.ts' \| wc -l` 48 (패턴이 넓어 "KIS" 단어 오탐 포함 가능) | 수치만 다름(대상 파일 목록은 6절) |
| 구조 문제 1 | 루트 `docker-compose.yml`이 `TRADING_API_BASE_URL`을 주입하지 않는다 | `docker-compose.yml`에 `TRADING_API_BASE_URL: "http://host.docker.internal:8081"` 있음 | **이미 끝남**(태스크 4) |
| 구조 문제 2 | `NEXT_PUBLIC_*` 키 5곳(`.env.production.public`, Dockerfile ARG·ENV 2회, 루트 compose, `server-deploy.yml` build-args, 문서) | `Dockerfile:15-34`(ARG 9+DEPLOYMENT_VERSION, ENV 동수), `docker-compose.yml` build args 9개, `server-deploy.yml` build-args 10줄, `.env.production.public` 9개 | 일치(미착수). 단 지침서가 말한 "`.env.production.public` 9개"와 `.env.example`의 키 구성이 다르다: `.env.example`은 `TRADING_API_BASE_URL`을 포함하고 Firebase 6키(VAPID 포함 7)가 있다 — 11 태스크 13이 같은 묶음 |
| 구조 문제 3 | `server-deploy.yml`에 변경 경로 판정 없음 | `git grep -n "paths-ignore\|workflow_run" -- .github` 0건 | 일치(미착수) |
| 구조 문제 4 | "같은 push에서 typecheck가 `ci.yml`과 `server-deploy.yml`에서 두 번" | `ci.yml`: typecheck·lint·knip·`test:run`·build. `server-deploy.yml`: `verify` 잡이 typecheck·`test:run`. **중복이 typecheck에서 vitest까지 늘었다**(`7cf52b11`이 `ci.yml`에 vitest를 추가) | **수치만 다름이 아니라 범위가 커짐**: 태스크 5의 "중복 typecheck 제거"는 `test:run`도 같이 걸린다 |
| 구조 문제 5 | PR 단계에 shellcheck·bats 없음 | `ci.yml`에 bats 없음, `server-deploy.yml` `deploy-checks`(bats)는 push main에서만 | 일치(shellcheck는 `.github/scripts/`에 스크립트가 없어져(`42fc30cd`) 대상이 사라짐: `git ls-files .github`에 `.sh` 없음) |
| 구조 문제 6 | Caddy 스니펫은 infra 소유, "그쪽 실행 때 파일을 받는다" | `deploy/server/caddy/kista-ui.caddy` 있음(`5804575f`) | **이미 끝남** |
| 태스크 3 | `npm run knip` 0건 | 미실행(지시상 금지) | 미확인 |
| 태스크 2 판정 | `npx vitest run shared/lib/format entities/stats features/strategy/reconfigure-vr` | 세 경로 모두 존재 | 일치 |
| D 표 04 | 사라지는 것: `app/(main)/@modal/**`, `*FormBody.tsx` 9개, `RouteModal`, `subviewHistory.ts`, `dismiss.ts`, `submitFormDialog.ts`, `ModalFormSkeleton` | `@modal` 없음, `*FormBody.tsx` 0, `RouteModal.tsx`·`dismiss.ts`·`submitFormDialog.ts` 없음. **`shared/lib/subviewHistory.ts`는 남음**(`shared/ui/FormDialog.tsx:5`, `features/strategy/create-strategy/DcaStrategyForm.tsx:10`이 `useSubviewHistory` 사용) | 이미 끝남(04 태스크 3), 단 `subviewHistory` 항목은 뜻이 달라짐(04가 유지로 바꿨음). D표는 "참고"라 영향 낮음 |
| D 표 08 | memory 완료 기록 | 08과 같이 일부 진행 | 이미 끝남(일부) |

태스크 성패를 가르는 어긋남: 5건. ① A1이 "참조 0"이 아님(제품이 `fmtCompactMoneyNarrow`로 쓴다) → 태스크 2에서 그대로 지우면 typecheck 실패. ② 태스크 7·C2: `required-env`·bats 단언은 이미 끝났고 판정 명령의 bats 경로가 틀림. ③ 태스크 5: "중복 typecheck 제거"가 vitest까지, bats는 PR 단계 추가만 남음, 배포 workflow 구조(`verify`→`deploy-checks`→`build`→`deploy`)가 지침서 서술 시점과 다르다. ④ C3의 "흔적값" 서술이 5804575f 이후 반쯤 낡음. ⑤ B6의 `axe-core` 추가가 11의 요청대로 반영 안 됨.

## 2. 이름이 박힌 가드·테스트·설정 (09 태스크가 옮기거나 지우는 것)

| 파일:줄 | 박힌 이름 | 태스크 |
|---|---|---|
| `.github/tests/contract.bats:8` | `required-env` 부재 단언 | 이미 반영. C2 이름 정리 때 이 줄은 유지(부재 단언) |
| `.github/tests/contract.bats:5,19-25` | `$D/roles`·`$D/bluegreen`·`$D/docker-compose.yml`·`caddy/kista-ui.caddy`·`{$UI_DOMAIN}` | C3(`UI_DOMAIN` 정리), 태스크 6(compose 수정) 시 영향 |
| `.github/workflows/server-deploy.yml` `verify`·`deploy-checks`·`build`·`deploy` 잡, build-args 10줄 | `NEXT_PUBLIC_*` 이름 | 태스크 5·6 |
| `.github/workflows/ci.yml` | 단계 6개(typecheck·lint·knip·test:run·build) | 태스크 5(중복 제거). `NEXT_PUBLIC_API_BASE_URL: https://placeholder.onrender.com`(build env) |
| `.github/workflows/react-doctor.yml` | react-doctor 액션 | 11 T12가 삭제(09엔 없음) |
| `Dockerfile:15-34` | ARG·ENV 쌍 | 태스크 6 |
| `docker-compose.yml`(루트) | `NEXT_PUBLIC_*` build args 9개, `TRADING_API_BASE_URL` | 태스크 6, 02 T8 |
| `deploy/server/docker-compose.yml:21` | 주석 "SSE(`/api/trades/stream`·`/api/auth/status-stream`)" | 11 T2·T3(status-stream 삭제) 시 주석 수정 |
| `deploy/server/README.md:32,35,45` | `UI_DOMAIN`, "대기하지 않고" 문장 | C3 |
| `knip.json` | `ignoreFiles`·`ignoreDependencies:["sharp"]`·`ignoreIssues:components/ui/**` | 태스크 3, B4 |
| `components.json:20` | `aliases.hooks` | A7 |
| `docs/agents/constraints.md` | "`.prettierrc` 기준" | B7 결정 |
| `docs/agents/deployment.md` | 배포 문서(수동 Read) | 태스크 5~7 전 Read 의무 |
| `scripts/visual-diff/run.mjs:124` | `TRADING_API_BASE_URL`, `NEXT_PUBLIC_TRADING_API_BASE_URL` 설정 | B1, 02 T8 |
| `scripts/a11y-check/run.mjs:12`, `scripts/a11y-check/README.md:9` | `axe-core/axe.min.js`, "계좌 등록 위저드에서 KIS를 골라 2~4단계" | B6(axe-core), KIS 삭제 시 README 문장·시나리오 수정 |
| `entities/stats/hooks/useHousingBenchmarkQuery.test.tsx:7-36` | A2의 두 타입 | A2 |
| `shared/lib/format/index.test.ts:2,210-214` | `fmtCompactUsdNarrow` | A1 |

## 3. 중단 조건·"확인 후"·"사용자에게 묻는다"

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 5 | "삭제의 실제 실행은 사용자 승인 뒤에 한다" | 없음 |
| 35 | B1 "사용자 확인 후 삭제" | 있음(02 태스크 8과 같이 처리) |
| 36 | B2 "`test`는 사용자 습관에 따름" | 있음(`start`만 삭제) |
| 38 | B4 "사용자가 쓰면 유지" | 있음 |
| 39 | B5 "예외를 빼고 knip을 돌려 0건인지" | 있음(0건 아니면 유지) |
| 41 | B7 "사용자 결정" | 없음(결정 전 기본값 없음) |
| 91 | "C 묶음은 반드시 infra 변경과 같은 날 배포한다…`bluegreen`·`roles`는 지우지 않는다" | 있음 |
| 92 | "한 번에 하나씩 바꾸고, 각각 실제 push로 확인한다(사용자 push 필요)" | 없음. push는 사용자 요청 시에만(전역 규칙)이라 사용자가 push를 요청하지 않으면 태스크 5·6·7의 완료 판정이 영원히 대기. 대체 경로 없음 |
| 93 | "`next build` 뒤 번들에 박힌 공개 값을 직접 grep" | 있음 |
| 99, 112-115 | 태스크 1·결정 1~4 | 결정 4 "배포 workflow 변경 시점을 정해 달라" 미답 |
| 103 | 태스크 5 "사용자 push로 확인" | 없음 |
| 105 | 태스크 7 "infra 변경 배포 후…실제 배포 1회 성공" | 있음(infra 쪽 상태는 4절) |
| 108 | "`docs/agents/deployment.md`는 태스크 4~7 전에 반드시 Read" | 있음(규칙) |
| 119-122 | 하지 말 것: `deploy/`·`public/`·`.github/` 참조 0만으로 삭제 금지, C는 infra 뒤 | 있음 |

PROGRESS.md 69행 "아직 묻지 않은 것" 중 09 소관과 막히는 태스크:

- `.prettierrc` 처리(B7 / 결정 1): 태스크 표에 B7을 실행하는 태스크 번호 자체가 없다(태스크 1은 "B1·B2·B4·B7 결정 받기"까지). 결정이 나도 실행할 태스크가 비어 있다.
- 수동 스크립트 사용 여부(B2·B4 / 결정 2): 막는 태스크 없음(결정 후 삭제는 태스크 번호 없음).
- B1(`.env` 확인 / 결정 3): 막는 태스크 없음(02 태스크 8과 묶임).
- 배포 workflow 변경 시점(결정 4): 태스크 5·6·7을 막는다(push 확인이 완료 판정이라 시점을 사용자가 정해야 한다). 태스크 7은 C1·C2가 끝나 남은 것이 C3뿐이므로 사실상 태스크 5·6 문제.
- 08의 결정 4·5(`.claude` 나머지, 전역 CLAUDE.md)는 09와 무관.

## 4. 서버·infra 선행 조건

| 09 태스크 | 선행 | 상태 |
|---|---|---|
| 5 (`paths-ignore`, CI 연결, 중복 typecheck 제거) | infra commit status 회신 | 완료: `server-deploy.yml`의 `deploy` 잡이 dispatch만 하고 끝남(`42fc30cd`), cross-repo.md A1 "infra 완료·api 완료" |
| 6 (`NEXT_PUBLIC_*` 원본 통합) | 11 태스크 13과 한 묶음, 선행 api 없음 | 해당 없음 |
| 7 (C1~C3) | infra reconcile | C1·C2 완료(cross-repo A1·A2 완료). C3: infra `infra.env`의 `UI_DOMAIN`을 caddy가 쓰므로(cross-repo A4·api 쪽 결정 6) 이 레포 서버 `.env` 키 삭제는 infra 쪽 `.env` 렌더링 변경과 맞춰야 함, 상태 미확인 |
| C4(KIS·업비트 UI 코드 삭제) | api 04 단계 A(KIS), api 15 T4(업비트·바이낸스·코인 전체), 05 지침서 태스크 9 | 미실행. 확인 SQL(api 15 10절 단계 P③)·사용자 작업(코인 계좌·전략 삭제) 미통보(api 15 10절: ETH DCA 종료만 통보). cross-repo G1: "ui가 먼저 배포해야 api가 삭제" |
| 02 T8 연계(B1, `TRADING_API_BASE_URL` 삭제) | api 05 배포 전환 단계, 같은 날 배포 | 미실행 |
| 보안 헤더·접근 로그(11 관련) | infra `(site)` 스니펫 먼저, 앱 스니펫이 `import site` | cross-repo F1: infra가 `(site)`를 먼저 배포, 그 전에 ui 스니펫이 import하면 caddy reload 실패. 현재 `kista-ui.caddy`는 `import upstream`만 있음(`:7`), `import site` 없음 — 순서 의존 |

생성 타입에 계약이 이미 있는가: 09 자체는 api 계약에 의존하지 않는다. C4만 api의 `brokers`·`tickers` 메타 변경(G2)이 선행: `git grep -c -E "UPBIT|BINANCE" -- shared/lib/api-types.ts openapi.json` → api-types.ts 4건, openapi.json 1줄(한 줄 파일). 아직 현행 계약이 그대로다.

## 5. 다른 지침서와의 충돌

| 대상 | 09 | 다른 지침서 | 비고 |
|---|---|---|---|
| `.react-doctor/false-positives.md` | A6 삭제(5줄) | 11 태스크 12: `.react-doctor/`·`doctor.config.json`·workflow·`doctor` 스크립트·스킬 통째 삭제. 같은 11의 10-1절은 `doctor.config.json`으로 억제를 옮기고 devDependency 고정 | 삭제 범위 중복(A6는 11 T12에 흡수). 11 내부도 10-1(유지)과 T12(삭제) 충돌. 사용자 결정 E2는 삭제 쪽 |
| `fmtCompactUsdNarrow`·`fmtCompactMoneyNarrow` USDT 분기 | A1 삭제 | 코인 삭제(api 15 G1 "USDT 표기 분기")는 `fmtCompactMoneyNarrow`의 USDT 분기를 지우게 하고, 지우고 나면 `fmtCompactUsdNarrow`가 단일 호출자만 가짐 | A1은 "지금 삭제" 불가. 코인 분기 삭제 후 인라인이 선택지 |
| `HousingBenchmarkStrategy`·`CurrentExchangeRate`(A2) | 지금 삭제 | 10 D1 주택 벤치마크 삭제 결정 여부(10절에서 확인) | A2 뒤에 타입 파일째 사라질 수 있음 |
| `subviewHistory` | D표가 04 소관으로 "사라진다" | 04 태스크 3 결과: 남음. A4는 이 파일의 `pushSubviewEntry`·`SUBVIEW_HISTORY_KEY` export를 떼라 함 | 07 태스크 4·`subviewHistory.test.ts`와 같은 묶음 |
| `isLiability` | A5 | 05(집계 서버 이동)가 `aggregate.ts` 삭제 | A5는 재수출만. 05 전엔 `aggregate.ts` 내부 사용이 남음 |
| `deploy/server/README.md:32`·`.env`의 `UI_DOMAIN` | C3 삭제 | `5804575f`: 스니펫이 `{$UI_DOMAIN}` 사용 + contract.bats 단언 | 충돌: 키 이름은 유지되고 서버 `.env` 쪽만 삭제 대상 |
| `docker-compose.yml`(deploy) 주석의 `/api/auth/status-stream` | 해당 없음(09는 배포 자산 정리) | 11 T2·T3이 `status-stream`을 삭제 | 11이 삭제하면 이 주석을 같이 고쳐야 함. 11의 태스크 목록에 deploy compose가 있는지는 11절 |
| `scripts/a11y-check` KIS 위저드 | 해당 없음 | KIS 삭제(C4) | 스크립트 시나리오가 `/accounts/new`에서 KIS를 고른다(README:9). C4 때 시나리오 갱신 필요(09에 없음) |
| 08 태스크 7(memory)의 "09 `package.json` `doctor` 스크립트" | — | 11 T12가 `doctor` 스크립트 삭제 | 09에는 `doctor` 스크립트 항목이 없음 |

(07 보정: 앞 07절 e2e 줄의 "15건"은 `e2e/`만 센 값이다. `tests/e2e/account-cache-consistency.spec.ts`에 2건이 더 있어 `test(` 줄은 합 17(그중 `e2e/global.setup.ts` 1건은 인증 setup)이다. "17케이스"와 맞는다. 또 07 보충에서 "빌더 위치 미확인"이라 쓴 `entities/{strategy,order}/model/fixtures.ts`는 `ls entities/strategy/model`에서 `fixtures.ts`가 확인된다. order 쪽은 확인 안 함. 같은 줄의 `git ls-files 'entities/*/model/fixtures.ts'`가 비어 보인 것은 glob이 `/`를 건너뛰지 못해서다.)

---

# 지침서 10 (기능 재심)

대상은 "태스크 분해"의 태스크 1~5, 7~15(6은 없음, 11은 완료). 지침서의 결정 목록 D1~D18은 전부 결정이 났다("모두 권장대로" + 사용자 추가 결정).

## 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 상태(명령·결과) | 판정 |
|---|---|---|---|
| 5행 | "권고가 '사용자 답에 따름'이었던 항목과 …D7은 아직 열려 있다…열린 항목은 답이 오기 전에는 실행하지 않는다" | 같은 파일 305·308·309·312·314·317행: D3·D6·D7·D10·D12·D15 모두 "결정(2026-11-13)" | **뜻이 달라짐(문장이 낡음)**: 5행은 열린 항목이 있다고 하지만 표에는 열린 항목이 없다. 실행 세션이 "D7 대기"로 오독할 수 있다 |
| 전체 | "화면 35개: 사용자 27, 관리자 8" | `find app -name page.tsx \| wc -l` 35 | 일치 |
| 전체 | "경로 119개 중" | `grep -c '^    "/api/' shared/lib/api-types.ts` 118 | 수치만 다름 |
| 전체 | "내보내기·가져오기·실행 취소 0건(`csv\|Blob(…\|undo`)" | `git grep -n -E "csv\|Blob\(\|download=\|type=\"file\"\|undo"` 제품 코드 0건 | 일치 |
| T1 | `/strategies`, `widgets/all-strategies/**`, 내비 항목 5개로 | `app/(main)/strategies/{page,loading}.tsx`, `widgets/all-strategies/`(`AllStrategiesList.tsx` 119줄), `proxy.ts:25` `PROTECTED_PREFIXES`에 `/strategies`, `widgets/layout/DesktopSidebar.tsx:17`·`MobileBottomNav.tsx:12`에 `{ href: '/strategies' … }`, `widgets/layout/nav-utils.ts:6-7`의 `/strategies` 분기 | 일치. 지침서 목록에 없는 대상: `widgets/layout/nav-utils.ts`(활성 판정), `e2e/strategy.spec.ts:9,16`(`goto('/strategies')`), `docs/agents/architecture.md`의 `PROTECTED_PREFIXES` 서술, 가이드 11 태스크 1의 경로 표(a11y-check에도 `/strategies`가 빠져 있음) |
| T1 | "`next.config.ts` 영구 리다이렉트 한 줄" | `git grep -n "strategies" -- next.config.ts` 0건(redirects 설정 없음) | 대상 없음이 아니라 신규 추가(맞음) |
| T1 | 완료 판정 `grep -rn "'/strategies'\|\"/strategies\"\|all-strategies" … \| grep -v test`가 리다이렉트 1줄 | `git grep` 동일 패턴 8건(`app/(main)/strategies/page.tsx:7` 등) | 수치만 다름(지금 8건) |
| T1 | "전 계좌 주문 미리보기 프리패치(`getStrategyOrderPreviewsById`)의 다른 소비처가 없으면 삭제" | 호출처는 `app/(main)/strategies/page.tsx:6,31`뿐(`entities/order/api/index.ts:92`, `entities/order/index.ts:14`는 정의·재수출, 테스트 `entities/order/api/index.test.ts:129-176`) | 일치. 단 T12가 "이 구역이 쓴다"고 하나 T12는 05 태스크 3 뒤라 T1이 먼저 지우면 T12에서 되살려야 한다(충돌 5절) |
| T2 | `/admin/pending`, `widgets/admin-user-list/**`, `features/admin/approve-reject/**` | `app/(admin)/admin/pending/{page,loading}.tsx`, `AdminPendingList.tsx`·`AdminPendingPageContent.tsx`·`AdminOverviewContent.tsx:35`(`href="/admin/pending"`) 존재. `widgets/layout/AdminSidebar.tsx:11-17`·`AdminTopBar.tsx:9-15`에 `/admin/pending` 없음(지침서 40행 일치) | 일치. 지침서 대상에 빠진 것: `scripts/a11y-check/run.mjs:33,38`의 `/admin/pending` 경로 표 항목, `scripts/visual-diff` 시나리오(`/admin/pending`) |
| T2 | "api T4 관리자 묶음(`status` 파라미터)" | `shared/lib/api-types.ts:7882-7886` `listUsers`의 query에 `status?: "PENDING"\|"ACTIVE"\|"REJECTED"`, `from`, `to` 이미 있음 | **이미 끝남(api 쪽 일부)**: 상태 필터 파라미터는 현재 계약에 있다. 없는 것은 T4의 페이지형 봉투 |
| T3 | `app/(main)/dashboard/page.tsx`, `widgets/dashboard/**`, "판정은 계좌 목록의 증권사 메타(`market`이 크립토)", "`isCryptoBroker`를 쓴다" | `app/(main)/dashboard/page.tsx:49` `bottomPanels={<CryptoMarketSection />}`, `isCryptoBroker`는 `shared/lib/api-schema.ts`에 있고 사용처 `app/(main)/accounts/[id]/page.tsx:6,40`, `features/account/create-account/steps/AccountInfoStep.tsx:6` | 일치(미착수). **뜻이 달라짐**: api 15(코인 전체 삭제, 사용자 2026-11-14 확정)가 `GET /api/crypto-market-indicators`·`brokers[].market`을 지운다. "크립토 계좌 보유 시에만 그린다"는 대상 위젯이 사라지면 의미가 없다 |
| T4 | `features/strategy/manage-strategy/**`, `widgets/stats-overview/ArchivedStrategies.tsx`, `widgets/strategy-detail/**`, 완료 판정 `grep -rn "보관"` | 파일 존재. "보관" 문구: `features/strategy/manage-strategy/DeleteStrategyDialog.tsx:28,48`, `widgets/stats-overview/ArchivedStrategies.tsx:44,51,60`, `widgets/strategy-detail/CloseStrategyDialog.tsx:28`, `widgets/stats-overview/CyclePerformanceList.tsx:55`(주석 포함) | 일치. 대상 목록에 `CloseStrategyDialog.tsx`가 빠져 있고 `CyclePerformanceList.tsx`는 주석뿐 |
| T5 | `entities/strategy/model/capitalAdjustment.ts`, `features/strategy/{adjust-capital,reconfigure-vr}/**`, `StrategyDetailContent.tsx` | 모두 존재. `features/strategy/reconfigure-vr/ReconfigureVrForm.tsx:28,51-54`에 `InjectSection`·`injectShares`·`withdrawShares` | 일치 |
| B1 | `StrategyDetailContent.tsx:45`의 `if (!account \|\| !strategy) return null` | 같은 줄 45에 일치 | 일치 |
| B2 | `StrategyDetailContent.tsx:66-76`의 버튼 숨김 | 지금 `:66-80` | 수치만 다름 |
| B3 | `app/pending/page.tsx:16` "KIS API 자격증명 입력" | `app/pending/page.tsx:16` 일치 | 일치 |
| B4 | `app/rejected/page.tsx:23-36`, `shared/lib/api-types.ts:4366` `rejectReason` | `app/rejected/page.tsx:23-29`("반려 사유"), `shared/lib/api-types.ts:4366`에 `rejectReason?: string` | 일치 |
| T14 | 완료 판정 `grep -rn "rejectReason\|rejected-reason-card\|반려 사유" … \| grep -v api-types` 0건 | `git grep` 결과: `app/globals.css:517`, `app/rejected/page.tsx:23,24,29` | 일치(미착수). 그 외 `README.md:96`의 `REJECTED→/rejected` 다이어그램, `docs/agents/architecture.md:6,14`는 `/rejected` 라우트 자체는 남으므로 영향 없음 |
| T7 | "05 태스크 5에 합친다. 05의 판정에 '자산 기록 목록에 검색 입력이 있고…'를 더한다" | `05-ui-api-responsibility.md:161` 판정은 `useClientPagination` 0건뿐 | **아직 반영 안 됨**(10 자신이 "더한다"고 한 것). `widgets/finance-record-list/FinanceRecordList.tsx`에 검색(`:179` `type="search"`)은 있고 자산 기록 목록(`AssetRecordList`)에는 없음 |
| T8 | `widgets/{finance-record-list,asset-record-list}/**`, "02 단일 프록시의 `text/csv` 통과 확인" | 두 위젯 존재. 프록시는 `app/api/finance/[[...path]]/route.ts`. csv 통과 여부는 미확인(02 미실행, `createProxyRoute`가 JSON 가정인지 `shared/lib/proxy/createProxyRoute.ts:57` 근처 미열람) | 미확인 |
| T9 | "`grep -rln "ConfirmDeleteDialog\|ConfirmDialog" features/finance widgets/finance-* widgets/asset-*`가 0" | 현재 8파일(`features/finance/manage-{accounts,budgets,categories}/*Manager.tsx`, `SystemCategoryManager.tsx`, `manage-group/GroupManager.tsx`, `save-transaction/CLAUDE.md`, `widgets/asset-record-list/AssetRecordList.tsx`, `widgets/finance-record-list/FinanceRecordList.tsx`). `shared/ui/ConfirmDeleteDialog.tsx`는 있고 `ConfirmDialog`는 없음(06 태스크 4 미실행) | 일치(미착수). 그룹 관리자는 가계부 5종 밖(그룹 삭제)이라 판정이 `0`이 되지 않을 수 있다: `GroupManager.tsx`, 카테고리 `SystemCategoryManager.tsx`의 확인 다이얼로그를 지울지 지침서가 가르지 않았다 |
| T10 | `deploy/server/caddy/kista-ui.caddy`에 `import site` 한 줄(infra 배포 뒤) | `deploy/server/caddy/kista-ui.caddy:7`은 `import upstream /api/health`만. kista-infra `Caddyfile`에는 `(upstream)`만 있고 `(site)` 없음(`git grep -n "(site)" -- Caddyfile` 0건, kista-infra 최근 3커밋은 문서) | 일치(infra 미배포라 선행 미충족) |
| T12 | `widgets/dashboard/**`, `DashboardOverview.tsx:10-45` | `widgets/dashboard/{DashboardContent,DashboardOverview,DashboardMarkets,DashboardEmpty,…}.tsx` 존재 | 일치 |
| T13 | `/admin/trades`에 구역, `widgets/admin-trade-list/**`, `entities/admin/**`, "06 `ConfirmDialog`(타이핑 확인)" | `app/(admin)/admin/trades/page.tsx:42` `AdminTradesWorkbench`, `entities/admin/{api,hooks,model}`. `ConfirmDialog`는 06 태스크 4 후에 생김 | 일치. 단 api의 `/api/admin/scheduler/{open,close}`(`shared/lib/api-types.ts:580,597`)는 지금 본문 없는 202(cross-repo B절 D6 답) |
| T15 | `widgets/layout/**`, "사이드바·하단 탭·모바일 헤더가 같은 항목 배열" | `DesktopSidebar.tsx:17`, `MobileBottomNav.tsx:12`가 항목 배열을 각자 가짐(06 태스크 8 미실행). `MobileHeader.tsx` 존재 | 일치(06 선행) |
| A9 | "`/api/admin/trades/manual-fills`(:560), `scheduler/open`(:580)·`close`(:597), `trade-dates`(:1550), `daily-trades`(:2231)" | `shared/lib/api-types.ts:560,580,597,1550,2231` 줄 번호까지 일치 | 일치(생성 타입이 11-11 이후 재생성 안 돼 그대로) |
| A9 | "ui 호출부는 없다(`entities/trade/api/index.ts:74`)" | `entities/trade/api/index.ts:74` `/api/daily-trades?${q}`(유저 범위). 계좌 범위 `/api/accounts/{accountId}/daily-trades` 호출 0건(`git grep -n "daily-trades"` 제품 코드 2곳: `app/api/daily-trades/route.ts`, `entities/trade/api/index.ts:74`) | 일치 |
| 재심 | "`entities/trade/api/index.ts:77-83` deprecated 필드 폴백" | `entities/trade/api/index.ts:12`("KIS live 응답…정규화")·`:77-83` 부근 `krwCash·totalAssetKrw·evalAmountKrw는 deprecated` 주석 존재 | 일치 |
| 재심 | memory 4건 유지·2건 폐기 | memory `project_done_do_not_redo.md` 현재 4건 + 폐기 문단(11-13). 인덱스(MEMORY.md) 문구 "바이낸스·업비트 DCA(빗썸 연동 안 함)" 유지 | **이미 끝남**(T11) |
| 재심 | "증권사 `MERITZ`가 코드와 운영에 있다(`shared/lib/api-schema.ts:61`)" | `shared/lib/api-schema.ts:63` `MERITZ: 'US_STOCK'` | 수치만 다름 |
| D12/T15 | e2e `dashboard.spec.ts`의 비회원 케이스 | `e2e/dashboard.spec.ts` 2건. 비회원 케이스 존재 여부는 열어 보지 않음 | 미확인 |

태스크 성패를 가르는 어긋남: 5건. ① T3(D4 "크립토 계좌 보유 시에만")는 api 15 코인 삭제와 충돌해 의미를 잃음. ② T2의 api 선행(`status` 필터)은 이미 계약에 있음(선행 약화), 반대로 05 판정 보강 3건(T7 검색, B1, B2, B3)은 아직 반영 안 됨. ③ T10의 선행(infra `(site)`)이 아직 없음. ④ 5행 "열린 항목" 문장이 낡음. ⑤ T9 판정이 그룹·시스템 카테고리 확인 다이얼로그 때문에 0이 되지 않을 수 있음.

## 2. 이름이 박힌 가드·테스트·설정 (10 태스크가 옮기거나 지우는 것)

| 파일:줄 | 박힌 이름 | 태스크 |
|---|---|---|
| `proxy.ts:25` | `PROTECTED_PREFIXES = ['/accounts','/strategies','/stats','/settings','/finance']` | T1(`/strategies` 제거). 같은 목록이 `docs/agents/architecture.md`·`README.md`(R9)에 사본 |
| `proxy.test.ts` | 보호 prefix·리다이렉트 케이스(열어 보지 않음) | T1이 `PROTECTED_PREFIXES`에서 `/strategies`를 빼고 `/strategies`→`/accounts` 리다이렉트를 넣으면 비인증 사용자는 `/accounts`를 거쳐 `/login`으로 가는 2단 이동이 된다(추정, 코드 미실행). `proxy.test.ts`의 `/strategies` 케이스도 같이 고쳐야 한다 |
| `widgets/layout/nav-utils.ts:6-7` | `/strategies` 활성 판정 | T1·T15 |
| `widgets/layout/DesktopSidebar.tsx:17`, `MobileBottomNav.tsx:12` | 내비 항목 | T1·T15, 06 T8 |
| `e2e/strategy.spec.ts:9,12,16,17` | `goto('/strategies')`, `a[href*="/strategies/"]` | T1 |
| `e2e/dashboard.spec.ts`(비회원 2건 중) | 비회원 대시보드 | T15 |
| `scripts/a11y-check/run.mjs:33,38` | `/admin/pending`, 계좌 등록 위저드 KIS(`README.md:9`) | T2, KIS 삭제 |
| `scripts/visual-diff/scenarios.mjs`(48개 경로, `:51` `stubStatusStream`) | `/admin/pending`, `/strategies`, `/pending`, `/rejected` | T1·T2·T14, 11 T4 |
| `app/globals.css:517` | `.rejected-reason-card` | T14 |
| `widgets/admin-user-list/AdminOverviewContent.tsx:35` | `/admin/pending` 링크 | T2 |
| `knip.json` | 해당 없음 | — |
| `docs/agents/finance-widgets.md`, `docs/agents/widgets.md:61` 등 | 슬라이스 이름 `all-strategies`, `strategy-list` | T1(문서 참조는 `git grep -n "all-strategies" -- docs` 미실행: "미확인") |
| `deploy/server/caddy/kista-ui.caddy:7` | `import upstream /api/health` | T10(`import site` 추가) |
| `.github/tests/contract.bats:25` | `import upstream /api/health` 단언(정규식 `^[[:space:]]*import upstream /api/health$`) | T10: `import site …`를 더해도 이 단언은 통과하나, 줄을 바꾸면 깨진다 |

## 3. 중단 조건·"확인 후"·"사용자에게 묻는다"

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 5 | "열린 항목은 답이 오기 전에는 실행하지 않는다" | 없음(그리고 낡음, 1절) |
| 17-19 | "사용 흔적만으로 삭제를 권하지 않는다", "C6(접근 계측)이 먼저다" | 있음(D17 승인으로 해소) |
| 65·184·285 | "신규 구역이므로 승인 전에는 만들지 않는다", "A·C 항목을 승인 없이 실행하지 않는다" | 있음(승인됨) |
| 130 | B4 "급하지 않다" | — |
| 278 | "A3·A4는 사용자 2명 중 누가 보는지 모른다. 사용자 답 없이 지우지 않는다" | 있음(D3 유지, D4 승인) |
| 279 | "A1은 내비 구조를 바꾼다…06 9절(내비 항목 배열 단일화) 뒤에 한다" | 있음(순서) |
| 280 | "C3은…T8 뒤에 한다" | 있음(순서) |
| 281 | "C5는 실계좌 주문을 낸다. 만들면 Opus + `/code-review high`" | 있음 |
| 326 | 공통 완료 판정 "화면 흐름·문구를 바꾸는 태스크는 로컬 api에서 `npm run test:e2e` 1회" | 없음(사용자가 api를 기동하지 않으면 못 돌림. memory: 임의 기동 금지) |
| 330 | T1 "계좌가 여럿인 사용자가…전후 스크린샷으로 확인" | 있음(356행 기본값: 펼쳐 보이게) |
| 334 | T5 "VR 추가·인출이 내는 요청 바디 단언을 전환 전에 고정…`/code-review high`" | 있음(선행 지시) |
| 337 | T8 "로컬 api에서 파일 1회 받아 열어 봄" | 없음(api 기동은 사용자) |
| 346 | T12 "05 태스크 3 뒤면…그 전에 만들지 않는다" | 있음(뒤로 미룸) |
| 347 | T13 "api보다 먼저 만들지 않는다…로컬 api에서 실제 실행은 하지 않는다(실데이터 변경 금지)" | 있음(뒤로 미룸, mockApi로 고정) |
| 357-358 | 기본값: 휴지통 화면 안 만듦, CSV 열 구성은 서버 | 있음 |

PROGRESS.md "아직 묻지 않은 것"(`.claude` 나머지, 전역 CLAUDE.md 중복, `.prettierrc`, 수동 스크립트, 배포 workflow 시점)은 10과 무관. 단 PROGRESS 354행("10이 더하라고 한 3건…아직 반영하지 않았다")은 이 지침서의 선행 정리와 직접 관련된다(5절).

## 4. 서버·infra 선행 조건

| 10 태스크 | 기다리는 것 | 현재 상태 | 생성 타입에 계약이 있는가 |
|---|---|---|---|
| T1·T3·T15 | 서버와 무관(T1은 06 T8 뒤) | — | — |
| T2 | api T4 관리자 묶음(`status` 파라미터), 05 태스크 5 | `status` 파라미터는 이미 있음(`api-types.ts:7882-7886`). T4(페이지형 봉투)는 api 지침서 10 실행 전 | `status` 있음, 봉투 없음 |
| T3 | 05 태스크 1(메타 `brokers[]`), api T5 | api T5는 root 안에서 끝나는 부분만 지금(api 10 8절). `git grep -n userStatuses` 0건 | 없음. 단 api 15가 `brokers[].market`을 지움(cross-repo G2) |
| T4 | api T5(상태 라벨 변경) | 미실행 | 없음 |
| T5 | api가 VR 투자금 조정을 재설정 요청에서 분리(D9) | cross-repo: "지침서 03(전략 축) 실행 때". api 태스크 번호 없음 | 없음 |
| T7·T8·T9 | api T4 가계부 묶음, `text/csv`, `restore`+T8(집계가 복구 반영) | 미실행 | `git grep -c "text/csv\|restore"` 0건 |
| T10 | infra `(site)` 스니펫 배포 | 미배포(위 1절) | — |
| T12 | 05 태스크 3(T6 상태 플래그·`warnings`), api T6 | 미실행(`allowedActions`·`blockedActions`·`reasonCode`·`warnings`는 `git grep` 0건) | 없음 |
| T13 | api 지침서 06 실행(판정표) + `{accepted, reasonCode}` + 감사 로그 | cross-repo D6 답: 지금 202 본문 없음, 06 뒤 | 없음. `/api/admin/scheduler/{open,close}`는 있으나 본문 없음 |
| T14 | api U7(`UserResponse.rejectReason` 등 삭제) | api 13 U7 확정, 실행 전. UI 문구 변경은 지금 가능, 타입에서 `rejectReason`이 사라진 뒤 grep 0건 확인 | `rejectReason` 아직 있음(`api-types.ts:4366`) |
| 전체 | api 코인 삭제(15) | G1: ui가 먼저 배포해야 api가 삭제. 사용자 작업(코인 계좌·전략 삭제) 미통보(ETH DCA 종료만 통보) | 아직 `UPBIT`·`BINANCE`·`crypto-*`가 계약에 있음(`grep -c` 4·3건) |

생성 타입 신선도: `shared/lib/api-types.ts`는 2026-11-11 재생성본이라 api T1·T2(11-13)와 15의 `required`·plain number 변경이 아직 들어오지 않았다.

## 5. 다른 지침서와의 충돌

| 대상 | 10 | 충돌 지침서 | 비고 |
|---|---|---|---|
| 크립토 지표 조건부(D4/T3) | 크립토 계좌 보유 시에만 그린다 | api 15·cross-repo G1: 위젯 `crypto-market-indicators`·`/api/crypto-market-indicators` 삭제(사용자 2026-11-14 확정) | **충돌**. T3은 폐기·"위젯 삭제"로 바뀌어야 한다. 이로 인한 파급은 6절 |
| A4·D4 판정의 "UPBIT는 삭제가 결정돼 1개가 남는다" | BINANCE 1개 남음 전제 | 15는 바이낸스 포함 코인 전체 삭제 | 뜻이 달라짐 |
| 재심 1·2(memory) | "바이낸스 DCA UI 완료, 재제안 금지: 유지", "빗썸 안 함: 유지" | 코인 삭제(15) | 유지 판정의 대상 기능이 사라짐(08 태스크 7이 어떻게 처리할지 미정) |
| T1 vs T12 | T1: `getStrategyOrderPreviewsById` "다른 소비처가 없으면 삭제" | T12: "태스크 1이 지우지 않고 이 구역이 쓴다", T12는 05 태스크 3 뒤 | 순서 충돌: T1은 06 T8 뒤·03 전, T12는 05 T3 뒤. T1만 먼저 가면 함수가 지워졌다 되살아난다. 지침서 346행 "태스크 1과 같은 묶음"과 "05 T3 뒤" 사이에 모순 |
| T14·D7 | UI 카드 삭제 + 서버 삭제 | 04 지침서·06 지침서에 `rejected` 화면 언급은 없음(`git grep -n "rejected" -- guides/0[1-6]*` 확인 안 함) | 충돌 없음(미확인) |
| T2 vs 05 T5 | 관리자 목록 `status` 필터를 서버 파라미터로 | 05 태스크 5 "관리자 묶음"과 같은 배포 | 맞물림 |
| T3·`isCryptoBroker` | 새 코드가 `isCryptoBroker`를 쓴다 | 05 태스크 1이 "증권사 정적 맵 삭제"(`api-schema.ts` 정적 맵), 05 태스크 9가 KIS·업비트 삭제 | 새로 쓰는 코드가 곧 지워질 정적 맵에 기댄다 |
| A8·11 태스크 4(`status-stream`) | A8 "SSE는 11이 다룬다" | 11 태스크 4와 일치 | 일치 |
| B9·D12 비회원 메뉴 | 10 T15 | 11의 "재심한 유지 확정": `/dashboard` 비회원 접근은 D12에 따른다 | 일치(D12가 비회원 대시보드 유지) |
| 02 태스크 2 route 수 | PROGRESS: "10 → 8로 바꾼다" 미반영 | `02-data-layer.md:156`에 여전히 "10 이하", 11 3절은 "8개 이하가 된다" | **아직 반영 안 됨**. 또 지금 route.ts 총 22개(`find app -name route.ts`)로 "프록시 13개"가 아니라 전체 합이다. 지침서 판정식 `find app/api -name route.ts \| wc -l`의 구성: `git grep -l createProxyRoute -- 'app/api/*'`가 route.ts 13개(+테스트 2) → 프록시 13개를 1개로 합치면 22-13+1=10(02의 "10 이하"). 비프록시 9개는 `auth/{logout,me,reapply-done,refresh,status-stream}`·`fcm/tokens`·`fcm/tokens/[token]`·`health`·`trades/stream`. 11 태스크 6이 fcm 2개를 프록시로 넣으면 8, 11 태스크 4가 `status-stream`을 지우면 7이 된다. 즉 "8"은 11 T6만 반영한 값이고 T4까지 가면 7이다 |
| 02 태스크 6 판정 "삭제된 리소스 URL을 열면 안내 화면" | 10이 더하라고 함 | `02-data-layer.md:162` 판정은 `grep initialAccount` 0건뿐 | **아직 반영 안 됨** |
| 05 4절 "지원하는 동작은 항상 보이고 못 하면 비활성+사유"(B2) | 10이 더하라고 함 | `05-ui-api-responsibility.md:56`은 `blockedActions`를 읽는다고만 적고 규칙 문장 없음 | **아직 반영 안 됨** |
| 05 태스크 9 판정에 `grep -rn "KIS" app/pending`(B3) | 10이 더하라고 함 | `05-ui-api-responsibility.md:165` 판정은 `'KIS'\|'UPBIT'` 따옴표만 | **아직 반영 안 됨**. 지금 `app/pending/page.tsx:16`은 이 grep에 걸리지 않는다 |
| 05 태스크 3 판정(B2) | 10 B2 | `05-...md:159` 판정에 B2 없음 | 위와 같음 |
| `dcaFormat.ts:73-93`을 05에서 뺀다 | PROGRESS 373행: "05에서 대상이 아니다" | `05-ui-api-responsibility.md:22,77`에 여전히 "`dcaFormat.ts:73-93`를 지운다" | **아직 반영 안 됨**. 지금 그 줄 근처(`dcaFormat.ts:76-92`)는 서버 `rules[].nextExecution`에서 가장 이른 것을 고르는 `earliestNextExecution`·`latestLastExecution`이고 `DcaStrategyCard.tsx:40`이 쓴다. 지침서대로 지우면 DCA 카드의 다음 실행일 표시가 사라진다(D10 "이미 구현돼 있다"와 충돌) |
| 09 B6 `axe-core` | 10이 변경하는 완료 판정으로 언급 | `09-unused-files-and-deploy.md` B6에 `axe-core` 없음(앞 09절) | 아직 반영 안 됨 |
| 07 태스크 6 | `CryptoMarketSection` 통합 테스트 전환 | 10 T3/D4 + 15 | 앞 07절 |
| 11 태스크 12 vs 11 10-1 | — | 11 내부 충돌(08절 5절) | — |

---

# 지침서 11 (미덮임 영역)

대상은 태스크 1~13. 지침서 본문은 10-1절(react-doctor)이 "목표: 억제를 `doctor.config.json`으로 옮긴다"를 적고 끝에서 "사용자 결정: 걷어낸다"로 뒤집는 구조다. 태스크 표(12)와 결정 표(E2)가 최종이다.

## 1. 전제 대조표

| 절·태스크 | 지침서 문장 | 지금 상태(명령·결과) | 판정 |
|---|---|---|---|
| T1 | "`scripts/` 1,230줄", a11y-check 307줄, visual-diff "코드 6파일 709줄" | `find scripts -type f \| xargs wc -l` 1,350줄, `scripts/a11y-check/run.mjs` 307줄, `scripts/visual-diff/*.mjs` 최상위 594줄(+`fixtures/`) | 수치만 다름 |
| T1 | "dev 토큰 발급 4곳(`a11y-check/run.mjs:66`, `visual-diff/run.mjs:144`, `shared/seed.mjs:32`, `e2e/global.setup.ts:34-41`)" | `scripts/shared/seed.mjs:32`, `scripts/visual-diff/run.mjs:203`, `scripts/a11y-check/run.mjs:264`, `e2e/global.setup.ts:34,36`(+`:35` e2e 전용 토큰) | 수치만 다름(줄 번호) |
| T1 | 완료 판정 `grep -rn "dev-token\|dev-admin-token" scripts e2e \| wc -l`이 1곳 | 같은 명령 7줄: 코드 5곳 외에 `scripts/a11y-check/README.md:30`, `scripts/visual-diff/README.md:40` 문장 | **뜻이 달라짐**: README 두 줄이 걸려 코드를 한 곳으로 합쳐도 1이 되지 않는다(`--include='*.mjs' --include='*.ts'`로 줄여야 함) |
| T1 | 앱 화면 35개, a11y-check 28·visual-diff 48 | `find app -name page.tsx \| wc -l` 35 ✓. visual-diff `scenarios.mjs` 경로 줄 48 ✓. a11y-check 28은 `run.mjs:33,38`의 배열 줄을 세지 못해 미확인 | 일치/미확인 |
| T1 | "e2e가 두 디렉토리(`e2e/`, `tests/e2e/`)" | `ls tests`: `account-cache-fixture.test.ts`, `e2e/`. `playwright.config.ts:21-30` 두 프로젝트(`account-cache`, `e2e`), `vitest.config.ts:14` exclude에 `'e2e/**'`·`'tests/e2e/**'` | 일치. 대상 목록에 빠진 것: `tests/account-cache-fixture.test.ts`(vitest 단위 테스트, `./e2e/support/account-cache-fixture`를 상대 import: `tests/account-cache-fixture.test.ts` 첫 줄 근처), `vitest.config.ts:14`, `eslint.config.mjs:17`의 `tests` 비런타임 패턴 |
| T2 | `proxy.ts:15-21` 쿠키 옵션, `:93-94` 삭제, `:155` PENDING 미캐시, `:183-210` 상태→경로 표 | `proxy.ts:15-21` ✓(`cacheCookieOptions`), `:93-94` ✓, `:155` ✓(`needsCacheUpdate && status !== 'PENDING'`), `:183`에 `routeByStatusAndRole` 시작 | 일치. `proxy.ts` 214줄 ✓ |
| T2 | `refresh.ts:45` 문자열 조립, `refresh/route.ts:29`, `refresh.ts:4`의 `tryRefresh` | `shared/lib/auth/refresh.ts:45` `Max-Age=604800` ✓, `app/api/auth/refresh/route.ts:29` 문자열 ✓, `refresh.ts:4`에 "proxy.ts(tryRefresh)" 주석 ✓ | 일치 |
| T2 | `x-forwarded-proto` 판정 4곳 | `git grep -n "x-forwarded-proto" -- '*.ts' ':!*.test.*'` 5줄 | 수치만 다름 |
| T2 | 완료 판정 `grep -rnE "Max-Age\|maxAge" … app shared proxy.ts \| grep -v test`가 세션 모듈 1파일 | 현재 9줄(비테스트) | 일치(미착수) |
| T2 | "역할 캐시 쿠키는 태스크 2에서 먼저 지운다 — `role` 클레임은 이미 있다" | AT의 `role` 클레임은 ACTIVE 사용자에는 있다(api `JwtIssuerService.java:41`). 그러나 api 13 U1이 "PENDING 사용자의 토큰에는 `role` 클레임이 없어진다"(cross-repo.md E절, api 13 14절 "배포") | **뜻이 달라짐**: 태스크 2 이후 `landingPath`가 PENDING의 role을 읽으면 안 된다. 현재 `proxy.ts:44`의 `TOKEN_STALE_ROLE` 분기도 PENDING 토큰에는 role이 없을 때를 가정하지 않는다 |
| T3 | `STATUS_COOKIE`·`ROLE_COOKIE` 삭제, `app/api/auth/{me,reapply-done}` | `shared/lib/auth/cookies.ts:2-3` 정의, `proxy.ts:5-6,41-42,93-94,157-158`, `app/auth/callback/route.ts:4,71-76`. `app/api/auth/{me,reapply-done}/route.ts` 존재 | 일치 |
| T3 | 완료 판정 `grep -rn "STATUS_COOKIE\|ROLE_COOKIE" . \| grep -v test` 0건 | `.`는 `node_modules`·`.next`까지 훑는다 | 명령 보정 필요(`git grep`) |
| T4 | `app/pending/**`, `app/api/auth/status-stream` | `app/pending/PendingStatusWatcher.tsx:10`(`EventSource('/api/auth/status-stream')`), `app/api/auth/status-stream/route.ts`(36줄) ✓ | 일치 |
| T4 | 완료 판정 `grep -rn "status-stream" . \| grep -v docs` 0건 | `git grep -n "status-stream"` 제품 외 잔존: `shared/lib/api-types.ts:1352`·`openapi.json`(생성물), `deploy/server/docker-compose.yml:21`(주석), `scripts/visual-diff/scenarios.mjs:51`(`stubStatusStream`)·`scripts/visual-diff/README.md:67`, `docs/agents/app.md:29`(docs는 제외됨) | **뜻이 달라짐**: 생성 타입·openapi는 api가 엔드포인트를 지운 뒤 `gen:types`로만 사라지고(api 답 U2: ui가 구독을 지운 "뒤에" api가 삭제), 지침서는 이 판정을 ui 단계에서 요구한다. 순환: ui 완료 판정이 api 삭제 뒤에만 0이 된다. `:!shared/lib/api-types.ts :!openapi.json`을 빼야 한다. 또 deploy compose 주석·visual-diff 시나리오가 삭제 대상 목록에 없다 |
| T5 | `TradeNotificationProvider.tsx:50-53` 5초 고정 재시도, `visibilitychange`·`online` grep 0건, `TradeNotificationProvider.test.tsx` 121줄 | `entities/trade/providers/TradeNotificationProvider.tsx:50-53` `RECONNECT_DELAY_MS` 재시도 ✓, `git grep -n "visibilitychange"` 0건 ✓, 테스트 121줄 ✓, `app/pending/PendingStatusWatcher.test.tsx` 62줄 ✓ | 일치 |
| T5 | "02 태스크 5c 뒤" | `02-data-layer.md:161` 태스크 5c(`TradeNotificationBridge.tsx` 포함)가 있다 | 일치(02 미실행) |
| T6 | `FcmAutoRegister.tsx:19-20`, `useFcmToken.ts:42-53`, `NotificationSettings.tsx:73` 등록 경로 3, `firebase.ts:4-11`/`firebase-messaging-sw.js/route.ts:2-9`, `FcmBridge.tsx:14` | 모두 실제 위치 ±1줄(`firebase.ts:5-10`, sw route `:3-8`, `FcmBridge.tsx:14` `<FcmForegroundListener enabled />`). `entities/fcm/api/index.ts:5`에 VAPID 키 `process.env` 추가 직접 접근 | 수치만 다름. Firebase 설정은 "6키 두 번" 외에 VAPID 한 곳이 더 있다 |
| T6 | 완료 판정 `grep -rn "Notification.permission" … \| grep -v test`가 1파일 | 비테스트 5줄, 파일 4개(`useFcmToken.ts:15,33`, `FcmAutoRegister.tsx:17`, `FcmForegroundListener.tsx:20`, `NotificationSettings.tsx:63`) | 일치(미착수, "4곳" 일치) |
| T6 | "FCM Route Handler 2개는 02 태스크 2의 단일 프록시로" | `app/api/fcm/tokens/route.ts`, `app/api/fcm/tokens/[token]/route.ts` ✓ | 일치 |
| T7 | `app/global-error.tsx` 74줄, 인라인 스타일 11곳, `ErrorDisplay.tsx:26-32`, `error.tsx` 3개 같은 16줄, `instrumentation.ts` 없음 | `wc -l` 74·16·16·16 ✓, `grep -c "style=" app/global-error.tsx` 5줄(속성 수는 미확인), `ErrorDisplay.tsx:26-32` 문구 ✓, `ls instrumentation.ts` 없음 ✓ | 일치(스타일 수는 줄 기준 5라 미확인) |
| T7 | "서버 쪽 `console.error` 8곳" | `git grep -n "console.error" -- 'app/*' …` 비테스트 5곳(app/ 한정) | 수치만 다름(범위 차이 가능, 미확인) |
| T8 | `use-amount-hidden.ts` 87줄(12파일), `RevealableValue.tsx` 31줄(4파일) | 87줄 ✓ 31줄 ✓, 사용 파일 `use-amount-hidden` 12 ✓, `RevealableValue` 6 | 수치만 다름(4 → 6) |
| T8 | 선행 "06 태스크 7(포매터)" | 06 태스크 7 존재, 미실행 | 일치 |
| T9 | `date-range.ts:5`, `benchmarkPeriods.ts:1,28-41`, `StatsOverview.tsx:18,28-34`, `pad` 복제 2곳, `DAYS_OPTIONS` 2곳 | `date-range.ts:5` ✓, `benchmarkPeriods.ts:1,28` ✓, `StatsOverview.tsx:18` ✓, `WeeklyMarketCalendar.tsx:22`·`useDailyTradesRangeQuery.ts:25` `pad` ✓, `DAYS_OPTIONS`: `CryptoIndicatorCards.tsx:21`, `FearGreedSection.tsx:9` ✓ | 일치 |
| T9 | 완료 판정 `grep -rnE "RANGE_DAYS\|BENCHMARK_PERIODS\|DAYS_OPTIONS" …` 0건, `kstDateMinusDays\|subtractMonths\|rangeToFrom` 0건 | `app/(main)/stats/page.tsx:16`의 `DEFAULT_RANGE_DAYS`(부분문자열 `RANGE_DAYS`에 걸림), `stats/page.tsx:8,22`의 `kstDateMinusDays`, `shared/lib/date-range.ts:26,46,56`, `benchmarkPeriods.ts:4,28`, `useBenchmarkFilters.ts:7-9` | **대상 목록에 없는 파일**: `app/(main)/stats/page.tsx`(T9 대상에 `app/` 없음). 이 파일을 안 고치면 판정이 0이 되지 않는다 |
| T9 | "api T4·T5 뒤" `range` 프리셋 + 메타 프리셋 | `shared/lib/api-types.ts:6577` `range?: number;`(PRIVACY 정수 하나뿐), 프리셋 코드 필드 0건(`git grep -c "rangePresets\|periodPresets"` 0) | 일치(선행 미충족) |
| T10 | recharts 차트 12개, `CartesianGrid` 10곳, `ResponsiveContainer` 12곳, `accessibilityLayer` 6개 | `git grep -l "from 'recharts'"` 12파일 ✓(`shared/ui/EquityLineChart.tsx`·`widgets/{admin-privacy-trade-list,asset-composition,asset-trend,benchmark-comparison×3,crypto-market-indicators,fear-greed-card×2,finance-trend,housing-quintile-trend}`), `strokeDasharray="3 3"` 13, `ResponsiveContainer width` 13, `accessibilityLayer` 6파일 | 수치만 다름(10→13, 12→13) |
| T10 | `shared/lib/chart/axisTick.ts` 2줄, `tooltip.ts` 9줄 | ✓ | 일치 |
| T10 | "차트 10파일 전환, 완료 판정 recharts import 파일 2 이하(3패널·게이지)" | 12파일 중 3패널(`PrivacyBaseChartInner`)·게이지(`FearGreedGauge`) 외에 코인 위젯의 `IndicatorLineChart.tsx`가 코인 삭제로 사라진다. 그래서 틀 전환 대상은 최종 10파일 중 `IndicatorLineChart`를 뺀 9파일 | **뜻이 달라짐**(api 15): 대상 수 10 → 9 |
| T11 | `app/globals.css` 588줄, CSS 변수 157개, 임의값 `-[var(--` 282건, Pretendard jsdelivr `@import`(`:1`) | `wc -l` 588 ✓, `git grep -nE "\-\[var\(--" -- '*.ts' '*.tsx'` 220건, `globals.css:1` jsdelivr ✓. 변수 157개는 세는 방법이 갈려 미확인(`grep -c "^  --"` 233줄은 다른 기준) | 수치만 다름(282 → 220, 폼 리팩토링 등으로 감소) |
| T11 | `app/globals.css`에 `@source` | `app/globals.css:6` `@source not "../docs";`(Tailwind가 docs md를 스캔하지 않게 한 `cc80c297`) | 지침서에 없는 새 사실: T11이 `globals.css`를 고칠 때 이 줄을 지우면 dev CSS 파싱이 깨진다 |
| T11 | `eslint.config.mjs`에 임의값 금지 규칙 추가 | `eslint.config.mjs`는 07 태스크 5 이후 `no-restricted-syntax`를 `restrict(...)` 헬퍼(`:27`)로 병합 관리 | 일치. 지침서가 모르는 제약: `eslint.config.mjs:14` 주석("no-restricted-syntax는 config 객체끼리 병합되지 않고…")처럼 새 selector는 기존 `restrict(...)` 안에 같이 넣어야 한다 |
| T12 | stub 플러그인 `eslint.config.mjs:6-14`, `reportUnusedDisableDirectives: 'off'`, 억제 주석 49줄, `doctor.config.json`·`.react-doctor/`·workflow·`doctor` 스크립트·스킬 | stub 설명 `eslint.config.mjs:6-42`(등록 `:41`), `reportUnusedDisableDirectives: 'off'` `:44`, `git grep -c "react-doctor/" -- '*.ts' '*.tsx'` 49 ✓, `doctor.config.json`·`.react-doctor/false-positives.md`(5줄)·`.github/workflows/react-doctor.yml`·`package.json:11`·`.claude/skills/react-doctor/SKILL.md` 존재 ✓ | 일치 |
| T12 | 완료 판정 `git grep -n "react-doctor" -- ':!docs/superpowers'` 0건 | 위 목록 외 잔존: `.claude/settings.json:4`(`Bash(npx react-doctor*)`), `docs/agents/commands.md:3,24`(대상 포함), `docs/agents/finance-widgets.md:8`(대상 포함) | **대상 목록에 없는 파일**: `.claude/settings.json:4` 때문에 판정이 0이 되지 않는다(08은 `.claude` 정리를 별도 사용자 결정으로 둠) |
| T12 | "접근성·hooks·Next 규칙은 ESLint(jsx-a11y strict, react-hooks, next)가 이미 본다" | `eslint.config.mjs`의 jsx-a11y·react-hooks 설정은 열어 보지 않음 | 미확인(영향 작음) |
| T13 | `process.env` 직접 접근 15줄, `.env.example`에 `API_BASE_URL`·`DEPLOYMENT_VERSION`·`E2E_*`·`KISTA_DEV_SEED` 누락 | `git grep -n process.env`(shared/lib/env.ts·테스트·scripts·e2e·config 제외) 14줄: `app/(auth)/login/page.tsx:33`, `app/firebase-messaging-sw.js/route.ts:3-8`, `entities/fcm/api/index.ts:5`, `shared/lib/firebase.ts:5-10`. `.env.example`에 네 키 모두 없음 ✓ | 수치만 다름 |
| 10-3 | `next.config.ts` 12줄, `headers()` 없음, Caddy에 `header` 지시문 0건 | `git grep -n "header" -- deploy/server/caddy next.config.ts` 미실행(전 단계 확인: `kista-ui.caddy` 10줄에 header 없음 ✓) | 일치 |
| 11 설명 | `app/(main)/layout.tsx`(87줄)·`proxy.test.ts` 267줄 11케이스 | 미측정 | 미확인 |
| 문서 연결 | "`deploy/server/README.md:41`, `.github/workflows/server-deploy.yml:115`" | `deploy/server/README.md:41`, `.github/workflows/server-deploy.yml:115` 모두 `2026-10-02-deploy-reconcile-design.md` 링크 ✓ | 일치 |
| 사용자 결정 | E1~E5 승인 | 일치 | — |

태스크 성패를 가르는 어긋남: 6건. ① T1 판정 명령이 README 두 줄 때문에 1이 되지 않음. ② T4 판정(`status-stream` 0건)이 생성 타입·openapi(api가 나중에 지움) 때문에 순환 + deploy compose 주석·visual-diff 시나리오가 대상에서 빠짐. ③ T9 대상에 `app/(main)/stats/page.tsx` 누락(판정 0 불가). ④ T12 판정이 `.claude/settings.json:4` 때문에 0이 되지 않음. ⑤ T2의 "role 클레임 이미 있다"가 api U1 이후 PENDING에는 맞지 않음. ⑥ T10·T9의 코인 위젯 대상이 api 15로 사라짐(T10 대상 10 → 9, T9 대상에서 `crypto-market-indicators`·`fear-greed`의 `crypto` 분기 제외).

## 2. 이름이 박힌 가드·테스트·설정 (11 태스크가 옮기거나 지우는 것)

| 파일:줄 | 박힌 이름 | 태스크 |
|---|---|---|
| `vitest.config.ts:14` | exclude `'e2e/**'`, `'tests/e2e/**'` | T1(디렉토리 통합) |
| `playwright.config.ts:19-30` | 프로젝트 `setup`(`testMatch: 'e2e/global.setup.ts'`), `account-cache`(`tests/e2e/account-cache-consistency.spec.ts`), `e2e`(`testIgnore: 'tests/e2e/**/*.spec.ts'`) | T1 |
| `tests/account-cache-fixture.test.ts` | `./e2e/support/account-cache-fixture` 상대 import | T1(이동 시 경로 갱신) |
| `eslint.config.mjs:17` | `nonRuntimeFiles`에 `tests` 디렉토리 패턴 | T1·T11 |
| `e2e/global.setup.ts:34-36` | 토큰 3종(`dev-token`·`dev-e2e-token`·`dev-admin-token`)과 저장 파일명 | T1 |
| `scripts/shared/seed.mjs:32`, `scripts/a11y-check/run.mjs:264`, `scripts/visual-diff/run.mjs:203` | `devToken` | T1 |
| `scripts/a11y-check/README.md:9`, `scripts/a11y-check/run.mjs:33,38` | 계좌 등록 위저드 KIS, `/admin/pending`, 화면 경로 표 | T1, KIS·`/admin/pending` 삭제 |
| `scripts/visual-diff/scenarios.mjs:51` | `stubStatusStream` | T4 |
| `scripts/visual-diff/README.md:66-67` | `kista-user-status`·`kista-user-role` 쿠키, `pending`의 상태 SSE 스텁 | T2·T3·T4 |
| `scripts/visual-diff/fixtures/{api,trading}.mjs`, `run.mjs:124`, `scenarios.mjs`, `README.md` | crypto·upbit·binance 문자열(`git grep -i -l` 5파일) | 코인 삭제 |
| `package.json:17,18` | `visual-diff`·`a11y-check` 스크립트 | T1(유지) |
| `package.json:11` | `doctor` | T12 |
| `docs/agents/commands.md:18-19` | `visual-diff`·`a11y-check` 사용법 | T1 후 갱신 |
| `docs/agents/app.md:29` | "SSE 인증…`app/api/auth/status-stream`" | T4(08 2단계) |
| `docs/agents/commands.md:3,24`, `docs/agents/finance-widgets.md:8` | react-doctor 언급 | T12 |
| `deploy/server/docker-compose.yml:21` | `/api/auth/status-stream` 주석 | T4 |
| `app/globals.css:1` | jsdelivr Pretendard `@import` | T11 |
| `app/globals.css:6` | `@source not "../docs";` | T11이 유지해야 함 |
| `entities/trade/providers/TradeNotificationProvider.tsx`, `widgets/layout/TradeNotificationBridge.tsx` | 체결 SSE 구독·무효화 표 | T5 |
| `vitest.setup.ts` `MockEventSource` | SSE 테스트 대역 | T5 |
| `docs/agents/shared.md`(체결 SSE 무효화 순서) | 문서 | T5 |
| `eslint-disable-next-line react-doctor/*` 49건 | 12건이 recharts 줄 | T10(차트 재배치)과 T12가 같은 줄을 만짐 |

## 3. 중단 조건·"확인 후"·"사용자에게 묻는다"

| 줄 | 인용 | 대체 경로 |
|---|---|---|
| 95 | "(가)와 (나)를 다른 커밋으로 나누고, (나)는 api 배포 뒤에 한다" | 있음(T3은 api 선행) |
| 103-109 | 선행 테스트 1~4 "케이스를 지우지 않는다", e2e `auth-guard.spec.ts` 전후 통과, "실제 로그인·토큰 갱신·로그아웃 1회씩 수동 확인" | 없음(수동 확인은 사용자 로컬 api 필요. 불가 시 항목을 뺄지 미룰지 미기재) |
| 127 | T5 선행 테스트 2케이스 먼저 추가 | 있음 |
| 154 | "서비스 워커 등록은 실브라우저에서만 확인된다…실기기 1회" | 없음(실기기 불가 시 대체 없음) |
| 169 | "실행 전 Next 16.2의 해당 API를 `node_modules/next` 소스나 context7로 확인한다" | 있음(조사 지시) |
| 191 | "사용자 결정이 필요한 것: 금액 숨김 범위" | 있음(E1 승인) |
| 321 | "설정 파일로 표현되지 않는 규칙이 남으면 실행 세션이 react-doctor 문서를 확인해 정한다(`questions.md` 대상)" | 낡음(E2로 걷어냄) |
| 322 | "사용자 결정(2026-11-13): 걷어낸다" | — |
| 330·334 | 10-3 "(확인 필요)", infra "순서가 있다: infra가 `(site)`를 먼저 배포한 뒤에 import를 넣는다. 반대면 caddy reload가 실패해 reconcile이 롤백한다" | 부분(순서만, infra 미배포 시 태스크를 뺀다는 문장은 없으나 10 T10 "infra 배포 뒤"가 대신함) |
| 380 | "1·2·3절은 실브라우저와 실제 로그인이 있어야 확인된다. 로컬 api는 사용자가 기동한 세션에서만 쓴다" | 없음 |
| 404 | "토큰을 합칠지 애매하면 합치지 않는다" | 있음 |
| 407-414 | 하지 말 것 7항 | 있음 |
| 막힘 | T3 "api가 클레임과 옛 토큰 거절을 배포한 뒤" | 있음(뒤로 미룸), api 쪽 상태는 4절 |
| 막힘 | T5·T6 "02 태스크 5c·2 뒤" | 있음(순서) |
| 막힘 | T8 "사용자 결정(범위)·06 태스크 7" | 있음 |
| 막힘 | T9 "api T4·T5 뒤" | 있음(뒤로 미룸) |

PROGRESS "아직 묻지 않은 것"과의 관계: 11 태스크 12가 `.claude/skills/react-doctor/`를 지우는데 08의 결정 4(".claude 나머지")는 react-doctor를 제외한 5개만 묻는다(08 173행). 그러나 `.claude/settings.json:4`의 react-doctor 허용 규칙은 어느 지침서의 대상 목록에도 없다.

## 4. 서버·infra 선행 조건

| 11 태스크 | 선행 | 현재 상태 | 계약이 타입에 이미 있는가 |
|---|---|---|---|
| T2 | 없음(역할 쿠키 삭제는 api 선행 없음) | 단 api 13 U1이 PENDING 토큰의 `role`을 없앨 예정(cross-repo E절) | — |
| T3 | api 13 U1: AT에 `status` 클레임, 상태 변경 시 옛 AT 거절(`TOKEN_STALE_ROLE`) | cross-repo B절 "api 답": 수용, 실행 전. 2026-11-13 이후 api 비문서 커밋에 U1 없음(`git log --since=2026-11-12`로 확인: matching·notify·platform·openapi·privacy 커밋뿐) | JWT 클레임은 OpenAPI에 나오지 않아 `git grep`으로 확인 불가(미확인) |
| T4 | ui가 구독을 지운 뒤 api가 `status-stream` 삭제(U2) | 순서상 ui 먼저. 생성 타입에 `/api/auth/status-stream` 존재(`api-types.ts:1352`) | 있음(삭제 전) |
| T5 | 없음 | — | — |
| T6 | 없음 | 실기기 확인 필요 | — |
| T7 | 없음(서버 엔드포인트 `/api/client-errors`는 존재: `api-types.ts:383`) | — | 있음 |
| T9 | api T4·T5: `range` 프리셋 코드·메타 프리셋(U6 수용 답) | 미실행. `range`는 PRIVACY 정수 한 곳(`api-types.ts:6577`), 프리셋 코드 필드 없음 | 없음 |
| T10·T11 | 없음 | — | — |
| T12 | 없음 | — | — |
| 10-3 보안 헤더(ui 쪽 한 줄) | infra 지침서 04 T9의 `(site)` 스니펫 먼저 | kista-infra `Caddyfile`에 `(site)` 없음(`(upstream)`만). ui 쪽 `kista-ui.caddy:7`은 `import upstream`만 | — |
| E4/T3과 api 13 U8(오류 409) | cross-repo E절: "ui가 400에 기대는 분기가 있는지 확인" | ui 확인 결과: 제품 코드에 `status === 400` 분기 0건(`git grep -n "400" -- '*.ts' '*.tsx'` 비테스트: 주석 6줄뿐, `status === 404`는 `widgets/strategy-detail/orderBannerCopy.ts:61`, 401은 `shared/lib/api-client/index.ts:95,102`, 409·502 0건). 이 회신이 cross-repo.md에 적혔는지는 미확인 | — |
| E5 접근 로그(10 T10) | infra 04 T9 | 미배포 | — |

생성 타입 신선도(2026-11-11 재생성)가 api T1·T2(11-13) 이전이다. 11 태스크들은 타입 재생성에 직접 의존하지 않으나, T3·T9의 계약 확인 전에 `gen:types`가 필요하다.

## 5. 다른 지침서와의 충돌

| 대상 | 11 | 충돌 지침서 | 비고 |
|---|---|---|---|
| react-doctor | T12·E2: 전부 삭제 | 11 10-1절 본문(316-321행): `doctor.config.json`으로 억제 이동 + devDependency 고정 + stub만 삭제. 09 A6: `.react-doctor/false-positives.md`만 삭제. 08 173행: `.claude` 스킬 삭제를 11 T12로 넘김 | 11 내부 모순(본문 10-1 목표 vs 태스크 12·결정). 09 A6는 T12에 흡수. `.claude/settings.json:4`는 누구도 소유하지 않음 |
| `status-stream` | T4: UI 삭제, deploy compose·visual-diff 미기재 | 10 A8 "유지, 구조는 11"(일치), 09 `deploy/server/docker-compose.yml:21` 주석 | 주석은 09 대상 파일이 아님(09 태스크 5·6의 대상 `docker-compose.yml`은 루트). 소유 지침서 없음 |
| `DAYS_OPTIONS`·기간 | T9: `fear-greed-card/FearGreedSection.tsx:9`, `crypto-market-indicators/CryptoIndicatorCards.tsx:21` | api 15 G3: fear-greed 응답에서 `crypto` 필드 삭제(CNN만), G1: 코인 위젯 삭제 | T9 대상 중 `crypto-market-indicators`는 대상이 사라지고, `fear-greed-card`의 Crypto/CNN 토글(`dcaFormat.ts:44`의 `'Crypto'` 라벨 분기 포함)이 바뀐다. T9 판정 `DAYS_OPTIONS` 0건은 코인 위젯이 지워지면 `FearGreedSection.tsx:9` 하나로 줄어듦 |
| 차트(T10) | recharts 10파일 전환 | 07 태스크 6 `CryptoMarketSection` 통합 테스트 전환, 10 T3 | 코인 위젯 삭제 후 `IndicatorLineChart` 대상에서 제외(위 1절) |
| 02 태스크 2의 route 수 | 11 3절: "10 이하가 8개 이하가 된다"(FCM 2개 합류) | 02 `:156`에 "10 이하" 그대로(PROGRESS가 미반영이라고 적음) | 아직 반영 안 됨. 11 T4(status-stream 삭제)까지 가면 7(앞 10절 5절 참조) |
| 03 태스크 7(alias) | 11 10절 "검토함, 유지: `tsconfig.json`의 alias 8개와 `vitest.config.ts`의 alias 8개가 같은 목록" | 03 태스크 7이 alias를 3개로 바꿈 | `tsconfig.json:26-33` 8개(`@testing/*` 포함), `vitest.config.ts:18-25` 8개로 같은 목록이다(일치). 03 이동 때 `@testing`을 포함한 두 곳을 같이 고쳐야 한다(07 지침서 40행) |
| 06 태스크 6·8 | T11 "06 태스크 6과 같은 묶음", T9 "06 태스크 8" | 06 태스크 표 번호는 맞음 | 일치 |
| 09 태스크 6 | T13 "09 태스크 6과 같은 묶음" | 09 태스크 6 본문은 T13을 모름(09 쪽 문장 없음) | 한쪽만 알고 있음 |
| 10 D12·T15 | `/dashboard` 비회원 접근 | 11 "재심한 유지 확정: D12에 따른다" | 일치 |
| 05 태스크 10 | `features/auth/reapply/**`(`localStorage` 쿨다운 삭제) | 11 T2·T3은 `features/auth/logout/**`만 건드림 | 겹침 없음. 단 `RejectedReapplyButton`·`ReapplyButton`이 `reapply()`(→ `/api/auth/reapply-done`)를 부르고 11 T3이 이 Route Handler를 순수 프록시로 바꿈 — 05 T10·11 T3·02 T2 세 지침서가 같은 경로를 만진다 |
| 08 2단계 | 11 437행 "태스크 2·3이 끝나면 `app.md`의 쿠키·캐시 서술을 세션 모듈 한 줄로" | 08 태스크 번호에 대응 항목 없음 | 08 태스크 13에 흡수 필요 |
| e2e 17케이스 | 07 "손대지 않는다" | 11 T1이 e2e 디렉토리·`global.setup.ts` 토큰 발급 코드를 바꿈(`playwright.config.ts` 포함) | 충돌 아님(케이스는 유지)이나 07 판정 "전후 통과"가 T1의 e2e 이동과 같은 시점이면 기준선이 흔들림 |

---

# 6. ui에 남은 코인·KIS·업비트·바이낸스 코드 지형

생성물(`shared/lib/api-types.ts`)은 제외했다(그 안에는 `crypto-prices`·`crypto-portfolio`·`crypto-market-indicators`·`UPBIT`·`BINANCE`·`executionHour`가 있다: 각각 `git grep -c`로 4·3·2건 수준).

## 6-1. 파일 목록 (`git grep -n -i -l -E "crypto|upbit|binance|bithumb|coin" -- '*.ts' '*.tsx' ':!shared/lib/api-types.ts'`)

총 97파일(`bithumb`·`coin`은 사실상 0이고 대부분 `crypto`·`upbit`·`binance` 일치. `scripts/*.mjs`는 glob에 안 걸려 따로 6-6에). 디렉토리별:

| 디렉토리 | 개수 | 파일 |
|---|---:|---|
| `features/strategy` | 19 | `create-strategy/model/{buildDcaPayload(.test),dcaFormSchema(.test),useStrategyForm,useStrategyFormData(.test)}`, `create-strategy/sections/{DcaConditionsSection,DcaRuleEditor,DcaSettingsSection}(.test)`·`DcaRuleList.tsx`·`__fixtures__/dcaTestMeta.ts`, `create-strategy/{DcaStrategyForm(.test),StrategyForm.test}`, `manage-strategy/DeleteStrategyDialog.test` |
| `features/account` | 10 | `create-account/steps/{AccountInfoStep,ApiStep,ApiStepParts,BrokerStep,ConfirmStep}`와 각 테스트, `create-account/CreateAccountStepper.test`, `edit-account/EditAccountForm.test` |
| `widgets/account-detail` | 8 | `AccountDetailContent`·`AccountDetailTabs`·`AccountSummaryCard`·`CryptoHoldingsCard`(각 .test 포함) |
| `entities/trade` | 7 | `api/index(.test).ts`, `model/{queryKeys,queryOptions,types}.ts`, `providers/TradeToast.tsx`, `index.ts` |
| `entities/market` | 6 | `api/index.ts`, `hooks/useMarketQueries(.test)`, `model/{queryKeys,types}.ts`, `index.ts` |
| `widgets/crypto-market-indicators` | 5 | `CryptoIndicatorCards.tsx`, `CryptoMarketSection(.test).tsx`, `index.ts`, `niceTicks.ts` (+ `IndicatorLineChart.tsx`는 `crypto` 문자열이 없어 이 목록엔 없지만 같은 디렉토리) |
| `widgets/strategy-detail` | 4 | `DcaExecutionHistory`, `DcaStrategyDetail`(각 .test) |
| `app` | 4 | `(main)/accounts/[id]/page.tsx`, `(main)/dashboard/page(.test).tsx`, `api/crypto-market-indicators/route.ts` |
| `widgets/admin-trade-list` | 3 | `AdminTradesTable(.test)`, `AdminTradesWorkbench.test` |
| `shared` | 3 | `lib/api-schema(.test).ts`, `lib/hooks/use-search-param.test.ts` |
| `features/admin` | 3 | `settings/model/validateAdminSettings.test.ts`, `settings/ui/AdminSettingsForm(.lifecycle).test.tsx` |
| `entities/strategy` | 3 | `model/dcaFormat(.test).ts`, `index.ts` |
| `entities/meta` | 3 | `__fixtures__/testMeta.ts`, `model/{marketRules.test,types}.ts` |
| `entities/finance` | 3 | `lib/{aggregate(.test),colors.test}.ts` |
| `entities/account` | 3 | `model/{brokerCredentials(.test),sortAccounts.test}.ts` |
| `widgets/strategy-card` | 2 | `DcaStrategyCard(.test).tsx` |
| `widgets/market-holiday-calendar` | 2 | `WeeklyMarketCalendar(.test).tsx` |
| `widgets/fear-greed-card` | 2 | `FearGreedSection(.test).tsx` |
| `widgets/benchmark-comparison` | 2 | `housingBenchmarkContent.ts`, `model/useBenchmarkStrategyOptions.test.ts` |
| `widgets/{stats-overview,asset-composition,accounts-grid,account-card}` | 각 1 | `CyclePerformanceList.test`, `AssetComposition.test`, `AccountsPageContent.test`, `AccountCard.test` |
| `tests` | 1 | `tests/e2e/support/account-cache-lock.ts` |

테스트 파일이 대부분이다(97 중 약 45). 제품 파일 중 핵심: `widgets/crypto-market-indicators/*`, `widgets/account-detail/CryptoHoldingsCard.tsx`, `features/account/create-account/steps/*`, `features/strategy/create-strategy/{sections,model}/*Dca*`, `entities/market/**`, `entities/trade/{api,model}/*`(코인 포트폴리오·가격), `entities/meta/model/{marketRules,types}.ts`, `shared/lib/api-schema.ts`, `entities/account/model/brokerCredentials.ts`.

KIS 전용(위 정규식에 안 걸림): `git grep -n -l -w "KIS" -- '*.ts' '*.tsx' ':!shared/lib/api-types.ts'` 45파일. 제품 코드 줄: `app/(main)/accounts/[id]/page.tsx:37`(주석), `app/pending/page.tsx:16`, `entities/account/model/brokerCredentials.ts:9`, `entities/meta/__fixtures__/testMeta.ts:10`, `entities/trade/api/index.ts:12`(주석), `features/account/create-account/steps/{AccountInfoStep.tsx:16,18,57, ApiStep.tsx:20,21,26,103,116, BrokerStep.tsx:18, ConfirmStep.tsx:24}`, `shared/lib/api-schema.ts:59`. 그 밖에 `e2e/ledger-budget.spec.ts:10-15`(`broker === 'MOCK' || 'KIS'` 시드 계좌 선택, 주석 "크립토 계좌는 DCA 전용 폼이라…"), `scripts/a11y-check/README.md:9`.

## 6-2. `app/` 라우트

- 코인 전용: `app/api/crypto-market-indicators/route.ts`(`createProxyRoute({ basePath: '/api/crypto-market-indicators' })`).
- 코인이 지나가는 프록시: `app/api/accounts/[[...path]]/route.ts`(`/crypto-portfolio`·`/crypto-prices`가 `accounts` 하위), `app/api/market/[[...path]]/route.ts`(fear-greed의 `crypto`는 응답 필드), `app/api/settings`, `app/api/orders`(MARKET 주문 유형).
- 화면 라우트: `app/(main)/accounts/[id]/page.tsx:6,40`(`isCryptoBroker`로 코인 포트폴리오 prefetch 분기), `app/(main)/dashboard/page.tsx:13,49`(`CryptoMarketSection`), `app/(main)/accounts/[id]/strategies/*`(DCA 전략 폼에 코인 분기, 파일명에는 crypto가 없음). 코인 전용 화면 라우트 폴더는 없다.

## 6-3. 메타(`/api/meta`)의 코인 관련 필드를 읽는 곳 (제품 코드, 테스트 제외)

| 필드·함수 | 읽는 곳 |
|---|---|
| `brokers[].market`/`markets`/`minOrderAmount`/`amountScale` | 타입 `entities/meta/model/types.ts:33,34,39,41,42`, 규칙 `entities/meta/model/marketRules.ts:16-17`(`minOrderAmount`·`amountScale`), 폴백 `shared/lib/api-schema.ts:56-114`(`MARKET_CURRENCY`·`marketCurrency`·`isCryptoMarket`·`isCryptoBroker`, 줄 56·59·63·89·105-112) |
| `isCryptoMarket`·`isCryptoBroker`·`isCrypto` | 제품 코드 50줄: `app/(main)/accounts/[id]/page.tsx:6,40`, `entities/strategy/model/dcaFormat.ts:2,43,44,71`, `features/account/create-account/steps/AccountInfoStep.tsx:6,85`, `features/strategy/create-strategy/model/buildDcaPayload.ts:24`, `entities/trade/providers/TradeToast.tsx:21,35` 등 |
| `tickers`(BTC·ETH)·`orderTypes`(MARKET) | `entities/meta/model/types.ts:50,17,58`. 코드에 `BTC`·`ETH` 문자열 19줄(제품), `MARKET` 리터럴 0줄(`git grep -n -E "MARKET\b"` 제품 코드 0건) |
| `executionHour`(DCA 규칙의 코인 실행 시각) | `entities/strategy/api/index.ts:64`, `entities/strategy/model/{dcaFormat.ts:23-39,82,types.ts:45,54}`, `features/strategy/create-strategy/DcaStrategyForm.tsx:119`, `features/strategy/create-strategy/model/buildDcaPayload.ts:24`(전체 23줄) |
| `USDT` 표기 | `shared/lib/api-schema.ts`·`shared/lib/format/index.ts:29-31`(`fmtCompactMoneyNarrow` USDT 분기) 등 제품 코드 40줄 |
| 런타임 설정 `brokers[...].allowedIp` | `entities/runtime-config/model/types.ts:29`(`Record<RuntimeBrokerCode, { enabled: boolean; allowedIp?: string }>`), 관리자 설정 폼 `features/admin/settings/**`, 계좌 등록 `ApiStepParts.tsx:126,159`(바이낸스 허용 IP 안내) |
| 오류 코드 `BROKER_IP_NOT_ALLOWED` | `entities/account/model/brokerCredentials.ts:18`(문구 매핑), `features/account/create-account/steps/ApiStepParts.tsx:159`(주석) |
| 전략 상태 `deprecated` 코인 필드 폴백(`krwCash`·`totalAssetKrw`·`evalAmountKrw`) | `entities/trade/api/index.ts:77-83` 부근(01이 지움) |

## 6-4. `daily-trades` 호출부

계좌 범위 `/api/accounts/{id}/daily-trades` 호출은 0건. 호출은 유저 범위 하나뿐이다: `entities/trade/api/index.ts:74`(`/api/daily-trades?${q}`) → `app/api/daily-trades/route.ts`(프록시). `git grep -n "daily-trades" -- '*.ts' '*.tsx' ':!shared/lib/api-types.ts'` 결과 5곳 중 제품 호출 2곳, 테스트·주석·`shared/lib/api-client/index.ts:4,6`의 `TRADING_PREFIXES`. 계좌 범위 경로는 `shared/lib/api-types.ts:2231`에만 있다(api U5 삭제 확정과 일치).

## 6-5. HTTP 400에 기대는 분기

제품 코드에 `status === 400`류 분기는 0건이다(`git grep -n -E "\.status ===|status ==|status >=" -- '*.ts' '*.tsx' ':!*.test.*'` → 401·404·204·5xx뿐: `shared/lib/api-client/index.ts:95,102`(401), `widgets/strategy-detail/orderBannerCopy.ts:61`(404), `app/api/trades/stream/route.ts:33`(401·403), `app/api/auth/reapply-done/route.ts:21`·`shared/lib/proxy/routeHelpers.ts:14`(≥500), `shared/lib/proxy/createProxyRoute.ts:57`(204)). "400"이 나오는 곳은 전부 주석이다: `app/(main)/accounts/[id]/page.tsx:37`("코인 계좌는 주식 포트폴리오를 부르면 400이라 코인 포트폴리오를 대신 채운다" — 400을 피하려고 증권사로 호출을 분기), `entities/market/api/index.ts:30`(기간 5년 초과 시 400), `entities/error-log/hooks/useReportClientError.ts:16`, `entities/finance/api/index.ts:50,110`·`hooks/useFinanceMutations.ts:188,447`(공유 규칙 위반 400). 409·502 비교는 0건. 즉 api 13 U8(409로 변경)이 UI 분기를 깨뜨리는 곳은 없다(확인 근거: 위 명령). 단 `entities/finance/hooks/useFinanceMutations.ts:447` 부근 주석처럼 400이 "요청 자체 오류"라는 전제로 에러 판정을 하는 곳이 있는지는 코드까지 열어 보지 않았다(미확인).

## 6-6. 비 `*.ts(x)` 파일의 코인 참조

`scripts/visual-diff/{README.md,fixtures/api.mjs,fixtures/trading.mjs,run.mjs,scenarios.mjs}`(코인 계좌 시드·픽스처), `tests/e2e/support/account-cache-lock.ts`. 위 6-1 glob 밖이므로 코인 삭제 때 시각 비교 시나리오가 깨질 수 있다(`git grep -i -l -E "crypto|upbit|binance|coin" -- scripts e2e tests '*.css' '*.mjs'`로 확인).

## 6-6'. 지침서 10 A·B·C 항목 중 코인 전제인 것 (api 15 결정에 걸림)

| 항목 | 코인 전제 |
|---|---|
| D4 / T3 (크립토 지표 조건부) | 위젯 자체가 삭제됨 |
| A4 (대시보드 크립토 지표 노출 조건) | 위와 같음 |
| A4 "크립토 계좌 2개(BINANCE 1, UPBIT 1)" | 코인 계좌 전체 삭제 예정(api 15 단계 P) |
| 재심 1(바이낸스 DCA UI 재제안 금지), 재심 2(빗썸 안 함) | 대상 기능 삭제 |
| B3 (`/pending` 문구의 KIS) | KIS는 04 단계 A로 삭제(코인 아님이지만 같은 브로커 삭제 묶음) |
| B5 보관 전략(D8) | 코인 아님 |
| T5 (VR 투자금) | 코인 아님 |
| T3의 완료 판정 "`isCryptoBroker`를 쓴다" | 삭제 예정 심볼에 의존 |
| 11 T9(기간)·T10(차트)·T13 | 코인 위젯 대상 포함(5절) |
| 07 태스크 6의 `CryptoMarketSection` | 코인 위젯 삭제로 대상이 사라짐 |
| 09 C4·A1(`fmtCompactUsdNarrow`) | USDT 분기와 연동 |
| 05 태스크 1·9 (정적 맵·KIS·업비트 삭제) | `findings/j` 13절 목록 38파일이 09 C4와 같은 대상(수치는 48 vs 38) |

## 6-7. 승인 대기(PENDING) 사용자가 부르는 api 경로 (`app/pending/`와 하위 컴포넌트·훅 호출 추적)

api 13 U1이 PENDING 차단 시 "승인 대기 화면이 쓰는 경로 말고는 403"으로 바꾼다(cross-repo.md E절). 코드로 추적한 목록(경로: 호출 주체):

| # | upstream api 경로 | 호출 주체(UI) |
|---|---|---|
| 1 | `GET /api/auth/me` | `app/pending/page.tsx`(Server, `getMe(token)`, `entities/user/api/index.ts:5`), `proxy.ts:52`(상태·역할 확인), `app/api/auth/me/route.ts:16,30` |
| 2 | `GET /api/auth/status-stream`(SSE) | `app/pending/PendingStatusWatcher.tsx:10` → `app/api/auth/status-stream/route.ts:19`. 11 T4가 `/api/auth/me` 주기 조회로 바꾸고 삭제 예정(api U2) |
| 3 | `POST /api/auth/approval-requests` | `features/auth/reapply/ReapplyButton.tsx`·`RejectedReapplyButton.tsx` → `reapply()`(`entities/user/api/index.ts` `POST /api/auth/reapply-done`) → `app/api/auth/reapply-done/route.ts:14`가 upstream `/api/auth/approval-requests`로 전달 |
| 4 | `POST /api/auth/logout` | `features/auth/logout/LogoutButton.tsx` → `app/api/auth/logout/route.ts:19`, 그리고 `shared/lib/api-client/index.ts:60-67`의 401 처리 로그아웃 |
| 5 | `POST /api/auth/refresh` | `proxy.ts`가 호출하는 `shared/lib/auth/refresh.ts:21`, `app/api/auth/refresh/route.ts`(401 후 갱신) |
| 6 | `PUT /api/settings/telegram`, `PATCH /api/settings/notification-channel` | `features/settings/telegram-connect/PendingTelegramConnect.tsx` → `useTelegramConnectForm.ts`(`useUpdateTelegramMutation`·`useUpdateNotificationChannelMutation`) → `app/api/settings/[[...path]]/route.ts` |
| 7 | `DELETE /api/settings/telegram` | `PendingTelegramConnect.tsx:23-44`(`useDeleteTelegramMutation`) |
| 8 | `POST /api/client-errors` | 오류 경계(`app/error.tsx`→`ErrorDisplay`→`useReportClientError`)가 pending 화면에도 걸림 → `app/api/client-errors/route.ts` |
| 9 | `POST /api/auth/kakao/callback` | 로그인 직후(`app/auth/callback/route.ts:42`, PENDING 판정 이전). PENDING 사용자 로그인 경로이므로 포함 |

PENDING 화면에서 부르지 않는 것: FCM 등록(`FcmAutoRegister`는 `(main)` 레이아웃), 대시보드·전략 계열. `app/rejected/page.tsx`는 `RejectedReapplyButton`(경로 3)·`LogoutButton`(경로 4)만 쓴다. 계좌·전략 경로는 PENDING 흐름에 없다. 확인 못 한 것: `app/pending/layout.tsx`·`loading.tsx`는 api를 부르지 않음(코드 확인). 서버 쪽에서 `proxy.ts`가 PENDING에 허용하는 UI 경로(`/pending`, `/rejected`, `/login`)는 6-7과 별개다. `/api/auth/status-stream` 외에 `GET /api/auth/dev-token` 같은 개발 전용 경로는 UI 제품 코드에서 부르지 않는다(e2e·scripts만).
