"use client";

import {useEffect, useMemo, useState} from "react";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {useMeta} from "@/components/providers/MetaProvider";
import {createStrategy, updateStrategy} from "@/lib/api/strategies";
import {getMargin, getPrices, type PriceMap} from "@/lib/api/accounts";
import {getPrivacyCurrentBase} from "@/lib/api/privacy";
import {ApiError} from "@/lib/api/client";
import {MultipleInput} from "./MultipleInput";
import type {Strategy, StrategyRequest} from "@/types/strategy";

interface Props {
  accountId: string;
  initial?: Strategy;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const INFINITE_TICKERS = ["TQQQ", "SOXL", "USD"];

export function StrategyForm({accountId, initial, onSuccess, onCancel}: Props) {
  const router = useRouter();
  const {meta, findStrategyType} = useMeta();
  const [type, setType] = useState<string>(
    initial?.type ?? meta.strategyTypes[0]?.code ?? "",
  );
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? "");
  const [multiple, setMultiple] = useState<string>(initial?.multiple ?? "");
  const [loading, setLoading] = useState(false);

  // 기준가/예수금 state
  const [usdDeposit, setUsdDeposit] = useState<number | null>(null);
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [privacyBase, setPrivacyBase] = useState<number | null>(null);
  const [loadingBase, setLoadingBase] = useState(!initial);

  const typeMeta = useMemo(
    () => findStrategyType(type),
    [findStrategyType, type],
  );
  const availableTickers = typeMeta?.availableTickers ?? [];

  // PRIVACY만 단일(SOXL), INFINITE는 다종목 — length로 판별
  const isInfinite = (typeMeta?.availableTickers?.length ?? 0) > 1;

  // 전략 타입별 배수 단위/최솟값
  const minMultiple = isInfinite ? 1 : 0.5;
  const stepMultiple = isInfinite ? 0.1 : 0.5;

