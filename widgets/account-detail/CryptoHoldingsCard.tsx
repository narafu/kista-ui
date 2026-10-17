'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { fmtKrw, fmtQuantity } from '@shared/lib/format'
import type { CryptoPortfolio } from '@entities/trade'

interface Props {
  portfolio: CryptoPortfolio | undefined
  isError: boolean // 호출부가 isError && !data로 계산해 넘긴다
}

const UNAVAILABLE = '현재가 확인 불가'

export function CryptoHoldingsCard({ portfolio, isError }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base">보유 코인</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {isError ? (
          <EmptyState variant="text" message="보유 코인을 불러오지 못했습니다." />
        ) : !portfolio ? (
          <LoadingRow />
        ) : portfolio.holdings.length === 0 ? (
          <EmptyState variant="text" message="보유한 코인이 없습니다." />
        ) : (
          <div role="region" aria-label="보유 코인 목록" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">종목</th>
                  <th className="py-2 pr-4 font-medium text-right">수량</th>
                  <th className="py-2 pr-4 font-medium text-right">평단가</th>
                  <th className="py-2 pr-4 font-medium text-right">현재가</th>
                  <th className="py-2 font-medium text-right">평가금액</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="border-t border-border">
                    <td className="py-2 pr-4 font-semibold">{h.ticker}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{fmtQuantity(h.quantity)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{fmtKrw(h.avgBuyPrice)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtKrw(h.currentPrice)}</td>
                    <td className="py-2 text-right tabular-nums whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtKrw(h.evalAmountKrw)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
