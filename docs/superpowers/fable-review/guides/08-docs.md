# 08. 문서 정리 — 코드와 도구가 말하는 것은 문서에서 지운다

근거 측정: `findings/h-docs-drift.md`(드리프트·중복·로드 비용), `findings/f-retained-decisions.md`(확정 결정 약 357건).

**삭제·대량 개편은 사용자 승인 뒤에 실행한다(아래 "사용자 결정").**

## 현재 구조와 문제

문서 지도:

| 묶음 | 파일 | 줄 | 로드 |
|---|---:|---:|---|
| 루트 `CLAUDE.md` + `@import` 3개(commands·architecture·constraints) | 4 | 132 (10.9KB) | 매 세션 |
| 디렉토리 `CLAUDE.md` | 22 | — | 그 디렉토리 파일을 다룰 때 |
| `docs/agents/*.md` | 16 | 580 (116KB) | 13개는 `@import`로 자동, 3개(strategy·finance-widgets·deployment)는 수동 |
| `docs/superpowers/{plans,specs}/archive`, `audit` | 73 | 31,419 (1.49MB) | 로드 안 됨 |
| memory | 8 + 인덱스 | — | 인덱스만 자동 |
| `.claude/agents`·`skills` | — | — | 호출 시 |

작업 위치별 실제 로드량(전역 `~/.claude/CLAUDE.md` 16.6KB 별도):

| 작업 위치 | 줄 | 바이트 |
|---|---:|---:|
| 루트만 | 132 | 10,943 |
| widgets | 239 | 32,062 |
| features/finance | 239 | 44,672 |
| entities/finance | 256 | 42,516 |
| shared | 263 | 31,037 |

문제:

- **한 줄이 문단이다.** 자동 로드 문서 13개 494줄이 86.9KB다. 800바이트를 넘는 줄 18개가 31%를 차지한다. 규칙 하나에 배경·사례·예외·파일 경로가 한 줄로 붙어 있어 규칙을 찾기 어렵다.
- **코드와 어긋난 서술 10건**(`findings/h` 2-2절): 이름이 바뀐 `fmtSignedPct`(copy.md:14), 위치가 틀린 이상감지 카드(widgets.md:61), `(main)` layout의 `force-dynamic`(app.md:39), SSE `@ts-ignore`(app.md:32), `isJwtExpired`(widgets/dashboard/CLAUDE.md:3), 일부만 담은 슬라이스 구조 블록(entities.md:17-26), README의 "lint 0 errors". 도구 설정 3건: `fsd-boundary-checker`가 허용 방향 import를 위반으로 보고, `dto-sync-check`가 없는 `lib/CLAUDE.md`를 참조, `fsd-scaffold` 템플릿이 문서 규범과 다른 구조를 만든다.
- **중복 15묶음**: FSD 규칙이 10곳, 401 로그아웃 루프가 4곳, "필수 Read" 포인터 블록이 3개 레이어 문서에 같은 형식으로, README가 아키텍처·인증·SSE·배포를 요약 사본으로 보유(약 25줄).
- **정본이 순환한다.** 캐시·무효화·refresh는 app.md·entities.md·shared.md가 서로 "저쪽이 SSOT"라고 가리킨다. 가계부 규칙은 5층에 흩어져 있다(finance.md, finance-widgets.md, finance-group-share.md, 슬라이스 CLAUDE.md 7개, 레이어 문서의 포인터). `finance.md`·`strategy.md`는 루트가 "자동 로드 아님"이라 적는데 일부 디렉토리 CLAUDE.md가 `@import`한다.
- **import만 하는 파일 8개.** 레이어 CLAUDE.md 5개는 같은 고정 문장과 `@import` 2~4줄이다.
- **끝난 작업 기록**: archive 71파일 31,230줄. 살아 있는 문서가 참조하는 곳은 memory 3건뿐이다. 자동 로드 문서 안의 날짜 박힌 과거 서사 9줄, "예전에는 ~였다" 류 약 51줄.
- **문서가 도구의 일을 한다.** 계층 방향, stale time 표(24행), 표 정렬, 토스트 마침표, 인터셉트 라우트 조립법처럼 코드나 lint로 강제할 수 있는 규칙을 문서가 설명하고 사람(과 에이전트)이 지킨다.

