'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getAccountMargin } from '@/lib/api/trades'
import type { MarginItem } from '@/types/trade'

interface Props {
  accountId: string
}

export function MarginCard({ accountId }: Props) {
  const [items, setItems] = useState<MarginItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        if (!session) return
        const data = await getAccountMargin(accountId, session.access_token).catch((): MarginItem[] => [])
        if (!cancelled) setItems(data)
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
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.currency} className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-semibold">{item.currency}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">주문가능금액</p>
                    <p className="font-medium">{item.integratedOrderableAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">외화잔고</p>
                    <p className="font-medium">{item.foreignBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
