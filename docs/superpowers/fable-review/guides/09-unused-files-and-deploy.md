# 09. 불필요 파일과 배포 자산

근거 측정: `findings/i-unused-files.md`(참조 grep 전수), kista-infra의 `docs/superpowers/fable-review/findings/cross-repo-deploy.md`(배포 자산, fable-infra 전달), `findings/j-ui-api-principle-violations.md` 13절(삭제되는 증권사).

**삭제의 실제 실행은 사용자 승인 뒤에 한다.**

## 현재 상태

이 레포는 죽은 파일이 거의 없다. 측정 결과:

- `npm run knip` 0건(실행 확인). 미참조 정적 자산 0, 추적 중인 로그·백업·스냅샷·빌드 산출물 0, 앱 내부 링크가 없는 page 라우트 0.
- 따라서 "지울 파일 목록"은 짧다. 남은 것은 (a) 테스트만 쓰는 심볼, (b) 쓰이지 않는 설정·스크립트, (c) 다른 레포 결정으로 죽게 된 배포 자산, (d) 문서 기록물(08에서 다룬다)이다.
- 큰 삭제는 파일 정리가 아니라 지침서 01~06의 구조 변경에서 나온다(약 150파일).

## 삭제 대상

### A. 지금 지워도 되는 것 (제품 참조 0이 명령으로 확인됨)

| # | 대상 | 크기 | 근거 |
|---|---|---|---|
| A1 | `shared/lib/format/index.ts`의 `fmtCompactUsdNarrow`와 그 테스트 블록(`index.test.ts:204`) | 함수 4줄 + 테스트 | `git grep -nw fmtCompactUsdNarrow` → 정의와 테스트뿐 |
| A2 | `entities/stats/model/types.ts:99-100`의 `CurrentExchangeRate`, `HousingBenchmarkStrategy` | 2줄 | 선언과 테스트 1곳뿐 |
| A3 | `features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.ts`의 상수 `reconfigureVrFormSchema` | 파일 일부 | 제품은 `createReconfigureVrFormSchema`만 쓴다. 상수는 테스트만 |
| A4 | `shared/lib/format/pnl.ts`의 `pnlTextClass`가 barrel 재수출로만 살아 있는 구조, `subviewHistory`의 `pushSubviewEntry`·`SUBVIEW_HISTORY_KEY`, `createQueryClient`의 `QUERY_DEFAULT_*` export | export 약 20개 | 테스트만 import(`findings/i` 10절). `export`를 떼고 테스트를 공개 동작 기준으로 고친다 |
| A5 | `entities/finance/index.ts:98-99`의 `isLiability` 재수출과 `@public` 태그 | 2줄 | 외부 import 0. 05에서 집계가 서버로 가면 함수 자체도 사라진다 |
| A6 | `.react-doctor/false-positives.md` | 5줄 | 자기 자신 외 참조 0. react-doctor 패키지에서도 읽는 흔적 없음 |
| A7 | `components.json`의 `aliases.hooks: "@/hooks"` | 1줄 | `hooks/` 디렉토리와 tsconfig alias가 없다. shadcn `add`가 hook을 생성할 때만 쓰이는데 그때 없는 경로로 쓴다 |

A1~A3은 확신도 상이다. A4는 테스트 수정이 따르므로 07의 정리 태스크와 묶는다.

### B. 확인 후 지우는 것