## 목표 구조

### 문서에 남는 것의 기준

문서에는 **코드를 읽어서는 알 수 없고 도구가 강제할 수 없는 것**만 남긴다.

| 종류 | 처리 |
|---|---|
| 코드만 봐서는 알 수 없는 제약과 그 이유(외부 계약, 운영 사고에서 나온 금지, 사용자 결정) | 남긴다. 규칙 한 줄 + 이유 한 줄 |
| lint·typecheck·knip·테스트·컴포넌트 구조가 강제하는 것 | 지운다. 강제 수단이 없으면 먼저 수단을 만든다(03 lint 경계, 06 프리미티브, 02 `setQueryDefaults`) |
| 디렉토리 구조, 타입·함수 설명, `package.json`과 같은 내용 | 지운다 |
| 과거 서사(언제 무엇을 바꿨다, 어떤 버그가 있었다) | 규칙의 이유로 필요한 한 구절만 남기고 지운다. 이력은 git이 갖는다 |
| 끝난 계획·설계·감사 | 지운다(git 이력에 남는다) |

### 문서 배치

```text
CLAUDE.md                     프로젝트 개요, 작업 방식(이 프로젝트 고유분), 문서 지도. @import 3개
docs/agents/
  commands.md                 명령·검증·개발 환경 quirk            (매 세션)
  architecture.md             네 범위와 의존 방향, 인증 라우팅, 데이터 흐름 한 장  (매 세션)
  constraints.md              Git, 포맷, 스타일링 원칙               (매 세션)
  ui.md                       카피·접근성·표기 중 도구가 못 잡는 것   (screens·domains·shared에서)
  deployment.md               배포·환경변수                         (수동)
domains/<도메인>/CLAUDE.md     그 도메인의 quirk 본문(있는 도메인만: strategy, finance, account)
screens/<화면>/CLAUDE.md       그 화면의 quirk 본문(있는 화면만)
```

- 디렉토리 `CLAUDE.md`는 본문을 직접 담는다. `@import`만 하는 파일을 두지 않는다. 문서가 코드 옆에 있어야 코드와 같이 고쳐진다.
- `docs/agents`의 레이어 문서 5개(app·entities·features·widgets·shared)는 03 이후 계층이 없어지므로 지운다. 남길 내용은 `architecture.md`(구조), `ui.md`(화면 공통 규칙), 도메인 `CLAUDE.md`(도메인 quirk)로 나눠 옮긴다.
- `copy.md`·`a11y.md`·`react-query.md`는 `ui.md` 하나로 합친다. 06·04·02에서 프리미티브와 전역 처리로 옮겨간 규칙(토스트 마침표의 레이어 구분, `onError` 덮어쓰기 금지, 오류 화면 판정식, 표 region 속성)은 지운다.
- `finance.md`·`finance-widgets.md`·`finance-group-share.md`·슬라이스 CLAUDE.md 7개는 `domains/finance/CLAUDE.md` 하나로 합친다. `strategy.md`는 `domains/strategy/CLAUDE.md`가 된다. 05에서 서버로 옮겨간 규칙(집계, 상태 판정, 검증)에 대한 서술은 지운다.
- 정본은 주제당 한 곳이다. 다른 문서는 본문을 반복하지 않고 경로만 적는다.
- 한 줄은 규칙 하나다. 문단형 한 줄을 "규칙 / 이유 / 참고 위치" 세 줄 이내로 쪼갠다.

### 다른 레포와의 연결

- UI·API 책임 분담 원칙은 `kista-api/docs/agents/ui-api-contract.md`가 정본이다(api 지침서 10의 T9로 옮겨진 뒤). kista-ui 루트 `CLAUDE.md`에 "API 응답·목록·메타·오류 문구·검증 위치를 다루는 작업이면 이 파일을 Read"를 한 줄로 넣는다. 내용을 복사하지 않는다.
- `docs/agents/constraints.md`의 "kista-api 연계 작업이면 `../kista-api/CLAUDE.md` Read"와 합쳐 한 항목으로 둔다.

