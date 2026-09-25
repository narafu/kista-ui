'use client'

import { useCallback, useState } from 'react'
import type { HousingBenchmarkRegion } from '@entities/stats'
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'
import { HousingBenchmarkQuintileTrendChart } from './HousingBenchmarkQuintileTrendChart'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'

interface Props {
  enabled: boolean
  from?: string
  to?: string
}

// 5분위 원본 시세 차트에서 선택한 지역이 바로 아래 지역 안내 섹션에도 반영되도록
// 두 컴포넌트를 하나의 단위로 묶는다 — HousingBenchmarkComparison이 알던 상태를 그대로 옮겨온 것.
export function HousingQuintileTrend({ enabled, from, to }: Props) {
  const [regionName, setRegionName] = useState<string>(DEFAULT_HOUSING_REGION_NAME)
  const handleRegionChange = useCallback(
    (region: HousingBenchmarkRegion) => setRegionName(region.name ?? DEFAULT_HOUSING_REGION_NAME),
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <HousingBenchmarkQuintileTrendChart enabled={enabled} from={from} to={to} onRegionChange={handleRegionChange} />
      <HousingBenchmarkRegionQuintileInfo regionName={regionName} />
    </div>
  )
}
