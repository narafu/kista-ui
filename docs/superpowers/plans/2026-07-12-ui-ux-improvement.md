# KISTA UI/UX 단계별 개선 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감사(audit) 주도로 kista-ui 전 화면(사용자 8 + 인증 3 + admin 7 라우트)의 일관성·UX·비주얼을 단계별 개선한다.

**Architecture:** Phase 0에서 전 화면 스크린샷·정적 코드 감사로 증거 기반 문제 목록을 만들고, 그 결과가 Phase 1(일관성)→2(UX)→3(비주얼)→4(admin) 작업 항목을 확정한다. Phase 0의 마지막 태스크가 이 플랜의 부록 A~D를 실제 작업 목록으로 갱신하는 2단계 플랜 구조다.

**Tech Stack:** Next.js 16 · Tailwind CSS(토큰 기반) · shadcn/ui · Playwright CLI · 스펙: `docs/superpowers/specs/2026-07-12-ui-ux-improvement-design.md`

## Global Constraints

- 로즈골드 팔레트·Pretendard/Cormorant Garamond 폰트 스택 유지 — 교체 금지, 심화만
- 한국 증권 관례 색상 불변: `--pos` 빨강=상승/수익, `--neg` 파랑=하락/손실
- 인라인 `style={{ ... }}` 금지 — 예외: CSS 토큰 값(`var(--pos)` 등)·픽셀 계산
- 포맷: 싱글 쿼트 · 세미콜론 없음 · import 중괄호 공백. 기존 파일 포맷 일괄 변경 금지
- FSD 단방향 의존성: `app → widgets → features → entities → shared`. 동일 계층 cross-import 금지
- 기본 검증: `npm run typecheck` (lint는 신뢰 불가). UI 변경은 Playwright 스크린샷으로 실제 렌더링 확인 후 완료 선언
- 태스크 단위 즉시 커밋(한글 메시지). `git push`는 사용자 명시 요청 시에만
- 실거래 백엔드(로컬 kista-api)는 에이전트가 임의 기동 금지 — 사용자 협조 필요
- **태스크별 실행 모델**: 각 태스크 헤더의 `실행 모델`을 따른다. 서브에이전트 디스패치 시 Agent tool의 `model` 파라미터로 지정한다

---

## Phase 0 — 전 화면 감사

### Task 0.1: 감사 환경 준비 및 비인증 화면 스모크 캡처

**실행 모델:** Haiku (기계적 명령 실행·캡처)

**Files:**
- Create: `docs/superpowers/audit/screenshots/` (스크린샷 출력 디렉토리, git 미추적 — `.gitignore`에 추가)
- Modify: `.gitignore` (스크린샷 디렉토리 제외 1줄)

**Interfaces:**
- Produces: 실행 중인 dev 서버 포트 번호(이후 모든 캡처 태스크가 사용), 스크린샷 파일명 규칙 `{route}--{device}--{theme}.png` (route는 `/`를 `_`로 치환, device는 `desktop|mobile`, theme는 `light|dark`)

- [ ] **Step 1: dev 서버 기동 및 포트 확인**

```bash
cd /Users/phs/workspace/kista/kista-ui
npm run dev > /tmp/kista_dev.log 2>&1 &
sleep 8 && grep "Local:" /tmp/kista_dev.log
```

Expected: `Local: http://localhost:3000` (Docker 점유 시 3001 등 — 출력된 포트를 이후 모든 태스크에서 사용)

- [ ] **Step 2: .gitignore에 스크린샷 디렉토리 추가**

```
docs/superpowers/audit/screenshots/
```

- [ ] **Step 3: 비인증 4조합 스모크 캡처 (라우트 `/` 기준)**

