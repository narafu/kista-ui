"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useMeta } from "@/components/providers/MetaProvider";
import { createStrategy, updateStrategy } from "@/lib/api/strategies";
import { getMargin, getPrices, type PriceMap } from "@/lib/api/accounts";
import { getPrivacyCurrentBase } from "@/lib/api/privacy";
import { ApiError } from "@/lib/api/client";
import { MultipleInput } from "./MultipleInput";
import type { Strategy, StrategyRequest } from "@/types/strategy";

interface Props {
  accountId: string;
  initial?: Strategy;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function snapToStep(raw: number, step: number): number {
  const precision = Math.round(1 / step);
  return Math.round(raw * precision) / precision;
}

function floorToStep(raw: number, step: number): number {
  const precision = Math.round(1 / step);
  return Math.floor(raw * precision) / precision;
}

function fmtUsd(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function StrategyForm({ accountId, initial, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const { meta, findStrategyType } = useMeta();
  const [type, setType] = useState<string>(
    initial?.type ?? meta.strategyTypes[0]?.code ?? "",
  );
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? "");
  const [multiple, setMultiple] = useState<string>(initial?.multiple ?? "");
  const [loading, setLoading] = useState(false);
  const [showMaxHint, setShowMaxHint] = useState(false);

  const [usdDeposit, setUsdDeposit] = useState<number | null>(null);
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [privacyBase, setPrivacyBase] = useState<number | null>(null);
  const [loadingBase, setLoadingBase] = useState(!initial);

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type]);
  const availableTickers = typeMeta?.availableTickers ?? [];
  const isInfinite = (typeMeta?.availableTickers?.length ?? 0) > 1;

  const minMultiple = isInfinite ? 1 : 0.5;
  const stepMultiple = isInfinite ? 0.1 : 0.5;

