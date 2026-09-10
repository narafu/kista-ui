'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { apiMsg } from '@shared/lib/api-client'
import { DIRECTION_LABEL } from '@entities/trade'
import { updateAdminPrivacyOrder } from '@entities/privacy'
import type { AdminPrivacyBase, AdminPrivacyOrder } from '@entities/privacy'

interface Props {
  baseId: string
  order: AdminPrivacyOrder
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (base: AdminPrivacyBase) => void
}

export function EditPrivacyOrderDialog({ baseId, order, open, onOpenChange, onUpdated }: Props) {
  const [price, setPrice] = useState(String(order.price))
  const [quantity, setQuantity] = useState(order.quantity == null ? '' : String(order.quantity))
  const [isPending, setIsPending] = useState(false)

  // BUY는 quantity 필수 — 서버가 400으로 거부하므로 선제 차단.
  const canSubmit = price !== '' && (order.direction !== 'BUY' || quantity !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsPending(true)
    try {
      const updated = await updateAdminPrivacyOrder(baseId, order.id, {
        price: Number(price),
        quantity: quantity === '' ? null : Number(quantity),
      })
      toast.success('주문이 수정되었습니다')
      onUpdated(updated)
      onOpenChange(false)
    } catch (err) {
      toast.error(apiMsg(err, '수정에 실패했습니다'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{DIRECTION_LABEL[order.direction] ?? order.direction} {order.orderType} 주문 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="orderPrice">가격</Label>
              <Input
                id="orderPrice"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderQuantity">수량{order.direction !== 'BUY' && ' (없으면 비움)'}</Label>
              <Input
                id="orderQuantity"
                type="number"
                step="1"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="gap-2" disabled={isPending || !canSubmit}>
              {isPending ? <><Spinner size={14} />저장 중...</> : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
