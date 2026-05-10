'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { getAccountReservationOrders } from '@/lib/api/trades'
import type { ReservationOrder } from '@/types/trade'

interface Props {
  accountId: string
}

function getDefaultRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

export function ReservationOrdersCard({ accountId }: Props) {
  const [orders, setOrders] = useState<ReservationOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session) return
        const data = await getAccountReservationOrders(
          accountId,
          getDefaultRange(),
          session.access_token
        ).catch((): ReservationOrder[] => [])
        if (!cancelled) setOrders(data)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accountId])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">예약주문 (최근 30일)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
            로딩 중...
          </div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">예약주문 내역이 없습니다.</p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 lg:hidden">
              {orders.map((order) => (
                <Card key={order.reservationOrderId} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={order.direction === 'BUY' ? 'default' : 'secondary'}>
                        {order.direction === 'BUY' ? '매수' : '매도'}
                      </Badge>
                      <span className="font-medium text-sm">{order.symbol}</span>
                      {order.symbolName && (
                        <span className="text-xs text-muted-foreground">{order.symbolName}</span>
                      )}
                    </div>
                    <Badge variant={order.cancelled ? 'destructive' : 'outline'} className="text-xs">
                      {order.cancelled ? '취소' : order.statusName}
                    </Badge>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{order.orderedQty}주 × ${order.orderedPrice.toFixed(2)} (체결 {order.filledQty}주)</span>
                    <span>{order.receiptDate}</span>
                  </div>
                </Card>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['접수일시', '종목', '구분', '주문수량', '주문단가', '체결수량', '상태', '취소'].map((h) => (
                      <th key={h} className="px-3 py-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.reservationOrderId} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 text-muted-foreground text-xs">
                        {order.receiptDate} {order.receiptTime}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{order.symbol}</div>
                        {order.symbolName && (
                          <div className="text-xs text-muted-foreground">{order.symbolName}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={order.direction === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                          {order.direction === 'BUY' ? '매수' : '매도'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">{order.orderedQty}주</td>
                      <td className="px-3 py-3">${order.orderedPrice.toFixed(2)}</td>
                      <td className="px-3 py-3">{order.filledQty}주</td>
                      <td className="px-3 py-3 text-xs">{order.statusName}</td>
                      <td className="px-3 py-3">
                        {order.cancelled && (
                          <Badge variant="destructive" className="text-xs">취소</Badge>
                        )}
                      </td>
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