  // 다이얼로그 열릴 때 예수금 + 종목가격 + PRIVACY 기준가 병렬 조회
  useEffect(() => {
    if (initial) return;
    setLoadingBase(true);
    Promise.all([
      getMargin(accountId).catch(() => null),
      getPrices(accountId, meta.tickers.map((t) => t.code)).catch(() => null),
      getPrivacyCurrentBase().catch(() => null),
    ])
      .then(([margin, priceMap, privacy]) => {
        const usd =
          margin?.find((m) => m.currency === "USD")?.integratedOrderableAmount ?? null;
        setUsdDeposit(usd);
        setPrices(priceMap);
        setPrivacyBase(privacy?.currentCycleStart ?? null);
        if (!margin && !priceMap && !privacy) {
          toast.error("예수금 / 기준가 조회에 실패했습니다");
        }
      })
      .finally(() => setLoadingBase(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // type 변경 시 ticker 기본값 설정 + multiple normalize (H)
  useEffect(() => {
    if (!typeMeta) return;
    if (!ticker || !availableTickers.includes(ticker)) {
      setTicker(typeMeta.availableTickers[0]);
    }
    if (!multiple) {
      setMultiple("1");
      return;
    }
    const num = parseFloat(multiple);
    if (!isNaN(num)) {
      const newMin = isInfinite ? 1 : 0.5;
      const newStep = isInfinite ? 0.1 : 0.5;
      const snapped = snapToStep(Math.max(num, newMin), newStep);
      if (Math.abs(snapped - num) > 1e-9) {
        setMultiple(String(snapped));
        toast.info(`배수가 ${snapped}×로 조정됐어요`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const basePrice = useMemo(() => {
    if (!type || !ticker) return null;
    if (isInfinite) return prices?.[ticker] ?? null;
    return privacyBase;
  }, [type, ticker, isInfinite, prices, privacyBase]);

  const minSeed = useMemo(() => {
    if (initial) return null;
    if (isInfinite) return basePrice !== null ? basePrice * 20 * 2 * 1.1 : null;
    return privacyBase !== null ? privacyBase / 2 : null;
  }, [isInfinite, basePrice, privacyBase, initial]);

  const isBelowMinSeed =
    !initial && usdDeposit !== null && minSeed !== null && usdDeposit < minSeed;

  const maxMultiple = useMemo(() => {
    if (initial || isBelowMinSeed || usdDeposit === null) return null;
    if (isInfinite && minSeed !== null)
      return Math.floor((usdDeposit / minSeed) * 10) / 10;
    if (!isInfinite && privacyBase !== null)
      return Math.floor((usdDeposit / privacyBase) * 2) / 2;
    return null;
  }, [initial, isBelowMinSeed, isInfinite, usdDeposit, minSeed, privacyBase]);

  const multipleError = useMemo(() => {
    const num = parseFloat(multiple);
    if (!multiple || isNaN(num)) return null;
    if (num < minMultiple) return `최소 ${minMultiple}배부터 입력해주세요`;
    const remainder = Math.abs(Math.round(num / stepMultiple) * stepMultiple - num);
    if (remainder > 1e-9) return `${stepMultiple} 단위로 입력해주세요`;
    if (maxMultiple !== null && num > maxMultiple)
      return `최대 ${maxMultiple}배를 초과했습니다`;
    return null;
  }, [multiple, minMultiple, stepMultiple, maxMultiple]);

  const cannotSubmit =
    !initial &&
    (isBelowMinSeed ||
      (isInfinite && basePrice === null) ||
      (!isInfinite && privacyBase === null));

  // 예수금 사용률 (C — 게이지 진행도)
  const depositUsageRatio = useMemo(() => {
    if (usdDeposit === null || maxMultiple === null || maxMultiple === 0) return 0;
    const mul = parseFloat(multiple) || minMultiple;
    return Math.min(mul / maxMultiple, 1);
  }, [usdDeposit, maxMultiple, multiple, minMultiple]);

  // 실시간 미리보기 (G — 신규 등록 전용 자체 계산)
  const previewStrip = useMemo(() => {
    if (initial || !usdDeposit || !basePrice) return null;
    const mul = parseFloat(multiple) || minMultiple;
    const unitAmt = (usdDeposit / 20) * mul;
    const firstBuyQty = Math.floor(unitAmt / (basePrice * 2));
    const firstBuyAmt = firstBuyQty * basePrice;
    const remainingRounds = Math.round(20 / mul);
    return { unitAmt, firstBuyQty, firstBuyAmt, remainingRounds };
  }, [initial, usdDeposit, basePrice, multiple, minMultiple]);

  // 빠른 선택 칩 값 (D)
  const quickChips = isInfinite
    ? [{ v: 1.0, label: "안전" }, { v: 1.5, label: "권장" }, { v: 2.0, label: "공격" }]
    : [{ v: 0.5, label: "안전" }, { v: 1.0, label: "권장" }, { v: 1.5, label: "공격" }];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) { toast.error("전략 타입을 선택하세요"); return; }
    if (!ticker) { toast.error("종목을 선택하세요"); return; }
    if (multiple) {
      const multipleNum = parseFloat(multiple);
      if (isNaN(multipleNum)) { toast.error("매수 배수가 올바르지 않습니다"); return; }
    }
    setLoading(true);
    try {
      const payload: StrategyRequest = {
        type,
        ticker,
        multiple: multiple || undefined,
        initialUsdDeposit: !initial && usdDeposit !== null ? usdDeposit : undefined,
      };
      if (initial) {
        await updateStrategy(initial.id, payload);
        toast.success("전략이 수정되었습니다");
      } else {
        await createStrategy(accountId, payload);
        toast.success("전략이 등록되었습니다");
      }
      onSuccess?.();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? "저장에 실패했습니다" : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── 전략 타입 카드 (A) ── */}
      <div className="space-y-2">
        <Label>매매 전략</Label>
        <div className="grid grid-cols-2 gap-3">
          {meta.strategyTypes.map((t) => {
            const selected = type === t.code;
            const singleTicker = (t.availableTickers?.length ?? 0) <= 1;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                disabled={loading}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: selected ? "2px solid var(--rose-500)" : "1px solid var(--border)",
                  background: selected ? "var(--rose-50)" : "var(--card)",
                  cursor: loading ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "border-color .15s, background .15s, box-shadow .15s",
                  boxShadow: selected ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{singleTicker ? "🎯" : "🔄"}</span>
                  <p style={{
                    fontSize: 14, fontWeight: 700,
                    color: selected ? "var(--rose-600)" : "var(--foreground)",
                  }}>
                    {t.code}
                  </p>
                </div>
                {t.description && (
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                    {t.description}
                  </p>
                )}
                <p style={{ fontSize: 11, color: selected ? "var(--rose-500)" : "var(--muted-foreground)" }}>
                  {singleTicker ? "SOXL 단일 · 공격형" : "다종목 분산 · 안정형"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 종목 (B) ── */}
      <div className="space-y-2">
        <Label>종목</Label>
        {availableTickers.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {availableTickers.map((code) => {
              const sel = ticker === code;
              const price = prices?.[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTicker(code)}
                  disabled={loading}
                  style={{
                    flexShrink: 0,
                    minWidth: 72,
                    padding: "10px 12px",
                    borderRadius: 10,
                    textAlign: "center",
                    cursor: loading ? "not-allowed" : "pointer",
                    border: sel ? "2px solid var(--rose-500)" : "1px solid var(--border)",
                    background: sel ? "var(--rose-50)" : "var(--card)",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: sel ? "var(--rose-600)" : "var(--foreground)" }}>
                    {code}
                  </div>
                  {price !== undefined && (
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      ${fmtUsd(price)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : availableTickers.length === 1 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8, padding: "12px 14px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--muted)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{availableTickers[0]}</span>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>(고정)</span>
            </div>
            {prices?.[availableTickers[0]] !== undefined && (
              <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
                ${fmtUsd(prices![availableTickers[0]])}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">선택 가능한 종목이 없습니다.</p>
        )}
      </div>

      {/* ── USD 예수금 게이지 (C) — 등록 모드 전용 ── */}
      {!initial && (
        <div style={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--muted)", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "var(--muted-foreground)" }}>USD 예수금</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {loadingBase ? "조회 중..." : usdDeposit !== null ? `$${fmtUsd(usdDeposit)}` : "--"}
            </span>
          </div>
          {usdDeposit !== null && maxMultiple !== null && (
            <>
              <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round(depositUsageRatio * 100)}%`,
                  background: depositUsageRatio > 0.85 ? "var(--warn)" : "var(--rose-400)",
                  borderRadius: 4,
                  transition: "width .2s",
                }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                {parseFloat(multiple) || minMultiple}× 기준 · 시드의 약 {Math.round(depositUsageRatio * 100)}% 사용
              </p>
            </>
          )}
        </div>
      )}

      {/* ── 매수 배수 ── */}
      <div className="space-y-3">
        <Label htmlFor="multiple">매수 배수</Label>
        <MultipleInput
          value={multiple}
          onChange={setMultiple}
          max={maxMultiple}
          min={minMultiple}
          step={stepMultiple}
          disabled={loading}
          loading={loadingBase}
        />

        {/* 빠른 선택 칩 (D) + MAX 강조 칩 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {quickChips.map((chip) => {
            const active = parseFloat(multiple) === chip.v;
            const chipDisabled = loading || loadingBase || (maxMultiple !== null && chip.v > maxMultiple);
            return (
              <button
                key={chip.v}
                type="button"
                disabled={chipDisabled}
                onClick={() => setMultiple(String(chip.v))}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: active ? "2px solid var(--rose-500)" : "1px solid var(--border)",
                  background: active ? "var(--rose-50)" : "var(--card)",
                  color: active ? "var(--rose-600)" : chipDisabled ? "var(--muted-foreground)" : "var(--foreground)",
                  cursor: chipDisabled ? "not-allowed" : "pointer",
                  opacity: chipDisabled ? 0.4 : 1,
                  transition: "all .15s",
                }}
              >
                {chip.v}×&nbsp;
                <span style={{ fontWeight: 400, fontSize: 10 }}>{chip.label}</span>
              </button>
            );
          })}

          {/* MAX 칩 (D + E) */}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              type="button"
              disabled={loading || loadingBase || maxMultiple === null}
              onClick={() => {
                if (maxMultiple !== null) setMultiple(String(floorToStep(maxMultiple, stepMultiple)));
              }}
              style={{
                padding: "5px 16px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                border: "1.5px solid var(--rose-400)",
                background: maxMultiple !== null && !loading && !loadingBase
                  ? "linear-gradient(135deg, var(--rose-400), var(--rose-600))"
                  : "var(--muted)",
                color: maxMultiple !== null && !loading && !loadingBase ? "#fff" : "var(--muted-foreground)",
                cursor: maxMultiple !== null && !loading && !loadingBase ? "pointer" : "not-allowed",
                opacity: maxMultiple === null || loadingBase ? 0.5 : 1,
                letterSpacing: "0.05em",
                transition: "opacity .15s",
              }}
            >
              MAX {maxMultiple !== null ? `${floorToStep(maxMultiple, stepMultiple)}×` : ""}
            </button>
            {/* ⓘ 계산 공식 토글 (E) */}
            {maxMultiple !== null && (
              <button
                type="button"
                onClick={() => setShowMaxHint((v) => !v)}
                style={{
                  position: "absolute", top: -6, right: -8,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "var(--rose-100)", border: "none",
                  fontSize: 10, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--rose-600)",
                }}
              >
                ⓘ
              </button>
            )}
          </div>
        </div>

        {/* MAX 계산 공식 힌트 (E) */}
        {showMaxHint && maxMultiple !== null && (
          <div style={{
            fontSize: 11, padding: "8px 12px", borderRadius: 8,
            background: "var(--rose-50)", border: "1px solid var(--rose-200)",
            color: "var(--rose-700)", lineHeight: 1.6,
          }}>
            MAX = 예수금 ÷ (기준가 × 20차 × 2분할 × 1.1여유) ={" "}
            <strong>{floorToStep(maxMultiple, stepMultiple)}×</strong>
          </div>
        )}

        {/* 인라인 검증 상태 칩 (F) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {multipleError && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 12,
              background: "var(--neg-bg)", color: "var(--neg)", fontWeight: 600,
            }}>
              ✗ {multipleError}
            </span>
          )}
          {!multipleError && isBelowMinSeed && minSeed !== null && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 12,
              background: "var(--warn-bg)", color: "var(--warn)", fontWeight: 600,
            }}>
              ⚠ 최소 예수금 ${fmtUsd(minSeed)} 필요
            </span>
          )}
          {!initial && !isInfinite && privacyBase === null && !loadingBase && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 12,
              background: "var(--warn-bg)", color: "var(--warn)", fontWeight: 600,
            }}>
              ⚠ 오늘 이후 기준 매매표가 없습니다
            </span>
          )}
          {loadingBase && (
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              기준가 조회 중...
            </span>
          )}
          {!multipleError && !isBelowMinSeed && basePrice !== null && maxMultiple !== null && !loadingBase && (
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 12,
              background: "var(--pos-bg)", color: "var(--pos)", fontWeight: 600,
            }}>
              ✓ 기준가 ${basePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} · MAX {maxMultiple}×
            </span>
          )}
        </div>

        {/* 실시간 미리보기 strip (G) */}
        {previewStrip &&
          !loadingBase &&
          !isBelowMinSeed &&
          !multipleError &&
          previewStrip.firstBuyQty > 0 && (
            <div style={{
              fontSize: 12, padding: "8px 12px", borderRadius: 8,
              background: "var(--card)", border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
              display: "flex", flexWrap: "wrap", gap: 10,
            }}>
              <span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>첫 매수</span>{" "}
                ${fmtUsd(previewStrip.firstBuyAmt)} ({previewStrip.firstBuyQty}주)
              </span>
              <span>
                ·{" "}
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>최대 {previewStrip.remainingRounds}차</span>
              </span>
              <span>
                ·{" "}
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>단위금액</span>{" "}
                ${fmtUsd(previewStrip.unitAmt)}
              </span>
            </div>
          )}
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            취소
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={loading || cannotSubmit || !!multipleError}
        >
          {loading ? "저장 중..." : initial ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  );
}
