"use client";

import {useState, useRef} from "react";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {Button, buttonVariants} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {cn} from "@/lib/utils";
import {createAccount} from "@/lib/api/accounts";
import {ApiError} from "@/lib/api/client";
import type {Strategy} from "@/types/account";

const STEPS = [
  {n: 1, label: "KIS API 연동", done: true, active: false},
  {n: 2, label: "계좌 정보 입력", done: false, active: true},
  {n: 3, label: "전략 설정", done: false, active: false},
  {n: 4, label: "확인", done: false, active: false},
];

export default function AccountNewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [accountNoPart1, setAccountNoPart1] = useState("");
  const [accountNoPart2, setAccountNoPart2] = useState("");
  const part2Ref = useRef<HTMLInputElement>(null);
  const [kisAppKey, setKisAppKey] = useState("");
  const [kisSecretKey, setKisSecretKey] = useState("");
  const [strategy, setStrategy] = useState<Strategy | "">("");
  const [symbol, setSymbol] = useState<string>("TQQQ");

  function handleStrategyChange(key: Strategy) {
    setStrategy(key);
    setSymbol(key === "PRIVACY" ? "SOXL" : "TQQQ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strategy) {
      toast.error("매매 전략을 선택해주세요");
      return;
    }
    if (!nickname.trim()) {
      toast.error("계좌 별칭을 입력해주세요");
      return;
    }
    if (accountNoPart1.length !== 8) {
      toast.error("계좌번호 8자리를 입력해주세요");
      return;
    }
    if (accountNoPart2.length > 0 && accountNoPart2.length !== 2) {
      toast.error("상품코드는 2자리로 입력해주세요");
      return;
    }
    if (!kisAppKey.trim()) {
      toast.error("KIS App Key를 입력해주세요");
      return;
    }
    if (!kisSecretKey.trim()) {
      toast.error("KIS Secret Key를 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      await createAccount({
        nickname: nickname.trim(),
        accountNo: accountNoPart1,
        kisAppKey: kisAppKey.trim(),
        kisSecretKey: kisSecretKey.trim(),
        strategyType: strategy as Strategy,
        kisAccountType: accountNoPart2 || "01",
        ticker: symbol,
      });
      toast.success("계좌가 등록되었습니다");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("이미 등록된 계좌입니다");
      } else if (err instanceof ApiError && err.status === 400) {
        toast.error("입력 정보를 확인해주세요");
      } else if (err instanceof ApiError && err.status === 422) {
        toast.error(
          "KIS API 키가 유효하지 않습니다. 앱키와 시크릿을 다시 확인해주세요.",
        );
      } else {
        toast.error("계좌 등록에 실패했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* 브레드크럼 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 22,
        }}
      >
        <Link
          href="/dashboard"
          className={cn(buttonVariants({variant: "ghost", size: "icon"}))}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <a
          href="/accounts"
          style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            textDecoration: "none",
          }}
        >
          계좌 관리
        </a>
        <span style={{color: "var(--muted-foreground)"}}>/</span>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          신규 계좌 등록
        </h1>
      </div>

      {/* 스테퍼 */}
      <div
        style={{
          background: "var(--card)",
          borderRadius: 14,
          padding: "18px 22px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "var(--sh-card)",
          border: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            style={{display: "flex", alignItems: "center", gap: 14}}
          >
            <div style={{display: "flex", alignItems: "center", gap: 10}}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: s.done
                    ? "var(--status-ok)"
                    : s.active
                      ? "var(--rose-500)"
                      : "var(--muted)",
                  color:
                    s.done || s.active ? "#fff" : "var(--muted-foreground)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {s.done ? "✓" : s.n}
              </span>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: s.active ? 700 : 600,
                  color: s.active
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                }}
              >
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  width: 32,
                  height: 2,
                  background: s.done ? "var(--status-ok)" : "var(--border)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{gap: 20}} className="lg:form-grid">
          {/* 폼 카드 */}
          <div
            style={{
              background: "var(--card)",
              borderRadius: 14,
              padding: 28,
              boxShadow: "var(--sh-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{fontSize: 16, fontWeight: 700, marginBottom: 4}}>
              계좌 정보
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--muted-foreground)",
                marginBottom: 22,
              }}
            >
              한국투자증권 해외주식 계좌 정보를 입력해주세요.
            </div>

            <div style={{marginBottom: 18}}>
              <Label
                htmlFor="nickname"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                계좌 별칭
              </Label>
              <Input
                id="nickname"
                placeholder="예: 메인 SOXL"
                className="h-11"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
              />
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--muted-foreground)",
                  marginTop: 6,
                }}
              >
                대시보드에서 표시되는 이름입니다. 계좌관리에서 수정할 수
                있습니다.
              </div>
            </div>

            <div style={{marginBottom: 18}}>
              <Label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                실전투자 계좌번호
              </Label>
              <div style={{display: "flex", alignItems: "center", gap: 10}}>
                <Input
                  placeholder="12345678"
                  inputMode="numeric"
                  maxLength={8}
                  className="h-11 text-center tracking-widest"
                  style={{flex: 1}}
                  value={accountNoPart1}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                    setAccountNoPart1(v);
                    if (v.length === 8) part2Ref.current?.focus();
                  }}
                  disabled={isLoading}
                />
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--muted-foreground)",
                    userSelect: "none",
                  }}
                >
                  -
                </span>
                <Input
                  ref={part2Ref}
                  placeholder="01"
                  inputMode="numeric"
                  maxLength={2}
                  className="h-11 text-center tracking-widest"
                  style={{width: 72}}
                  value={accountNoPart2}
                  onChange={(e) =>
                    setAccountNoPart2(
                      e.target.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  disabled={isLoading}
                />
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--muted-foreground)",
                  marginTop: 6,
                }}
              >
                계좌번호 8자리 (상품코드 미입력 시 &apos;01&apos; 기본 적용)
              </div>
            </div>

            <div style={{marginBottom: 18}}>
              <Label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                전략 종류
              </Label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {[
                  {
                    key: "INFINITE",
                    label: "Infinite",
                    desc: "무한 매수법 · 분할매수 + 평단조정",
                  },
                  {
                    key: "PRIVACY",
                    label: "Privacy",
                    desc: "프라이버시 전략 · 시그널 기반",
                  },
                ].map(({key, label, desc}) => {
                  const selected = strategy === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleStrategyChange(key as Strategy)}
                      disabled={isLoading}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        textAlign: "left",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        border: `2px solid ${selected ? "var(--rose-400)" : "var(--border)"}`,
                        background: selected ? "var(--rose-50)" : "var(--card)",
                        transition: "border-color .15s, background .15s",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: selected
                              ? "var(--rose-600)"
                              : "var(--foreground)",
                          }}
                        >
                          {label}
                        </span>
                        {selected && (
                          <span
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              background: "var(--rose-500)",
                              color: "#fff",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* 종목 선택 — 전략 선택 시 나타남 */}
              {strategy === "INFINITE" && (
                <div style={{marginTop: 10}}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      marginBottom: 6,
                    }}
                  >
                    종목 선택
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {(["TQQQ", "SOXL", "USD"] as const).map((s) => {
                      const sel = symbol === s;
                      const desc: Record<string, string> = {
                        TQQQ: "나스닥100 3x",
                        SOXL: "반도체 3x",
                        USD: "달러",
                      };
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSymbol(s)}
                          disabled={isLoading}
                          style={{
                            padding: "10px 4px",
                            borderRadius: 8,
                            textAlign: "center",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            border: `2px solid ${sel ? "var(--rose-400)" : "var(--border)"}`,
                            background: sel ? "var(--rose-50)" : "var(--card)",
                            transition: "border-color .15s, background .15s",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: sel
                                ? "var(--rose-600)"
                                : "var(--foreground)",
                            }}
                          >
                            {s}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: sel
                                ? "var(--rose-500)"
                                : "var(--muted-foreground)",
                              marginTop: 2,
                            }}
                          >
                            {desc[s]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {strategy === "PRIVACY" && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{fontSize: 12, color: "var(--muted-foreground)"}}
                  >
                    종목:
                  </span>
                  <span style={{fontSize: 13, fontWeight: 700}}>SOXL</span>
                  <span
                    style={{fontSize: 11.5, color: "var(--muted-foreground)"}}
                  >
                    (고정)
                  </span>
                </div>
              )}
            </div>

            <div style={{marginBottom: 18}}>
              <Label
                htmlFor="kisAppKey"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                KIS APP KEY
              </Label>
              <Input
                id="kisAppKey"
                placeholder="KIS API App Key"
                type="password"
                className="h-11"
                value={kisAppKey}
                onChange={(e) => setKisAppKey(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div style={{marginBottom: 24}}>
              <Label
                htmlFor="kisSecretKey"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                KIS APP SECRET
              </Label>
              <Input
                id="kisSecretKey"
                placeholder="KIS API Secret Key"
                type="password"
                className="h-11"
                value={kisSecretKey}
                onChange={(e) => setKisSecretKey(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 18,
                borderTop: "1px solid var(--border)",
              }}
            >
              <Link
                href="/dashboard"
                className={cn(buttonVariants({variant: "outline"}))}
              >
                취소
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "검증 및 저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          {/* 우측 패널 */}
          <div style={{display: "flex", flexDirection: "column", gap: 16}}>
            {/* 연결 상태 카드 */}
            <div
              style={{
                background: "var(--card)",
                borderRadius: 14,
                padding: 20,
                boxShadow: "var(--sh-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{fontSize: 13.5, fontWeight: 700, marginBottom: 14}}>
                연결 상태
              </div>
              {[
                {
                  name: "KIS API 인증",
                  status: "pending",
                  detail: "저장 후 확인됩니다",
                },
                {
                  name: "계좌 조회",
                  status: "pending",
                  detail: "저장 후 확인됩니다",
                },
                {
                  name: "주문 권한",
                  status: "pending",
                  detail: "저장 후 확인됩니다",
                },
              ].map((r, i, arr) => (
                <div
                  key={r.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom:
                      i < arr.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: "var(--muted)",
                      color: "var(--muted-foreground)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                    }}
                  >
                    –
                  </span>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 13, fontWeight: 600}}>{r.name}</div>
                    <div
                      style={{fontSize: 11.5, color: "var(--muted-foreground)"}}
                    >
                      {r.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* API 도움말 카드 */}
            <div
              style={{
                background: "var(--brand-soft-bg)",
                borderRadius: 14,
                padding: 18,
                border: "1px solid var(--rose-100)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    color: "var(--rose-600)",
                    fontWeight: 800,
                  }}
                >
                  ?
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--brand-fg)",
                  }}
                >
                  API 키는 어디서?
                </span>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--brand-fg)",
                  lineHeight: 1.6,
                }}
              >
                한국투자증권 홈페이지 → 트레이딩 → Open API → 실전 계좌 신청 후
                발급된 APP KEY와 SECRET을 입력하세요.
              </div>
              <a
                href="https://securities.koreainvestment.com/main/customer/systemdown/RestAPIService.jsp"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--rose-600)",
                  textDecoration: "none",
                }}
              >
                한국투자증권 API 신청 페이지 열기 ↗
              </a>
            </div>
          </div>
        </div>

        {/* 모바일 하단 고정 버튼 */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-40">
          <Button
            type="submit"
            className="w-full h-14 text-base font-semibold"
            disabled={isLoading}
          >
            {isLoading ? "검증 및 저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}
