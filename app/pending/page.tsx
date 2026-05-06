import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-yellow-100 p-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-xl">승인 대기 중</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            가입 신청이 완료되었습니다.<br />
            관리자가 검토 후 승인하면 서비스를 이용하실 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" size="lg" className="w-full h-12">
            텔레그램 봇 연동하기
          </Button>
          <p className="text-xs text-muted-foreground">
            텔레그램 봇을 연동하면 승인 결과를 알림으로 받을 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
