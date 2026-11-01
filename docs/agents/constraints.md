## 작업 방식

- 코드 중복, FSD 계층 위반, 불필요한 복잡도는 기회적 리팩토링 후보로 본다 — 즉시 수정하지 말고 작업 완료 후 별도 제안한다.
- `/code-review` effort level은 diff 규모에 맞춰 고른다: 파일 10개·수백 줄 이하면 `medium`으로 충분. `high`(8앵글 병렬 파인더 + 검증) 이상은 인증/토큰/쿠키 흐름 등 보안·세션 민감 변경이 섞였거나 diff가 큰(수십 개 파일) 경우로 아낀다 — `high`는 파인더·검증 서브에이전트가 각자 콜드 스타트로 diff와 관련 파일을 중복해서 다시 읽어 토큰 비용이 크다.
- `kista-api` 연계 작업(API 응답 형식 변경, 인증/토큰 흐름 등)이면 즉시 `../kista-api/CLAUDE.md`를 Read로 확인한다 — 세션 시작 디렉토리가 아닌 저장소의 CLAUDE.md는 자동 로드되지 않는다.

## Git 규칙

- author 확인: `narafu <narafu@kakao.com>`
- 커밋 메시지는 한글로 작성한다.
- 괄호가 포함된 경로는 `git add "app/(main)/layout.tsx"`처럼 큰따옴표로 감싼다.

## 프론트엔드 코딩 가이드라인

### 포맷

- `.prettierrc` 기준
- 기능 작업 중 기존 파일 포맷을 일괄 변경하지 않는다. 포맷 변경이 필요하면 별도 커밋으로 분리한다.

### 스타일링

- 인라인 `style={{ ... }}`는 원칙적으로 금지한다
- 예외는 CSS 토큰 값이나 픽셀 계산처럼 Tailwind로 대체하기 어려운 경우다
- 동적 클래스는 `cn()`을 우선 사용하고, 복잡한 변형은 `cva`로 정의한다

카피는 `copy.md`, 접근성은 `a11y.md`, React Query·TypeScript는 `react-query.md` — 각 레이어 CLAUDE.md가 import한다.

## 구현 quirk

- Route Handler URL 변경 시 보통 `entities/{domain}/api/` 호출부만 수정한다
