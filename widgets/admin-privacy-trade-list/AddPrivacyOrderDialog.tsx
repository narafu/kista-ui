'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SaveButton } from '@shared/ui/SaveButton'
import { apiMsg } from '@shared/lib/api-client'
import { addAdminPrivacyOrder } from '@entities/privacy'
import type { AdminPrivacyBase, AdminPrivacyOrder } from '@entities/privacy'

interface Props {
  baseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (base: AdminPrivacyBase) => void
}

export function AddPrivacyOrderDialog({ baseId, open, onOpenChange, onAdded }: Props) {
  const [direction, setDirection] = useState<AdminPrivacyOrder['direction']>('BUY')
  const [orderType, setOrderType] = useState<AdminPrivacyOrder['orderType']>('LOC')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [isPending, setIsPending] = useState(false)

  // BUY는 quantity 필수 — 서버가 400으로 거부하므로 선제 차단.
  const canSubmit = price !== '' && (direction !== 'BUY' || quantity !== '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsPending(true)
    try {
      const updated = await addAdminPrivacyOrder(baseId, {
        direction,
        orderType,
        price: Number(price),
        quantity: quantity === '' ? null : Number(quantity),
      })
      toast.success('주문이 추가되었습니다')
      onAdded(updated)
      onOpenChange(false)
    } catch (err) {
      toast.error(apiMsg(err, '추가에 실패했습니다'))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>주문 추가</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="addOrderDirection">방향</Label>
                <Select items={[{ value: 'BUY', label: '매수' }, { value: 'SELL', label: '매도' }]} value={direction} onValueChange={(v) => { if (v) setDirection(v as AdminPrivacyOrder['direction']) }}>
                  <SelectTrigger id="addOrderDirection" className="h-11" disabled={isPending}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">매수</SelectItem>
                    <SelectItem value="SELL">매도</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addOrderType">유형</Label>
                <Select items={[{ value: 'LOC', label: 'LOC' }, { value: 'MOC', label: 'MOC' }, { value: 'LIMIT', label: 'LIMIT' }]} value={orderType} onValueChange={(v) => { if (v) setOrderType(v as AdminPrivacyOrder['orderType']) }}>
                  <SelectTrigger id="addOrderType" className="h-11" disabled={isPending}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOC">LOC</SelectItem>
                    <SelectItem value="MOC">MOC</SelectItem>
                    <SelectItem value="LIMIT">LIMIT</SelectItem>
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addOrderQuantity">수량{direction !== 'BUY' && ' (없으면 비움)'}</Label>
              <Input
                id="addOrderQuantity"
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
