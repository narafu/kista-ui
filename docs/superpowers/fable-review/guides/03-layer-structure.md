# 03. 계층 구조 — 기술 역할 5계층을 범위 3계층으로 바꾼다

근거 측정: `findings/d-single-use-abstractions.md` (전 절), `findings/a-vertical-trace.md` 종합 4번, `findings/f-retained-decisions.md` 아키텍처 절.

## 현재 구조와 문제

`app → widgets → features → entities → shared` 다섯 계층이고, 같은 계층끼리는 import하지 못한다. 슬라이스는 widgets 42개, features 31개, entities 16개다.

- **계층이 재사용 경계가 아니다.** features 슬라이스 31개 중 21개(68%, 4,037줄), widgets 슬라이스 42개 중 30개(71%, 10,582줄)가 소비처 1곳이다. widgets의 27개(10,350줄)는 app 파일 하나만 쓴다. `features/settings/*` 5개 슬라이스는 `widgets/settings` 한 곳에서만 쓰이고, 그 위젯은 `app/(main)/settings/page.tsx` 한 곳에서만 쓰인다. 설정 화면 하나가 네 계층에 걸쳐 있다.
- **한 기능이 계층마다 흩어진다.** 전략 수정은 app 3파일 → `features/strategy/create-strategy` 32파일 → entities 16파일 → widgets 1파일이다. "수정"이라는 이름의 슬라이스는 없고 `create-strategy`가 수정도 맡는다.
- **barrel이 105개다.** 순수 재수출만 하는 것이 87개(481줄)이고 그중 54개는 한 줄이다(`features/settings/theme-select/index.ts`). 화면 하나의 import 폐포를 이름 무시하고 잡으면 36% 더 많은 파일이 딸려 온다.
- **같은 계층 import 금지가 우회 구조를 만든다.**
  - widgets에는 "다른 위젯이 import해도 되는 12개" 화이트리스트가 있다(`docs/agents/widgets.md` "대표 슬라이스"). 실제로 8개 슬라이스에서 위젯 간 import가 관측된다.
  - 화이트리스트 밖 위젯을 조합하려면 app이 `ReactNode` 슬롯으로 주입한다. 대시보드는 슬롯이 3단을 지난다(`DashboardContent.tsx:15` → `DashboardOverview.tsx:11-28` → `DashboardMarkets.tsx:13-28`). 자식이 부모 데이터를 필요로 하면 콜백 슬롯으로 변형한다(`renderHousingExtras`).
  - 두 슬라이스가 쓰는 코드는 올릴 곳이 `shared`뿐이라 도메인 무관이 아닌 것도 올라간다. shared의 export 파일 82개 중 22개(843줄)가 사용처 2곳 이하다.
  - entities끼리 import하지 못해 `TradeNotificationBridge`를 widgets에 두고, 계좌 수정 화면이 무효화 키 하나 때문에 `entities/strategy`를 끌고 온다.
- **경계는 문서와 수동 점검으로만 지켜진다.** `eslint.config.mjs`에 계층 규칙이 없다. `.claude/agents/fsd-boundary-checker`가 grep으로 본다(허용 방향인 widgets→features를 위반으로 보고하는 결함이 있다 — `findings/h-docs-drift.md`).
- **파일이 잘게 쪼개져 있다.** 테스트 제외 709개 중 324개(46%)가 30줄 미만이다. 같은 슬라이스 안에서 한 곳만 쓰는 파일이 124개 12,618줄이다. `useStrategyForm.ts:13-21`은 자기만 쓰는 hook 3개(`useStrategyFormData` 44줄, `useStrategyFormEffects` 101줄, `useTypeDefaults` 70줄)를 따로 둔다.

계층을 나누는 비용(파일 수, 경로 간접, 우회 규칙, 문서)은 내고 있는데 그 대가인 재사용과 교체 가능성은 얻지 못하고 있다.

## 목표 구조

사용자 결정(2026-11-12): 이 구조로의 이동을 승인. 코드 지침서 중 마지막에 전용 worktree에서 실행한다.

**"무엇을 아는가"로 세 범위만 둔다.**

```text
app/                 라우팅. page·layout·loading·Route Handler만
screens/<화면>/      한 화면의 조립. 여러 도메인을 묶는다. 화면끼리 import하지 않는다
domains/<도메인>/    한 도메인을 아는 모든 것: 타입, 순수 로직, 캐시 갱신 hook, 그 도메인의 UI(카드·폼·표)
shared/              도메인을 모르는 것
```

의존 방향은 `app → screens → domains → shared` 하나다.

