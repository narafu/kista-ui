# Fable 전면 검토 진행 원장 (kista-ui)

공통 기준: `../kista-api/docs/superpowers/fable-review/CHARTER.md` (새 세션은 CHARTER → 이 파일 → `findings/` 순으로 읽는다).

규모 기준선(2026-11-11): ts 430개, tsx 549개, 약 81,700줄.

## 1단계 측정 (진행 중, 2026-11-11 착수)

Sonnet/Haiku 서브에이전트 6개 병렬. 산출물은 `findings/`.

| 측정 | 파일 | 상태 |
|------|------|------|
| (a) 대표 화면 수직 추적 | `findings/a-vertical-trace.md` | 5시간 한도로 중단 → 12:42 재개, 진행 중 |
| (b) 개념별 타입 복제 | `findings/b-type-duplication.md` | 파일 400줄 작성됨, 한도로 중단 → 재개해 마무리 중 |
| (c) 평행 구조(테이블·폼·다이얼로그·fetch hook) | `findings/c-parallel-structures.md` | 완료 |
| (d) 사용처 1곳뿐인 공용 코드·간접층 | `findings/d-single-use-abstractions.md` | 완료 |
| (e) 테스트·스토리 비대 원인 | `findings/e-test-bloat.md` | 완료 |
| (f) 유지 확정 항목 요약(재심 대상) | `findings/f-retained-decisions.md` | 완료 |
| (g) UI/UX 패턴 불일치(같은 UX를 몇 가지 방식으로 구현했나) | `findings/g-ux-pattern-variance.md` | 진행 중 (사용자 지시로 추가: UI 코드철학 + UI/UX 관점) |

### 측정 중간 결론 (c·d·e·f 기준)

- 제품 코드 약 5만 줄(생성 `api-types.ts` 9,564줄 포함), 테스트 30,240줄(전체의 38%).
- Route Handler·서버/클라이언트 이중 정의는 이미 얇다(22개 377줄, `fetchEither`). 비대 원인이 아니다.
- 파일 수 비대의 주원인은 계층 분리다: 30줄 미만 파일 46%, features 슬라이스 68%·widgets 슬라이스 71%가 소비처 1곳, 순수 barrel 87개, 폼 라우트 1개가 app 파일 5개.
- 평행 구조 감량은 수백 줄대(finance mutation 33개, 폼 라우트 4종 세트, 테이블 15개).
- 테스트는 줄 수보다 변경 비용이 문제다: `vi.mock` 395개, 문구 리터럴 단언 1,219건, 공용 픽스처 빌더 없음.

### 측정 추가 결론 (a·b 기준)

- 화면 1개 = 평균 97파일 5,300줄 + 형제 테스트 38파일 4,096줄. 순수 전달층은 줄 수의 4%(보조층 포함 7%)라 "간접층이 두껍다"는 가설은 줄 수로는 기각. 본체는 층 안 실코드와 테스트.
- 생성 타입 `shared/lib/api-types.ts`(9,564줄)를 런타임 코드 4개 파일만 쓴다. 수기 재선언 74쌍(필드 일치 99.3%), 정규화 함수 16개 217줄의 98.6%가 `String()/Number()` 복사. 개념 1개당 선언 평균 21회, 코드값 19집합이 약 110곳 복제.
- **확정 사실(fable-api 코드 확인, 2026-11-11)**: kista-api는 BigDecimal을 문자열이 아니라 JSON number로 내보낸다(Jackson 전역 설정 없음, 예외는 `PlainDecimalSerializer` 2벌). UI 주석 "BigDecimal 문자열로 온다"는 현재 코드와 맞지 않는다. api 쪽 지침서는 응답 record `@NullMarked` + springdoc required 표기, BigDecimal plain number 전역 통일로 간다. **UI 지침서 전제: 생성 타입을 직접 쓴다, 금액은 number.**
- api가 바뀌면 줄어드는 UI 코드 후보 6건은 fable-api에 전달 완료(`kista-api/docs/superpowers/fable-review/cross-repo.md` B절).
- fable-infra가 알린 UI 배포 자산 후보(required-env 누락 `TRADING_API_BASE_URL`, `.github/scripts/wait-reconcile*` 사본, `server-deploy.yml` 경로 필터 없음, `NEXT_PUBLIC_*` 추가 시 5곳 수정, 루트 compose trading URL 미주입)는 근거 파일 `kista-infra/docs/superpowers/fable-review/findings/cross-repo-deploy.md`. 불필요 파일·배포 지침서에서 다룬다.

### 범위 추가 (fable-api 경유 사용자 지시, 2026-11-11)

| 측정 | 파일 | 상태 |
|------|------|------|
| (h) 문서 드리프트·중복·자동 로드 비용 | `findings/h-docs-drift.md` | 진행 중 |
| (i) 불필요 파일 삭제 후보 | `findings/i-unused-files.md` | 진행 중 |

삭제·대량 문서 개편의 실제 실행은 사용자 승인 후.

## 2단계 판단

미착수. 측정이 끝나면 주제 5~8개를 정해 kista-api Fable 세션에 주제 목록을 SendMessage로 보낸다.

## 3단계 지침서

미착수. `guides/NN-<주제>.md`.

## 바로 다음 할 일

`findings/` 6개 파일이 다 찼는지 확인 → 읽고 주제 선정.
