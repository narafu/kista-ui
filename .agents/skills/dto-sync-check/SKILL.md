---
name: dto-sync-check
description: kista-api DTO 변경 후 entities 타입·normalizer 동기화 여부 점검. 엔티티명을 인자로 받음. 예: /dto-sync-check strategy
user-invocable: false
---

인자로 받은 엔티티명(예: strategy)에 대해 다음 순서로 검사하세요.

## 1. 타입 파일 필드 추출

`entities/{entity}/model/types.ts`를 읽어 Response 인터페이스의 필드 목록을 추출합니다.

## 2. normalizer 필드 추출

`entities/{entity}/api/index.ts`를 읽어 normalize 함수(normalize{Entity}, toXxx 등)에서 참조하는 필드 목록을 추출합니다.

## 3. 동기화 비교

두 목록을 비교해 보고합니다:

```
[동기화 누락]
- types.ts에만 있음: [필드명] → api/index.ts normalizer에 추가 필요
- api/index.ts에만 있음: [필드명] → types.ts에 타입 추가 또는 normalizer에서 제거
[결과: 일치 / N개 불일치]
```

## strategy 엔티티 특이사항

`lib/CLAUDE.md` 기준:
- `TradingCycleResponse` 필드: `id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit`
- `multiple` 필드는 제거됨(커밋 e63cdfb2) — normalizer에 남아있으면 제거 필요
- BigDecimal 계열 필드는 `toNum()` 래핑 필수 → normalizer에서 raw string 그대로 사용 중인지도 체크
