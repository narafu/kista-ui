'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TradeToast } from './TradeToast'
import type { TradeEvent } from '@entities/trade'

const RECONNECT_DELAY_MS = 5000

export function TradeNotificationProvider() {
  const router = useRouter()
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function connect() {
      esRef.current?.close()
      const es = new EventSource('/api/trades/stream')
      esRef.current = es

      es.addEventListener('trade', (e: MessageEvent) => {
        try {
          const event: TradeEvent = JSON.parse(e.data as string)
          toast.custom(
            () => <TradeToast event={event} />,
            { duration: 6000 },
          )
          router.refresh()
        } catch {
          // parse 오류 무시
        }
      })

      es.onerror = () => {
        es.close()
        retryRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [router])

  return null
}
