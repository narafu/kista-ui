---
name: typecheck-and-report
description: TypeScript 타입 검사 실행 후 오류를 파일별로 분류하고 수정 방향 제안
---

다음 순서로 실행하세요:

1. TypeScript 타입 검사 실행:
   ```bash
   npm run typecheck 2>&1
   ```

2. 오류가 없으면 "타입 검사 통과" 출력 후 종료.

3. 오류가 있으면:
   - **파일별 그룹화**: 같은 파일의 오류를 묶어서 표시
   - **원인 분류**: 각 오류를 아래 카테고리로 분류
     - `TYPE_MISMATCH` — 잘못된 타입 할당
     - `NULL_GUARD` — null/undefined 미가드
     - `IMPORT_PATH` — 잘못된 import 경로 또는 누락된 export
     - `PROP_MISSING` — 필수 props 누락
     - `OTHER` — 기타
   - **수정 방향**: 코드를 직접 수정하지 말고 각 오류의 수정 방향만 한 줄로 제안
   - **요약**: 총 오류 수와 영향받는 파일 수 출력

예시 출력 형식:
```
[파일] widgets/account-detail/AccountSummaryCard.tsx (2건)
  TS2322 [TYPE_MISMATCH] → avgPrice: string | null을 number로 변환 시 toNum() 사용
  TS2531 [NULL_GUARD] → currentPrice가 null일 수 있음 → ?. 연산자 추가

총 12건 오류 / 3개 파일
```
