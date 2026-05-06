import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { MOCK_ACCOUNTS } from '@/lib/mock-data'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountEditPage({ params }: Props) {
  const { id } = await params
  const account = MOCK_ACCOUNTS.find((a) => a.id === id) ?? MOCK_ACCOUNTS[0]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/accounts/${id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">계좌 수정</h1>
      </div>

      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">계좌 정보 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">계좌 별칭</Label>
              <Input id="nickname" defaultValue={account.nickname} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNo">계좌번호</Label>
              <Input id="accountNo" defaultValue={account.accountNo} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisAppKey">KIS App Key</Label>
              <Input id="kisAppKey" placeholder="변경 시에만 입력" type="password" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisSecretKey">KIS Secret Key</Label>
              <Input id="kisSecretKey" placeholder="변경 시에만 입력" type="password" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">매매 전략</Label>
              <Select defaultValue={account.strategy}>
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
              <Link href={`/accounts/${id}`} className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-12')}>
                취소
              </Link>
              <Button className="flex-1 h-12">저장</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
        <Button className="w-full h-14 text-base font-semibold">저장</Button>
      </div>
    </div>
  )
}
