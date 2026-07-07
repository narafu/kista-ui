'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { softDeleteAdminErrorLog, type AppErrorLog } from '@entities/user'
import { cn } from '@shared/lib/utils'
import { ErrorLogItem } from './ErrorLogItem'

interface Props {
  logs: AppErrorLog[]
}

export function ErrorLogsSectionClient({ logs }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedCount = selectedIds.length
  const allSelected = logs.length > 0 && selectedCount === logs.length
  const someSelected = selectedCount > 0 && !allSelected
  const selectedLabel = useMemo(() => `선택 ${selectedCount}건 삭제`, [selectedCount])

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? logs.map((log) => log.id) : [])
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((current) => (checked ? [...current, id] : current.filter((value) => value !== id)))
  }

  const handleDelete = async () => {
    if (selectedIds.length === 0) return

    setIsDeleting(true)

    const results = await Promise.allSettled(selectedIds.map((id) => softDeleteAdminErrorLog(id)))

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    const failedCount = results.length - successCount

    setIsDeleting(false)
    setOpen(false)

    if (successCount > 0) {
      setSelectedIds([])
      router.refresh()
    }

    if (failedCount === 0) {
      toast.success(`${successCount}건을 삭제했습니다`)
      return
    }

    if (successCount === 0) {
      toast.error('삭제에 실패했습니다')
      return
    }

    toast.warning(`${successCount}건 삭제, ${failedCount}건 실패`)
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-border divide-y divide-border">
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/10">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            aria-label="현재 페이지 오류 로그 전체 선택"
            checked={allSelected}
            ref={(node) => {
              if (node) node.indeterminate = someSelected
            }}
            disabled={isDeleting || logs.length === 0}
            onChange={(event) => toggleAll(event.target.checked)}
            className="size-4 rounded border-border accent-rose-600"
          />
          전체 선택
        </label>
        <span className="text-sm text-muted-foreground">{selectedCount > 0 ? `${selectedCount}건 선택됨` : '현재 페이지 기준 선택'}</span>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-auto')} disabled={selectedCount === 0 || isDeleting}>
            {isDeleting ? '삭제 중...' : selectedLabel}
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>오류 로그를 모두 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>현재 페이지에서 선택한 오류 로그 {selectedCount}건을 삭제합니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {logs.map((log) => (
        <ErrorLogItem key={log.id} log={log} checked={selectedIds.includes(log.id)} disabled={isDeleting} onCheckedChange={(checked) => toggleOne(log.id, checked)} />
      ))}
    </div>
  )
}
