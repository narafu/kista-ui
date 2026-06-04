'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAccountMarginQuery } from '@/hooks/useAccountMarginQuery'

interface Props {
  accountId: string
}

export function MarginCard({ accountId }: Props) {
  const { items, isLoading } = useAccountMarginQuery(accountId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">증거금</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            로딩 중...
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">증거금 정보가 없습니다.</p>
        ) : (
          <div>
            {items.map((item) => (
              <div key={item.currency} className="rounded-lg border p-3.5 bg-muted mb-3 last:mb-0">
                <div className="mb-2.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 tracking-wide">
                    {item.currency}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">주문가능금액</p>
                  <p className="font-medium">${item.purchasableAmount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
