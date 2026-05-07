'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { createAccount } from '@/lib/api/accounts'
import { ApiError } from '@/lib/api/client'
import type { Strategy } from '@/types/account'

export default function AccountNewPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [nickname, setNickname] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [kisAppKey, setKisAppKey] = useState('')
  const [kisSecretKey, setKisSecretKey] = useState('')
  const [strategy, setStrategy] = useState<Strategy | ''>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!strategy) { toast.error('매매 전략을 선택해주세요'); return }
    if (!nickname.trim()) { toast.error('계좌 별칭을 입력해주세요'); return }
    if (!accountNo.trim()) { toast.error('계좌번호를 입력해주세요'); return }
    if (!kisAppKey.trim()) { toast.error('KIS App Key를 입력해주세요'); return }
    if (!kisSecretKey.trim()) { toast.error('KIS Secret Key를 입력해주세요'); return }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error('로그인이 필요합니다'); return }

      await createAccount({
        nickname: nickname.trim(),
        accountNo: accountNo.trim(),
        kisAppKey: kisAppKey.trim(),
        kisSecretKey: kisSecretKey.trim(),
        strategy: strategy as Strategy,
        kisAccountType: '01',
      }, session.access_token)

      toast.success('계좌가 등록되었습니다')
      router.push('/dashboard')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error('이미 등록된 계좌입니다')
      } else if (err instanceof ApiError && err.status === 400) {
        toast.error('입력 정보를 확인해주세요')
      } else {
        toast.error('계좌 등록에 실패했습니다')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">계좌 등록</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">한국투자증권 계좌 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">계좌 별칭</Label>
                <Input
                  id="nickname"
                  placeholder="예: 주계좌"
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
                  placeholder="한국투자증권 계좌번호"
                  className="h-12"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kisAppKey">KIS App Key</Label>
                <Input
                  id="kisAppKey"
                  placeholder="KIS API App Key"
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
                  placeholder="KIS API Secret Key"
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
                    <SelectValue placeholder="전략을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFINITE">Infinite — SOXL 20차수 분할매매</SelectItem>
                    <SelectItem value="PRIVACY">Privacy — SOXL (최소 $2,500)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 데스크탑 버튼 */}
              <div className="hidden sm:flex gap-3 pt-2">
                <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-12')}>
                  취소
                </Link>
                <Button type="submit" className="flex-1 h-12" disabled={isLoading}>
                  {isLoading ? '등록 중...' : '저장'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 모바일 하단 고정 버튼 */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
          <Button type="submit" className="w-full h-14 text-base font-semibold" disabled={isLoading}>
            {isLoading ? '등록 중...' : '저장'}
          </Button>
        </div>
      </form>
    </div>
  )
}
