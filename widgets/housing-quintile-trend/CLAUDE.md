# widgets/housing-quintile-trend

- **`housing-quintile-trend`**: `benchmark-comparison`의 HOUSING 탭에서만 쓰이는 5분위(quintile) 원본 시계열 섹션 — 사용자 투자 데이터와 무관하게 항상 렌더링된다(투자-벤치마크 비교 축과 독립, 상단 "비교 기간" 필터의 from/to만 공유). `HousingQuintileTrend`가 진입점이며 지역 선택 상태(차트에서 고른 지역 → 아래 안내 패널에 반영)를 내부에 캡슐화한다. `benchmark-comparison`은 이 위젯의 존재를 모른다 — `app/(main)/stats/benchmark/BenchmarkPageContent.tsx`가 `renderHousingExtras` render-prop으로 둘을 연결한다