```bash
mkdir -p docs/superpowers/audit/screenshots
npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:3000/ docs/superpowers/audit/screenshots/root--desktop--light.png
npx playwright screenshot --browser chromium --viewport-size "390,844" http://localhost:3000/ docs/superpowers/audit/screenshots/root--mobile--light.png
npx playwright screenshot --browser chromium --viewport-size "1440,900" --color-scheme dark http://localhost:3000/ docs/superpowers/audit/screenshots/root--desktop--dark.png
npx playwright screenshot --browser chromium --viewport-size "390,844" --color-scheme dark http://localhost:3000/ docs/superpowers/audit/screenshots/root--mobile--dark.png
```

Expected: 4개 PNG 생성. **다크 캡처 검증**: `root--desktop--dark.png`가 라이트와 동일하면 next-themes가 `--color-scheme` 에뮬레이션을 못 받는 것 — 이 경우 대체 방법(Step 4)을 사용하고 그 사실을 결과 보고에 명시

- [ ] **Step 4 (Step 3 다크 실패 시만): localStorage 주입 방식 다크 캡처**

playwright-cli 스킬(브라우저 자동화)로 페이지 로드 → `localStorage.setItem('theme', 'dark')` → 리로드 → 스크린샷. next-themes 기본 storage key는 `theme`

- [ ] **Step 5: 커밋**

```bash
git add .gitignore
git commit -m "chore: UI 감사 스크린샷 디렉토리 gitignore 추가"
```

### Task 0.2: 인증 세션 확보 (사용자 협조 게이트)

**실행 모델:** Fable (오케스트레이터 본인 — 사용자 대화·판단 필요, 서브에이전트 디스패치 금지)

**Files:** 없음 (세션 상태만 확보)

**Interfaces:**
- Produces: 로그인된 브라우저 storage state(쿠키) 또는 "코드 기반 감사로 대체" 결정. Task 0.3이 이 결과에 의존

- [ ] **Step 1: 사용자에게 로컬 kista-api 기동 요청**

`! cd ../kista-api && ./gradlew bootRun` 형태로 사용자가 직접 실행하도록 안내 (실거래 백엔드 — 에이전트 임의 기동 금지)

- [ ] **Step 2: playwright-cli 스킬로 브라우저를 열고 사용자가 카카오 로그인 수행**

로그인 완료 후 storage state를 `/private/tmp/claude-501/-Users-phs-workspace-kista-kista-ui/09954221-7329-472e-9eee-0fd9c8302d6e/scratchpad/auth-state.json`에 저장 (프로젝트 밖 — 쿠키 유출 방지)

- [ ] **Step 3 (사용자 불가 시): 코드 기반 감사로 대체 결정**

인증 화면은 Task 0.5(정적 감사)의 범위를 확대해 대체하고, Task 0.3에서 인증 라우트를 건너뛴다. 결정 사항을 감사 문서 서두에 기록

### Task 0.3: 전 화면 캡처 매트릭스 실행

**실행 모델:** Haiku (기계적 반복 캡처)

**Files:**
- Create: `docs/superpowers/audit/screenshots/*.png` (최대 18 라우트 × 4조합 = 72샷, git 미추적)

**Interfaces:**
- Consumes: Task 0.1의 포트·파일명 규칙, Task 0.2의 storage state
- Produces: 전체 스크린샷 세트 (Task 0.4가 분석)

- [ ] **Step 1: 대상 라우트 목록 확정**

비인증: `/`, `/login`
인증(ACTIVE): `/dashboard`, `/accounts`, `/accounts/new`, `/accounts/{실제id}`, `/accounts/{실제id}/edit`, `/accounts/{실제id}/strategies/{실제sid}`, `/strategies`, `/settings`
인증(ADMIN): `/admin`, `/admin/users`, `/admin/pending`, `/admin/accounts`, `/admin/trades`, `/admin/privacy-trades`, `/admin/logs`
상태 화면 `/pending`, `/rejected`: ACTIVE 계정으로는 proxy가 리다이렉트하므로 접근 불가 — 캡처 생략하고 코드 기반 감사로 대체함을 기록. 동적 세그먼트 id는 `/accounts` 목록에서 첫 항목의 실제 id 사용

