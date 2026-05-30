"use client";

import {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {KpiCard} from "./KpiCard";
import {ApiError} from "@/lib/api/client";
import {getNextOrdersPreview} from "@/lib/api/orders";
import type {NextOrderPreview} from "@/types/preview";

interface Props {
  accountId: string;
  strategyType?: string;
  initialUsdDeposit?: number;
}

export function NextOrderPreviewCard({accountId, strategyType, initialUsdDeposit}: Props) {
  const [preview, setPreview] = useState<NextOrderPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"no-strategy" | "kis-fail" | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNextOrdersPreview(accountId);
      setPreview(data);
      setLastUpdatedAt(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError("no-strategy");
      } else {
        setError("kis-fail");
      }
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (!isInfinite) return;
    load();
  }, [isInfinite, load]);

  if (!strategyType) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            활성 전략을 등록하면 다음 주문을 미리 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isInfinite) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            현재 전략(프라이버시)은 미리보기를 지원하지 않습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pos = preview?.position;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
            {lastUpdatedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                방금 갱신 · {lastUpdatedAt}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            {loading ? "조회 중..." : "새로고침"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !preview && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
            KIS에서 현재가와 잔고를 조회 중...
          </div>
        )}

        {error === "no-strategy" && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            활성 전략이 없습니다.
          </p>
        )}

        {error === "kis-fail" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground text-center">
              KIS API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
            <button
              type="button"
              onClick={load}
              className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-rose-300 hover:text-rose-600 transition-colors"
            >
              재시도
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            {/* 포지션 KPI */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="회차(T)"
                value={`${pos!.currentRound.toFixed(1)}회차`}
              />
              <KpiCard
                label="단위금액(회)"
                value={`$${parseFloat(pos!.unitAmount).toFixed(2)}`}
              />
              <KpiCard
                label="기준가(별% 가격)"
                value={`$${parseFloat(pos!.referencePrice).toFixed(2)}`}
              />
              <KpiCard
                label="목표가"
                value={`$${parseFloat(pos!.targetPrice).toFixed(2)}`}
              />
            </div>

            {/* 주문 리스트 */}
            {preview.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                이번 사이클은 예정된 주문이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-rose-500 font-semibold">
                  예정 주문 {preview.orders.length}건
                </p>
                {preview.orders.map((order, i) => {
                  const isBuy = order.direction === "BUY";
                  const price = parseFloat(order.price);
                  const total = price > 0 ? price * order.quantity : null;
                  return (
                    <div
                      key={`${order.ticker}-${order.direction}-${order.orderType}-${i}`}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            background: isBuy
                              ? "var(--pos-bg)"
                              : "var(--neg-bg)",
                            color: isBuy ? "var(--pos)" : "var(--neg)",
                          }}
                        >
                          {isBuy ? "매수" : "매도"}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {order.orderType}
                        </span>
                        <span className="text-sm font-medium">
                          {order.ticker}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {order.quantity}주
                          {price > 0 && ` × $${price.toFixed(2)}`}
                        </p>
                        {total != null && (
                          <p className="text-xs text-muted-foreground">
                            = ${total.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
