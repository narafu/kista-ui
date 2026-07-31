import type { HousingQuintile } from './housingBenchmarkContent'
import { getHousingQuintileContent } from './housingBenchmarkContent'

interface Props {
  regionName: string
  quintile: HousingQuintile
}

export function HousingBenchmarkRegionQuintileInfo({ regionName, quintile }: Props) {
  const item = getHousingQuintileContent(regionName, quintile)

  return (
    <section aria-labelledby="housing-benchmark-region-info-title" className="border-t border-border pt-5 text-sm">
      <h3 id="housing-benchmark-region-info-title" className="font-medium text-foreground">{regionName} 아파트 {quintile}분위 안내</h3>
      <div className="mt-4 rounded-[var(--r-lg)] border border-border p-3">
        <p className="font-medium text-foreground">
          {item.label} <span className="font-normal text-xs text-muted-foreground">({item.rangeLabel})</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">대표 지역: {item.representativeAreas}</p>
        <p className="mt-1 leading-5">{item.characteristics}</p>
      </div>
    </section>
  )
}
