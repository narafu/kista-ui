import type { EtfBenchmarkSymbol, HousingBenchmark } from '@entities/stats'
import { ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK, getEtfBenchmarkContent } from './housingBenchmarkContent'

interface Props {
  benchmark?: HousingBenchmark
  notice?: string
}

export function HousingBenchmarkInfo({ benchmark, notice }: Props) {
  const etfContent = getEtfBenchmarkContent((benchmark?.symbol ?? 'SPY') as EtfBenchmarkSymbol)

  return (
    <section aria-labelledby="housing-benchmark-info-title" className="border-t border-border pt-5 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 id="housing-benchmark-info-title" className="font-medium text-foreground">{etfContent.label} 안내</h3>
        <span className="text-xs text-muted-foreground">{etfContent.fullName}</span>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
        <div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">정식 명칭</dt>
              <dd className="mt-1 font-medium">{etfContent.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">위험 구분</dt>
              <dd className="mt-1 font-medium">{etfContent.riskChipLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">설명</dt>
              <dd className="mt-1 leading-5">{etfContent.description}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="font-medium text-foreground">통화 및 데이터 기준</p>
          <p className="mt-2 text-foreground">{notice ?? ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK}</p>
          <p className="mt-1">
            데이터 출처: Alpaca Market Data (일별 종가)
            {benchmark?.sourceUpdatedDate ? ` · 업데이트 ` : ''}
            {benchmark?.sourceUpdatedDate ? <time dateTime={benchmark.sourceUpdatedDate}>{benchmark.sourceUpdatedDate}</time> : null}
          </p>
        </div>
      </div>
    </section>
  )
}