### README

개요·기술 스택·실행 방법·배포 한 문단만 둔다. 아키텍처·인증·SSE 요약 사본을 지우고 `docs/agents/architecture.md`를 가리킨다. 루트 `CLAUDE.md`의 "README 드리프트 감지" 규칙은 사본이 없어지면 대상이 스택 배지 버전뿐이라 한 구절로 줄인다.

### 도구 설정

- `.claude/agents/fsd-boundary-checker`, `.claude/skills/fsd-scaffold`, `.claude/skills/dto-sync-check`: 지운다. 각각 03의 lint 경계, 03의 구조 단순화, 01의 생성 타입 직접 사용이 대신한다. 03·01 실행 전이라도 세 도구는 지금 잘못된 결과를 내므로(위 드리프트 3건) 먼저 지워도 손해가 없다.
- `.claude/agents/next-component-boundary`, `ui-markup-specialist`, `.claude/skills/{ui-audit, typecheck-and-report, playwright-cli}`: 이 지침서의 판정 대상이 아니다(측정하지 않았다). 태스크 1에서 사용 여부를 사용자에게 묻는다.

### memory

- `project_done_do_not_redo.md`: 완료 기록 6건 중 "다시 제안하지 말 것"의 근거가 코드에 드러나지 않는 것만 남긴다(빗썸 연동 안 함, 대시보드 총자산 KPI 재제안 금지). 나머지 완료 기록은 지운다. 가계부 내용이 가리키는 문서 경로를 고친다.
- `project_ios_pwa_viewport_bugs.md`: 해결된 Bug A의 이력 약 10줄을 지우고 미해결 Bug B만 남긴다.
- `verify_local_api_constraint.md`와 `commands.md`의 e2e 전제("로컬 api가 떠 있어야 한다")는 충돌이 아니라 주어가 빠진 것이다. `commands.md`에 "사용자가 기동한 로컬 api"로 적는다.
- `feedback_orchestrate_subagents.md`의 "FSD 영역별" 표현은 03 뒤에 "도메인·화면별"로 고친다.

### 목표 수치

| 지표 | 현재 | 목표 |
|---|---:|---:|
| 매 세션 로드 | 132줄 / 10.9KB | 110줄 이하 / 8KB 이하 |
| 디렉토리 작업 시 로드(최대) | 263줄 / 44.7KB | 200줄 이하 / 20KB 이하 |
| 800바이트 초과 줄 | 18개 | 0 |
| `CLAUDE.md` 수 | 23 | 약 8(루트 + quirk가 있는 도메인·화면) |
| `docs/agents` 파일 | 16 | 5 |
| archive | 71파일 31,230줄 | 0 |
| 코드와 어긋난 서술 | 10건 | 0 |

### 그렇게 정한 이유

- 자동 로드 문서는 매 작업의 토큰 비용이고, 길수록 정작 필요한 규칙이 묻힌다. 강제 수단이 있는 규칙을 문서에 한 번 더 적으면 비용만 낸다.
- 문서로만 지키는 규칙은 어긋난다. 이번 측정에서 위젯 간 import 8건, 규칙 없는 영역 12개, 점검 도구의 오탐이 나왔다.
- 문서가 코드와 떨어져 있으면 코드만 고쳐진다. 어긋난 10건 중 7건이 `docs/agents`의 서술이다.

### 기각한 대안

- **`@import`를 없애고 전부 수동 Read로 한다**: 상시 로드는 10.9KB로 줄지만, 도구가 강제하지 않는 규칙이 주입되지 않는다. 디렉토리 진입 시 자동 로드는 유지한다.
- **모든 문서를 루트에서 항상 로드한다**: 약 110KB가 상시 로드된다.
- **archive를 별도 브랜치나 다른 레포로 옮긴다**: 참조하는 곳이 memory 3건뿐이고 git 이력에 남는다. 옮길 이유가 없다.
- **코드 리팩토링(01~07)이 끝난 뒤 한 번에 정리한다**: 어긋난 서술과 잘못된 도구는 지금도 잘못된 작업을 유도한다. 독립적으로 고칠 수 있는 것은 먼저 고친다(아래 1단계).

