'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getAuthTokenClient } from '@/lib/auth/token'
import { updateAccount, deleteAccount } from '@/lib/api/accounts'
import { ApiError } from '@/lib/api/client'
import type { Account, Strategy } from '@/types/account'

interface Props {
  account: Account
}

export function AccountEditForm({ account }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)

  const [nickname, setNickname] = useState(account.nickname)
  const [kisAppKey, setKisAppKey] = useState('')
  const [kisSecretKey, setKisSecretKey] = useState('')
  const [strategy, setStrategy] = useState<Strategy>(account.strategy)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) { toast.error('계좌 별칭을 입력해주세요'); return }

    setIsLoading(true)
    try {
      const token = getAuthTokenClient()
      if (!token) { toast.error('로그인이 필요합니다'); return }

      await updateAccount(account.id, {
        nickname: nickname.trim(),
        strategy,
        ...(kisAppKey.trim() && { kisAppKey: kisAppKey.trim() }),
        ...(kisSecretKey.trim() && { kisSecretKey: kisSecretKey.trim() }),
      }, token)

      toast.success('계좌가 수정되었습니다')
      router.push(`/accounts/${account.id}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? '수정에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    setIsDeleteLoading(true)
    try {
      const token = getAuthTokenClient()
      if (!token) { toast.error('로그인이 필요합니다'); return }

      await deleteAccount(account.id, token)
      toast.success('계좌가 삭제되었습니다')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? '삭제에 실패했습니다' : '오류가 발생했습니다')
      setIsDeleteOpen(false)
    } finally {
      setIsDeleteLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">계좌 정보 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">계좌 별칭</Label>
              <Input
                id="nickname"
                className="h-12"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNo">계좌번호</Label>
              <Input
                id="accountNo"
                defaultValue={account.accountNoMasked}
                className="h-12"
                disabled
              />
              <p className="text-xs text-muted-foreground">계좌번호는 변경할 수 없습니다</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisAppKey">KIS App Key</Label>
              <Input
                id="kisAppKey"
                placeholder="변경 시에만 입력"
                type="password"
                className="h-12"
                value={kisAppKey}
                onChange={(e) => setKisAppKey(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisSecretKey">KIS Secret Key</Label>
              <Input
                id="kisSecretKey"
                placeholder="변경 시에만 입력"
                type="password"
                className="h-12"
                value={kisSecretKey}
                onChange={(e) => setKisSecretKey(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">매매 전략</Label>
              <Select
                value={strategy}
                onValueChange={(v) => setStrategy(v as Strategy)}
                disabled={isLoading}
              >
                <SelectTrigger id="strategy" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFINITE">Infinite — SOXL 20차수 분할매매</SelectItem>
                  <SelectItem value="PRIVACY">Privacy — SOXL (최소 $2,500)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden sm:flex gap-3 pt-2">
              <Link href={`/accounts/${account.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-12')}>
                취소
              </Link>
              <Button type="submit" className="flex-1 h-12" disabled={isLoading}>
                {isLoading ? '저장 중...' : '저장'}
              </Button>
            </div>

            {/* 계좌 삭제 */}
            <div className="pt-2 border-t">
              <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), 'w-full text-destructive hover:text-destructive')}>
                  계좌 삭제
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>계좌 삭제</DialogTitle>
                    <DialogDescription>
                      {account.nickname} 계좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading}>
                      취소
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading}>
                      {isDeleteLoading ? '삭제 중...' : '삭제'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 모바일 하단 고정 버튼 */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
        <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={isLoading}>
          {isLoading ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  )
}
