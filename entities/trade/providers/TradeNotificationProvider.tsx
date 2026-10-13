'use client'

import { useEffect, useEffectEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TradeToast } from './TradeToast'
import type { TradeEvent } from '@entities/trade'

const RECONNECT_DELAY_MS = 5000

interface Props {
  // 체결로 바뀌는 타 도메인 캐시 무효화 — entities 간 cross-import를 피하려고 상위 계층(widgets)이 주입한다
  onTrade?: (event: TradeEvent) => void
}

export function TradeNotificationProvider({ onTrade }: Props) {
  const router = useRouter()
  // 콜백 identity가 바뀌어도 EventSource를 재연결하지 않는다
  const handleTrade = useEffectEvent((event: TradeEvent) => onTrade?.(event))
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let stopped = false

    function connect() {
      if (stopped) return
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
          handleTrade(event)
          // 레이아웃·페이지의 서버 렌더 집계(계좌 포트폴리오 등)는 React Query 키가 없어 refresh로만 갱신된다
          router.refresh()
        } catch {
          // parse 오류 무시
        }
      })

      // 인증 실패 시 재연결 중단 (무한 401 루프 방지)
      es.addEventListener('auth-error', () => {
        es.close()
        stopped = true
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
