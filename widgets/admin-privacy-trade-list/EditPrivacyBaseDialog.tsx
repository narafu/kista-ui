'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { apiMsg } from '@shared/lib/api-client'
import { updateAdminPrivacyBase } from '@entities/privacy'
import type { AdminPrivacyBase } from '@entities/privacy'

interface Props {
  base: AdminPrivacyBase
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (base: AdminPrivacyBase) => void
}

export function EditPrivacyBaseDialog({ base, open, onOpenChange, onUpdated }: Props) {
  const [currentCycleStart, setCurrentCycleStart] = useState(String(base.currentCycleStart))
  const [currentCycleRealizedPnl, setCurrentCycleRealizedPnl] = useState(String(base.currentCycleRealizedPnl))
  const [avgPrice, setAvgPrice] = useState(base.avgPrice == null ? '' : String(base.avgPrice))
  const [holdings, setHoldings] = useState(String(base.holdings))
  const [isPending, setIsPending] = useState(false)

  const canSubmit = currentCycleStart !== '' && currentCycleRealizedPnl !== '' && holdings !== ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsPending(true)
    try {
      const updated = await updateAdminPrivacyBase(base.id, {
        currentCycleStart: Number(currentCycleStart),
        currentCycleRealizedPnl: Number(currentCycleRealizedPnl),
        avgPrice: avgPrice === '' ? null : Number(avgPrice),
        holdings: Number(holdings),
      })
      toast.success('P 매매표가 수정되었습니다')
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
            <Button type="submit" className="gap-2" disabled={isPending || !canSubmit}>
              {isPending ? <><Spinner size={14} />저장 중...</> : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
