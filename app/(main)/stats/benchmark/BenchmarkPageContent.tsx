'use client'

import { HousingBenchmarkComparison } from '@widgets/benchmark-comparison'
import { HousingQuintileTrend } from '@widgets/housing-quintile-trend'

interface Props {
  enabled: boolean
  defaultTo: string
}

// 두 위젯(비교 축·5분위 원본 축)을 실제로 아는 유일한 곳 — widget끼리는 서로 모른다.
// Server Component인 page.tsx가 함수를 prop으로 넘길 수 없어 이 client 컴포넌트가 필요하다.
export function BenchmarkPageContent({ enabled, defaultTo }: Props) {
  return (
    <HousingBenchmarkComparison
      enabled={enabled}
      defaultTo={defaultTo}
      renderHousingExtras={({ from, to }) => (
        <HousingQuintileTrend enabled={enabled} from={from} to={to} />
      )}
    />
  )
}
