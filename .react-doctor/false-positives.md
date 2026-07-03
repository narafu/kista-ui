# React Doctor False Positives

## react-doctor/no-derived-state

- `features/strategy/create-strategy/model/useSeedModel.ts` — `pct` 상태는 `setPct`로 사용자가 직접 조작하는 인터랙티브 슬라이더 상태다. 파생 미러링이 아니라, useEffect는 `pctInitialized.current` ref 가드를 쓰는 1회성 초기화 패턴으로 런타임 연속 파생이 아님.

## react-doctor/async-await-in-loop

- `widgets/admin-trade-list/AdminTradesWorkbench.tsx` `handleReorderSubmit` — KIS 매매 API는 레이트 리밋이 있으며, 각 주문의 순서 보장이 correctness 요구사항이다. `await Promise.all`로 병렬화하면 레이트 리밋 초과 또는 순서 비보장 위험이 있으므로 순차 실행이 의도적임.
