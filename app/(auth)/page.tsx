"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { GlassCard } from "@/components/common/GlassCard";

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

  function handleKakaoLogin() {
    setErrorMessage(null);
    const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID;
    if (!clientId) {
      setErrorMessage("카카오 로그인 설정이 올바르지 않습니다.");
      return;
    }
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/auth/callback`,
    );
    window.location.href = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
  }

  return (
    <GlassCard>
      {/* Logo + Wordmark */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <Image
          src="/logo.png"
          alt="KISTA"
          width={56}
          height={56}
          className="rounded-[12px]"
          style={{ boxShadow: "0 4px 16px rgba(143,68,48,.25)", height: 56, width: 56 }}
        />
        <div className="text-center">
          <h1
            className="text-[32px] font-[800] tracking-[2px] select-none"
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
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "3.2px",
              color: "var(--rose-500)",
              textTransform: "uppercase",
            }}
          >
            K Investment · Smart · Trading · Auto
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center leading-snug mt-1">
          한국투자증권 KIS API 기반<br />해외주식 자동 분할매매 서비스
        </p>
      </div>

      {/* 초대제 안내 */}
      <div
        className="mb-5 px-3.5 py-2.5 rounded-[10px] text-center text-[12.5px] font-medium"
        style={{
          background: "var(--rose-50)",
          border: "1px solid var(--rose-100)",
          color: "var(--rose-700)",
        }}
      >
        가입 후 관리자 승인이 필요합니다.
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <p className="text-[13px] text-destructive text-center mb-3">
          {errorMessage}
        </p>
      )}

      {/* 카카오 로그인 */}
      <button
        type="button"
        onClick={handleKakaoLogin}
        className="flex items-center justify-center gap-2.5 w-full h-[52px] rounded-[10px] font-bold text-[15.5px] transition-opacity hover:opacity-90 select-none cursor-pointer border-0"
        style={{ background: "#FEE500", color: "#3C1E1E", fontFamily: "inherit" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E" aria-hidden="true">
          <path d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.9 5 4.7 6.4l-1 3.7c-.1.4.3.7.7.5l4.4-2.9c.4 0 .8.1 1.2.1 5.5 0 10-3.4 10-7.6C22 6.4 17.5 3 12 3z" />
        </svg>
        카카오로 시작하기
      </button>

      <div className="mt-4 text-center text-[11.5px] text-muted-foreground">
        가입 시{" "}
        <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: "var(--rose-600)", cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>서비스 약관</button>
        {" "}및{" "}
        <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: "var(--rose-600)", cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>개인정보 처리방침</button>
        에 동의합니다.
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
