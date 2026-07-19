import { fmtDateTime, fmtUsd } from '@shared/lib/format'
import type { CurrentExchangeRate, HousingBenchmark } from '@entities/stats'
import {
  getHousingQuintileContent,
  HOUSING_QUINTILE_DISCLAIMER,
  LOCAL_CURRENCY_NOTICE,
  type HousingQuintile,
} from './housingBenchmarkContent'

interface Props {
  quintile: HousingQuintile
  benchmark?: HousingBenchmark
  currentExchangeRate?: CurrentExchangeRate | null
  notice?: string
}

export function HousingBenchmarkInfo({ quintile, benchmark, currentExchangeRate, notice }: Props) {
  const content = getHousingQuintileContent(quintile)

  return (
    <section aria-labelledby="housing-benchmark-info-title" className="border-t border-border pt-5 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 id="housing-benchmark-info-title" className="font-medium text-foreground">{content.label} 안내</h3>
        <span className="text-xs text-muted-foreground">{content.rangeLabel}</span>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,1fr)]">
        <div>
          <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">가격 구간</dt>
            <dd className="mt-1 font-medium">{content.rangeLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">자주 언급되는 지역</dt>
            <dd className="mt-1 font-medium">{content.representativeAreas}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">특징</dt>
            <dd className="mt-1 leading-5">{content.characteristics}</dd>
          </div>
          </dl>

          <div className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">해당 가격대에서 자주 언급되는 지역·단지 예시</span>
              {' '}{content.examples}
            </p>
            <p className="mt-2">{HOUSING_QUINTILE_DISCLAIMER}</p>
          </div>
        </div>

        <div className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="font-medium text-foreground">통화 및 데이터 기준</p>
          <p className="mt-2 text-foreground">{LOCAL_CURRENCY_NOTICE}</p>
          {notice ? <p className="mt-1">{notice}</p> : null}
          <p className="mt-1">
            데이터 출처: KB부동산 서울 아파트 5분위 매매평균가격
            {benchmark?.sourceUpdatedDate ? ` · 업데이트 ` : ''}
            {benchmark?.sourceUpdatedDate ? <time dateTime={benchmark.sourceUpdatedDate}>{benchmark.sourceUpdatedDate}</time> : null}
          </p>
          {currentExchangeRate?.midRate != null ? (
            <p className="mt-1 tabular-nums">
              현재 환율 참고: <span>1 USD = {fmtUsd(currentExchangeRate.midRate)} KRW</span>
              {currentExchangeRate.fetchedAt ? ` · ${fmtDateTime(currentExchangeRate.fetchedAt)}` : ''}
              {currentExchangeRate.source ? ` · ${currentExchangeRate.source}` : ''}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