## 예상 감량과 위험

| 단계 | 대상 | 감량 |
|---|---|---:|
| 1단계(지금) | 어긋난 서술 10건 정정, 중복 15묶음 정리, 과거 서사 약 51줄, 코드가 말하는 설명 약 60줄, 문단형 줄 분해 | 자동 로드 약 100~135줄, 약 15~20KB |
| 1단계 | archive 71파일, 감사 보고서, 잘못된 도구 3개 | 약 31,400줄 |
| 2단계(코드 지침서 뒤) | 레이어 문서 5개 폐지, 프리미티브·lint로 옮겨간 규칙 삭제, 도메인 문서로 재배치 | 자동 로드 추가 약 150~200줄 |

위험:

- **이유를 같이 지운다.** 과거 서사 안에 규칙의 이유가 들어 있는 경우가 많다(`react-query.md`의 위반 사례, `shared.md`의 체결 SSE 무효화 순서). 지우기 전에 줄마다 "규칙 / 이유 / 서사"로 나눠 이유는 남긴다.
- **확정 결정이 사라진다.** `findings/f`의 약 357건 중 지침서 01~07의 "재심한 유지 확정 항목"에서 다루지 않은 결정은 유지가 기본이다. 2단계에서 문서를 재배치할 때 `findings/f`의 항목마다 새 위치(또는 삭제 이유)를 표로 남긴다.
- **archive 삭제는 되돌리려면 git 이력을 뒤져야 한다.** 삭제 커밋의 해시를 `PROGRESS.md`에 적는다.
- **2단계를 코드보다 먼저 하면 문서가 코드보다 앞서간다.** 2단계의 각 삭제는 대응 코드 지침서의 완료를 조건으로 한다.

## 선행 확인

1. 삭제·수정 전 기준선: 시나리오별 로드 줄·바이트를 `findings/h` 1-4절 방식으로 다시 잰다.
2. 문서가 이름으로 가리키는 경로·식별자·npm 스크립트 대조(`findings/h` 2-1절의 스크립트 방식)를 정리 후 다시 돌려 어긋남 0건을 확인한다.
3. `grep -rn "docs/agents/\|CLAUDE.md" --include='*.md' .`로 끊어진 문서 링크가 없는지 확인한다.

## 태스크 분해

### 1단계 — 코드 지침서와 독립, 승인되면 바로 실행

| # | 태스크 | 대상 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 1 | 사용자 결정 받기(아래 목록) | — | — | 답변 |
| 2 | 어긋난 서술 10건 + memory 1건 정정(**완료 2026-11-12**) | `findings/h` 2-2·2-3절의 file:line | Haiku | 선행 확인 2 |
| 3 | 잘못된 도구 3개 삭제(**완료 2026-11-12**) | `.claude/agents/fsd-boundary-checker.md`, `.claude/skills/{fsd-scaffold,dto-sync-check}/` | Haiku | 루트 `CLAUDE.md`·문서에서 해당 이름 참조 0건 |
| 4 | archive·감사 보고서 삭제(**완료, 커밋 `be6d886a`**), 미구현 spec 처리(결정 대기) | `docs/superpowers/{plans,specs}/archive/**`, `audit/**` | Haiku | `git ls-files docs/superpowers \| grep -v fable-review \| wc -l`이 결정에 따른 수 |
| 5 | 중복 정리와 정본 지정(R1~R15), README 사본 삭제 | `docs/agents/*.md`, `README.md`, 디렉토리 `CLAUDE.md` | Sonnet | 주제별 정본 표를 PR 설명에 첨부, 선행 확인 3 |
| 6 | 문단형 줄 분해, 과거 서사 삭제(이유 보존) | 자동 로드 문서 13개 | Opus | `awk 'length > 800' docs/agents/*.md \| wc -l` 0, 선행 확인 1에서 목표 수치의 1단계분 달성 |
| 7 | memory 정리 | memory 4개 파일, `MEMORY.md` | Sonnet | 인덱스와 파일 일치 |

