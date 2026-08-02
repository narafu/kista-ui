import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@shared/lib/utils'
import { pnlTextClass, fmtSignedPercent, fmtSignedPercentPoint } from '@shared/lib/format'
import type { HousingBenchmarkSummary as HousingBenchmarkSummaryData } from '@entities/stats'

interface Props {
  summary: HousingBenchmarkSummaryData
  investmentLabel: string
  benchmarkLabel: string
  benchmarkCurrency: 'USD' | 'KRW'
}

const METRICS: {
  label: string
  investmentKey: keyof HousingBenchmarkSummaryData
  benchmarkKey: keyof HousingBenchmarkSummaryData
}[] = [
  {
    label: '누적 수익률',
    investmentKey: 'investmentCumulativeReturn',
    benchmarkKey: 'benchmarkCumulativeReturn',
  },
  {
    label: '연평균 수익률',
    investmentKey: 'investmentAnnualizedReturn',
    benchmarkKey: 'benchmarkAnnualizedReturn',
  },
  {
    label: '최대 낙폭',
    investmentKey: 'investmentMaxDrawdown',
    benchmarkKey: 'benchmarkMaxDrawdown',
  },
]

export function HousingBenchmarkSummary({ summary, investmentLabel, benchmarkLabel, benchmarkCurrency }: Props) {
  return (
    <Card className="gap-0 overflow-hidden py-0" aria-label="장기 초과 성과 요약">
      <div className="grid grid-cols-2 sm:grid-cols-3">
        <div className="col-span-2 border-b border-border p-4 sm:col-span-1 sm:border-b-0 sm:border-r sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">초과 성과</p>
          <p className={cn(
            'mt-1 break-words text-3xl font-bold tabular-nums sm:text-4xl',
            summary.excessReturn != null && pnlTextClass(summary.excessReturn),
          )}>
            {fmtSignedPercentPoint(summary.excessReturn)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">투자 누적 - 벤치마크 누적</p>
        </div>
        <div className="min-w-0 border-r border-border p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">투자 누적 수익률</p>
          <p className={cn(
            'mt-1 break-words text-xl font-bold tabular-nums sm:text-2xl',
            summary.investmentCumulativeReturn != null && pnlTextClass(summary.investmentCumulativeReturn),
          )}>
            {fmtSignedPercent(summary.investmentCumulativeReturn)}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={`${investmentLabel} · USD`}>
            {investmentLabel} · USD
          </p>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <p className="text-xs font-medium text-muted-foreground">벤치마크 누적 상승률</p>
          <p className={cn(
            'mt-1 break-words text-xl font-bold tabular-nums sm:text-2xl',
            summary.benchmarkCumulativeReturn != null && pnlTextClass(summary.benchmarkCumulativeReturn),
          )}>
            {fmtSignedPercent(summary.benchmarkCumulativeReturn)}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={`${benchmarkLabel} · ${benchmarkCurrency}`}>
            {benchmarkLabel} · {benchmarkCurrency}
          </p>
        </div>
      </div>

      <CardContent className="border-t border-border p-0">
        <div className="px-3 pb-1 pt-4 sm:px-5">
          <h3 className="text-sm font-medium text-foreground">장기 성과 지표</h3>
        </div>
        <table className="w-full table-fixed text-xs sm:text-sm" aria-label="장기 성과 지표 비교">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="w-[34%] px-2 py-3 text-left font-medium sm:px-4">지표</th>
              <th className="w-[33%] px-2 py-3 text-right font-medium sm:px-4">투자</th>
              <th className="w-[33%] px-2 py-3 text-right font-medium sm:px-4">벤치마크</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((metric) => {
              const investmentValue = summary[metric.investmentKey]
              const benchmarkValue = summary[metric.benchmarkKey]
              return (
                <tr key={metric.label} className="border-t">
                  <th scope="row" className="px-2 py-3 text-left font-medium sm:px-4">
                    {metric.label}
                  </th>
                  <td className={cn(
                    'px-2 py-3 text-right tabular-nums sm:px-4',
                    investmentValue != null && pnlTextClass(investmentValue),
                  )}>
                    {fmtSignedPercent(investmentValue, 2)}
                  </td>
                  <td className={cn(
                    'px-2 py-3 text-right tabular-nums sm:px-4',
                    benchmarkValue != null && pnlTextClass(benchmarkValue),
                  )}>
                    {fmtSignedPercent(benchmarkValue, 2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
