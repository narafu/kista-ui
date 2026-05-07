import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MOCK_USER, MOCK_ACCOUNTS } from '@/lib/mock-data'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
        {/* 데스크탑: 좌측 메뉴 */}
        <nav className="hidden lg:flex flex-col gap-1 text-sm">
          {['프로필', '텔레그램 알림', '계좌별 알림'].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* 콘텐츠 */}
        <div className="space-y-6">
          {/* 프로필 */}
          <section id="프로필">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">프로필</CardTitle>
                <CardDescription>카카오 계정 정보</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">닉네임</span>
                  <span className="text-sm font-medium">{MOCK_USER.nickname}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">상태</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">ACTIVE</Badge>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 전체 텔레그램 봇 */}
          <section id="텔레그램 알림">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">텔레그램 알림</CardTitle>
                <CardDescription>전체 계좌 알림을 받을 텔레그램 봇을 등록하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="botToken">Bot Token</Label>
                  <Input
                    id="botToken"
                    placeholder="123456:ABC-DEF..."
                    defaultValue=""
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chatId">Chat ID</Label>
                  <Input
                    id="chatId"
                    placeholder="-100123456789"
                    defaultValue=""
                    className="h-12"
                  />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 h-11">저장</Button>
                  <Button variant="outline" className="h-11 text-destructive hover:text-destructive">해제</Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 계좌별 텔레그램 봇 */}
          <section id="계좌별 알림">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">계좌별 알림 설정</CardTitle>
                <CardDescription>계좌마다 별도 텔레그램 봇을 설정할 수 있습니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {MOCK_ACCOUNTS.map((account) => (
                  <div key={account.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{account.nickname}</span>
                      <span className="text-xs text-muted-foreground">{account.accountNoMasked}</span>
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Bot Token (선택)"
                        defaultValue=""
                        className="h-10 text-sm"
                      />
                      <Input
                        placeholder="Chat ID (선택)"
                        defaultValue=""
                        className="h-10 text-sm"
                      />
                    </div>
                    <Button size="sm" variant="outline" className="h-9">저장</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