  // 다이얼로그 열릴 때 예수금 + 종목가격 + PRIVACY 기준가 한 번에 조회
  useEffect(() => {
    if (initial) return;
    setLoadingBase(true);
    // per-promise .catch: 하나 실패해도 나머지 결과는 살림
    Promise.all([
      getMargin(accountId).catch(() => null),
      getPrices(accountId, INFINITE_TICKERS).catch(() => null),
      getPrivacyCurrentBase().catch(() => null),
    ])
      .then(([margin, priceMap, privacy]) => {
        const usd =
          margin?.find((m) => m.currency === "USD")
            ?.integratedOrderableAmount ?? null;
        setUsdDeposit(usd);
        setPrices(priceMap);
        setPrivacyBase(privacy?.currentCycleStart ?? null);
        if (!margin && !priceMap && !privacy) {
          toast.error("예수금 / 기준가 조회에 실패했습니다");
        }
      })
      .finally(() => {
        setLoadingBase(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // type 변경 시 ticker / multiple 기본값 자동 설정
  useEffect(() => {
    if (!typeMeta) return;
    if (!ticker || !availableTickers.includes(ticker)) {
      setTicker(typeMeta.availableTickers[0]);
    }
    if (!multiple) {
      setMultiple("1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // 현재 선택된 type + ticker에 대한 기준가
  const basePrice = useMemo(() => {
    if (!type || !ticker) return null;
    if (isInfinite) return prices?.[ticker] ?? null;
    return privacyBase;
  }, [type, ticker, isInfinite, prices, privacyBase]);

  // 최소 시드: INFINITE = 종목가 × 20 × 2 × 1.1 (배수 1의 값)
  //           PRIVACY  = currentCycleStart / 2     (배수 0.5의 값)
  const minSeed = useMemo(() => {
    if (initial) return null;
    if (isInfinite) return basePrice !== null ? basePrice * 20 * 2 * 1.1 : null;
    return privacyBase !== null ? privacyBase / 2 : null;
  }, [isInfinite, basePrice, privacyBase, initial]);

  const isBelowMinSeed =
    !initial && usdDeposit !== null && minSeed !== null && usdDeposit < minSeed;

  // MAX 배수: INFINITE = floor(예수금 / 최소시드 × 10) / 10
  //           PRIVACY  = floor(예수금 / 기준가 × 2) / 2
  const maxMultiple = useMemo(() => {
    if (initial || isBelowMinSeed || usdDeposit === null) return null;
    if (isInfinite && minSeed !== null)
      return Math.floor((usdDeposit / minSeed) * 10) / 10;
    if (!isInfinite && privacyBase !== null)
      return Math.floor((usdDeposit / privacyBase) * 2) / 2;
    return null;
  }, [initial, isBelowMinSeed, isInfinite, usdDeposit, minSeed, privacyBase]);

  // 입력값 검증 (step 단위, MAX 초과)
  const multipleError = useMemo(() => {
    const num = parseFloat(multiple);
    if (!multiple || isNaN(num)) return null;
    if (num < minMultiple) return `최소 ${minMultiple}배부터 입력해주세요`;
    const remainder = Math.abs(
      Math.round(num / stepMultiple) * stepMultiple - num,
    );
    if (remainder > 1e-9) return `${stepMultiple} 단위로 입력해주세요`;
    if (maxMultiple !== null && num > maxMultiple)
      return `최대 ${maxMultiple}배를 초과했습니다`;
    return null;
  }, [multiple, minMultiple, stepMultiple, maxMultiple]);

  // 등록 불가 조건 (버튼 disabled)
  const cannotSubmit =
    !initial &&
    (isBelowMinSeed ||
      (isInfinite && basePrice === null) ||
      (!isInfinite && privacyBase === null));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) {
      toast.error("전략 타입을 선택하세요");
      return;
    }
    if (!ticker) {
      toast.error("종목을 선택하세요");
      return;
    }
    if (multiple) {
      const multipleNum = parseFloat(multiple);
      if (isNaN(multipleNum)) {
        toast.error("매수 배수가 올바르지 않습니다");
        return;
      }
    }

    setLoading(true);
    try {
      const payload: StrategyRequest = {
        type,
        ticker,
        multiple: multiple || undefined,
        initialUsdDeposit:
          !initial && usdDeposit !== null ? usdDeposit : undefined,
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
      toast.error(
        err instanceof ApiError ? "저장에 실패했습니다" : "오류가 발생했습니다",
      );
    } finally {
      setLoading(false);
    }
  }

  // 보조 텍스트 (기준가 / MAX / 최소 시드 / 경고)
  function auxText(): {text: string; isWarning: boolean} {
    if (loadingBase) return {text: "기준가 조회 중...", isWarning: false};
    if (isBelowMinSeed && minSeed !== null)
      return {
        text: `최소 예수금 $${minSeed.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        isWarning: true,
      };
    if (!isInfinite && privacyBase === null)
      return {text: "오늘 이후 기준 매매표가 없습니다", isWarning: true};
    if (basePrice !== null && maxMultiple !== null)
      return {
        text: `기준가: $${basePrice.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 4})} · MAX: ${maxMultiple}배`,
        isWarning: false,
      };
    if (basePrice !== null)
      return {
        text: `기준가: $${basePrice.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 4})}`,
        isWarning: false,
      };
    if (ticker) return {text: "기준가를 가져오지 못했습니다", isWarning: true};
    return {text: "종목을 선택하면 MAX가 계산됩니다", isWarning: false};
  }

  const aux = !initial ? auxText() : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 전략 타입 카드 */}
      <div className="space-y-2">
        <Label>매매 전략</Label>
        <div className="grid grid-cols-2 gap-3">
          {meta.strategyTypes.map((t) => {
            const selected = type === t.code;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                disabled={loading}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: selected
                    ? "2px solid var(--rose-500)"
                    : "1px solid var(--border)",
                  background: selected ? "var(--rose-50)" : "var(--card)",
                  cursor: loading ? "not-allowed" : "pointer",
                  textAlign: "left",
                  transition: "border-color .15s, background .15s",
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: selected ? "var(--rose-600)" : "var(--foreground)",
                  }}
                >
                  {t.code}
                </p>
                {t.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      marginTop: 2,
                    }}
                  >
                    {t.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 종목 */}
      <div className="space-y-2">
        <Label>종목</Label>
        {availableTickers.length > 1 ? (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${availableTickers.length}, 1fr)`,
            }}
          >
            {availableTickers.map((code) => {
              const sel = ticker === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTicker(code)}
                  disabled={loading}
                  style={{
                    padding: "12px 4px",
                    borderRadius: 10,
                    textAlign: "center",
                    cursor: loading ? "not-allowed" : "pointer",
                    border: sel
                      ? "2px solid var(--rose-500)"
                      : "1px solid var(--border)",
                    background: sel ? "var(--rose-50)" : "var(--card)",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: sel ? "var(--rose-600)" : "var(--foreground)",
                    }}
                  >
                    {code}
                  </div>
                </button>
              );
            })}
          </div>
        ) : availableTickers.length === 1 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--muted)",
            }}
          >
            <span style={{fontSize: 14, fontWeight: 700}}>
              {availableTickers[0]}
            </span>
            <span style={{fontSize: 12, color: "var(--muted-foreground)"}}>
              (고정)
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            선택 가능한 종목이 없습니다.
          </p>
        )}
      </div>

      {/* USD 예수금 (등록 모드 전용) */}
      {!initial && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--muted)",
            padding: "10px 14px",
            fontSize: 13,
          }}
        >
          <span style={{color: "var(--muted-foreground)"}}>USD 예수금</span>
          <span style={{fontWeight: 600, fontVariantNumeric: "tabular-nums"}}>
            {loadingBase
              ? "조회 중..."
              : usdDeposit !== null
                ? `$${usdDeposit.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                : "--"}
          </span>
        </div>
      )}

      {/* 매수 배수 */}
      <div className="space-y-2">
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

        {/* 배수 입력 오류 */}
        {multipleError && (
          <p className="text-[11px]" style={{color: "var(--rose-600)"}}>
            {multipleError}
          </p>
        )}

        {/* 기준가 / MAX / 최소 시드 보조 텍스트 */}
        {aux && (
          <p
            className="text-[11px]"
            style={{
              color: aux.isWarning
                ? "var(--rose-600)"
                : "var(--muted-foreground)",
            }}
          >
            {aux.text}
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
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
