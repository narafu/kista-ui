## 작업 방식

- 기존 오류, 명백한 타입 오류, 컴파일 오류, 분명한 버그를 발견하면 현재 작업과 직접 무관해도 범위가 작으면 바로 수정한다.
- 확실하지 않아도 버그나 설계 이상 징후가 보이면 묻어두지 말고 언급한다.
- 코드 중복, FSD 계층 위반, 불필요한 복잡도는 기회적 리팩토링 후보로 본다.
- `kista-api` 연계 작업이면 즉시 `../kista-api/CLAUDE.md`를 확인한다.

## Git 규칙

- `git push`는 사용자가 명시적으로 요청할 때만 실행한다.
- author 확인: `narafu <narafu@kakao.com>`
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
- 동적 클래스는 `cn()`을 우선 사용한다

### 계층 규칙

- `app/`는 라우팅과 서버 데이터 조합만 담당한다
- `widgets/`는 페이지 합성
- `features/`는 사용자 액션
- `entities/`는 도메인 모델, API, React Query
- `shared/`는 범용 유틸리티

## 구현 quirk

- Client Component에서 직접 `kista-api` 호출 금지
- Route Handler URL 변경 시 보통 `entities/{domain}/api/` 호출부만 수정한다
- 새 `NEXT_PUBLIC_*` 환경변수를 추가하면 예제 env 파일도 같이 맞춘다
- `openapi.json`이 SSOT이며, 타입은 `npm run gen:types`로 재생성한다

아래 세부 문서는 작업 영역별 quirk의 실제 기준 문서다.

- `app/CLAUDE.md`
- `entities/CLAUDE.md`
- `features/CLAUDE.md`
- `widgets/CLAUDE.md`
- `shared/CLAUDE.md`
