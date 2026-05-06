import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function AccountNewPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">계좌 등록</h1>
      </div>

      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">한국투자증권 계좌 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">계좌 별칭</Label>
              <Input id="nickname" placeholder="예: 주계좌" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNo">계좌번호</Label>
              <Input id="accountNo" placeholder="한국투자증권 계좌번호" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisAppKey">KIS App Key</Label>
              <Input id="kisAppKey" placeholder="KIS API App Key" type="password" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kisSecretKey">KIS Secret Key</Label>
              <Input id="kisSecretKey" placeholder="KIS API Secret Key" type="password" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strategy">매매 전략</Label>
              <Select>
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
              <Button className="flex-1 h-12">저장</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 모바일 하단 고정 버튼 */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
        <Button className="w-full h-14 text-base font-semibold">저장</Button>
      </div>
    </div>
  )
}