### 2단계 — 대응 코드 지침서 완료 후

| # | 태스크 | 조건 | 모델 | 완료 판정 |
|---|---|---|---|---|
| 8 | 생성 타입·정규화 관련 서술 삭제 | 01 완료 | Haiku | `grep -rn "normalize" docs CLAUDE.md` 0건 |
| 9 | stale time 표·mutation hook 패턴·queryKey 규칙 삭제, 데이터 흐름 한 장으로 | 02 완료 | Sonnet | `architecture.md` 60줄 이하 |
| 10 | 책임 분담 원칙 경로 연결, 서버로 옮겨간 규칙 서술 삭제 | 05, api T9 완료 | Haiku | 루트 `CLAUDE.md`에 `ui-api-contract.md` 경로 1회 |
| 11 | 인터셉트 라우트 4문단 삭제, 폼 형태 기준 2줄 추가 | 04 완료 | Haiku | — |
| 12 | 표 정렬·토스트·상태 표현 규칙 삭제, `ui.md`로 통합 | 06 완료 | Sonnet | `docs/agents`에 copy·a11y·react-query 파일 없음 |
| 13 | 레이어 문서 5개 폐지, 도메인·화면 `CLAUDE.md`로 재배치, `findings/f` 항목별 새 위치 표 | 03 완료 | Opus | 목표 수치 전부 달성, `findings/f` 대응표에 빈 행 없음 |
| 14 | 테스트 규칙(07의 계층 표) 한 절 추가 | 07 완료 | Haiku | — |

## 사용자 결정

1. **archive 71파일(31,230줄)과 감사 보고서 삭제: 승인됨(2026-11-12).** 삭제 커밋 해시를 `PROGRESS.md`에 적는다. 감사의 미해결 항목은 06과 대조해 남는 것만 백로그 한 줄로 옮긴다.
2. ~~`specs/2026-07-12-reject-reason-design.md`~~: 폐기 결정(2026-11-12), 삭제함.
3. ~~감사 보고서의 미해결 P2 항목~~: 닫음. 2026-11-12 코드 대조에서 S-02·S-03·S-04·A-03·A-16 전부 해소 확인.
4. **`.claude`의 나머지 에이전트·스킬**(`next-component-boundary`, `ui-markup-specialist`, `ui-audit`, `typecheck-and-report`, `playwright-cli` 2,015줄)을 쓰고 있는지.
5. **전역 `~/.claude/CLAUDE.md`**(16.6KB, 매 세션 로드)는 이 레포 밖이라 손대지 않았다. 프로젝트 문서와 겹치는 4곳(`findings/h` R13)을 어느 쪽에 둘지는 사용자가 정한다.

## 하지 말아야 할 것

- 규칙을 지우면서 이유까지 지우지 않는다. 이유가 없는 규칙은 다음에 누가 지워도 막을 수 없다.
- 강제 수단이 아직 없는 규칙을 "곧 lint로 옮길 것"이라며 먼저 지우지 않는다.
- 문서를 새로 만들 때 구조 설명·사용 예시·완료 기록을 넣지 않는다.
- 지침서 01~07의 "재심한 유지 확정 항목" 표에 없는 확정 결정을 정리 과정에서 임의로 바꾸지 않는다.
- 다른 레포의 문서 내용을 복사해 오지 않는다. 경로만 적는다.

## 다른 지침서와의 의존·순서

- 1단계는 독립이다. 다른 지침서보다 먼저 해도 된다.
- 2단계의 각 태스크는 표의 조건 지침서에 달려 있다. 03의 태스크 9, 04의 태스크 7, 07의 태스크 9가 이 지침서의 13·11·14로 합쳐진다.
- `fable-review/` 자체(findings·guides·PROGRESS)는 실행이 끝날 때까지 남기고, 마지막 지침서가 완료되면 지운다.
