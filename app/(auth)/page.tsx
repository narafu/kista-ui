"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1200px 600px at 75% 20%, rgba(224,163,140,0.22), transparent 60%), radial-gradient(900px 500px at 10% 90%, rgba(247,220,205,0.55), transparent 60%), #FBF6F1",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 36,
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(20px)",
          borderRadius: 18,
          border: "1px solid rgba(199,123,102,0.22)",
          boxShadow: "0 24px 60px rgba(74,38,22,0.12)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Image
            src="/logo.png"
            alt="KISTA"
            width={56}
            height={56}
            style={{ borderRadius: 14, boxShadow: "0 2px 8px rgba(143,68,48,.22)" }}
          />
        </div>

        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 38,
              fontWeight: 800,
              color: "var(--rose-700)",
              letterSpacing: 2,
              fontFamily: "var(--font-sans)",
            }}
          >
            KISTA
          </h1>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3.2,
              color: "var(--rose-500)",
              textTransform: "uppercase",
            }}
          >
            K Investment · Smart · Trading · Auto
          </div>
        </div>

        <p
          style={{
            margin: "22px 0 6px",
            textAlign: "center",
            fontSize: 13.5,
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
          }}
        >
          한국투자증권 KIS API 기반
          <br />
          해외주식 자동 분할매매 서비스
        </p>

        <div
          style={{
            margin: "22px 0",
            padding: "10px 14px",
            borderRadius: 10,
            background: "var(--rose-50)",
            border: "1px solid var(--rose-100)",
            fontSize: 12.5,
            color: "var(--rose-700)",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          가입 후 관리자 승인이 필요합니다.
        </div>

        {errorMessage && (
          <p
            style={{
              fontSize: 13,
              color: "var(--destructive)",
              textAlign: "center",
              margin: "0 0 12px",
            }}
          >
            {errorMessage}
          </p>
        )}

        <button
          onClick={handleKakaoLogin}
          style={{
            width: "100%",
            height: 52,
            border: 0,
            cursor: "pointer",
            background: "#FEE500",
            color: "#3C1E1E",
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 15.5,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#3C1E1E">
            <path d="M12 3C6.5 3 2 6.4 2 10.6c0 2.7 1.9 5 4.7 6.4l-1 3.7c-.1.4.3.7.7.5l4.4-2.9c.4 0 .8.1 1.2.1 5.5 0 10-3.4 10-7.6C22 6.4 17.5 3 12 3z" />
          </svg>
          카카오로 시작하기
        </button>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 11.5, color: "var(--muted-foreground)" }}>
          가입 시{" "}
          <a href="#" style={{ color: "var(--rose-600)" }}>서비스 약관</a>
          {" "}및{" "}
          <a href="#" style={{ color: "var(--rose-600)" }}>개인정보 처리방침</a>
          에 동의합니다.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
