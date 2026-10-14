'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SaveButton } from '@shared/ui/SaveButton'
import { DIRECTION_LABEL, orderTypeLabel } from '@entities/trade'
import { orderRequiresQuantity, useUpdateAdminPrivacyOrderMutation } from '@entities/privacy'
import type { AdminPrivacyOrder } from '@entities/privacy'
import { PrivacyOrderQuantityField } from './PrivacyOrderQuantityField'

interface Props {
  baseId: string
  order: AdminPrivacyOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPrivacyOrderDialog({ baseId, order, open, onOpenChange }: Props) {
  const [price, setPrice] = useState(String(order.price))
  const [quantity, setQuantity] = useState(order.quantity == null ? '' : String(order.quantity))
  const updateMutation = useUpdateAdminPrivacyOrderMutation(baseId, order.id)

  // BUY는 quantity 필수 — 서버가 400으로 거부하므로 선제 차단.
  const priceInvalid = price !== '' && Number(price) <= 0
  const canSubmit = price !== '' && Number(price) > 0 && (!orderRequiresQuantity(order.direction) || quantity !== '')
  const isPending = updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    updateMutation.mutate({
      price: Number(price),
      quantity: quantity === '' ? null : Number(quantity),
    }, {
      onSuccess: () => {
        toast.success('주문이 수정되었습니다')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{DIRECTION_LABEL[order.direction] ?? order.direction} {orderTypeLabel(order.orderType)} 주문 수정</DialogTitle>
            <DialogDescription>가격, 수량을 입력하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="orderPrice">가격</Label>
              <Input
                id="orderPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isPending}
                aria-invalid={priceInvalid || undefined}
                aria-describedby={priceInvalid ? 'orderPrice-error' : undefined}
                className="h-11"
              />
              {priceInvalid && <p id="orderPrice-error" className="text-xs text-destructive">가격은 0보다 커야 합니다.</p>}
            </div>

            <div className="space-y-2">
              <PrivacyOrderQuantityField id="orderQuantity" direction={order.direction} value={quantity} onChange={setQuantity} disabled={isPending} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <SaveButton isPending={isPending} disabled={!canSubmit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