### domains

현재 entities 16개 + features 31개 + 재사용 위젯을 도메인 8개로 묶는다.

| 도메인 | 흡수하는 현재 슬라이스 |
|---|---|
| `meta` | entities/meta, runtime-config |
| `user` | entities/user, fcm · features/auth, settings/* |
| `account` | entities/account · features/account/* · widgets/account-card |
| `strategy` | entities/strategy, order, trade, backtest · features/strategy/*, backtest/* · widgets/strategy-card, strategy-list, cycle-history |
| `market` | entities/market · widgets/fear-greed-card, crypto-market-indicators, market-holiday-calendar |
| `stats` | entities/stats · 통계·벤치마크의 도메인 UI |
| `finance` | entities/finance · features/finance/*, asset/* · 가계부 도메인 UI |
| `admin` | entities/admin, admin-settings, privacy, error-log · features/admin/* |

- 도메인 사이 import는 위 표의 위에서 아래 방향만 허용한다(`meta`·`user` ← `account` ← `strategy` ← `stats`, `market`·`finance`는 `meta`·`user`만, `admin`은 전부 가능). 순환을 막는 규칙은 이것 하나다.
- 도메인 안은 폴더를 강제하지 않는다. 기본은 `types.ts`, `model/`(순수 로직), `hooks/`(02 지침서에서 남은 캐시 갱신 hook), `ui/`다. 파일이 적은 도메인은 평평하게 둔다.

### screens

현재 widgets 중 한 라우트 전용인 27개와 `layout`이 여기로 온다(`screens/dashboard`, `screens/account-detail`, `screens/strategy-detail`, `screens/shell` 등). 화면은 도메인 UI를 직접 import해 조립한다. 슬롯 주입 우회와 위젯 화이트리스트가 필요 없어진다.

### shared

도메인 무관 UI 위젯(`page-header`, `kpi-card`, `glass-card`, `revealable-value`, `timeline`, `theme-toggle`, `pull-to-refresh`, `error-display`)은 `shared/ui`로 간다. 반대로 지금 shared에 있지만 한 도메인만 쓰는 것(`shared/model/placed-order.ts`, `shared/ui/SuggestionListEditor.tsx` 등 사용처 1곳 12개)은 그 도메인으로 내린다.

### 규칙

1. **barrel을 두지 않는다.** 파일 경로로 직접 import한다. "공개 API"는 knip(미사용 export 0건 유지)과 아래 lint 경계가 대신한다.
2. **경계는 lint가 강제한다.** `eslint.config.mjs`의 디렉토리별 `no-restricted-imports` 패턴으로 네 범위의 방향과 도메인 순서를 건다(추가 의존성 없음). `fsd-boundary-checker` 에이전트와 `fsd-scaffold` 스킬은 지운다.
3. **파일은 재사용되거나 커질 때만 나눈다.** 한 컴포넌트만 쓰는 hook·헬퍼·상수는 그 파일 안에 둔다. 파일이 300줄을 넘거나 두 번째 사용처가 생기면 나눈다. 테스트하려고 떼어낸 순수 함수는 같은 파일에서 export하면 된다.
4. **승격은 두 번째 사용처가 생길 때 한다.** 화면 전용 → 도메인(두 화면이 쓸 때) → shared(도메인을 모를 때). 미리 올리지 않는다.
5. alias는 `@screens/*`, `@domains/*`, `@shared/*` 세 개다. `@/lib/*`·`@/components/*`는 shadcn 생성물용으로 유지한다.
6. **테스트 전용 예외**: 루트 `testing/`(alias `@testing/*`, 07 태스크 2에서 생김)은 `mockApi`·`renderApp`을 담고 `domains/meta`를 import한다. 다섯 번째 최상위 디렉토리지만 테스트 파일과 `vitest.setup.ts`에서만 import할 수 있다. lint 경계에 이 두 방향(`testing/`은 테스트에서만 import, `testing/`은 어디든 import)을 넣고, 이동 스크립트는 `testing/` 안의 import 경로만 고친다.

### 그렇게 정한 이유

- 코드가 바뀌는 단위는 "전략", "가계부" 같은 도메인과 "전략 상세" 같은 화면이다. 기술 역할(위젯/피처/엔티티)로 자르면 한 번의 변경이 세 디렉토리를 지난다. 도메인으로 자르면 한 디렉토리 안에서 끝난다.
- 01·02를 거치면 entities는 타입 별칭과 hook 몇 개만 남아 독립 계층으로 둘 만큼의 내용이 없다. features와 entities를 가르던 "누가 캐시를 아는가"의 경계도 02에서 사라진다.
- 같은 계층 import 금지는 순환을 막는 수단이었다. 도메인 순서 한 줄이 같은 일을 하면서 우회 구조(슬롯, 화이트리스트, shared 승격, 브리지)를 요구하지 않는다.
- 문서로만 지키는 경계는 지켜지지 않는다(위젯 간 import 8건, 점검 에이전트의 오탐). lint로 옮기면 문서의 계층 규칙 대부분이 필요 없다.

### 기각한 대안

- **FSD를 유지하고 완화한다**(barrel 삭제 + 소비처 1곳 feature를 위젯으로 병합): 파일은 줄지만 기술 역할 축은 그대로라 한 기능이 여전히 app·widgets·entities에 걸친다. 화이트리스트와 슬롯 우회도 남는다.
- **라우트 폴더에 전부 둔다**(`app/(main)/accounts/[id]/_components/…`): 가장 가깝게 붙지만 경로에 괄호·대괄호가 들어가 셸·git에서 매번 따옴표가 필요하고, `@modal` 인터셉트 라우트와 본 라우트가 같은 본문을 공유할 때 어느 쪽 폴더에 둘지 다시 정해야 한다. 평평한 `screens/`가 같은 효과를 더 싸게 낸다.
- **도메인 사이 import를 전면 금지한다**(현 entities 규칙 유지): 전략은 계좌를, 통계는 전략을 실제로 안다. 금지하면 조합 전용 계층이 다시 필요해진다.

## 예상 감량과 위험

| 항목 | 현재 | 목표 |
|---|---:|---:|
| 최상위 코드 디렉토리 | 5계층 | 4범위 |
| 슬라이스 | 89개 | 도메인 8 + 화면 약 30 |
| barrel | 105개(순수 87) | 0 |
| 30줄 미만 파일(테스트 제외) | 324개 | 약 200개 |
| 파일 수(테스트 제외) | 709개 | 약 560개 |
| 줄 수 | — | 약 700줄 감소(barrel 481 + 슬롯·래퍼 약 200) |

줄 수 감량은 작다. 이 지침서의 효과는 파일 수, 화면 하나를 고칠 때 여는 디렉토리 수, 규칙 문서의 양이다.

위험:

- **이동량이 크다.** 파일 약 900개(테스트 포함)가 움직이고 import 경로가 전부 바뀐다. 다른 세션이 같은 시기에 코드를 고치면 충돌한다. 실행 중에는 다른 세션의 코드 작업을 멈추고, 전용 worktree에서 한다.
- **이동과 수정이 섞이면 리뷰할 수 없다.** 이동 커밋(`git mv` + import 치환만)과 병합·인라인 커밋을 분리한다.
- **barrel 제거 시 순환 import**: barrel이 가리던 순환이 드러날 수 있다. typecheck는 통과해도 런타임 초기화 순서 문제가 난다. 이동 후 `npm run build`와 e2e로 확인한다.
- **테스트의 `vi.mock('@entities/…')` 경로 395개**가 전부 바뀐다. 07 지침서의 mock 정리와 순서를 맞춘다(아래 의존 참고).
- **`eslint.config.mjs`의 구조 규칙**(07 태스크 5에서 `cacheArchitecture.test.ts`·`metadata.test.ts`를 옮긴 것, `runtimeFiles`·`entities/**/hooks/**`·`app/**` glob)의 대상 경로를 새 구조로 바꾼다.

## 동작 보존용 선행 테스트

1. 이동 전 기준선: `npm run typecheck && npm run lint && npm run test:run && npm run build` 전부 통과, `npm run knip` 0건.
2. 이동 커밋마다 같은 네 명령이 통과해야 한다. 이동 커밋에서는 테스트 케이스 수가 변하지 않아야 한다(`vitest run` 요약의 케이스 수를 전후 비교).
3. 번들 회귀: 이동 전후 `next build` 출력의 라우트별 First Load JS를 비교한다. barrel 제거로 줄어드는 것이 정상이고, 늘어나면 원인을 찾는다.
4. 화면 회귀: `npm run visual-diff -- <이동 전 sha>`로 주요 화면을 전후 비교한다.

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 1 | 이동 표 작성: 현재 파일 → 새 경로 전수 매핑(CSV), 도메인 순서 위반이 되는 import 목록 | `findings/l-move-map.csv` | Sonnet | 추적 파일 전부 행이 있음. 순서 위반 0건이 되도록 표를 조정 |
| 2 | 이동 스크립트 작성(`git mv` + alias 치환 + `vi.mock` 경로 치환), 스크래치에서 드라이런 | `scripts/` 밖 스크래치 | Sonnet | 드라이런 후 `npm run typecheck` 통과 |
| 3 | shared 정리: 도메인 무관 위젯 → `shared/ui`, 단일 도메인 전용 shared → 해당 위치 | `widgets/{page-header,kpi-card,…}`, `shared/**` | Sonnet | 기준선 4명령 |
| 4 | entities + features → `domains/` 이동(도메인 하나씩, 표의 위에서 아래 순서) | 전 도메인 | Sonnet | 도메인마다 기준선 4명령, 케이스 수 불변 |
| 5 | widgets → `screens/` 또는 `domains/*/ui` 이동 | `widgets/**` | Sonnet | `ls widgets features entities`가 없음 |
| 6 | barrel 삭제, 직접 import로 치환 | 전체 | Sonnet | `git ls-files \| grep -c '/index.ts$'`가 실코드 barrel(`shared/lib/format` 등) 수 이하, `npm run build` |
| 7 | lint 경계 규칙 추가, tsconfig alias 교체, 구조 규칙 glob 갱신 | `eslint.config.mjs`, `tsconfig.json`, `knip.json` | Opus | 고의 위반 import를 넣었을 때 `npm run lint`가 실패하는지 확인 후 되돌림 |
| 8 | 슬롯 우회 제거(대시보드 3단 슬롯, `renderHousingExtras`), 단일 사용 hook·30줄 미만 조각 인라인 | `screens/{dashboard,benchmark}/**`, `domains/strategy/form/**` 등 | Sonnet | visual-diff 차이 없음, 기준선 4명령 |
| 9 | 문서·도구 정리: 계층별 CLAUDE.md, `docs/agents/{architecture,entities,features,widgets,app}.md`, `fsd-*` 에이전트·스킬, README 아키텍처 절 | 08 지침서에 합친다 | Haiku | 08의 판정 |

태스크 3~6은 순수 이동이다. 태스크 8만 코드 내용을 바꾼다.

## 하지 말아야 할 것

- 이동 커밋에서 코드 내용을 고치지 않는다(이름 변경 포함).
- `domains/<d>/index.ts`를 "편의상" 다시 만들지 않는다.
- 도메인 순서를 어기는 import를 `eslint-disable`로 넘기지 않는다. 순서가 틀렸으면 표를 고치고, 조합이면 screens로 올린다.
- screens끼리 import하지 않는다. 두 화면이 같은 조각을 쓰면 도메인 UI나 `shared/ui`로 내린다.
- 미래의 재사용을 가정해 도메인이나 shared에 먼저 두지 않는다.
- 01·02·04·05·06이 끝나기 전에 시작하지 않는다(지워질 코드를 옮기게 된다).

## 재심한 유지 확정 항목

| 기존 결정 | 출처 | 재심 결과 |
|---|---|---|
| FSD 5계층 단방향 의존 | `docs/agents/architecture.md` "FSD 계층 구조" | 변경. 범위 4개 + 도메인 순서로 대체. 이유는 위 "그렇게 정한 이유" |
| 슬라이스 `index.ts`가 공개 API, 내부 파일 직접 import 금지 | `docs/agents/entities.md` "index.ts 규칙" | 폐지. knip과 lint 경계가 같은 역할을 한다 |
| widgets cross-import 금지 + 닫힌 화이트리스트 + slot 조립 | `docs/agents/widgets.md` "의존성 규칙" | 폐지. 구조가 바뀌면 필요 없다 |
| entities 간 cross-import 금지 | `docs/agents/entities.md` "의존성 규칙" | 도메인 순서 규칙으로 대체 |
| `app/`은 라우팅 전용 | `docs/agents/architecture.md` | 유지. 라우트 폴더에 코드를 두지 않는 이유는 "기각한 대안" 2번 |
| 새 코드는 FSD alias 우선, `@/lib`·`@/components`는 shadcn 호환용 | `docs/agents/architecture.md` "tsconfig 경로 alias" | 유지(alias 이름만 바뀐다) |

## 다른 지침서와의 의존·순서

- 코드 지침서 중 마지막에 실행한다: 01 → 02 → 05 → 04 → 06 → **03** → 07.
- 07(테스트)의 mock 경로 정리는 이 지침서의 이동과 같은 파일을 건드린다. 07의 공용 테스트 인프라 태스크를 03 이동 직후에 붙여 mock 경로를 한 번만 고친다.
- 08(문서)은 이 지침서의 태스크 9를 포함한다.
