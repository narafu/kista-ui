# Task 3 Report: 회귀 검증과 화면 문구 정리

## 완료 내용

- `features/strategy/create-strategy/StrategyFormSkeleton.tsx`
  - 시드 영역 스켈레톤을 수정 모드 전용처럼 보이지 않도록 공용 로딩 블록으로 정리했습니다.
  - 기존의 상단 라벨/보조 블록 조합을 제거하고, `시작금액 / 시드 영역 공용 스켈레톤` 주석과 단순한 두 줄 스켈레톤으로 맞췄습니다.

- `docs/agents/features.md`
  - strategy 섹션에 수정 모드 정책을 한 줄 추가했습니다.
  - 수정 모드에서는 `initialUsdDeposit`를 읽기 전용으로만 표시하고 저장 payload에 포함하지 않는다는 점을 문서화했습니다.

## 검증

실행한 자동 검증:

```bash
npm run test:run -- features/strategy/create-strategy/model/strategyFormSchema.test.ts
npm run typecheck
```

결과:
- `strategyFormSchema.test.ts`: 7 passed
- `typecheck`: 통과

## 수동 확인

브라우저에서 로컬 앱을 띄운 뒤 전략 화면까지 접근을 시도했습니다.

- 확인됨: `http://localhost:3000/dashboard` 접속 가능
- 확인됨: 전략 메뉴 클릭 시 앱이 `http://localhost:3000/login`으로 이동
- 미완료: 로그인 자격 증명이 없어 전략 등록/수정 다이얼로그를 실제로 열어 create/edit 화면을 최종 확인하지 못함

따라서 수동 검증 중 실제로 확인한 것은 로그인 게이트까지이며, 아래 항목은 이 환경에서 아직 수동 확인이 필요합니다.

- 신규 등록에서 시드 게이지가 보이는지
- 잔고검증 OFF일 때 USD 직접입력이 보이는지
- 최소 시드 미달 경고와 제출 차단이 유지되는지
- 수정 다이얼로그에서 시드 입력 UI가 노출되지 않는지
- 시작금액 읽기 전용 카드와 `"시드는 전략 등록 후 수정할 수 없습니다"` 문구가 보이는지
- 자동 시작 / 시드 모드 변경 후 저장이 가능한지

## 비고

- 수정 payload에서 `initialUsdDeposit`를 제외하는 정책은 이미 코드상 반영되어 있었고, 이번 작업에서는 회귀 방지용 skeleton 및 문서 정리를 수행했습니다.