- [ ] **Step 2: storage state 기반 전 라우트 × 4조합 캡처**

playwright-cli 스킬 사용 (CLI `screenshot` 단발 명령은 storage state 미지원). 각 라우트당 desktop-light/desktop-dark/mobile-light/mobile-dark 4샷, Task 0.1 파일명 규칙 준수. 다크 전환은 Task 0.1에서 검증된 방식 사용

- [ ] **Step 3: 캡처 완결성 검증**

```bash
ls docs/superpowers/audit/screenshots/ | wc -l
```

Expected: (접근 가능 라우트 수) × 4. 누락 라우트는 사유(리다이렉트·에러 등)와 함께 기록

### Task 0.4: 스크린샷 감사 분석 → 문제 목록 작성

**실행 모델:** Fable (디자인 안목·심각도 판단 — 모델 편차가 가장 큰 작업)

**Files:**
- Create: `docs/superpowers/audit/2026-07-12-ui-audit.md`

**Interfaces:**
- Consumes: Task 0.3 스크린샷 전체
- Produces: 문제 목록 문서 — 각 항목은 `ID(A-nn) / 화면 / 기기·테마 / 카테고리(일관성|UX|비주얼|반응형|다크모드) / 심각도(P1 깨짐·P2 마찰·P3 다듬기) / 증상 / 개선 방향` 형식. Task 0.6과 Phase 1~4가 이 ID를 참조

- [ ] **Step 1: 스크린샷을 라우트별로 Read하고 4조합 비교 분석**

체크 관점: 간격·radius·shadow 편차, 토큰 미준수 색, 테이블/카드 패턴 불일치(일관성) · 정보 우선순위, 내비 동선, 빈/로딩 상태, 터치 타깃 44px(UX) · 타이포 위계, 깊이, 밀도(비주얼) · 모바일 오버플로·잘림(반응형) · 다크 대비·투명도 뭉개짐(다크모드)

- [ ] **Step 2: 문제 목록 문서 작성 (위 형식, 심각도순 정렬)**

- [ ] **Step 3: 커밋**

```bash
git add docs/superpowers/audit/2026-07-12-ui-audit.md
git commit -m "docs: UI 전 화면 스크린샷 감사 결과 — 문제 목록"
```

### Task 0.5: 코드 기반 정적 감사

**실행 모델:** Sonnet (패턴 검색·분류 — 기계적이나 분류 판단 약간 필요)

**Files:**
- Modify: `docs/superpowers/audit/2026-07-12-ui-audit.md` (정적 감사 섹션 추가, ID `S-nn`)

**Interfaces:**
- Consumes: Task 0.4 문서 형식
- Produces: 정적 감사 항목 목록 (S-nn) — 하드코딩 색·인라인 style·컴포넌트 편차의 파일:라인 목록

- [ ] **Step 1: 하드코딩 색상 검색**

```bash
grep -rEn '#[0-9A-Fa-f]{6}|rgba?\(' widgets features entities shared/ui components --include='*.tsx' | grep -v 'var(--'
```

각 히트를 "토큰 대체 가능 / 정당한 예외(차트·브랜드 고정값)"로 분류

- [ ] **Step 2: 인라인 style 검색 및 예외 분류**

```bash
grep -rn 'style={{' widgets features app --include='*.tsx'
```

CSS 토큰·픽셀 계산 예외 해당 여부를 파일별로 분류 (`docs/agents/widgets.md`의 허용 목록 대조)

- [ ] **Step 3: 공용 컴포넌트 우회 사용 검색**

Badge·EmptyState·Spinner·CardSkeleton·PageHeader가 있는데 자체 구현한 유사 마크업을 `Grep`으로 탐지 (예: `animate-pulse` 직접 사용처 vs CardSkeleton, `text-muted-foreground.*비어` 패턴 vs EmptyState)

- [ ] **Step 4: 감사 문서에 S-nn 섹션 추가 후 커밋**