| # | 대상 | 확인할 것 | 권고 |
|---|---|---|---|
| B1 | `shared/lib/env.ts`의 `NEXT_PUBLIC_TRADING_API_BASE_URL` 폴백 | 어떤 `.env*`·Dockerfile·workflow도 이 키를 선언하지 않는다. 개인 로컬 `.env`에 있는지 | 사용자 확인 후 삭제. kista-api 프로세스 결정(D1)이 "진입점 하나"로 나면 `TRADING_API_BASE_URL` 자체가 사라진다 |
| B2 | `package.json`의 `start`, `test`(watch) 스크립트 | 손으로 쓰는지 | `start`는 Dockerfile이 `node server.js`를 쓰므로 삭제. `test`는 사용자 습관에 따름 |
| B3 | `test:coverage` + devDependency `@vitest/coverage-v8` | 호출처가 문서 한 줄뿐 | 유지. 07의 기준선·감량 검증이 커버리지를 쓴다 |
| B4 | `scripts/visual-diff/sheet.mjs`(78줄) + `knip.json`의 `ignoreFiles` | README로만 호출되는 수동 도구 | 사용자가 쓰면 유지. 03·06의 전후 비교에 visual-diff 본체는 필요하다 |
| B5 | `knip.json`의 `ignoreIssues: components/ui/**` | 예외를 빼고 knip을 돌려 0건인지 | 0건이면 예외 삭제. 06에서 `card.tsx`·`pagination.tsx`가 지워진 뒤 다시 확인 |
| B6 | `knip.json`의 `ignoreDependencies: sharp` | `scripts/visual-diff`가 next의 전이 의존성에 기대 import한다 | `sharp`를 devDependency로 명시하고 예외 삭제 |
| B7 | `.prettierrc` | prettier가 의존성에 없다. 에디터가 읽는지 | `docs/agents/constraints.md`가 "`.prettierrc` 기준"이라 적는다. 포맷을 강제하려면 prettier를 devDependency와 lint 단계에 넣고, 아니면 파일과 문서 문장을 지운다. 사용자 결정 |
| B8 | `public/apple-touch-icon-precomposed.png`(46KB, `apple-touch-icon.png`와 md5 동일) | iOS가 이름 규약으로 요청해 404를 내던 것을 막으려고 넣은 파일(커밋 271cbad1) | 유지. 지우지 않는다 |

### C. 다른 결정으로 죽는 배포 자산

kista-infra 검토와 사용자 결정으로 확정된 것:

| # | 대상 | 근거 | 조건 |
|---|---|---|---|
| C1 | `.github/scripts/wait-reconcile.sh`, `wait-reconcile.bats`, `stub/gh` | kista-api와 같은 사본이다. 배포 대기 구조를 없애고 infra가 commit status로 결과를 돌려주는 것으로 사용자 결정이 났다(fable-api 전달, 2026-11-11) | infra 쪽 commit status 회신이 배포된 뒤. `server-deploy.yml`의 대기 단계도 같이 지운다 |
| C2 | `deploy/server/required-env` | `TRADING_API_BASE_URL`이 빠져 있어 이미 틀렸다(compose는 기본값 없이 보간하고 `shared/lib/env.ts:16-17`은 없으면 throw). infra 지침서의 목표는 이 파일을 없애고 compose에서 `${API_BASE_URL:?}`·`${TRADING_API_BASE_URL:?}`로 강제하는 것 | infra 지침서 실행과 같은 묶음. `deploy/server/contract.bats`의 해당 단언도 같이 고친다 |
| C3 | `UI_DOMAIN` 환경값 | 소비처가 없는 흔적값이다(`deploy/server/README.md:32`가 인정) | C2와 같이 |
| C4 | KIS·업비트 전용 UI 코드 약 70줄과 테스트·픽스처 참조 38파일 | 증권사 삭제가 결정됐다 | api 지침서 04의 단계 A와 같은 배포 묶음(05 지침서 태스크 9) |

### D. 구조 변경에 딸려 사라지는 파일 (참고 — 각 지침서가 소유)

