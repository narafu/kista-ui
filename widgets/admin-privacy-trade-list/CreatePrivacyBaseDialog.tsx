'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconButton } from '@shared/ui/IconButton'
import { SaveButton } from '@shared/ui/SaveButton'
import { todayKst } from '@shared/lib/format'
import { orderRequiresQuantity, useCreateAdminPrivacyBaseMutation } from '@entities/privacy'
import type { AdminPrivacyOrder, AdminPrivacyOrderRequest } from '@entities/privacy'
import { DIRECTION_ITEMS, ORDER_TYPE_ITEMS } from './orderSelectItems'
import { PrivacyOrderQuantityField } from './PrivacyOrderQuantityField'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DraftOrder {
  // 행 삭제 시 입력 상태(수량 touched 등)가 다른 행으로 밀리지 않도록 index 대신 안정 key로 쓴다
  key: number
  direction: AdminPrivacyOrder['direction']
  orderType: AdminPrivacyOrder['orderType']
  price: string
  quantity: string
}

let nextOrderKey = 0
const newDraftOrder = (): DraftOrder => ({ key: nextOrderKey++, direction: 'BUY', orderType: 'LOC', price: '', quantity: '' })

export function CreatePrivacyBaseDialog({ open, onOpenChange }: Props) {
  const [releaseDate, setReleaseDate] = useState(() => todayKst())
  const [ticker, setTicker] = useState('SOXL')
  const [currentCycleStart, setCurrentCycleStart] = useState('')
  const [currentCycleRealizedPnl, setCurrentCycleRealizedPnl] = useState('0')
  const [avgPrice, setAvgPrice] = useState('')
  const [holdings, setHoldings] = useState('0')
  const [orders, setOrders] = useState<DraftOrder[]>(() => [newDraftOrder()])
  const createMutation = useCreateAdminPrivacyBaseMutation()

  const ordersValid = orders.every((o) => o.price !== '' && Number(o.price) > 0 && (!orderRequiresQuantity(o.direction) || o.quantity !== ''))
  const canSubmit = ticker.trim() !== '' && releaseDate !== '' && currentCycleStart !== '' && currentCycleRealizedPnl !== '' && holdings !== '' && (avgPrice === '' || Number(avgPrice) >= 0) && ordersValid

  function updateOrder(index: number, patch: Partial<DraftOrder>) {
    setOrders((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const orderRequests: AdminPrivacyOrderRequest[] = orders.map((o) => ({
      direction: o.direction,
      orderType: o.orderType,
      price: Number(o.price),
      quantity: o.quantity === '' ? null : Number(o.quantity),
    }))
    createMutation.mutate({
      releaseDate,
      ticker: ticker.trim(),
      currentCycleStart: Number(currentCycleStart),
      currentCycleRealizedPnl: Number(currentCycleRealizedPnl),
      avgPrice: avgPrice === '' ? null : Number(avgPrice),
      holdings: Number(holdings),
      orders: orderRequests,
    }, {
      onSuccess: () => {
        toast.success('P 매매표가 등록되었습니다')
        onOpenChange(false)
      },
    })
  }

  const isPending = createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>P 매매표 등록</DialogTitle>
            <DialogDescription>날짜, 종목, 사이클 시작금액, 주문을 입력하세요.</DialogDescription>
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
                <Input id="createAvgPrice" type="number" step="0.01" min="0" value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} disabled={isPending} className="h-11" />
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

            <div role="group" aria-labelledby="createOrdersLabel" className="space-y-2">
              <div className="flex items-center justify-between">
                <span id="createOrdersLabel" className="text-sm font-medium">주문</span>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setOrders((prev) => [...prev, newDraftOrder()])} disabled={isPending}>
                  <Plus className="size-3.5" />주문 추가
                </Button>
              </div>

              {/* 좁은 화면은 2열(방향·유형 / 가격·수량), sm부터 한 줄 — 한 줄에 넷을 넣으면 입력칸이 찌그러진다 */}
              {orders.map((o, i) => (
                <div key={o.key} className="grid grid-cols-2 items-end gap-2 sm:flex rounded-[var(--r-sm)] border border-border p-3">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`base-order-${i}-direction`} className="text-xs">방향</Label>
                    <Select items={DIRECTION_ITEMS} value={o.direction} onValueChange={(v) => { if (v) updateOrder(i, { direction: v as DraftOrder['direction'] }) }}>
                      <SelectTrigger id={`base-order-${i}-direction`} className="h-10 w-full" disabled={isPending}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIRECTION_ITEMS.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`base-order-${i}-type`} className="text-xs">유형</Label>
                    <Select items={ORDER_TYPE_ITEMS} value={o.orderType} onValueChange={(v) => { if (v) updateOrder(i, { orderType: v as DraftOrder['orderType'] }) }}>
                      <SelectTrigger id={`base-order-${i}-type`} className="h-10 w-full" disabled={isPending}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ORDER_TYPE_ITEMS.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`base-order-${i}-price`} className="text-xs">가격</Label>
                    <Input
                      id={`base-order-${i}-price`}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={o.price}
                      onChange={(e) => updateOrder(i, { price: e.target.value })}
                      disabled={isPending}
                      aria-invalid={(o.price !== '' && Number(o.price) <= 0) || undefined}
                      aria-describedby={o.price !== '' && Number(o.price) <= 0 ? `base-order-${i}-price-error` : undefined}
                      className="h-10"
                    />
                    {o.price !== '' && Number(o.price) <= 0 && <p id={`base-order-${i}-price-error`} className="text-xs text-destructive">가격은 0보다 커야 합니다.</p>}
                  </div>
                  <div className="flex-1 space-y-1">
                    <PrivacyOrderQuantityField id={`base-order-${i}-quantity`} direction={o.direction} value={o.quantity} onChange={(v) => updateOrder(i, { quantity: v })} disabled={isPending} compact />
                  </div>
                  {orders.length > 1 && (
                    <IconButton aria-label={`주문 ${i + 1} 삭제`} className="col-span-2 justify-self-end sm:col-auto" onClick={() => setOrders((prev) => prev.filter((_, idx) => idx !== i))} disabled={isPending}>
                      <X className="size-4" />
                    </IconButton>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <SaveButton isPending={isPending} disabled={!canSubmit} label="등록" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
