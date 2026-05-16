'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const [nickname, setNickname] = useState(account.nickname)
  const [kisAppKey, setKisAppKey] = useState('')
  const [kisSecretKey, setKisSecretKey] = useState('')
  const [strategy, setStrategy] = useState<Strategy>(account.strategy)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) { toast.error('계좌 별칭을 입력해주세요'); return }

    setIsLoading(true)
    try {
      await updateAccount(account.id, {
        nickname: nickname.trim(),
        strategy,
        ...(kisAppKey.trim() && { kisAppKey: kisAppKey.trim() }),
        ...(kisSecretKey.trim() && { kisSecretKey: kisSecretKey.trim() }),
      })

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
    if (deleteConfirm !== account.nickname) return
    setIsDeleteLoading(true)
    try {
      await deleteAccount(account.id)
      toast.success('계좌가 삭제되었습니다')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof ApiError ? '삭제에 실패했습니다' : '오류가 발생했습니다')
      setIsDeleteOpen(false)
    } finally {
      setIsDeleteLoading(false)
    }
  }

  const cardStyle = {
    background: 'var(--card)',
    borderRadius: 20,
    padding: '28px 24px',
    boxShadow: 'var(--sh-card)',
    border: '1px solid var(--border)',
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-xl space-y-4">
        {/* 폼 카드 */}
        <div style={cardStyle} className="space-y-4">
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>계좌 정보 수정</h2>

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
            <Label>매매 전략</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                { key: 'INFINITE', label: 'Infinite', desc: '무한 분할매수' },
                { key: 'PRIVACY', label: 'Privacy', desc: '비공개 전략' },
              ] as const).map(({ key, label, desc }) => {
                const selected = strategy === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStrategy(key)}
                    disabled={isLoading}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: selected ? '2px solid var(--rose-500)' : '1px solid var(--border)',
                      background: selected ? 'var(--rose-50)' : 'var(--card)',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'border-color .15s, background .15s',
                    }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 700, color: selected ? 'var(--rose-600)' : 'var(--foreground)' }}>{label}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hidden sm:flex gap-3 pt-2">
            <Link href={`/accounts/${account.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-12')}>
              취소
            </Link>
            <Button type="submit" className="flex-1 h-12" disabled={isLoading}>
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        {/* 위험 구역 */}
        <div style={{ ...cardStyle, border: '1px solid rgba(209,75,63,0.25)', background: 'rgba(251,228,224,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: 'var(--pos)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--pos)' }}>위험 구역</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
            계좌를 삭제하면 모든 거래 기록과 설정이 영구적으로 제거됩니다.
          </p>

          <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setDeleteConfirm('') }}>
            <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }), 'w-full text-destructive hover:text-destructive border-destructive/40')}>
              계좌 삭제
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>계좌 삭제 확인</DialogTitle>
                <DialogDescription>
                  이 작업은 되돌릴 수 없습니다. 계속하려면 계좌 별칭{' '}
                  <strong style={{ color: 'var(--foreground)' }}>{account.nickname}</strong>을(를) 정확히 입력해주세요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Input
                  placeholder={account.nickname}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  disabled={isDeleteLoading}
                  className="h-11"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading}>
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleteLoading || deleteConfirm !== account.nickname}
                >
                  {isDeleteLoading ? '삭제 중...' : '영구 삭제'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
