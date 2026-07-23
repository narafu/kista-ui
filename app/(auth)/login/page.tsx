"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { GlassCard } from '@widgets/glass-card'
import { Spinner } from '@shared/ui/Spinner'
import { ApprovalNotice } from './ApprovalNotice'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
  auth_failed: "카카오 인증에 실패했습니다. 다시 시도해주세요.",
  registration_failed: "서버 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
  server_error: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

function LoginPageContent() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError
      ? (ERROR_MESSAGES[urlError] ?? "알 수 없는 오류가 발생했습니다.")
      : null,
  );
  // eslint-disable-next-line react-doctor/rendering-usetransition-loading
  const [isLoading, setIsLoading] = useState(false);

  function handleKakaoLogin() {
    if (isLoading) return;
    setErrorMessage(null);
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    if (!clientId) {
      setErrorMessage("카카오 로그인 설정이 올바르지 않습니다.");
      return;
    }
    setIsLoading(true);
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/auth/callback`,
    );
    window.location.href = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  }

  return (
    <GlassCard texture>
      {/* 초대제 안내 */}
      <div
        className="flex items-center justify-center gap-2 mb-6 text-xs font-bold tracking-[0.16em] uppercase"
        style={{ color: 'var(--rose-500)', fontFamily: 'var(--font-mono)' }}
      >
        <span className="error-pulse-dot" style={{ background: 'var(--rose-500)' }} />
        초대제 · 승인 기반 가입
      </div>

      {/* Logo + Wordmark */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <Image
          src="/logo.png"
          alt="KISTA"
          width={56}
          height={56}
          className="rounded-[12px] shadow-[0_4px_16px_rgba(143,68,48,.25)]"
          style={{ height: 56, width: 56 }}
        />
        <div className="text-center">
          <h1
            className="display text-5xl tracking-[-1px] select-none"
            style={{
              background: "linear-gradient(135deg, var(--rose-700) 0%, var(--rose-500) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            KISTA
          </h1>
          <div
            className="mt-1 text-sm font-bold tracking-[1.6px] uppercase"
            style={{ color: 'var(--rose-500)' }}
          >
            Key Investment Strategy &amp; Trading Automation
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-snug mt-1">
          정밀한 투자 전략을 기반으로<br />다중 증권사 통합 자동매매 인프라
        </p>
      </div>

      <ApprovalNotice />

      {/* 에러 메시지 */}
      {errorMessage && (
        <p className="text-sm text-destructive text-center mb-3">
          {errorMessage}
        </p>
      )}

      {/* 카카오 로그인 */}
      <button
        type="button"
        onClick={handleKakaoLogin}
        disabled={isLoading}
        className="flex items-center justify-center gap-2.5 w-full h-[52px] rounded-[10px] font-bold text-base transition-opacity hover:opacity-90 select-none cursor-pointer border-0 bg-[#FEE500] text-[#3C1E1E] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Spinner size={20} />
            카카오 연결 중...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
              <path d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.9 5 4.7 6.4l-1 3.7c-.1.4.3.7.7.5l4.4-2.9c.4 0 .8.1 1.2.1 5.5 0 10-3.4 10-7.6C22 6.4 17.5 3 12 3z" />
            </svg>
            카카오로 시작하기
          </>
        )}
      </button>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        가입 시 서비스 약관 및 개인정보 처리방침에 동의합니다.
      </div>
    </GlassCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
