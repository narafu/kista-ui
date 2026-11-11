# 미참조 파일 삭제 후보 조사 (읽기 전용)

- 기준: `git ls-files`(1162개) 기준, `git grep`(추적 파일만)으로 참조를 센다. 삭제·수정은 하지 않았다. 빌드·테스트·dev 서버 미실행.
- 확신도: 상 = 참조 0건이 명령으로 확인되고 동적 참조 가능성이 없음 / 중 = 참조는 없으나 수동·외부 호출 가능성 / 하 = 동적 참조·외부 소비 가능성이 있어 근거 약함.

## 0. knip 직접 실행 결과

- `npm run knip` 종료코드 0, 출력은 `npm notice run` 두 줄뿐 — 미사용 파일·export·의존성 0건. 문서의 "0건" 서술이 맞다.

## 1. knip.json 예외 전수

| 예외 | 대상 | 적힌 이유 | 실제 참조 grep | 여전히 필요한가 |
|---|---|---|---|---|
| `ignore: shared/lib/api-types.ts` | openapi-typescript 생성물 9,564줄 | 생성물(`knip.json`에 주석 없음. 이유는 `docs/superpowers/fable-review/findings/f-retained-decisions.md` V-06의 "생성물·수동 스크립트") | `git grep -l "api-types" -- '*.ts' '*.tsx'` 8개 파일(entities/admin·market·stats types, shared/lib/api-schema.ts 등)이 import | 파일 자체는 쓰이고 있다. 예외는 "생성물 내부의 미사용 export"를 가리기 위한 것 — 생성물이라 필요 |
| `ignoreFiles: scripts/visual-diff/sheet.mjs` | 수동 CLI | 수동 실행 스크립트 | package.json scripts·워크플로우 어디에도 없음. 호출처는 `scripts/visual-diff/README.md:21-22`(문서)뿐 (`git grep -n "sheet.mjs"`) | 예외 필요(문서로만 호출되는 수동 도구). 이 파일 자체가 삭제 후보인지는 아래 4번 |
| `ignoreDependencies: sharp` | 미설치 선언 의존성 | `shoot.mjs:4`·`sheet.mjs:7` 주석 "next의 전이 의존성" | `git grep -n "sharp" -- package.json` 0건(package.json에 없음). import는 scripts/visual-diff/shoot.mjs, sheet.mjs 2곳. `node_modules/sharp` 설치돼 있음(package-lock 0.34.5) | 예외 필요(전이 의존성에 기대는 구조). 대안은 devDependency 명시 |
| `ignoreIssues components/ui/**: exports, types` | shadcn 생성 컴포넌트 | 생성물 | 아래 8번: components/ui 15개 파일의 export 49개 전부 사용처 1곳 이상 | 현재 사용되지 않는 export는 없어 예외를 빼도 knip은 통과할 가능성이 높다(직접 제거 후 재실행은 하지 않음 — 확인 못 함) |
| `ignoreExportsUsedInFile: true` | 옵션 | - | - | 파일 내부에서만 쓰이는 export는 knip이 보지 않는다 (아래 10번 참고) |

## 2. `/** @public */` 태그 export 전수

- `git grep -n "@public" -- '*.ts' '*.tsx' '*.mjs'` 결과 1건만 존재.
- `entities/finance/index.ts:98` `isLiability` — 정의 `entities/finance/lib/aggregate.ts:38`, 내부 사용 `aggregate.ts:84,85,123,161,221`(같은 파일 내부 5곳). 파일 밖에서 `@entities/finance`로 import하는 곳은 0건(`git grep -nE "import.*isLiability"` → index.ts 재export만). `widgets/asset-overview/AssetOverviewParts.tsx`의 `isLiability`는 같은 이름의 별개 prop이다.
- 판단: 재export(`index.ts:99` 한 줄과 태그 주석 한 줄)가 삭제 후보. `aggregate.ts`의 함수 자체는 내부 사용이 있어 유지. 확신도 중(문서 `docs/agents/finance.md`가 "공개 API"로 명시했다고 주석에 적혀 있음).

## 7. tsconfig path alias 사용 파일 수

(`git grep -l "['\"]<alias>/" -- '*.ts' '*.tsx'`)

| alias | 사용 파일 수 |
|---|---|
| `@shared/*` | 431 |
| `@entities/*` | 351 |
| `@widgets/*` | 80 |
| `@features/*` | 52 |
| `@app/*` | 10 |
| `@/components/*` | 180 (components/ui 내부 3 + 그 외 177. 그 외는 전부 `@/components/ui/*` shadcn 컴포넌트 import) |
| `@/lib/*` | 13 (전부 components/ui 내부의 `@/lib/utils`; components/ui 밖 0개) |

