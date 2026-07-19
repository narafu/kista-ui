import { fmtDateTime, fmtUsd as fmtNumber } from '@shared/lib/format'
import type { CurrentExchangeRate, EtfBenchmarkSymbol, HousingBenchmark } from '@entities/stats'
import {
  getEtfBenchmarkContent,
  getHousingQuintileContent,
  HOUSING_BENCHMARK_CURRENCY_NOTICE_FALLBACK,
  type HousingQuintile,
} from './housingBenchmarkContent'

interface Props {
  benchmark?: HousingBenchmark
  currentExchangeRate?: CurrentExchangeRate | null
  notice?: string
}

function isHousingQuintile(value: number | null | undefined): value is HousingQuintile {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

export function HousingBenchmarkInfo({ benchmark, currentExchangeRate, notice }: Props) {
  const isEtf = benchmark?.assetType === 'ETF'
  const housingQuintile = isHousingQuintile(benchmark?.quintile) ? benchmark.quintile : 3
  const housingContent = getHousingQuintileContent(housingQuintile)
  const etfContent = isEtf ? getEtfBenchmarkContent((benchmark?.symbol ?? 'SPY') as EtfBenchmarkSymbol) : null

  const title = etfContent ? `${etfContent.label} 안내` : `${housingContent.label} 안내`
  const subtitle = etfContent ? etfContent.fullName : housingContent.rangeLabel

  return (
    <section aria-labelledby="housing-benchmark-info-title" className="border-t border-border pt-5 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 id="housing-benchmark-info-title" className="font-medium text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
        <div>
          {etfContent ? (
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
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">가격 구간</dt>
                <dd className="mt-1 font-medium">{housingContent.rangeLabel}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">자주 언급되는 지역</dt>
                <dd className="mt-1 font-medium">{housingContent.representativeAreas}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">특징</dt>
                <dd className="mt-1 leading-5">{housingContent.characteristics}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="font-medium text-foreground">통화 및 데이터 기준</p>
          <p className="mt-2 text-foreground">{notice ?? HOUSING_BENCHMARK_CURRENCY_NOTICE_FALLBACK}</p>
          <p className="mt-1">
            데이터 출처: {isEtf ? 'Alpaca Market Data (일별 종가)' : 'KB부동산 서울 아파트 5분위 매매평균가격'}
            {benchmark?.sourceUpdatedDate ? ` · 업데이트 ` : ''}
            {benchmark?.sourceUpdatedDate ? <time dateTime={benchmark.sourceUpdatedDate}>{benchmark.sourceUpdatedDate}</time> : null}
          </p>
          {!isEtf && currentExchangeRate?.midRate != null ? (
            <p className="mt-1 tabular-nums">
              현재 환율 참고: <span>1 USD = {fmtNumber(currentExchangeRate.midRate)} KRW</span>
              {currentExchangeRate.fetchedAt ? ` · ${fmtDateTime(currentExchangeRate.fetchedAt)}` : ''}
              {currentExchangeRate.source ? ` · ${currentExchangeRate.source}` : ''}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
