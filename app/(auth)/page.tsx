'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: '로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.',
  auth_failed: '카카오 인증에 실패했습니다. 다시 시도해주세요.',
  registration_failed: '서버 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
  server_error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] ?? '알 수 없는 오류가 발생했습니다.') : null
  )

  async function handleKakaoLogin() {
    setErrorMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('카카오 로그인 실패:', error)
      setErrorMessage('카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <>
      {/* 데스크탑: 중앙 카드 */}
      <div className="hidden sm:block w-full max-w-md px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">
              KISTA
            </CardTitle>
            <CardDescription className="text-base">
              한국투자증권 KIS API 기반<br />
              해외주식 자동 분할매매 서비스
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              초대제 서비스입니다. 가입 후 관리자 승인이 필요합니다.
            </p>
            {errorMessage && (
              <p className="text-sm text-destructive text-center">{errorMessage}</p>
            )}
            <Button
              size="lg"
              className="w-full h-12 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FDD800] font-semibold"
              onClick={handleKakaoLogin}
            >
              카카오로 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 모바일: 전체화면 */}
      <div className="sm:hidden fixed inset-0 flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <h1 className="text-4xl font-bold tracking-tight">KISTA</h1>
          <p className="text-center text-muted-foreground text-sm">
            한국투자증권 KIS API 기반<br />
            해외주식 자동 분할매매 서비스
          </p>
          {errorMessage && (
            <p className="text-sm text-destructive text-center">{errorMessage}</p>
          )}
        </div>
        <div className="p-6 pb-safe">
          <Button
            size="lg"
            className="w-full h-14 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FDD800] font-semibold text-base"
            onClick={handleKakaoLogin}
          >
            카카오로 시작하기
          </Button>
        </div>
      </div>
    </>
  )
}
