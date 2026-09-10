'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconButton } from '@shared/ui/IconButton'
import { Spinner } from '@shared/ui/Spinner'
import { todayKst } from '@shared/lib/format'
import { apiMsg } from '@shared/lib/api-client'
import { createAdminPrivacyBase } from '@entities/privacy'
import type { AdminPrivacyOrder, AdminPrivacyOrderRequest } from '@entities/privacy'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DraftOrder {
  direction: AdminPrivacyOrder['direction']
  orderType: AdminPrivacyOrder['orderType']
  price: string
  quantity: string
}

const EMPTY_ORDER: DraftOrder = { direction: 'BUY', orderType: 'LOC', price: '', quantity: '' }

export function CreatePrivacyBaseDialog({ open, onOpenChange }: Props) {
  const [releaseDate, setReleaseDate] = useState(todayKst())
  const [ticker, setTicker] = useState('')
  const [currentCycleStart, setCurrentCycleStart] = useState('')
  const [currentCycleRealizedPnl, setCurrentCycleRealizedPnl] = useState('0')
  const [avgPrice, setAvgPrice] = useState('')
  const [holdings, setHoldings] = useState('0')
  const [orders, setOrders] = useState<DraftOrder[]>([{ ...EMPTY_ORDER }])
  const [isPending, setIsPending] = useState(false)

  const ordersValid = orders.every((o) => o.price !== '' && (o.direction !== 'BUY' || o.quantity !== ''))
  const canSubmit = ticker.trim() !== '' && releaseDate !== '' && currentCycleStart !== '' && currentCycleRealizedPnl !== '' && holdings !== '' && ordersValid

  function updateOrder(index: number, patch: Partial<DraftOrder>) {
    setOrders((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsPending(true)
    try {
      const orderRequests: AdminPrivacyOrderRequest[] = orders.map((o) => ({
        direction: o.direction,
        orderType: o.orderType,
        price: Number(o.price),
        quantity: o.quantity === '' ? null : Number(o.quantity),
      }))
      await createAdminPrivacyBase({
        releaseDate,
        ticker: ticker.trim(),
        currentCycleStart: Number(currentCycleStart),
        currentCycleRealizedPnl: Number(currentCycleRealizedPnl),
        avgPrice: avgPrice === '' ? null : Number(avgPrice),
        holdings: Number(holdings),
        orders: orderRequests,
      })
      // 현재 화면은 기간·페이지 필터가 걸린 서버 조회 결과라 방금 등록한 항목이 그 범위 밖이면
      // 목록에 낙관적으로 얹을 수 없다 — 새로고침으로 안내한다.
      toast.success('P 매매표가 등록되었습니다. 목록에 보이지 않으면 새로고침하세요.')
      onOpenChange(false)
    } catch (err) {
      toast.error(apiMsg(err, '등록에 실패했습니다'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>P 매매표 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="releaseDate">날짜</Label>
                <Input id="releaseDate" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} disabled={isPending} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticker">종목</Label>
                <Input id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} disabled={isPending} maxLength={20} className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="createCurrentCycleStart">사이클 시작금액</Label>
                <Input id="createCurrentCycleStart" type="number" step="0.01" value={currentCycleStart} onChange={(e) => setCurrentCycleStart(e.target.value)} disabled={isPending} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createAvgPrice">평단가 (없으면 비움)</Label>
                <Input id="createAvgPrice" type="number" step="0.01" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} disabled={isPending} className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="createHoldings">보유</Label>
                <Input id="createHoldings" type="number" step="1" min="0" value={holdings} onChange={(e) => setHoldings(e.target.value)} disabled={isPending} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createRealizedPnl">실현손익</Label>
                <Input id="createRealizedPnl" type="number" step="0.01" value={currentCycleRealizedPnl} onChange={(e) => setCurrentCycleRealizedPnl(e.target.value)} disabled={isPending} className="h-11" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>주문</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setOrders((prev) => [...prev, { ...EMPTY_ORDER }])} disabled={isPending}>
                  <Plus className="size-3.5" />주문 추가
                </Button>
              </div>

              {orders.map((o, i) => (
                <div key={i} className="flex items-end gap-2 rounded-[var(--r-sm)] border border-border p-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">방향</Label>
                    <Select items={[{ value: 'BUY', label: '매수' }, { value: 'SELL', label: '매도' }]} value={o.direction} onValueChange={(v) => { if (v) updateOrder(i, { direction: v as DraftOrder['direction'] }) }}>
                      <SelectTrigger className="h-10" disabled={isPending}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">매수</SelectItem>
                        <SelectItem value="SELL">매도</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">유형</Label>
                    <Select items={[{ value: 'LOC', label: 'LOC' }, { value: 'MOC', label: 'MOC' }, { value: 'LIMIT', label: 'LIMIT' }]} value={o.orderType} onValueChange={(v) => { if (v) updateOrder(i, { orderType: v as DraftOrder['orderType'] }) }}>
                      <SelectTrigger className="h-10" disabled={isPending}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOC">LOC</SelectItem>
                        <SelectItem value="MOC">MOC</SelectItem>
                        <SelectItem value="LIMIT">LIMIT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">가격</Label>
                    <Input type="number" step="0.01" value={o.price} onChange={(e) => updateOrder(i, { price: e.target.value })} disabled={isPending} className="h-10" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">수량{o.direction !== 'BUY' && '(선택)'}</Label>
                    <Input type="number" step="1" min="1" value={o.quantity} onChange={(e) => updateOrder(i, { quantity: e.target.value })} disabled={isPending} className="h-10" />
                  </div>
                  {orders.length > 1 && (
                    <IconButton aria-label="주문 삭제" onClick={() => setOrders((prev) => prev.filter((_, idx) => idx !== i))} disabled={isPending}>
                      <X className="size-4" />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="gap-2" disabled={isPending || !canSubmit}>
              {isPending ? <><Spinner size={14} />등록 중...</> : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
