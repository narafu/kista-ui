import { getHousingQuintilesByRegionName } from './housingBenchmarkContent'

interface Props {
  regionName: string
}

export function HousingBenchmarkRegionQuintileInfo({ regionName }: Props) {
  // 5분위(상위) -> 1분위(하위) 순서로 표시
  const quintiles = [...getHousingQuintilesByRegionName(regionName)].reverse()

  return (
    <section aria-labelledby="housing-benchmark-region-info-title" className="border-t border-border pt-5 text-sm">
      <h3 id="housing-benchmark-region-info-title" className="font-medium text-foreground">{regionName} 아파트 5분위 안내</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quintiles.map((item) => (
          <div key={item.quintile} className="rounded-[var(--r-lg)] border border-border p-3">
            <dt className="font-medium text-foreground">
              {item.label} <span className="font-normal text-xs text-muted-foreground">({item.rangeLabel})</span>
            </dt>
            <dd className="mt-1 text-xs text-muted-foreground">대표 지역: {item.representativeAreas}</dd>
            <dd className="mt-1 leading-5">{item.characteristics}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