| 지침서 | 사라지는 것 |
|---|---|
| 01 | `shared/lib/normalize.ts`와 테스트, `.claude/skills/dto-sync-check/` |
| 02 | 프록시 Route Handler 12개, `entities/*/model/queryKeys.ts`·`queryOptions.ts` 21개와 테스트 10개, `entities/*/api/index.ts` 대부분, `shared/lib/api-client`·`createProxyRoute` |
| 03 | 순수 barrel 87개, `.claude/agents/fsd-boundary-checker.md`, `.claude/skills/fsd-scaffold/`, 레이어 `CLAUDE.md` 5개 |
| 04 | `app/(main)/@modal/**`(page 11 + loading 10), `*FormBody.tsx` 9개, `shared/ui/RouteModal.tsx`, `shared/lib/subviewHistory.ts`, `shared/lib/dismiss.ts`, `shared/lib/form/submitFormDialog.ts`, `ModalFormSkeleton` |
| 05 | `entities/finance/lib/{aggregate,flowAggregate,bulkRegisterPreview}.ts`, `entities/order/model/order-readiness.ts`, `entities/strategy/model/{capitalAdjustment,scheduled-start,vr-rollover,vrRamp}.ts`, `entities/account/model/apiKeyExpiry.ts`, `features/strategy/create-strategy/model/{strategyFormGuards,vrDerived,useTypeDefaults}.ts`, `entities/runtime-config/**`, `shared/lib/indicators.ts`, `shared/lib/hooks/use-client-pagination.ts` |
| 06 | `components/ui/{card,pagination}.tsx`, `shared/ui/{PaginationBar,PageSizeSelector,LoadingRow}.tsx`, 자체 `AlertDialog` 파일 9개, 차트 래퍼 5개 |
| 08 | archive 71파일, 감사 보고서, memory 완료 기록 |

## 배포 자산의 구조 문제 (삭제가 아니라 수정)

fable-infra가 알린 것 중 이 레포에서 고칠 것:

1. **루트 `docker-compose.yml`이 `TRADING_API_BASE_URL`을 주입하지 않는다.** 이 compose로 띄우면 `getTradingApiBaseUrl()`이 throw한다(두 측정이 독립적으로 발견, 실행 확인은 안 함). 한 줄 추가로 고친다. kista-api 프로세스 결정이 "진입점 하나"면 키 자체를 지운다.
2. **`NEXT_PUBLIC_*` 키 하나를 추가하려면 5곳을 고친다**(`.env.production.public`, Dockerfile의 `ARG`·`ENV` 2회, 루트 compose, `server-deploy.yml`의 build-args, 문서). 목표: 빌드 시점 공개 값의 원본을 `.env.production.public` 하나로 두고, Dockerfile은 그 파일을 복사해 `next build`가 읽게 한다. `ARG`·`ENV` 나열과 workflow의 build-args를 지운다. 공개 값이라 이미지에 들어가도 된다(현재도 번들에 들어간다).
3. **`server-deploy.yml`에 변경 경로 판정이 없다.** 문서만 바꾼 push도 빌드·배포한다. `paths-ignore: ['docs/**', '**/*.md', '.claude/**']`를 넣는다. 이 검토처럼 문서 커밋이 많은 작업에서 배포가 매번 돈다.
4. **같은 push에서 typecheck가 `ci.yml`과 `server-deploy.yml`에서 두 번 돈다.** 배포 workflow가 CI 성공을 조건으로 삼고(`workflow_run` 또는 `needs`) 자체 typecheck를 지운다.
5. **PR 단계에 shellcheck·bats가 없다.** `deploy/server/contract.bats`를 `ci.yml`에 넣는다. C1 뒤에는 대상 스크립트가 줄어든다.
6. **Caddy 라우팅**을 이 레포 소유 스니펫(`deploy/server/caddy/kista-ui.caddy`)으로 옮기는 안은 infra 지침서가 소유한다. 그쪽 실행 때 파일을 받는다.

## 예상 감량과 위험

| 묶음 | 감량 |
|---|---|
| A (지금) | 약 40줄 + 테스트 전용 export 약 20개 |
| B | 설정 약 15줄, 스크립트 1~2개 |
| C | 스크립트·테스트 3파일, 설정 파일 1개, 증권사 코드 약 70줄 |
| 배포 수정 | Dockerfile·workflow에서 `NEXT_PUBLIC_*` 나열 약 40줄 |

위험:

