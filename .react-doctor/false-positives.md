# React Doctor False Positives

## react-doctor/no-derived-state

- `features/strategy/create-strategy/model/useSeedModel.ts` — `pct` 상태는 `setPct`로 사용자가 직접 조작하는 인터랙티브 슬라이더 상태다. 파생 미러링이 아니라, useEffect는 `pctInitialized.current` ref 가드를 쓰는 1회성 초기화 패턴으로 런타임 연속 파생이 아님.
