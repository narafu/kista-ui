'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { fmtKrw, fmtQuantity } from '@shared/lib/format'
import type { CryptoPortfolio } from '@entities/trade'

interface Props {
  portfolio: CryptoPortfolio | undefined
  isError: boolean // 호출부가 isError && !data로 계산해 넘긴다
}

// 금액 셀은 font-mono지만 안내 문구는 숫자가 아니라 본문 글꼴로 되돌린다
const UNAVAILABLE = <span className="font-sans text-muted-foreground">현재가 확인 불가</span>

export function CryptoHoldingsCard({ portfolio, isError }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base">보유 코인</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <EmptyState variant="text" message="보유 코인을 불러오지 못했습니다." />
        ) : !portfolio ? (
          <LoadingRow />
        ) : portfolio.holdings.length === 0 ? (
          <EmptyState variant="text" message="보유한 코인이 없습니다." />
        ) : (
          <div role="region" aria-label="보유 코인 목록" tabIndex={0} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">종목</TableHeadCell>
                  <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">수량</TableHeadCell>
                  <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">평단가</TableHeadCell>
                  <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">현재가</TableHeadCell>
                  <TableHeadCell className="text-xs lg:text-sm whitespace-nowrap">평가금액</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="border-t hover:bg-muted/30 transition-colors">
                    <TableDataCell className="font-semibold whitespace-nowrap">{h.ticker}</TableDataCell>
                    <TableDataCell className="whitespace-nowrap">{fmtQuantity(h.quantity)}</TableDataCell>
                    <TableDataCell className="font-mono text-xs whitespace-nowrap">{fmtKrw(h.avgBuyPrice)}</TableDataCell>
                    <TableDataCell className="font-mono text-xs whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtKrw(h.currentPrice)}</TableDataCell>
                    <TableDataCell className="font-mono text-xs whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtKrw(h.evalAmountKrw)}</TableDataCell>
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