```bash
git add docs/superpowers/audit/2026-07-12-ui-audit.md
git commit -m "docs: UI 정적 코드 감사 결과 추가 — 하드코딩 스타일·컴포넌트 편차"
```

### Task 0.6: 감사 결과 → Phase 1~4 작업 항목 확정 (플랜 갱신)

**실행 모델:** Fable (우선순위·범위 판단)

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-ui-ux-improvement.md` (본 문서 부록 A~D를 실제 작업 목록으로 갱신)

**Interfaces:**
- Consumes: 감사 문서의 A-nn·S-nn 전체
- Produces: 부록 A~D — 각 항목이 `감사 ID / 대상 파일 / 변경 내용 / 담당 서브에이전트 그룹` 을 가진 실행 가능한 목록

- [ ] **Step 1: 감사 항목을 Phase별로 배정** (일관성→부록 A, UX→부록 B, 비주얼→부록 C, admin→부록 D. P1은 Phase 무관 최우선 표기)

- [ ] **Step 2: 부록 A~D 작성 — 항목마다 대상 파일 경로와 변경 내용을 구체 기술, Sonnet 병렬 그룹은 파일 영역이 겹치지 않게 분할**

- [ ] **Step 3: 갱신된 플랜을 사용자에게 리뷰 요청 후 커밋**

```bash
git add docs/superpowers/plans/2026-07-12-ui-ux-improvement.md
git commit -m "docs: 감사 결과 기반 Phase 1~4 작업 항목 확정"
```

---

## Phase 1 — 일관성 정리

### Task 1.1: 부록 A 실행 — 토큰화·컴포넌트 통일 (Sonnet 병렬)

**실행 모델:** 오케스트레이션 Fable / 수정 서브에이전트 **Sonnet** (파일 영역 분할 병렬, Agent tool `model: "sonnet"`)

**Files:** 부록 A에서 확정 (Task 0.6 산출물)

**Interfaces:**
- Consumes: 부록 A 항목 (감사 ID·파일·변경 내용)
- Produces: 토큰 준수 코드베이스 — Phase 3이 전제로 삼음

- [ ] **Step 1: 부록 A를 파일 영역 기준 2~4개 그룹으로 분할, 그룹당 Sonnet 서브에이전트 1개 디스패치** (각 에이전트 프롬프트에 Global Constraints 전문과 담당 감사 ID·파일·변경 내용 포함)
- [ ] **Step 2: 각 에이전트 결과를 diff 리뷰** (Fable — 포맷 무단 변경·FSD 위반·토큰 오용 확인)
- [ ] **Step 3: `npm run typecheck` 통과 확인**
- [ ] **Step 4: 변경 화면만 Playwright 재캡처(Task 0.1 방식) 후 감사 스크린샷과 비교 — 의도한 변화만 있는지 확인**
- [ ] **Step 5: 커밋** — `git commit -m "refactor(ui): 일관성 정리 — 하드코딩 스타일 토큰화·공용 컴포넌트 통일 (감사 A-nn, S-nn)"`

---

## Phase 2 — UX 흐름 개선

### Task 2.1: UX 개선 설계서 작성

**실행 모델:** Fable (UX 판단)

**Files:**
- Create: `docs/superpowers/specs/2026-07-12-ux-flow-design.md`

**Interfaces:**
- Consumes: 부록 B 항목
- Produces: 화면별 before/after 구조 설계 (컴포넌트 단위 변경 명세) — Task 2.2 구현의 SSOT

- [ ] **Step 1: 부록 B 항목별로 변경 명세 작성** (내비 정보구조·대시보드 우선순위·계좌→전략 동선·폼 UX·로딩/빈/에러 상태·터치 타깃)
- [ ] **Step 2: 사용자 승인 (AskUserQuestion — UX 변경은 되돌리기 비용이 큼)**
- [ ] **Step 3: 커밋** — `git commit -m "docs: UX 흐름 개선 설계서"`

### Task 2.2: UX 설계 구현

**실행 모델:** 구현 서브에이전트 **Sonnet** (확정 설계의 구현) / 리뷰 Fable

**Files:** Task 2.1 설계서에서 확정

- [ ] **Step 1: 설계서 항목을 화면 단위로 Sonnet 서브에이전트에 디스패치** (설계서 해당 섹션 전문을 프롬프트에 포함)
- [ ] **Step 2: `npm run typecheck` + 변경 화면 4조합 재캡처 검증**
- [ ] **Step 3: 화면 단위 커밋** — `git commit -m "feat(widgets): {화면} UX 흐름 개선 (감사 A-nn)"`

---

## Phase 3 — 비주얼 업그레이드

### Task 3.1: 비주얼 심화 — 모션·타이포·깊이

**실행 모델:** **Fable 단독** (frontend-design 미학 지침 — 창의 작업, 서브에이전트 위임 금지)

**Files:**
- Modify: `app/globals.css` (모션 keyframes·스태거 유틸리티 추가), 부록 C에서 확정된 위젯 파일들

**Interfaces:**
- Consumes: 부록 C 항목, Phase 1의 토큰 준수 상태
- Produces: 완성된 비주얼 레이어

- [ ] **Step 1: frontend-design 지침 재확인** — 로즈골드 refined 톤 심화, Cormorant display 헤딩·수치 확대 적용, 페이지 로드 스태거 리빌(CSS `animation-delay`), 그라데이션 메시·노이즈 텍스처 배경, 산발적 효과 대신 고임팩트 순간 집중
- [ ] **Step 2: globals.css에 모션·배경 유틸리티 추가** (기존 `errorFadeUp` 패턴 계승, `prefers-reduced-motion` 미디어쿼리로 전체 모션 비활성화 경로 필수)
- [ ] **Step 3: 부록 C 화면별 적용 — 화면당 4조합 재캡처로 라이트·다크 모두 확인**
- [ ] **Step 4: `npm run typecheck` 통과 확인**
- [ ] **Step 5: 화면 단위 커밋** — `git commit -m "feat(ui): 비주얼 업그레이드 — {화면} 모션·타이포·깊이 (감사 A-nn)"`

---

## Phase 4 — admin 동등화

### Task 4.1: admin 7개 라우트에 확립 패턴 적용

**실행 모델:** 수정 서브에이전트 **Sonnet** 병렬 / 리뷰 Fable

**Files:** 부록 D에서 확정 (`widgets/admin-*` 5개 슬라이스 + `app/(admin)/` 레이아웃)

**Interfaces:**
- Consumes: Phase 1~3에서 확립된 토큰·컴포넌트·모션 패턴, 부록 D 항목
- Produces: 사용자 화면과 동등한 admin 화면

- [ ] **Step 1: 부록 D를 admin 슬라이스 단위로 분할해 Sonnet 병렬 디스패치** (Phase 1~3 확립 패턴의 대표 파일 경로를 프롬프트에 참조로 포함)
- [ ] **Step 2: `npm run typecheck` + admin 화면 4조합 재캡처 검증**
- [ ] **Step 3: 커밋** — `git commit -m "feat(widgets): admin 화면 디자인 동등화 (감사 A-nn)"`

---

## 부록 A — Phase 1 작업 항목 (Task 0.6에서 확정)

> Task 0.6 완료 전까지 비어 있음. 확정 형식: `| 감사 ID | 파일 | 변경 내용 | Sonnet 그룹 |`

## 부록 B — Phase 2 작업 항목 (Task 0.6에서 확정)

> Task 0.6 완료 전까지 비어 있음.

## 부록 C — Phase 3 작업 항목 (Task 0.6에서 확정)

> Task 0.6 완료 전까지 비어 있음.

## 부록 D — Phase 4 작업 항목 (Task 0.6에서 확정)

> Task 0.6 완료 전까지 비어 있음.
