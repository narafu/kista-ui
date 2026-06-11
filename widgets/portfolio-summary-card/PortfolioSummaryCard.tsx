import type { PortfolioSnapshot } from '@entities/trade'
import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd } from '@shared/lib/format'

interface Props {
  portfolio: PortfolioSnapshot
}

export function PortfolioSummaryCard({ portfolio }: Props) {
  return (
    <div className="rounded-[var(--r-lg)] p-5 shadow-[var(--sh-card)] border border-border mb-5" style={{ background: 'var(--card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[13.5px] font-semibold">포트폴리오 현황</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">최근 종가 기준</div>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}>
          {portfolio.ticker}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="종목" value={portfolio.ticker} />
        <KpiCard label="보유 수량" value={`${portfolio.holdings}주`} />
        <KpiCard label="평단가" value={portfolio.avgPrice != null ? `$${fmtUsd(portfolio.avgPrice)}` : '-'} />
        <KpiCard label="종가" value={portfolio.closingPrice != null ? `$${fmtUsd(portfolio.closingPrice)}` : '-'} />
        <KpiCard label="평가금액" value={`$${fmtUsd(portfolio.marketValueUsd)}`} />
        <KpiCard label="USD 예수금" value={`$${fmtUsd(portfolio.usdDeposit)}`} />
        <KpiCard label="총 자산" value={`$${fmtUsd(portfolio.totalAssetUsd)}`} variant="soft" />
      </div>
    </div>
  )
}
