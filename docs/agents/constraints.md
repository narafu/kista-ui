## 작업 방식

- 기존 오류, 명백한 타입 오류, 컴파일 오류, 분명한 버그를 발견하면 현재 작업과 직접 무관해도 범위가 작으면 바로 수정한다 (범위가 넓으면 먼저 언급).
- 확실하지 않아도 버그나 설계 이상 징후가 보이면 묻어두지 말고 언급한다 — "확실하지 않지만 X가 이상해 보입니다" 형태.
- 반복 객체 생성, 불필요한 중간 변수, 유틸 함수로 추출 가능한 보일러플레이트는 별도 제안 없이 바로 정리한다.
- 코드 중복, FSD 계층 위반, 불필요한 복잡도는 기회적 리팩토링 후보로 본다 — 즉시 수정하지 말고 작업 완료 후 별도 제안한다.
- 코드를 변경하는 작업은 커밋 직전에 반드시 별도 검토자(리뷰어 서브에이전트 또는 code-review 계열 skill/workflow)의 검수를 거친다 — 발견된 실제 결함은 커밋 전에 수정·재검증한다. 문서 전용 변경은 예외.
- `/code-review` effort level은 diff 규모에 맞춰 고른다: 파일 10개·수백 줄 이하면 `medium`으로 충분. `high`(8앵글 병렬 파인더 + 검증) 이상은 인증/토큰/쿠키 흐름 등 보안·세션 민감 변경이 섞였거나 diff가 큰(수십 개 파일) 경우로 아낀다 — `high`는 파인더·검증 서브에이전트가 각자 콜드 스타트로 diff와 관련 파일을 중복해서 다시 읽어 토큰 비용이 크다.
- 작업 요청이 완전히 끝나면(코드 변경이면 위 검토자 검수까지 끝난 뒤) 자동으로 커밋을 만든다. 단, `git push`는 별도 요청이 있을 때만 한다.
- `kista-api` 연계 작업(API 응답 형식 변경, 인증/토큰 흐름 등)이면 즉시 `../kista-api/CLAUDE.md`를 Read로 확인한다 — 세션 시작 디렉토리가 아닌 저장소의 CLAUDE.md는 자동 로드되지 않는다.

## Git 규칙

- `git push`는 사용자가 명시적으로 요청할 때만 실행한다.
- author 확인: `narafu <narafu@kakao.com>`
- 커밋 메시지는 한글로 작성한다.
- 괄호가 포함된 경로는 `git add "app/(main)/layout.tsx"`처럼 큰따옴표로 감싼다.

## 프론트엔드 코딩 가이드라인

### 포맷

- 싱글 쿼트
- 세미콜론 없음
- import 중괄호 공백 유지
- 기능 작업 중 기존 파일 포맷을 일괄 변경하지 않는다

### 스타일링

- 인라인 `style={{ ... }}`는 원칙적으로 금지한다
- 예외는 CSS 토큰 값이나 픽셀 계산처럼 Tailwind로 대체하기 어려운 경우다
- 동적 클래스는 `cn()`을 우선 사용하고, 복잡한 변형은 `cva`로 정의한다

### TypeScript / React Query

- `any` 금지 — 제네릭·`?.`·`??`로 대체한다
- 서버 상태를 `useState`에 복사하지 않는다 — React Query가 서버 상태의 SSOT
- 전역 QueryClient 기본값은 `@shared/lib/query/createQueryClient`에서만 변경한다 (`staleTime=30s`, `gcTime=10m`, `retry=0`, `refetchOnWindowFocus=false`)
- `Promise.all`의 독립 호출은 fail-fast 방지를 위해 각 항목에 `.catch(() => null)`을 붙인다

## 구현 quirk

- Client Component에서 직접 `kista-api` 호출 금지
- Route Handler URL 변경 시 보통 `entities/{domain}/api/` 호출부만 수정한다
- 새 `NEXT_PUBLIC_*` 환경변수를 추가하면 예제 env 파일도 같이 맞춘다
- `openapi.json`이 SSOT이며, 타입은 `npm run gen:types`로 재생성한다
- 기본 검증은 `npm run typecheck`를 우선 사용한다. 현재 `lint`는 신뢰 가능한 기본 검증 명령이 아니다.