- `lib/utils.ts`는 1줄 `export { cn } from '@shared/lib/utils'` 재export 파일. 소비처는 components/ui 13개 파일뿐. `components.json`(aliases.utils=`@/lib/utils`)이 shadcn 생성 코드 호환을 요구한다. `components.json`은 `"hooks": "@/hooks"` alias를 선언하지만 `hooks/` 디렉토리는 없고 tsconfig에도 `@/hooks` 경로가 없다 (`ls` 확인) — shadcn CLI가 `add` 시에만 읽는 값.
- `@/components/ui/*`는 사실상 `components/ui`의 정식 경로(177개 파일)라 "호환용"이 아니라 주 경로다. 삭제 불가.

## 8. shadcn components/ui 사용처

- components/ui 15개 파일 전부 외부 importer 1곳 이상(`git grep -lE "components/ui/<name>['\"]"`): alert-dialog 17, button-variants 21, button 62, card 29, checkbox 4, dialog 10, input 32, label 32, pagination 1(`shared/ui/PaginationBar.tsx`), popover 5, radio-group 3, select 25, skeleton 38, sonner 1(`app/layout.tsx`), switch 9.
- 사용처 0곳인 컴포넌트 파일: 없음. 1곳: pagination, sonner (둘 다 실제 사용 중이라 후보 아님).
- 파일 내 export 49개를 `git grep -lw <이름>`으로 센 결과 사용처 0인 하위 파트: 없음. 사용처 1곳뿐: Pagination 7개 파트(전부 PaginationBar에서 쓰임), SelectGroup·SelectLabel(`features/asset/save-asset/AssetFormFields.tsx` 1곳), Toaster. 사용처 2곳: DialogTrigger. 이미 사용하지 않는 파트는 정리돼 있다(`SelectSeparator`, `CardDescription` 등 shadcn 기본 파트는 파일에 없음).
- `button-variants.ts`(53줄)와 `button.tsx`는 별도 파일로 분리돼 있다(서버 컴포넌트용 분리로 보임, 확인은 안 함).

## 3. 정적 자산 (`public/`, 추적 파일 5개 전부)

`git grep -n "<파일명>" -- . ':!package-lock.json'`으로 센 결과.

| 파일 | 크기(B) | 참조 |
|---|---|---|
| `public/logo.png` | 39,546 | `<Image src="/logo.png">` 등 소스 7곳+ (login, pending, rejected, DashboardEmpty, ErrorDisplay, BrandWordmark, DesktopSidebar) |
| `public/icon-192.png` | 52,424 | `app/manifest.ts:14`, `entities/fcm/providers/FcmForegroundListener.tsx:26` |
| `public/icon-512.png` | 370,257 | `app/manifest.ts:19` (소스 참조 1곳) |
| `public/apple-touch-icon.png` | 46,156 | `app/layout.tsx:22` |
| `public/apple-touch-icon-precomposed.png` | 46,156 | 파일명 grep 0건(문서 포함). `md5`가 `apple-touch-icon.png`와 동일(cf8131a3...) |

- 미참조: `apple-touch-icon-precomposed.png` 1개(46,156B). 바이트 동일 복제본. 다만 iOS Safari가 홈 화면 추가 시 `/apple-touch-icon-precomposed.png`를 이름 규약으로 자동 요청하므로 소스 참조가 없어도 "동적 소비" 가능성이 있다 — 확신도 하(브라우저 규약상 소비 여부는 서버 로그로만 확인 가능, 확인 못 함).
- 참고: `public/` 밖 이미지·폰트 등 추적 바이너리는 `app/favicon.ico`(25,931B, Next 파일 규약으로 자동 사용) 1개뿐. `public/`에 manifest·robots·sw 파일은 없다(`app/manifest.ts`가 라우트로 생성).
- 이력 근거: `git log --follow` 결과 커밋 `271cbad1 fix(pwa): apple-touch-icon-precomposed.png 추가로 404 오류 해소` — 404 로그를 없애려고 의도적으로 추가한 파일이다. 삭제하면 해당 404가 재발할 수 있어 후보에서 사실상 제외(확신도 하).

## 4. 스크립트 호출처

husky·lint-staged: 없음(`git ls-files | grep -iE "husky|lint-staged"` 0건, package.json에 `prepare`·`husky`·`lint-staged` 0건). 즉 커밋 훅 호출처 없음.

### package.json scripts (16개)

