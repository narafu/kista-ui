'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { MobileSortControl } from '@shared/ui/MobileSortControl'
import { useTableSort } from '@shared/lib/hooks/use-table-sort'
import { TableDataCell } from '@shared/ui/TableDataCell'
import { fmtMoney, fmtQuantity } from '@shared/lib/format'
import type { CryptoPortfolio } from '@entities/trade'
import { SectionError } from '@shared/ui/SectionError'

interface Props {
  portfolio: CryptoPortfolio | undefined
  isError: boolean // 호출부가 isError && !data로 계산해 넘긴다
}

const UNAVAILABLE = <span className="text-muted-foreground">현재가 확인 불가</span>
// 모바일 카드는 "현재가"·"평가금액" 라벨이 앞에 붙어 있어 라벨을 반복하지 않는다
const CARD_UNAVAILABLE = <span className="text-muted-foreground">확인 불가</span>

type CryptoHolding = CryptoPortfolio['holdings'][number]
type SortKey = 'default' | 'ticker' | 'quantity' | 'avgBuyPrice' | 'currentPrice' | 'evalAmount'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'ticker', label: '종목' },
  { key: 'quantity', label: '수량' },
  { key: 'avgBuyPrice', label: '평단가' },
  { key: 'currentPrice', label: '현재가' },
  { key: 'evalAmount', label: '평가금액' },
]

// 현재가 조회 실패 시 evalAmount는 0으로 정규화돼 있어 null로 취급한다
function sortValue(h: CryptoHolding, key: Exclude<SortKey, 'default' | 'ticker'>) {
  if (key === 'evalAmount') return h.currentPrice == null ? null : h.evalAmount
  return h[key]
}

export function CryptoHoldingsCard({ portfolio, isError }: Props) {
  // 'default'는 헤더에 없는 키 — API 응답 순서 유지
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('default')
  const holdings = portfolio?.holdings ?? []
  const sorted = sortKey === 'default' ? holdings : [...holdings].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1
    if (sortKey === 'ticker') return dir * a.ticker.localeCompare(b.ticker, 'ko')
    const av = sortValue(a, sortKey), bv = sortValue(b, sortKey)
    if (av == null) return bv == null ? 0 : 1 // null은 방향과 무관하게 맨 아래
    if (bv == null) return -1
    return dir * (av - bv)
  })
  const head = { activeKey: sortKey, direction: sortDirection, onSort: handleSort }
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">보유 종목</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isError ? (
          <div className="px-6 pb-6"><SectionError message="보유 종목을 불러오지 못했습니다." /></div>
        ) : !portfolio ? (
          <LoadingRow />
        ) : portfolio.holdings.length === 0 ? (
          <EmptyState variant="text" message="보유한 종목이 없습니다." />
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <MobileSortControl {...head} options={SORT_OPTIONS} />
            <div className="space-y-2 px-4 pb-4 lg:hidden">
              {sorted.map((h) => (
                <div key={h.ticker} className="rounded-[var(--r-md)] border border-border bg-card px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="brand" size="sm" className="px-2.5 font-bold">{h.ticker}</Badge>
                    <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{fmtQuantity(h.quantity)}</span>
                  </div>
                  {/* 360px에서 "평단가 65,123.45 USDT"가 줄바꿈되지 않도록 라벨 위·값 아래 2열로 둔다 */}
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">평단가</dt>
                      <dd className="whitespace-nowrap font-semibold tabular-nums text-foreground">{h.avgBuyPrice == null ? '-' : fmtMoney(h.avgBuyPrice, portfolio.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">현재가</dt>
                      <dd className="whitespace-nowrap font-semibold tabular-nums text-foreground">{h.currentPrice == null ? CARD_UNAVAILABLE : fmtMoney(h.currentPrice, portfolio.currency)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">평가금액</dt>
                      <dd className="whitespace-nowrap font-semibold tabular-nums text-foreground">{h.currentPrice == null ? CARD_UNAVAILABLE : fmtMoney(h.evalAmount, portfolio.currency)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div role="region" aria-label="보유 종목 목록" tabIndex={0} className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <SortableHeadCell sortKey="ticker" {...head} className="whitespace-nowrap">종목</SortableHeadCell>
                  <SortableHeadCell sortKey="quantity" numeric {...head} className="whitespace-nowrap">수량</SortableHeadCell>
                  <SortableHeadCell sortKey="avgBuyPrice" numeric {...head} className="whitespace-nowrap">평단가</SortableHeadCell>
                  <SortableHeadCell sortKey="currentPrice" numeric {...head} className="whitespace-nowrap">현재가</SortableHeadCell>
                  <SortableHeadCell sortKey="evalAmount" numeric {...head} className="whitespace-nowrap">평가금액</SortableHeadCell>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => (
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
