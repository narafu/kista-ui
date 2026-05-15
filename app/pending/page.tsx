import { Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAuthToken } from '@/lib/auth/token'
import { getMe } from '@/lib/api/auth'
import { TelegramConnect } from './TelegramConnect'
import { PendingStatusWatcher } from './PendingStatusWatcher'
import { ReapplyButton } from './ReapplyButton'

export default async function PendingPage() {
  const token = await getAuthToken()

  let hasTelegram = false
  if (token) {
    hasTelegram = await getMe(token).then((u) => u.hasTelegram).catch(() => false)
  }

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
        <CardContent>
          <PendingStatusWatcher />
          <ReapplyButton />
          <TelegramConnect hasTelegram={hasTelegram} />
        </CardContent>
      </Card>
    </div>
  )
}
