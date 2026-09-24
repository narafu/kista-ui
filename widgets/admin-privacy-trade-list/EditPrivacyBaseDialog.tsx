'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SaveButton } from '@shared/ui/SaveButton'
import { useUpdateAdminPrivacyBaseMutation } from '@entities/privacy'
import type { AdminPrivacyBase } from '@entities/privacy'

interface Props {
  base: AdminPrivacyBase
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPrivacyBaseDialog({ base, open, onOpenChange }: Props) {
  const [currentCycleStart, setCurrentCycleStart] = useState(String(base.currentCycleStart))
  const [currentCycleRealizedPnl, setCurrentCycleRealizedPnl] = useState(String(base.currentCycleRealizedPnl))
  const [avgPrice, setAvgPrice] = useState(base.avgPrice == null ? '' : String(base.avgPrice))
  const [holdings, setHoldings] = useState(String(base.holdings))
  const updateMutation = useUpdateAdminPrivacyBaseMutation(base.id)

  const canSubmit = currentCycleStart !== '' && currentCycleRealizedPnl !== '' && holdings !== ''
  const isPending = updateMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    updateMutation.mutate({
      currentCycleStart: Number(currentCycleStart),
      currentCycleRealizedPnl: Number(currentCycleRealizedPnl),
      avgPrice: avgPrice === '' ? null : Number(avgPrice),
      holdings: Number(holdings),
    }, {
      onSuccess: () => {
        toast.success('P 매매표가 수정되었습니다')
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{base.releaseDate} {base.ticker} 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="currentCycleStart">사이클 시작금액</Label>
              <Input
                id="currentCycleStart"
                type="number"
                step="0.01"
                value={currentCycleStart}
                onChange={(e) => setCurrentCycleStart(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgPrice">평단가 (없으면 비움)</Label>
              <Input
                id="avgPrice"
                type="number"
                step="0.01"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holdings">보유</Label>
              <Input
                id="holdings"
                type="number"
                step="1"
                min="0"
                value={holdings}
                onChange={(e) => setHoldings(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentCycleRealizedPnl">실현손익</Label>
              <Input
                id="currentCycleRealizedPnl"
                type="number"
                step="0.01"
                value={currentCycleRealizedPnl}
                onChange={(e) => setCurrentCycleRealizedPnl(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
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
