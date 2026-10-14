'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SaveButton } from '@shared/ui/SaveButton'
import { orderRequiresQuantity, useAddAdminPrivacyOrderMutation } from '@entities/privacy'
import type { AdminPrivacyOrder } from '@entities/privacy'
import { DIRECTION_ITEMS, ORDER_TYPE_ITEMS } from './orderSelectItems'
import { PrivacyOrderQuantityField } from './PrivacyOrderQuantityField'

interface Props {
  baseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPrivacyOrderDialog({ baseId, open, onOpenChange }: Props) {
  const [direction, setDirection] = useState<AdminPrivacyOrder['direction']>('BUY')
  const [orderType, setOrderType] = useState<AdminPrivacyOrder['orderType']>('LOC')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const addMutation = useAddAdminPrivacyOrderMutation(baseId)

  // BUY는 quantity 필수 — 서버가 400으로 거부하므로 선제 차단.
  const priceInvalid = price !== '' && Number(price) <= 0
  const canSubmit = price !== '' && Number(price) > 0 && (!orderRequiresQuantity(direction) || quantity !== '')
  const isPending = addMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    addMutation.mutate({
      direction,
      orderType,
      price: Number(price),
      quantity: quantity === '' ? null : Number(quantity),
    }, {
      onSuccess: () => {
        toast.success('주문이 추가되었습니다')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>주문 추가</DialogTitle>
            <DialogDescription>방향, 유형, 가격, 수량을 입력하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="addOrderDirection">방향</Label>
                <Select items={DIRECTION_ITEMS} value={direction} onValueChange={(v) => { if (v) setDirection(v as AdminPrivacyOrder['direction']) }}>
                  <SelectTrigger id="addOrderDirection" className="h-11" disabled={isPending}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIRECTION_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addOrderType">유형</Label>
                <Select items={ORDER_TYPE_ITEMS} value={orderType} onValueChange={(v) => { if (v) setOrderType(v as AdminPrivacyOrder['orderType']) }}>
                  <SelectTrigger id="addOrderType" className="h-11" disabled={isPending}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPE_ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addOrderPrice">가격</Label>
              <Input
                id="addOrderPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isPending}
                aria-invalid={priceInvalid || undefined}
                aria-describedby={priceInvalid ? 'addOrderPrice-error' : undefined}
                className="h-11"
              />
              {priceInvalid && <p id="addOrderPrice-error" className="text-xs text-destructive">가격은 0보다 커야 합니다.</p>}
            </div>

            <div className="space-y-2">
              <PrivacyOrderQuantityField id="addOrderQuantity" direction={direction} value={quantity} onChange={setQuantity} disabled={isPending} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <SaveButton isPending={isPending} disabled={!canSubmit} label="추가" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