- **외부 소비자**: `deploy/server/{bluegreen,required-env,roles}`는 레포 안에 소비처가 없어 보이지만 kista-infra의 `reconcile.sh`가 읽는다. C 묶음은 반드시 infra 변경과 같은 날 배포한다. `bluegreen`·`roles`는 지우지 않는다.
- **배포 workflow 수정은 실패하면 배포가 멈춘다.** `paths-ignore`와 CI 연결은 한 번에 하나씩 바꾸고, 각각 실제 push로 확인한다(사용자 push 필요).
- **`NEXT_PUBLIC_*` 원본 통합**은 빌드 결과물이 같아야 한다. 전후로 `next build` 뒤 번들에 박힌 공개 값을 비교한다(`grep -r "NEXT_PUBLIC" .next/static | sort | md5`가 아니라 값 문자열을 직접 grep).

## 태스크 분해

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 1 | 사용자 결정 받기(B1·B2·B4·B7) | — | — | 답변 |
| 2 | A1~A3·A5~A7 삭제 | 위 표 | Haiku | `npm run typecheck && npm run knip && npx vitest run shared/lib/format entities/stats features/strategy/reconfigure-vr` |
| 3 | B5·B6: knip 예외 정리, `sharp` 명시 | `knip.json`, `package.json` | Haiku | `npm run knip` 0건 |
| 4 | 루트 compose에 `TRADING_API_BASE_URL` 추가(또는 D1 결정에 따라 키 삭제) | `docker-compose.yml` | Haiku | `docker compose config`가 오류 없이 값을 보간 |
| 5 | `server-deploy.yml`: `paths-ignore`, CI 연결, 중복 typecheck 제거. `ci.yml`: bats 추가 | `.github/workflows/*.yml` | Sonnet | 문서만 바꾼 push에서 배포 workflow가 돌지 않음(사용자 push로 확인) |
| 6 | `NEXT_PUBLIC_*` 원본을 `.env.production.public` 하나로 | `Dockerfile`, `docker-compose.yml`, `server-deploy.yml`, `docs/agents/deployment.md` | Opus | 전후 빌드에서 공개 값이 같음. `/code-review medium` |
| 7 | C1~C3: 대기 스크립트·required-env 삭제 | `.github/scripts/**`, `deploy/server/required-env`, `contract.bats`, `server-deploy.yml` | Sonnet | infra 변경 배포 후. `bats deploy/server/contract.bats` 통과, 실제 배포 1회 성공 |
| 8 | A4: 테스트 전용 export 정리 | `findings/i` 10절 목록 | Sonnet | 07 태스크 4와 한 묶음 |

`docs/agents/deployment.md`는 배포 자산을 건드리는 태스크(4~7) 전에 반드시 Read한다(루트 `CLAUDE.md` 규칙).

## 사용자 결정

1. `.prettierrc`: prettier를 실제로 도입해 강제할지, 파일과 문서 문장을 지울지(B7).
2. `scripts/visual-diff/sheet.mjs`, `package.json`의 `start`·`test` 스크립트를 손으로 쓰는지(B2·B4).
3. 개인 로컬 `.env`에 `NEXT_PUBLIC_TRADING_API_BASE_URL`이 있는지(B1).
4. 배포 workflow 변경(태스크 5·6·7)은 push가 있어야 검증된다. 실행 시점을 정해 달라.

## 하지 말아야 할 것

- 레포 안에서 참조가 0이라는 이유만으로 `deploy/`·`public/`·`.github/` 아래 파일을 지우지 않는다. 소비자가 레포 밖에 있다(infra, iOS, GitHub).
- knip 예외를 늘려 통과시키지 않는다. 새로 잡힌 항목은 지우는 것이 기본이다.
- C 묶음을 infra 변경보다 먼저 배포하지 않는다.
- D 표의 파일을 이 지침서에서 지우지 않는다. 각 지침서의 태스크가 지운다.

## 다른 지침서와의 의존·순서

- 태스크 2·3·4는 독립이다.
- 태스크 7은 kista-infra 지침서, C4는 api 지침서 04와 05 지침서 태스크 9.
- 태스크 8은 07.
- kista-api 프로세스 구조 결정(D1)이 나면 `TRADING_API_BASE_URL` 관련 항목(B1, 태스크 4, 02의 `resolveUpstream`)을 한 번에 정리한다.