| 스크립트 | 호출처 (`git grep`) | 판정 |
|---|---|---|
| `dev` | README.md:20, 문서 | 수동 |
| `build` | ci.yml:35, Dockerfile:37 | CI 사용 |
| `start` | **package.json 외 0건**. Dockerfile은 `CMD ["node","server.js"]`(standalone, `next.config.ts:6 output: "standalone"`) | 호출처 없음 (표준 Next 스크립트라 관례상 유지) |
| `lint` | ci.yml:29 | CI 사용 |
| `typecheck` | ci.yml:32, server-deploy.yml:32 | CI 사용 |
| `doctor` | eslint.config.mjs:6 주석, docs/agents/commands.md:3 목록 문구. 워크플로우는 `react-doctor.yml`이 액션을 직접 사용하고 SKILL도 `npx react-doctor@latest`를 직접 호출 | 문서·주석뿐 |
| `test` | package.json 외 0건 (watch 모드) | 호출처 없음 |
| `test:run` | server-deploy.yml:35, README.md:26, deploy/server/README.md:43 | CI 사용 |
| `test:coverage` | docs/agents/commands.md:3 목록 문구뿐. 이 스크립트만을 위한 devDependency `@vitest/coverage-v8` | 문서뿐 |
| `test:e2e` | docs/agents/commands.md:26,28 (CI 미실행으로 명시) | 문서뿐(수동 의도) |
| `fetch:spec` | docs/agents/commands.md:3 목록 문구뿐. 스크립트 본문은 `localhost:8080/8081` 필요 | 문서뿐(수동 의도) |
| `visual-diff` | docs/agents/commands.md:18, scripts/visual-diff/README.md | 문서뿐(수동 의도) |
| `a11y-check` | docs/agents/a11y.md:3, commands.md:19, `.claude/skills/ui-audit/SKILL.md:25` | 문서·스킬뿐(수동 의도) |
| `gen:types` | README.md:28, `shared/lib/api-schema.ts:2` 주석 등 | 문서뿐(수동 의도) |
| `knip` | ci.yml:32 | CI 사용 |

### scripts/ 파일

| 파일 | 줄 | 호출·import 경로 | 판정 |
|---|---|---|---|
| `scripts/fetch-spec.mjs` | 42 | package.json `fetch:spec` | 사용 |
| `scripts/shared/seed.mjs` | 94 | a11y-check/run.mjs:9, visual-diff/run.mjs:14·scenarios.mjs:4·fixtures/trading.mjs:3, `e2e/strategy.spec.ts:34,53,69` | 사용 |
| `scripts/a11y-check/run.mjs`·README | 310·44 | package.json `a11y-check` | 사용 |
| `scripts/visual-diff/run.mjs` | 237 | package.json `visual-diff`. proxy/fixtures/scenarios/shoot는 run.mjs가 import(run.mjs:10-15) | 사용 |
| `scripts/visual-diff/proxy.mjs`·`fixtures/api.mjs`·`fixtures/trading.mjs`·`scenarios.mjs`·`shoot.mjs` | 66·77·116·123·90 | 전부 run.mjs에서 import | 사용 |
| `scripts/visual-diff/sheet.mjs` | 78 | **README.md:21-22 문서뿐**. package.json·워크플로우·다른 스크립트 import 0건. knip.json `ignoreFiles`로 가려짐. 최종 변경 커밋 `88d3a4ff`(2026-10-03) | 문서뿐 — 삭제 후보(확신도 중: 문서에 사용법이 명시된 수동 도구) |

### .github/

| 파일 | 호출처 | 판정 |
|---|---|---|
| `.github/scripts/wait-reconcile.sh`(44줄) | server-deploy.yml:154,170, wait-reconcile.bats:5 | 사용 |
| `.github/tests/wait-reconcile.bats`(70줄) | server-deploy.yml:48 `bats .github/tests`(디렉토리 지정이라 파일명 grep으론 안 잡힘) | 사용 |
| `.github/tests/contract.bats`(15줄) | 위와 동일(디렉토리 실행) | 사용 |
| `.github/tests/stub/gh` | server-deploy.yml:44 shellcheck 대상, wait-reconcile.bats가 PATH 스텁으로 사용 | 사용 |
| `.github/workflows/{ci,react-doctor,server-deploy}.yml` | GitHub이 직접 읽음 | 사용 |

### .claude/ (참고)
- `.claude/hooks/block-env-local.sh` ← `.claude/settings.json:14` PreToolUse 훅이 호출. 사용.
- `.claude/skills/*`·`.claude/agents/*`는 Claude Code가 자동 로드하는 위치(추적 파일 21개). 호출처 grep 대상이 아니라 판정하지 않음.

## 5. 설정 파일 ↔ 읽는 도구

