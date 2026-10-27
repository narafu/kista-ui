'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { fmtMoney, fmtQuantity } from '@shared/lib/format'
import type { CryptoPortfolio } from '@entities/trade'
import { SectionError } from '@shared/ui/SectionError'

interface Props {
  portfolio: CryptoPortfolio | undefined
  isError: boolean // 호출부가 isError && !data로 계산해 넘긴다
}

const UNAVAILABLE = <span className="text-muted-foreground">현재가 확인 불가</span>

export function CryptoHoldingsCard({ portfolio, isError }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">보유 코인</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="px-6 pb-6"><SectionError message="보유 코인을 불러오지 못했습니다." /></div>
        ) : !portfolio ? (
          <LoadingRow />
        ) : portfolio.holdings.length === 0 ? (
          <EmptyState variant="text" message="보유한 코인이 없습니다." />
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 p-4 lg:hidden">
              {portfolio.holdings.map((h) => (
                <div key={h.ticker} className="rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge tone="brand" size="sm" className="px-2.5 font-bold">{h.ticker}</Badge>
                    <span className="text-sm font-semibold">{fmtQuantity(h.quantity)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                      평단가 <span className="font-semibold text-foreground">{h.avgBuyPrice == null ? '-' : fmtMoney(h.avgBuyPrice, portfolio.currency)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      현재가 <span className="font-semibold text-foreground">{h.currentPrice == null ? UNAVAILABLE : fmtMoney(h.currentPrice, portfolio.currency)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">평가금액</span>
                    <span className="font-semibold text-foreground">{h.currentPrice == null ? UNAVAILABLE : fmtMoney(h.evalAmount, portfolio.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div role="region" aria-label="보유 코인 목록" tabIndex={0} className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <TableHeadCell className="whitespace-nowrap">종목</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">수량</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">평단가</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">현재가</TableHeadCell>
                  <TableHeadCell numeric className="whitespace-nowrap">평가금액</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => (
                  <tr key={h.ticker} className="border-t hover:bg-muted/30 transition-colors">
                    <TableDataCell className="font-semibold whitespace-nowrap">{h.ticker}</TableDataCell>
                    <TableDataCell className="text-right tabular-nums whitespace-nowrap">{fmtQuantity(h.quantity)}</TableDataCell>
                    <TableDataCell className="text-right tabular-nums whitespace-nowrap">{h.avgBuyPrice == null ? '-' : fmtMoney(h.avgBuyPrice, portfolio.currency)}</TableDataCell>
                    <TableDataCell className="text-right tabular-nums whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtMoney(h.currentPrice, portfolio.currency)}</TableDataCell>
                    <TableDataCell className="text-right tabular-nums whitespace-nowrap">{h.currentPrice == null ? UNAVAILABLE : fmtMoney(h.evalAmount, portfolio.currency)}</TableDataCell>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