| 설정 | 읽는 도구 (package.json 근거) | 비고 |
|---|---|---|
| `tsconfig.json` | typescript(devDep), next | - |
| `next.config.ts` | next | - |
| `eslint.config.mjs` | eslint, typescript-eslint, @next/eslint-plugin-next 등(devDep) | - |
| `postcss.config.mjs` | `@tailwindcss/postcss`(devDep) | - |
| `vitest.config.ts`, `vitest.setup.ts` | vitest, jsdom, @testing-library/* | setup은 config가 참조 |
| `playwright.config.ts` | `@playwright/test`(devDep) | - |
| `knip.json` | knip(devDep) | - |
| `components.json` | `shadcn`(dependencies) CLI. `shadcn`은 `app/globals.css:4 @import "shadcn/tailwind.css"`로도 사용 | `aliases.hooks: "@/hooks"`는 대응 디렉토리·tsconfig alias 없음 |
| `doctor.config.json` | react-doctor는 package.json에 없고 `npx react-doctor@latest`로만 실행. `~/.npm/_npx/.../react-doctor/dist`에 `doctor.config.json` 문자열이 13회 존재해 읽는 파일명임을 확인 | 읽는 도구는 npx(비고정 버전) |
| `.react-doctor/false-positives.md`(5줄) | **읽는 도구·참조 0건**. `git grep "false-positives"` 파일 자신 외 0건, npx 캐시 react-doctor에도 0건 | 사람이 보는 메모. 삭제 후보(확신도 중 — SKILL이 받아오는 원격 플레이북이 이 경로를 쓰는지는 확인 못 함) |
| `.prettierrc` | **prettier는 package.json·package-lock·node_modules에 없음**. `eslint.config.mjs`에도 prettier 연동 0건. 에디터·`npx prettier`가 읽을 때만 효과 | 읽는 도구 미설치. docs/agents/constraints.md가 "`.prettierrc` 기준"이라 명시 — 삭제하면 에디터 포맷이 바뀜(확신도 하) |
| `.dockerignore` | docker build(Dockerfile 존재) | 7줄 중 `.env*.local` 마지막 줄에 개행 없음 |
| `.gitattributes` | git | - |
| `Dockerfile` | docker build ← server-deploy.yml, root docker-compose.yml | - |
| root `docker-compose.yml`(23줄) | README.md:111 `docker compose up -d --build`, docs/agents/deployment.md:6,21 — 로컬 Docker용 | 사용 중(문서). `TRADING_API_BASE_URL`이 없음 — `getTradingApiBaseUrl()`(shared/lib/env.ts)은 미설정 시 throw. 이 compose로 띄우면 trading 호출은 실패할 가능성(실행은 안 함) |
| `deploy/server/docker-compose.yml`(42줄) | kista-infra 배포 번들(deploy/server/README.md:10), contract.bats | 사용 |
| `deploy/server/{bluegreen,required-env,roles}` | kista-infra `reconcile.sh`가 읽음(contract.bats:2-13이 내용 고정). 레포 안 소비처는 테스트뿐 | 외부 소비라 확인 못 함 |
| `openapi.json` | `gen:types`의 입력, `fetch:spec`의 출력 | - |
| `tsconfig.tsbuildinfo`·`next-env.d.ts`·`.env` | 추적 안 됨(`.gitignore`) | 대상 아님 |

같은 설정이 두 곳에 있는 것:
- **NEXT_PUBLIC_* 9개 키 목록**이 `.env.example`, `.env.production.public`, `Dockerfile`(ARG 9+ENV 9), root `docker-compose.yml`(build args 9), `server-deploy.yml:102-113`(build-args 9)에 각각 선언 (`git grep -lw NEXT_PUBLIC_FIREBASE_APP_ID`로 5곳 확인). 키 추가 시 5곳 동시 수정 필요.
- `docker-compose.yml`(root, 로컬 빌드)과 `deploy/server/docker-compose.yml`(운영 번들)은 같은 서비스 `kista-ui`의 별개 정의. 역할이 달라 중복이라기보다 변형.
- E2E 기본 API 주소(`http://localhost:8080`, `:8081`)가 `playwright.config.ts:7-8`, `e2e/global.setup.ts:4-5`, `tests/e2e/account-cache-consistency.spec.ts:21`에 각각 하드코딩.
- vitest는 `e2e/**`·`tests/e2e/**` 제외(`vitest.config.ts:14`), playwright는 두 디렉토리를 모두 사용(`e2e/`, `tests/e2e/`) — e2e 파일이 두 디렉토리에 나뉨.

## 12. 환경변수 소비처

(`git grep -lw <키>`, 테스트 제외 소스 / 선언처)

| 키 | 소스 소비처 | 선언처 | 판정 |
|---|---|---|---|
| NEXT_PUBLIC_KAKAO_CLIENT_ID | app/(auth)/login/page.tsx (4회 참조) | .env.example, .env.production.public, server-deploy.yml, Dockerfile, docker-compose.yml | 사용 |
| NEXT_PUBLIC_API_BASE_URL | shared/lib/env.ts, app/auth/callback/route.ts, scripts/visual-diff/run.mjs | 7곳(ci.yml 포함) | 사용 |
| API_BASE_URL | shared/lib/env.ts, app/auth/callback/route.ts, playwright.config.ts, visual-diff/run.mjs (소스 11회) | deploy compose, root compose, required-env | 사용 |
| TRADING_API_BASE_URL | shared/lib/env.ts, playwright.config.ts, visual-diff/run.mjs | .env.example, deploy compose (root compose 없음) | 사용 |
| NEXT_PUBLIC_TRADING_API_BASE_URL | shared/lib/env.ts(폴백), visual-diff/run.mjs | **선언처 0곳**(.env.example·Dockerfile·compose·workflow 어디에도 없음) | 폴백 전용 — env.ts의 `|| process.env.NEXT_PUBLIC_TRADING_API_BASE_URL` 제거 후보(확신도 중: 로컬 `.env`에 개인 설정이 있을 수 있음, 확인 못 함) |
| NEXT_PUBLIC_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID | shared/lib/firebase.ts, app/firebase-messaging-sw.js/route.ts (각 2곳) | 5곳 | 사용 |
| NEXT_PUBLIC_FIREBASE_VAPID_KEY | entities/fcm/api/index.ts (1곳) | 5곳 | 사용 |
| DEPLOYMENT_VERSION | next.config.ts (1곳) | Dockerfile:15-16, server-deploy.yml:103 | 사용 |
| UI_DOMAIN | 소스 0 | required-env, deploy compose 주석, README — kista-infra Caddy가 소비(레포 밖, 확인 못 함) | 외부 소비 |
| KISTA_UI_IMAGE | 소스 0 | deploy/server/docker-compose.yml:9, contract.bats | compose 변수 |
| E2E_PORT / E2E_API_BASE / E2E_TRADING_API_BASE | playwright.config.ts, e2e/global.setup.ts, tests/e2e | 선언 문서 없음(코드 기본값) | 사용 |
| KISTA_DEV_SEED | scripts/shared/seed.mjs | scripts/visual-diff/README.md | 사용 |

- 소비처 없는 키(선언만 있고 소스 0): `UI_DOMAIN`·`KISTA_UI_IMAGE`(둘 다 인프라 변수, 레포 안에서 코드 소비가 없는 게 정상). 선언은 없고 소비만 있는 키: `NEXT_PUBLIC_TRADING_API_BASE_URL`, `E2E_*`, `KISTA_DEV_SEED`.
- `.env.production.public`은 9개 값이 평문 커밋(파일 헤더에 "공개 빌드값"이라 명시). server-deploy.yml:90가 빈 값이면 빌드 실패시킨다.

## 6. 의존성 import 사용처 수

측정: `git grep -lE "(from |import |import\(|require\(|mock\()['\"]<pkg>(/...)?['\"]" -- '*.ts' '*.tsx' '*.mjs' '*.js'` 파일 수. knip 0건과 모순 없음(미사용 의존성 없음).

사용처 1~2곳뿐인 의존성(대체 가능성 판단용 사실만):

| 패키지 | 구분 | import 파일 수 | 사용처 |
|---|---|---|---|
| clsx | dep | 1 | `shared/lib/utils.ts` (cn) |
| tailwind-merge | dep | 1 | `shared/lib/utils.ts` (cn) |
| geist | dep | 1 | `app/layout.tsx:2` (`geist/font/mono`) + `app/globals.css:12` 변수 |
| lightweight-charts | dep | 1 | `widgets/dashboard/MarketChartCardInner.tsx` |
| undici | dep | 2 | `app/api/auth/status-stream/route.ts`, `app/api/trades/stream/route.ts` (SSE `bodyTimeout` 비활성화용 Agent·fetch, 주석 근거) |
| @testing-library/jest-dom | dev | 1 | `vitest.setup.ts` |
| @vitejs/plugin-react | dev | 1 | `vitest.config.ts` |
| @next/eslint-plugin-next | dev | 1 | `eslint.config.mjs` |
| eslint-plugin-jsx-a11y / eslint-plugin-react-hooks | dev | 각 1 | `eslint.config.mjs` |
| typescript-eslint | dev | 2 | `eslint.config.mjs`, `shared/lib/query/cacheArchitecture.test.ts` |
| class-variance-authority | dep | 3 | `components/ui/button.tsx`, `button-variants.ts`, `shared/ui/Badge.tsx` |

import가 0이지만 설정·스크립트로 쓰이는 것: react-dom(next·react 짝 의존, 소스 import 0 — `git grep "react-dom" -- '*.ts' '*.tsx'` 0건), shadcn(`app/globals.css:4`), tw-animate-css(globals.css), @tailwindcss/postcss·postcss(postcss.config.mjs), @types/*(타입), jsdom(vitest 환경, vitest.config.ts), openapi-typescript(`gen:types` 스크립트), knip(ci.yml), eslint·typescript(CLI), **@vitest/coverage-v8(`test:coverage` 스크립트 하나에서만 사용 — 그 스크립트는 문서 목록 문구뿐, 4번 참고)**.

참고: `sharp`는 package.json에 없는데 scripts/visual-diff 2개 파일이 import(1번 참고).

## 9. 오래된 산출물·흔적

- 추적 파일 대상 패턴 검색: `git ls-files | grep -E "\.(bak|orig|log|tmp|swp|snap|DS_Store)$|\.original\.md$|\.gitkeep$|test-results|\.tsbuildinfo|^out/|^build/|coverage/|__snapshots__|~$"` → 0건. 추적 중인 빌드 산출물·로그·스크린샷·백업·스냅샷·`.gitkeep` 없음. 스냅샷 파일 자체가 없어 "대응 테스트 없는 스냅샷"도 없다.
- `test-results/`, `tsconfig.tsbuildinfo`, `.idea/`, `.superpowers/`, `.worktrees/`는 디스크에 있으나 `.gitignore`(`git check-ignore -v`로 확인)로 추적 제외.
- 빈 디렉토리(`find . -type d -empty`, node_modules·.next·.git 제외): `./.worktrees`, `./.claude/worktrees` — 둘 다 추적 안 됨(git은 빈 디렉토리를 추적하지 않음). 삭제 대상 아님.
- `docs/` 안의 이미지·첨부: 추적 파일 중 `.md`가 아닌 파일 0건 → 미참조 이미지 없음. (`.gitignore`가 `docs/superpowers/audit/screenshots/`를 제외)
- `docs/agents/*.md` 16개는 전부 CLAUDE.md import나 다른 문서에서 파일명 참조됨(`git grep -F <파일명>` 1곳 이상).
- `.claude/skills/playwright-cli/references/*.md` 10개(총 약 1,500줄)는 전부 `.claude` 안에서 `references/<파일>`로 참조됨.
- **`docs/superpowers/{specs,plans,audit}`: 73개 파일, 31,419줄, 1,490,841B.** 그중 plans 33개 전부와 specs 대부분은 `archive/` 하위. 이 73개 파일명을 `docs/superpowers/{specs,plans,fable-review}` 밖에서 `git grep -F`한 결과 **참조 0건**(`.github/workflows/server-deploy.yml:116`·`deploy/server/README.md:41`이 가리키는 것은 별개 레포 kista-infra의 spec). 완료된 계획·설계 기록이라 삭제보다 doc-tidy 대상 — 후보로 올리되 확신도 중(이력 보존 가치 판단은 사람 몫).
  - 큰 것: `plans/archive/2026-10-18-crypto-upbit-dca-ui.md` 111,365B, `plans/archive/2026-10-13-dca-strategy-ui.md` 99,482B, `plans/archive/2026-07-17-strategy-stats.md` 85,685B.
- `docs/superpowers/fable-review/`는 추적되지 않는 이번 리뷰 산출 디렉토리(git status `??`)이므로 대상 아님.
- 추적 파일 중 큰 것(참고): package-lock.json 471,196B, public/icon-512.png 370,257B, shared/lib/api-types.ts 300,611B(생성물), openapi.json 183,874B(생성물 입력).

## 10. 테스트 전용으로만 살아 있는 제품 코드

방법: 임시 node 스크립트(`.../scratchpad/testonly.mjs`)로 추적 `*.ts|tsx|mjs` 1,162개 중 import 그래프(상대경로·`@alias`·`index.ts` 배럴·동적 `import()`·`vi.mock` 해석)를 만들고, (a) 제품 파일 중 import하는 곳이 테스트뿐인 파일, (b) export 이름이 다른 제품 파일에서 쓰이지 않고(import·re-export 문 제거 후 단어 일치) 테스트에서만 쓰이는 export를 뽑았다. 한계: 이름 기반이라 동명 식별자·주석 언급은 사용으로 오인돼 누락될 수 있다(보수적). 스크립트의 spread(`...fn(`) 처리 결함으로 나온 오탐 1건(`cryptoPricesQueryOptions`: `widgets/strategy-detail/DcaStrategyDetail.tsx:46`에서 사용)은 `git grep -nw`로 확인해 제외했다. 나머지는 아래 대표 항목을 `git grep -nw`로 재확인했다.

### (a) 테스트 전용 파일
- 제품 코드 import 0, 테스트 import만 있는 파일: `entities/meta/__fixtures__/testMeta.ts`(120줄, 테스트 30개가 import), `features/strategy/create-strategy/sections/__fixtures__/dcaTestMeta.ts`(7줄, 5개). 둘 다 이름부터 테스트 픽스처 — 삭제 후보 아님.
- 제품 파일 중 import도 test import도 없는 고아 파일: 0개(진입점인 app 라우트·proxy.ts 제외).

### (b) export만 테스트에서 쓰이는 것 (파일 줄 수 = 소속 파일 전체)
| 위치 | 줄 | 상태 |
|---|---|---|
| `shared/lib/format/index.ts:21` `fmtCompactUsdNarrow` | 188 | 정의 1곳 + `index.test.ts`만. 파일 안 호출도 0(`git grep -nw`) — **함수 자체가 제품에서 죽음**(4줄, 대응 테스트 describe `index.test.ts:204`) |
| `entities/stats/model/types.ts:99` `CurrentExchangeRate`, `:100` `HousingBenchmarkStrategy` | 117 | 선언 1줄씩 + `useHousingBenchmarkQuery.test.tsx` import만 — 제품 사용 0 |
| 같은 파일 `HousingBenchmarkPeriod`(:103), `HousingBenchmarkQuality`(:106) | 117 | 선언 외 파일 내부 참조 있음, 파일 밖은 테스트뿐 |
| `entities/trade/hooks/useDailyTradesRangeQuery.ts:32` `summarizeDailyTrades` | 68 | 파일 내부 호출(:63) 있음, 외부는 테스트 — export 키워드만 테스트용 |
| `entities/stats/hooks/useStatsCurrency.ts` `resolveStatsCurrency` | 22 | 동일(순수함수 추출) |
| `widgets/strategy-detail/NextOrderCard.tsx:71` `executedHeaderLabel` | 265 | 동일(내부 :88 사용) |
| `widgets/layout/TradeNotificationBridge.tsx:13` `TRADE_DEPENDENT_KEYS` | 35 | 동일(내부 :27 사용) |
| `shared/lib/subviewHistory.ts` `pushSubviewEntry`(:16), `SUBVIEW_HISTORY_KEY` | 62 | 동일(내부 :40 사용) |
| `shared/lib/query/createQueryClient.ts` `QUERY_DEFAULT_STALE_TIME`, `QUERY_DEFAULT_GC_TIME` | 18 | 동일 |
| `entities/finance/lib/aggregate.ts:181` `calcComposition` | 272 | 내부 재귀·호출만(:208), 외부는 테스트 |
| `entities/finance/lib/period.ts:50` `windowRange`, `yearsRange` | 147 | 내부 사용, 외부는 테스트(주석 언급은 `useFinanceQueries.ts:33`) |
| `entities/finance/lib/budgetRoutes.ts:10` `flowTypeSlug` | 34 | 내부(:20) 사용 |
| `entities/finance/lib/flowAggregate.ts` 타입 `BudgetProgress` | 297 | 내부 4곳, 외부는 테스트 |
| `features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.ts` `reconfigureVrFormSchema` | 69 | 제품은 `createReconfigureVrFormSchema`만 사용(`ReconfigureVrForm.tsx:26`), 이 상수는 테스트(`reconfigureVrFormSchema.test.ts:2,6`)만 |
| 타입 `DcaLabelOf`(entities/strategy/model/dcaFormat.ts:56), `BuildStrategyPayloadInput`, `VrDerivedInput`, `entities/order/index.ts:9` 재export `DirectionReadiness` | - | 파일 내부 시그니처에서만 쓰임, 외부는 테스트 |
| `app/**/page.tsx`·`layout.tsx` 컴포넌트 5개(AdminLayout, LoginPage, AccountEditPage, AccountDetailPage, DashboardPage) | - | Next 진입점이 import — 제외 |

- 판단: 대부분은 "테스트하려고 export를 붙인" 패턴으로 삭제가 아니라 `export` 제거(테스트 이동 필요) 대상이라 확신도 하. **진짜 죽은 코드**는 `fmtCompactUsdNarrow`, `CurrentExchangeRate`, `HousingBenchmarkStrategy`, `reconfigureVrFormSchema`(상수) 4개 — 제품 참조 0.
- knip이 못 잡는 이유: knip은 테스트 파일도 진입점으로 보므로 테스트가 import하면 "사용됨"으로 처리한다.

## 11. 죽은 라우트 후보

방법: `app/**/page.tsx|route.ts` 전수(page 약 56개, route handler 약 25개)에 대해 경로 문자열을 제품 소스(테스트 제외)에서 `git grep -F`했다(href·`router.push`·`redirect`·`clientFetch('/api/...')`·상수 포함, 총 링크류 호출 98줄). 동적 세그먼트는 고유 꼬리 세그먼트(`/inject-capital`, `/reconfigure-vr`, `/withdraw-capital`, `/strategies/new`, `/edit`)로 확인.

- 앱 내부 링크 근거가 없는 page 라우트: **0개**. 대표 확인: `/finance/bulk-register` ← `widgets/asset-settings/AssetSettingsPanel.tsx:28`, `/admin/*` ← `widgets/layout/AdminSidebar.tsx:12-17`·`AdminTopBar.tsx`, `/admin/pending` ← `widgets/admin-user-list/AdminOverviewContent.tsx`, `/accounts/new` ← `features/account/create-account/NewAccountButton.tsx`, `/finance/{expense,income,saving,settings}` ← `FinanceHeader.tsx`·`DesktopSidebar.tsx`, `/stats/{backtest,benchmark}` ← `StatsHeader.tsx`, `/pending`·`/rejected` ← `app/auth/callback/route.ts`·`proxy.ts`, `/login` ← `(main)/layout.tsx`.
- `@modal` 인터셉트 라우트 9개(`app/(main)/@modal/(.)...`)와 `@modal/[...catchAll]`는 같은 URL의 모달 변형이라 링크 대상이 별도로 있지 않다 — 직접 URL 진입 시에는 일반 page가 렌더됨(구조상 사실, 동작 실행은 안 함).
- API route handler 중 클라이언트 코드 참조 0: `/api/health` — 소스 참조 0이나 `deploy/server/docker-compose.yml`의 healthcheck(`wget http://127.0.0.1:3000/api/health`)가 소비하므로 사용 중. 그 외 `/api/*`는 `entities/*/api`에서 각 1곳 이상 참조(accounts 8, admin 9, auth/logout 3, auth/me 4, auth/reapply-done 1, auth/refresh 4, auth/status-stream 2, backtest 3, client-errors 2, crypto-market-indicators 3, daily-trades 3, fcm/tokens 2, finance 3, market 5, orders 3, runtime-config 2, settings 2, stats 5, trades/stream 2, trading-cycles 6). 확인 못 한 것: `/api/runtime-config`·`/api/client-errors` 등의 서버 측 외부 호출자(레포 밖).
- `app/firebase-messaging-sw.js/route.ts`, `app/manifest.ts`, `app/auth/callback`: 브라우저/OAuth가 직접 요청하는 규약 경로.

## 13. 종합 표 (삭제 후보)

확신도 상 = 제품 참조 0이 명령으로 확인되고 외부·동적 소비 가능성 낮음. 이 레포는 knip 0건에 정적 자산·고아 파일이 없어 '상'이 적다.

| # | 경로 | 크기·줄 | 근거 명령 → 결과 | 확신도 |
|---|---|---|---|---|
| 1 | `shared/lib/format/index.ts` `fmtCompactUsdNarrow`(+테스트 `index.test.ts:204` describe) | 함수 4줄 | `git grep -nw fmtCompactUsdNarrow -- '*.ts' '*.tsx'` → 정의 1 + 테스트만 | 상 |
| 2 | `entities/stats/model/types.ts:99-100` `CurrentExchangeRate`·`HousingBenchmarkStrategy` | 각 1줄 | `git grep -nw` → 선언 + `useHousingBenchmarkQuery.test.tsx`만 | 상 |
| 3 | `features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.ts` 상수 `reconfigureVrFormSchema` | 69줄 파일 중 일부 | 제품은 `createReconfigureVrFormSchema`만(`ReconfigureVrForm.tsx:26`), 상수는 테스트만 | 상 |
| 4 | `shared/lib/env.ts` `NEXT_PUBLIC_TRADING_API_BASE_URL` 폴백 | 1식 | `git grep -lw NEXT_PUBLIC_TRADING_API_BASE_URL` → env.ts, visual-diff/run.mjs뿐, 선언처 0 | 중(로컬 `.env` 개인 설정 확인 못 함) |
| 5 | `entities/finance/index.ts:98-99` `isLiability` 재export + `@public` 주석 | 2줄 | `git grep -nE "import.*isLiability"` → 외부 import 0 | 중(문서가 공개 API로 명시) |
| 6 | `scripts/visual-diff/sheet.mjs` + knip.json `ignoreFiles` 항목 | 78줄 | `git grep -n "sheet.mjs"` → README.md:21-22뿐 | 중(문서화된 수동 도구) |
| 7 | package.json `"start"` 스크립트 | 1줄 | `git grep -n "next start\|npm start\|npm run start"` → package.json뿐, Dockerfile은 `node server.js` | 중(Next 표준 관례) |
| 8 | package.json `"test"`(watch) 스크립트 | 1줄 | `git grep -n "npm test\|npm run test\b"` → 0 | 중(개발자 수동 사용) |
| 9 | `test:coverage` 스크립트 + devDep `@vitest/coverage-v8` | 1줄+1의존성 | 문서 목록 문구(commands.md:3)뿐 | 중 |
| 10 | `.react-doctor/false-positives.md` | 5줄 | `git grep "false-positives"` → 자기 자신뿐, react-doctor npx 패키지에도 0 | 중(원격 플레이북 사용 여부 확인 못 함) |
| 11 | `docs/superpowers/{specs,plans,audit}` 73개 | 31,419줄·1.49MB | 파일명 `git grep -F`를 docs/superpowers 밖에서 → 참조 0 | 중(이력 보존 판단 필요) |
| 12 | knip.json `ignoreIssues components/ui/**: exports,types` | 설정 5줄 | components/ui export 49개 전부 사용처 1+ → 예외 불필요 가능(제거 후 knip 재실행은 안 함) | 중 |
| 13 | `components.json` `aliases.hooks: "@/hooks"` | 1줄 | `hooks/` 디렉토리·tsconfig alias 없음(`git grep "@/hooks"` → components.json뿐) | 하(shadcn CLI가 읽는 값) |
| 14 | `.prettierrc` | 5줄 | prettier가 package.json·lock·node_modules에 없음 | 하(에디터·문서가 사용) |
| 15 | `public/apple-touch-icon-precomposed.png` | 46,156B | 파일명 참조 0, `apple-touch-icon.png`와 md5 동일 | 하(커밋 271cbad1이 404 해소용으로 추가한 파일 — iOS가 이름 규약으로 요청) |
| 16 | `deploy/server/{bluegreen,required-env,roles}` | 3·2·1줄 | 레포 내 소비는 contract.bats뿐 | 하(kista-infra reconcile.sh가 읽음 — 외부 소비) |
| 17 | `entities/meta/__fixtures__/testMeta.ts`, `.../dcaTestMeta.ts` | 120·7줄 | 테스트만 import | 하(테스트 픽스처, 삭제 아님) |
| 18 | `export` 키워드만 제거 가능한 테스트 전용 export 약 20개 | 10절 표 | 10절 참조 | 하(테스트 이동 필요) |

범주별 후보 수: 코드 죽은 심볼 3(상 3), 설정·env 4~5(중 3, 하 2), 스크립트·의존성 5(중 4), 정적 자산 1(하), 문서·메모 2(중 2), 테스트 전용 export 약 20(하).
미확인 사항: knip.json 예외를 실제로 제거해 재실행하는 검증, 서버 로그(`/apple-touch-icon-precomposed.png` 요청 여부), kista-infra 쪽 소비 여부.
